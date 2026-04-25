// Smoke test — render all 4 image variants with mock data and write to
// smoke-output/. Visually verify density, bold text, demo CTA, no
// "George Kramb" attribution, third-party-source quote attribution.

const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fontFiles = [
  path.join(root, "public/fonts/Poppins-Regular.ttf"),
  path.join(root, "public/fonts/Poppins-SemiBold.ttf"),
  path.join(root, "public/fonts/Poppins-Bold.ttf"),
  path.join(root, "public/fonts/Inter-Regular.ttf"),
];
const FONT = { loadSystemFonts: false, fontFiles, defaultFontFamily: "Poppins" };

const logo = fs.readFileSync(path.join(root, "public/logo.png")).toString("base64");

const teal = "#4BBFBF";
const darkBg = "#0B2D48";
const cardDark = "rgba(255,255,255,0.04)";
const textWhite = "#FFFFFF";
const textDarkOnLight = "#0B2D48";
const cardLight = "rgba(255,255,255,0.65)";
const lightGradTop = "#E0F4F4";
const lightGradBottom = "#B8E6E6";
const blurAccent = "#188F8B";

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- DARK_NAVY STATS ----------
function darkNavyStats() {
  const headlineLines = wrapText("The first 14 days decide everything.", 32).slice(0, 2);
  const subheadLines = wrapText("Why pharma's first-touch matters more than acquisition spend.", 56).slice(0, 1);
  const cardX = [50, 431, 812];
  const cardW = 338;
  const renderRow = (stats, y, opts) => stats.slice(0, 3).map((s, i) => {
    const x = cardX[i];
    const labelLines = wrapText(s.label, 26).slice(0, 2);
    const fill = opts.tealStat ? teal : textWhite;
    return `
  <rect x="${x}" y="${y}" width="${cardW}" height="200" rx="12" fill="${cardDark}" stroke="${teal}" stroke-width="${opts.strokeWidth}"/>
  <text x="${x + cardW / 2}" y="${y + 92}" font-family="Poppins" font-size="76" font-weight="700" fill="${fill}" text-anchor="middle">${escapeXml(s.value)}</text>
  ${labelLines.map((ln, idx) => `<text x="${x + cardW / 2}" y="${y + 138 + idx * 26}" font-family="Poppins" font-size="18" font-weight="600" fill="#E0ECF4" text-anchor="middle">${escapeXml(ln)}</text>`).join("")}
    `.trim();
  }).join("\n");
  const headlineY0 = 180;
  const subheadY = headlineY0 + headlineLines.length * 64 + 8;
  const ctaY = 890, ctaH = 160;
  const cta = { bold: "Schedule a free demo", supporting: "See how mentor matching moves your numbers" };
  return `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1200" fill="${darkBg}"/>
  <circle cx="1040" cy="160" r="300" fill="${teal}" opacity="0.07"/>
  <circle cx="160" cy="1080" r="230" fill="${teal}" opacity="0.05"/>
  <image href="data:image/png;base64,${logo}" x="50" y="44" width="300" height="78"/>
  <line x1="50" y1="140" x2="1150" y2="140" stroke="${teal}" stroke-width="1" opacity="0.25"/>
  ${headlineLines.map((ln, i) => `<text x="50" y="${headlineY0 + i * 64}" font-family="Poppins" font-size="60" font-weight="700" fill="${textWhite}">${escapeXml(ln)}</text>`).join("")}
  ${subheadLines.map((ln, i) => `<text x="50" y="${subheadY + i * 36}" font-family="Poppins" font-size="28" font-weight="700" fill="${teal}">${escapeXml(ln)}</text>`).join("")}
  <text x="50" y="350" font-family="Poppins" font-size="18" font-weight="700" fill="${teal}" letter-spacing="3">THE PROBLEM</text>
  ${renderRow([
    { value: "35%", label: "drop-off in standard programs" },
    { value: "6 weeks", label: "average wait for callback" },
    { value: "72hr", label: "window before disengagement" },
  ], 380, { tealStat: false, strokeWidth: 1 })}
  <text x="50" y="620" font-family="Poppins" font-size="18" font-weight="700" fill="${teal}" letter-spacing="3">WITH PATIENTPARTNER</text>
  ${renderRow([
    { value: "68%", label: "more program starts" },
    { value: "100%", label: "match rate" },
    { value: "6 hr", label: "to first peer connection" },
  ], 650, { tealStat: true, strokeWidth: 2.5 })}
  <rect x="50" y="${ctaY}" width="1100" height="${ctaH}" rx="14" fill="${teal}"/>
  <text x="600" y="${ctaY + 70}" font-family="Poppins" fill="${textWhite}" font-size="36" font-weight="700" text-anchor="middle">${escapeXml(cta.bold)}</text>
  <text x="600" y="${ctaY + 115}" font-family="Poppins" fill="${textWhite}" font-size="20" font-weight="600" text-anchor="middle" opacity="0.92">${escapeXml(cta.supporting)}</text>
  <text x="600" y="1085" font-family="Poppins" fill="${teal}" font-size="18" font-weight="600" text-anchor="middle" opacity="0.75">patientpartner.com/demo</text>
</svg>`;
}

