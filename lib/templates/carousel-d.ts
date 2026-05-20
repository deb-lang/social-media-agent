// Carousel D — "Year in Numbers" — 5 slides, 1080×1350.
// Annual-report tone. Each slide: section header + one hero metric +
// 3-4 supporting metrics.
// Ported from the Claude Design bundle's CarouselD1-5 components.

import { PP, MANROPE, dotGrid, lineGrid, ticks, eyebrowV2, footerBar } from "./atoms";
import { esc, htmlDoc } from "./shared";

const CD_TOTAL = 5;
const W = 1080;
const H = 1350;

const docOpts = (bg: string, title: string) => ({
  width: W,
  height: H,
  bgColor: bg,
  fontFamily: MANROPE,
  title,
});

// Shared section header — eyebrow + year + slide counter.
function rdHeader(opts: { section: string; idx: number; dark: boolean; year: string }): string {
  const inkColor = opts.dark ? PP.white : PP.ink;
  const dim = opts.dark ? "rgba(255,255,255,0.45)" : PP.muted;
  const mintColor = opts.dark ? PP.mint : PP.teal;
  void inkColor; // currently unused but matches bundle's variable; left for parity
  return `
    <div style="position:absolute;top:110px;left:110px;right:110px;display:flex;justify-content:space-between;align-items:center">
      ${eyebrowV2({ text: opts.section, color: mintColor, ruleColor: mintColor })}
      <div style="display:flex;align-items:center;gap:14px">
        <span style="font-family:${MANROPE};font-weight:600;font-size:12px;letter-spacing:0.18em;color:${dim}">YEAR · ${esc(opts.year)}</span>
        <span style="font-weight:600;font-size:13px;letter-spacing:0.22em;color:${dim}">${String(opts.idx).padStart(2, "0")} / 0${CD_TOTAL}</span>
      </div>
    </div>`;
}

// ─── Slide 1: Cover ─────────────────────────────────────────────────────────
export interface CDProps1 {
  year: string;          // "2024"
  section?: string;      // "Year in Numbers"
  kicker?: string;       // "The PatientPartner Network"
  headline: string;      // "A year of showing up — by the numbers."
  subhead: string;       // smaller line below
}

export function renderCarouselD1(p: CDProps1): string {
  const section = p.section ?? "Year in Numbers";
  const kicker = p.kicker ?? "The PatientPartner Network";
  const body = `
    ${dotGrid({ color: "rgba(114,203,207,0.10)", gap: 40, dot: 1.5 })}
    <div style="position:absolute;top:-260px;right:-260px;width:820px;height:820px;border-radius:50%;background:radial-gradient(circle, rgba(114,203,207,0.28), rgba(114,203,207,0) 65%)"></div>
    ${ticks({ color: "rgba(114,203,207,0.55)", inset: 60, size: 22, weight: 1.5 })}

    ${rdHeader({ section, idx: 1, dark: true, year: p.year })}

    <!-- Big "YEAR" backdrop -->
    <div style="position:absolute;top:200px;left:60px;font-weight:800;font-size:480px;line-height:0.85;letter-spacing:-22px;color:rgba(114,203,207,0.10);font-variant-numeric:tabular-nums;white-space:nowrap">${esc(p.year)}</div>

    <div style="position:absolute;top:560px;left:110px;right:130px">
      <div style="font-weight:600;font-size:22px;letter-spacing:0.22em;text-transform:uppercase;color:${PP.mint};margin-bottom:24px">${esc(kicker)}</div>
      <div style="font-weight:800;font-size:120px;line-height:0.98;letter-spacing:-4px;color:${PP.white};text-wrap:balance">${esc(p.headline)}</div>
    </div>

    <div style="position:absolute;bottom:230px;left:110px;right:200px;font-weight:500;font-size:24px;line-height:1.5;color:rgba(255,255,255,0.78)">${esc(p.subhead)}</div>

    ${footerBar({ dark: true, slide: 1, total: CD_TOTAL })}
  `;
  return htmlDoc(body, docOpts(PP.ink3, "Carousel D · Cover"));
}

// ─── Slide 2: Reach (hero + 3 supporting metrics) ───────────────────────────
export interface CDSupporting {
  k: string;     // big number
  l: string;     // label
  hint: string;  // small hint line beneath
}

export interface CDProps2 {
  year: string;
  headline: string;        // "Patients we walked beside this year, end-to-end."
  heroValue: string;       // "128k"
  heroLabel: string;       // "conversations between matched patients · +38% YoY"
  metrics: [CDSupporting, CDSupporting, CDSupporting];
}

