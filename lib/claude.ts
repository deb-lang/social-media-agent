// Claude API client — content generation with prompt caching.
//
// Key design points:
// - Model: claude-opus-4-7 (latest Opus, 1M context, adaptive thinking)
// - Prompt cache: VOICE_SYSTEM_PROMPT (~5K tokens) cached on system block
//   with 1h TTL. Volatile context (recent posts, stats, rejection feedback)
//   goes in `messages`, NOT system, so the cache holds.
// - Structured output: Zod schemas validate + narrow Claude's JSON.
// - Streaming for carousel generation (larger output).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CLAUDE_MODEL, VOICE_SYSTEM_PROMPT, type ContentCategory, type PostFormat } from "./constants";
import type { ApprovedStat } from "./approved-stats";

// ─── Zod schemas (shape of Claude's structured output) ─────

export const StatCardSchema = z.object({
  value: z.string().min(1).max(20),
  label: z.string().min(1).max(80),
});

// Demo-focused CTA. The bold line is the action ("Schedule a free demo",
// "Book a demo this week", "Get a 20-minute walkthrough"). The supporting
// line is optional value-prop or URL. Never first-person, never bare
// "Learn more" — see CTA RULES in VOICE_SYSTEM_PROMPT.
export const CtaSchema = z.object({
  bold: z.string().min(1).max(80),
  supporting: z.string().max(80).optional(),
});

// Dense fill required: every dark_navy stats image must populate
// 3 problem + 3 solution cards. Headline + subhead both required.
export const DarkNavyImageSchema = z.object({
  template: z.literal("dark_navy"),
  headline: z.string().min(1).max(120),
  subhead: z.string().min(1).max(120),
  problemLabel: z.string().min(1).max(40),
  problemStats: z.array(StatCardSchema).length(3),
  solutionLabel: z.string().min(1).max(40),
  solutionStats: z.array(StatCardSchema).length(3),
  cta: CtaSchema,
  footer: z.string().max(60).optional(),
});

// Quote variant: third-party source only.
//   attribution = real source name (Accenture, BMC Medicine, JAMA, etc.)
//   role = publication / study context (required, holds the citation detail)
// Announcement / feature variants must populate all 3 feature cards.
export const LightTealImageSchema = z.object({
  template: z.literal("light_teal"),
  kind: z.enum(["quote", "announcement", "feature"]),
  headline: z.string().max(80).optional(),
  subhead: z.string().max(120).optional(),
  quote: z
    .object({
      text: z.string().min(1).max(240),
      attribution: z.string().min(1).max(80),
      role: z.string().min(1).max(80),
    })
    .optional(),
  features: z
    .array(z.object({ title: z.string().min(1).max(40), body: z.string().min(1).max(140) }))
    .max(3)
    .optional(),
  bottomStats: z.array(StatCardSchema).max(2).optional(),
  cta: CtaSchema,
  footer: z.string().max(60).optional(),
});

export const ImageInputSchema = z.discriminatedUnion("template", [
  DarkNavyImageSchema,
  LightTealImageSchema,
]);

const PostShared = {
  caption: z.string().min(150).max(1800),
  hashtags: z.array(z.string().startsWith("#")).min(2).max(5),
  chosen_stat_ids: z.array(z.string()).max(5),
  stat_summary: z
    .object({
      value: z.string(),
      source: z.string(),
      url: z.string().optional(),
      verified: z.boolean(),
    })
    .optional(),
};

export const ImagePostSchema = z.object({
  ...PostShared,
  format: z.literal("image"),
  image: ImageInputSchema,
});

export const CarouselPostSchema = z.object({
  ...PostShared,
  format: z.literal("carousel"),
  carousel_title: z.string().min(1).max(80),
  // 3-5 slides for fast LinkedIn load + simpler grammar compilation.
  // Lower bound 3 = enough for hook → insight → CTA. Upper bound 5
  // keeps the structured-output schema small enough to avoid Anthropic
  // grammar-compilation timeouts.
  slides: z.array(ImageInputSchema).min(3).max(5),
});

