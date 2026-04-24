// POST /api/webhook/generate — external trigger for generation (Slack, Zapier).
// Requires WEBHOOK_SECRET header match to prevent abuse.
// Delegates to /api/generate so the orchestrator stays in one place.

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.WEBHOOK_SECRET;
  const provided = req.headers.get("x-webhook-secret") ?? req.nextUrl.searchParams.get("secret");

  if (!expected) {
    return NextResponse.json({ error: "WEBHOOK_SECRET not configured" }, { status: 503 });
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://${req.headers.get("host") ?? "localhost:3000"}`;
  const res = await fetch(`${baseUrl}/api/generate`, { method: "POST" });
  const payload = await res.json().catch(() => ({}));
  return NextResponse.json({ triggered: res.ok, payload }, { status: res.ok ? 200 : 500 });
}
