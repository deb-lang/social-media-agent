// Evergreen recycling: take a high-performing post (90+ days old, eng>5%,
// impressions>2000), regenerate a fresh caption with the same stat but a new
// hook + different CTA, and render with a different template variant so the
// visual doesn't look recycled.

import { supabaseAdmin } from "./supabase";
import { statsForCategory, recentPostSummaries } from "./content-engine";
import { listUnusedStats } from "./stat-finder";
import { generateImagePost, generateCarouselPost, type GeneratedPost } from "./claude";
import { checkCompliance } from "./compliance-checker";
import { buildCampaign, injectUtm } from "./utm";
import {
  buildSvg,
  composeCarouselPdf,
  renderImage,
  renderSlidePng,
} from "./image-generator";
import {
  uploadCarouselPdf,
  uploadImagePng,
  uploadSlidePreview,
} from "./storage";
import type { ContentCategory, PostFormat } from "./constants";
import { logAction } from "./audit";

export interface RecycleCandidate {
  id: string;
  category: ContentCategory;
  format: PostFormat;
  caption: string;
  stat_value: string | null;
  stat_source: string | null;
  stat_url: string | null;
  engagement_rate: number | null;
  impressions: number | null;
  published_at: string | null;
}

/**
 * Regenerate a recycled version of a proven post. Creates a new row with
 * `is_recycled=true` and `recycled_from_post_id` pointing at the original.
 * Visual: flipped template (carousel→image or image→carousel) so the asset
 * doesn't look like a clone.
 */
export async function recycleCandidate(
  candidate: RecycleCandidate
): Promise<{ new_post_id: string; new_format: PostFormat }> {
  const sb = supabaseAdmin();

  // Flip the format — spec calls out that recycled posts MUST have a new visual
  const newFormat: PostFormat =
    candidate.format === "image" ? "carousel" : "image";
  const { category } = candidate;

  const approvedStats = await statsForCategory(category);
  const externalStats = await listUnusedStats(6);
  const recent = await recentPostSummaries(8);

  const recyclePrompt = [
    `This is a RECYCLED refresh of a high-performing post from ${candidate.published_at}.`,
    `Original stat cited: "${candidate.stat_value ?? "n/a"}" · source: ${candidate.stat_source ?? "n/a"}`,
    `Original caption opening: "${candidate.caption.slice(0, 240)}..."`,
    ``,
    `Your job: Write a NEW ${newFormat} that:`,
    `- Uses the SAME underlying stat/insight (it worked — it's evergreen)`,
    `- Has a completely NEW hook (don't reuse the opening)`,
    `- Ends with a DIFFERENT CTA`,
    `- Feels fresh to the reader — they shouldn't recognize it as a repost`,
    `- Matches all the same voice + compliance rules as any other post`,
  ].join("\n");

  let generated: GeneratedPost;
  if (newFormat === "image") {
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
      rejectionFeedback: recyclePrompt,
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
      rejectionFeedback: recyclePrompt,
    });
    generated = out.post;
  }

  // Quality gate (compliance only — recycled posts assume originality since
  // the source stat was already validated)
  const compliance = await checkCompliance(generated.caption);
  if (compliance.status === "block") {
    throw new Error(
      `Recycle compliance block: ${compliance.issues.map((i) => i.rule).join(", ")}`
    );
  }

  // UTM injection
  const utmCampaign = buildCampaign({ category, format: newFormat, date: new Date() });
  const finalCaption = injectUtm(generated.caption, utmCampaign);

  // Render assets (flipped template)
  const runIdStub = `recycle-${candidate.id.slice(0, 8)}-${Date.now()}`;
  let image_url: string | null = null;
  let carousel_pdf_url: string | null = null;
  let carousel_slide_previews: string[] | null = null;

  if (generated.format === "image") {
    const png = renderImage(generated.image);
    image_url = await uploadImagePng(png, { category, runId: runIdStub });
  } else {
    const slideSvgs = generated.slides.map((s) => buildSvg(s));
    const slidePngs = slideSvgs.map((svg) => renderSlidePng(svg));
    const pdf = await composeCarouselPdf(slidePngs);
    carousel_pdf_url = await uploadCarouselPdf(pdf, { category, runId: runIdStub });
    carousel_slide_previews = await Promise.all(
      slidePngs.map((png, i) =>
        uploadSlidePreview(png, { category, runId: runIdStub, slideIndex: i })
      )
    );
  }

  const statSummary = generated.stat_summary;
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
      platform: "linkedin",
      utm_campaign: utmCampaign,
      compliance_status: compliance.status,
      compliance_issues:
        compliance.issues.length > 0 ? JSON.stringify(compliance.issues) : null,
      is_recycled: true,
      recycled_from_post_id: candidate.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Insert recycled post: ${error?.message ?? "no row returned"}`);
  }

  const newPostId = data.id as string;
  await logAction({
    action: "recycle",
    post_id: newPostId,
    performed_by: "cron",
    details: {
      source_post_id: candidate.id,
      original_category: candidate.category,
      original_format: candidate.format,
      new_format: newFormat,
      original_engagement: candidate.engagement_rate,
      original_impressions: candidate.impressions,
    },
  });

  return { new_post_id: newPostId, new_format: newFormat };
}
