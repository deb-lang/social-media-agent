// Post builder — single-post generation pipeline shared between the cron
// orchestrator (/api/generate) and the manual generator (/api/posts/manual).
//
// Pipeline steps (per post):
//   1. Pick approved stats for category
//   2. Claude generation (image or carousel) — optionally with manual context
//   3. Quality gates: compliance · self-review (originality) · plagiarism
//   4. UTM injection (patientpartner.com links only)
//   5. Render: SVG → PNG (image) or SVG → PNG → PDF (carousel)
//   6. Upload to Supabase Storage
//   7. Insert post row with status=pending_review
//   8. Audit log
//
// Returns the new post ID. Throws on hard failure (compliance block, Claude
// returning null parsed_output, render failure, DB insert failure).

import { supabaseAdmin } from "./supabase";
import { statsForCategory } from "./content-engine";
import {
  generateImagePost,
  generateCarouselPost,
  reviewPost,
  type GeneratedPost,
  type RecentPostSummary,
} from "./claude";
import { checkCompliance } from "./compliance-checker";
import { checkPlagiarism } from "./plagiarism-checker";
import { buildCampaign, injectUtm } from "./utm";
import { logAction } from "./audit";
import {
  buildSvg,
  composeCarouselPdf,
  renderImage,
  renderSlidePng,
} from "./image-generator";
import { uploadImagePng, uploadCarouselPdf, uploadSlidePreview } from "./storage";
import type { ContentCategory, PostFormat } from "./constants";

export interface ManualContext {
  /** User-supplied brief — what's the post about? */
  context: string;
  /** Optional reference URLs to embed/cite in the post */
  reference_urls?: string[];
}

export interface BuildPostOpts {
  /** Generation run UUID (required for cron path; can be a synthetic UUID for manual path) */
  run_id: string;
  category: ContentCategory;
  format: PostFormat;
  /** External (Claude-found) stats list */
  externalStats: Array<{
    stat_value: string;
    stat_context: string;
    source_name: string;
    source_url?: string;
    publication_date?: string;
  }>;
  /** Recent post summaries for dedup pressure */
  recent: RecentPostSummary[];
  /** Optional manual context (for ad-hoc lead magnets, events, webinars) */
  manualContext?: ManualContext;
  /** Performer attribution for audit log */
  performedBy?: string;
}

export async function buildOnePost(opts: BuildPostOpts): Promise<string> {
  const { run_id, category, format, externalStats, recent, manualContext } = opts;
  const performedBy = opts.performedBy ?? "system";
  const tag = run_id.slice(0, 8);

  const approvedStats = await statsForCategory(category);

  // ─── Claude generation ────────────────────────────
  const genCtx = {
    category,
    format,
    approvedStats,
    externalStats: externalStats.map((s) => ({
      value: s.stat_value,
      context: s.stat_context,
      source_name: s.source_name,
      source_url: s.source_url,
      publication_date: s.publication_date,
    })),
    recentPosts: recent,
    manualContext,
  };

  let generated: GeneratedPost;
  let cacheHits: { read: number; create: number };
  if (format === "image") {
    const out = await generateImagePost(genCtx);
    generated = out.post;
    cacheHits = out.cacheHits;
  } else {
    const out = await generateCarouselPost(genCtx);
    generated = out.post;
    cacheHits = out.cacheHits;
  }
  console.log(
    `[build ${tag}] ${category}/${format} cache_hit=${cacheHits.read}t / create=${cacheHits.create}t`
  );

  // ─── Quality gates ────────────────────────────────

  // 1. Compliance check (block / flag / pass)
  const compliance = await checkCompliance(generated.caption);
  console.log(
    `[build ${tag}] ${category}/${format} compliance=${compliance.status} issues=${compliance.issues.length}`
  );
  if (compliance.status === "block") {
    throw new Error(
      `Compliance block: ${compliance.issues.map((i) => i.rule).join(", ")}`
    );
  }

  // 2. Self-review for originality (non-fatal)
  let finalCaption = generated.caption;
  let originalityScore: number | null = null;
  try {
    const review = await reviewPost(finalCaption);
    originalityScore = review.originality_score;
    if (review.originality_score < 60 && review.rewritten_caption) {
      console.log(
        `[build ${tag}] ${category}/${format} originality=${review.originality_score} → using rewrite`
      );
      finalCaption = review.rewritten_caption;
    }
  } catch (err) {
    console.warn(`[build ${tag}] review failed (non-fatal):`, err);
  }

  // 3. Plagiarism spot-check (non-fatal)
  const plagiarism = await checkPlagiarism(finalCaption);
  if (plagiarism.flags.length > 0) {
    console.log(
      `[build ${tag}] ${category}/${format} plagiarism=${plagiarism.flags.length} flags`
    );
  }

  // 4. UTM injection (rewrites patientpartner.com links only)
  const utmCampaign = buildCampaign({ category, format, date: new Date() });
  finalCaption = injectUtm(finalCaption, utmCampaign);

  // ─── Render + upload ──────────────────────────────

  let image_url: string | null = null;
  let carousel_pdf_url: string | null = null;
  let carousel_slide_previews: string[] | null = null;

  if (generated.format === "image") {
    const png = renderImage(generated.image);
    image_url = await uploadImagePng(png, { category, runId: run_id });
  } else {
    const slideSvgs = generated.slides.map((s) => buildSvg(s));
    const slidePngs = slideSvgs.map((svg) => renderSlidePng(svg));
    const pdf = await composeCarouselPdf(slidePngs);
    carousel_pdf_url = await uploadCarouselPdf(pdf, { category, runId: run_id });
    carousel_slide_previews = await Promise.all(
      slidePngs.map((png, i) =>
        uploadSlidePreview(png, { category, runId: run_id, slideIndex: i })
      )
    );
  }

  // ─── Insert post ──────────────────────────────────

  const statSummary = generated.stat_summary;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("posts")
    .insert({
      category,
      format: generated.format,
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
      generation_run_id: run_id,
      platform: "linkedin",
      originality_score: originalityScore,
      plagiarism_flags:
        plagiarism.flags.length > 0 ? JSON.stringify(plagiarism.flags) : null,
      compliance_status: compliance.status,
      compliance_issues:
        compliance.issues.length > 0 ? JSON.stringify(compliance.issues) : null,
      utm_campaign: utmCampaign,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Insert post: ${error?.message ?? "no row returned"}`);

  const postId = data.id as string;

  // ─── Audit log ────────────────────────────────────
  await logAction({
    action: manualContext ? "manual_generate" : "generate",
    post_id: postId,
    performed_by: performedBy,
    details: {
      run_id,
      category,
      format,
      originality_score: originalityScore,
      compliance_status: compliance.status,
      compliance_issues_count: compliance.issues.length,
      plagiarism_flags_count: plagiarism.flags.length,
      utm_campaign: utmCampaign,
      manual: Boolean(manualContext),
    },
  });

  return postId;
}
