// POST /api/posts/[id]/delete — soft-deletes a post.
//
// Soft-delete strategy: sets status='deleted' so the row is preserved for
// audit/compliance. Every list query in the dashboard filters out
// status=eq.deleted by default. To "undelete" (rare) you'd flip the status
// back manually in Supabase.
//
// Refuses to delete posts that have already been published to LinkedIn —
// those need to be retracted via Publer first or have status='published'
// preserved for analytics. (Not enforced via DB constraint, just at this
// API boundary.)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface DeleteBody {
  reason?: string;        // optional reviewer-supplied reason
  performed_by?: string;  // optional explicit performer (defaults to "dashboard")
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let body: DeleteBody = {};
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    /* body is optional */
  }
  const performedBy =
    typeof body.performed_by === "string" && body.performed_by.length > 0
      ? body.performed_by
      : "dashboard";

  const sb = supabaseAdmin();

  // Look up the row first so we can:
  // (a) refuse to delete already-published posts
  // (b) include the prior status in the audit log
  const { data: existing, error: fetchErr } = await sb
    .from("posts")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }
  if (existing.status === "published") {
    return NextResponse.json(
      {
        error:
          "Cannot delete a published post. Retract on LinkedIn via Publer first, then delete.",
      },
      { status: 409 }
    );
  }
  if (existing.status === "deleted") {
    // Idempotent — already deleted
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: updateErr } = await sb
    .from("posts")
    .update({ status: "deleted" })
    .eq("id", id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAction({
    action: "delete",
    post_id: id,
    performed_by: performedBy,
    details: {
      prior_status: existing.status,
      reason: body.reason ?? null,
    },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
  });

  return NextResponse.json({ ok: true, post_id: id });
}
