// Minimal CJS test — proves resvg + pdf-lib work.
const { Resvg } = require("@resvg/resvg-js");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "smoke-output");
fs.mkdirSync(OUT, { recursive: true });
console.log("[1] created dir");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
<rect width="400" height="400" fill="#0B2D48"/>
<circle cx="200" cy="200" r="80" fill="#4BBFBF"/>
<text x="200" y="210" font-family="Arial" font-size="32" fill="white" text-anchor="middle" font-weight="700">PP</text>
</svg>`;

const png = new Resvg(svg).render().asPng();
fs.writeFileSync(path.join(OUT, "minimal.png"), png);
console.log(`[2] wrote minimal.png (${png.length} bytes)`);

(async () => {
  const pdf = await PDFDocument.create();
  const img = await pdf.embedPng(png);
  const page = pdf.addPage([400, 400]);
  page.drawImage(img, { x: 0, y: 0, width: 400, height: 400 });
  const bytes = await pdf.save();
  fs.writeFileSync(path.join(OUT, "minimal.pdf"), Buffer.from(bytes));
  console.log(`[3] wrote minimal.pdf (${bytes.length} bytes)`);
  console.log("[done]");
})();
