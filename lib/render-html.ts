// HTML → PNG renderer using puppeteer-core + @sparticuz/chromium.
// Replaces the SVG → PNG path in lib/image-generator.ts for the new template
// system. Uses a single shared Browser instance per warm container so cold
// start cost is paid once per Vercel function lifetime.
//
// Usage:
//   const png = await renderHtmlToPng(htmlString);             // 1080×1080
//   const slidePng = await renderHtmlToPng(html, { width: 1080, height: 1080 });

import { CANVAS } from "./templates/tokens";

// We import lazily to avoid loading puppeteer + chromium at module-init time
// (would slow down every cold start, including routes that never render).
type PuppeteerCore = typeof import("puppeteer-core");
type ChromiumModule = typeof import("@sparticuz/chromium");

interface BrowserHandle {
  // Generic shape — we only call .newPage() and .close() so this is fine.
  newPage(): Promise<PageHandle>;
  close(): Promise<void>;
  isConnected(): boolean;
}

interface PageHandle {
  setViewport(opts: { width: number; height: number; deviceScaleFactor?: number }): Promise<void>;
  setContent(html: string, opts?: { waitUntil?: "load" | "networkidle0" | "networkidle2" }): Promise<void>;
  evaluateHandle(fn: string): Promise<unknown>;
  evaluate<T = unknown>(fn: string): Promise<T>;
  screenshot(opts: {
    type: "png";
    omitBackground?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  }): Promise<Buffer | Uint8Array>;
  close(): Promise<void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __pp_browserP: Promise<BrowserHandle> | null | undefined;
}

// Cache the LAUNCH PROMISE on globalThis so concurrent callers await the
// same launch. If we cached only the resolved browser, 5 slides hitting
// getBrowser() simultaneously when the browser isn't yet initialized would
// each kick off their own chromium spawn — leading to ETXTBSY (binary busy
// being decompressed from chromium.br by 5 processes at once).
async function getBrowser(): Promise<BrowserHandle> {
  // If a launch is in flight or completed, reuse it
  if (globalThis.__pp_browserP) {
    try {
      const existing = await globalThis.__pp_browserP;
      if (existing.isConnected()) return existing;
    } catch {
      /* fall through and relaunch */
    }
    globalThis.__pp_browserP = null;
  }

  // Kick off a single launch promise that all callers await
  globalThis.__pp_browserP = (async (): Promise<BrowserHandle> => {
    const puppeteer = (await import("puppeteer-core")) as unknown as PuppeteerCore;
    const chromiumMod = (await import("@sparticuz/chromium")) as unknown as {
      default?: ChromiumModule;
    } & ChromiumModule;
    const chromium = (chromiumMod.default ?? chromiumMod) as ChromiumModule;

    if (typeof (chromium as { setGraphicsMode?: boolean }).setGraphicsMode !== "undefined") {
      (chromium as { setGraphicsMode: boolean }).setGraphicsMode = true;
    }

    const executablePath = await (chromium as unknown as {
      executablePath: () => Promise<string>;
    }).executablePath();

    const browser = (await (puppeteer as unknown as {
      launch: (opts: unknown) => Promise<BrowserHandle>;
    }).launch({
      args: (chromium as unknown as { args: string[] }).args,
      defaultViewport: (chromium as unknown as { defaultViewport: unknown }).defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    })) as BrowserHandle;
    return browser;
  })();

  try {
    return await globalThis.__pp_browserP;
  } catch (err) {
    globalThis.__pp_browserP = null;
    throw err;
  }
}

export interface RenderOptions {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  // Maximum time to wait for fonts to settle (ms). Default 5000.
  fontTimeoutMs?: number;
}

/**
 * Render an HTML document to PNG.
 * The HTML must be a complete document — see lib/templates/shared.ts::htmlDoc.
 */
export async function renderHtmlToPng(
  html: string,
  opts: RenderOptions = {}
): Promise<Buffer> {
  const width = opts.width ?? CANVAS.width;
  const height = opts.height ?? CANVAS.height;
  const dsf = opts.deviceScaleFactor ?? 2;
  const fontTimeoutMs = opts.fontTimeoutMs ?? 5000;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: dsf });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for fonts — Poppins is loaded from Google Fonts and may swap in
    // mid-render otherwise. Race against a timeout so we don't hang forever
    // if Google Fonts is slow.
    await Promise.race([
      page.evaluate("document.fonts.ready"),
      new Promise((r) => setTimeout(r, fontTimeoutMs)),
    ]);

    const png = await page.screenshot({
      type: "png",
      omitBackground: false,
      clip: { x: 0, y: 0, width, height },
    });

    const buf = Buffer.isBuffer(png) ? png : Buffer.from(png);
    if (buf.length < 1000) {
      throw new Error(`Puppeteer produced empty/tiny PNG (${buf.length} bytes)`);
    }
    return buf;
  } finally {
    await page.close();
  }
}

/**
 * Carousel helper: renders 5 slide HTMLs to PNGs in parallel via the shared
 * browser, then composes them into a single PDF using pdf-lib.
 * Returns { pdf: Buffer, slidePngs: Buffer[] } so callers can also upload
 * individual slide previews for the dashboard.
 */
export async function renderCarousel(
  slideHtmls: string[],
  opts: RenderOptions = {}
): Promise<{ pdf: Buffer; slidePngs: Buffer[] }> {
  // Lazy import pdf-lib for the same cold-start reason
  const { PDFDocument } = await import("pdf-lib");

  // Render all slides in parallel (each gets its own page, shared browser)
  const slidePngs = await Promise.all(slideHtmls.map((h) => renderHtmlToPng(h, opts)));

  const width = opts.width ?? CANVAS.width;
  const height = opts.height ?? CANVAS.height;
  const pdf = await PDFDocument.create();
  for (const png of slidePngs) {
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });
  }
  const pdfBytes = await pdf.save();
  return { pdf: Buffer.from(pdfBytes), slidePngs };
}
