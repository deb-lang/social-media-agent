// POST /api/auth/login — validates the gate password and sets the session cookie.

import { NextRequest, NextResponse } from "next/server";
import { signSession, GATE_COOKIE } from "@/lib/gate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.GATE_PASSWORD;
  const sessionSecret = process.env.GATE_SESSION_SECRET;
  if (!expected || !sessionSecret) {
    // Fail open in dev (matches middleware behavior). On Vercel both
    // env vars MUST be set or the gate is bypassed — this is intentional
    // so a misconfigured deploy can still be rescued.
    return NextResponse.json({ ok: true, dev_open: true });
  }

  let body: { password?: string } = {};
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    /* empty body — handled below */
  }
  const submitted = (body.password ?? "").trim();

  // Constant-time-ish compare. Both strings; equal length → walk diff.
  const a = submitted.padEnd(expected.length, "\0");
  const b = expected;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  if (diff !== 0) {
    // Small delay — not a real defense, just makes brute-force noisier.
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json(
      { ok: false, error: "Incorrect password" },
      { status: 401 }
    );
  }

  const { value, maxAge } = await signSession(sessionSecret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: GATE_COOKIE,
    value,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
