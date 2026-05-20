// Reconstruct the Claude Design template bundle from lib/templates/ source.
//
// Run with: npx tsx scripts/build-design-bundle.mjs
// Output: ~/Downloads/PatientPartner Social Media Templates.html
//
// Each template render fn returns a COMPLETE HTML document (per the comment
// in lib/templates/index.ts). To avoid CSS conflicts when stacking 8 docs in
// one bundle, each render is embedded via <iframe srcdoc="…"> rather than
// inlined. Iframes scale via CSS transform.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  COLORS,
  FONTS,
  FS,
  RADII,
  SHADOWS,
  GOOGLE_FONTS_HREF,
} from "../lib/templates/tokens";

// Hardcoded — tokens.ts exports CANVAS but the .ts named-export resolution
// through tsx was inconsistent. Both are stable constants.
const CANVAS = { width: 1080, height: 1080 };
import { renderStaticStat } from "../lib/templates/static-stat";
import { renderStaticQuote } from "../lib/templates/static-quote";
import { renderStaticInsight } from "../lib/templates/static-insight";
import {
  renderSlide1,
  renderSlide2,
  renderSlide3,
  renderSlide4,
  renderSlide5,
} from "../lib/templates/carousel";
// v2 templates (added 2026-05-20 from second Claude Design bundle)
import { renderStaticEditorial } from "../lib/templates/static-editorial";
import { renderStaticTicker } from "../lib/templates/static-ticker";
import { renderStaticDiptych } from "../lib/templates/static-diptych";
import {
  renderCarouselA1, renderCarouselA2, renderCarouselA3, renderCarouselA4, renderCarouselA5,
} from "../lib/templates/carousel-a";
import {
  renderCarouselD1, renderCarouselD2, renderCarouselD3, renderCarouselD4, renderCarouselD5,
} from "../lib/templates/carousel-d";

// ─── 1. Render each template with realistic PatientPartner mock data ─────────

const statDark = renderStaticStat({
  tone: "dark",
  eyebrow: "Mentor program",
  value: "68",
  suffix: "%",
  headline: "more patients begin treatment after a mentor conversation",
  source: "PatientPartner internal program data, 2024",
});

const statLight = renderStaticStat({
  tone: "light",
  eyebrow: "Decision impact",
  value: "71",
  suffix: "%",
  headline: "said mentorship was critical to their treatment decision",
  source: "Accenture Life Sciences: The Patient is In Report, 2016",
});

const statSplit = renderStaticStat({
  tone: "split",
  eyebrow: "Adherence",
  value: "22",
  suffix: "%",
  headline: "adherence lift when mentors enter the first 30 days",
  source: "PatientPartner internal program data",
});

const quoteDark = renderStaticQuote({
  tone: "dark",
  eyebrow: "The missing middle",
  quote:
    "Most patient support programs lose the patient before they ever fill the script.",
  author: "Deb Fernandez",
  role: "Founder, PatientPartner",
});

const quoteTeal = renderStaticQuote({
  tone: "teal",
  eyebrow: "Patient voice",
  quote:
    "Hearing from someone already on therapy was the turning point for me.",
  author: "Maria L.",
  role: "PatientPartner mentee, oncology",
});

const quoteLight = renderStaticQuote({
  tone: "light",
  eyebrow: "Why it works",
  quote: "Stories build belief. Mentorship changes behavior.",
  author: "PatientPartner team",
  role: "Mentor enablement playbook",
});

const insight = renderStaticInsight({
  eyebrow: "Initiation data · 2024",
  headline: "The first 30 days decide the next year of therapy.",
  emphasis:
    "1 in 4 patients abandon a new prescription if they don't start within 2 days of diagnosis.",
  trail:
    "Most programs onboard in week three. By then the patient has already decided.",
  bullets: [
    { value: "68%", label: "more next-step completion after one mentor conversation" },
    { value: "73%", label: "mentor connection rate vs. 10–20% for hub-only support" },
    { value: "22%", label: "adherence lift across enterprise mentor programs" },
  ],
  source: "IQVIA Medicine Use Report · Accenture Life Sciences · PatientPartner internal",
});

