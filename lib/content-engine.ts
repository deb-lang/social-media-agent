// Content engine — picks categories and formats for each run, assembles the
// volatile context Claude sees, and marks external stats as used so they don't
// recycle. Every decision is data-driven from the posts + external_stats
// tables, not hardcoded.

import { CONTENT_CATEGORIES, type ContentCategory, type PostFormat } from "./constants";
import { APPROVED_STATS, type ApprovedStat, type StatTopic } from "./approved-stats";
import { supabaseAdmin } from "./supabase";
import type { RecentPostSummary } from "./claude";

// ─── Category rotation ─────────────────────────────────

export interface PickCategoriesOptions {
  /**
   * Optional 0..1 weights from the recommender. When provided AND at least
   * one weight is > 0, picks are biased toward winners. When absent or all
   * zero, behavior reduces to pure LRU rotation. Always reserves >=1 of N
   * picks for a non-winning category to preserve mix coverage.
   */
  performanceWeights?: Record<ContentCategory, number>;
}

/**
 * Pick N categories. Default behavior: least recently used rotation, with a
 * 2-run cooldown on `lead_magnet`. When `performanceWeights` is supplied with
 * at least one positive value, picks combine LRU + performance:
 *   score = lruScore * 0.4 + performanceWeight * 0.6
 * and at least one pick is reserved for a non-winning category.
 */
export async function pickCategories(
  count = 2,
  opts: PickCategoriesOptions = {}
): Promise<ContentCategory[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("posts")
    .select("category, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`pickCategories: ${error.message}`);
  const rows = (data ?? []) as { category: ContentCategory; created_at: string }[];

  // Build a map of "most recent index" per category. Lower = more recent.
  const recency = new Map<ContentCategory, number>();
  rows.forEach((r, i) => {
    if (!recency.has(r.category)) recency.set(r.category, i);
  });

  const weights = opts.performanceWeights;
  const winners = weights
    ? new Set(
        (Object.entries(weights) as [ContentCategory, number][])
          .filter(([, w]) => w > 0)
          .map(([cat]) => cat)
      )
    : new Set<ContentCategory>();

  // Normalized LRU score: 0 (most recent) → 1 (never seen). Higher = pick first.
  const denom = Math.max(rows.length, 1);
  const lruScore = (cat: ContentCategory): number => {
    const r = recency.get(cat);
    if (r === undefined) return 1.0;
    return r / denom;
  };

  // Hybrid score. With no winners, weight is zero → behavior reduces to LRU.
  const score = (cat: ContentCategory): number =>
    lruScore(cat) * 0.4 + (weights?.[cat] ?? 0) * 0.6;

  const sorted = [...CONTENT_CATEGORIES].sort((a, b) => score(b) - score(a));

  const picks: ContentCategory[] = [];
  for (const cat of sorted) {
    if (picks.length >= count) break;
    if (cat === "lead_magnet" && rows.slice(0, 2).some((r) => r.category === "lead_magnet")) {
      continue; // used within last 2 runs, skip
    }
    picks.push(cat);
  }
  while (picks.length < count) {
    const remaining = CONTENT_CATEGORIES.filter((c) => !picks.includes(c));
    if (!remaining.length) break;
    picks.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }

  // Mix-coverage rule: when winners exist and we're picking >1, never let
  // the entire run be winners — swap the last pick for the best non-winner.
  if (winners.size > 0 && count > 1 && picks.every((p) => winners.has(p))) {
    const replacement = sorted.find(
      (c) => !winners.has(c) && !picks.includes(c)
    );
    if (replacement) picks[picks.length - 1] = replacement;
  }

  return picks;
}

// ─── Format assignment ─────────────────────────────────

/**
 * Within a run, assign formats such that 1 post is image and 1 is carousel.
 * Carousel affinity: missing_middle, stat_post (with lots of data), lead_magnet.
 * Image affinity: thought_leadership, perfectpatient.
 */
export function assignFormats(categories: ContentCategory[]): PostFormat[] {
  const carouselPriority: ContentCategory[] = ["missing_middle", "stat_post", "lead_magnet"];
  const withScores = categories.map((c, i) => ({
    index: i,
    category: c,
    carouselScore: carouselPriority.indexOf(c) === -1 ? 99 : carouselPriority.indexOf(c),
  }));
  // Sort ascending: lowest score = most carousel-worthy
  withScores.sort((a, b) => a.carouselScore - b.carouselScore);
  const assignments = new Array<PostFormat>(categories.length).fill("image");
  if (withScores[0]) assignments[withScores[0].index] = "carousel";
  return assignments;
}

// ─── Stat selection ────────────────────────────────────

/**
 * Return approved stats relevant for a category, filtered to avoid stats used
 * in the last N posts (dedup pressure).
 */
export async function statsForCategory(
  category: ContentCategory,
  opts: { excludeRecentWindow?: number } = {}
): Promise<ApprovedStat[]> {
  const n = opts.excludeRecentWindow ?? 6;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("posts")
    .select("category")
    .order("created_at", { ascending: false })
    .limit(n);
  void data;

  // Get IDs used in recent posts (stored as chosen_stat_ids — pending a join
  // once Phase 3 lands. For now we pull caption text and do a soft match).
  const { data: recent } = await sb
    .from("posts")
    .select("caption")
    .order("created_at", { ascending: false })
    .limit(n);
  const recentTexts = ((recent ?? []) as { caption: string }[]).map((r) => r.caption ?? "");

  const topicMap: Record<ContentCategory, StatTopic[]> = {
    stat_post: ["pharma_commercial", "clinical_trials", "ai_mentor", "research_citation"],
    thought_leadership: ["pharma_commercial", "research_citation"],
    missing_middle: ["pharma_commercial", "research_citation"],
    lead_magnet: ["pharma_commercial", "clinical_trials"],
    perfectpatient: ["ai_mentor", "pharma_commercial"],
  };
  const topics = topicMap[category];
  const pool = APPROVED_STATS.filter((s) => topics.includes(s.topic));

  // Soft dedup: deprioritize stats whose exact value appears verbatim in recent captions
  return pool.sort((a, b) => {
    const aRecent = recentTexts.some((t) => t.includes(a.value)) ? 1 : 0;
    const bRecent = recentTexts.some((t) => t.includes(b.value)) ? 1 : 0;
    return aRecent - bRecent;
  });
}

// ─── Recent post summaries (for Claude's volatile context) ────

export async function recentPostSummaries(n = 8): Promise<RecentPostSummary[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("posts")
    .select("category, caption, hashtags, scheduled_for")
    .order("created_at", { ascending: false })
    .limit(n);
  if (error) throw new Error(`recentPostSummaries: ${error.message}`);
  const rows = (data ?? []) as Array<{
    category: ContentCategory;
    caption: string;
    hashtags: string[];
    scheduled_for: string | null;
  }>;
  return rows.map((r) => ({
    category: r.category,
    caption: r.caption ?? "",
    hashtags: r.hashtags ?? [],
    chosen_stat_ids: [], // TODO: once we add chosen_stat_ids column (Phase 3)
    scheduled_for: r.scheduled_for,
  }));
}

// ─── Mark stats as used ───────────────────────────────

export async function markExternalStatsUsed(params: {
  stat_urls: string[];
  post_id: string;
}): Promise<void> {
  if (!params.stat_urls.length) return;
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("external_stats")
    .update({ used_in_post_id: params.post_id, used_at: new Date().toISOString() })
    .in("source_url", params.stat_urls);
  if (error) throw new Error(`markExternalStatsUsed: ${error.message}`);
}