export function renderCarouselD2(p: CDProps2): string {
  const metricsHTML = p.metrics
    .map(
      (m, i) => `
      <div>
        <div style="font-family:${MANROPE};font-size:11px;letter-spacing:0.2em;color:${PP.muted};margin-bottom:10px">0${i + 2}</div>
        <div style="font-weight:800;font-size:48px;line-height:1;letter-spacing:-1.4px;color:${PP.teal};font-variant-numeric:tabular-nums">${esc(m.k)}</div>
        <div style="margin-top:6px;font-weight:600;font-size:16px;color:${PP.ink};letter-spacing:-0.2px">${esc(m.l)}</div>
        <div style="margin-top:4px;font-weight:500;font-size:13px;color:${PP.muted}">${esc(m.hint)}</div>
      </div>`
    )
    .join("");

  const body = `
    ${lineGrid({ color: "rgba(16,43,69,0.05)", gap: 72 })}
    <div style="position:absolute;top:0;left:0;width:6px;height:300px;background:${PP.mint}"></div>

    ${rdHeader({ section: "Reach", idx: 2, dark: false, year: p.year })}

    <div style="position:absolute;top:230px;left:110px;right:130px;font-weight:700;font-size:46px;line-height:1.15;letter-spacing:-0.8px;color:${PP.ink2};text-wrap:balance">${esc(p.headline)}</div>

    <div style="position:absolute;top:430px;left:110px;right:110px">
      <div style="display:flex;align-items:baseline;gap:24px">
        <span style="font-weight:800;font-size:360px;line-height:0.85;letter-spacing:-14px;color:${PP.ink};font-variant-numeric:tabular-nums">${esc(p.heroValue)}</span>
      </div>
      <div style="margin-top:24px;height:4px;width:480px;background:linear-gradient(90deg, ${PP.mint}, ${PP.teal})"></div>
      <div style="margin-top:24px;font-weight:600;font-size:24px;letter-spacing:-0.3px;color:${PP.ink2}">${esc(p.heroLabel)}</div>
    </div>

    <div style="position:absolute;bottom:170px;left:110px;right:110px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding-top:28px;border-top:1px solid ${PP.stroke}">
      ${metricsHTML}
    </div>

    ${footerBar({ slide: 2, total: CD_TOTAL })}
  `;
  return htmlDoc(body, docOpts(PP.white, "Carousel D · Reach"));
}

// ─── Slide 3: Outcomes (horizontal bars) ────────────────────────────────────
export interface CDBar {
  l: string;     // label
  v: number;     // 0–100 percentage
  hint: string;  // citation hint
}

export interface CDProps3 {
  year: string;
  headline: string;
  bars: CDBar[];
}

export function renderCarouselD3(p: CDProps3): string {
  const barsHTML = p.bars
    .map(
      (b) => `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
          <span style="font-weight:600;font-size:17px;letter-spacing:-0.2px;color:${PP.white}">${esc(b.l)}</span>
          <span style="font-weight:800;font-size:28px;font-variant-numeric:tabular-nums;color:${PP.mint};letter-spacing:-0.5px">${esc(String(b.v))}%</span>
        </div>
        <div style="position:relative;height:14px;background:rgba(255,255,255,0.10);border-radius:7px;overflow:hidden">
          <div style="position:absolute;top:0;left:0;bottom:0;width:${b.v}%;background:linear-gradient(90deg, ${PP.mint}, ${PP.white});border-radius:7px"></div>
        </div>
        <div style="margin-top:8px;font-weight:500;font-size:13px;color:rgba(255,255,255,0.55);letter-spacing:0.2px">${esc(b.hint)}</div>
      </div>`
    )
    .join("");

  const body = `
    ${dotGrid({ color: "rgba(255,255,255,0.10)", gap: 36, dot: 1.3 })}

    ${rdHeader({ section: "Outcomes", idx: 3, dark: true, year: p.year })}

    <div style="position:absolute;top:230px;left:110px;right:130px;font-weight:700;font-size:46px;line-height:1.15;letter-spacing:-0.8px;color:${PP.white};text-wrap:balance">${esc(p.headline)}</div>

    <div style="position:absolute;top:430px;left:110px;right:110px;display:flex;flex-direction:column;gap:28px">
      ${barsHTML}
    </div>

    ${footerBar({ dark: true, slide: 3, total: CD_TOTAL })}
  `;
  // Slide 3 uses a teal→ink gradient — overlay it on the doc.
  const gradientBody = `<div style="position:absolute;inset:0;background:linear-gradient(170deg, ${PP.teal} 0%, ${PP.ink} 90%);color:${PP.white}">${body}</div>`;
  return htmlDoc(gradientBody, docOpts(PP.teal, "Carousel D · Outcomes"));
}

// ─── Slide 4: Value ($ hero + 4 tiles) ──────────────────────────────────────
export interface CDTile {
  k: string;       // big number
  l: string;       // label
  highlight?: boolean; // render in teal vs ink
}

