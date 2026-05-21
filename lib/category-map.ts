// Category → template mapping. Deterministic per (category, format, seed).
// Tone rotation for templates with variants AND v1↔v2 rotation both use a
// hash of run_id + category so consecutive posts vary without the agent
// having to track state.

import type { ContentCategory, PostFormat } from "./constants";

export type StaticTemplateName =
  // v1 templates (Claude Design bundle #1)
  | "static-quote"
  | "static-stat"
  | "static-insight"
  // v2 templates (Claude Design bundle #2, added 2026-05-22)
  | "static-editorial"
  | "static-ticker"
  | "static-diptych";

export interface TemplatePick {
  template: StaticTemplateName;
  // Tone is only meaningful for templates that have visual variants:
  //   static-quote → "dark" | "teal" | "light"
  //   static-stat  → "dark" | "light" | "split"
  // Everything else ignores it.
  tone?: "dark" | "teal" | "light" | "split";
}

// Cheap deterministic hash for tone + v1/v2 rotation.
function hashIdx(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

const QUOTE_TONES = ["dark", "teal", "light"] as const;
const STAT_TONES = ["dark", "light", "split"] as const;

/**
 * Per-category mapping table. Each category gets 1-2 candidate templates.
 * When 2 candidates exist, hashIdx(seed) picks between them — same run_id
 * always picks the same template (deterministic, easy to debug).
 *
 * The v2 pairings:
 *   stat_post          → static-stat (number hero) OR static-ticker (numbers feed)
 *   thought_leadership → static-insight (3-bullet grid) OR static-editorial (essay)
 *   missing_middle     → static-quote (gap as voice) OR static-diptych (gap as side-by-side)
 *   lead_magnet        → static-stat split (forward number) OR static-diptych (before/after)
 *   perfectpatient     → static-quote (warm) OR static-editorial (product story)
 */
function candidatesFor(category: ContentCategory, seed: string): TemplatePick[] {
  switch (category) {
    case "stat_post":
      return [
        { template: "static-stat", tone: STAT_TONES[hashIdx(seed, 3)] },
        { template: "static-ticker" },
      ];
    case "thought_leadership":
      return [
        { template: "static-insight" },
        { template: "static-editorial" },
      ];
    case "missing_middle":
      return [
        { template: "static-quote", tone: "dark" },
        { template: "static-diptych" },
      ];
    case "lead_magnet":
      // Lead magnets that fall to image (most go carousel). Either a strong
      // single-number split-stat OR a before/after diptych.
      return [
        { template: "static-stat", tone: "split" },
        { template: "static-diptych" },
      ];
    case "perfectpatient":
      return [
        {
          template: "static-quote",
          // teal or light — never dark (perfectpatient leans warm/product)
          tone: QUOTE_TONES[hashIdx(seed + "pp", 2) + 1] as TemplatePick["tone"],
        },
        { template: "static-editorial" },
      ];
  }
}

export function pickTemplate(
  category: ContentCategory,
  format: PostFormat,
  seed: string
): TemplatePick {
  if (format === "carousel") {
    // Carousel doesn't use a single static template — buildOnePost uses the
    // 5-slide flow directly. Caller branches on format !== "image" before
    // reading this.
    throw new Error("pickTemplate is for static images only — carousels use the 5-slide flow");
  }

  const candidates = candidatesFor(category, seed);
  if (candidates.length === 0) {
    throw new Error(`No template candidates for category=${category}`);
  }
  // Pick which of the candidates this seed lands on. The +"v2" salt keeps
  // the v1/v2 pick independent of the tone hash (so two different rotations
  // don't collide in the same seed-space).
  const idx = hashIdx(seed + "v2", candidates.length);
  return candidates[idx];
}
