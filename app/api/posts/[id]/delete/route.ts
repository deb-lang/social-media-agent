// POST /api/posts/[id]/delete — hard-deletes a post.
//
// The row is removed from the posts table. audit_log.post_id has
// ON DELETE SET NULL, so the existing audit history for this post
// survives (post_id becomes null on those rows). To make the deletion
// itself recoverable in the audit trail, we write the audit entry
// BEFORE the DELETE and stash the original post id + prior status
// in the details JSONB.
//
// Refuses to delete posts that have already been published to LinkedIn —
// those need to be retracted via Publer first. (Not enforced via DB
// constraint, just at this API boundary.)

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

  // Audit BEFORE the row goes away — once the FK cascades, audit_log.post_id
  // will be NULL on every prior row for this post, so we record the original
  // id and prior state in details for forensic purposes.
  await logAction({
    action: "delete",
    post_id: id,
    performed_by: performedBy,
    details: {
      original_post_id: id,
      prior_status: existing.status,
      reason: body.reason ?? null,
    },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
  });

  const { error: deleteErr } = await sb.from("posts").delete().eq("id", id);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, post_id: id });
}
