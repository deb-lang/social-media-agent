// Carousel — 5 distinct slide types composed into a LinkedIn document carousel.
// Each slide is 1080×1080. The Cover → Problem → Stat → Mechanism → CTA flow
// matches the Claude Design canvas. Pagination footer (idx/total) ships on
// every slide except the cover.

import { COLORS, FONTS } from "./tokens";
import { esc, eyebrow, footerStrap, htmlDoc, logo } from "./shared";

// ── Pagination strip (small "n / total") used on slides 2–5 ──
function pagination(idx: number, total: number, tone: "dark" | "light"): string {
  const fg = tone === "dark" ? "rgba(255,255,255,0.7)" : COLORS.grey600;
  return `
<div style="
  position: absolute;
  left: 80px; bottom: 80px;
  font-family: ${FONTS.mono};
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.08em;
  color: ${fg};
">${idx} / ${total}</div>`.trim();
}

// ─────────────────────────────────────────────────────────────────────
// SLIDE 1 · Cover — big title on dark navy
// ─────────────────────────────────────────────────────────────────────

export interface Slide1Props {
  eyebrow: string;     // e.g. "The Surgery Support Gap"
  title: string;        // big editorial title
  subtitle: string;     // supporting line
  total?: number;       // for pagination dot strip
}

export function renderSlide1(p: Slide1Props): string {
  const total = p.total ?? 5;
  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  background: linear-gradient(140deg, ${COLORS.navyDeep} 0%, ${COLORS.navy} 100%);
  color: ${COLORS.white};
  overflow: hidden;
">
  <!-- Decor -->
  <div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none;">
    <div style="position:absolute; right:-220px; top:-120px; width:680px; height:680px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintPrimary}55 0%, transparent 70%);"></div>
    <div style="position:absolute; left:-160px; bottom:-200px; width:560px; height:560px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}33 0%, transparent 70%);"></div>
  </div>

  <!-- Header: logo -->
  <div style="display:flex; align-items:center; gap:14px; position:relative; z-index:2;">
    ${logo()}
  </div>

  <!-- Eyebrow + title block, centered vertically -->
  <div style="
    position: absolute;
    left: 80px; right: 80px; top: 280px;
    z-index: 2;
  ">
    <div style="
      font-family: ${FONTS.body};
      font-weight: 600;
      font-size: 18px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: ${COLORS.mint};
      margin-bottom: 32px;
    ">${esc(p.eyebrow)}</div>

    <div style="
      font-family: ${FONTS.display};
      font-weight: 800;
      font-size: 92px;
      line-height: 1.02;
      letter-spacing: -0.04em;
      color: ${COLORS.white};
      margin-bottom: 36px;
    ">${esc(p.title)}</div>

    <div style="
      font-family: ${FONTS.body};
      font-weight: 500;
      font-size: 24px;
      line-height: 1.4;
      color: ${COLORS.mintLight};
      max-width: 820px;
    ">${esc(p.subtitle)}</div>
  </div>

  <!-- Footer strap (bottom-right) + pagination hint (Swipe →) bottom-left -->
  <div style="
    position: absolute;
    left: 80px; bottom: 80px;
    z-index: 2;
    font-family: ${FONTS.body};
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.6);
  ">Swipe → ${total - 1} more</div>

  <div style="position:absolute; right:80px; bottom:80px; z-index:2;">
    ${footerStrap({ tone: "dark" })}
  </div>