const slide1 = renderSlide1({
  eyebrow: "The missing middle",
  title: "Why patients quit in the first 30 days",
  subtitle:
    "Enrollment isn't initiation. The gap between yes and started is where support programs lose people.",
  total: 5,
});

const slide2 = renderSlide2({
  eyebrow: "The gap",
  question: "What happens between enrollment and the first dose?",
  body:
    "Diagnosis hits. Doubt sets in. Most hubs hand off paperwork, not perspective. Patients are alone with side-effect fears and no one who's been there.",
  stat: "1 in 4",
  statLabel: "patients abandon a new Rx within 2 days of diagnosis (IQVIA, 2020)",
  index: 2,
  total: 5,
});

const slide3 = renderSlide3({
  eyebrow: "Mentor effect",
  stat: "22%",
  headline: "Adherence lift when a mentor enters the first 30 days",
  context:
    "Standard programs lose patients to silence. Mentor-driven programs hold them through the hardest stretch of initiation.",
  bars: [
    { label: "Mentor match rate", a: 18, b: 100 },
    { label: "Patients taking next step", a: 30, b: 78 },
    { label: "Treatment adherence", a: 54, b: 76 },
  ],
  index: 3,
  total: 5,
});

const slide4 = renderSlide4({
  eyebrow: "How it works",
  title: "How mentors close the 30-day gap",
  steps: [
    {
      n: "01",
      h: "Match in hours, not weeks",
      b: "We connect new patients to a vetted mentor in 6 to 48 hours. Standard peer programs take 6 weeks.",
    },
    {
      n: "02",
      h: "Real conversations, not scripts",
      b: "Mentors share what side effects felt like, what week one was hardest, why they kept going. Recognition beats information.",
    },
    {
      n: "03",
      h: "Track what moves",
      b: "Adherence, script lift, next-step completion. Every conversation feeds your program data, not a black box.",
    },
  ],
  index: 4,
  total: 5,
});

const slide5 = renderSlide5({
  eyebrow: "Take the next step",
  title: "Stop measuring around the missing middle. Add mentorship.",
  gradientWord: "mentorship",
  body:
    "Walk through your initiation funnel with our team. We'll map where mentors plug in and what they move for your therapeutic area.",
  cta: "Schedule a free demo",
  url: "patientpartner.com/demo",
  index: 5,
  total: 5,
});

// ─── v2 templates — new statics ─────────────────────────────────────────────

const editorial = renderStaticEditorial({
  publication: "The Partner",
  publicationKicker: "A PatientPartner Bulletin · Vol. 04",
  issue: "ISSUE 014",
  issueDate: "MAY · 2026",
  featureBadge: "F",
  featureLabel: "Feature story · 12 min read",
  preHeadline: "The case for",
  headline: "someone like you.",
  headlineEmphasisWord: "like",
  dek: "Inside the surprising science of peer mentorship — and the patients who say it changed the way they think about recovery.",
  authorInitials: "RP",
  authorName: "By Dr. Reema Patel",
  photographer: "Photography · Linh Tran",
});

const ticker = renderStaticTicker({
  statusLabel: "LIVE · PATIENTPARTNER OUTCOMES NETWORK",
  period: "FY26 · Q4",
  metricLabel: "METRIC · 001",
  cadence: "updated daily",
  heroValue: "128,496",
  heroDelta: "↑ 12.4%",
  headline: "patient conversations powered through the network this year.",
  metrics: [
    { value: "+38%", label: "mentor matches", highlight: true },
    { value: "97.1", label: "NPS · last 90d", highlight: false },
    { value: "24min", label: "avg. response", highlight: true },
    { value: "17", label: "specialty programs", highlight: false },
  ],
});

const diptych = renderStaticDiptych({
  left: {
    label: "Without a peer mentor",
    stat: "31%",
    statLabel: "feel prepared",
    body: "Patients report uncertainty about what to expect in the first 30 days.",
  },
  right: {
    label: "With a peer mentor",
    stat: "94%",
    statLabel: "feel prepared",
    body: "A single match before surgery shifts the entire post-op trajectory.",
  },
  source: "SOURCE · PP OUTCOMES, 2024",
  brandUrl: "patientpartner.com",
});

// ─── v2 templates — Carousel A ("Recovery Gap") ─────────────────────────────

