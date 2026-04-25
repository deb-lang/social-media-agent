// POST /api/generate — kicks off a bi-monthly generation run.
//
// Returns run_id immediately. Generation happens async in the background:
//   1. scrape patientpartner.com/resources (refresh cache)
//   2. Claude web-search for fresh external stats
//   3. pickCategories + assignFormats → 2 posts
//   4. Claude.generateImagePost / generateCarouselPost for each
//   5. render PNG/PDF via image-generator + upload to Supabase Storage
//   6. insert posts rows with status=pending_review
//   7. Slack notifyReadyForReview
//
// Cron invocations include `x-cron-secret: $CRON_SECRET`.
// Manual invocations (from the dashboard) skip the header check.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { refreshResourceCache } from "@/lib/scraper";
import { findFreshStats, persistFoundStats, listUnusedStats } from "@/lib/stat-finder";
import {
  pickCategories,
  assignFormats,
  statsForCategory,
  recentPostSummaries,
} from "@/lib/content-engine";
import {
  generateImagePost,
  generateCarouselPost,
  reviewPost,
  type GeneratedPost,
  type ImagePost,
  type CarouselPost,
} from "@/lib/claude";
import { checkCompliance } from "@/lib/compliance-checker";
import { checkPlagiarism } from "@/lib/plagiarism-checker";
import { buildCampaign, injectUtm } from "@/lib/utm";
import { logAction } from "@/lib/audit";
import {
  buildSvg,
  composeCarouselPdf,
  renderImage,
  renderSlidePng,
} from "@/lib/image-generator";
import { uploadImagePng, uploadCarouselPdf, uploadSlidePreview } from "@/lib/storage";
import { notifyFailure, notifyReadyForReview } from "@/lib/slack";
import { authorizeCron } from "@/lib/cron-auth";
import type { ContentCategory, PostFormat } from "@/lib/constants";

// 800s is the Vercel Pro Fluid Compute ceiling. Two sequential Claude
// generations with effort=high + adaptive thinking + 5K-token cached system
// prompt routinely take 4-7min combined; the prior 300s cap was insufficient.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Enforce CRON_SECRET when one of the cron headers is present; let manual
  // dashboard triggers through with no header.
  const authResult = authorizeCron(req);
  if (authResult) return authResult;

  const isCron = Boolean(
    req.headers.get("x-cron-secret") || req.headers.get("authorization")
  );

  // Create the run row synchronously so we can return run_id immediately
  const run_id = randomUUID();
  const sb = supabaseAdmin();
  const { error } = await sb.from("generation_runs").insert({
    id: run_id,
    trigger_type: isCron ? "cron" : "manual",
    status: "in_progress",
  });
  if (error) {
    return NextResponse.json(
      { error: `Failed to create run: ${error.message}` },
      { status: 500 }
    );
  }

  // Kick off async work without awaiting — response returns in <100ms
  runGeneration(run_id).catch((err) => {
    console.error("[generate] fatal:", err);
    notifyFailure({ context: "generation.run", error: err, runId: run_id }).catch(() => {});
    void markRunFailed(run_id, err);
  });

  return NextResponse.json({ run_id, status: "in_progress" });
}

async function markRunFailed(run_id: string, err: unknown) {
  const sb = supabaseAdmin();
  await sb
    .from("generation_runs")
    .update({
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
      completed_at: new Date().toISOString(),
    })
    .eq("id", run_id);
}

// ─── Core pipeline ─────────────────────────────────────

