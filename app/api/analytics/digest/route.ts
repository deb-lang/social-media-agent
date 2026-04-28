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

  // ?placeholder=1 — fires a Slack digest with hardcoded sample data so we
  // can preview the message format before any real posts have published.
  // Bypasses Supabase entirely. Used for one-off demo/sanity testing.
  const placeholder =
    req.nextUrl.searchParams.get("placeholder") === "1" ||
    req.nextUrl.searchParams.get("demo") === "1";
  if (placeholder) {
    const samplePosts: DigestPost[] = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        caption: "1 in 4 new prescriptions get abandoned within 48 hours of diagnosis. (placeholder)",
        category: "stat_post",
        format: "image",
        impressions: 1240,
        engagement_rate: 4.2,
        link_clicks: 18,
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        caption: "Why most patient support programs lose patients in week one. (placeholder)",
        category: "thought_leadership",
        format: "carousel",
        impressions: 980,
        engagement_rate: 3.8,
        link_clicks: 12,
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        caption: "Mentor connection rate hits 73% — vs. 10-20% for hub-only support. (placeholder)",
        category: "missing_middle",
        format: "image",
        impressions: 750,
        engagement_rate: 3.1,
        link_clicks: 9,
      },
    ];
    const sampleRecommendations: DigestRecommendation[] = [
      {
        category: "stat_post",
        rank: 1,
        confidence: "high",
        reasoning: "12 posts · 14,200 impressions · 4.1% avg engagement · winning (placeholder)",
      },
      {
        category: "thought_leadership",
        rank: 2,
        confidence: "high",
        reasoning: "10 posts · 9,800 impressions · 3.6% avg engagement · winning (placeholder)",
      },
      {
        category: "missing_middle",
        rank: 3,
        confidence: "low",
        reasoning: "6 posts · 4,500 impressions · 2.9% avg engagement · low confidence (placeholder)",
      },
      {
        category: "lead_magnet",
        rank: null,
        confidence: "insufficient",
        reasoning: "2 posts · 600 impressions · need 3 more posts before this is reliable (placeholder)",
      },
      {
        category: "perfectpatient",
        rank: null,
        confidence: "insufficient",
        reasoning: "0 published posts in last 90d (placeholder)",
      },
    ];
    await notifyWeeklyDigest({
      topPosts: samplePosts,
      recommendations: sampleRecommendations,
      windowDays: WEEK_DAYS,
      totalPublished: 28,
    });
    return NextResponse.json({
      ok: true,
      sent: true,
      placeholder: true,
      note: "Sample digest fired with hardcoded placeholder data. No DB queries.",
    });
  }

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
