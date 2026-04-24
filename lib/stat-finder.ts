// External stat finder — uses Claude's server-side web_search tool to surface
// fresh industry stats (last 12 months) from trusted domains. Each result is
// validated to have a source name + URL before being stored.
//
// Called once per generation run, before Claude drafts captions. Supplements
// (doesn't replace) the approved stat library in lib/approved-stats.ts.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAUDE_MODEL, TRUSTED_STAT_DOMAINS } from "./constants";
import { supabaseAdmin } from "./supabase";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ─── Output shape ──────────────────────────────────────

export const FoundStatSchema = z.object({
  stat_value: z.string().min(1).max(30),
  stat_context: z.string().min(10).max(240),
  source_name: z.string().min(1).max(120),
  source_url: z.string().url(),
  publication_date: z.string().optional(),
  topic_tags: z.array(z.string()).min(1).max(6),
});
export type FoundStat = z.infer<typeof FoundStatSchema>;

const StatsArraySchema = z.object({ stats: z.array(FoundStatSchema).min(0).max(8) });

// ─── Prompt ────────────────────────────────────────────

const STAT_FINDER_SYSTEM = `You are a research assistant for PatientPartner's LinkedIn content agent. You find FRESH industry statistics (published in the last 12 months) from trusted healthcare/pharma/clinical trial sources.

RULES:
- Use the web_search tool to look up recent stats.
- Prefer these trusted domains: ${TRUSTED_STAT_DOMAINS.join(", ")}
- Every stat MUST have: a numeric value, clear context, a source name (publication/organization), a live URL.
- Reject anything without a verifiable URL.
- Reject stats older than 18 months.
- Topics of interest: patient adherence, patient support program (PSP) utilization, peer-to-peer healthcare, clinical trial recruitment/retention, pharma patient engagement, med-tech patient engagement, AI patient mentors, patient trust.
- Return 3-5 high-quality stats, not quantity.
- NEVER invent stats or URLs. If you can't find enough, return fewer.

Return a JSON object matching the schema: { stats: [...] }`;

// ─── Public API ────────────────────────────────────────

export async function findFreshStats(
  opts: { topicHint?: string; limit?: number } = {}
): Promise<FoundStat[]> {
  const userPrompt = [
    `Find ${opts.limit ?? 4} fresh industry stats for PatientPartner's next LinkedIn run.`,
    opts.topicHint ? `Topic focus: ${opts.topicHint}` : null,
    `Return only stats you can verify via web_search. Include URLs.`,
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await client().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        name: "fresh_stats",
        schema: {
          type: "object",
          properties: {
            stats: {
              type: "array",
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  stat_value: { type: "string" },
                  stat_context: { type: "string" },
                  source_name: { type: "string" },
                  source_url: { type: "string" },
                  publication_date: { type: "string" },
                  topic_tags: { type: "array", items: { type: "string" } },
                },
                required: ["stat_value", "stat_context", "source_name", "source_url", "topic_tags"],
                additionalProperties: false,
              },
            },
          },
          required: ["stats"],
          additionalProperties: false,
        },
      },
    },
    system: STAT_FINDER_SYSTEM,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    messages: [{ role: "user", content: userPrompt }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];
  try {
    const raw = JSON.parse(textBlock.text);
    const parsed = StatsArraySchema.parse(raw);
    return parsed.stats;
  } catch {
    return [];
  }
}

export async function persistFoundStats(
  stats: FoundStat[]
): Promise<{ inserted: number }> {
  if (!stats.length) return { inserted: 0 };
  const sb = supabaseAdmin();
  const rows = stats.map((s) => ({
    stat_value: s.stat_value,
    stat_context: s.stat_context,
    source_name: s.source_name,
    source_url: s.source_url,
    publication_date: s.publication_date ?? null,
    topic_tags: s.topic_tags,
  }));
  const { error, count } = await sb
    .from("external_stats")
    .insert(rows, { count: "exact" });
  if (error) throw new Error(`external_stats insert: ${error.message}`);
  return { inserted: count ?? rows.length };
}

export async function listUnusedStats(limit = 8): Promise<FoundStat[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("external_stats")
    .select("stat_value, stat_context, source_name, source_url, publication_date, topic_tags")
    .is("used_in_post_id", null)
    .order("found_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`external_stats select: ${error.message}`);
  return (data ?? []) as FoundStat[];
}
