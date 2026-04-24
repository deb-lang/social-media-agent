// GET /api/posts/[id] — single post with audit trail

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { POST_LIST_COLUMNS, normalizePostRow } from "@/lib/posts-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const sb = supabaseAdmin();

  const { data: postRow, error: postErr } = await sb
    .from("posts")
    .select(POST_LIST_COLUMNS)
    .eq("id", id)
    .single();
  if (postErr || !postRow) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const post = normalizePostRow(postRow as Record<string, unknown>);

  const { data: auditRows } = await sb
    .from("audit_log")
    .select("id, created_at, action, performed_by, details")
    .eq("post_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    post,
    audit: auditRows ?? [],
  });
}