export type ImagePost = z.infer<typeof ImagePostSchema>;
export type CarouselPost = z.infer<typeof CarouselPostSchema>;
export type GeneratedPost = ImagePost | CarouselPost;

// ─── V2 Template Schemas (Claude Design template system) ─────
// These drive the new lib/templates/* HTML rendering path. The legacy
// ImagePostSchema / CarouselPostSchema above stay in place for the
// recycle.ts and regenerate route which still use Resvg/SVG until
// they're migrated separately.

// Static template content shapes — match lib/templates/* component props 1:1.
export const StaticQuoteContentSchema = z.object({
  template: z.literal("static-quote"),
  tone: z.enum(["dark", "teal", "light"]),
  eyebrow: z.string().min(1).max(40),
  quote: z.string().min(20).max(220),
  author: z.string().min(1).max(60),
  role: z.string().min(1).max(80),
});

export const StaticStatContentSchema = z.object({
  template: z.literal("static-stat"),
  tone: z.enum(["dark", "light", "split"]),
  eyebrow: z.string().min(1).max(40),
  prefix: z.string().max(8).optional(),
  value: z.string().min(1).max(12),
  suffix: z.string().max(8).optional(),
  headline: z.string().min(20).max(180),
  source: z.string().min(1).max(120),
});

export const StaticInsightContentSchema = z.object({
  template: z.literal("static-insight"),
  eyebrow: z.string().min(1).max(40),
  headline: z.string().min(1).max(120),
  emphasis: z.string().min(1).max(60),
  trail: z.string().min(1).max(120),
  bullets: z
    .array(z.object({ value: z.string().min(1).max(12), label: z.string().min(1).max(80) }))
    .length(3),
  source: z.string().min(1).max(120),
});

export const StaticTemplateContentSchema = z.discriminatedUnion("template", [
  StaticQuoteContentSchema,
  StaticStatContentSchema,
  StaticInsightContentSchema,
]);

// Carousel slide content — 5 distinct slide types in fixed order.
export const Slide1ContentSchema = z.object({
  kind: z.literal("cover"),
  eyebrow: z.string().min(1).max(60),
  title: z.string().min(8).max(80),
  subtitle: z.string().min(8).max(140),
});
export const Slide2ContentSchema = z.object({
  kind: z.literal("problem"),
  eyebrow: z.string().min(1).max(40).optional(),
  question: z.string().min(8).max(140),
  body: z.string().min(20).max(220),
  stat: z.string().min(1).max(12),
  statLabel: z.string().min(1).max(80),
});
export const Slide3ContentSchema = z.object({
  kind: z.literal("stat"),
  eyebrow: z.string().min(1).max(40).optional(),
  stat: z.string().min(1).max(12),
  headline: z.string().min(8).max(120),
  context: z.string().min(8).max(160),
  bars: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        a: z.number().int().min(0).max(100),
        b: z.number().int().min(0).max(100),
      })
    )
    .min(2)
    .max(4),
});
export const Slide4ContentSchema = z.object({
  kind: z.literal("mechanism"),
  eyebrow: z.string().min(1).max(40).optional(),
  title: z.string().min(8).max(120),
  steps: z
    .array(
      z.object({
        n: z.string().min(1).max(4),
        h: z.string().min(4).max(60),
        b: z.string().min(8).max(160),
      })
    )
    .length(3),
});
export const Slide5ContentSchema = z.object({
  kind: z.literal("cta"),
  eyebrow: z.string().min(1).max(40).optional(),
  title: z.string().min(8).max(140),
  gradientWord: z.string().min(2).max(20).optional(),
  body: z.string().min(8).max(180),
  cta: z.string().min(4).max(40),
  url: z.string().min(4).max(80),
});