</div>`;
  return htmlDoc(body, { bgColor: COLORS.navyDeep });
}

// ─────────────────────────────────────────────────────────────────────
// SLIDE 2 · Problem — two-column, question + body on left, stat callout on right
// ─────────────────────────────────────────────────────────────────────

export interface Slide2Props {
  eyebrow?: string;
  question: string;
  body: string;
  stat: string;
  statLabel: string;
  index?: number;
  total?: number;
}

export function renderSlide2(p: Slide2Props): string {
  const idx = p.index ?? 2;
  const total = p.total ?? 5;
  const eyebrowText = p.eyebrow ?? "The Problem";

  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  background: ${COLORS.skyBreeze};
  color: ${COLORS.navy};
  overflow: hidden;
">
  <!-- Decor -->
  <div aria-hidden="true" style="position:absolute; right:-180px; top:-100px; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}33 0%, transparent 70%); pointer-events:none;"></div>

  <!-- Header -->
  <div style="display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:2;">
    <div style="display:flex; align-items:center; gap:14px;">
      ${logo()}
    </div>
    ${eyebrow(eyebrowText, COLORS.mintPrimary)}
  </div>

  <!-- Two-column layout -->
  <div style="
    position: relative; z-index: 2;
    margin-top: 96px;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 48px;
    align-items: start;
  ">
    <div>
      <div style="
        font-family: ${FONTS.display};
        font-weight: 800;
        font-size: 56px;
        line-height: 1.08;
        letter-spacing: -0.028em;
        color: ${COLORS.navy};
        margin-bottom: 28px;
      ">${esc(p.question)}</div>

      <div style="
        font-family: ${FONTS.body};
        font-weight: 500;
        font-size: 22px;
        line-height: 1.45;
        color: ${COLORS.navy2};
      ">${esc(p.body)}</div>
    </div>

    <!-- Stat callout card -->
    <div style="
      padding: 48px 40px;
      background: ${COLORS.navy};
      border-radius: 24px;
      box-shadow: 0 12px 36px rgba(24,56,87,0.18);
      color: ${COLORS.white};
      position: relative;
      overflow: hidden;
    ">
      <div aria-hidden="true" style="position:absolute; right:-80px; bottom:-80px; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintPrimary}55 0%, transparent 70%);"></div>

      <div style="
        font-family: ${FONTS.display};
        font-weight: 800;
        font-size: 144px;
        line-height: 0.95;
        letter-spacing: -0.045em;
        color: ${COLORS.mint};
        margin-bottom: 16px;
      ">${esc(p.stat)}</div>

      <div style="
        font-family: ${FONTS.body};
        font-weight: 600;
        font-size: 18px;
        line-height: 1.4;
        color: ${COLORS.mintLight};
      ">${esc(p.statLabel)}</div>
    </div>
  </div>

  ${pagination(idx, total, "light")}
  <div style="position:absolute; right:80px; bottom:80px; z-index:2;">
    ${footerStrap({ tone: "light" })}
  </div>
</div>`;
  return htmlDoc(body, { bgColor: COLORS.skyBreeze });
}

// ─────────────────────────────────────────────────────────────────────
// SLIDE 3 · Hero Stat with comparative bar chart
// ─────────────────────────────────────────────────────────────────────

export interface BarRow {
  label: string;
  a: number;     // 0–100
  b: number;     // 0–100, typically larger (PatientPartner result)
}

export interface Slide3Props {
  eyebrow?: string;
  stat: string;
  headline: string;
  context: string;
  bars: BarRow[];
  index?: number;
  total?: number;
}

