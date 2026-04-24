// POST /api/posts/[id]/reject
// Saves reviewer feedback, flips status to rejected, increments rejection_count,
// and kicks off regeneration asynchronously. Caps at 3 regenerations.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { notifyFailure } from "@/lib/slack";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_REGENERATIONS = 3;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim() : "";
  const performedBy = typeof body?.rejected_by === "string" ? body.rejected_by : "dashboard";

  if (!feedback) {
    return NextResponse.json(
      { error: "feedback is required" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  const { data: post, error: fetchErr } = await sb
    .from("posts")
    .select("id, status, rejection_count, category, format")
    .eq("id", id)
    .single();

  if (fetchErr || !post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  if (post.status !== "pending_review") {
    return NextResponse.json(
      { error: `cannot reject post with status=${post.status}` },
      { status: 409 }
    );
  }

  const newCount = (post.rejection_count ?? 0) + 1;
  const capped = newCount >= MAX_REGENERATIONS;

  const { error: updateErr } = await sb
    .from("posts")
    .update({
      status: "rejected",
      rejection_feedback: feedback,
      rejection_count: newCount,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAction({
    action: "reject",
    post_id: id,
    performed_by: performedBy,
    details: { feedback, rejection_count: newCount, capped },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
  });

  if (capped) {
    await notifyFailure({
      context: "reject.max_regenerations",
      error: new Error(`Post ${id.slice(0, 8)} rejected ${MAX_REGENERATIONS}x — manual intervention needed`),
      postId: id,
    });
    return NextResponse.json({
      ok: true,
      post_id: id,
      status: "rejected",
      regenerated: false,
      reason: "max_regenerations_reached",
    });
  }

  // Kick off regeneration async — returns immediately with acknowledgement
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://${req.headers.get("host") ?? "localhost:3000"}`;
  fetch(`${baseUrl}/api/posts/${id}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  }).catch((err) => {
    console.warn(`[reject] regenerate kickoff failed:`, err);
  });

  return NextResponse.json({
    ok: true,
    post_id: id,
    status: "rejected",
    regenerated: true,
    rejection_count: newCount,
  });
}