async function runGeneration(run_id: string) {
  const sb = supabaseAdmin();

  const t0 = Date.now();
  const tag = run_id.slice(0, 8);
  const ms = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`;

  // 1. refresh resources cache (non-fatal)
  try {
    const { scraped, upserted } = await refreshResourceCache();
    console.log(`[gen ${tag}] ${ms()} scrape ok · ${scraped} fetched, ${upserted} upserted`);
  } catch (err) {
    console.warn(`[gen ${tag}] ${ms()} scrape failed (non-fatal):`, err);
  }

  // 2. find fresh stats via Claude web search (non-fatal)
  try {
    const fresh = await findFreshStats({ limit: 4 });
    await persistFoundStats(fresh);
    console.log(`[gen ${tag}] ${ms()} stat-finder ok · ${fresh.length} fresh stats`);
  } catch (err) {
    console.warn(`[gen ${tag}] ${ms()} stat-finder failed (non-fatal):`, err);
  }

  // 3. pick categories + assign formats
  const categories = await pickCategories(2);
  const formats = assignFormats(categories);
  console.log(
    `[gen ${tag}] ${ms()} picks: ${categories.map((c, i) => `${c}/${formats[i]}`).join(", ")}`
  );

  // 4. build context + generate + render + upload + insert — both posts in parallel.
  // Sequential was eating the 300s budget; parallelizing halves wall time to max(p1,p2).
  const [externalStats, recent] = await Promise.all([
    listUnusedStats(6),
    recentPostSummaries(8),
  ]);
  console.log(`[gen ${tag}] ${ms()} ctx ready · ${externalStats.length} external stats, ${recent.length} recent posts`);

  const postIds: string[] = [];
  const settled = await Promise.allSettled(
    categories.map((category, i) =>
      buildOnePost({ run_id, category, format: formats[i], externalStats, recent })
        .then((id) => {
          console.log(`[gen ${tag}] ${ms()} post ${category}/${formats[i]} done → ${id.slice(0, 8)}`);
          return id;
        })
    )
  );
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    if (r.status === "fulfilled") {
      postIds.push(r.value);
    } else {
      const category = categories[i];
      const format = formats[i];
      console.error(`[gen ${tag}] ${ms()} post ${category}/${format} FAILED:`, r.reason);
      await notifyFailure({
        context: `generation.post.${category}.${format}`,
        error: r.reason,
        runId: run_id,
      });
    }
  }
  console.log(`[gen ${tag}] ${ms()} all posts settled · ${postIds.length}/${categories.length} succeeded`);

  // 5. finalize run
  await sb
    .from("generation_runs")
    .update({
      status: "completed",
      posts_generated: postIds.length,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run_id);

  // 6. Slack ready-for-review
  if (postIds.length > 0) {
    await notifyReadyForReview({
      postCount: postIds.length,
      runId: run_id,
      categories: categories.slice(0, postIds.length),
    });
  }
}

async function buildOnePost(opts: {
  run_id: string;
  category: ContentCategory;
  format: PostFormat;
  externalStats: Awaited<ReturnType<typeof listUnusedStats>>;
  recent: Awaited<ReturnType<typeof recentPostSummaries>>;
}): Promise<string> {
  const { run_id, category, format, externalStats, recent } = opts;

  const approvedStats = await statsForCategory(category);

  // Generate with Claude
  let generated: GeneratedPost;
  let cacheHits: { read: number; create: number };
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
    });
    generated = out.post;
    cacheHits = out.cacheHits;
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
    });
    generated = out.post;
    cacheHits = out.cacheHits;
  }
  console.log(
    `[generate ${run_id.slice(0, 8)}] ${category}/${format} cache_hit=${cacheHits.read}t / create=${cacheHits.create}t`
  );

  // ─── Quality gates ─────────────────────────────────

  // 1. Compliance check (can block or flag)
  const compliance = await checkCompliance(generated.caption);
  console.log(
    `[generate ${run_id.slice(0, 8)}] ${category}/${format} compliance=${compliance.status} issues=${compliance.issues.length}`
  );
  if (compliance.status === "block") {
    // Auto-reject and let the caller regenerate
    throw new Error(
      `Compliance block: ${compliance.issues.map((i) => i.rule).join(", ")}`
    );
  }

  // 2. Self-review (second Claude pass for originality)
  let finalCaption = generated.caption;
  let originalityScore: number | null = null;
  try {
    const review = await reviewPost(finalCaption);
    originalityScore = review.originality_score;
    if (review.originality_score < 60 && review.rewritten_caption) {
      console.log(
        `[generate ${run_id.slice(0, 8)}] ${category}/${format} originality=${review.originality_score} → using rewrite`
      );
      finalCaption = review.rewritten_caption;
    }
  } catch (err) {
    console.warn(`[generate ${run_id.slice(0, 8)}] review failed (non-fatal):`, err);
  }

  // 3. Plagiarism spot-check (async, non-blocking)
  const plagiarism = await checkPlagiarism(finalCaption);
  if (plagiarism.flags.length > 0) {
    console.log(
      `[generate ${run_id.slice(0, 8)}] ${category}/${format} plagiarism=${plagiarism.flags.length} flags`
    );
  }

  // 4. UTM injection (patientpartner.com links only)
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
      slidePngs.map((png, i) => uploadSlidePreview(png, { category, runId: run_id, slideIndex: i }))
    );
  }

  // ─── Insert post ───────────────────────────────────

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
      // Quality-gate + UTM columns (added in schema v2)
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

  // ─── Audit log ─────────────────────────────────────
  await logAction({
    action: "generate",
    post_id: postId,
    performed_by: "system",
    details: {
      run_id,
      category,
      format,
      originality_score: originalityScore,
      compliance_status: compliance.status,
      compliance_issues_count: compliance.issues.length,
      plagiarism_flags_count: plagiarism.flags.length,
      utm_campaign: utmCampaign,
    },
  });

  return postId;
}
