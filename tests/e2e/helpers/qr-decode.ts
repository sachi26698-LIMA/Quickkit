/**
 * Independent decode helpers for the QR Studio V3 browser E2E (Phase J).
 *
 * These run in the Playwright (Node) process, NOT in the app, so a decode here
 * is a genuinely independent check of the exported bytes:
 *  - PNG  → pngjs + jsQR
 *  - PDF  → pdf.js (legacy) rasterised with @napi-rs/canvas, then jsQR
 *  - SVG  → rasterised by the real Chromium page, then jsQR (see decodeSvg)
 */
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import type { Page } from "@playwright/test";

type Frame = { width: number; height: number; data: Buffer };

/**
 * Box-resample a frame to a target width, compositing alpha over white. This is
 * exactly what a camera pipeline does before handing pixels to a decoder:
 * jsQR's local-threshold binarizer loses lock when modules dwarf its ~8px
 * analysis blocks, so a large, crisp export must be downscaled to scan — just
 * like a phone standing back from a poster. The decode itself is still jsQR on
 * the exported pixels; nothing is taken from the app's own verification.
 */
function resample(png: Frame, targetWidth: number): Frame {
  const width = Math.max(96, Math.round(targetWidth));
  const height = Math.max(96, Math.round((png.height * width) / png.width));
  const out = Buffer.alloc(width * height * 4);
  const strideX = png.width / width;
  const strideY = png.height / height;
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * strideY);
    const y1 = Math.max(y0 + 1, Math.ceil((y + 1) * strideY));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * strideX);
      const x1 = Math.max(x0 + 1, Math.ceil((x + 1) * strideX));
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let sy = y0; sy < y1 && sy < png.height; sy++) {
        for (let sx = x0; sx < x1 && sx < png.width; sx++) {
          const off = (sy * png.width + sx) * 4;
          const a = png.data[off + 3] / 255;
          r += png.data[off] * a + 255 * (1 - a);
          g += png.data[off + 1] * a + 255 * (1 - a);
          b += png.data[off + 2] * a + 255 * (1 - a);
          count++;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = Math.round(r / count);
      out[o + 1] = Math.round(g / count);
      out[o + 2] = Math.round(b / count);
      out[o + 3] = 255;
    }
  }
  return { width, height, data: out };
}

/** Decode a PNG buffer to its QR text, trying a scanner-like width ladder. */
export function decodePng(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const ladder = [1, 0.66, 0.5, 0.375, 0.28, 0.2]
    .map((f) => Math.round(png.width * f))
    .filter((w, i, arr) => w >= 96 && arr.indexOf(w) === i);
  for (const width of ladder) {
    const frame = width === png.width ? png : resample(png, width);
    const result = jsQR(
      new Uint8ClampedArray(frame.data),
      frame.width,
      frame.height,
    );
    if (result) return result.data;
  }
  return null;
}

/**
 * Decode a transparent PNG the way a scanner sees it on white paper. The shared
 * decoder already composites alpha over white at every scale, so this is the
 * same robust path; kept as a named helper to document intent at the call site.
 */
export function decodePngOnWhite(buffer: Buffer): string | null {
  return decodePng(buffer);
}

// pdf.js needs these browser globals when rasterising under Node.
const g = globalThis as Record<string, unknown>;
g.DOMMatrix ??= DOMMatrix;
g.ImageData ??= ImageData;
g.Path2D ??= Path2D;

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(
    pair: { canvas: ReturnType<typeof createCanvas> },
    width: number,
    height: number,
  ) {
    pair.canvas.width = width;
    pair.canvas.height = height;
  }
  destroy(pair: { canvas: ReturnType<typeof createCanvas> | null }) {
    if (pair.canvas) {
      pair.canvas.width = 0;
      pair.canvas.height = 0;
      pair.canvas = null;
    }
  }
}

/** Rasterise page 1 of a PDF and decode the QR it contains. */
export async function decodePdf(buffer: Buffer): Promise<string | null> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const factory = new NodeCanvasFactory();
  // The legacy Node build accepts canvasFactory + canvasContext at runtime
  // (verified); the published 6.x types describe the browser-only surface, so
  // the Node-shaped params are cast rather than reshaped.
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    canvasFactory: factory,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  } as never);
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 3 });
    const pair = factory.create(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    await page.render({
      canvasContext: pair.context,
      viewport,
      background: "#ffffff",
    } as never).promise;
    return decodePng(pair.canvas.toBuffer("image/png"));
  } finally {
    await task.destroy();
  }
}

/**
 * Rasterise an exported SVG in the real browser and decode it. The SVG is
 * injected into a blank page (no app CSP), sized to its viewBox, screenshotted,
 * and the resulting PNG decoded with jsQR.
 */
export async function decodeSvg(
  page: Page,
  svgText: string,
): Promise<string | null> {
  // Rasterise on a scratch page so the studio page (and its state) is untouched.
  const scratch = await page.context().newPage();
  try {
    await scratch.setContent(
      `<!doctype html><html><body style="margin:0;background:#fff">${svgText}</body></html>`,
    );
    const svg = scratch.locator("svg").first();
    await svg.evaluate((el) => {
      const vb = (el as SVGSVGElement).viewBox.baseVal;
      const w = vb && vb.width ? vb.width : 512;
      const h = vb && vb.height ? vb.height : 512;
      el.setAttribute("width", String(w));
      el.setAttribute("height", String(h));
    });
    const shot = await svg.screenshot({ type: "png" });
    return decodePng(shot);
  } finally {
    await scratch.close();
  }
}
