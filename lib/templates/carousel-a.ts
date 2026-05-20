// Carousel A — "The Recovery Gap" — 5 slides, 1080×1350.
// Dark blue + mint, stat-led narrative.
// Ported from the Claude Design bundle's CarouselA1-5 components.

import { PP, MANROPE, dotGrid, lineGrid, ticks, concentric, eyebrowV2, footerBar } from "./atoms";
import { esc, htmlDoc } from "./shared";

const CA_TOTAL = 5;
const W = 1080;
const H = 1350;

const docOpts = (bg: string, title: string) => ({
  width: W,
  height: H,
  bgColor: bg,
  fontFamily: MANROPE,
  title,
});

// ─── Slide 1: Cover ─────────────────────────────────────────────────────────
export interface CAProps1 {
  eyebrow: string;       // e.g. "The Recovery Gap"
  issueLabel: string;    // "Issue №01"
  headline: string;      // big editorial headline
  subhead: string;       // smaller line below
  partsLabel?: string;   // "A 5-PART READ"
}

export function renderCarouselA1(p: CAProps1): string {
  const partsLabel = p.partsLabel ?? "A 5-PART READ";
  const body = `
    ${dotGrid({ color: "rgba(114,203,207,0.10)", gap: 40, dot: 1.6 })}
    <div style="position:absolute;top:-260px;right:-260px;width:820px;height:820px;border-radius:50%;background:radial-gradient(circle, rgba(114,203,207,0.30), rgba(114,203,207,0) 65%)"></div>
    ${ticks({ color: "rgba(114,203,207,0.5)", inset: 60, size: 22, weight: 1.5 })}

    <div style="position:absolute;top:120px;left:110px;right:110px;display:flex;justify-content:space-between;align-items:center">
      ${eyebrowV2({ text: p.eyebrow, color: PP.mint })}
      <span style="font-weight:600;font-size:13px;letter-spacing:0.22em;color:rgba(255,255,255,0.4)">${esc(partsLabel)}</span>
    </div>

    <div style="position:absolute;top:340px;left:110px;right:130px">
      <div style="font-weight:500;font-size:22px;letter-spacing:0.4px;color:${PP.mint};text-transform:uppercase;margin-bottom:32px">${esc(p.issueLabel)}</div>
      <div style="font-weight:800;font-size:124px;line-height:0.96;letter-spacing:-4px;color:${PP.white};text-wrap:balance">${esc(p.headline)}</div>
    </div>

    <div style="position:absolute;bottom:280px;left:110px;right:200px;font-weight:500;font-size:26px;line-height:1.5;color:rgba(255,255,255,0.78);text-wrap:pretty">${esc(p.subhead)}</div>

    ${footerBar({ dark: true, slide: 1, total: CA_TOTAL })}
  `;
  return htmlDoc(body, docOpts(PP.ink, "Carousel A · Cover"));
}

// ─── Slide 2: Problem ───────────────────────────────────────────────────────
export interface CAProps2 {
  eyebrow: string;       // "The Problem"
  headline: string;      // top headline
  bigA: string;          // "1"
  bigB: string;          // "3"
  bigConnector?: string; // "in"
  body: string;          // paragraph beneath the big numbers
  source: string;        // bottom source line
}

export function renderCarouselA2(p: CAProps2): string {
  const connector = p.bigConnector ?? "in";
  const body = `
    ${lineGrid({ color: "rgba(16,43,69,0.05)", gap: 72 })}
    <div style="position:absolute;top:0;left:0;width:240px;height:6px;background:${PP.mint}"></div>

    <div style="position:absolute;top:120px;left:110px;right:110px;display:flex;justify-content:space-between;align-items:center">
      ${eyebrowV2({ text: p.eyebrow, color: PP.teal, ruleColor: PP.teal })}
      <span style="font-weight:600;font-size:13px;letter-spacing:0.22em;color:${PP.muted}">02 / 05</span>
    </div>

    <div style="position:absolute;top:240px;left:110px;right:130px;font-weight:700;font-size:64px;line-height:1.1;letter-spacing:-1.4px;color:${PP.ink};text-wrap:balance">${esc(p.headline)}</div>

    <div style="position:absolute;top:600px;left:110px;right:110px">
      <div style="display:flex;align-items:baseline;gap:20px">
        <span style="font-weight:800;font-size:300px;line-height:0.85;letter-spacing:-12px;color:${PP.ink3};font-variant-numeric:tabular-nums">${esc(p.bigA)}</span>
        <span style="font-weight:700;font-size:140px;line-height:0.85;color:${PP.teal}">${esc(connector)}</span>
        <span style="font-weight:800;font-size:300px;line-height:0.85;letter-spacing:-12px;color:${PP.ink3};font-variant-numeric:tabular-nums">${esc(p.bigB)}</span>
      </div>
      <div style="margin-top:32px;font-weight:600;font-size:32px;line-height:1.25;letter-spacing:-0.5px;color:${PP.ink2};max-width:820px;text-wrap:balance">${esc(p.body)}</div>
    </div>

    <div style="position:absolute;bottom:160px;left:110px;right:130px;padding-top:24px;border-top:1px solid ${PP.stroke};font-weight:500;font-size:14px;color:${PP.muted};letter-spacing:0.3px">${esc(p.source)}</div>

    ${footerBar({ slide: 2, total: CA_TOTAL })}
  `;
  return htmlDoc(body, docOpts(PP.white, "Carousel A · Problem"));
}

