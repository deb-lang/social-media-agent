// UTM tracking — every patientpartner.com link in a generated caption gets
// tagged so we can measure LinkedIn → site traffic per category/format/month.
// Only patientpartner.com links are rewritten. External URLs are left alone.

import type { ContentCategory, PostFormat } from "./constants";

export interface CampaignParts {
  category: ContentCategory;
  format: PostFormat;
  date: Date;
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

/**
 * Build the utm_campaign string.
 * Format: {category}_{format}_{monYYYY}
 * Example: lead_magnet_image_apr2026
 */
export function buildCampaign(parts: CampaignParts): string {
  const mon = MONTHS[parts.date.getMonth()];
  return `${parts.category}_${parts.format}_${mon}${parts.date.getFullYear()}`;
}

/**
 * Build the full UTM query string (without leading ?).
 */
export function buildUtmQuery(campaign: string): string {
  const params = new URLSearchParams({
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: campaign,
  });
  return params.toString();
}

/**
 * Inject UTM params into every patientpartner.com link inside a caption.
 * Preserves existing query strings. Idempotent — running twice does not
 * duplicate params.
 */
export function injectUtm(caption: string, campaign: string): string {
  const utm = buildUtmQuery(campaign);

  // Match patientpartner.com URLs (www. optional) with optional path/query.
  // Stops at whitespace or closing paren (common in markdown).
  const PP_URL_RE = /https?:\/\/(www\.)?patientpartner\.com\/[^\s)]+/g;

  return caption.replace(PP_URL_RE, (match) => {
    try {
      const u = new URL(match);
      // Idempotent: if utm_campaign is already present with the same value, skip.
      if (u.searchParams.get("utm_campaign") === campaign) return u.toString();
      // Otherwise set/override the three tracking params.
      u.searchParams.set("utm_source", "linkedin");
      u.searchParams.set("utm_medium", "social");
      u.searchParams.set("utm_campaign", campaign);
      return u.toString();
    } catch {
      // URL() throws on garbage — leave the original untouched
      const sep = match.includes("?") ? "&" : "?";
      return `${match}${sep}${utm}`;
    }
  });
}
