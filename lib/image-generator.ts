// Image & carousel generator — SVG → PNG via @resvg/resvg-js (Rust, fast,
// Vercel-serverless-compatible). Carousel PDFs composed from slide PNGs via
// pdf-lib. Templates ported from brand/image-skill.md.
//
// Two templates:
//   - dark_navy: stats, data, problem-solution, clinical trial facts
//   - light_teal: quotes, product announcements, PerfectPatient, milestones
//
// Font note: Vercel's serverless Linux containers do NOT have Arial. Resvg
// silently drops <text> elements when it can't resolve the font. We use a
// system-safe stack + tell Resvg the default family so it renders even on
// minimal containers. DejaVu Sans is preinstalled on every Linux distro
// Vercel runs.

import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  IMAGE_COLORS,
  IMAGE_SIZE,
  CAROUSEL_SLIDE_WIDTH,
  CAROUSEL_SLIDE_HEIGHT,
} from "./constants";

// CRITICAL: Resvg 2.6.2 cannot reliably decode WOFF/WOFF2 files via fontFiles
// (verified locally — produces 962-byte blank PNGs). Use TTF instead.
// Files committed to public/fonts/ so they ship with the Vercel function bundle
// (the /public directory is always included; no outputFileTracingIncludes needed).
const FONT_FILES = [
  join(process.cwd(), "public/fonts/Poppins-Regular.ttf"),
  join(process.cwd(), "public/fonts/Poppins-SemiBold.ttf"),
  join(process.cwd(), "public/fonts/Poppins-Bold.ttf"),
  join(process.cwd(), "public/fonts/Inter-Regular.ttf"), // fallback for chars Poppins lacks
];

const RESVG_FONT_OPTS = {
  loadSystemFonts: false, // skip — system fonts are inconsistent on Vercel
  fontFiles: FONT_FILES,
  defaultFontFamily: "Poppins",
} as const;

// ─── Logo ───────────────────────────────────────────────
// Lazily loaded + cached. Read from /public/logo.png at module init.
let _logoB64: string | null = null;
function logoBase64(): string {
  if (_logoB64) return _logoB64;
  const path = join(process.cwd(), "public", "logo.png");
  _logoB64 = readFileSync(path).toString("base64");
  return _logoB64;
}

// ─── Shared XML helpers ─────────────────────────────────
const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Wrap text into lines that fit a max character count per line.
// SVG doesn't auto-wrap — we pre-split with <tspan> rows.
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Types ──────────────────────────────────────────────
export interface StatCard {
  value: string;
  label: string;
}

export interface DarkNavyImageInput {
  template: "dark_navy";
  headline: string;
  subhead?: string;
  problemLabel?: string;
  problemStats?: StatCard[]; // 3 recommended
  solutionLabel?: string;
  solutionStats?: StatCard[]; // 3 recommended
  cta?: { bold: string; supporting: string };
  footer?: string; // e.g. "patientpartner.com"
}

export interface LightTealImageInput {
  template: "light_teal";
  kind: "quote" | "announcement" | "feature";
  headline?: string;
  subhead?: string;
  quote?: { text: string; attribution: string; role?: string };
  features?: Array<{ title: string; body: string }>;
  bottomStats?: StatCard[];
  cta?: { bold: string; supporting: string };
  footer?: string;
}

export type ImageInput = DarkNavyImageInput | LightTealImageInput;

