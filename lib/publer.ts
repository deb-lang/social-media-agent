// Publer API client.
//
// Verified contract on 2026-04-30 via support ticket + doc reading:
//
// MEDIA UPLOAD: the old `POST /media` JSON `{url, type}` endpoint is deprecated.
// Two current options:
//   1. POST /media — multipart/form-data with `file` (direct file upload)
//   2. POST /media/from-url — JSON {media:[{url, name}], type:"single", ...}
//      Returns {job_id} — the actual media descriptors come from polling
//      /job_status/{job_id}; payload is an array. PDFs auto-decompose into
//      per-page PNGs (each becomes a "photo" media item).
//
// SCHEDULE: wraps in `bulk: { state, posts }`. Media is referenced inline as
// `media: [{id, type:"photo"}]` in `networks.linkedin`. PDF carousels add
// `details: {type: "document"}` + `title` at the linkedin level.
//
// JOB STATUS: `{status, payload}` where payload is failures-keyed-by-account
// for schedule jobs, and an array of media descriptors for media jobs.
// payload is consumed on first complete read — capture it eagerly.
//
// Other gotchas:
// - Auth header is "Bearer-API" not "Bearer".
// - Rate limit: 100 req / 2-min rolling window.

const BASE_URL = "https://app.publer.com/api/v1";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer-API ${requireEnv("PUBLER_API_KEY")}`,
    "Publer-Workspace-Id": requireEnv("PUBLER_WORKSPACE_ID"),
    "Content-Type": "application/json",
  };
}

async function request<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T; status: number; rateLimitRemaining: number | null }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
  });
  const rateLimitRemaining = res.headers.get("X-RateLimit-Remaining");
  const remaining = rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null;

  if (!res.ok && res.status !== 202) {
    const body = await res.text();
    throw new PublerError(
      `Publer ${init.method ?? "GET"} ${path} → ${res.status}: ${body}`,
      res.status
    );
  }

  const data = (await res.json().catch(() => ({}))) as T;
  return { data, status: res.status, rateLimitRemaining: remaining };
}

export class PublerError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PublerError";
  }
}

// ─── Social accounts ──────────────────────────────────────
export interface SocialAccount {
  id: string;
  provider: string;
  name: string;
  type: string;
  social_id?: string;
  picture?: string;
}

export async function listSocialAccounts(): Promise<SocialAccount[]> {
  const { data } = await request<SocialAccount[]>("/accounts");
  return data;
}

// ─── Media upload ─────────────────────────────────────────
// MediaDescriptor mirrors what /job_status returns for media jobs: each
// uploaded asset gets one descriptor. PDFs decompose into N descriptors,
// one per page, each marked type="photo".
export interface MediaDescriptor {
  id: string;
  path?: string;
  thumbnail?: string;
  type?: string; // "photo" | "video" | "document"
  width?: number;
  height?: number;
  name?: string;
  caption?: string;
  source?: string | null;
  validity?: Record<string, unknown>;
}

interface UploadFromUrlResponse {
  job_id: string;
}

/**
 * Kick off an async media upload from a public URL. Returns a job_id that
 * must be polled via pollJobStatus to retrieve the media descriptors.
 * Use uploadMediaAndWait() for the common one-shot path.
 */
export async function uploadMediaFromUrl(opts: {
  url: string;
  name?: string;
  caption?: string;
  inLibrary?: boolean;
}): Promise<UploadFromUrlResponse> {
  const { data } = await request<UploadFromUrlResponse>("/media/from-url", {
    method: "POST",
    body: JSON.stringify({
      media: [
        {
          url: opts.url,
          name: opts.name ?? "post-asset",
          caption: opts.caption,
        },
      ],
      type: "single",
      direct_upload: true,
      in_library: opts.inLibrary ?? false,
    }),
  });
  return data;
}

/**
 * Upload media from URL and wait for processing to complete. Returns the
 * array of media descriptors (1 per uploaded asset; PDFs decompose to N).
 */
export async function uploadMediaAndWait(opts: {
  url: string;
  name?: string;
  caption?: string;
}): Promise<MediaDescriptor[]> {
  const { job_id } = await uploadMediaFromUrl(opts);
  const status = await pollJobStatus<MediaDescriptor[]>(job_id, {
    maxAttempts: 30,
    baseDelayMs: 1000,
  });
  if (status.status === "failed") {
    throw new PublerError(
      `Media upload job ${job_id} failed: ${JSON.stringify(status.payload ?? {}).slice(0, 200)}`,
      500
    );
  }
  return Array.isArray(status.payload) ? status.payload : [];
}

// ─── Schedule post (bulk format) ──────────────────────────
export interface MediaRef {
  id: string;
  type: "photo" | "video" | "document";
}

export interface ScheduleImagePostInput {
  socialAccountIds: string[];
  text: string;
  mediaItems: MediaRef[]; // typically 1 item for image posts
  scheduledAt: string; // ISO 8601
}

export interface ScheduleCarouselPostInput {
  socialAccountIds: string[];
  text: string;
  mediaItems: MediaRef[]; // N items (one per slide, after PDF decomposition)
  scheduledAt: string;
  carouselTitle: string;
}

export interface ScheduleResponse {
  job_id: string;
}

function accountsArray(
  socialAccountIds: string[],
  scheduledAt: string
): Array<{ id: string; scheduled_at: string }> {
  return socialAccountIds.map((id) => ({ id, scheduled_at: scheduledAt }));
}

export async function scheduleImagePost(
  input: ScheduleImagePostInput
): Promise<ScheduleResponse> {
  const { data } = await request<ScheduleResponse>("/posts/schedule", {
    method: "POST",
    body: JSON.stringify({
      bulk: {
        state: "scheduled",
        posts: [
          {
            networks: {
              linkedin: {
                type: "photo",
                text: input.text,
                media: input.mediaItems.map((m) => ({ id: m.id, type: m.type })),
              },
            },
            accounts: accountsArray(input.socialAccountIds, input.scheduledAt),
          },
        ],
      },
    }),
  });
  return data;
}

export async function scheduleCarouselPost(
  input: ScheduleCarouselPostInput
): Promise<ScheduleResponse> {
  // LinkedIn document/PDF carousel: media[].type stays "photo" (Publer
  // recomposes), but details.type="document" + title is what tells LinkedIn
  // to render as a PDF carousel post.
  const { data } = await request<ScheduleResponse>("/posts/schedule", {
    method: "POST",
    body: JSON.stringify({
      bulk: {
        state: "scheduled",
        posts: [
          {
            networks: {
              linkedin: {
                type: "photo",
                text: input.text,
                media: input.mediaItems.map((m) => ({ id: m.id, type: m.type })),
                details: { type: "document" },
                title: input.carouselTitle,
              },
            },
            accounts: accountsArray(input.socialAccountIds, input.scheduledAt),
          },
        ],
      },
    }),
  });
  return data;
}

// ─── Job status (generic) ─────────────────────────────────
export interface JobStatus<P = unknown> {
  status: "pending" | "working" | "complete" | "completed" | "failed";
  payload?: P;
}

export async function pollJobStatus<P = unknown>(
  jobId: string,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<JobStatus<P>> {
  const maxAttempts = opts.maxAttempts ?? 15;
  const baseDelayMs = opts.baseDelayMs ?? 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await request<JobStatus<P>>(`/job_status/${jobId}`);
    if (
      data.status === "complete" ||
      data.status === "completed" ||
      data.status === "failed"
    ) {
      return data;
    }
    const delay = Math.min(baseDelayMs * 2 ** attempt, 8000);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new PublerError(`Job ${jobId} did not resolve within ${maxAttempts} polls`, 408);
}

/**
 * Resolve a Publer post_id by matching the text snippet — the new schedule API
 * doesn't return the post_id directly. Returns null if no match (caller
 * should treat as "scheduled but post_id unknown" and proceed; analytics
 * sync can reconcile if needed).
 */
export async function findRecentPostIdByText(
  accountId: string,
  text: string,
  state: "scheduled" | "published" = "scheduled"
): Promise<string | null> {
  const { data } = await request<{
    posts: Array<{ id: string; text: string; account_id: string; state: string }>;
  }>(`/posts?state=${state}&limit=20`);
  const match = (data.posts ?? []).find(
    (p) => p.account_id === accountId && p.text.trim() === text.trim()
  );
  return match?.id ?? null;
}

// ─── Post insights (analytics) ────────────────────────────
//
// CONTRACT CHANGED 2026-05 (verified via docs at
// publer.com/docs/analytics/post-insights):
//   - Old single-post endpoint /analytics/{accountId}/post_insights?post_id=X
//     returns 500 for every input shape. Probably retired.
//   - New endpoint is the SAME URL but returns a paginated LIST of all posts
//     in a date range, each carrying an `analytics` dict. Required query
//     params are `from` and `to` (YYYY-MM-DD).
//
// Field mapping → our DB:
//   analytics.reach.value         → posts.impressions
//   analytics.engagement_rate.value → posts.engagement_rate
//   analytics.likes.value         → posts.likes
//   analytics.comments.value      → posts.comments
//   analytics.shares.value        → posts.shares
//   analytics.post_clicks.value   → posts.link_clicks (closest semantic match)
//   (no follower_delta in the new response — column stays null)

export interface MetricCell {
  name?: string;
  value: number | null;
  tooltip?: { text?: string };
}

export interface PublerAnalyticsPost {
  id: string;             // current Publer numeric/string id
  old_id: string | null;  // the scheduled-state id we stored as publer_post_id
  post_id: string | null; // network URN (e.g. "urn:li:ugcPost:7458199068901539840")
  post_link: string | null;
  state: string;
  scheduled_at: string;
  text: string;
  title: string | null;
  account_id: string;
  type: string;
  analytics?: {
    reach?: MetricCell;
    reach_rate?: MetricCell;
    video_views?: MetricCell;
    likes?: MetricCell;
    comments?: MetricCell;
    shares?: MetricCell;
    post_clicks?: MetricCell;
    engagement_rate?: MetricCell;
  };
}

export interface PostInsightsPage {
  posts: PublerAnalyticsPost[];
  total: number;
}

/**
 * Get one page of post insights (10 posts/page). Returns up to 10 published
 * posts in the requested date range, each carrying an analytics dict.
 */
export async function listPostInsights(opts: {
  accountId: string;
  from: string;     // YYYY-MM-DD
  to: string;       // YYYY-MM-DD
  page?: number;    // 0-based
  sortBy?: "scheduled_at" | "reach" | "engagement_rate" | "post_clicks" | "likes";
  sortType?: "ASC" | "DESC";
}): Promise<PostInsightsPage> {
  const params = new URLSearchParams({
    from: opts.from,
    to: opts.to,
    page: String(opts.page ?? 0),
  });
  if (opts.sortBy) params.set("sort_by", opts.sortBy);
  if (opts.sortType) params.set("sort_type", opts.sortType);
  const { data } = await request<PostInsightsPage>(
    `/analytics/${opts.accountId}/post_insights?${params.toString()}`
  );
  return data;
}

/**
 * Walk all pages and collect every published post in the date range. The
 * sync route uses this rather than poking by-post-id (which the API no
 * longer supports).
 */
// ─── Best times to post (heatmap) ───────────────────────────
// GET /analytics/{accountId}/best_times?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns { Monday: number[24], ..., Sunday: number[24] } — each day maps
// to an array of 24 hourly engagement scores (higher = better posting time).
// Scores are relative within the dataset; many will be 0 for accounts with
// sparse posting history. Refreshed by Publer ~daily.

export type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type BestTimesHeatmap = Record<DayName, number[]>;

export async function getBestTimes(opts: {
  accountId: string;
  from: string; // YYYY-MM-DD
  to: string;
}): Promise<BestTimesHeatmap> {
  const params = new URLSearchParams({ from: opts.from, to: opts.to });
  const { data } = await request<BestTimesHeatmap>(
    `/analytics/${opts.accountId}/best_times?${params.toString()}`
  );
  return data;
}

export async function listAllPostInsights(opts: {
  accountId: string;
  from: string;
  to: string;
  maxPages?: number;
}): Promise<PublerAnalyticsPost[]> {
  const maxPages = opts.maxPages ?? 20;
  const all: PublerAnalyticsPost[] = [];
  for (let page = 0; page < maxPages; page++) {
    const { posts } = await listPostInsights({
      accountId: opts.accountId,
      from: opts.from,
      to: opts.to,
      page,
    });
    if (posts.length === 0) break;
    all.push(...posts);
    if (posts.length < 10) break; // last page
  }
  return all;
}
