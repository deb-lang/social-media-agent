// POST /api/generate — kicks off a bi-monthly generation run.
//
// Returns run_id immediately. Generation happens async in the background:
//   1. scrape patientpartner.com/resources (refresh cache)
//   2. Claude web-search for fresh external stats
//   3. pickCategories + assignFormats → 2 posts
//   4. Claude.generateImagePost / generateCarouselPost for each
//   5. render PNG/PDF via image-generator + upload to Supabase Storage
//   6. insert posts rows with status=pending_review
//   7. Slack notifyReadyForReview
//
// Cron invocations include `x-cron-secret: $CRON_SECRET`.
// Manual invocations (from the dashboard) skip the header check.

import { NextRequest, NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { refreshResourceCache } from "@/lib/scraper";
import { findFreshStats, persistFoundStats, listUnusedStats } from "@/lib/stat-finder";
import {
  pickCategories,
  assignFormats,
  recentPostSummaries,
} from "@/lib/content-engine";
import { buildOnePost } from "@/lib/build-post";
import { notifyFailure, notifyReadyForReview } from "@/lib/slack";
import { authorizeCron } from "@/lib/cron-auth";

// 800s is the Vercel Pro Fluid Compute ceiling. Two sequential Claude
// generations with effort=high + adaptive thinking + 5K-token cached system
// prompt routinely take 4-7min combined; the prior 300s cap was insufficient.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Enforce CRON_SECRET when one of the cron headers is present; let manual
  // dashboard triggers through with no header.
  const authResult = authorizeCron(req);
  if (authResult) return authResult;

  const isCron = Boolean(
    req.headers.get("x-cron-secret") || req.headers.get("authorization")
  );

  // Create the run row synchronously so we can return run_id immediately
  const run_id = randomUUID();
  const sb = supabaseAdmin();
  const { error } = await sb.from("generation_runs").insert({
    id: run_id,
    trigger_type: isCron ? "cron" : "manual",
    status: "in_progress",
  });
  if (error) {
    return NextResponse.json(
      { error: `Failed to create run: ${error.message}` },
      { status: 500 }
    );
  }

  // CRITICAL: Vercel terminates the function container the instant the
  // response is returned. A bare `runGeneration(run_id).catch(...)` is a
  // ghost — never actually runs. `after()` from next/server keeps the
  // function alive until the promise settles. The dashboard polls
  // /api/runs/[id] for live status (run row updates throughout).
  after(async () => {
    try {
      await runGeneration(run_id);
    } catch (err) {
      console.error("[generate] fatal:", err);
      try {
        await notifyFailure({ context: "generation.run", error: err, runId: run_id });
      } catch {
        /* swallow — Slack should never block error path */
      }
      await markRunFailed(run_id, err);
    }
  });

  return NextResponse.json({ run_id, status: "in_progress" });
}

async function markRunFailed(run_id: string, err: unknown) {
  const sb = supabaseAdmin();
  await sb
    .from("generation_runs")
    .update({
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
      completed_at: new Date().toISOString(),
    })
    .eq("id", run_id);
}

// Per-step timeout wrapper — protects every Claude/network call from
// hanging forever (which previously masked itself as in_progress until
// Vercel killed the whole function silently).
function withTimeout<T>(label: string, ms: number, p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Step "${label}" timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// ─── Core pipeline ─────────────────────────────────────

async function runGeneration(run_id: string) {
  const sb = supabaseAdmin();

  const t0 = Date.now();
  const tag = run_id.slice(0, 8);
  const ms = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`;

  // 1. refresh resources cache (non-fatal · 30s cap)
  try {
    const { scraped, upserted } = await withTimeout("scrape", 30_000, refreshResourceCache());
    console.log(`[gen ${tag}] ${ms()} scrape ok · ${scraped} fetched, ${upserted} upserted`);
  } catch (err) {
    console.warn(`[gen ${tag}] ${ms()} scrape failed (non-fatal):`, err);
  }

  // 2. find fresh stats via Claude web search (non-fatal · 60s cap — Claude
  // web-search has been the silent hang point; cap aggressively).
  try {
    const fresh = await withTimeout("stat-finder", 60_000, findFreshStats({ limit: 4 }));
    await persistFoundStats(fresh);
    console.log(`[gen ${tag}] ${ms()} stat-finder ok · ${fresh.length} fresh stats`);
  } catch (err) {
    console.warn(`[gen ${tag}] ${ms()} stat-finder failed (non-fatal):`, err);
  }

  // 3. pick categories + assign formats
  const categories = await pickCategories(2);
  const formats = assignFormats(categories);
  console.log(
    `[gen ${tag}] ${ms()} picks: ${categories.map((c, i) => `${c}/${formats[i]}`).join(", ")}`
  );

  // 4. build context + generate + render + upload + insert — both posts in parallel.
  // Sequential was eating the 300s budget; parallelizing halves wall time to max(p1,p2).
  const [externalStats, recent] = await Promise.all([
    listUnusedStats(6),
    recentPostSummaries(8),
  ]);
  console.log(`[gen ${tag}] ${ms()} ctx ready · ${externalStats.length} external stats, ${recent.length} recent posts`);

  // Each post gets a 5-min hard cap. With 800s overall budget and parallel
  // execution, both posts together cap at max(p1,p2) = 5min, leaving 8+ min
  // headroom for any retries or the 60s stat-finder cap.
  const postIds: string[] = [];
  const settled = await Promise.allSettled(
    categories.map((category, i) =>
      withTimeout(
        `post ${category}/${formats[i]}`,
        300_000,
        buildOnePost({ run_id, category, format: formats[i], externalStats, recent })
      ).then((id) => {
        console.log(`[gen ${tag}] ${ms()} post ${category}/${formats[i]} done → ${id.slice(0, 8)}`);
        return id;
      })
    )
  );
  const failureMessages: string[] = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    if (r.status === "fulfilled") {
      postIds.push(r.value);
    } else {
      const category = categories[i];
      const format = formats[i];
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error(`[gen ${tag}] ${ms()} post ${category}/${format} FAILED:`, r.reason);
      failureMessages.push(`${category}/${format}: ${msg}`);
      await notifyFailure({
        context: `generation.post.${category}.${format}`,
        error: r.reason,
        runId: run_id,
      });
    }
  }
  console.log(`[gen ${tag}] ${ms()} all posts settled · ${postIds.length}/${categories.length} succeeded`);

  // 5. finalize run — if all posts failed, mark the run failed (not completed)
  // and write the actual error messages to error_message so Supabase REST shows
  // them. This is the diagnostic safety net for any future "0 posts generated"
  // mystery.
  const finalStatus = postIds.length > 0 ? "completed" : "failed";
  await sb
    .from("generation_runs")
    .update({
      status: finalStatus,
      posts_generated: postIds.length,
      error_message: failureMessages.length > 0 ? failureMessages.join(" | ") : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run_id);

  // 6. Slack ready-for-review
  if (postIds.length > 0) {
    await notifyReadyForReview({
      postCount: postIds.length,
      runId: run_id,
      categories: categories.slice(0, postIds.length),
    });
  }
}

// buildOnePost moved to lib/build-post.ts (also reused by /api/posts/manual).
