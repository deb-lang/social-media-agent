// StaticQuote — testimonial / mission quote card.
// Three tones: dark (navy bg, mint accents), teal (mint bg, navy ink),
// light (sky-breeze bg, navy ink). 1080×1080.
//
// Layout (top → bottom):
//   - Logo mark + wordmark in top-left
//   - Eyebrow label aligned right of header
//   - Giant editorial open-quote glyph
//   - Quote body — bold, mixed-weight, tight tracking
//   - Author + role pinned to bottom-left
//   - Footer strap (mark + URL) bottom-right
// No CTA bar — caption holds the demo CTA.

import { COLORS, FONTS } from "./tokens";
import { esc, eyebrow, footerStrap, htmlDoc, logo } from "./shared";

export interface StaticQuoteProps {
  tone: "dark" | "teal" | "light";
  eyebrow?: string;
  quote: string;
  author: string;
  role: string;
}

export function renderStaticQuote(p: StaticQuoteProps): string {
  const palette = palettes[p.tone];
  const eyebrowText = p.eyebrow ?? "Mentor Voices";

  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  background: ${palette.bg};
  color: ${palette.fg};
">
  ${palette.bgDecor}

  <!-- Header row: logo + eyebrow -->
  <div style="display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:1;">
    <div style="display:flex; align-items:center; gap:14px;">
      ${logo()}
    </div>
    ${eyebrow(eyebrowText, palette.eyebrow)}
  </div>

  <!-- Editorial quote glyph (huge, decorative) -->
  <div aria-hidden="true" style="
    position: absolute;
    left: 70px;
    top: 170px;
    font-family: Georgia, 'Utopia Std', serif;
    font-weight: 700;
    font-size: 360px;
    line-height: 1;
    color: ${palette.glyph};
    opacity: 0.85;
    pointer-events: none;
    user-select: none;
  ">&ldquo;</div>

  <!-- Quote body + author block — flows naturally so short quotes don't
       leave huge whitespace bands. Author sits 56px under the quote. -->
  <div style="
    position: relative;
    margin-top: 320px;
    padding-right: 40px;
    z-index: 1;
  ">
    <div style="
      font-family: ${FONTS.display};
      font-weight: 700;
      font-size: 56px;
      line-height: 1.18;
      letter-spacing: -0.025em;
      color: ${palette.quote};
    ">${esc(p.quote)}</div>

    <div style="margin-top: 56px;">
      <div style="
        font-family: ${FONTS.display};
        font-weight: 700;
        font-size: 22px;
        letter-spacing: -0.005em;
        color: ${palette.author};
        margin-bottom: 4px;
      ">${esc(p.author)}</div>
      <div style="
        font-family: ${FONTS.body};
        font-weight: 500;
        font-size: 16px;
        color: ${palette.role};
        letter-spacing: 0.005em;
      ">${esc(p.role)}</div>
    </div>
  </div>

  <!-- Footer strap (bottom-right) -->
  <div style="position:absolute; right:80px; bottom:80px; z-index:1;">
    ${footerStrap({ tone: p.tone === "dark" ? "dark" : "light" })}
  </div>
</div>`;

  return htmlDoc(body, { bgColor: palette.bg });
}

interface Palette {
  bg: string;
  fg: string;
  brand: string;
  eyebrow: string;
  glyph: string;
  quote: string;
  author: string;
  role: string;
  bgDecor: string; // optional decorative HTML (gradient blobs etc.)
}

const palettes: Record<StaticQuoteProps["tone"], Palette> = {
  // Dark navy: navy background, white quote, mint accents.
  dark: {
    bg: COLORS.navyDeep,
    fg: COLORS.white,
    brand: COLORS.white,
    eyebrow: COLORS.mint,
    glyph: COLORS.mint,
    quote: COLORS.white,
    author: COLORS.mint,
    role: "rgba(255,255,255,0.7)",
    bgDecor: `
<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none; overflow:hidden;">
  <div style="position:absolute; right:-120px; top:-120px; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintPrimary}33 0%, transparent 70%);"></div>
  <div style="position:absolute; left:-80px; bottom:-100px; width:400px; height:400px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}22 0%, transparent 70%);"></div>
</div>`,
  },

  // Teal: mint-tint background, navy ink, deep teal accent.
  teal: {
    bg: COLORS.mintTint,
    fg: COLORS.navy,
    brand: COLORS.navy,
    eyebrow: COLORS.mintDeep,
    glyph: COLORS.mintDeep,
    quote: COLORS.navy,
    author: COLORS.mintPrimary,
    role: COLORS.navy2,
    bgDecor: `
<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none; overflow:hidden;">
  <div style="position:absolute; right:-180px; top:-100px; width:560px; height:560px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}55 0%, transparent 70%);"></div>
  <div style="position:absolute; right:80px; bottom:200px; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintLight}44 0%, transparent 70%);"></div>
</div>`,
  },

  // Light: sky-breeze background, navy ink. Most editorial / clinical feel.
  light: {
    bg: COLORS.skyBreeze,
    fg: COLORS.navy,
    brand: COLORS.navy,
    eyebrow: COLORS.mintPrimary,
    glyph: COLORS.deepLagoon,
    quote: COLORS.navy,
    author: COLORS.mintPrimary,
    role: COLORS.navy2,
    bgDecor: `
<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none; overflow:hidden;">
  <div style="position:absolute; right:-150px; top:-150px; width:480px; height:480px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintWash}77 0%, transparent 70%);"></div>
  <div style="position:absolute; left:-100px; bottom:-100px; width:360px; height:360px; border-radius:50%; background:radial-gradient(circle, ${COLORS.aquaTwilight}99 0%, transparent 70%);"></div>
</div>`,
  },
};
