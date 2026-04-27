// GET /api/analytics/recommend
// Returns the category recommender output: which categories to generate next
// based on recency-weighted engagement rate, with strict reliability gates
// (N>=5 posts, >=50 impressions per category, 90-day window).
//
// Used by:
//   - /analytics page (for the "What to generate next" panel)
//   - /new-post page (for the recommended chips above the category picker)
//   - /api/generate (in-process call, not via this HTTP endpoint)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rankCategories, type RankablePost } from "@/lib/recommender";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min — recommendations don't move minute-to-minute

export async function GET() {
  const sb = supabaseAdmin();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const { data, error } = await sb
    .from("posts")
    .select("category, published_at, impressions, engagement_rate")
    .eq("status", "published")
    .not("published_at", "is", null)
    .gte("published_at", ninetyDaysAgo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (data ?? []) as RankablePost[];
  const rankings = rankCategories(posts);
  const eligible_count = rankings.filter(
    (r) => r.confidence !== "insufficient"
  ).length;

  return NextResponse.json({
    rankings,
    eligible_count,
    total_count: posts.length,
    generated_at: new Date().toISOString(),
    window_days: 90,
  });
}
