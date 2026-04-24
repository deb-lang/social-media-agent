// Smoke test: renders one sample of each image template + a tiny carousel PDF.
// Run with: npx tsx scripts/smoke-images.ts
// Outputs land in ./smoke-output/ (gitignored). Progress logged to smoke-output/log.txt.

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSvg,
  composeCarouselPdf,
  renderImage,
  renderSlidePng,
} from "../lib/image-generator";

const OUT_DIR = join(process.cwd(), "smoke-output");
mkdirSync(OUT_DIR, { recursive: true });
const LOG = join(OUT_DIR, "log.txt");

function log(msg: string) {
  console.log(msg);
  appendFileSync(LOG, msg + "\n");
}

async function main() {
  log("[smoke] Start " + new Date().toISOString());
  log("[smoke] process.cwd(): " + process.cwd());

  log("[smoke] Rendering dark_navy stat sample…");
  const darkPng = renderImage({
    template: "dark_navy",
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
    cta: {
      bold: "Turn hesitation into treatment starts.",
      supporting: "Book a demo at patientpartner.com",
    },
    footer: "patientpartner.com",
  });
  writeFileSync(join(OUT_DIR, "sample-dark-navy.png"), darkPng);
  log(`[smoke]   ${darkPng.length.toLocaleString()} bytes → sample-dark-navy.png`);

  log("[smoke] Rendering light_teal quote sample…");
  const lightPng = renderImage({
    template: "light_teal",
    kind: "quote",
    quote: {
      text: "Patients trust people who've walked in their shoes. That's not a nice-to-have. It's the #1 driver of healthcare trust.",
      attribution: "George Kramb",
      role: "CEO, PatientPartner",
    },
    bottomStats: [
      { value: "#1", label: "Driver of patient trust (Edelman, 2025)" },
      { value: "68%", label: "More likely to start treatment" },
    ],
    cta: {
      bold: "Trust drives treatment starts.",
      supporting: "See PatientPartner in action",
    },
    footer: "patientpartner.com",
  });
  writeFileSync(join(OUT_DIR, "sample-light-teal.png"), lightPng);
  log(`[smoke]   ${lightPng.length.toLocaleString()} bytes → sample-light-teal.png`);

  log("[smoke] Rendering carousel (3-slide mini PDF)…");
  const slide1 = buildSvg({
    template: "dark_navy",
    headline: "The Missing Middle",
    subhead: "Why patients enroll but don't start",
  });
  const slide2 = buildSvg({
    template: "dark_navy",
    headline: "Only 3-8% of eligible patients use PSPs",
    subhead: "Despite $22B+ in annual pharma spend",
    problemStats: [{ value: "3-8%", label: "Utilization rate" }],
  });
  const slide3 = buildSvg({
    template: "light_teal",
    kind: "quote",
    quote: {
      text: "Stories build belief. Mentorship changes behavior.",
      attribution: "PatientPartner",
    },
    cta: { bold: "Book a demo", supporting: "patientpartner.com" },
  });

  const pngs = [slide1, slide2, slide3].map((svg, i) => {
    log(`[smoke]   rendering slide ${i + 1}/3…`);
    return renderSlidePng(svg);
  });
  log("[smoke]   composing PDF…");
  const pdf = await composeCarouselPdf(pngs);
  writeFileSync(join(OUT_DIR, "sample-carousel.pdf"), pdf);
  log(`[smoke]   ${pdf.length.toLocaleString()} bytes → sample-carousel.pdf`);

  log("[smoke] Done " + new Date().toISOString());
}

main().catch((err) => {
  const msg = err instanceof Error ? err.stack ?? err.message : String(err);
  log("[smoke] FAILED: " + msg);
  process.exit(1);
});