export function renderSlide3(p: Slide3Props): string {
  const idx = p.index ?? 3;
  const total = p.total ?? 5;
  const eyebrowText = p.eyebrow ?? "The Data";

  const barRow = (r: BarRow) => `
<div style="margin-bottom: 18px;">
  <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
    <div style="font-family:${FONTS.body}; font-weight:600; font-size:16px; color:${COLORS.navy};">${esc(r.label)}</div>
    <div style="font-family:${FONTS.mono}; font-weight:600; font-size:13px; color:${COLORS.grey600}; letter-spacing:0.04em;">
      <span style="color:${COLORS.grey500};">${r.a}%</span>
      <span style="margin:0 6px; color:${COLORS.grey300};">→</span>
      <span style="color:${COLORS.mintPrimary};">${r.b}%</span>
    </div>
  </div>
  <div style="position:relative; height:18px; background:${COLORS.aquaTwilight}; border-radius:999px; overflow:hidden;">
    <div style="position:absolute; left:0; top:0; height:100%; width:${r.a}%; background:${COLORS.grey300}; border-radius:999px;"></div>
    <div style="position:absolute; left:0; top:0; height:100%; width:${r.b}%; background:linear-gradient(90deg, ${COLORS.mintDeep} 0%, ${COLORS.mintPrimary} 100%); border-radius:999px;"></div>
  </div>
</div>`.trim();

  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  background: ${COLORS.skyBreeze};
  color: ${COLORS.navy};
  overflow: hidden;
">
  <!-- Header -->
  <div style="display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:2;">
    <div style="display:flex; align-items:center; gap:14px;">
      ${logo()}
    </div>
    ${eyebrow(eyebrowText, COLORS.mintPrimary)}
  </div>

  <!-- Hero stat block -->
  <div style="position:relative; z-index:2; margin-top:60px; display:flex; align-items:flex-end; gap:36px;">
    <div style="
      font-family: ${FONTS.display};
      font-weight: 800;
      font-size: 200px;
      line-height: 0.92;
      letter-spacing: -0.045em;
      color: ${COLORS.navy};
    ">${esc(p.stat)}</div>
    <div style="padding-bottom:18px; max-width:520px;">
      <div style="
        font-family: ${FONTS.display};
        font-weight: 700;
        font-size: 32px;
        line-height: 1.18;
        letter-spacing: -0.018em;
        color: ${COLORS.navy};
        margin-bottom: 8px;
      ">${esc(p.headline)}</div>
      <div style="
        font-family: ${FONTS.body};
        font-weight: 500;
        font-size: 16px;
        line-height: 1.45;
        color: ${COLORS.navy2};
      ">${esc(p.context)}</div>
    </div>
  </div>

  <!-- Bar chart -->
  <div style="
    position: relative; z-index: 2;
    margin-top: 60px;
    padding: 32px 36px;
    background: ${COLORS.white};
    border: 1px solid ${COLORS.deepLagoon};
    border-radius: 20px;
    box-shadow: 0 8px 28px rgba(24,56,87,0.05);
  ">
    <div style="
      font-family: ${FONTS.body};
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: ${COLORS.mintPrimary};
      margin-bottom: 18px;
    ">Industry baseline → with PatientPartner</div>
    ${p.bars.slice(0, 4).map(barRow).join("\n")}
  </div>

  ${pagination(idx, total, "light")}
  <div style="position:absolute; right:80px; bottom:80px; z-index:2;">
    ${footerStrap({ tone: "light" })}
  </div>
</div>`;
  return htmlDoc(body, { bgColor: COLORS.skyBreeze });
}

// ─────────────────────────────────────────────────────────────────────
// SLIDE 4 · Mechanism — 3 step cards, center auto-darkens
// ─────────────────────────────────────────────────────────────────────

export interface MechanismStep {
  n: string;  // step number, e.g. "01"
  h: string;  // headline
  b: string;  // body
}

export interface Slide4Props {
  eyebrow?: string;
  title: string;
  steps: [MechanismStep, MechanismStep, MechanismStep];
  index?: number;
  total?: number;
}

export function renderSlide4(p: Slide4Props): string {
  const idx = p.index ?? 4;
  const total = p.total ?? 5;
  const eyebrowText = p.eyebrow ?? "How It Works";

  const card = (s: MechanismStep, i: number) => {
    const isCenter = i === 1;
    const bg = isCenter ? COLORS.navy : COLORS.white;
    const border = isCenter ? COLORS.navy : COLORS.deepLagoon;
    const numColor = isCenter ? COLORS.mint : COLORS.mintPrimary;
    const headColor = isCenter ? COLORS.white : COLORS.navy;
    const bodyColor = isCenter ? COLORS.mintLight : COLORS.navy2;

    return `
<div style="
  flex: 1;
  padding: 32px 28px 36px;
  background: ${bg};
  border: 1.5px solid ${border};
  border-radius: 24px;
  box-shadow: ${isCenter ? "0 18px 40px rgba(24,56,87,0.20)" : "0 6px 20px rgba(24,56,87,0.06)"};
  display: flex; flex-direction: column; gap: 18px;
  ${isCenter ? "transform: translateY(-12px);" : ""}
">
  <div style="
    font-family: ${FONTS.mono};
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.12em;
    color: ${numColor};
  ">STEP ${esc(s.n)}</div>
  <div style="
    font-family: ${FONTS.display};
    font-weight: 700;
    font-size: 26px;
    line-height: 1.15;
    letter-spacing: -0.012em;
    color: ${headColor};
  ">${esc(s.h)}</div>
  <div style="
    font-family: ${FONTS.body};
    font-weight: 500;
    font-size: 16px;
    line-height: 1.45;
    color: ${bodyColor};
  ">${esc(s.b)}</div>
</div>`.trim();
  };

  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  background: ${COLORS.skyBreeze};
  color: ${COLORS.navy};
  overflow: hidden;
">
  <div aria-hidden="true" style="position:absolute; left:-160px; bottom:-160px; width:480px; height:480px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}33 0%, transparent 70%); pointer-events:none;"></div>

  <!-- Header -->
  <div style="display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:2;">
    <div style="display:flex; align-items:center; gap:14px;">
      ${logo()}
    </div>
    ${eyebrow(eyebrowText, COLORS.mintPrimary)}
  </div>

  <!-- Title -->
  <div style="
    position: relative; z-index: 2;
    margin-top: 60px;
    font-family: ${FONTS.display};
    font-weight: 800;
    font-size: 56px;
    line-height: 1.08;
    letter-spacing: -0.028em;
    color: ${COLORS.navy};
    max-width: 920px;
  ">${esc(p.title)}</div>

  <!-- 3 step cards -->
  <div style="
    position: relative; z-index: 2;
    margin-top: 80px;
    display: flex; gap: 20px;
    align-items: stretch;
  ">
    ${card(p.steps[0], 0)}
    ${card(p.steps[1], 1)}
    ${card(p.steps[2], 2)}
  </div>

  ${pagination(idx, total, "light")}
  <div style="position:absolute; right:80px; bottom:80px; z-index:2;">
    ${footerStrap({ tone: "light" })}
  </div>
</div>`;
  return htmlDoc(body, { bgColor: COLORS.skyBreeze });
}

