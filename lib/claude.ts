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

export const CtaSchema = z.object({
  bold: z.string().min(1).max(100),
  supporting: z.string().min(1).max(100),
});

export const DarkNavyImageSchema = z.object({
  template: z.literal("dark_navy"),
  headline: z.string().min(1).max(120),
  subhead: z.string().max(120).optional(),
  problemLabel: z.string().max(40).optional(),
  problemStats: z.array(StatCardSchema).max(3).optional(),
  solutionLabel: z.string().max(40).optional(),
  solutionStats: z.array(StatCardSchema).max(3).optional(),
  cta: CtaSchema.optional(),
  footer: z.string().max(60).optional(),
});

export const LightTealImageSchema = z.object({
  template: z.literal("light_teal"),
  kind: z.enum(["quote", "announcement", "feature"]),
  headline: z.string().max(80).optional(),
  subhead: z.string().max(120).optional(),
  quote: z
    .object({
      text: z.string().min(1).max(240),
      attribution: z.string().min(1).max(40),
      role: z.string().max(60).optional(),
    })
    .optional(),
  features: z
    .array(z.object({ title: z.string().max(40), body: z.string().max(140) }))
    .max(3)
    .optional(),
  bottomStats: z.array(StatCardSchema).max(2).optional(),
  cta: CtaSchema.optional(),
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
  slides: z.array(ImageInputSchema).min(5).max(8),
});

export type ImagePost = z.infer<typeof ImagePostSchema>;
export type CarouselPost = z.infer<typeof CarouselPostSchema>;
export type GeneratedPost = ImagePost | CarouselPost;

// ─── Client ─────────────────────────────────────────────

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
}

// ─── Prompt builders ────────────────────────────────────

function buildUserMessage(ctx: GenerationContext): string {
  const parts: string[] = [];

  parts.push(`# TASK`);
  parts.push(
    `Generate ONE ${ctx.format === "carousel" ? "LinkedIn document carousel" : "LinkedIn image post"} in the ${ctx.category} category.`
  );

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
    `Return structured JSON matching the provided schema. For carousels, produce 5-8 slides that mix the two templates (dark_navy for stats, light_teal for quotes/insight). Reference only stat IDs from the approved list above. Set stat_verified=true only when the source has a URL.`
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

  // The SDK's zodOutputFormat auto-parses res.parsed_output as the Zod type.
  if (!res.parsed_output) {
    throw new Error("Claude returned no parsed_output for image post");
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
  // Carousel output is larger (~6-8K tokens for 8 slides + caption). Stream it.
  // SDK's messages.stream() accepts MessageStreamParams (= ParseableMessageCreateParams).
  const stream = client().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(CarouselPostSchema),
    },
    system: systemBlocks(),
    messages: [{ role: "user", content: buildUserMessage(ctx) }],
  } as Anthropic.MessageStreamParams);

  const final = await stream.finalMessage();
  // With zodOutputFormat, finalMessage() includes parsed_output.
  if (!final.parsed_output) {
    throw new Error("Claude returned no parsed_output for carousel");
  }
  const parsed = final.parsed_output as CarouselPost;
  return {
    post: parsed,
    cacheHits: {
      read: final.usage.cache_read_input_tokens ?? 0,
      create: final.usage.cache_creation_input_tokens ?? 0,
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
// The Anthropic API's output_config.format.json_schema wants plain JSON Schema.
// Minimal converter covering the shapes we use: discriminatedUnion, optional,
// literal, enum, array, string, number, boolean, object. If Zod's `toJSONSchema`
// helper becomes available we'll swap to it.

function zodToJsonSchema(schema: z.ZodTypeAny): unknown {
  const def = (schema as { _def: { typeName?: string } })._def;
  const typeName = def.typeName;

  // z.object({...})
  if (typeName === "ZodObject") {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, val] of Object.entries(shape)) {
      const child = val as z.ZodTypeAny;
      properties[key] = zodToJsonSchema(child);
      if (!child.isOptional()) required.push(key);
    }
    return { type: "object", properties, required, additionalProperties: false };
  }

  // z.string()
  if (typeName === "ZodString") {
    const out: Record<string, unknown> = { type: "string" };
    const checks = (def as { checks?: Array<{ kind: string; value?: number; value2?: string }> })
      .checks;
    checks?.forEach((c) => {
      if (c.kind === "min" && typeof c.value === "number") out.minLength = c.value;
      if (c.kind === "max" && typeof c.value === "number") out.maxLength = c.value;
    });
    return out;
  }

  // z.number()
  if (typeName === "ZodNumber") return { type: "number" };
  if (typeName === "ZodBoolean") return { type: "boolean" };

  // z.array(...)
  if (typeName === "ZodArray") {
    const inner = (schema as z.ZodArray<z.ZodTypeAny>).element;
    const checks = (def as { minLength?: { value: number }; maxLength?: { value: number } });
    const out: Record<string, unknown> = { type: "array", items: zodToJsonSchema(inner) };
    if (checks.minLength) out.minItems = checks.minLength.value;
    if (checks.maxLength) out.maxItems = checks.maxLength.value;
    return out;
  }

  // z.enum(['a','b'])
  if (typeName === "ZodEnum") {
    const values = (def as { values: readonly string[] }).values;
    return { type: "string", enum: [...values] };
  }

  // z.literal('x')
  if (typeName === "ZodLiteral") {
    const value = (def as { value: string | number | boolean }).value;
    return { const: value };
  }

  // z.optional(inner) — unwrap (optionality handled by parent ZodObject required[])
  if (typeName === "ZodOptional") {
    return zodToJsonSchema((schema as z.ZodOptional<z.ZodTypeAny>).unwrap());
  }

  // z.discriminatedUnion('key', [a, b])
  if (typeName === "ZodDiscriminatedUnion") {
    const options = (def as { options: z.ZodTypeAny[] }).options;
    return { oneOf: options.map((o) => zodToJsonSchema(o)) };
  }

  // z.union([a, b])
  if (typeName === "ZodUnion") {
    const options = (def as { options: z.ZodTypeAny[] }).options;
    return { anyOf: options.map((o) => zodToJsonSchema(o)) };
  }

  return {}; // fallback
}