export interface CDProps4 {
  year: string;
  headline: string;
  heroDollar: string;     // "$" prefix (rendered separately)
  heroValue: string;      // "4.1M"
  heroLabel: string;      // "in estimated avoidable cost · fewer ED visits, fewer readmits."
  tiles: [CDTile, CDTile, CDTile, CDTile];
}

export function renderCarouselD4(p: CDProps4): string {
  const tilesHTML = p.tiles
    .map((m) => {
      const c = m.highlight ? PP.teal : PP.ink;
      return `
        <div style="background:${PP.white};padding:20px 24px;border-radius:12px;border:1px solid ${PP.stroke};box-shadow:0 2px 6px rgba(16,43,69,0.04)">
          <div style="display:flex;align-items:baseline;gap:14px">
            <span style="font-weight:800;font-size:42px;line-height:1;letter-spacing:-1px;color:${c};font-variant-numeric:tabular-nums">${esc(m.k)}</span>
            <span style="font-weight:600;font-size:15px;color:${PP.ink2};letter-spacing:-0.1px;line-height:1.3;flex:1">${esc(m.l)}</span>
          </div>
        </div>`;
    })
    .join("");

  const body = `
    ${lineGrid({ color: "rgba(16,43,69,0.06)", gap: 80 })}

    ${rdHeader({ section: "Value", idx: 4, dark: false, year: p.year })}

    <div style="position:absolute;top:230px;left:110px;right:130px;font-weight:700;font-size:46px;line-height:1.15;letter-spacing:-0.8px;color:${PP.ink2};text-wrap:balance">${esc(p.headline)}</div>

    <div style="position:absolute;top:420px;left:110px;right:110px">
      <div style="display:flex;align-items:baseline;gap:8px">
        <span style="font-weight:700;font-size:80px;color:${PP.teal};letter-spacing:-2px;line-height:1">${esc(p.heroDollar)}</span>
        <span style="font-weight:800;font-size:280px;line-height:0.86;letter-spacing:-10px;color:${PP.ink};font-variant-numeric:tabular-nums">${esc(p.heroValue)}</span>
      </div>
      <div style="margin-top:14px;font-weight:600;font-size:26px;letter-spacing:-0.3px;color:${PP.ink2}">${esc(p.heroLabel)}</div>
    </div>

    <div style="position:absolute;bottom:170px;left:110px;right:110px;display:grid;grid-template-columns:repeat(2,1fr);gap:18px">
      ${tilesHTML}
    </div>

    ${footerBar({ slide: 4, total: CD_TOTAL })}
  `;
  return htmlDoc(body, docOpts(PP.paper, "Carousel D · Value"));
}

// ─── Slide 5: What's Next (3 pillars) ───────────────────────────────────────
export interface CDPillar {
  n: string;  // "01"
  t: string;  // pillar title
  l: string;  // description
}

export interface CDProps5 {
  year: string;
  section?: string;       // "What's Next · YEAR"
  headline: string;       // big closing line
  pillars: [CDPillar, CDPillar, CDPillar];
  hint?: string;          // footer hint (e.g. "Read · Share")
}

export function renderCarouselD5(p: CDProps5): string {
  const section = p.section ?? `What's Next · ${p.year}`;
  const hint = p.hint ?? "Read · Share";

  const pillarsHTML = p.pillars
    .map(
      (p2) => `
      <div style="padding-top:20px;border-top:1.5px solid ${PP.mint}">
        <div style="font-family:${MANROPE};font-size:12px;letter-spacing:0.2em;color:${PP.mint};margin-bottom:10px">${esc(p2.n)}</div>
        <div style="font-weight:700;font-size:22px;letter-spacing:-0.3px;color:${PP.white};margin-bottom:8px">${esc(p2.t)}</div>
        <div style="font-weight:500;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.65)">${esc(p2.l)}</div>
      </div>`
    )
    .join("");

  const body = `
    ${dotGrid({ color: "rgba(114,203,207,0.12)", gap: 40, dot: 1.6 })}
    <div style="position:absolute;bottom:-260px;left:-260px;width:820px;height:820px;border-radius:50%;background:radial-gradient(circle, rgba(114,203,207,0.30), rgba(114,203,207,0) 65%)"></div>
    ${ticks({ color: "rgba(114,203,207,0.6)", inset: 60, size: 22, weight: 1.5 })}

    ${rdHeader({ section, idx: 5, dark: true, year: p.year })}

    <div style="position:absolute;top:280px;left:110px;right:130px;font-weight:800;font-size:96px;line-height:0.98;letter-spacing:-3px;color:${PP.white};text-wrap:balance">${esc(p.headline)}</div>

    <div style="position:absolute;top:720px;left:110px;right:110px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      ${pillarsHTML}
    </div>

    ${footerBar({ dark: true, slide: 5, total: CD_TOTAL, hint })}
  `;
  return htmlDoc(body, docOpts(PP.ink, "Carousel D · What's Next"));
}