// ─────────────────────────────────────────────────────────────────────
// SLIDE 5 · CTA Close
// Title contains the word "mentorship" (or any single word) which is gradient-highlighted.
// Convention: render the entire title and the prop `gradientWord` decides which word
// gets the gradient. If gradientWord isn't found, the whole emphasis trail goes plain.
// ─────────────────────────────────────────────────────────────────────

export interface Slide5Props {
  eyebrow?: string;
  title: string;          // e.g. "Stop measuring around the missing middle. Add mentorship."
  gradientWord?: string;  // word in `title` to gradient-highlight; defaults to "mentorship"
  body: string;
  cta: string;            // e.g. "Schedule a free demo"
  url: string;            // e.g. "patientpartner.com/demo"
  index?: number;
  total?: number;
}

export function renderSlide5(p: Slide5Props): string {
  const idx = p.index ?? 5;
  const total = p.total ?? 5;
  const eyebrowText = p.eyebrow ?? "Take The Next Step";
  const word = p.gradientWord ?? "mentorship";

  // Wrap the gradient word in span. Case-insensitive single replacement.
  const re = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
  const titleHtml = esc(p.title).replace(re, '<span class="grad-text">$1</span>');

  const body = `
<div style="
  width: 1080px; height: 1080px;
  padding: 80px;
  position: relative;
  background: linear-gradient(160deg, ${COLORS.navyDeep} 0%, ${COLORS.navy} 100%);
  color: ${COLORS.white};
  overflow: hidden;
">
  <!-- Decor -->
  <div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none;">
    <div style="position:absolute; right:-200px; top:-200px; width:680px; height:680px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mintPrimary}66 0%, transparent 70%);"></div>
    <div style="position:absolute; left:-180px; bottom:-180px; width:540px; height:540px; border-radius:50%; background:radial-gradient(circle, ${COLORS.mint}33 0%, transparent 70%);"></div>
  </div>

  <!-- Header -->
  <div style="display:flex; align-items:center; gap:14px; position:relative; z-index:2;">
    ${logo()}
  </div>

  <!-- Eyebrow + Title -->
  <div style="
    position: absolute;
    left: 80px; right: 80px; top: 240px;
    z-index: 2;
  ">
    <div style="
      font-family: ${FONTS.body};
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${COLORS.mint};
      margin-bottom: 28px;
    ">${esc(eyebrowText)}</div>

    <div style="
      font-family: ${FONTS.display};
      font-weight: 800;
      font-size: 80px;
      line-height: 1.05;
      letter-spacing: -0.035em;
      color: ${COLORS.white};
      margin-bottom: 32px;
    ">${titleHtml}</div>

    <div style="
      font-family: ${FONTS.body};
      font-weight: 500;
      font-size: 22px;
      line-height: 1.45;
      color: ${COLORS.mintLight};
      max-width: 820px;
      margin-bottom: 56px;
    ">${esc(p.body)}</div>

    <!-- CTA pill -->
    <div style="display:inline-flex; align-items:center; gap:14px;
      padding: 22px 36px;
      background: ${COLORS.mint};
      border-radius: 999px;
      box-shadow: 0 14px 30px rgba(114,203,207,0.32);
    ">
      <span style="
        font-family: ${FONTS.display};
        font-weight: 700;
        font-size: 22px;
        letter-spacing: -0.005em;
        color: ${COLORS.navyDeep};
      ">${esc(p.cta)}</span>
      <span style="
        font-family: ${FONTS.mono};
        font-weight: 600;
        font-size: 15px;
        letter-spacing: 0.04em;
        color: ${COLORS.navy};
        opacity: 0.85;
      ">→</span>
    </div>

    <div style="margin-top:24px; font-family:${FONTS.mono}; font-weight:600; font-size:14px; letter-spacing:0.06em; color:${COLORS.mintLight};">
      ${esc(p.url)}
    </div>
  </div>

  ${pagination(idx, total, "dark")}
  <div style="position:absolute; right:80px; bottom:80px; z-index:2;">
    ${footerStrap({ tone: "dark" })}
  </div>
</div>`;
  return htmlDoc(body, { bgColor: COLORS.navyDeep });
}
