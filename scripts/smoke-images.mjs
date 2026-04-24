// Pure ESM smoke test — bypasses tsx. Uses dynamic imports.
// Run: node scripts/smoke-images.mjs
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";

const OUT_DIR = join(process.cwd(), "smoke-output");
mkdirSync(OUT_DIR, { recursive: true });
const LOG = join(OUT_DIR, "log.txt");
const log = (msg) => {
  console.log(msg);
  appendFileSync(LOG, msg + "\n");
};

// ─── Brand colors from lib/constants.ts ─────────────
const IMAGE_COLORS = {
  darkBg: "#0B2D48",
  cardDark: "#0F2F45",
  teal: "#4BBFBF",
  lightGradTop: "#E8F9FA",
  lightGradBottom: "#C4EDF0",
  cardLight: "#FFFFFF",
  textDarkOnLight: "#0B2D48",
  blurAccent: "#74CDD0",
  textWhite: "#FFFFFF",
};
const IMAGE_SIZE = 1200;

const logoB64 = readFileSync(join(process.cwd(), "public", "logo.png")).toString("base64");
log("[smoke] Logo loaded: " + logoB64.length + " base64 chars");

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

function darkNavySvg({ headline, subhead, problemLabel, problemStats, solutionLabel, solutionStats, cta, footer }) {
  const teal = IMAGE_COLORS.teal;
  const cardColor = IMAGE_COLORS.cardDark;
  const headlineLines = wrapText(headline, 38).slice(0, 2);
  const cardX = [50, 431, 812];
  const cardW = 338;

  const renderRow = (stats, y, opts) =>
    stats
      .slice(0, 3)
      .map((s, i) => {
        const x = cardX[i] ?? cardX[0];
        const labelLines = wrapText(s.label, 26).slice(0, 2);
        const statFill = opts.tealStat ? teal : IMAGE_COLORS.textWhite;
        return `<rect x="${x}" y="${y}" width="${cardW}" height="200" rx="12" fill="${cardColor}" stroke="${teal}" stroke-width="${opts.strokeWidth}"/><text x="${x + cardW / 2}" y="${y + 92}" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="${statFill}" text-anchor="middle">${escapeXml(s.value)}</text>${labelLines
          .map((ln, idx) => `<text x="${x + cardW / 2}" y="${y + 140 + idx * 26}" font-family="Arial, sans-serif" font-size="20" fill="#E0ECF4" text-anchor="middle">${escapeXml(ln)}</text>`)
          .join("")}`;
      })
      .join("");

  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
<rect width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" fill="${IMAGE_COLORS.darkBg}"/>
<circle cx="1040" cy="160" r="300" fill="${teal}" opacity="0.07"/>
<circle cx="160" cy="1080" r="230" fill="${teal}" opacity="0.05"/>
<image href="data:image/png;base64,${logoB64}" x="50" y="44" width="300" height="78"/>
<line x1="50" y1="150" x2="1150" y2="150" stroke="${teal}" stroke-width="1" opacity="0.25"/>
${headlineLines.map((ln, i) => `<text x="50" y="${210 + i * 58}" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="${IMAGE_COLORS.textWhite}">${escapeXml(ln)}</text>`).join("")}
${subhead ? `<text x="50" y="${210 + headlineLines.length * 58 + 8}" font-family="Arial, sans-serif" font-size="24" fill="${teal}">${escapeXml(subhead)}</text>` : ""}
${problemLabel ? `<text x="50" y="335" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${teal}" letter-spacing="3">${escapeXml(problemLabel.toUpperCase())}</text>` : ""}
${problemStats ? renderRow(problemStats, 350, { tealStat: false, strokeWidth: 1 }) : ""}
${solutionLabel ? `<text x="50" y="605" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${teal}" letter-spacing="3">${escapeXml(solutionLabel.toUpperCase())}</text>` : ""}
${solutionStats ? renderRow(solutionStats, 620, { tealStat: true, strokeWidth: 2.5 }) : ""}
${cta ? `<rect x="50" y="880" width="1100" height="100" rx="12" fill="${teal}" opacity="0.12" stroke="${teal}" stroke-width="1"/><text x="600" y="922" font-family="Arial, sans-serif" fill="${IMAGE_COLORS.textWhite}" font-size="26" font-weight="700" text-anchor="middle">${escapeXml(cta.bold)}</text><text x="600" y="958" font-family="Arial, sans-serif" fill="${teal}" font-size="20" text-anchor="middle">${escapeXml(cta.supporting)}</text>` : ""}
${footer ? `<text x="600" y="1020" font-family="Arial, sans-serif" fill="${teal}" font-size="18" text-anchor="middle" opacity="0.7">${escapeXml(footer)}</text>` : ""}
</svg>`;
}

function lightTealQuoteSvg({ quote, bottomStats, cta, footer }) {
  const teal = IMAGE_COLORS.teal;
  const textDark = IMAGE_COLORS.textDarkOnLight;
  const quoteLines = wrapText(quote.text, 44);
  const qY = 410;
  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${IMAGE_COLORS.lightGradTop}"/><stop offset="100%" stop-color="${IMAGE_COLORS.lightGradBottom}"/></linearGradient>
  <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
</defs>
<rect width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" fill="url(#bgGrad)"/>
<circle cx="1080" cy="140" r="230" fill="${teal}" opacity="0.14" filter="url(#blur1)"/>
<circle cx="130" cy="1070" r="210" fill="${teal}" opacity="0.11" filter="url(#blur1)"/>
<circle cx="620" cy="580" r="190" fill="${IMAGE_COLORS.blurAccent}" opacity="0.07" filter="url(#blur1)"/>
<image href="data:image/png;base64,${logoB64}" x="50" y="44" width="300" height="78"/>
<line x1="50" y1="150" x2="1150" y2="150" stroke="${teal}" stroke-width="1" opacity="0.35"/>
<text x="50" y="400" font-family="Arial, sans-serif" font-size="160" font-weight="700" fill="${teal}">&#8220;</text>
${quoteLines.map((ln, i) => `<text x="600" y="${qY + 80 + i * 44}" font-family="Arial, sans-serif" font-size="32" font-style="italic" fill="${textDark}" text-anchor="middle">${escapeXml(ln)}</text>`).join("")}
<text x="600" y="${qY + 80 + quoteLines.length * 44 + 40}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${teal}" text-anchor="middle">${escapeXml(quote.attribution)}</text>
${quote.role ? `<text x="600" y="${qY + 80 + quoteLines.length * 44 + 70}" font-family="Arial, sans-serif" font-size="20" fill="${textDark}" text-anchor="middle">${escapeXml(quote.role)}</text>` : ""}
${bottomStats && bottomStats.length >= 2 ? bottomStats.slice(0, 2).map((s, i) => {
  const x = 50 + i * 576;
  return `<rect x="${x}" y="730" width="524" height="110" rx="14" fill="${IMAGE_COLORS.cardLight}" stroke="${teal}" stroke-width="1.5"/><text x="${x + 262}" y="790" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="${teal}" text-anchor="middle">${escapeXml(s.value)}</text><text x="${x + 262}" y="820" font-family="Arial, sans-serif" font-size="15" fill="${textDark}" text-anchor="middle">${escapeXml(s.label)}</text>`;
}).join("") : ""}
${cta ? `<rect x="50" y="860" width="1100" height="100" rx="14" fill="${teal}"/><text x="600" y="902" font-family="Arial, sans-serif" fill="${IMAGE_COLORS.textWhite}" font-size="24" font-weight="700" text-anchor="middle">${escapeXml(cta.bold)}</text><text x="600" y="938" font-family="Arial, sans-serif" fill="${IMAGE_COLORS.textWhite}" font-size="18" text-anchor="middle">${escapeXml(cta.supporting)}</text>` : ""}
${footer ? `<text x="600" y="1020" font-family="Arial, sans-serif" fill="${textDark}" font-size="18" text-anchor="middle" opacity="0.6">${escapeXml(footer)}</text>` : ""}
</svg>`;
}