export const CarouselContentSchema = z.object({
  template: z.literal("carousel"),
  slides: z.tuple([
    Slide1ContentSchema,
    Slide2ContentSchema,
    Slide3ContentSchema,
    Slide4ContentSchema,
    Slide5ContentSchema,
  ]),
});

// V2 wrapper schemas — caption + hashtags + template content.
export const ImagePostV2Schema = z.object({
  ...PostShared,
  format: z.literal("image"),
  content: StaticTemplateContentSchema,
});

export const CarouselPostV2Schema = z.object({
  ...PostShared,
  format: z.literal("carousel"),
  carousel_title: z.string().min(1).max(80),
  content: CarouselContentSchema,
});

export type ImagePostV2 = z.infer<typeof ImagePostV2Schema>;
export type CarouselPostV2 = z.infer<typeof CarouselPostV2Schema>;
export type StaticTemplateContent = z.infer<typeof StaticTemplateContentSchema>;
export type CarouselContent = z.infer<typeof CarouselContentSchema>;

// ─── Client ─────────────────────────────────────────────

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  // maxRetries=5 handles transient 5xx + 429 + grammar-compilation
  // overloads. SDK does exponential backoff between attempts.
  // timeout=600s allows long thinking + carousel streams. Defaults are
  // too aggressive for our long-running structured-output calls.
  _client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 5,
    timeout: 600_000,
  });
  return _client;
}

// ─── Generation context types ──────────────────────────

export interface RecentPostSummary {
  category: ContentCategory;
  caption: string;
  hashtags: string[];
  chosen_stat_ids: string[];
  scheduled_for: string | null;
}

export interface GenerationContext {
  category: ContentCategory;
  format: PostFormat;
  approvedStats: ApprovedStat[];
  recentPosts: RecentPostSummary[];
  externalStats?: Array<{
    value: string;
    context: string;
    source_name: string;
    source_url?: string;
    publication_date?: string;
  }>;
  rejectionFeedback?: string;
  /**
   * Manual context for ad-hoc posts (lead magnets, events, webinars).
   * When present, Claude is told to *prioritize* this brief over the
   * usual category-rotation framing — but still respects voice + stats rules.
   */
  manualContext?: {
    context: string;
    reference_urls?: string[];
  };
}

// ─── Prompt builders ────────────────────────────────────

function buildUserMessage(ctx: GenerationContext): string {
  const parts: string[] = [];

  parts.push(`# TASK`);
  parts.push(
    `Generate ONE ${ctx.format === "carousel" ? "LinkedIn document carousel" : "LinkedIn image post"} in the ${ctx.category} category.`
  );

  // Manual context takes priority — when set, the post must be ABOUT this brief
  // (not about a generic category angle). Stats + voice rules still apply.
  if (ctx.manualContext) {
    parts.push(`\n# MANUAL BRIEF (this post is about this specifically — top priority)`);
    parts.push(ctx.manualContext.context);
    if (ctx.manualContext.reference_urls && ctx.manualContext.reference_urls.length) {
      parts.push(`\n## REFERENCE URLS (cite or link these in the post)`);
      parts.push(ctx.manualContext.reference_urls.map((u) => `- ${u}`).join("\n"));
    }
  }

  parts.push(`\n# APPROVED STATS (use only these — never invent numbers)`);
  parts.push(
    ctx.approvedStats
      .map((s) => `- id=${s.id} · ${s.value} — ${s.context} · source: ${s.source}`)
      .join("\n")
  );

  if (ctx.externalStats && ctx.externalStats.length) {
    parts.push(`\n# FRESH EXTERNAL STATS (verified URL, may also be used)`);
    parts.push(
      ctx.externalStats
        .map(
          (s) =>
            `- ${s.value} — ${s.context} · ${s.source_name}${s.source_url ? ` (${s.source_url})` : ""}`
        )
        .join("\n")
    );
  }

  if (ctx.recentPosts.length) {
    parts.push(`\n# RECENT POSTS (avoid repeating stats, hashtags, angles)`);
    parts.push(
      ctx.recentPosts
        .map(
          (p, i) =>
            `${i + 1}. [${p.category}] stats: ${p.chosen_stat_ids.join(", ") || "—"} · hashtags: ${p.hashtags.join(" ")} · opening: "${p.caption.slice(0, 120)}…"`
        )
        .join("\n")
    );
  }

  if (ctx.rejectionFeedback) {
    parts.push(`\n# REVIEWER FEEDBACK (regeneration — address this)`);
    parts.push(ctx.rejectionFeedback);
  }

  parts.push(`\n# OUTPUT`);
  parts.push(
    `Return structured JSON matching the provided schema. For carousels, produce 3-5 slides that mix the two templates (dark_navy for stats, light_teal for quotes/insight). Reference only stat IDs from the approved list above. Set stat_verified=true only when the source has a URL.`
  );

  return parts.join("\n");
}

