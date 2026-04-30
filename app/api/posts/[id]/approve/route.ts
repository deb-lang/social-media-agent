// POST /api/posts/[id]/approve
// Flips post to status=approved, recomputes scheduled_for if not overridden,
// uploads media to Publer, schedules the post, polls for job completion, and
// updates publer_post_id + status=scheduled.
//
// DEV_MODE guard: when DEV_MODE=true, everything runs EXCEPT the actual Publer
// calls. Post is marked status=scheduled with a fake publer_post_id="dev_mode"
// so the queue/history pages behave as if it shipped.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getNextSlot } from "@/lib/scheduler";
import { logAction } from "@/lib/audit";
import { notifyApproved, notifyFailure, notifyPublishFailed } from "@/lib/slack";
import {
  PublerError,
  uploadMediaAndWait,
  scheduleImagePost,
  scheduleCarouselPost,
  pollJobStatus,
  findRecentPostIdByText,
  type MediaRef,
} from "@/lib/publer";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const approvedBy = typeof body?.approved_by === "string" ? body.approved_by : "dashboard";
  const postNow = body?.post_now === true;

  const sb = supabaseAdmin();
  const { data: post, error: fetchErr } = await sb
    .from("posts")
    .select(
      "id, status, format, scheduled_for, schedule_override, category, caption, hashtags, image_url, carousel_pdf_url"
    )
    .eq("id", id)
    .single();

  if (fetchErr || !post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  // Allow re-approving a failed post (retry flow). Reviewer hits Retry on
  // /queue → same approve route runs end-to-end with a fresh scheduled_for.
  if (!["pending_review", "rejected", "failed"].includes(post.status)) {
    return NextResponse.json(
      { error: `cannot approve post with status=${post.status}` },
      { status: 409 }
    );
  }

  // Recompute scheduled_for at approval time. Three modes:
  //   1. post_now=true → fire ASAP (60s buffer satisfies Publer's
  //      "scheduled_at must be in the future" check)
  //   2. schedule_override=true → reviewer picked a slot, honor it
  //   3. otherwise → next auto slot for the format (Tue / Thu)
  let scheduled_for = post.scheduled_for as string | null;
  if (postNow) {
    scheduled_for = new Date(Date.now() + 60_000).toISOString();
  } else if (!post.schedule_override) {
    try {
      scheduled_for = getNextSlot(post.format === "carousel" ? "thu" : "tue");
    } catch (err) {
      await notifyFailure({ context: "approve.scheduler", error: err, postId: id });
      return NextResponse.json(
        { error: "Could not find a valid scheduling slot" },
        { status: 500 }
      );
    }
  }

  const now = new Date().toISOString();

  // Mark approved immediately so the UI flips; Publer work follows.
  const { error: updateErr } = await sb
    .from("posts")
    .update({
      status: "approved",
      approved_at: now,
      approved_by: approvedBy,
      scheduled_for,
    })
    .eq("id", id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAction({
    action: "approve",
    post_id: id,
    performed_by: approvedBy,
    details: {
      scheduled_for,
      schedule_override: post.schedule_override,
      post_now: postNow,
    },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
  });

  // ─── DEV_MODE: stop before Publer API ─────────────
  if (process.env.DEV_MODE === "true") {
    await sb
      .from("posts")
      .update({
        status: "scheduled",
        publer_post_id: "dev_mode_skipped",
      })
      .eq("id", id);

    await notifyApproved({
      postId: id,
      approvedBy,
      scheduledFor: scheduled_for,
      devMode: true,
    });

    return NextResponse.json({
      ok: true,
      post_id: id,
      scheduled_for,
      dev_mode: true,
      message: "DEV_MODE=true — skipped Publer API call",
    });
  }

  // ─── Publer: upload media + schedule ──────────────
  try {
    const linkedInAccountId = process.env.PUBLER_LINKEDIN_ACCOUNT_ID;
    if (!linkedInAccountId) {
      throw new Error("Missing PUBLER_LINKEDIN_ACCOUNT_ID");
    }

    // Upload the right media asset. New flow: POST /media/from-url is async,
    // returns a job_id, then poll /job_status/{id} for the descriptors.
    // PDFs auto-decompose into N per-page PNGs (one descriptor each).
    const isCarousel = post.format === "carousel";
    const mediaUrl = isCarousel ? post.carousel_pdf_url : post.image_url;
    if (!mediaUrl) {
      throw new Error(
        `Missing ${isCarousel ? "carousel_pdf_url" : "image_url"} on post ${id}`
      );
    }
    const descriptors = await uploadMediaAndWait({
      url: mediaUrl as string,
      name: `${post.category}-${post.format}-${id.slice(0, 8)}`,
    });
    if (descriptors.length === 0) {
      throw new Error(`Publer media upload returned 0 descriptors`);
    }
    const mediaItems: MediaRef[] = descriptors.map((d) => ({
      id: d.id,
      type: (d.type as MediaRef["type"]) ?? "photo",
    }));

    // Assemble caption + hashtags. Hashtags are stored separately; append at end.
    const captionWithHashtags = [
      post.caption as string,
      (post.hashtags as string[] | null)?.join(" ") ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // Schedule
    let jobId: string;
    if (isCarousel) {
      // Derive carousel title from first caption line (LinkedIn requires it)
      const firstLine = (post.caption as string).split(/\n/)[0].trim().slice(0, 80);
      const carouselTitle = firstLine || "PatientPartner update";
      const resp = await scheduleCarouselPost({
        socialAccountIds: [linkedInAccountId],
        text: captionWithHashtags,
        mediaItems,
        scheduledAt: scheduled_for ?? now,
        carouselTitle,
      });
      jobId = resp.job_id;
    } else {
      const resp = await scheduleImagePost({
        socialAccountIds: [linkedInAccountId],
        text: captionWithHashtags,
        mediaItems,
        scheduledAt: scheduled_for ?? now,
      });
      jobId = resp.job_id;
    }

    // Persist job id immediately so we can recover if the poll fails
    await sb.from("posts").update({ publer_job_id: jobId }).eq("id", id);

    // Poll job. New Publer API doesn't return post_id in job_status — only
    // overall status + per-account failures map. Look up the published post
    // via /posts list and match by text after the job completes.
    const job = await pollJobStatus(jobId);
    if (job.status === "failed") {
      throw new Error("Publer job status=failed (no message returned)");
    }
    const failures = job.payload?.failures ?? {};
    if (Object.keys(failures).length > 0) {
      throw new Error(
        `Publer job completed with per-account failures: ${JSON.stringify(failures).slice(0, 300)}`
      );
    }

    // Resolve publer_post_id by matching the just-scheduled post in Publer's
    // recent posts list. Non-fatal — if we can't find it the row is still
    // status=scheduled; analytics sync will reconcile when post publishes.
    let publerPostId: string | null = null;
    try {
      publerPostId = await findRecentPostIdByText(
        linkedInAccountId,
        captionWithHashtags
      );
    } catch (err) {
      console.warn(`[approve] post id lookup failed (non-fatal):`, err);
    }

    await sb
      .from("posts")
      .update({
        status: "scheduled",
        publer_post_id: publerPostId,
      })
      .eq("id", id);

    await notifyApproved({
      postId: id,
      approvedBy,
      scheduledFor: scheduled_for,
      devMode: false,
    });

    return NextResponse.json({
      ok: true,
      post_id: id,
      scheduled_for,
      publer_post_id: publerPostId,
      publer_job_id: jobId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof PublerError ? err.status : 500;

    await sb.from("posts").update({ status: "failed" }).eq("id", id);
    await logAction({
      action: "fail",
      post_id: id,
      performed_by: "system",
      details: { step: "approve.publer", error: message },
    });
    await notifyPublishFailed({ postId: id, error: err });

    return NextResponse.json({ error: message }, { status });
  }
}
