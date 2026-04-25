// Category → template mapping. Deterministic per (category, format).
// Tone rotation for templates with variants uses a hash of the run_id so
// consecutive posts vary without the agent having to track state.

import type { ContentCategory, PostFormat } from "./constants";

export type StaticTemplateName = "static-quote" | "static-stat" | "static-insight";

export interface TemplatePick {
  template: StaticTemplateName;
  // tone for templates that have variants ("dark"|"teal"|"light" for quote;
  // "dark"|"light"|"split" for stat). Insight has no tone.
  tone?: "dark" | "teal" | "light" | "split";
}

// Cheap deterministic hash for tone rotation.
function hashIdx(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

const QUOTE_TONES = ["dark", "teal", "light"] as const;
const STAT_TONES = ["dark", "light", "split"] as const;

export function pickTemplate(
  category: ContentCategory,
  format: PostFormat,
  seed: string
): TemplatePick {
  if (format === "carousel") {
    // Carousel doesn't use a single static template — buildOnePost uses the
    // 5-slide flow directly. Caller branches on format !== "image" before
    // reading this. We return a sentinel here to make the type system happy.
    // (build-post.ts uses pickTemplate ONLY for format="image".)
    throw new Error("pickTemplate is for static images only — carousels use the 5-slide flow");
  }

  switch (category) {
    case "stat_post":
      return { template: "static-stat", tone: STAT_TONES[hashIdx(seed, 3)] };
    case "thought_leadership":
      return { template: "static-insight" };
    case "missing_middle":
      return { template: "static-quote", tone: "dark" };
    case "lead_magnet":
      // Lead magnets that fall to image (rare — most are carousels) use the
      // split stat variant for a strong number-forward look.
      return { template: "static-stat", tone: "split" };
    case "perfectpatient":
      return { template: "static-quote", tone: QUOTE_TONES[hashIdx(seed + "pp", 2) + 1] }; // teal or light
  }
}