// ─── Dark Navy Template ─────────────────────────────────
function buildDarkNavySvg(input: DarkNavyImageInput): string {
  const logo = logoBase64();
  const { headline, subhead, problemLabel, problemStats, solutionLabel, solutionStats, cta, footer } = input;
  const cardColor = IMAGE_COLORS.cardDark;
  const teal = IMAGE_COLORS.teal;

  const headlineLines = wrapText(headline, 38).slice(0, 2);

  // 3-across card positions
  const cardX = [50, 431, 812];
  const cardW = 338;

  const renderStatRow = (stats: StatCard[], y: number, opts: { tealStat: boolean; strokeWidth: number }) => {
    const cardH = 200;
    return stats.slice(0, 3).map((s, i) => {
      const x = cardX[i] ?? cardX[0];
      const labelLines = wrapText(s.label, 26).slice(0, 2);
      const statFill = opts.tealStat ? teal : IMAGE_COLORS.textWhite;
      return `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12"
    fill="${cardColor}" stroke="${teal}" stroke-width="${opts.strokeWidth}"/>
  <text x="${x + cardW / 2}" y="${y + 92}" font-family="Poppins, Inter, sans-serif" font-size="76" font-weight="700" fill="${statFill}" text-anchor="middle">${escapeXml(s.value)}</text>
  ${labelLines
    .map(
      (ln, idx) =>
        `<text x="${x + cardW / 2}" y="${y + 140 + idx * 26}" font-family="Poppins, Inter, sans-serif" font-size="20" fill="#E0ECF4" text-anchor="middle">${escapeXml(ln)}</text>`
    )
    .join("\n  ")}
    `.trim();
    }).join("\n");
  };

  const problemRowY = 350;
  const solutionRowY = 620;
  const ctaY = 880;
  const footerY = 1020;

  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" fill="${IMAGE_COLORS.darkBg}"/>

  <!-- Accent circles (not blurred, just opacity) -->
  <circle cx="1040" cy="160" r="300" fill="${teal}" opacity="0.07"/>
  <circle cx="160" cy="1080" r="230" fill="${teal}" opacity="0.05"/>

  <!-- Logo -->
  <image href="data:image/png;base64,${logo}" x="50" y="44" width="300" height="78"/>

  <!-- Divider under logo -->
  <line x1="50" y1="150" x2="1150" y2="150" stroke="${teal}" stroke-width="1" opacity="0.25"/>

  <!-- Headline -->
  ${headlineLines
    .map(
      (ln, i) =>
        `<text x="50" y="${210 + i * 58}" font-family="Poppins, Inter, sans-serif" font-size="54" font-weight="700" fill="${IMAGE_COLORS.textWhite}">${escapeXml(ln)}</text>`
    )
    .join("\n  ")}
  ${subhead ? `<text x="50" y="${210 + headlineLines.length * 58 + 8}" font-family="Poppins, Inter, sans-serif" font-size="24" fill="${teal}">${escapeXml(subhead)}</text>` : ""}

  <!-- Problem label + row -->
  ${problemLabel ? `<text x="50" y="335" font-family="Poppins, Inter, sans-serif" font-size="16" font-weight="700" fill="${teal}" letter-spacing="3">${escapeXml(problemLabel.toUpperCase())}</text>` : ""}
  ${problemStats && problemStats.length ? renderStatRow(problemStats, problemRowY, { tealStat: false, strokeWidth: 1 }) : ""}

  <!-- Solution label + row -->
  ${solutionLabel ? `<text x="50" y="605" font-family="Poppins, Inter, sans-serif" font-size="16" font-weight="700" fill="${teal}" letter-spacing="3">${escapeXml(solutionLabel.toUpperCase())}</text>` : ""}
  ${solutionStats && solutionStats.length ? renderStatRow(solutionStats, solutionRowY, { tealStat: true, strokeWidth: 2.5 }) : ""}

  <!-- CTA bar -->
  ${
    cta
      ? `<rect x="50" y="${ctaY}" width="1100" height="100" rx="12" fill="${teal}" opacity="0.12" stroke="${teal}" stroke-width="1"/>
  <text x="600" y="${ctaY + 42}" font-family="Poppins, Inter, sans-serif" fill="${IMAGE_COLORS.textWhite}" font-size="26" font-weight="700" text-anchor="middle">${escapeXml(cta.bold)}</text>
  <text x="600" y="${ctaY + 78}" font-family="Poppins, Inter, sans-serif" fill="${teal}" font-size="20" text-anchor="middle">${escapeXml(cta.supporting)}</text>`
      : ""
  }

  <!-- Footer URL -->
  ${footer ? `<text x="600" y="${footerY}" font-family="Poppins, Inter, sans-serif" fill="${teal}" font-size="18" text-anchor="middle" opacity="0.7">${escapeXml(footer)}</text>` : ""}
</svg>`;
}

// ─── Light Teal Template ────────────────────────────────
function buildLightTealSvg(input: LightTealImageInput): string {
  const logo = logoBase64();
  const teal = IMAGE_COLORS.teal;
  const textDark = IMAGE_COLORS.textDarkOnLight;
  const { kind, headline, subhead, quote, features, bottomStats, cta, footer } = input;

  const ctaY = 860;
  const footerY = 1020;

  let body = "";

  if (kind === "quote" && quote) {
    const quoteLines = wrapText(quote.text, 44);
    const quoteBlockY = 410;
    body = `
  <text x="50" y="400" font-family="Poppins, Inter, sans-serif" font-size="160" font-weight="700" fill="${teal}">&#8220;</text>
  ${quoteLines
    .map(
      (ln, i) =>
        `<text x="600" y="${quoteBlockY + 80 + i * 44}" font-family="Poppins, Inter, sans-serif" font-size="32" font-style="italic" fill="${textDark}" text-anchor="middle">${escapeXml(ln)}</text>`
    )
    .join("\n  ")}
  <text x="600" y="${quoteBlockY + 80 + quoteLines.length * 44 + 40}" font-family="Poppins, Inter, sans-serif" font-size="22" font-weight="700" fill="${teal}" text-anchor="middle">${escapeXml(quote.attribution)}</text>
  ${quote.role ? `<text x="600" y="${quoteBlockY + 80 + quoteLines.length * 44 + 70}" font-family="Poppins, Inter, sans-serif" font-size="20" fill="${textDark}" text-anchor="middle">${escapeXml(quote.role)}</text>` : ""}
    `;
  } else if (kind === "announcement" || kind === "feature") {
    const headlineLines = headline ? wrapText(headline, 26).slice(0, 2) : [];
    body = `
  ${headlineLines
    .map(
      (ln, i) =>
        `<text x="50" y="${230 + i * 60}" font-family="Poppins, Inter, sans-serif" font-size="58" font-weight="700" fill="${textDark}">${escapeXml(ln)}</text>`
    )
    .join("\n  ")}
  ${subhead ? `<text x="50" y="${230 + headlineLines.length * 60 + 10}" font-family="Poppins, Inter, sans-serif" font-size="24" fill="${teal}">${escapeXml(subhead)}</text>` : ""}
  ${
    features && features.length
      ? features
          .slice(0, 3)
          .map((f, i) => {
            const x = 50 + (i % 3) * 381;
            const y = 400;
            return `
  <rect x="${x}" y="${y}" width="338" height="300" rx="14" fill="${IMAGE_COLORS.cardLight}" stroke="${teal}" stroke-width="1.5"/>
  <text x="${x + 20}" y="${y + 36}" font-family="Poppins, Inter, sans-serif" font-size="20" font-weight="700" fill="${teal}">${escapeXml(f.title)}</text>
  ${wrapText(f.body, 32)
    .slice(0, 6)
    .map(
      (ln, bi) =>
        `<text x="${x + 20}" y="${y + 76 + bi * 26}" font-family="Poppins, Inter, sans-serif" font-size="17" fill="${textDark}">${escapeXml(ln)}</text>`
    )
    .join("\n  ")}
            `.trim();
          })
          .join("\n")
      : ""
  }
    `;
  }

  // Bottom stat strip
  const bottomStatStrip =
    bottomStats && bottomStats.length >= 2
      ? bottomStats
          .slice(0, 2)
          .map((s, i) => {
            const x = 50 + i * 576;
            return `
  <rect x="${x}" y="730" width="524" height="110" rx="14" fill="${IMAGE_COLORS.cardLight}" stroke="${teal}" stroke-width="1.5"/>
  <text x="${x + 262}" y="790" font-family="Poppins, Inter, sans-serif" font-size="46" font-weight="700" fill="${teal}" text-anchor="middle">${escapeXml(s.value)}</text>
  <text x="${x + 262}" y="820" font-family="Poppins, Inter, sans-serif" font-size="15" fill="${textDark}" text-anchor="middle">${escapeXml(s.label)}</text>
          `.trim();
          })
          .join("\n")
      : "";

  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${IMAGE_COLORS.lightGradTop}"/>
      <stop offset="100%" stop-color="${IMAGE_COLORS.lightGradBottom}"/>
    </linearGradient>
    <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="45"/>
    </filter>
  </defs>
  <rect width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" fill="url(#bgGrad)"/>

  <!-- Blurred accent circles (required for light template) -->
  <circle cx="1080" cy="140" r="230" fill="${teal}" opacity="0.14" filter="url(#blur1)"/>
  <circle cx="130" cy="1070" r="210" fill="${teal}" opacity="0.11" filter="url(#blur1)"/>
  <circle cx="620" cy="580" r="190" fill="${IMAGE_COLORS.blurAccent}" opacity="0.07" filter="url(#blur1)"/>

  <!-- Logo -->
  <image href="data:image/png;base64,${logo}" x="50" y="44" width="300" height="78"/>

  <!-- Divider under logo -->
  <line x1="50" y1="150" x2="1150" y2="150" stroke="${teal}" stroke-width="1" opacity="0.35"/>

  ${body}

  ${bottomStatStrip}

  <!-- CTA bar (solid teal) -->
  ${
    cta
      ? `<rect x="50" y="${ctaY}" width="1100" height="100" rx="14" fill="${teal}"/>
  <text x="600" y="${ctaY + 42}" font-family="Poppins, Inter, sans-serif" fill="${IMAGE_COLORS.textWhite}" font-size="24" font-weight="700" text-anchor="middle">${escapeXml(cta.bold)}</text>
  <text x="600" y="${ctaY + 78}" font-family="Poppins, Inter, sans-serif" fill="${IMAGE_COLORS.textWhite}" font-size="18" text-anchor="middle">${escapeXml(cta.supporting)}</text>`
      : ""
  }

  <!-- Footer URL -->
  ${footer ? `<text x="600" y="${footerY}" font-family="Poppins, Inter, sans-serif" fill="${textDark}" font-size="18" text-anchor="middle" opacity="0.6">${escapeXml(footer)}</text>` : ""}
</svg>`;
}

