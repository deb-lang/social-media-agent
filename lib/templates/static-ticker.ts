// StaticTicker — live-data network metric post, 1080×1080.
// Ported from the Claude Design bundle's StaticTicker component.
//
// Layout:
//   - Top status bar: "LIVE · PATIENTPARTNER OUTCOMES NETWORK · FY · Q"
//   - Big hero metric (e.g. "128,496 ↑ 12.4%") + headline beneath
//   - 4-column secondary metrics row
//   - Footer bar (wordmark)

import { PP, MANROPE, lineGrid, footerBar } from "./atoms";
import { esc, htmlDoc } from "./shared";

export interface TickerMetric {
  value: string;        // e.g. "+38%", "97.1", "24min"
  label: string;        // e.g. "mentor matches"
  highlight?: boolean;  // render in mint vs white
}

export interface StaticTickerProps {
  // Top bar
  statusLabel?: string;  // "LIVE · PATIENTPARTNER OUTCOMES NETWORK"
  period?: string;       // "FY24 · Q4"

  // Hero metric
  metricLabel?: string;  // "METRIC · 001"
  cadence?: string;      // "updated daily"
  heroValue: string;     // "128,496"
  heroDelta?: string;    // "↑ 12.4%"
  headline: string;      // "patient conversations powered through the network this year."

  // 4 supporting metrics
  metrics?: [TickerMetric, TickerMetric, TickerMetric, TickerMetric];
}

const DEFAULT_METRICS: [TickerMetric, TickerMetric, TickerMetric, TickerMetric] = [
  { value: "+38%", label: "mentor matches", highlight: true },
  { value: "97.1", label: "NPS · last 90d", highlight: false },
  { value: "24min", label: "avg. response", highlight: true },
  { value: "17", label: "specialty programs", highlight: false },
];

export function renderStaticTicker(p: StaticTickerProps): string {
  const statusLabel = p.statusLabel ?? "LIVE · PATIENTPARTNER OUTCOMES NETWORK";
  const period = p.period ?? "FY26 · Q4";
  const metricLabel = p.metricLabel ?? "METRIC · 001";
  const cadence = p.cadence ?? "updated daily";
  const metrics = p.metrics ?? DEFAULT_METRICS;

  const metricsHTML = metrics
    .map((m, i) => {
      const color = m.highlight ? PP.mint : PP.white;
      return `
        <div style="border-top:1.5px solid rgba(255,255,255,0.18);padding-top:18px">
          <div style="font-family:${MANROPE};font-size:11px;letter-spacing:0.2em;color:rgba(255,255,255,0.4);margin-bottom:10px">0${i + 2}</div>
          <div style="font-weight:800;font-size:46px;line-height:1;letter-spacing:-1.2px;color:${color};font-variant-numeric:tabular-nums">${esc(m.value)}</div>
          <div style="margin-top:8px;font-weight:500;font-size:14px;color:rgba(255,255,255,0.6);letter-spacing:0.2px">${esc(m.label)}</div>
        </div>`;
    })
    .join("");

  const body = `
    ${lineGrid({ color: "rgba(114,203,207,0.08)", gap: 60 })}

    <!-- top status bar -->
    <div style="position:absolute;top:0;left:0;right:0;height:56px;background:rgba(0,0,0,0.35);display:flex;align-items:center;padding:0 32px;gap:16px;border-bottom:1px solid rgba(114,203,207,0.2)">
      <div style="width:10px;height:10px;border-radius:5px;background:${PP.mint};box-shadow:0 0 12px ${PP.mint}"></div>
      <span style="font-family:${MANROPE};font-size:13px;letter-spacing:0.15em;color:rgba(255,255,255,0.7)">${esc(statusLabel)}</span>
      <div style="flex:1"></div>
      <span style="font-family:${MANROPE};font-size:13px;letter-spacing:0.15em;color:rgba(255,255,255,0.45)">${esc(period)}</span>
    </div>

    <!-- Big metric headline -->
    <div style="position:absolute;top:140px;left:80px;right:80px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">
        <span style="font-family:${MANROPE};font-weight:600;font-size:14px;letter-spacing:0.18em;color:${PP.mint};padding:6px 12px;border:1px solid ${PP.mint};border-radius:4px">${esc(metricLabel)}</span>
        <span style="font-weight:500;font-size:14px;color:rgba(255,255,255,0.45);letter-spacing:0.3px">${esc(cadence)}</span>
      </div>
      <div style="font-weight:800;font-size:200px;line-height:0.88;letter-spacing:-7px;color:${PP.white};font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:18px">
        <span>${esc(p.heroValue)}</span>
        ${p.heroDelta ? `<span style="font-size:42px;font-weight:600;color:${PP.mint};letter-spacing:-0.5px">${esc(p.heroDelta)}</span>` : ""}
      </div>
      <div style="margin-top:24px;font-weight:600;font-size:36px;line-height:1.15;letter-spacing:-0.6px;color:rgba(255,255,255,0.92);text-wrap:balance;max-width:880px">
        ${esc(p.headline)}
      </div>
    </div>

    <!-- Ticker row of secondary stats -->
    <div style="position:absolute;bottom:150px;left:0;right:0;padding:0 80px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
      ${metricsHTML}
    </div>

    ${footerBar({ dark: true, hint: null })}
  `;

  return htmlDoc(body, {
    width: 1080,
    height: 1080,
    bgColor: PP.ink3,
    fontFamily: MANROPE,
    title: "PatientPartner — Live Ticker",
  });
}
