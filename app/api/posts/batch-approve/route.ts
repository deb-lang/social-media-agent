// POST /api/posts/batch-approve
// Body: { ids: string[], approved_by?: string }
// Approves multiple posts sequentially (not parallel — Publer rate limit).

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface BatchResult {
  id: string;
  ok: boolean;
  scheduled_for?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const approved_by = typeof body?.approved_by === "string" ? body.approved_by : "dashboard";

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }
  if (ids.length > 20) {
    return NextResponse.json({ error: "max 20 posts per batch" }, { status: 400 });
  }

  // Call the single-approve endpoint sequentially so Publer rate limits hold.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `http://${req.headers.get("host") ?? "localhost:3000"}`;

  const results: BatchResult[] = [];
  for (const id of ids) {
    try {
      const res = await fetch(`${baseUrl}/api/posts/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        scheduled_for?: string;
        error?: string;
      };
      if (res.ok && payload.ok) {
        results.push({ id, ok: true, scheduled_for: payload.scheduled_for });
      } else {
        results.push({ id, ok: false, error: payload.error ?? `http ${res.status}` });
      }
    } catch (err) {
      results.push({
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    approved: okCount,
    failed: results.length - okCount,
    results,
  });
}