// ---------- LIGHT_TEAL QUOTE ----------
function lightTealQuote() {
  const quote = {
    text: "Empathy is the most underpriced ROI lever in pharma. Patients adhere when they trust someone who has been there.",
    attribution: "BMC Medicine",
    role: "40,000-patient meta-review, 2024",
  };
  const cta = { bold: "Schedule a free demo", supporting: "See the BMC adherence data in your funnel" };
  const stats = [
    { value: "22%", label: "Adherence lift across mentor cohorts" },
    { value: "18%", label: "Script lift in BMC review" },
  ];
  const quoteLines = wrapText(quote.text, 30).slice(0, 6);
  const lineH = 56;
  const quoteY0 = 220;
  const attrY = quoteY0 + quoteLines.length * lineH + 28;
  const roleY = attrY + 36;
  let bottomStatY = Math.max(roleY + 50, 620);
  if (bottomStatY > 700) bottomStatY = -1;
  const ctaY = 800, ctaH = 160;
  return `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${lightGradTop}"/>
      <stop offset="100%" stop-color="${lightGradBottom}"/>
    </linearGradient>
    <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="45"/>
    </filter>
  </defs>
  <rect width="1200" height="1200" fill="url(#bgGrad)"/>
  <circle cx="1080" cy="140" r="230" fill="${teal}" opacity="0.14" filter="url(#blur1)"/>
  <circle cx="130" cy="1070" r="210" fill="${teal}" opacity="0.11" filter="url(#blur1)"/>
  <circle cx="620" cy="580" r="190" fill="${blurAccent}" opacity="0.07" filter="url(#blur1)"/>
  <image href="data:image/png;base64,${logo}" x="50" y="44" width="300" height="78"/>
  <line x1="50" y1="140" x2="1150" y2="140" stroke="${teal}" stroke-width="1" opacity="0.35"/>
  <text x="50" y="180" font-family="Poppins" font-size="130" font-weight="700" fill="${teal}" opacity="0.6">&#8220;</text>
  ${quoteLines.map((ln, i) => `<text x="80" y="${quoteY0 + i * lineH}" font-family="Poppins" font-size="44" font-weight="700" fill="${textDarkOnLight}">${escapeXml(ln)}</text>`).join("")}
  <text x="80" y="${attrY}" font-family="Poppins" font-size="28" font-weight="700" fill="${teal}">${escapeXml(quote.attribution)}</text>
  <text x="80" y="${roleY}" font-family="Poppins" font-size="22" font-weight="700" fill="${textDarkOnLight}" opacity="0.85">${escapeXml(quote.role)}</text>
  ${
    bottomStatY > 0
      ? stats.slice(0, 2).map((s, i) => {
          const x = 50 + i * 576;
          return `
  <rect x="${x}" y="${bottomStatY}" width="524" height="140" rx="14" fill="${cardLight}" stroke="${teal}" stroke-width="2"/>
  <text x="${x + 262}" y="${bottomStatY + 78}" font-family="Poppins" font-size="56" font-weight="700" fill="${teal}" text-anchor="middle">${escapeXml(s.value)}</text>
  <text x="${x + 262}" y="${bottomStatY + 115}" font-family="Poppins" font-size="17" font-weight="700" fill="${textDarkOnLight}" text-anchor="middle">${escapeXml(s.label)}</text>
        `.trim();
      }).join("\n")
      : ""
  }
  <rect x="50" y="${ctaY}" width="1100" height="${ctaH}" rx="14" fill="${teal}"/>
  <text x="600" y="${ctaY + 70}" font-family="Poppins" fill="${textWhite}" font-size="36" font-weight="700" text-anchor="middle">${escapeXml(cta.bold)}</text>
  <text x="600" y="${ctaY + 115}" font-family="Poppins" fill="${textWhite}" font-size="20" font-weight="600" text-anchor="middle" opacity="0.92">${escapeXml(cta.supporting)}</text>
  <text x="600" y="1085" font-family="Poppins" fill="${textDarkOnLight}" font-size="18" text-anchor="middle" opacity="0.6">patientpartner.com/demo</text>
</svg>`;
}

