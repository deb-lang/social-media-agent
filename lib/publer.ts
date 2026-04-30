// Publer API client.
//
// IMPORTANT: Publer's schedule endpoint contract changed (verified 2026-04-30
// via support ticket). All schedule calls now wrap in `bulk: { state, posts }`
// with target accounts moved into `accounts[]`. The old top-level
// `social_account_ids/text/scheduled_at` shape returns 500 silently.
//
// Other gotchas:
// - Auth header is "Bearer-API" not "Bearer" (Publer-specific).
// - Schedule returns 202 + job_id; poll /job_status/{id} until status=="complete"
//   (success when payload.failures is empty) or status=="failed".
// - LinkedIn carousels = PDF document posts. Use type="photo" with
//   details.type="document", title, and media[].type="document".
// - LinkedIn image posts use type="photo" with media[].type="photo".
// - The job_status response no longer carries the published post_id; pull it
//   via GET /posts?state=scheduled and match by text.
// - Rate limit: 100 req / 2-min rolling window. Watch X-RateLimit-Remaining.
// - DELETE /posts with body filter is all-or-nothing for the workspace's
//   scheduled posts. Don't use it to retract a single post — use the UI.

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
export interface MediaUploadResponse {
  id: string;
  url?: string;
  path?: string;
  thumbnail?: string;
}

/**
 * Upload media (image or PDF document) by giving Publer a public URL.
 * For LinkedIn:
 *   - type:"image" → returned id is used as media[{id, type:"photo"}] in schedule
 *   - type:"document" → returned id is used as media[{id, type:"document"}] in schedule
 *     (combined with details.type="document" + title at the linkedin level)
 */
export async function uploadMedia(opts: {
  url: string;
  type: "image" | "document";
}): Promise<MediaUploadResponse> {
  const { data } = await request<MediaUploadResponse>("/media", {
    method: "POST",
    body: JSON.stringify({ url: opts.url, type: opts.type }),
  });
  return data;
}

// ─── Schedule post (bulk format) ──────────────────────────
export interface ScheduleImagePostInput {
  socialAccountIds: string[];
  text: string;
  mediaId: string;
  scheduledAt: string; // ISO 8601 with timezone offset
}

export interface ScheduleCarouselPostInput {
  socialAccountIds: string[];
  text: string;
  mediaId: string;
  scheduledAt: string;
  carouselTitle: string;
}

export interface ScheduleResponse {
  job_id: string;
}

/** Build the `accounts[]` array shared by both image + carousel schedules. */
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
                media: [{ id: input.mediaId, type: "photo" }],
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
  // LinkedIn document/PDF carousel: details.type="document" + title is required.
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
                media: [{ id: input.mediaId, type: "document" }],
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

// ─── Poll job status ──────────────────────────────────────
// New shape: { status: "complete"|"pending"|"failed", payload?: { failures: {...} } }
// Success = status === "complete" AND no failures. Per-account failures live in
// payload.failures keyed by account_id.
export interface JobStatus {
  status: "pending" | "complete" | "completed" | "failed";
  payload?: {
    failures?: Record<string, unknown>;
  };
}

export async function pollJobStatus(
  jobId: string,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<JobStatus> {
  const maxAttempts = opts.maxAttempts ?? 12;
  const baseDelayMs = opts.baseDelayMs ?? 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await request<JobStatus>(`/job_status/${jobId}`);
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
 * doesn't return the post_id directly, so we look up recent scheduled posts
 * and match by exact text. Returns null if no match (caller should treat as
 * "scheduled but post_id unknown" and proceed; analytics sync will reconcile).
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
export interface PostInsights {
  post_id: string;
  impressions?: number;
  engagement_rate?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  link_clicks?: number;
  follower_delta?: number;
}

export async function getPostInsights(
  accountId: string,
  postId: string
): Promise<PostInsights> {
  const { data } = await request<PostInsights>(
    `/analytics/${accountId}/post_insights?post_id=${encodeURIComponent(postId)}`
  );
  return data;
}
