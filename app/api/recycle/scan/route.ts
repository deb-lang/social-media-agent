// POST /api/recycle/scan
// Monthly cron (20th at 8 AM PST) that scans for evergreen content:
//   - Published posts 90+ days old
//   - Engagement rate > 5% AND impressions > 2000
//   - Never recycled before (is_recycled=false, no existing recycled_from entry)
//
// When a candidate is found, triggers a regenerate-style flow that creates a
// NEW post row with is_recycled=true + recycled_from_post_id pointing back.
// Maximum 1 recycle per month. Phase 6 completes the refreshed-caption logic.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authorizeCron } from "@/lib/cron-auth";
import { logAction } from "@/lib/audit";
import { recycleCandidate, type RecycleCandidate } from "@/lib/recycle";
import { notifyFailure, notifyReadyForReview } from "@/lib/slack";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authResult = authorizeCron(req);
  if (authResult) return authResult;

  const sb = supabaseAdmin();

  // 1. Have we already recycled this month?
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const { data: recentRecycles } = await sb
    .from("posts")
    .select("id")
    .eq("is_recycled", true)
    .gte("created_at", monthAgo.toISOString())
    .limit(1);

  if (recentRecycles && recentRecycles.length > 0) {
    return NextResponse.json({
      ok: true,
      skipped: "already_recycled_this_month",
    });
  }

  // 2. Find evergreen candidates
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const { data: candidates, error } = await sb
    .from("posts")
    .select(
      "id, category, format, caption, stat_value, stat_source, stat_url, engagement_rate, impressions, published_at"
    )
    .eq("status", "published")
    .eq("is_recycled", false)
    .is("recycled_from_post_id", null)
    .lte("published_at", ninetyDaysAgo.toISOString())
    .gt("engagement_rate", 5.0)
    .gt("impressions", 2000)
    .order("engagement_rate", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, recycled: 0 });
  }

  // Log the scan result
  await logAction({
    action: "recycle",
    performed_by: "cron",
    details: {
      step: "scan",
      candidates: candidates.map((c) => ({
        id: (c.id as string).slice(0, 8),
        category: c.category,
        engagement_rate: c.engagement_rate,
        impressions: c.impressions,
      })),
    },
  });

  // Pick the top candidate and regenerate it
  const top = candidates[0] as RecycleCandidate;
  try {
    const { new_post_id, new_format } = await recycleCandidate(top);
    await notifyReadyForReview({
      postCount: 1,
      runId: new_post_id,
      categories: [`${top.category} (recycled)`],
    });
    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      recycled: 1,
      new_post_id,
      new_format,
      source_post_id: top.id,
    });
  } catch (err) {
    await notifyFailure({ context: "recycle.scan", error: err, postId: top.id });
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        scanned_candidates: candidates.length,
      },
      { status: 500 }
    );
  }
}
