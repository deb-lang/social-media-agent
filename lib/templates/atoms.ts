// Shared atoms for the v2 Claude Design templates (StaticEditorial,
// StaticTicker, StaticDiptych, CarouselA, CarouselD). Ports the React
// helpers from the bundle's shared module to HTML-string functions.
//
// All helpers return inline HTML fragments. The template files assemble
// these into a complete 1080×1080 or 1080×1350 page (wrapped via shared.ts
// `htmlDoc()` in the renderer call site).
//
// The PP namespace mirrors the bundle's design tokens. It overlaps with
// lib/templates/tokens.ts::COLORS but keeps the bundle's exact naming so
// porting from JSX → HTML string is mechanical / errors are easier to spot.

import { LOGO_DATA_URI, LOGO_AR } from "./logo-data";
import { esc } from "./shared";

// ─── Design tokens (verbatim from the bundle's shared atoms file) ──────────
export const PP = {
  ink: "#102B45",
  ink2: "#183857",
  ink3: "#0A1E32",
  mint: "#72CBCF",
  mintDeep: "#419DA5",
  teal: "#009793",
  mint100: "#D8EDEE",
  mint50: "#E3FFFF",
  white: "#FFFFFF",
  paper: "#F3F8F8",
  stroke: "#DCEBEA",
  muted: "#7B7C8F",
  inkSoft: "rgba(255,255,255,0.55)",
} as const;

// Manrope is the font family for all v2 templates.
export const MANROPE = "'Manrope', 'HK Grotesk', ui-sans-serif, system-ui, sans-serif";

// Google Fonts URL for Manrope — load alongside Poppins from tokens.ts.
export const GOOGLE_FONTS_MANROPE_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";

// ─── Wordmark ──────────────────────────────────────────────────────────────
/**
 * PatientPartner wordmark as an inline <img> using the base64 data URI.
 * `size` is rendered height (px); width auto-scales from the logo aspect ratio.
 */
export function ppWordmark(opts: { size?: number } = {}): string {
  const size = opts.size ?? 30;
  const w = Math.round(size * LOGO_AR);
  return `<img src="${LOGO_DATA_URI}" alt="PatientPartner" style="height:${size}px;width:${w}px;display:block;object-fit:contain"/>`;
}

// ─── Eyebrow ───────────────────────────────────────────────────────────────
/**
 * Uppercase tracked label with a leading rule. Both PP and existing tokens
 * use this pattern; this version supports independent color + rule color.
 */
export function eyebrowV2(opts: {
  text: string;
  color?: string;
  ruleColor?: string;
}): string {
  const color = opts.color ?? PP.mint;
  const ruleColor = opts.ruleColor ?? color;
  return `<div style="display:flex;align-items:center;gap:14px;color:${color}">
    <span style="width:36px;height:2px;background:${ruleColor};display:block"></span>
    <span style="font-family:${MANROPE};font-weight:700;font-size:14px;letter-spacing:0.22em;text-transform:uppercase">${esc(opts.text)}</span>
  </div>`;
}

// ─── Decorative backgrounds ────────────────────────────────────────────────
/**
 * Subtle SVG dot grid. Returns an absolutely-positioned overlay div.
 */
export function dotGrid(opts: { color?: string; gap?: number; dot?: number } = {}): string {
  const color = opts.color ?? "rgba(255,255,255,0.06)";
  const gap = opts.gap ?? 36;
  const dot = opts.dot ?? 1.4;
  const svg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><circle cx='${gap / 2}' cy='${gap / 2}' r='${dot}' fill='${encodeURIComponent(color)}'/></svg>`;
  return `<div style="position:absolute;inset:0;background-image:url(&quot;${svg}&quot;);background-size:${gap}px ${gap}px;pointer-events:none"></div>`;
}

/**
 * Subtle SVG line grid. Same use as dotGrid but with thin grid lines.
 */
export function lineGrid(opts: { color?: string; gap?: number } = {}): string {
  const color = opts.color ?? "rgba(255,255,255,0.05)";
  const gap = opts.gap ?? 60;
  const svg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><path d='M${gap} 0H0v${gap}' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='1'/></svg>`;
  return `<div style="position:absolute;inset:0;background-image:url(&quot;${svg}&quot;);background-size:${gap}px ${gap}px;pointer-events:none"></div>`;
}

// ─── Corner registration ticks ─────────────────────────────────────────────
type Corner = "tl" | "tr" | "bl" | "br";
export function ticks(opts: {
  color?: string;
  inset?: number;
  size?: number;
  weight?: number;
  corners?: Corner[] | "all";
} = {}): string {
  const color = opts.color ?? PP.mint;
  const inset = opts.inset ?? 36;
  const size = opts.size ?? 20;
  const weight = opts.weight ?? 2;
  const cs: Corner[] = opts.corners === "all" || !opts.corners ? ["tl", "tr", "bl", "br"] : opts.corners;
  const styleFor: Record<Corner, string> = {
    tl: `top:${inset}px;left:${inset}px;border-top:${weight}px solid ${color};border-left:${weight}px solid ${color}`,
    tr: `top:${inset}px;right:${inset}px;border-top:${weight}px solid ${color};border-right:${weight}px solid ${color}`,
    bl: `bottom:${inset}px;left:${inset}px;border-bottom:${weight}px solid ${color};border-left:${weight}px solid ${color}`,
    br: `bottom:${inset}px;right:${inset}px;border-bottom:${weight}px solid ${color};border-right:${weight}px solid ${color}`,
  };
  return cs.map((c) => `<div style="position:absolute;width:${size}px;height:${size}px;${styleFor[c]}"></div>`).join("");
}

// ─── Concentric rings (radar-style decoration) ─────────────────────────────
export function concentric(opts: {
  size?: number;
  color?: string;
  opacity?: number;
  rings?: number;
} = {}): string {
  const size = opts.size ?? 360;
  const color = opts.color ?? PP.mint;
  const opacity = opts.opacity ?? 0.18;
  const rings = opts.rings ?? 4;
  const circles = Array.from({ length: rings }, (_, i) => {
    const r = (size / 2) * (1 - i * 0.22);
    return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="1.5" opacity="${opacity}"/>`;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" style="display:block">${circles}</svg>`;
}

// ─── Footer bar for carousel slides ────────────────────────────────────────
export function footerBar(opts: {
  dark?: boolean;
  slide?: number;
  total?: number;
  hint?: string | null;
} = {}): string {
  const dark = opts.dark ?? false;
  const fg = dark ? PP.white : PP.ink;
  const fgSoft = dark ? "rgba(255,255,255,0.55)" : "rgba(16,43,69,0.55)";
  const hint = opts.hint === null ? null : opts.hint ?? "Swipe →";
  const pagination =
    opts.slide != null && opts.total != null
      ? `<span style="font-variant-numeric:tabular-nums;font-weight:600;font-size:13px;letter-spacing:0.18em;color:${fgSoft}">${String(opts.slide).padStart(2, "0")} / ${String(opts.total).padStart(2, "0")}</span>`
      : "";
  const hintEl = hint
    ? `<span style="font-weight:700;font-size:13px;letter-spacing:0.22em;color:${fg};text-transform:uppercase">${esc(hint)}</span>`
    : "";
  return `<div style="position:absolute;left:60px;right:60px;bottom:48px;display:flex;align-items:center;justify-content:space-between">
    ${ppWordmark({ size: 30 })}
    <div style="display:flex;align-items:center;gap:18px;font-family:${MANROPE}">
      ${pagination}
      ${hintEl}
    </div>
  </div>`;
}