// ─── Slide 3: Insight quote ─────────────────────────────────────────────────
export interface CAProps3 {
  eyebrow: string;     // "The Insight"
  quote: string;       // the pull-quote
  authorInitials: string; // "DR"
  authorName: string;  // "Dr. Reema Patel, MD"
  authorRole: string;  // "Director of Patient Experience · PatientPartner"
}

export function renderCarouselA3(p: CAProps3): string {
  const body = `
    ${dotGrid({ color: "rgba(255,255,255,0.16)", gap: 32, dot: 1.2 })}
    <div style="position:absolute;bottom:-200px;right:-200px;opacity:0.35">
      ${concentric({ size: 700, color: PP.white, opacity: 0.45, rings: 7 })}
    </div>

    <div style="position:absolute;top:120px;left:110px;right:110px;display:flex;justify-content:space-between;align-items:center">
      ${eyebrowV2({ text: p.eyebrow, color: PP.white, ruleColor: PP.white })}
      <span style="font-weight:600;font-size:13px;letter-spacing:0.22em;color:rgba(255,255,255,0.75)">03 / 05</span>
    </div>

    <div style="position:absolute;top:240px;left:110px;font-family:${MANROPE};font-size:260px;line-height:1;color:rgba(255,255,255,0.85)">&ldquo;</div>

    <div style="position:absolute;top:380px;left:110px;right:140px;font-weight:700;font-size:78px;line-height:1.05;letter-spacing:-1.8px;color:${PP.white};text-wrap:balance">${esc(p.quote)}</div>

    <div style="position:absolute;bottom:200px;left:110px;display:flex;align-items:center;gap:18px">
      <div style="width:54px;height:54px;border-radius:50%;background:rgba(16,43,69,0.25);border:1.5px solid rgba(255,255,255,0.45);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:${PP.white}">${esc(p.authorInitials)}</div>
      <div>
        <div style="font-weight:700;font-size:20px;letter-spacing:-0.2px">${esc(p.authorName)}</div>
        <div style="font-weight:500;font-size:15px;color:rgba(255,255,255,0.75);margin-top:2px">${esc(p.authorRole)}</div>
      </div>
    </div>

    ${footerBar({ dark: true, slide: 3, total: CA_TOTAL })}
  `;
  // Slide 3 uses a custom gradient background — pass white as bgColor for the
  // document, then layer the gradient over via an absolute div.
  const gradientBody = `<div style="position:absolute;inset:0;background:linear-gradient(155deg, ${PP.mint} 0%, ${PP.teal} 100%);color:${PP.white}">${body}</div>`;
  return htmlDoc(gradientBody, docOpts(PP.mint, "Carousel A · Insight"));
}

// ─── Slide 4: What Changes (4 metrics) ──────────────────────────────────────
export interface CAMetric {
  k: string;  // big number (e.g. "73%")
  l: string;  // label (e.g. "less pre-op anxiety")
}

export interface CAProps4 {
  eyebrow: string;        // "What Changes"
  headline: string;
  metrics: [CAMetric, CAMetric, CAMetric, CAMetric];
}