function renderPng(svg) {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: IMAGE_SIZE } });
  return r.render().asPng();
}

log("[smoke] Start " + new Date().toISOString());

log("[smoke] Rendering dark_navy stat sample…");
const darkSvg = darkNavySvg({
  headline: "Patients enroll in PSPs. Most don't start.",
  subhead: "The missing middle pharma hasn't solved",
  problemLabel: "The problem",
  problemStats: [
    { value: "3-8%", label: "PSP utilization" },
    { value: "$22B+", label: "Annual pharma spend" },
    { value: "1 in 4", label: "Abandon Rx within 2 days" },
  ],
  solutionLabel: "What we deliver",
  solutionStats: [
    { value: "68%", label: "More likely to begin treatment" },
    { value: "22%", label: "Adherence lift" },
    { value: "73%", label: "Connection rate" },
  ],
  cta: { bold: "Turn hesitation into treatment starts.", supporting: "Book a demo at patientpartner.com" },
  footer: "patientpartner.com",
});
const darkPng = renderPng(darkSvg);
writeFileSync(join(OUT_DIR, "sample-dark-navy.png"), darkPng);
log(`[smoke]   ${darkPng.length.toLocaleString()} bytes → sample-dark-navy.png`);

log("[smoke] Rendering light_teal quote sample…");
const lightSvg = lightTealQuoteSvg({
  quote: {
    text: "Patients trust people who've walked in their shoes. That's not a nice-to-have. It's the #1 driver of healthcare trust.",
    attribution: "George Kramb",
    role: "CEO, PatientPartner",
  },
  bottomStats: [
    { value: "#1", label: "Driver of patient trust (Edelman, 2025)" },
    { value: "68%", label: "More likely to start treatment" },
  ],
  cta: { bold: "Trust drives treatment starts.", supporting: "See PatientPartner in action" },
  footer: "patientpartner.com",
});
const lightPng = renderPng(lightSvg);
writeFileSync(join(OUT_DIR, "sample-light-teal.png"), lightPng);
log(`[smoke]   ${lightPng.length.toLocaleString()} bytes → sample-light-teal.png`);

log("[smoke] Rendering carousel (3-slide PDF)…");
const slide1Png = renderPng(darkNavySvg({ headline: "The Missing Middle", subhead: "Why patients enroll but don't start" }));
const slide2Png = renderPng(darkNavySvg({ headline: "Only 3-8% of eligible patients use PSPs", subhead: "Despite $22B+ in annual pharma spend", problemStats: [{ value: "3-8%", label: "Utilization rate" }] }));
const slide3Png = renderPng(lightTealQuoteSvg({ quote: { text: "Stories build belief. Mentorship changes behavior.", attribution: "PatientPartner" }, cta: { bold: "Book a demo", supporting: "patientpartner.com" } }));

const pdf = await PDFDocument.create();
for (const png of [slide1Png, slide2Png, slide3Png]) {
  const img = await pdf.embedPng(png);
  const page = pdf.addPage([1080, 1350]);
  page.drawImage(img, { x: 0, y: 0, width: 1080, height: 1350 });
}
const pdfBytes = Buffer.from(await pdf.save());
writeFileSync(join(OUT_DIR, "sample-carousel.pdf"), pdfBytes);
log(`[smoke]   ${pdfBytes.length.toLocaleString()} bytes → sample-carousel.pdf`);

log("[smoke] Done " + new Date().toISOString());
