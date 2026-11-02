import type { PdfTextItem } from "./types";
import { PdfToWordError } from "./types";

/**
 * Optional OCR for scanned pages, powered by tesseract.js running entirely
 * in the browser. Engine files (worker, WASM cores, English data) are
 * self-hosted under /ocr (copied at build time by
 * scripts/copy-ocr-assets.mjs) — nothing is loaded from a CDN and page
 * images never leave the device.
 */

interface OcrLine {
  text?: string;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

interface OcrResultData {
  text?: string;
  lines?: OcrLine[];
  blocks?: {
    paragraphs?: { lines?: OcrLine[] }[];
  }[];
}

interface TessWorker {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: OcrResultData }>;
  terminate: () => Promise<void>;
}

interface TessModule {
  createWorker: (
    langs: string,
    oem?: number,
    options?: Record<string, unknown>,
  ) => Promise<TessWorker>;
}

let workerPromise: Promise<TessWorker> | null = null;
let progressListener: ((fraction: number) => void) | null = null;

const WORKER_INIT_TIMEOUT_MS = 90_000;
const RECOGNIZE_TIMEOUT_MS = 180_000;

/** Reject if `promise` does not settle in time (a dead worker must never hang the UI). */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  makeError: () => PdfToWordError,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(makeError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : makeError());
      },
    );
  });
}

async function getWorker(): Promise<TessWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      let tess: TessModule;
      try {
        tess = (await import("tesseract.js")) as unknown as TessModule;
      } catch {
        throw new PdfToWordError(
          "ocr-unavailable",
          "The OCR engine could not be loaded in this browser.",
        );
      }
      try {
        return await withTimeout(
          tess.createWorker("eng", undefined, {
            // Same-origin worker script: load it directly instead of the
            // default Blob-URL wrapper (which our CSP rightly blocks).
            workerBlobURL: false,
            workerPath: "/ocr/worker.min.js",
            corePath: "/ocr/",
            langPath: "/ocr/",
            gzip: true,
            cacheMethod: "none",
            logger: (m: { status?: string; progress?: number }) => {
              if (m.status === "recognizing text" && progressListener) {
                progressListener(m.progress ?? 0);
              }
            },
          }),
          WORKER_INIT_TIMEOUT_MS,
          () =>
            new PdfToWordError(
              "ocr-unavailable",
              "The OCR engine took too long to start. Check your connection and try again.",
            ),
        );
      } catch (error) {
        if (error instanceof PdfToWordError) throw error;
        throw new PdfToWordError(
          "ocr-unavailable",
          "The OCR engine files could not be loaded. OCR is unavailable right now.",
        );
      }
    })();
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

function linesFrom(data: OcrResultData): OcrLine[] {
  if (data.lines && data.lines.length) return data.lines;
  const fromBlocks: OcrLine[] = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) fromBlocks.push(line);
    }
  }
  return fromBlocks;
}

/**
 * Recognize one rendered page. `scale` is pixels-per-point of the render;
 * returned items are in PDF points, ready for the structuring pipeline.
 */
export async function recognizeCanvas(
  canvas: HTMLCanvasElement,
  scale: number,
  onProgress?: (fraction: number) => void,
): Promise<PdfTextItem[]> {
  const worker = await getWorker();
  progressListener = onProgress ?? null;
  let data: OcrResultData;
  try {
    const result = await withTimeout(
      worker.recognize(canvas),
      RECOGNIZE_TIMEOUT_MS,
      () =>
        new PdfToWordError(
          "ocr-failed",
          "OCR timed out on this page, so the page was skipped.",
        ),
    );
    data = result.data;
  } catch (error) {
    if (error instanceof PdfToWordError) {
      // Timed out — the worker may be wedged, so never reuse it.
      void terminateOcr();
      throw error;
    }
    throw new PdfToWordError(
      "ocr-failed",
      "OCR could not read this page. It may be blank, rotated or too low-resolution.",
    );
  } finally {
    progressListener = null;
  }

  const items: PdfTextItem[] = [];
  for (const line of linesFrom(data)) {
    const text = (line.text ?? "").trim();
    if (!text || !line.bbox) continue;
    const heightPx = Math.max(1, line.bbox.y1 - line.bbox.y0);
    items.push({
      text,
      x: line.bbox.x0 / scale,
      y: line.bbox.y0 / scale,
      width: (line.bbox.x1 - line.bbox.x0) / scale,
      // OCR bbox height approximates line height (~1.25em).
      fontSize: (heightPx / scale) * 0.8,
      bold: false,
      italic: false,
    });
  }

  if (items.length === 0 && data.text?.trim()) {
    // Defensive fallback if a build returns text without geometry.
    const lines = data.text.split(/\r?\n/).filter((l) => l.trim());
    const lineHeight = 14;
    lines.forEach((text, index) => {
      items.push({
        text: text.trim(),
        x: 0,
        y: index * lineHeight * 1.4,
        width: text.trim().length * lineHeight * 0.5,
        fontSize: lineHeight,
        bold: false,
        italic: false,
      });
    });
  }
  return items;
}

/** Release the OCR worker (call when a batch finishes). */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // Worker never started; nothing to release.
  }
}