export function renderCarouselA4(p: CAProps4): string {
  const metricsHTML = p.metrics
    .map(
      (m, i) => `
      <div style="display:grid;grid-template-columns:260px 1fr;align-items:center;gap:32px;padding:28px 0;${i === 0 ? "" : "border-top:1px solid rgba(255,255,255,0.12)"}">
        <div style="display:flex;align-items:baseline;gap:14px">
          <span style="font-family:${MANROPE};font-size:13px;letter-spacing:0.18em;color:rgba(255,255,255,0.35)">0${i + 1}</span>
          <span style="font-weight:800;font-size:74px;line-height:1;letter-spacing:-2px;color:${PP.mint};font-variant-numeric:tabular-nums">${esc(m.k)}</span>
        </div>
        <div style="font-weight:600;font-size:30px;line-height:1.2;letter-spacing:-0.4px;color:${PP.white}">${esc(m.l)}</div>
      </div>`
    )
    .join("");

  const body = `
    ${lineGrid({ color: "rgba(114,203,207,0.08)", gap: 60 })}

    <div style="position:absolute;top:120px;left:110px;right:110px;display:flex;justify-content:space-between;align-items:center">
      ${eyebrowV2({ text: p.eyebrow, color: PP.mint })}
      <span style="font-weight:600;font-size:13px;letter-spacing:0.22em;color:rgba(255,255,255,0.4)">04 / 05</span>
    </div>

    <div style="position:absolute;top:240px;left:110px;right:130px;font-weight:700;font-size:56px;line-height:1.1;letter-spacing:-1px;color:${PP.white};text-wrap:balance">${esc(p.headline)}</div>

    <div style="position:absolute;top:530px;left:110px;right:110px;display:flex;flex-direction:column;gap:0">
      ${metricsHTML}
    </div>

    ${footerBar({ dark: true, slide: 4, total: CA_TOTAL })}
  `;
  return htmlDoc(body, docOpts(PP.ink3, "Carousel A · What Changes"));
}

// ─── Slide 5: CTA ───────────────────────────────────────────────────────────
export interface CAProps5 {
  eyebrow: string;       // "What's Next"
  headline: string;      // "Get matched..."
  body: string;          // supporting paragraph
  ctaLabel: string;      // "Find your match"
  brandUrl: string;      // "patientpartner.com"
  ctaSubLabel?: string;  // "Or DM us to get started today"
  handle?: string;       // "@ patientpartner" footer hint
}

export function renderCarouselA5(p: CAProps5): string {
  const ctaSubLabel = p.ctaSubLabel ?? "Or DM us to get started today";
  const handle = p.handle ?? "@ patientpartner";
  const body = `
    ${dotGrid({ color: "rgba(114,203,207,0.12)", gap: 40, dot: 1.6 })}
    <div style="position:absolute;bottom:-260px;left:-260px;width:820px;height:820px;border-radius:50%;background:radial-gradient(circle, rgba(114,203,207,0.28), rgba(114,203,207,0) 65%)"></div>
    ${ticks({ color: "rgba(114,203,207,0.6)", inset: 60, size: 22, weight: 1.5 })}

    <div style="position:absolute;top:120px;left:110px;right:110px;display:flex;justify-content:space-between;align-items:center">
      ${eyebrowV2({ text: p.eyebrow, color: PP.mint })}
      <span style="font-weight:600;font-size:13px;letter-spacing:0.22em;color:rgba(255,255,255,0.4)">05 / 05</span>
    </div>

    <div style="position:absolute;top:300px;left:110px;right:130px;font-weight:800;font-size:110px;line-height:0.96;letter-spacing:-3.5px;color:${PP.white};text-wrap:balance">${esc(p.headline)}</div>

    <div style="position:absolute;top:760px;left:110px;right:200px;font-weight:500;font-size:24px;line-height:1.5;color:rgba(255,255,255,0.78);text-wrap:pretty">${esc(p.body)}</div>

    <div style="position:absolute;bottom:230px;left:110px;right:110px;display:flex;align-items:center;justify-content:space-between;gap:24px">
      <div style="display:flex;align-items:center;gap:18px;padding:24px 36px;background:${PP.mint};border-radius:12px;color:${PP.ink}">
        <span style="font-weight:800;font-size:26px;letter-spacing:-0.4px">${esc(p.ctaLabel)}</span>
        <span style="font-weight:800;font-size:26px">→</span>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:18px;letter-spacing:0.18em;color:${PP.mint};text-transform:uppercase">${esc(p.brandUrl)}</div>
        <div style="margin-top:6px;font-weight:500;font-size:15px;color:rgba(255,255,255,0.55)">${esc(ctaSubLabel)}</div>
      </div>
    </div>

    ${footerBar({ dark: true, slide: 5, total: CA_TOTAL, hint: handle })}
  `;
  return htmlDoc(body, docOpts(PP.ink, "Carousel A · CTA"));
}