const carouselA = [
  renderCarouselA1({
    eyebrow: "The Recovery Gap",
    issueLabel: "Issue №01",
    headline: "Why surgery is the loneliest 90 days of a patient's life.",
    subhead: "We talked to 1,200 patients. The data says recovery is broken — and connection fixes it.",
    partsLabel: "A 5-PART READ",
  }),
  renderCarouselA2({
    eyebrow: "The Problem",
    headline: "Patients leave the hospital with a packet — and a thousand questions.",
    bigA: "1",
    bigB: "3",
    bigConnector: "in",
    body: "surgical patients reports moderate-to-severe anxiety in the two weeks before their procedure.",
    source: "Source · JAMA Surgery, 2023 · pre-operative anxiety meta-analysis (n=42,800)",
  }),
  renderCarouselA3({
    eyebrow: "The Insight",
    quote: "The single biggest predictor of recovery isn't surgery type. It's whether someone has been there before you.",
    authorInitials: "DR",
    authorName: "Dr. Reema Patel, MD",
    authorRole: "Director of Patient Experience · PatientPartner",
  }),
  renderCarouselA4({
    eyebrow: "What Changes",
    headline: "Patients matched with a peer mentor through PatientPartner report:",
    metrics: [
      { k: "73%", l: "less pre-op anxiety" },
      { k: "4.2×", l: "faster return to daily activity" },
      { k: "94%", l: "felt prepared for surgery" },
      { k: "2.1d", l: "shorter hospital stay (avg.)" },
    ],
  }),
  renderCarouselA5({
    eyebrow: "What's Next",
    headline: "Get matched with someone who's been there.",
    body: "Free for patients. Always confidential. Trusted by 600+ hospital systems across the U.S.",
    ctaLabel: "Find your match",
    brandUrl: "patientpartner.com",
    ctaSubLabel: "Or DM us to get started today",
    handle: "@ patientpartner",
  }),
];

// ─── v2 templates — Carousel D ("Year in Numbers · 2024") ───────────────────

const carouselD = [
  renderCarouselD1({
    year: "2026",
    section: "Year in Numbers",
    kicker: "The PatientPartner Network",
    headline: "A year of showing up — by the numbers.",
    subhead: "Five slides. The clearest picture we've ever had of what peer connection does for surgical recovery.",
  }),
  renderCarouselD2({
    year: "2026",
    headline: "Patients we walked beside this year, end-to-end.",
    heroValue: "128k",
    heroLabel: "conversations between matched patients · +38% YoY",
    metrics: [
      { k: "12,400", l: "active mentors", hint: "+42% YoY" },
      { k: "17", l: "specialty programs", hint: "4 new this year" },
      { k: "97.1", l: "NPS · last 90d", hint: "best in category" },
    ],
  }),
  renderCarouselD3({
    year: "2026",
    headline: "What happens when a patient meets their peer.",
    bars: [
      { l: "felt prepared for surgery", v: 94, hint: "vs. 63% baseline" },
      { l: "returned to daily activity on time", v: 88, hint: "vs. 51% baseline" },
      { l: "still engaged at 6 months", v: 87, hint: "industry avg. 22%" },
      { l: "would recommend the program", v: 96, hint: "open survey, n=1,204" },
    ],
  }),
  renderCarouselD4({
    year: "2026",
    headline: "What the network returned to the system.",
    heroDollar: "$",
    heroValue: "4.1M",
    heroLabel: "in estimated avoidable cost · fewer ED visits, fewer readmits.",
    tiles: [
      { k: "-31%", l: "30-day readmissions", highlight: true },
      { k: "-2.1d", l: "avg. length of stay", highlight: true },
      { k: "+3.4pt", l: "patient-reported QoL" },
      { k: "+24min", l: "avg. response · live chat" },
    ],
  }),
  renderCarouselD5({
    year: "2026",
    section: "What's Next · 2027",
    headline: "Next year, every patient. Every specialty. Every step.",
    pillars: [
      { n: "01", t: "Scale", l: "8 new specialty programs in pilot, including oncology and maternal health." },
      { n: "02", t: "Depth", l: "Lifetime match — peers stay matched beyond the 90-day window." },
      { n: "03", t: "Access", l: "Spanish-first match flow rolling to 200+ partner sites by Q3." },
    ],
    hint: "Read · Share",
  }),
];

