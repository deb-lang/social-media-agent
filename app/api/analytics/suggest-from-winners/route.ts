// POST /api/analytics/suggest-from-winners
// Takes top-performing past posts as seeds and generates new draft posts
// inspired by them. Drops the drafts into /queue with status=pending_review.
//
// Reliability:
//   - Uses the recommender's gates (N>=5 posts + 50+ impressions per category)
//     via lib/winners.ts::pickWinners — never fires on noisy data.
//   - 3-post cap per call.
//   - 30-min cooldown enforced via audit_log lookup (rate-limits the button).
//   - Skips any seed used in the last 7 days for angle diversity.
//
// Auth: dashboard session OR cron secret.

import { NextRequest, NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { authorizeCron } from "@/lib/cron-auth";
import { pickWinners, type SeedablePost } from "@/lib/winners";
import { buildOnePost } from "@/lib/build-post";
import { listUnusedStats } from "@/lib/stat-finder";
import { recentPostSummaries } from "@/lib/content-engine";
import { logAction } from "@/lib/audit";
import { notifyFailure, notifyReadyForReview } from "@/lib/slack";
import type { ContentCategory, PostFormat } from "@/lib/constants";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

const COOLDOWN_MIN = 30;
const SEED_REUSE_WINDOW_DAYS = 7;

export async function POST(req: NextRequest) {
  // Allow cron header OR a dashboard session via middleware (middleware will
  // 401 unauth'd before we get here, so by the time we run we're trusted).
  const authResult = authorizeCron(req);
  if (authResult) return authResult;

  const sb = supabaseAdmin();

  // ─── 1. Cooldown check ─────────────────────────────────
  // Refuse to run if the previous suggest_from_winner call was < 30 min ago.
  const cooldownAgo = new Date(Date.now() - COOLDOWN_MIN * 60_000).toISOString();
  const { data: recentSuggest } = await sb
    .from("audit_log")
    .select("created_at")
    .eq("action", "suggest_from_winner")
    .gte("created_at", cooldownAgo)
    .order("created_at", { ascending: false })
    .limit(1);
  if (recentSuggest && recentSuggest.length > 0) {
    const lastAt = recentSuggest[0].created_at as string;
    const minsLeft = Math.max(
      0,
      Math.round(
        COOLDOWN_MIN -
          (Date.now() - new Date(lastAt).getTime()) / 60_000
      )
    );
    return NextResponse.json(
      {
        ok: false,
        reason: "cooldown",
        message: `Suggestion cooldown — try again in ${minsLeft} min.`,
        last_at: lastAt,
      },
      { status: 429 }
    );
  }

  // ─── 2. Pull seeds already used in the last 7 days ──────
  const seedExcludeSince = new Date(
    Date.now() - SEED_REUSE_WINDOW_DAYS * 86_400_000
  ).toISOString();
  const { data: recentSeeds } = await sb
    .from("audit_log")
    .select("details")
    .eq("action", "suggest_from_winner")
    .gte("created_at", seedExcludeSince)
    .limit(100);
  const excludeSeedIds = new Set<string>();
  for (const row of recentSeeds ?? []) {
    const seedId = (row.details as { seed_post_id?: string } | null)?.seed_post_id;
    if (seedId) excludeSeedIds.add(seedId);
  }

  // ─── 3. Pull published posts, run pickWinners ────────────
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: published, error: pubErr } = await sb
    .from("posts")
    .select("id, category, format, caption, published_at, impressions, engagement_rate")
    .eq("status", "published")
    .not("published_at", "is", null)
    .gte("published_at", ninetyDaysAgo)
    .limit(200);
  if (pubErr) {
    return NextResponse.json({ error: pubErr.message }, { status: 500 });
  }
  const seedable = (published ?? []) as SeedablePost[];
  const result = pickWinners(seedable, { excludeSeedIds });

  if (result.winners.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: "no_winners",
      message: result.reasoning,
      eligible_categories: result.eligible_categories,
      total_published: result.total_published,
    });
  }

  // ─── 4. Create a generation_runs row ─────────────────────
  const run_id = randomUUID();
  await sb.from("generation_runs").insert({
    id: run_id,
    trigger_type: "winner_inspiration",
    status: "in_progress",
  });

  // ─── 5. Generate one post per winner, in parallel ────────
  // Return run_id immediately and let generation happen via after(); UI polls.
  after(async () => {
    const startedAt = Date.now();
    const generatedIds: string[] = [];
    const failures: string[] = [];

    try {
      const [externalStats, recent] = await Promise.all([
        listUnusedStats(6),
        recentPostSummaries(8),
      ]);

      const tasks = result.winners.map(async (w) => {
        const seedPost = w.post;
        const newPostId = await buildOnePost({
          run_id,
          category: seedPost.category as ContentCategory,
          format: seedPost.format as PostFormat,
          externalStats,
          recent,
          manualContext: {
            context: `Inspired by a high-performing past post (same category and format). Write a new angle that matches the seed's opener style but does not reuse the same stat or framing.`,
            winner_seed: {
              caption: seedPost.caption,
              engagement_rate: w.engagement_rate,
              impressions: seedPost.impressions ?? 0,
              category: String(seedPost.category),
              format: String(seedPost.format),
            },
          },
        });
        generatedIds.push(newPostId);

        // Audit-log the seed → generated link so we can trace lineage.
        await logAction({
          action: "suggest_from_winner",
          post_id: newPostId,
          performed_by: "dashboard",
          details: {
            seed_post_id: seedPost.id,
            generated_post_id: newPostId,
            seed_engagement_rate: w.engagement_rate,
            seed_category: seedPost.category,
            seed_format: seedPost.format,
            run_id,
          },
        });

        return newPostId;
      });

      const settled = await Promise.allSettled(tasks);
      for (let i = 0; i < settled.length; i++) {
        const r = settled[i];
        if (r.status === "rejected") {
          const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
          failures.push(`winner #${i + 1}: ${msg}`);
          await notifyFailure({
            context: `suggest_from_winners.post_${i + 1}`,
            error: r.reason,
            runId: run_id,
          });
        }
      }

      const finalStatus = generatedIds.length > 0 ? "completed" : "failed";
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      await sb
        .from("generation_runs")
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          posts_generated: generatedIds.length,
          error_message: failures.length > 0 ? failures.join(" | ") : null,
        })
        .eq("id", run_id);

      if (generatedIds.length > 0) {
        const categories = Array.from(
          new Set(result.winners.map((w) => String(w.post.category)))
        );
        await notifyReadyForReview({
          postCount: generatedIds.length,
          runId: run_id,
          categories,
        });
      }

      console.log(
        `[suggest ${run_id.slice(0, 8)}] done · ${generatedIds.length}/${result.winners.length} succeeded · ${elapsed}s`
      );
    } catch (err) {
      console.error(`[suggest ${run_id.slice(0, 8)}] fatal:`, err);
      await sb
        .from("generation_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq("id", run_id);
      await notifyFailure({
        context: "suggest_from_winners.run",
        error: err,
        runId: run_id,
      });
    }
  });

  return NextResponse.json({
    ok: true,
    run_id,
    status: "in_progress",
    winners: result.winners.map((w) => ({
      seed_post_id: w.post.id,
      category: w.category,
      format: w.post.format,
      engagement_rate: w.engagement_rate,
      caption_preview: w.post.caption.split("\n")[0].slice(0, 120),
    })),
    reasoning: result.reasoning,
  });
}
