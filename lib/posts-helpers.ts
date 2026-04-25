// Shared types + Supabase SELECT shapes for post queries.
// Keeps the list and detail endpoints consistent with the queue UI's expectations.

import type { ContentCategory, PostFormat } from "./constants";

export type PostStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed"
  | "deleted"; // soft-deleted; filter out everywhere by default

export type Platform = "linkedin" | "twitter" | "facebook";

export type ComplianceStatus = "pending" | "pass" | "flag" | "block";

export interface PostListRow {
  id: string;
  created_at: string;
  updated_at: string;
  category: ContentCategory;
  format: PostFormat;
  platform: Platform;
  caption: string;
  hashtags: string[];
  image_url: string | null;
  carousel_pdf_url: string | null;
  carousel_slide_previews: string[] | null;
  status: PostStatus;
  rejection_feedback: string | null;
  rejection_count: number;
  scheduled_for: string | null;
  schedule_override: boolean;
  approved_at: string | null;
  approved_by: string | null;
  published_at: string | null;
  published_url: string | null;
  publer_post_id: string | null;
  publer_job_id: string | null;
  // Quality gates
  originality_score: number | null;
  compliance_status: ComplianceStatus;
  plagiarism_flags: unknown;
  compliance_issues: unknown;
  stat_value: string | null;
  stat_source: string | null;
  stat_url: string | null;
  stat_verified: boolean;
  // Analytics
  impressions: number | null;
  engagement_rate: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  link_clicks: number | null;
  follower_delta: number | null;
  // Recycling
  is_recycled: boolean;
  recycled_from_post_id: string | null;
  utm_campaign: string | null;
  generation_run_id: string | null;
}

// Columns that the list endpoint selects — mirrors PostListRow.
export const POST_LIST_COLUMNS =
  "id, created_at, updated_at, category, format, platform, caption, hashtags, image_url, carousel_pdf_url, carousel_slide_previews, status, rejection_feedback, rejection_count, scheduled_for, schedule_override, approved_at, approved_by, published_at, published_url, publer_post_id, publer_job_id, originality_score, compliance_status, plagiarism_flags, compliance_issues, stat_value, stat_source, stat_url, stat_verified, impressions, engagement_rate, likes, comments, shares, link_clicks, follower_delta, is_recycled, recycled_from_post_id, utm_campaign, generation_run_id";

// Parse JSONB that may come back as an already-parsed array OR a string.
// Supabase returns JSONB as parsed JS values, but our orchestrator stringifies
// some writes — this handles both.
export function parseJsonb<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

// Shape a raw row from Supabase (after select) into a normalized PostListRow
// where JSONB fields are always parsed arrays/objects (never strings).
export function normalizePostRow(row: Record<string, unknown>): PostListRow {
  const r = row as Record<string, unknown>;
  return {
    ...(r as unknown as PostListRow),
    carousel_slide_previews: parseJsonb<string[]>(r.carousel_slide_previews),
    plagiarism_flags: parseJsonb<unknown>(r.plagiarism_flags),
    compliance_issues: parseJsonb<unknown>(r.compliance_issues),
  };
}