function systemBlocks(): Anthropic.TextBlockParam[] {
  // The 5K-token deterministic prompt gets the cache_control marker.
  // Anything that changes per-request goes into `messages`, not here.
  return [
    {
      type: "text",
      text: VOICE_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ];
}

// ─── Generation ─────────────────────────────────────────

export async function generateImagePost(ctx: GenerationContext): Promise<{
  post: ImagePost;
  cacheHits: { read: number; create: number };
}> {
  if (ctx.format !== "image") throw new Error("generateImagePost requires format='image'");
  console.log(`[claude:image] starting · category=${ctx.category} · approved_stats=${ctx.approvedStats.length} · external=${ctx.externalStats?.length ?? 0}`);
  const t0 = Date.now();
  const res = await client().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(ImagePostSchema),
    },
    system: systemBlocks(),
    messages: [{ role: "user", content: buildUserMessage(ctx) }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  console.log(`[claude:image] returned in ${((Date.now() - t0)/1000).toFixed(1)}s · stop=${res.stop_reason} · parsed=${res.parsed_output ? 'ok' : 'NULL'} · in=${res.usage?.input_tokens} out=${res.usage?.output_tokens}`);

  // The SDK's zodOutputFormat auto-parses res.parsed_output as the Zod type.
  if (!res.parsed_output) {
    throw new Error(`Claude returned no parsed_output for image post (stop_reason=${res.stop_reason})`);
  }
  const parsed = res.parsed_output as ImagePost;
  return {
    post: parsed,
    cacheHits: {
      read: res.usage.cache_read_input_tokens ?? 0,
      create: res.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

export async function generateCarouselPost(ctx: GenerationContext): Promise<{
  post: CarouselPost;
  cacheHits: { read: number; create: number };
}> {
  if (ctx.format !== "carousel") throw new Error("generateCarouselPost requires format='carousel'");
  // Use messages.parse() (same path as image post) instead of streaming.
  // Streaming added complexity + transient grammar-compilation flakes for
  // marginal benefit. SDK's auto-retry (5x) covers transient 5xx.
  // max_tokens 8192 needed for 3-5 slides + caption + hashtags + thinking budget.
  console.log(`[claude:carousel] starting · category=${ctx.category} · approved_stats=${ctx.approvedStats.length} · external=${ctx.externalStats?.length ?? 0}`);
  const t0 = Date.now();
  const res = await client().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(CarouselPostSchema),
    },
    system: systemBlocks(),
    messages: [{ role: "user", content: buildUserMessage(ctx) }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  console.log(`[claude:carousel] returned in ${((Date.now() - t0)/1000).toFixed(1)}s · stop=${res.stop_reason} · parsed=${res.parsed_output ? 'ok' : 'NULL'} · in=${res.usage?.input_tokens} out=${res.usage?.output_tokens}`);

  if (!res.parsed_output) {
    throw new Error(`Claude returned no parsed_output for carousel (stop_reason=${res.stop_reason})`);
  }
  const parsed = res.parsed_output as CarouselPost;
  return {
    post: parsed,
    cacheHits: {
      read: res.usage.cache_read_input_tokens ?? 0,
      create: res.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

// ─── V2 generation (template-driven HTML rendering) ──────
// These wrap messages.parse() against the new V2 schemas. The template
// name is selected by the caller (lib/category-map.ts) and passed as
// preselectedTemplate so Claude knows which discriminator branch to fill.

export interface GenerateImageV2Opts extends GenerationContext {
  preselectedTemplate: "static-quote" | "static-stat" | "static-insight";
  preselectedTone?: "dark" | "teal" | "light" | "split";
}

function buildV2UserMessage(ctx: GenerateImageV2Opts | GenerationContext, isCarousel = false): string {
  const base = buildUserMessage(ctx);
  const v2 = "preselectedTemplate" in ctx ? ctx as GenerateImageV2Opts : null;
  const lines: string[] = [base];
  if (v2) {
    lines.push("");
    lines.push(`# TEMPLATE`);
    lines.push(`The image will render via the "${v2.preselectedTemplate}" template${v2.preselectedTone ? ` (tone="${v2.preselectedTone}")` : ""}. Fill the discriminated-union "content" field with that template's exact shape.`);
  }
  if (isCarousel) {
    lines.push("");
    lines.push(`# CAROUSEL STRUCTURE (5 slides, fixed order)`);
    lines.push(`1. cover — eyebrow + title + subtitle (the hook)`);
    lines.push(`2. problem — question + body + a stat callout`);
    lines.push(`3. stat — hero number + headline + context + 2-4 comparative bars (industry baseline vs PatientPartner)`);
    lines.push(`4. mechanism — title + 3 steps (n=01/02/03, h=headline, b=body) explaining HOW the result happens`);
    lines.push(`5. cta — title (with one word for gradient highlight, default 'mentorship'), body, cta='Schedule a free demo' style action, url='patientpartner.com/demo'`);
  }
  return lines.join("\n");
}

export async function generateImagePostV2(opts: GenerateImageV2Opts): Promise<{
  post: ImagePostV2;
  cacheHits: { read: number; create: number };
}> {
  if (opts.format !== "image") throw new Error("generateImagePostV2 requires format='image'");
  console.log(`[claude:imageV2] starting · template=${opts.preselectedTemplate} · tone=${opts.preselectedTone ?? "—"} · category=${opts.category}`);
  const t0 = Date.now();
  const res = await client().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(ImagePostV2Schema),
    },
    system: systemBlocks(),
    messages: [{ role: "user", content: buildV2UserMessage(opts) }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  console.log(`[claude:imageV2] returned in ${((Date.now() - t0)/1000).toFixed(1)}s · stop=${res.stop_reason} · parsed=${res.parsed_output ? 'ok' : 'NULL'}`);

  if (!res.parsed_output) {
    throw new Error(`Claude returned no parsed_output for image V2 (stop_reason=${res.stop_reason})`);
  }
  return {
    post: res.parsed_output as ImagePostV2,
    cacheHits: {
      read: res.usage.cache_read_input_tokens ?? 0,
      create: res.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

export async function generateCarouselPostV2(ctx: GenerationContext): Promise<{
  post: CarouselPostV2;
  cacheHits: { read: number; create: number };
}> {
  if (ctx.format !== "carousel") throw new Error("generateCarouselPostV2 requires format='carousel'");
  console.log(`[claude:carouselV2] starting · category=${ctx.category}`);
  const t0 = Date.now();
  const res = await client().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(CarouselPostV2Schema),
    },
    system: systemBlocks(),
    messages: [{ role: "user", content: buildV2UserMessage(ctx, true) }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  console.log(`[claude:carouselV2] returned in ${((Date.now() - t0)/1000).toFixed(1)}s · stop=${res.stop_reason} · parsed=${res.parsed_output ? 'ok' : 'NULL'}`);

  if (!res.parsed_output) {
    throw new Error(`Claude returned no parsed_output for carousel V2 (stop_reason=${res.stop_reason})`);
  }
  return {
    post: res.parsed_output as CarouselPostV2,
    cacheHits: {
      read: res.usage.cache_read_input_tokens ?? 0,
      create: res.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

// ─── Self-review pass ─────────────────────────────────
// Second Claude call that scores caption 0-100 for human-likeness and flags
// AI-sounding sentences. If score < 60, we trigger a rewrite (max 1 rewrite).

const ReviewResultSchema = z.object({
  originality_score: z.number().int().min(0).max(100),
  flagged_sentences: z
    .array(z.object({ sentence: z.string(), reason: z.string() }))
    .max(10),
  rewritten_caption: z.string().optional(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;

const REVIEW_SYSTEM = `You are a content editor reviewing LinkedIn posts for a pharma company. Score this post 0-100 for human-likeness.

FLAG any sentence that sounds AI-generated:
- Repetitive sentence structures ("In today's... In our... In the...")
- Generic transitions ("Moreover", "Furthermore", "At the end of the day")
- Overly balanced arguments (every positive has a matching negative)
- Formulaic CTAs ("Contact us to learn more", "Reach out today")
- Vague platitudes without specifics
- Parallel structure across paragraphs

If score < 60, REWRITE the flagged sentences with:
- More varied rhythm (mix 5-word and 25-word sentences)
- Specific, concrete examples
- Original phrasing — the way a smart human strategist would write it
- One unexpected angle or contrarian take

Return JSON: { originality_score, flagged_sentences: [{sentence, reason}], rewritten_caption? }`;

export async function reviewPost(caption: string): Promise<ReviewResult> {
  const resp = await client().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3072,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        name: "review_result",
        schema: {
          type: "object",
          properties: {
            originality_score: { type: "integer", minimum: 0, maximum: 100 },
            flagged_sentences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sentence: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["sentence", "reason"],
                additionalProperties: false,
              },
            },
            rewritten_caption: { type: "string" },
          },
          required: ["originality_score", "flagged_sentences"],
          additionalProperties: false,
        },
      },
    },
    system: REVIEW_SYSTEM,
    messages: [{ role: "user", content: caption }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { originality_score: 50, flagged_sentences: [] };
  }
  try {
    return ReviewResultSchema.parse(JSON.parse(textBlock.text));
  } catch {
    return { originality_score: 50, flagged_sentences: [] };
  }
}

// ─── Regenerate with rejection feedback ───────────────
// Same signature as the generateX functions but accepts a rejectionFeedback
// that's passed through as volatile context (stays in messages, preserves cache).

export async function regeneratePost(
  ctx: GenerationContext & { rejectionFeedback: string }
): Promise<{ post: GeneratedPost; cacheHits: { read: number; create: number } }> {
  // The rejectionFeedback is part of GenerationContext already — buildUserMessage
  // appends it. Just route to the right generator by format.
  if (ctx.format === "image") {
    const out = await generateImagePost(ctx);
    return { post: out.post, cacheHits: out.cacheHits };
  }
  const out = await generateCarouselPost(ctx);
  return { post: out.post, cacheHits: out.cacheHits };
}

// ─── Zod → JSON Schema ──────────────────────────────────
// Zod 4 ships z.toJSONSchema() natively. The previous hand-rolled converter
// read schema._def.typeName which Zod 4 removed — every conversion silently
// returned {} → Claude rejected with 400 → buildOnePost failed in <1s →
// the orchestrator logged "0 posts generated" with no error. Use the native
// converter, which produces a fully spec-compliant JSON Schema.

function zodToJsonSchema(schema: z.ZodType): unknown {
  // Anthropic's output_config.format wants Draft 2020-12 with no $ref unwrapping.
  return z.toJSONSchema(schema, { target: "draft-2020-12" });
}