// ─── Public API ─────────────────────────────────────────
export function buildSvg(input: ImageInput): string {
  return input.template === "dark_navy" ? buildDarkNavySvg(input) : buildLightTealSvg(input);
}

export function renderImage(input: ImageInput): Buffer {
  const svg = buildSvg(input);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: IMAGE_SIZE },
    font: RESVG_FONT_OPTS,
  });
  const png = resvg.render().asPng();
  if (!png || png.length < 1000) {
    throw new Error(`Resvg produced empty/tiny PNG (${png?.length ?? 0} bytes) for ${input.template}`);
  }
  return png;
}

// ─── Carousel ──────────────────────────────────────────
// Carousels are 1080×1350 multi-slide PDFs for LinkedIn document posts.
// Each slide is its own SVG (using the same templates at different aspect ratio)
// and we compose them into a PDF with pdf-lib.

export interface CarouselSlide {
  svg: string; // Pre-built 1080×1350 SVG string
}

export function renderSlidePng(svg1080x1350: string): Buffer {
  const resvg = new Resvg(svg1080x1350, {
    fitTo: { mode: "width", value: CAROUSEL_SLIDE_WIDTH },
    font: RESVG_FONT_OPTS,
  });
  const png = resvg.render().asPng();
  if (!png || png.length < 1000) {
    throw new Error(`Resvg produced empty/tiny slide PNG (${png?.length ?? 0} bytes)`);
  }
  return png;
}

export async function composeCarouselPdf(slidePngs: Buffer[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (const png of slidePngs) {
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([CAROUSEL_SLIDE_WIDTH, CAROUSEL_SLIDE_HEIGHT]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: CAROUSEL_SLIDE_WIDTH,
      height: CAROUSEL_SLIDE_HEIGHT,
    });
  }
  return Buffer.from(await pdf.save());
}
