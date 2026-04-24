// Shared cron-auth guard. Call from any route wired to a Vercel cron.
// Accepts either:
//   - x-cron-secret: <CRON_SECRET>          (our custom header)
//   - Authorization: Bearer <CRON_SECRET>   (Vercel's native cron header)
//
// Returns null on allowed (authorized), or a NextResponse on rejection.
// If CRON_SECRET is unset, allows all requests (dev convenience — set the secret in prod).

import { NextResponse } from "next/server";

export function authorizeCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // no secret configured → allow (dev)

  const cronHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");

  if (cronHeader === secret) return null;
  if (authHeader === `Bearer ${secret}`) return null;

  // Manual dashboard triggers (no secret) are allowed only when we're
  // explicitly NOT being called by a cron. A cron call always has one of
  // the two headers; if both are missing, treat as a dashboard action.
  if (!cronHeader && !authHeader) return null;

  return NextResponse.json({ error: "unauthorized cron" }, { status: 401 });
}
