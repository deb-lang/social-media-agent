// GET /api/analytics/summary
// Aggregates dashboard + analytics-page metrics:
// - This month totals: impressions, avg engagement rate, link clicks, follower delta
// - 6-month trend series (month-bucketed)
// - Best/worst published post (by engagement rate)
// - Per-category + per-format averages

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface MonthlyBucket {
  month: string; // YYYY-MM
  impressions: number;
  engagement_rate_avg: number;
  link_clicks: number;
  follower_delta: number;
  post_count: number;
}

interface PostSummary {
  id: string;
  category: string;
  format: string;
  caption: string;
  impressions: number | null;
  engagement_rate: number | null;
  link_clicks: number | null;
  published_at: string | null;
  image_url: string | null;
  carousel_pdf_url: string | null;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const sb = supabaseAdmin();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: published, error } = await sb
    .from("posts")
    .select(
      "id, category, format, caption, impressions, engagement_rate, likes, comments, shares, link_clicks, follower_delta, published_at, image_url, carousel_pdf_url"
    )
    .eq("status", "published")
    .not("published_at", "is", null)
    .gte("published_at", sixMonthsAgo.toISOString())
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (published ?? []) as Array<PostSummary & { likes: number | null; comments: number | null; shares: number | null; follower_delta: number | null }>;

  // This month totals (local month, not rolling 30)
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = rows.filter((r) => r.published_at && monthKey(r.published_at) === currentMonth);

  const sum = (arr: Array<number | null | undefined>) =>
    arr.reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const avg = (arr: Array<number | null | undefined>) => {
    const nums = arr.filter((v): v is number => typeof v === "number");
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };

  const summary = {
    month: currentMonth,
    post_count: thisMonth.length,
    impressions: sum(thisMonth.map((r) => r.impressions)),
    engagement_rate_avg: Number(avg(thisMonth.map((r) => r.engagement_rate)).toFixed(2)),
    link_clicks: sum(thisMonth.map((r) => r.link_clicks)),
    follower_delta: sum(thisMonth.map((r) => r.follower_delta)),
  };

  // 6-month trend bucketed
  const byMonth = new Map<string, PostSummary[]>();
  for (const r of rows) {
    if (!r.published_at) continue;
    const k = monthKey(r.published_at);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k)!.push(r);
  }
  const trend: MonthlyBucket[] = Array.from(byMonth.entries())
    .map(([month, posts]) => ({
      month,
      impressions: sum(posts.map((p) => p.impressions)),
      engagement_rate_avg: Number(avg(posts.map((p) => p.engagement_rate)).toFixed(2)),
      link_clicks: sum(posts.map((p) => p.link_clicks)),
      follower_delta: sum(posts.map((p) => (p as PostSummary & { follower_delta: number | null }).follower_delta)),
      post_count: posts.length,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Best + worst by engagement rate (only where we have data)
  const scored = rows
    .filter((r) => typeof r.engagement_rate === "number")
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0));
  const best = scored[0] ?? null;
  const worst = scored[scored.length - 1] ?? null;

  // Per-category averages
  const byCat = new Map<string, PostSummary[]>();
  for (const r of rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category)!.push(r);
  }
  const byCategory = Array.from(byCat.entries())
    .map(([category, posts]) => ({
      category,
      post_count: posts.length,
      avg_impressions: Math.round(avg(posts.map((p) => p.impressions))),
      avg_engagement_rate: Number(avg(posts.map((p) => p.engagement_rate)).toFixed(2)),
      total_clicks: sum(posts.map((p) => p.link_clicks)),
    }))
    .sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate);

  const byFormat = ["image", "carousel"].map((format) => {
    const posts = rows.filter((r) => r.format === format);
    return {
      format,
      post_count: posts.length,
      avg_impressions: Math.round(avg(posts.map((p) => p.impressions))),
      avg_engagement_rate: Number(avg(posts.map((p) => p.engagement_rate)).toFixed(2)),
    };
  });

  return NextResponse.json({
    summary,
    trend,
    best,
    worst,
    by_category: byCategory,
    by_format: byFormat,
  });
}
