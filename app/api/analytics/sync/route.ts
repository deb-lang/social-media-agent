// POST /api/analytics/sync
// Runs daily via Vercel cron (weekdays 10 AM PST). Pulls post insights from
// Publer for every scheduled/published post and updates the analytics columns
// on the posts table. Manual dashboard trigger uses the same endpoint.
//
// DEV_MODE: no-op if set.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authorizeCron } from "@/lib/cron-auth";
import { getPostInsights } from "@/lib/publer";
import { notifyAnalyticsSyncFailed } from "@/lib/slack";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authResult = authorizeCron(req);
  if (authResult) return authResult;

  if (process.env.DEV_MODE === "true") {
    return NextResponse.json({ ok: true, skipped: "dev_mode" });
  }

  const accountId = process.env.PUBLER_LINKEDIN_ACCOUNT_ID;
  if (!accountId) {
    return NextResponse.json(
      { error: "PUBLER_LINKEDIN_ACCOUNT_ID not set" },
      { status: 500 }
    );
  }

  const sb = supabaseAdmin();
  const { data: posts, error } = await sb
    .from("posts")
    .select("id, publer_post_id")
    .in("status", ["scheduled", "published"])
    .not("publer_post_id", "is", null)
    .limit(100);

  if (error) {
    await notifyAnalyticsSyncFailed({ error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const p of posts ?? []) {
    try {
      const insights = await getPostInsights(accountId, p.publer_post_id as string);
      const updates: Record<string, unknown> = {
        analytics_updated_at: new Date().toISOString(),
      };
      if (insights.impressions != null) updates.impressions = insights.impressions;
      if (insights.engagement_rate != null) updates.engagement_rate = insights.engagement_rate;
      if (insights.likes != null) updates.likes = insights.likes;
      if (insights.comments != null) updates.comments = insights.comments;
      if (insights.shares != null) updates.shares = insights.shares;
      if (insights.link_clicks != null) updates.link_clicks = insights.link_clicks;
      if (insights.follower_delta != null) updates.follower_delta = insights.follower_delta;

      // If Publer reports engagement, the post went live — flip to published
      if (insights.impressions != null && insights.impressions > 0) {
        updates.status = "published";
        if (!("published_at" in updates)) {
          updates.published_at = new Date().toISOString();
        }
      }

      await sb.from("posts").update(updates).eq("id", p.id);
      synced += 1;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${(p.id as string).slice(0, 8)}: ${msg}`);
    }
  }

  if (failed > 0) {
    await notifyAnalyticsSyncFailed({
      error: new Error(`${failed} post(s) failed: ${errors.slice(0, 5).join("; ")}`),
    });
  }

  return NextResponse.json({ ok: true, synced, failed, total: (posts ?? []).length });
}
