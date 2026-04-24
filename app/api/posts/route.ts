// GET /api/posts — list posts with filters
// Query params: status, category, format, platform, since, until, limit

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { POST_LIST_COLUMNS, normalizePostRow } from "@/lib/posts-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const category = sp.get("category");
  const format = sp.get("format");
  const platform = sp.get("platform");
  const since = sp.get("since"); // ISO date
  const until = sp.get("until");
  const limit = Math.min(parseInt(sp.get("limit") ?? "100", 10) || 100, 200);

  const sb = supabaseAdmin();
  let q = sb.from("posts").select(POST_LIST_COLUMNS).order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  if (category) q = q.eq("category", category);
  if (format) q = q.eq("format", format);
  if (platform) q = q.eq("platform", platform);
  if (since) q = q.gte("created_at", since);
  if (until) q = q.lte("created_at", until);

  q = q.limit(limit);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (data ?? []).map((row) => normalizePostRow(row as Record<string, unknown>));
  return NextResponse.json({ posts, count: posts.length });
}
