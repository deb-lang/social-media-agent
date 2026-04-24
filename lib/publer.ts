// Publer API client.
// Gotchas:
// - Auth header is "Bearer-API" not "Bearer" (Publer-specific).
// - Scheduling endpoints return 202 + job_id; MUST poll /job_status/{id}.
// - LinkedIn carousels = PDF document posts, not image carousels. Requires
//   networks.linkedin.{type: "photo", details.type: "document", title: <str>}.
// - Rate limit: 100 req / 2-min rolling window. Watch X-RateLimit-Remaining.

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
// Publer's endpoint is /accounts (not /social_accounts despite some docs).
// Response uses "provider" (not "network") and "type" discriminates the flavor
// (e.g. LinkedIn company page = type "in_page").
export interface SocialAccount {
  id: string;
  provider: string; // "linkedin" | "instagram" | "facebook" | "twitter" | "x" | ...
  name: string;
  type: string; // "in_page" (LinkedIn company) | "ig_business" | etc.
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
}

export async function uploadMedia(opts: {
  url: string;
  type: "image" | "document";
}): Promise<MediaUploadResponse> {
  // Publer accepts public URLs for media upload (simpler than multipart).
  const { data } = await request<MediaUploadResponse>("/media", {
    method: "POST",
    body: JSON.stringify({ url: opts.url, type: opts.type }),
  });
  return data;
}

// ─── Schedule post ────────────────────────────────────────
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

export async function scheduleImagePost(
  input: ScheduleImagePostInput
): Promise<ScheduleResponse> {
  const { data } = await request<ScheduleResponse>("/posts/schedule", {
    method: "POST",
    body: JSON.stringify({
      social_account_ids: input.socialAccountIds,
      text: input.text,
      media_ids: [input.mediaId],
      scheduled_at: input.scheduledAt,
      state: "scheduled",
    }),
  });
  return data;
}

export async function scheduleCarouselPost(
  input: ScheduleCarouselPostInput
): Promise<ScheduleResponse> {
  // LinkedIn document posts require the nested networks.linkedin structure
  // with type=photo, details.type=document, and a title (required).
  const { data } = await request<ScheduleResponse>("/posts/schedule", {
    method: "POST",
    body: JSON.stringify({
      social_account_ids: input.socialAccountIds,
      text: input.text,
      networks: {
        linkedin: {
          type: "photo",
          details: { type: "document" },
          title: input.carouselTitle,
          media: [input.mediaId],
        },
      },
      scheduled_at: input.scheduledAt,
      state: "scheduled",
    }),
  });
  return data;
}

// ─── Poll job status ──────────────────────────────────────
export interface JobStatus {
  id: string;
  status: "pending" | "completed" | "failed";
  result?: { post_id?: string };
  error?: string;
}

export async function pollJobStatus(
  jobId: string,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<JobStatus> {
  const maxAttempts = opts.maxAttempts ?? 10;
  const baseDelayMs = opts.baseDelayMs ?? 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await request<JobStatus>(`/job_status/${jobId}`);
    if (data.status === "completed" || data.status === "failed") return data;
    // Exponential backoff capped at 8s
    const delay = Math.min(baseDelayMs * 2 ** attempt, 8000);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new PublerError(`Job ${jobId} did not resolve within ${maxAttempts} polls`, 408);
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