// ---------- LIGHT_TEAL ANNOUNCEMENT ----------
function lightTealAnnouncement() {
  const headline = "PerfectPatient is now live on brand.com.";
  const subhead = "AI mentor that hits 73% connection rate, deployed in 45 days.";
  const features = [
    { title: "73% connection rate", body: "Patients who reach the page actually start a conversation. Not just sessions." },
    { title: "45-day deploy", body: "Pharma-ready in 6 weeks. HIPAA, GDPR, FDA-aligned out of the box." },
    { title: "24/7 support", body: "On-label answers, real-time mentor handoff when stakes get high." },
  ];
  const cta = { bold: "Schedule a free demo" };
  const stats = [
    { value: "95%", label: "engagement rate" },
    { value: "14 min", label: "avg session" },
  ];
  const headlineLines = wrapText(headline, 22).slice(0, 2);
  const subheadLines = wrapText(subhead, 50).slice(0, 1);
  const headlineY0 = 180;
  const subheadY = headlineY0 + headlineLines.length * 68 + 12;
  const ctaY = 800, ctaH = 160;
  return `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${lightGradTop}"/>
      <stop offset="100%" stop-color="${lightGradBottom}"/>
    </linearGradient>
    <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="45"/>
    </filter>
  </defs>
  <rect width="1200" height="1200" fill="url(#bgGrad)"/>
  <circle cx="1080" cy="140" r="230" fill="${teal}" opacity="0.14" filter="url(#blur1)"/>
  <circle cx="130" cy="1070" r="210" fill="${teal}" opacity="0.11" filter="url(#blur1)"/>
  <image href="data:image/png;base64,${logo}" x="50" y="44" width="300" height="78"/>
  <line x1="50" y1="140" x2="1150" y2="140" stroke="${teal}" stroke-width="1" opacity="0.35"/>
  ${headlineLines.map((ln, i) => `<text x="50" y="${headlineY0 + i * 68}" font-family="Poppins" font-size="64" font-weight="700" fill="${textDarkOnLight}">${escapeXml(ln)}</text>`).join("")}
  ${subheadLines.map((ln, i) => `<text x="50" y="${subheadY + i * 36}" font-family="Poppins" font-size="28" font-weight="700" fill="${teal}">${escapeXml(ln)}</text>`).join("")}
  ${features.slice(0, 3).map((f, i) => {
    const x = 50 + i * 381;
    const y = 370;
    return `
  <rect x="${x}" y="${y}" width="338" height="320" rx="14" fill="${cardLight}" stroke="${teal}" stroke-width="2"/>
  <text x="${x + 22}" y="${y + 42}" font-family="Poppins" font-size="22" font-weight="700" fill="${teal}">${escapeXml(f.title)}</text>
  ${wrapText(f.body, 26).slice(0, 6).map((ln, bi) => `<text x="${x + 22}" y="${y + 86 + bi * 30}" font-family="Poppins" font-size="19" font-weight="600" fill="${textDarkOnLight}">${escapeXml(ln)}</text>`).join("")}
    `.trim();
  }).join("\n")}
  ${stats.slice(0, 2).map((s, i) => {
    const x = 50 + i * 576;
    return `
  <rect x="${x}" y="720" width="524" height="60" rx="14" fill="${cardLight}" stroke="${teal}" stroke-width="2"/>
  <text x="${x + 60}" y="762" font-family="Poppins" font-size="32" font-weight="700" fill="${teal}">${escapeXml(s.value)}</text>
  <text x="${x + 180}" y="762" font-family="Poppins" font-size="20" font-weight="600" fill="${textDarkOnLight}">${escapeXml(s.label)}</text>
    `.trim();
  }).join("\n")}
  <rect x="50" y="${ctaY}" width="1100" height="${ctaH}" rx="14" fill="${teal}"/>
  <text x="600" y="${ctaY + 100}" font-family="Poppins" fill="${textWhite}" font-size="36" font-weight="700" text-anchor="middle">${escapeXml(cta.bold)}</text>
  <text x="600" y="1085" font-family="Poppins" fill="${textDarkOnLight}" font-size="18" text-anchor="middle" opacity="0.6">patientpartner.com/perfectpatient</text>
</svg>`;
}

const out = path.join(root, "smoke-output");
fs.mkdirSync(out, { recursive: true });

const variants = [
  { name: "dark-navy-stats", svg: darkNavyStats() },
  { name: "light-teal-quote", svg: lightTealQuote() },
  { name: "light-teal-announcement", svg: lightTealAnnouncement() },
];

for (const v of variants) {
  const png = new Resvg(v.svg, { fitTo: { mode: "width", value: 1200 }, font: FONT }).render().asPng();
  const file = path.join(out, `${v.name}.png`);
  fs.writeFileSync(file, png);
  console.log(`${v.name}: ${png.length} bytes → ${file}`);
}
