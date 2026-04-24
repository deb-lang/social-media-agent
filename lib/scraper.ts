// Scraper for patientpartner.com/resources.
// Runs on each generation to refresh the content_sources cache — feeds the
// lead_magnet category and provides URLs Claude can link to in captions.

import * as cheerio from "cheerio";
import { supabaseAdmin } from "./supabase";

const RESOURCES_URL = "https://www.patientpartner.com/resources";

export interface ScrapedResource {
  source_url: string;
  title: string | null;
  description: string | null;
  content_type: string | null;
  published_date: string | null;
}

// Lightweight inference of content type from URL path + DOM hints.
function guessType(href: string, domHint?: string): string {
  const lowered = (domHint ?? href).toLowerCase();
  if (lowered.includes("case-study") || lowered.includes("case_study")) return "case_study";
  if (lowered.includes("whitepaper") || lowered.includes("white-paper")) return "whitepaper";
  if (lowered.includes("benchmark") || lowered.includes("report")) return "whitepaper";
  if (lowered.includes("guide")) return "whitepaper";
  if (lowered.includes("/blog/") || lowered.includes("article")) return "blog";
  if (lowered.includes("webinar") || lowered.includes("video")) return "webinar";
  return "blog";
}

function absoluteUrl(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `https://www.patientpartner.com${href}`;
  return `https://www.patientpartner.com/${href}`;
}

export async function fetchResources(): Promise<ScrapedResource[]> {
  const res = await fetch(RESOURCES_URL, {
    headers: {
      "User-Agent": "PatientPartner-Social-Agent/1.0 (+https://patientpartner.com)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch ${RESOURCES_URL} → ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const items: ScrapedResource[] = [];

  // Conservative selectors: anchor tags inside cards or list items on the
  // resources hub. We filter to links with meaningful titles and exclude nav.
  $("a[href]").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href")?.trim();
    if (!href) return;
    const url = absoluteUrl(href);
    if (!url.startsWith("https://www.patientpartner.com/")) return;
    // Ignore the resources hub itself and obvious navigation/anchor links
    if (url === RESOURCES_URL || url.endsWith("#") || url.includes("#")) return;
    if (/\/(cart|checkout|login|signup|contact|about|careers|privacy|terms)\//.test(url)) return;
    const title = $el.text().trim().replace(/\s+/g, " ");
    if (!title || title.length < 8 || title.length > 200) return;
    if (seen.has(url)) return;
    seen.add(url);

    // Try to find a description sibling or parent paragraph
    const $card = $el.closest("article, li, .card, [class*='card'], [class*='resource']");
    const description =
      $card.find("p").first().text().trim().slice(0, 400) ||
      $el.attr("aria-label") ||
      null;

    items.push({
      source_url: url,
      title,
      description,
      content_type: guessType(url),
      published_date: null,
    });
  });

  return items;
}

export async function refreshResourceCache(): Promise<{
  scraped: number;
  upserted: number;
}> {
  const items = await fetchResources();
  if (items.length === 0) return { scraped: 0, upserted: 0 };

  const sb = supabaseAdmin();
  // Upsert on source_url (unique). Errors on individual rows don't fail the batch.
  const { error, count } = await sb.from("content_sources").upsert(
    items.map((i) => ({
      source_url: i.source_url,
      title: i.title,
      description: i.description,
      content_type: i.content_type,
      published_date: i.published_date,
      scraped_at: new Date().toISOString(),
    })),
    { onConflict: "source_url", count: "exact" }
  );
  if (error) throw new Error(`content_sources upsert: ${error.message}`);
  return { scraped: items.length, upserted: count ?? items.length };
}

export async function listResources(
  opts: { contentType?: string; limit?: number } = {}
): Promise<ScrapedResource[]> {
  const sb = supabaseAdmin();
  let q = sb.from("content_sources").select("source_url, title, description, content_type, published_date");
  if (opts.contentType) q = q.eq("content_type", opts.contentType);
  q = q.order("scraped_at", { ascending: false }).limit(opts.limit ?? 20);
  const { data, error } = await q;
  if (error) throw new Error(`content_sources select: ${error.message}`);
  return (data ?? []) as ScrapedResource[];
}
