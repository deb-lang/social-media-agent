// GET /api/runs/:id — used by the dashboard to poll a generation run's status.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const sb = supabaseAdmin();
  const { data: run, error } = await sb
    .from("generation_runs")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !run) {
    return NextResponse.json({ error: "run not found" }, { status: 404 });
  }
  const { data: posts } = await sb
    .from("posts")
    .select("id, category, format, status")
    .eq("generation_run_id", id);

  return NextResponse.json({
    run,
    posts: posts ?? [],
  });
}
