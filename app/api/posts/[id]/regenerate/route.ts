// POST /api/posts/[id]/regenerate
// Re-generates a single post using the same category/format, injecting the
// rejection feedback into Claude's volatile context. Re-runs quality gates
// + UTM + audit log. Replaces the rejected post row in-place (keeps id).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { statsForCategory, recentPostSummaries } from "@/lib/content-engine";
import { listUnusedStats } from "@/lib/stat-finder";
import {
  generateImagePost,
  generateCarouselPost,
  reviewPost,
  type GeneratedPost,
} from "@/lib/claude";
import { checkCompliance } from "@/lib/compliance-checker";
import { checkPlagiarism } from "@/lib/plagiarism-checker";
import { buildCampaign, injectUtm } from "@/lib/utm";
import { logAction } from "@/lib/audit";
import { notifyFailure } from "@/lib/slack";
import {
  buildSvg,
  composeCarouselPdf,
  renderImage,
  renderSlidePng,
} from "@/lib/image-generator";
import {
  uploadCarouselPdf,
  uploadImagePng,
  uploadSlidePreview,
} from "@/lib/storage";
import type { ContentCategory, PostFormat } from "@/lib/constants";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const feedback = typeof body?.feedback === "string" ? body.feedback : null;

  const sb = supabaseAdmin();
  const { data: existing, error: fetchErr } = await sb
    .from("posts")
    .select("id, category, format, rejection_count, rejection_feedback, generation_run_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const category = existing.category as ContentCategory;
  const format = existing.format as PostFormat;
  const run_id = existing.generation_run_id as string | null;
  const rejectionFeedback = feedback ?? (existing.rejection_feedback as string | null) ?? undefined;

  try {
    const approvedStats = await statsForCategory(category);
    const externalStats = await listUnusedStats(6);
    const recent = await recentPostSummaries(8);

    // Generate
    let generated: GeneratedPost;
    if (format === "image") {
      const out = await generateImagePost({
        category,
        format: "image",
        approvedStats,
        externalStats: externalStats.map((s) => ({
          value: s.stat_value,
          context: s.stat_context,
          source_name: s.source_name,
          source_url: s.source_url,
          publication_date: s.publication_date,
        })),
        recentPosts: recent,
        rejectionFeedback,
      });
      generated = out.post;
    } else {
      const out = await generateCarouselPost({
        category,
        format: "carousel",
        approvedStats,
        externalStats: externalStats.map((s) => ({
          value: s.stat_value,
          context: s.stat_context,
          source_name: s.source_name,
          source_url: s.source_url,
          publication_date: s.publication_date,
        })),
        recentPosts: recent,
        rejectionFeedback,
      });
      generated = out.post;
    }

    // Quality gates
    const compliance = await checkCompliance(generated.caption);
    if (compliance.status === "block") {
      await notifyFailure({
        context: "regenerate.compliance_block",
        error: new Error(compliance.issues.map((i) => i.rule).join(", ")),
        postId: id,
      });
      return NextResponse.json(
        { error: "Compliance block on regenerated post" },
        { status: 422 }
      );
    }

    let finalCaption = generated.caption;
    let originalityScore: number | null = null;
    try {
      const review = await reviewPost(finalCaption);
      originalityScore = review.originality_score;
      if (review.originality_score < 60 && review.rewritten_caption) {
        finalCaption = review.rewritten_caption;
      }
    } catch (err) {
      console.warn(`[regenerate] review failed (non-fatal):`, err);
    }

    const plagiarism = await checkPlagiarism(finalCaption);
    const utmCampaign = buildCampaign({ category, format, date: new Date() });
    finalCaption = injectUtm(finalCaption, utmCampaign);

    // Render + upload new assets (different files — old URLs stay for audit trail)
    const effectiveRunId = run_id ?? id;
    let image_url: string | null = null;
    let carousel_pdf_url: string | null = null;
    let carousel_slide_previews: string[] | null = null;

    if (generated.format === "image") {
      const png = renderImage(generated.image);
      image_url = await uploadImagePng(png, { category, runId: effectiveRunId });
    } else {
      const slideSvgs = generated.slides.map((s) => buildSvg(s));
      const slidePngs = slideSvgs.map((svg) => renderSlidePng(svg));
      const pdf = await composeCarouselPdf(slidePngs);
      carousel_pdf_url = await uploadCarouselPdf(pdf, { category, runId: effectiveRunId });
      carousel_slide_previews = await Promise.all(
        slidePngs.map((png, i) =>
          uploadSlidePreview(png, { category, runId: effectiveRunId, slideIndex: i })
        )
      );
    }

    const statSummary = generated.stat_summary;
    const { error: updateErr } = await sb
      .from("posts")
      .update({
        caption: finalCaption,
        hashtags: generated.hashtags,
        stat_value: statSummary?.value ?? null,
        stat_source: statSummary?.source ?? null,
        stat_url: statSummary?.url ?? null,
        stat_verified: statSummary?.verified ?? false,
        image_url,
        carousel_pdf_url,
        carousel_slide_previews: carousel_slide_previews
          ? JSON.stringify(carousel_slide_previews)
          : null,
        status: "pending_review",
        originality_score: originalityScore,
        plagiarism_flags:
          plagiarism.flags.length > 0 ? JSON.stringify(plagiarism.flags) : null,
        compliance_status: compliance.status,
        compliance_issues:
          compliance.issues.length > 0 ? JSON.stringify(compliance.issues) : null,
        utm_campaign: utmCampaign,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logAction({
      action: "regenerate",
      post_id: id,
      performed_by: "system",
      details: {
        rejection_feedback: rejectionFeedback,
        rejection_count: existing.rejection_count ?? 0,
        compliance_status: compliance.status,
        originality_score: originalityScore,
        plagiarism_flags_count: plagiarism.flags.length,
      },
    });

    return NextResponse.json({
      ok: true,
      post_id: id,
      status: "pending_review",
    });
  } catch (err) {
    await notifyFailure({ context: "regenerate", error: err, postId: id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
