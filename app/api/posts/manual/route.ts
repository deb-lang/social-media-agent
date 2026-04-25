// POST /api/posts/manual — manual single-post generator for ad-hoc lead
// magnets, events, webinars, etc.
//
// Same generation pipeline as the cron's /api/generate, but with explicit
// user-supplied context instead of category rotation. Returns post_id
// immediately and runs generation via after() so the response stays fast.
//
// Request body:
//   {
//     context: string;            // required, 200-2000 chars
//     reference_urls?: string[];  // optional URLs to embed
//     category?: ContentCategory; // optional, defaults to "lead_magnet"
//     format: "image" | "carousel"; // required
//     scheduled_for?: string;     // optional ISO; sets schedule_override=true
//   }

import { NextRequest, NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { listUnusedStats } from "@/lib/stat-finder";
import { recentPostSummaries } from "@/lib/content-engine";
import { buildOnePost, type ManualContext } from "@/lib/build-post";
import { logAction } from "@/lib/audit";
import { notifyFailure } from "@/lib/slack";
import { CONTENT_CATEGORIES, type ContentCategory, type PostFormat } from "@/lib/constants";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

interface ManualRequestBody {
  context?: unknown;
  reference_urls?: unknown;
  category?: unknown;
  format?: unknown;
  scheduled_for?: unknown;
}

export async function POST(req: NextRequest) {
  // ─── Validate body ─────────────────────────────────
  let body: ManualRequestBody;
  try {
    body = (await req.json()) as ManualRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const context = typeof body.context === "string" ? body.context.trim() : "";
  if (context.length < 50) {
    return NextResponse.json(
      { error: "context is required and must be at least 50 characters" },
      { status: 400 }
    );
  }
  if (context.length > 2500) {
    return NextResponse.json(
      { error: "context must be 2500 characters or fewer" },
      { status: 400 }
    );
  }

  const format = body.format as PostFormat;
  if (format !== "image" && format !== "carousel") {
    return NextResponse.json(
      { error: 'format must be "image" or "carousel"' },
      { status: 400 }
    );
  }

  let category: ContentCategory = "lead_magnet";
  if (typeof body.category === "string") {
    if (!CONTENT_CATEGORIES.includes(body.category as ContentCategory)) {
      return NextResponse.json(
        { error: `category must be one of: ${CONTENT_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }
    category = body.category as ContentCategory;
  }

  let reference_urls: string[] = [];
  if (Array.isArray(body.reference_urls)) {
    reference_urls = body.reference_urls
      .filter((u): u is string => typeof u === "string" && u.length > 0)
      .slice(0, 5);
  }

  let scheduledOverride: string | null = null;
  if (typeof body.scheduled_for === "string" && body.scheduled_for.length > 0) {
    const dt = new Date(body.scheduled_for);
    if (Number.isNaN(dt.getTime()) || dt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "scheduled_for must be a valid future ISO datetime" },
        { status: 400 }
      );
    }
    scheduledOverride = dt.toISOString();
  }

  const performedBy = req.headers.get("x-user-email") ?? "dashboard";

  // ─── Create synthetic generation_runs row ─────────
  // Reuse the runs table so the manual post shows up alongside cron-driven ones.
  const run_id = randomUUID();
  const sb = supabaseAdmin();
  const { error: runErr } = await sb.from("generation_runs").insert({
    id: run_id,
    trigger_type: "manual",
    status: "in_progress",
  });
  if (runErr) {
    return NextResponse.json(
      { error: `Failed to create run: ${runErr.message}` },
      { status: 500 }
    );
  }

  // ─── Background generation ────────────────────────
  const manualContext: ManualContext = { context, reference_urls };
  after(async () => {
    try {
      const [externalStats, recent] = await Promise.all([
        listUnusedStats(6),
        recentPostSummaries(8),
      ]);
      const postId = await buildOnePost({
        run_id,
        category,
        format,
        externalStats,
        recent,
        manualContext,
        performedBy,
      });

      // Apply schedule override if requested
      if (scheduledOverride) {
        await sb
          .from("posts")
          .update({
            scheduled_for: scheduledOverride,
            schedule_override: true,
          })
          .eq("id", postId);
        await logAction({
          action: "schedule_override",
          post_id: postId,
          performed_by: performedBy,
          details: { scheduled_for: scheduledOverride, source: "manual_generator" },
        });
      }

      await sb
        .from("generation_runs")
        .update({
          status: "completed",
          posts_generated: 1,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run_id);
    } catch (err) {
      console.error(`[manual ${run_id.slice(0, 8)}] failed:`, err);
      try {
        await notifyFailure({
          context: `manual.post.${category}.${format}`,
          error: err,
          runId: run_id,
        });
      } catch {
        /* swallow */
      }
      await sb
        .from("generation_runs")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : String(err),
          completed_at: new Date().toISOString(),
        })
        .eq("id", run_id);
    }
  });

  return NextResponse.json({ run_id, status: "in_progress" }, { status: 202 });
}
