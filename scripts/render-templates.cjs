// Smoke test + preview generator.
// Renders all 8 Claude-Design templates with realistic mock data, then:
//   1. Writes a single combined preview.html (all 8 side-by-side, scaled down)
//   2. Renders each template to a 1080x1080 PNG via Puppeteer
// Output goes to ../smoke-output/.
//
// Run: cd apps/patientpartner-social-agent && node scripts/render-templates.cjs

const fs = require("fs");
const path = require("path");

// We can't directly require TS files. Use esbuild to transpile on the fly.
// All template helpers are pure string concat with no Node APIs, so cheap.
async function loadTs(filePath) {
  const esbuild = require("esbuild");
  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    write: false,
    external: ["puppeteer-core", "@sparticuz/chromium", "pdf-lib"],
  });
  const code = result.outputFiles[0].text;
  const m = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", "require", code)(m, m.exports, require);
  return m.exports;
}

(async () => {
  const root = path.join(__dirname, "..");
  const out = path.join(root, "smoke-output");
  fs.mkdirSync(out, { recursive: true });

  console.log("[1/3] loading templates...");
  const tpl = await loadTs(path.join(root, "lib/templates/index.ts"));
  const carousel = await loadTs(path.join(root, "lib/templates/carousel.ts"));

  // Mock data for each template
  const mocks = {
    "01-quote-dark": {
      template: "static-quote",
      props: {
        tone: "dark",
        eyebrow: "Mentor Voices",
        quote:
          "I had every clinical detail. What I didn't have was someone who'd been through it. That gap is where most patients quietly drop off.",
        author: "Sarah Chen",
        role: "Knee Replacement · Mentor since 2023",
      },
    },
    "01-quote-teal": {
      template: "static-quote",
      props: {
        tone: "teal",
        eyebrow: "Mentor Voices",
        quote:
          "The questions my mentee asked me at week two were the questions I wish I'd known to ask my surgeon.",
        author: "Marcus T.",
        role: "Hip Replacement · Mentor since 2024",
      },
    },
    "01-quote-light": {
      template: "static-quote",
      props: {
        tone: "light",
        eyebrow: "Care Team Notes",
        quote:
          "When the patient walks in already prepared, the consult shifts from logistics to medicine. That's the whole game.",
        author: "Dr. Anita Rao",
        role: "Orthopedic Surgeon · Cleveland Clinic",
      },
    },
    "02-stat-dark": {
      template: "static-stat",
      props: {
        tone: "dark",
        eyebrow: "Adherence Report · 2026",
        value: "69",
        suffix: "%",
        headline: "of mentored patients started therapy within 7 days of consultation.",
        source: "PatientPartner cohort · n=4,103 · Q1 2026",
      },
    },
    "02-stat-light": {
      template: "static-stat",
      props: {
        tone: "light",
        eyebrow: "Adherence Report · 2026",
        prefix: "+",
        value: "2.4",
        suffix: "x",
        headline: "improvement in pre-op questionnaire completion among mentored patients.",
        source: "PerfectPatient cohort · n=4,103 · 2026",
      },
    },
    "02-stat-split": {
      template: "static-stat",
      props: {
        tone: "split",
        eyebrow: "Mentor Network · 2026",
        value: "133.5",
        headline: "Average mentees supported per active mentor across the PatientPartner network.",
        source: "Network telemetry · Q1 2026",
      },
    },
    "03-insight": {
      template: "static-insight",
      props: {
        eyebrow: "Research Takeaway",
        headline: "Most adherence drops happen",
        emphasis: "in the first 14 days",
        trail: "of treatment — long before refill cycles tell you anything.",
        bullets: [
          { value: "73%", label: "of dropouts happen in week 1-2" },
          { value: "6 hr", label: "median time from doubt to disengagement" },
          { value: "1 in 4", label: "patients abandon Rx before first dose" },
        ],
        source: "BMC Medicine · 40,000-patient meta-review · 2024",
      },
    },
  };

  // Carousel slide mocks (5 slides, "The Surgery Support Gap")
  const carouselMocks = [
    {
      fn: "renderSlide1",
      label: "c1-cover",
      props: {
        eyebrow: "The Surgery Support Gap",
        title: "Enrollment isn't activation.",
        subtitle:
          "Why the days between scheduling and the OR decide adherence — and what brand teams measure around.",
        total: 5,
      },
    },
    {
      fn: "renderSlide2",
      label: "c2-problem",
      props: {
        eyebrow: "The Problem",
        question: "Where does the funnel actually leak?",
        body: "Operational PSPs handle access, benefits, shipment. None of them touch the moment a patient gets a scary diagnosis on Tuesday and decides by Friday.",
        stat: "1 in 4",
        statLabel: "patients abandon a new Rx if they don't start within 2 days of diagnosis",
        index: 2,
        total: 5,
      },
    },
    {
      fn: "renderSlide3",
      label: "c3-stat",
      props: {
        eyebrow: "The Data",
        stat: "68%",
        headline: "more program starts when patients meet a peer mentor pre-op.",
        context: "Industry baseline vs PatientPartner-supported cohorts across 12 surgical programs.",
        bars: [
          { label: "Pre-op questionnaire completion", a: 41, b: 86 },
          { label: "Mentor-to-patient connect rate", a: 23, b: 73 },
          { label: "Show-rate at consultation", a: 64, b: 92 },
          { label: "First-week adherence", a: 58, b: 81 },
        ],
        index: 3,
        total: 5,
      },
    },
    {
      fn: "renderSlide4",
      label: "c4-mechanism",
      props: {
        eyebrow: "How It Works",
        title: "Three steps from scheduling to first injection.",
        steps: [
          { n: "01", h: "Auto-match", b: "Patient gets a peer mentor matched on procedure, demographics, and stage within 6 hours." },
          { n: "02", h: "Pre-op coaching", b: "Mentor walks them through what to expect — questions to ask, what's normal, what's not." },
          { n: "03", h: "Day-1 handoff", b: "Care team gets a prepared patient. Consult shifts from logistics to medicine." },
        ],
        index: 4,
        total: 5,
      },
    },
    {
      fn: "renderSlide5",
      label: "c5-cta",
      props: {
        eyebrow: "Take The Next Step",
        title: "Stop measuring around the missing middle. Add mentorship.",
        gradientWord: "mentorship",
        body: "We'll walk through your funnel, find the leak, and show what mentor-driven engagement looks like inside it.",
        cta: "Schedule a free demo",
        url: "patientpartner.com/demo",
        index: 5,
        total: 5,
      },
    },
  ];

  console.log("[2/3] rendering each template's HTML + thumb...");
  const cards = [];

  // Static templates
  for (const [name, input] of Object.entries(mocks)) {
    const html = tpl.renderTemplate(input);
    fs.writeFileSync(path.join(out, `${name}.html`), html);
    cards.push({ name, html, label: name });
  }

  // Carousel slides
  for (const slide of carouselMocks) {
    const html = carousel[slide.fn](slide.props);
    fs.writeFileSync(path.join(out, `${slide.label}.html`), html);
    cards.push({ name: slide.label, html, label: slide.label });
  }

  console.log(`[2/3] wrote ${cards.length} HTML files`);

  // Combined preview index
  const indexHtml = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>PatientPartner Templates · Preview</title>
  <style>
    body { font-family: system-ui; background: #102B45; color: #fff; margin: 0; padding: 40px; }
    h1 { font-weight: 800; font-size: 36px; margin: 0 0 12px; letter-spacing: -0.02em; }
    .subtitle { color: #72CBCF; margin-bottom: 40px; font-size: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(540px, 1fr)); gap: 32px; }
    .card { background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.3); }
    .card-label { padding: 14px 20px; background: #183857; color: #72CBCF; font-weight: 700; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; font-family: ui-monospace, monospace; }
    .card iframe { display: block; width: 100%; height: 540px; border: 0; }
  </style>
</head><body>
  <h1>PatientPartner Social Templates</h1>
  <div class="subtitle">8 static + 5 carousel · 1080×1080 · Poppins</div>
  <div class="grid">
    ${cards.map((c) => `
    <div class="card">
      <div class="card-label">${c.label}</div>
      <iframe srcdoc="${c.html.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" sandbox="allow-same-origin" loading="lazy"></iframe>
    </div>`).join("\n")}
  </div>
</body></html>`;
  fs.writeFileSync(path.join(out, "preview.html"), indexHtml);
  console.log(`[2/3] wrote preview.html (open in browser to see all)`);

  // Optional puppeteer render. @sparticuz/chromium is for Lambda Linux only —
  // locally on Mac we use the system Google Chrome. On Vercel the runtime
  // path goes through @sparticuz/chromium.executablePath() in lib/render-html.ts.
  let puppeteer;
  try {
    puppeteer = require("puppeteer-core");
  } catch (e) {
    console.log("[3/3] puppeteer-core not loadable — skipping PNG render. HTMLs are in smoke-output/. Open preview.html in your browser.");
    return;
  }

  // Find a local Chrome binary (Mac default path)
  const chromeCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  const exec = chromeCandidates.find((p) => fs.existsSync(p));
  if (!exec) {
    console.log("[3/3] no local Chrome found — skipping PNG render. Open preview.html manually.");
    return;
  }

  console.log(`[3/3] rendering PNGs via ${exec.split("/").pop()}...`);
  const browser = await puppeteer.launch({
    executablePath: exec,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  for (const c of cards) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(c.html, { waitUntil: "networkidle0" });
    await Promise.race([
      page.evaluate("document.fonts.ready"),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1080, height: 1080 } });
    fs.writeFileSync(path.join(out, `${c.name}.png`), png);
    console.log(`  ✓ ${c.name}.png (${png.length} bytes)`);
    await page.close();
  }
  await browser.close();
  console.log("[3/3] done — all PNGs in smoke-output/");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
