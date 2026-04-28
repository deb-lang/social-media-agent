// POST /api/analytics/digest
// Weekly Monday cron — fires a Slack digest with last 7 days' top 3 posts
// and the recommender's current high-confidence next-category picks.
// Manual trigger via the dashboard uses the same endpoint.
//
// Cron schedule (vercel.json): "0 18 * * 1" — 10 AM PST/PDT every Monday.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authorizeCron } from "@/lib/cron-auth";
import {
  notifyWeeklyDigest,
  type DigestPost,
  type DigestRecommendation,
} from "@/lib/slack";
import { rankCategories, type RankablePost } from "@/lib/recommender";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const WEEK_DAYS = 7;
const RECOMMENDER_WINDOW_DAYS = 90;

export async function POST(req: NextRequest) {
  const authResult = authorizeCron(req);
  if (authResult) return authResult;

  const sb = supabaseAdmin();
  const weekAgo = new Date(Date.now() - WEEK_DAYS * 86_400_000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - RECOMMENDER_WINDOW_DAYS * 86_400_000).toISOString();

  // Top 3 by engagement_rate, published in the last week.
  const { data: weekPosts, error: weekErr } = await sb
    .from("posts")
    .select("id, caption, category, format, impressions, engagement_rate, link_clicks, published_at")
    .eq("status", "published")
    .not("engagement_rate", "is", null)
    .gte("published_at", weekAgo)
    .order("engagement_rate", { ascending: false })
    .limit(3);

  if (weekErr) {
    return NextResponse.json({ error: weekErr.message }, { status: 500 });
  }

  // 90-day pool for the recommender.
  const { data: pool, error: poolErr } = await sb
    .from("posts")
    .select("category, published_at, impressions, engagement_rate")
    .eq("status", "published")
    .not("published_at", "is", null)
    .gte("published_at", ninetyDaysAgo);

  if (poolErr) {
    return NextResponse.json({ error: poolErr.message }, { status: 500 });
  }

  const topPosts: DigestPost[] = (weekPosts ?? []).map((p) => ({
    id: p.id as string,
    caption: (p.caption as string) ?? "",
    category: p.category as string,
    format: p.format as string,
    impressions: p.impressions as number | null,
    engagement_rate: p.engagement_rate as number | null,
    link_clicks: p.link_clicks as number | null,
  }));

  const rankings = rankCategories((pool ?? []) as RankablePost[]);
  const recommendations: DigestRecommendation[] = rankings.map((r) => ({
    category: r.category,
    rank: r.rank,
    confidence: r.confidence,
    reasoning: r.reasoning,
  }));

  await notifyWeeklyDigest({
    topPosts,
    recommendations,
    windowDays: WEEK_DAYS,
    totalPublished: (pool ?? []).length,
  });

  return NextResponse.json({
    ok: true,
    sent: true,
    top_post_count: topPosts.length,
    eligible_categories: recommendations.filter((r) => r.confidence !== "insufficient").length,
    high_confidence_winners: recommendations.filter((r) => r.confidence === "high" && (r.rank ?? 99) <= 3).length,
  });
}
