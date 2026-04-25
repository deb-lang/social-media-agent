// StaticStat — single hero number card. Three tones:
//   dark  — navy bg, mint hero number
//   light — sky-breeze bg, navy hero number with mint accent on prefix/suffix
//   split — diagonal navy/teal seam, hero number straddles the seam
//
// Layout:
//   - Logo + eyebrow header row
//   - Giant value (e.g. "69%", "3.2×", "133.5") with optional prefix/suffix
//   - Headline beneath, body slate weight
//   - Source line bottom-left, footer strap bottom-right
// 1080×1080. No CTA bar.

import { COLORS, FONTS } from "./tokens";
import { esc, eyebrow, footerStrap, htmlDoc, logo } from "./shared";

export interface StaticStatProps {
  tone: "dark" | "light" | "split";
  eyebrow?: string;
  prefix?: string;
  value: string;
  suffix?: string;
  headline: string;
  source: string;
}

export function renderStaticStat(p: StaticStatProps): string {
  const palette = palettes[p.tone];
  const eyebrowText = p.eyebrow ?? "Adherence Report";

  const valueHtml = `
<div style="
  display: flex; align-items: baseline; justify-content: flex-start;
  font-family: ${FONTS.display};
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.92;
  color: ${palette.value};
">
  ${p.prefix ? `<span style="font-size:120px; color:${palette.affix}; font-weight:700; margin-right:14px;">${esc(p.prefix)}</span>` : ""}
  <span style="font-size:280px;">${esc(p.value)}</span>
  ${p.suffix ? `<span style="font-size:120px; color:${palette.affix}; font-weight:700; margin-left:14px;">${esc(p.suffix)}</span>` : ""}
</div>`.trim();

  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  ${palette.rootStyle}
  color: ${palette.fg};
  overflow: hidden;
">
  ${palette.bgDecor}

  <!-- Header: logo + eyebrow -->
  <div style="display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:2;">
    <div style="display:flex; align-items:center; gap:14px;">
      ${logo()}
    </div>
    ${eyebrow(eyebrowText, palette.eyebrow)}
  </div>

  <!-- Hero value -->
  <div style="position:relative; z-index:2; margin-top:120px;">
    ${valueHtml}
  </div>

  <!-- Headline -->
  <div style="
    position: relative;
    z-index: 2;
    margin-top: 36px;
    max-width: 920px;
    font-family: ${FONTS.display};
    font-weight: 600;
    font-size: 38px;
    line-height: 1.22;
    letter-spacing: -0.012em;
    color: ${palette.headline};
  ">${esc(p.headline)}</div>

  <!-- Source (bottom-left) -->
  <div style="position:absolute; left:80px; bottom:120px; z-index:2;
    font-family: ${FONTS.body};
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.04em;
    color: ${palette.source};
  ">${esc(p.source)}</div>

  <!-- Footer (bottom-right) -->
  <div style="position:absolute; right:80px; bottom:80px; z-index:2;">
    ${footerStrap({ tone: p.tone === "dark" ? "dark" : "light" })}
  </div>
</div>`;

  return htmlDoc(body, { bgColor: palette.docBg });
}

interface Palette {
  rootStyle: string;
  docBg: string;
  fg: string;
  brand: string;
  eyebrow: string;
  value: string;
  affix: string;
  headline: string;
  source: string;
  bgDecor: string;
}

const palettes: Record<StaticStatProps["tone"], Palette> = {
  dark: {
    docBg: COLORS.navyDeep,
    rootStyle: `background: linear-gradient(140deg, ${COLORS.navyDeep} 0%, ${COLORS.navy} 100%);`,
    fg: COLORS.white,
    brand: COLORS.white,
    eyebrow: COLORS.mint,
    value: COLORS.mint,
    affix: COLORS.mintLight,
    headline: COLORS.white,
    source: "rgba(154,221,224,0.85)",
    bgDecor: `
<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none;">
  <div style="position:absolute; right:-200px; top:120px; width:680px; height:680px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintPrimary}33 0%, transparent 70%);"></div>
  <div style="position:absolute; left:-160px; bottom:-160px; width:480px; height:480px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}22 0%, transparent 70%);"></div>
</div>`,
  },

  light: {
    docBg: COLORS.skyBreeze,
    rootStyle: `background: linear-gradient(160deg, ${COLORS.skyBreeze} 0%, ${COLORS.aquaTwilight} 60%, ${COLORS.deepLagoon} 100%);`,
    fg: COLORS.navy,
    brand: COLORS.navy,
    eyebrow: COLORS.mintPrimary,
    value: COLORS.navy,
    affix: COLORS.mintPrimary,
    headline: COLORS.navy2,
    source: COLORS.grey600,
    bgDecor: `
<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none;">
  <div style="position:absolute; right:-160px; top:-100px; width:540px; height:540px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}44 0%, transparent 70%);"></div>
  <div style="position:absolute; left:-100px; bottom:-100px; width:380px; height:380px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintLight}33 0%, transparent 70%);"></div>
</div>`,
  },

  // Split: horizontal seam — top half navy (number lives here, big and bright),
  // bottom half mint-tint (headline + source on contrasting clean light bg).
  // Avoids text crossing a diagonal where it could become unreadable.
  split: {
    docBg: COLORS.skyBreeze,
    rootStyle: `background: linear-gradient(180deg, ${COLORS.navyDeep} 0%, ${COLORS.navy} 50%, ${COLORS.mintTint} 50%, ${COLORS.mintTint} 100%);`,
    fg: COLORS.navy,
    brand: COLORS.white,
    eyebrow: COLORS.mint,
    value: COLORS.mint,
    affix: COLORS.mintLight,
    headline: COLORS.navy,
    source: COLORS.navy2,
    bgDecor: `
<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none;">
  <div style="position:absolute; right:-160px; top:-100px; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintPrimary}33 0%, transparent 70%);"></div>
  <div style="position:absolute; left:-100px; bottom:-100px; width:380px; height:380px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintLight}33 0%, transparent 70%);"></div>
</div>`,
  },
};
