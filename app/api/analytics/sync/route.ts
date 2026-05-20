// POST /api/analytics/sync
// Runs daily via Vercel cron (weekdays 10 AM PST). Pulls post insights from
// Publer for every scheduled/published post and updates the analytics columns
// on the posts table. Manual dashboard trigger uses the same endpoint.
//
// 2026-05 rewrite: Publer's analytics API contract changed. The old single-
// post /post_insights?post_id=X endpoint is gone. The new endpoint is paginated
// by date range and returns a list of all posts with insights. We now:
//   1. Pull our DB rows in (scheduled, published, approved) status with
//      a publer_post_id set
//   2. Hit Publer's new endpoint for a 90-day window, paginating
//   3. Match each returned Publer post to our DB row by `old_id` (which is
//      the scheduled-state id we stored as publer_post_id). For posts where
//      Publer didn't preserve old_id, fall back to text + scheduled_at match
//   4. Flip status to `published` when Publer says so; persist the LinkedIn
//      URN in published_url
//
// DEV_MODE: no-op if set.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authorizeCron } from "@/lib/cron-auth";
import {
  listAllPostInsights,
  type PublerAnalyticsPost,
} from "@/lib/publer";
import { notifyAnalyticsSyncFailed } from "@/lib/slack";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SYNC_WINDOW_DAYS = 90;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function metricValue(cell: { value: number | null } | undefined): number | null {
  if (!cell) return null;
  return cell.value ?? null;
}

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

  // Pull every DB row that could be matched against Publer's response. We
  // include `approved` so a post that's been approved but isn't yet in
  // Publer's published list still gets reconciled if it goes live.
  const { data: dbPosts, error } = await sb
    .from("posts")
    .select("id, publer_post_id, caption, scheduled_for, status")
    .in("status", ["scheduled", "approved", "published"])
    .not("publer_post_id", "is", null)
    .limit(200);

  if (error) {
    await notifyAnalyticsSyncFailed({ error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dbRows = dbPosts ?? [];
  if (dbRows.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, failed: 0, total: 0, note: "no posts to sync" });
  }

  // Fetch every post-insight from Publer in the last 90 days.
  const now = new Date();
  const from = isoDate(new Date(now.getTime() - SYNC_WINDOW_DAYS * 86_400_000));
  const to = isoDate(now);

  let publerPosts: PublerAnalyticsPost[];
  try {
    publerPosts = await listAllPostInsights({ accountId, from, to });
  } catch (err) {
    await notifyAnalyticsSyncFailed({ error: err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  // Build two lookup maps for matching DB rows → Publer rows:
  //   1. by old_id (Publer's scheduled-state id, which equals our publer_post_id)
  //   2. by exact caption text (for posts where Publer didn't preserve old_id)
  const byOldId = new Map<string, PublerAnalyticsPost>();
  const byText = new Map<string, PublerAnalyticsPost>();
  for (const p of publerPosts) {
    if (p.old_id) byOldId.set(p.old_id, p);
    if (p.text) byText.set(p.text.trim(), p);
  }

  let synced = 0;
  let failed = 0;
  let flippedToPublished = 0;
  const errors: string[] = [];

  for (const row of dbRows) {
    try {
      const ourId = row.publer_post_id as string;
      let match = byOldId.get(ourId);
      if (!match) {
        // Fallback: match by full caption text — we strip hashtags + UTM
        // when storing caption so do a flexible startswith check too.
        const captionLines = ((row.caption as string) ?? "").trim();
        match = byText.get(captionLines);
        if (!match) {
          // Loose match: Publer truncates display text but full text matches
          // on substring with our stored caption
          for (const p of publerPosts) {
            if (
              p.text &&
              captionLines &&
              p.text.trim().startsWith(captionLines.slice(0, 120).trim())
            ) {
              match = p;
              break;
            }
          }
        }
      }

      if (!match) {
        // No Publer match — post may not have published yet, or it's outside
        // our 90-day window. Not a failure, just nothing to update.
        continue;
      }

      const a = match.analytics ?? {};
      const updates: Record<string, unknown> = {
        analytics_updated_at: new Date().toISOString(),
      };

      const reach = metricValue(a.reach);
      if (reach != null) updates.impressions = reach;

      const engRate = metricValue(a.engagement_rate);
      if (engRate != null) updates.engagement_rate = engRate;

      const likes = metricValue(a.likes);
      if (likes != null) updates.likes = likes;

      const comments = metricValue(a.comments);
      if (comments != null) updates.comments = comments;

      const shares = metricValue(a.shares);
      if (shares != null) updates.shares = shares;

      const clicks = metricValue(a.post_clicks);
      if (clicks != null) updates.link_clicks = clicks;

      // If Publer marks the post `published`, flip our status + persist the
      // LinkedIn URL. Idempotent — we don't overwrite published_at if it's
      // already set.
      if (match.state === "published" && row.status !== "published") {
        updates.status = "published";
        updates.published_at = new Date().toISOString();
        flippedToPublished += 1;
      }
      if (match.post_link) {
        updates.published_url = match.post_link;
      }

      await sb.from("posts").update(updates).eq("id", row.id);
      synced += 1;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${(row.id as string).slice(0, 8)}: ${msg}`);
    }
  }

  if (failed > 0) {
    await notifyAnalyticsSyncFailed({
      error: new Error(`${failed} post(s) failed: ${errors.slice(0, 5).join("; ")}`),
    });
  }

  return NextResponse.json({
    ok: true,
    synced,
    failed,
    total: dbRows.length,
    flipped_to_published: flippedToPublished,
    publer_posts_in_window: publerPosts.length,
    window: { from, to },
  });
}
