// StaticInsight — research takeaway with 3 supporting tiles.
// Layout (light bg with subtle gradient):
//   - Header: logo + eyebrow
//   - Headline composed of: headline + emphasis (gradient text) + trail
//     e.g. "Most adherence drops happen [in the first 14 days] of treatment."
//   - 3 bullet tiles (value + label) in a horizontal row
//   - Source line + footer strap at bottom
// 1080×1080. No CTA bar.

import { COLORS, FONTS } from "./tokens";
import { esc, eyebrow, footerStrap, htmlDoc, logo } from "./shared";

export interface InsightBullet {
  value: string;
  label: string;
}

export interface StaticInsightProps {
  eyebrow?: string;
  headline: string;
  emphasis: string;
  trail: string;
  bullets: [InsightBullet, InsightBullet, InsightBullet];
  source: string;
}

export function renderStaticInsight(p: StaticInsightProps): string {
  const eyebrowText = p.eyebrow ?? "Research Takeaway";

  const tile = (b: InsightBullet, idx: number) => `
<div style="
  flex: 1;
  padding: 28px 28px 32px;
  background: ${COLORS.white};
  border: 1px solid ${COLORS.deepLagoon};
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(24,56,87,0.04), 0 8px 28px rgba(24,56,87,0.06);
  display: flex; flex-direction: column; gap: 10px;
  position: relative;
  overflow: hidden;
">
  <span style="position:absolute; left:0; top:0; bottom:0; width:4px; background: ${idx === 1 ? COLORS.mint : idx === 2 ? COLORS.mintDeep : COLORS.mintPrimary};"></span>
  <div style="
    font-family: ${FONTS.display};
    font-weight: 800;
    font-size: 60px;
    line-height: 1;
    letter-spacing: -0.035em;
    color: ${COLORS.navy};
  ">${esc(b.value)}</div>
  <div style="
    font-family: ${FONTS.body};
    font-weight: 500;
    font-size: 16px;
    line-height: 1.4;
    color: ${COLORS.navy2};
  ">${esc(b.label)}</div>
</div>`.trim();

  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  background: linear-gradient(160deg, ${COLORS.skyBreeze} 0%, ${COLORS.aquaTwilight} 100%);
  color: ${COLORS.navy};
  overflow: hidden;
">
  <!-- Subtle decorative blobs -->
  <div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none;">
    <div style="position:absolute; right:-160px; top:-100px; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}33 0%, transparent 70%);"></div>
    <div style="position:absolute; left:-100px; bottom:-160px; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintLight}33 0%, transparent 70%);"></div>
  </div>

  <!-- Header: logo + eyebrow -->
  <div style="display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:2;">
    <div style="display:flex; align-items:center; gap:14px;">
      ${logo()}
    </div>
    ${eyebrow(eyebrowText, COLORS.mintPrimary)}
  </div>

  <!-- Composite headline: plain · emphasis (gradient) · trail -->
  <div style="
    position: relative; z-index: 2;
    margin-top: 70px;
    padding-right: 60px;
    font-family: ${FONTS.display};
    font-weight: 800;
    font-size: 64px;
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: ${COLORS.navy};
    max-width: 920px;
  ">
    ${esc(p.headline)}<span style="white-space: pre;"> </span><span class="grad-text">${esc(p.emphasis)}</span><span style="white-space: pre;"> </span>${esc(p.trail)}
  </div>

  <!-- 3 supporting tiles -->
  <div style="
    position: relative; z-index: 2;
    margin-top: 64px;
    display: flex; gap: 20px;
  ">
    ${tile(p.bullets[0], 0)}
    ${tile(p.bullets[1], 1)}
    ${tile(p.bullets[2], 2)}
  </div>

  <!-- Source line (bottom-left) -->
  <div style="
    position: absolute;
    left: 80px; bottom: 120px;
    z-index: 2;
    font-family: ${FONTS.body};
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.04em;
    color: ${COLORS.grey600};
  ">${esc(p.source)}</div>

  <!-- Footer strap (bottom-right) -->
  <div style="position:absolute; right:80px; bottom:80px; z-index:2;">
    ${footerStrap({ tone: "light" })}
  </div>
</div>`;

  return htmlDoc(body, { bgColor: COLORS.skyBreeze });
}
