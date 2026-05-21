// Pick top-performing posts to use as seeds for the "suggest from winners"
// feature. Pure function — no I/O. Applies the same reliability gates as
// the category recommender (N>=5 posts AND >=50 impressions per category)
// so we never recommend on noisy data.

import { CONTENT_CATEGORIES, type ContentCategory } from "./constants";

export interface SeedablePost {
  id: string;
  category: ContentCategory;
  format: "image" | "carousel";
  caption: string;
  published_at: string | null;
  impressions: number | null;
  engagement_rate: number | null;
}

export interface Winner {
  post: SeedablePost;
  category: ContentCategory;
  // Engagement rate, snapped to 2 decimals. Used purely for UI display.
  engagement_rate: number;
}

export interface PickWinnersResult {
  winners: Winner[];
  eligible_categories: number;
  total_published: number;
  reasoning: string;
}

// Reliability gates — match lib/recommender.ts so the two features have a
// consistent definition of "trusted data".
const MIN_POSTS = 5;
const MIN_IMPRESSIONS = 50;
const WINDOW_DAYS = 90;
const MAX_WINNERS = 3;

/**
 * Filter the input list of posts down to top winners. Inputs are expected
 * to be post rows from `posts WHERE status='published'`; this function does
 * its own date-window + null-field filtering so callers don't have to.
 *
 * `excludeSeedIds` — pass IDs of posts already used as seeds in the last 7
 * days (read from audit_log). They're skipped to force angle diversity.
 */
export function pickWinners(
  posts: SeedablePost[],
  opts: { excludeSeedIds?: Set<string>; now?: Date } = {}
): PickWinnersResult {
  const now = opts.now ?? new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const excluded = opts.excludeSeedIds ?? new Set<string>();

  // 1. Filter to "valid" posts: in window, has impressions + engagement_rate.
  const valid: SeedablePost[] = [];
  for (const p of posts) {
    if (!p.published_at) continue;
    const t = new Date(p.published_at).getTime();
    if (Number.isNaN(t) || t < windowStart.getTime()) continue;
    if (p.impressions == null || p.engagement_rate == null) continue;
    valid.push(p);
  }

  const totalPublished = valid.length;

  // 2. Bucket by category and apply gates.
  const buckets = new Map<ContentCategory, SeedablePost[]>();
  for (const cat of CONTENT_CATEGORIES) buckets.set(cat, []);
  for (const p of valid) buckets.get(p.category)?.push(p);

  const eligibleCategories: ContentCategory[] = [];
  for (const cat of CONTENT_CATEGORIES) {
    const bucket = buckets.get(cat) ?? [];
    const totalImpressions = bucket.reduce(
      (sum, p) => sum + (p.impressions ?? 0),
      0
    );
    if (bucket.length >= MIN_POSTS && totalImpressions >= MIN_IMPRESSIONS) {
      eligibleCategories.push(cat);
    }
  }

  // 3. Collect candidate winners across eligible categories, excluding any
  // posts that were already used as a seed in the last 7 days.
  const candidates: Winner[] = [];
  for (const cat of eligibleCategories) {
    for (const p of buckets.get(cat) ?? []) {
      if (excluded.has(p.id)) continue;
      candidates.push({
        post: p,
        category: cat,
        engagement_rate: Number((p.engagement_rate ?? 0).toFixed(2)),
      });
    }
  }

  // 4. Sort by engagement_rate DESC, impressions DESC. Take top N.
  candidates.sort((a, b) => {
    const er = b.engagement_rate - a.engagement_rate;
    if (er !== 0) return er;
    return (b.post.impressions ?? 0) - (a.post.impressions ?? 0);
  });
  const winners = candidates.slice(0, MAX_WINNERS);

  // 5. Build reasoning copy.
  let reasoning: string;
  if (eligibleCategories.length === 0) {
    reasoning = `Need ${MIN_POSTS}+ published posts AND ${MIN_IMPRESSIONS}+ impressions per category before we can pick winners. Currently ${totalPublished} published in the last ${WINDOW_DAYS}d.`;
  } else if (winners.length === 0) {
    reasoning = `${eligibleCategories.length} eligible categor${eligibleCategories.length === 1 ? "y" : "ies"}, but all top winners were recently used as seeds. Try again later.`;
  } else {
    const top = winners[0];
    reasoning = `${winners.length} winner${winners.length === 1 ? "" : "s"} across ${eligibleCategories.length} eligible categor${eligibleCategories.length === 1 ? "y" : "ies"}. Top: ${top.category}/${top.post.format} at ${top.engagement_rate}% engagement.`;
  }

  return {
    winners,
    eligible_categories: eligibleCategories.length,
    total_published: totalPublished,
    reasoning,
  };
}
