// GET /api/analytics/calendar?month=YYYY-MM
// Returns posts grouped by day-of-month for calendar rendering.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month");
  const now = new Date();
  const [yearStr, monthStr] = (monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "invalid month param (use YYYY-MM)" }, { status: 400 });
  }

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1)); // exclusive

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("posts")
    .select("id, status, category, format, scheduled_for, published_at, caption, image_url, carousel_pdf_url")
    .or(
      `scheduled_for.gte.${from.toISOString()},published_at.gte.${from.toISOString()}`
    )
    .or(
      `scheduled_for.lt.${to.toISOString()},published_at.lt.${to.toISOString()}`
    )
    .order("scheduled_for", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Bucket by day (use published_at if available, else scheduled_for)
  const buckets: Record<string, unknown[]> = {};
  for (const row of data ?? []) {
    const iso = (row.published_at as string | null) ?? (row.scheduled_for as string | null);
    if (!iso) continue;
    const d = new Date(iso);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month) continue;
    const day = String(d.getUTCDate()).padStart(2, "0");
    if (!buckets[day]) buckets[day] = [];
    buckets[day].push(row);
  }

  return NextResponse.json({ month: `${yearStr}-${monthStr}`, days: buckets });
}
