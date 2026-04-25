// Shared template scaffolding — every template wraps its body in htmlDoc()
// to get a complete, render-ready HTML document with Google Fonts loaded
// and the design-tokens CSS variables in scope.

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

// Brand mark — same SVG used across every template (top-left ~80px tall).
// Mirrors the bundler placeholder shape: rounded square with "PP" inside +
// teal underscore mark. Inline so it renders deterministically without
// depending on a network image.
export function logoMark(): string {
  return `
<svg width="64" height="64" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="60" y="60" width="480" height="480" rx="40" fill="${COLORS.navy}" stroke="${COLORS.mint}" stroke-width="3"/>
  <text x="300" y="380" font-family="Poppins, sans-serif" font-weight="800" font-size="240" fill="${COLORS.mint}" text-anchor="middle" letter-spacing="-8">PP</text>
  <rect x="120" y="430" width="60" height="8" rx="4" fill="${COLORS.mint}"/>
  <rect x="200" y="430" width="200" height="8" rx="4" fill="${COLORS.mintPrimary}" opacity="0.5"/>
  <rect x="420" y="430" width="60" height="8" rx="4" fill="${COLORS.mintPrimary}" opacity="0.5"/>
</svg>`.trim();
}

// Brand wordmark "PatientPartner" used inline alongside or instead of the mark.
export function wordmark(color: string = COLORS.navy): string {
  return `<span style="font-family:${FONTS.display}; font-weight:800; font-size:24px; letter-spacing:-0.02em; color:${color};">PatientPartner</span>`;
}

// Eyebrow — small uppercase label used at top of most templates.
// "Mentor Voices", "Care Team Notes", "Adherence Report · 2026", etc.
export function eyebrow(text: string, color: string = COLORS.mintPrimary): string {
  return `<div style="font-family:${FONTS.body}; font-weight:600; font-size:14px; letter-spacing:0.14em; text-transform:uppercase; color:${color};">${esc(text)}</div>`;
}

// Footer strap — small line at bottom of post (e.g. logo + URL).
// Used across every template to maintain brand consistency.
export function footerStrap(opts: { url?: string; tone: "dark" | "light" } = { tone: "light" }): string {
  const fg = opts.tone === "dark" ? COLORS.mintLight : COLORS.mintPrimary;
  const url = opts.url ?? "patientpartner.com";
  return `
<div style="display:flex; align-items:center; gap:12px; font-family:${FONTS.body}; font-size:14px; font-weight:600; color:${fg}; letter-spacing:0.04em;">
  <span style="display:inline-flex; width:24px; height:24px; align-items:center; justify-content:center;">
    <svg width="20" height="20" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="60" width="480" height="480" rx="60" fill="${fg}"/>
      <text x="300" y="380" font-family="Poppins, sans-serif" font-weight="800" font-size="240" fill="${opts.tone === "dark" ? COLORS.navy : COLORS.white}" text-anchor="middle" letter-spacing="-8">PP</text>
    </svg>
  </span>
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
