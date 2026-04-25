// Shared template scaffolding — every template wraps its body in htmlDoc()
// to get a complete, render-ready HTML document with Google Fonts loaded
// and the design-tokens CSS variables in scope.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COLORS, FONTS, GOOGLE_FONTS_HREF, CANVAS } from "./tokens";

// HTML-escape every interpolated string. Templates pass user/Claude-supplied
// content through this before injecting into the body.
export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Real PatientPartner logo — 1995×518 (3.85:1) teal-on-transparent PNG
// committed at public/logo.png. Lazily loaded + base64-cached so we read
// the file at most once per warm container.
let _logoB64: string | null = null;
function logoBase64(): string {
  if (_logoB64) return _logoB64;
  const path = join(process.cwd(), "public", "logo.png");
  _logoB64 = readFileSync(path).toString("base64");
  return _logoB64;
}

// Render the official wordmark+icon as an <img>. Use this in every template
// header — the logo includes both the "PatientPartner" wordmark and the
// stethoscope-in-speech-bubble icon, so no separate wordmark needed.
//
// Default height 60px → ~231px wide. Mode controls visual weight on
// dark vs light backgrounds (the PNG itself is teal-only with transparent
// background, so it works on both, but we may want a slight tint shift).
export function logo(opts: { height?: number } = {}): string {
  const h = opts.height ?? 60;
  return `<img src="data:image/png;base64,${logoBase64()}" alt="PatientPartner" style="height:${h}px; width:auto; display:block;" />`;
}

// Smaller logo variant for the footer strap.
export function logoSmall(opts: { height?: number } = {}): string {
  const h = opts.height ?? 22;
  return `<img src="data:image/png;base64,${logoBase64()}" alt="PatientPartner" style="height:${h}px; width:auto; display:block;" />`;
}

// Eyebrow — small uppercase label used at top of most templates.
// "Mentor Voices", "Care Team Notes", "Adherence Report · 2026", etc.
export function eyebrow(text: string, color: string = COLORS.mintPrimary): string {
  return `<div style="font-family:${FONTS.body}; font-weight:600; font-size:14px; letter-spacing:0.14em; text-transform:uppercase; color:${color};">${esc(text)}</div>`;
}

// Footer strap — small line at bottom of post (logo + URL).
// Used across every template to maintain brand consistency.
export function footerStrap(opts: { url?: string; tone: "dark" | "light" } = { tone: "light" }): string {
  const fg = opts.tone === "dark" ? COLORS.mintLight : COLORS.mintPrimary;
  const url = opts.url ?? "patientpartner.com";
  return `
<div style="display:flex; align-items:center; gap:12px; font-family:${FONTS.body}; font-size:14px; font-weight:600; color:${fg}; letter-spacing:0.04em;">
  ${logoSmall({ height: 22 })}
  <span>${esc(url)}</span>
</div>`.trim();
}

// Wrap a body fragment in a complete HTML document. The doc is sized exactly
// to the canvas (1080×1080 by default) so puppeteer's screenshot at the same
// viewport produces a pixel-perfect crop with no scrollbars.
export function htmlDoc(
  body: string,
  opts: { width?: number; height?: number; bgColor?: string; title?: string } = {}
): string {
  const width = opts.width ?? CANVAS.width;
  const height = opts.height ?? CANVAS.height;
  const bg = opts.bgColor ?? COLORS.skyBreeze;
  const title = opts.title ?? "PatientPartner";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${width}px;
      height: ${height}px;
      font-family: ${FONTS.body};
      background: ${bg};
      color: ${COLORS.navy};
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      overflow: hidden;
    }
    .root {
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
    }
    /* Utility — gradient text used in StaticInsight emphasis + CarouselSlide5 */
    .grad-text {
      background: linear-gradient(135deg, ${COLORS.mintPrimary} 0%, ${COLORS.mintDeep} 60%, ${COLORS.mint} 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }
  </style>
</head>
<body>
  <div class="root">
    ${body}
  </div>
</body>
</html>`;
}
