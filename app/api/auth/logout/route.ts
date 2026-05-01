// POST /api/auth/logout — clears the gate session cookie.

import { NextResponse } from "next/server";
import { GATE_COOKIE } from "@/lib/gate";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: GATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