// ─── 2. Helpers ──────────────────────────────────────────────────────────────

const htmlEscapeForSrcdoc = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const frame = (label, html) => `
  <div class="frame">
    <div class="frame-label">${label}</div>
    <div class="canvas-wrap">
      <iframe class="canvas" sandbox="allow-same-origin" srcdoc="${htmlEscapeForSrcdoc(html)}" loading="lazy"></iframe>
    </div>
  </div>`;

const swatch = (name, hex) => `
  <div class="swatch">
    <div class="swatch-color" style="background:${hex}"></div>
    <div class="swatch-name">${name}</div>
    <div class="swatch-hex">${hex}</div>
  </div>`;

// Component contract rows — hand-derived from each *Props interface.
const propsTable = (rows) => `
  <table class="props-table">
    <thead><tr><th>Prop</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
    <tbody>
      ${rows
        .map(
          ([prop, type, required, desc]) => `
        <tr>
          <td><code>${prop}</code></td>
          <td><code>${type}</code></td>
          <td>${required ? "✓" : "—"}</td>
          <td>${desc}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`;

// ─── 3. Compose final document ───────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>PatientPartner Social Media Templates</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${GOOGLE_FONTS_HREF}" />
<style>
  :root {
    --navy: ${COLORS.navy};
    --navy-2: ${COLORS.navy2};
    --mint: ${COLORS.mint};
    --mint-primary: ${COLORS.mintPrimary};
    --surface: ${COLORS.aquaTwilight};
    --border: rgba(24, 56, 87, 0.10);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: linear-gradient(180deg, ${COLORS.skyBreeze} 0%, ${COLORS.aquaTwilight} 100%);
    color: var(--navy);
    font-family: ${FONTS.body};
    font-size: ${FS.bodyM}px;
    line-height: 1.55;
    padding: 56px 32px 96px;
  }
  .wrap { max-width: 1180px; margin: 0 auto; }

  header.bundle-head {
    border-bottom: 1px solid var(--border);
    padding-bottom: 22px;
    margin-bottom: 44px;
  }
  .eyebrow {
    font-family: ${FONTS.mono};
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mint-primary);
    margin-bottom: 10px;
  }
  h1 {
    font-family: ${FONTS.display};
    font-weight: 800;
    font-size: ${FS.displayM}px;
    line-height: 1.05;
    letter-spacing: -0.025em;
    margin: 0 0 10px;
    color: var(--navy);
  }
  .lede {
    font-size: ${FS.bodyL}px;
    color: var(--navy-2);
    max-width: 780px;
    margin: 0;
  }
  .meta {
    font-family: ${FONTS.mono};
    font-size: 11.5px;
    color: rgba(24, 56, 87, 0.55);
    margin-top: 14px;
  }

  section { margin: 56px 0; }
  section > h2 {
    font-family: ${FONTS.display};
    font-weight: 700;
    font-size: ${FS.h2}px;
    letter-spacing: -0.02em;
    color: var(--navy);
    margin: 0 0 24px;
  }
  section > p.section-sub {
    color: var(--navy-2);
    margin: -12px 0 28px;
    max-width: 760px;
  }

  /* ─── token swatches ───────────────────────────────────── */
  .swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 14px;
  }
  .swatch {
    background: #fff;
    border-radius: ${RADII.md}px;
    padding: 12px 14px 14px;
    box-shadow: ${SHADOWS.card};
  }
  .swatch-color {
    height: 56px;
    border-radius: ${RADII.sm}px;
    border: 1px solid var(--border);
  }
  .swatch-name {
    font-family: ${FONTS.display};
    font-weight: 600;
    font-size: ${FS.bodyS}px;
    color: var(--navy);
    margin-top: 10px;
  }
  .swatch-hex {
    font-family: ${FONTS.mono};
    font-size: 11.5px;
    color: ${COLORS.grey600};
    margin-top: 2px;
  }

  /* ─── typography sample ────────────────────────────────── */
  .type-row {
    background: #fff;
    border-radius: ${RADII.md}px;
    padding: 22px 26px;
    box-shadow: ${SHADOWS.card};
    margin-top: 16px;
  }
  .type-display {
    font-family: ${FONTS.display};
    font-weight: 700;
    font-size: ${FS.displayS}px;
    line-height: 1.1;
    color: var(--navy);
    margin: 0 0 8px;
  }
  .type-body {
    font-family: ${FONTS.body};
    font-size: ${FS.bodyL}px;
    color: var(--navy-2);
    margin: 0;
  }
  .scale-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
    margin-top: 20px;
  }
  .scale-cell {
    background: #fff;
    border-radius: ${RADII.sm}px;
    padding: 12px 14px;
    box-shadow: ${SHADOWS.card};
  }
  .scale-px {
    font-family: ${FONTS.mono};
    font-size: 10.5px;
    color: ${COLORS.grey600};
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .scale-key {
    font-family: ${FONTS.display};
    font-weight: 600;
    color: var(--navy);
    margin-top: 4px;
  }

  /* ─── template frames ──────────────────────────────────── */
  .frames-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
    gap: 28px;
  }
  .frame {
    background: #fff;
    border-radius: ${RADII.lg}px;
    box-shadow: ${SHADOWS.card};
    padding: 18px 18px 22px;
  }
  .frame-label {
    font-family: ${FONTS.mono};
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${COLORS.grey600};
    margin-bottom: 14px;
  }
  .canvas-wrap {
    /* The canvas is 1080×1080 scaled to 540×540 (50%). Reserve that space. */
    width: 540px;
    height: 540px;
    overflow: hidden;
    border-radius: ${RADII.md}px;
    border: 1px solid var(--border);
    background: #fff;
  }
  /* v2 carousels are 1080×1350 (4:5). Scaled 0.5 → 540×675. */
  .frames-grid-tall .canvas-wrap {
    width: 540px;
    height: 675px;
  }
  .frames-grid-tall iframe.canvas {
    width: 1080px;
    height: 1350px;
  }
  iframe.canvas {
    width: ${CANVAS.width}px;
    height: ${CANVAS.height}px;
    transform: scale(0.5);
    transform-origin: top left;
    border: 0;
    display: block;
  }

  /* ─── component contracts ──────────────────────────────── */
  .props-card {
    background: #fff;
    border-radius: ${RADII.md}px;
    box-shadow: ${SHADOWS.card};
    padding: 22px 26px 26px;
    margin: 18px 0;
  }
  .props-card h3 {
    font-family: ${FONTS.display};
    font-weight: 700;
    font-size: ${FS.h4}px;
    margin: 0 0 14px;
    color: var(--navy);
  }
  table.props-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${FS.bodyS}px;
  }
  table.props-table th, table.props-table td {
    text-align: left;
    padding: 9px 12px;
    border-bottom: 1px solid var(--border);
  }
  table.props-table th {
    font-family: ${FONTS.mono};
    font-size: 10.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${COLORS.grey600};
    font-weight: 600;
  }
  table.props-table code {
    font-family: ${FONTS.mono};
    font-size: 12.5px;
    color: var(--navy);
    background: ${COLORS.mist};
    padding: 1px 6px;
    border-radius: 4px;
  }
</style>
</head>
<body>
<div class="wrap">

<header class="bundle-head">
  <div class="eyebrow">Claude Design · Reconstructed</div>
  <h1>PatientPartner Social Media Templates</h1>
  <p class="lede">8 templates — 3 static-stat tones, 3 static-quote tones, 1 static-insight, and the 5-slide carousel sequence. All rendered at 1080×1080 from <code>lib/templates/</code> source.</p>
  <p class="meta">Reconstructed from lib/templates/ on ${today} · brand tokens pulled live from tokens.ts</p>
</header>

<section>
  <h2>Design tokens</h2>
  <p class="section-sub">Pulled directly from <code>lib/templates/tokens.ts</code>. Edit there and re-run this script to see updated swatches.</p>

  <div class="swatches">
    ${Object.entries(COLORS)
      .map(([k, v]) => swatch(k, v))
      .join("")}
  </div>

  <div class="type-row">
    <h3 class="type-display">Display · ${FONTS.display.split(",")[0].replace(/['"]/g, "")}</h3>
    <p class="type-body">Body · ${FONTS.body.split(",")[0].replace(/['"]/g, "")}</p>
  </div>

  <div class="scale-grid">
    ${Object.entries(FS)
      .map(
        ([k, v]) => `
      <div class="scale-cell">
        <div class="scale-px">${v}px</div>
        <div class="scale-key">${k}</div>
      </div>`
      )
      .join("")}
  </div>
</section>

<section>
  <h2>v1 Templates</h2>
  <p class="section-sub">Each frame is a 1080×1080 iframe rendered at 50% scale (540×540). Open the file in a browser — content is live HTML, not screenshots.</p>

  <div class="frames-grid">
    ${frame("StaticStat · dark", statDark)}
    ${frame("StaticStat · light", statLight)}
    ${frame("StaticStat · split", statSplit)}
    ${frame("StaticQuote · dark", quoteDark)}
    ${frame("StaticQuote · teal", quoteTeal)}
    ${frame("StaticQuote · light", quoteLight)}
    ${frame("StaticInsight", insight)}
    ${frame("Carousel 1 · Cover", slide1)}
    ${frame("Carousel 2 · Problem", slide2)}
    ${frame("Carousel 3 · Stat", slide3)}
    ${frame("Carousel 4 · Mechanism", slide4)}
    ${frame("Carousel 5 · CTA", slide5)}
  </div>
</section>

<section>
  <h2>v2 Templates — New (Statics 1080×1080)</h2>
  <p class="section-sub">Three new static templates ported from the second Claude Design bundle. In rotation with the v1 statics.</p>

  <div class="frames-grid">
    ${frame("StaticEditorial · magazine cover", editorial)}
    ${frame("StaticTicker · live network metric", ticker)}
    ${frame("StaticDiptych · before vs. after", diptych)}
  </div>
</section>

<section>
  <h2>v2 Templates — Carousel A (1080×1350)</h2>
  <p class="section-sub">5-slide narrative — "The Recovery Gap". Vertical 4:5 aspect.</p>

  <div class="frames-grid frames-grid-tall">
    ${frame("A · 01 Cover", carouselA[0])}
    ${frame("A · 02 Problem", carouselA[1])}
    ${frame("A · 03 Insight quote", carouselA[2])}
    ${frame("A · 04 Proof · 4 metrics", carouselA[3])}
    ${frame("A · 05 CTA", carouselA[4])}
  </div>
</section>

<section>
  <h2>v2 Templates — Carousel D (1080×1350)</h2>
  <p class="section-sub">5-slide annual-report flow — "Year in Numbers". Vertical 4:5 aspect.</p>

  <div class="frames-grid frames-grid-tall">
    ${frame("D · 01 Cover", carouselD[0])}
    ${frame("D · 02 Reach", carouselD[1])}
    ${frame("D · 03 Outcomes · bars", carouselD[2])}
    ${frame("D · 04 Value · $4.1M saved", carouselD[3])}
    ${frame("D · 05 What's next", carouselD[4])}
  </div>
</section>

<section>
  <h2>Component contracts</h2>
  <p class="section-sub">Prop shapes for each template render function. Source: the <code>*Props</code> interface in each file.</p>

  <div class="props-card">
    <h3>StaticStat — <code>renderStaticStat(p: StaticStatProps)</code></h3>
    ${propsTable([
      ["tone", `"dark" | "light" | "split"`, true, "Visual variant."],
      ["eyebrow", "string", false, "Small uppercase label above the hero number."],
      ["prefix", "string", false, 'Text before the value (e.g. "$").'],
      ["value", "string", true, 'The hero number (e.g. "68", "3.2×").'],
      ["suffix", "string", false, 'Text after the value (e.g. "%").'],
      ["headline", "string", true, "Headline beneath the number."],
      ["source", "string", true, "Citation line at the bottom."],
    ])}
  </div>

  <div class="props-card">
    <h3>StaticQuote — <code>renderStaticQuote(p: StaticQuoteProps)</code></h3>
    ${propsTable([
      ["tone", `"dark" | "teal" | "light"`, true, "Visual variant."],
      ["eyebrow", "string", false, "Small uppercase label above the quote."],
      ["quote", "string", true, "The pull-quote body."],
      ["author", "string", true, "Author name."],
      ["role", "string", true, "Author role / affiliation."],
    ])}
  </div>

  <div class="props-card">
    <h3>StaticInsight — <code>renderStaticInsight(p: StaticInsightProps)</code></h3>
    ${propsTable([
      ["eyebrow", "string", false, "Small uppercase label."],
      ["headline", "string", true, "Headline sentence."],
      ["emphasis", "string", true, "Bold takeaway line beneath the headline."],
      ["trail", "string", true, "Follow-up paragraph."],
      ["bullets", "[InsightBullet, InsightBullet, InsightBullet]", true, "Exactly 3 metric bullets. Each: { value, label }."],
      ["source", "string", true, "Citation line."],
    ])}
  </div>

  <div class="props-card">
    <h3>Carousel slide 1 (Cover) — <code>renderSlide1(p: Slide1Props)</code></h3>
    ${propsTable([
      ["eyebrow", "string", true, "Topic label."],
      ["title", "string", true, "Big editorial title."],
      ["subtitle", "string", true, "Supporting line."],
      ["total", "number", false, "Total slides for pagination dots."],
    ])}
  </div>

  <div class="props-card">
    <h3>Carousel slide 2 (Problem) — <code>renderSlide2(p: Slide2Props)</code></h3>
    ${propsTable([
      ["eyebrow", "string", false, "Section label."],
      ["question", "string", true, "Provocative question that frames the slide."],
      ["body", "string", true, "Problem framing paragraph."],
      ["stat", "string", true, "Supporting stat (e.g. \"1 in 4\")."],
      ["statLabel", "string", true, "Stat citation/context."],
      ["index", "number", false, "Slide number for pagination."],
      ["total", "number", false, "Total slides for pagination."],
    ])}
  </div>

  <div class="props-card">
    <h3>Carousel slide 3 (Stat) — <code>renderSlide3(p: Slide3Props)</code></h3>
    ${propsTable([
      ["eyebrow", "string", false, "Section label."],
      ["stat", "string", true, "Hero stat (e.g. \"22%\")."],
      ["headline", "string", true, "What the stat means."],
      ["context", "string", true, "Context paragraph."],
      ["bars", "BarRow[]", true, "Comparison bars. Each row: { label, a, b } where a/b are 0–100."],
      ["index", "number", false, "Slide number."],
      ["total", "number", false, "Total slides."],
    ])}
  </div>

  <div class="props-card">
    <h3>Carousel slide 4 (Mechanism) — <code>renderSlide4(p: Slide4Props)</code></h3>
    ${propsTable([
      ["eyebrow", "string", false, "Section label."],
      ["title", "string", true, "Slide title."],
      ["steps", "[MechanismStep, MechanismStep, MechanismStep]", true, "Exactly 3 numbered steps. Each: { n, h, b }."],
      ["index", "number", false, "Slide number."],
      ["total", "number", false, "Total slides."],
    ])}
  </div>

  <div class="props-card">
    <h3>Carousel slide 5 (CTA) — <code>renderSlide5(p: Slide5Props)</code></h3>
    ${propsTable([
      ["eyebrow", "string", false, "Section label."],
      ["title", "string", true, "Final ask."],
      ["gradientWord", "string", false, 'Word within title to gradient-highlight (default: "mentorship").'],
      ["body", "string", true, "Supporting paragraph."],
      ["cta", "string", true, "Button label."],
      ["url", "string", true, "Display URL beneath the button."],
      ["index", "number", false, "Slide number."],
      ["total", "number", false, "Total slides."],
    ])}
  </div>
</section>

</div>
</body>
</html>`;

// ─── 4. Write ────────────────────────────────────────────────────────────────

const out = path.join(
  os.homedir(),
  "Downloads",
  "PatientPartner Social Media Templates.html"
);
fs.writeFileSync(out, html);
const sizeKb = (html.length / 1024).toFixed(1);
console.log(`✓ wrote ${out}`);
console.log(`  ${sizeKb} KB · 8 templates · ${Object.keys(COLORS).length} color tokens`);
console.log(`  open in a browser to view`);
