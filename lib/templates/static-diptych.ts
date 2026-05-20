// StaticDiptych — before/after comparison post, 1080×1080.
// Ported from the Claude Design bundle's StaticDiptych component.
//
// Layout:
//   - Two side-by-side tiles (left=dark "without", right=light "with")
//   - Each tile: small dot+label header, giant stat, stat caption, body line
//   - Center "vs" badge straddles the seam
//   - Bottom strip: source citation + URL on the right

import { PP, MANROPE, dotGrid, lineGrid } from "./atoms";
import { esc, htmlDoc } from "./shared";

export interface DiptychTile {
  label: string;       // small caps eyebrow ("Without a peer mentor")
  stat: string;        // giant number ("31%")
  statLabel: string;   // "feel prepared"
  body: string;        // descriptive paragraph
}

export interface StaticDiptychProps {
  left: DiptychTile;     // dark tile (negative case)
  right: DiptychTile;    // light tile (positive case)
  vsLabel?: string;      // text inside the center badge (default "vs")
  source?: string;       // bottom-left citation
  brandUrl?: string;     // bottom-right URL (default "patientpartner.com")
}

function diptychTile(side: "left" | "right", t: DiptychTile, dark: boolean): string {
  const bg = dark ? PP.ink : PP.white;
  const fg = dark ? PP.white : PP.ink;
  const dotColor = dark ? "rgba(255,255,255,0.4)" : PP.mint;
  const labelColor = dark ? "rgba(255,255,255,0.55)" : PP.muted;
  const statColor = dark ? "rgba(255,255,255,0.35)" : PP.ink;
  const captionColor = dark ? PP.white : PP.ink;
  const bodyColor = dark ? "rgba(255,255,255,0.65)" : PP.muted;
  const gridFragment = dark
    ? dotGrid({ color: "rgba(114,203,207,0.10)", gap: 36, dot: 1.4 })
    : lineGrid({ color: "rgba(16,43,69,0.05)", gap: 60 });

  return `
    <div style="position:absolute;top:0;bottom:0;${side}:0;width:540px;background:${bg};color:${fg};padding:90px 56px;overflow:hidden">
      ${gridFragment}
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:10px;height:10px;border-radius:5px;background:${dotColor}"></div>
          <span style="font-weight:700;font-size:13px;letter-spacing:0.24em;text-transform:uppercase;color:${labelColor}">${esc(t.label)}</span>
        </div>
        <div style="margin-top:80px;flex:1">
          <div style="font-weight:800;font-size:200px;line-height:0.85;letter-spacing:-8px;color:${statColor};font-variant-numeric:tabular-nums">${esc(t.stat)}</div>
          <div style="margin-top:24px;font-weight:700;font-size:26px;line-height:1.2;letter-spacing:-0.4px;color:${captionColor}">${esc(t.statLabel)}</div>
          <div style="margin-top:18px;font-weight:500;font-size:16px;line-height:1.55;color:${bodyColor};max-width:380px">${esc(t.body)}</div>
        </div>
      </div>
    </div>`;
}

export function renderStaticDiptych(p: StaticDiptychProps): string {
  const vsLabel = p.vsLabel ?? "vs";
  const source = p.source ?? "SOURCE · PP OUTCOMES, 2024";
  const brandUrl = p.brandUrl ?? "patientpartner.com";

  const body = `
    ${diptychTile("left", p.left, true)}
    ${diptychTile("right", p.right, false)}

    <!-- Center "vs" badge -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:88px;height:88px;border-radius:44px;background:${PP.mint};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(0,0,0,0.18);z-index:5">
      <span style="font-weight:800;font-size:24px;letter-spacing:-0.6px;color:${PP.ink}">${esc(vsLabel)}</span>
    </div>

    <!-- Bottom strip -->
    <div style="position:absolute;bottom:32px;left:0;right:0;padding:0 56px;display:flex;justify-content:space-between;align-items:center;z-index:5">
      <span style="font-weight:600;font-size:11px;letter-spacing:0.22em;color:rgba(255,255,255,0.5)">${esc(source)}</span>
      <span style="font-weight:700;font-size:13px;letter-spacing:0.22em;color:${PP.teal};text-transform:uppercase">${esc(brandUrl)}</span>
    </div>
  `;

  return htmlDoc(body, {
    width: 1080,
    height: 1080,
    bgColor: PP.white,
    fontFamily: MANROPE,
    title: "PatientPartner — Diptych",
  });
}
