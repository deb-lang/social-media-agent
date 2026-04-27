// Performance recommender. Pure function — no I/O.
// Takes published posts with performance fields and returns one ranking row
// per ContentCategory (always 5 rows). Confidence gates are intentionally
// strict so we never recommend on noisy data.

import { CONTENT_CATEGORIES, type ContentCategory } from "./constants";

export interface RankablePost {
  category: ContentCategory;
  published_at: string | null;
  impressions: number | null;
  engagement_rate: number | null;
}

export type Confidence = "high" | "low" | "insufficient";

export interface CategoryRanking {
  category: ContentCategory;
  sample_size: number;
  total_impressions: number;
  weighted_engagement_rate: number | null;
  confidence: Confidence;
  rank: number | null;
  reasoning: string;
}

// Reliability gates (locked in with the user — see plan).
const MIN_POSTS = 5;
const MIN_IMPRESSIONS = 50;
const HIGH_CONFIDENCE_POSTS = 10;
const WINDOW_DAYS = 90;
const RECENT_DAYS = 30;
const RECENT_WEIGHT = 2.0;
const OLDER_WEIGHT = 1.0;

/**
 * Rank the 5 ContentCategories by recency-weighted engagement rate over the
 * trailing 90-day window. Categories with insufficient data return
 * confidence="insufficient" and rank=null. Eligible categories are sorted by
 * weighted engagement rate desc; top 3 with confidence="high" drive cron
 * weighting downstream.
 */
export function rankCategories(
  posts: RankablePost[],
  now: Date = new Date()
): CategoryRanking[] {
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);

  // Pre-bucket posts by category, dropping anything outside the window or
  // missing the fields we need.
  const buckets = new Map<ContentCategory, RankablePost[]>();
  for (const cat of CONTENT_CATEGORIES) buckets.set(cat, []);
  for (const p of posts) {
    if (!p.published_at) continue;
    const t = new Date(p.published_at).getTime();
    if (Number.isNaN(t) || t < windowStart.getTime()) continue;
    const bucket = buckets.get(p.category);
    if (!bucket) continue;
    bucket.push(p);
  }

  // Compute per-category stats.
  const rows: Omit<CategoryRanking, "rank">[] = CONTENT_CATEGORIES.map((category) => {
    const cposts = buckets.get(category) ?? [];
    const sample_size = cposts.length;
    const total_impressions = cposts.reduce(
      (sum, p) => sum + (p.impressions ?? 0),
      0
    );

    if (sample_size < MIN_POSTS || total_impressions < MIN_IMPRESSIONS) {
      const need = Math.max(0, MIN_POSTS - sample_size);
      const reasoning =
        sample_size === 0
          ? `0 published posts in last ${WINDOW_DAYS}d`
          : need > 0
            ? `${sample_size} post${sample_size === 1 ? "" : "s"} · ${total_impressions.toLocaleString()} impressions · need ${need} more post${need === 1 ? "" : "s"} before this is reliable`
            : `${sample_size} posts · only ${total_impressions} impressions · need ${MIN_IMPRESSIONS}+ to trust the rate`;
      return {
        category,
        sample_size,
        total_impressions,
        weighted_engagement_rate: null,
        confidence: "insufficient" as const,
        reasoning,
      };
    }

    // Recency-weighted engagement rate. Posts in last 30 days count 2x.
    let scoreSum = 0;
    let weightSum = 0;
    for (const p of cposts) {
      if (p.engagement_rate == null) continue;
      const ageDays =
        (now.getTime() - new Date(p.published_at as string).getTime()) /
        86_400_000;
      const w = ageDays <= RECENT_DAYS ? RECENT_WEIGHT : OLDER_WEIGHT;
      scoreSum += p.engagement_rate * w;
      weightSum += w;
    }
    const weighted_engagement_rate =
      weightSum > 0 ? Number((scoreSum / weightSum).toFixed(2)) : null;

    const confidence: Confidence =
      sample_size >= HIGH_CONFIDENCE_POSTS ? "high" : "low";
    const reasoning =
      `${sample_size} posts · ${total_impressions.toLocaleString()} impressions · ${
        weighted_engagement_rate ?? "—"
      }% avg engagement` +
      (confidence === "high" ? " · winning" : " · low confidence");

    return {
      category,
      sample_size,
      total_impressions,
      weighted_engagement_rate,
      confidence,
      reasoning,
    };
  });

  // Rank eligible (non-insufficient) categories by weighted engagement desc.
  const eligible = rows
    .filter((r) => r.confidence !== "insufficient")
    .sort(
      (a, b) =>
        (b.weighted_engagement_rate ?? 0) - (a.weighted_engagement_rate ?? 0)
    );
  const rankByCategory = new Map<ContentCategory, number>();
  eligible.forEach((r, i) => rankByCategory.set(r.category, i + 1));

  return rows.map((r) => ({
    ...r,
    rank: rankByCategory.get(r.category) ?? null,
  }));
}

/**
 * Build the performanceWeights map that pickCategories() consumes. Only
 * categories with confidence="high" contribute (cron weighting is gated
 * harder than the UI hint, per the plan). Returns 0..1 weights normalized
 * so the top winner is 1.0.
 */
export function highConfidenceWeights(
  rankings: CategoryRanking[]
): Record<ContentCategory, number> {
  const winners = rankings.filter(
    (r) => r.confidence === "high" && r.weighted_engagement_rate != null
  );
  const weights: Record<string, number> = {};
  for (const cat of CONTENT_CATEGORIES) weights[cat] = 0;
  if (winners.length === 0) return weights as Record<ContentCategory, number>;
  const max = Math.max(
    ...winners.map((w) => w.weighted_engagement_rate ?? 0)
  );
  if (max <= 0) return weights as Record<ContentCategory, number>;
  for (const w of winners) {
    weights[w.category] = (w.weighted_engagement_rate ?? 0) / max;
  }
  return weights as Record<ContentCategory, number>;
}
