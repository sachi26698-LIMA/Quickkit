"use client";

/**
 * On-device OCR engine, powered by tesseract.js.
 *
 * The engine runs in its own Web Worker (created by tesseract.js), so
 * recognition never blocks the interface. Every asset is served from the same
 * origin under /ocr — copied at build time by scripts/copy-ocr-assets.mjs — so
 * no script, WASM core or language model is fetched from a third-party CDN,
 * and page images are handed straight to the worker as ImageData. Nothing is
 * uploaded, nothing is cached to disk (`cacheMethod: "none"`), and images are
 * never written anywhere but the worker's memory.
 */
import type { OcrLanguageCode } from "./types";
import { imageDataToPng } from "./encode";
import { OcrError } from "./types";
import { flattenLines, type RawBlock } from "./geometry";
import type { OcrLine } from "./types";

interface TessData {
  text?: string | null;
  confidence?: number | null;
  blocks?: RawBlock[] | null;
  rotateRadians?: number;
}

interface TessWorker {
  recognize: (
    image: Uint8Array | ImageData,
    options?: Record<string, unknown>,
    output?: Record<string, boolean>,
  ) => Promise<{ data: TessData }>;
  setParameters: (params: Record<string, string | number>) => Promise<unknown>;
  detect?: (
    image: Uint8Array | ImageData,
  ) => Promise<{ data: { orientation_degrees?: number | null } }>;
  terminate: () => Promise<void>;
}

interface TessModule {
  createWorker: (
    langs: string,
    oem?: number,
    options?: Record<string, unknown>,
  ) => Promise<TessWorker>;
  PSM: Record<string, string>;
}

export interface EngineProgress {
  status: string;
  progress: number;
}

const INIT_TIMEOUT_MS = 120_000;
const RECOGNIZE_BASE_TIMEOUT_MS = 150_000;

let modulePromise: Promise<TessModule> | null = null;
let activeWorker: {
  languageKey: string;
  promise: Promise<TessWorker>;
} | null = null;
let workerGeneration = 0;
/** Progress sink for the job currently running (one job at a time per worker). */
let progressSink: ((progress: EngineProgress) => void) | null = null;

/** Errors worth killing the worker for: a wedged worker must never be reused. */
function isFatal(error: unknown): boolean {
  if (error instanceof OcrError)
    return error.kind === "timeout" || error.kind === "cancelled";
  return false;
}

function loadModule(): Promise<TessModule> {
  if (!modulePromise) {
    modulePromise = import("tesseract.js")
      .then((module) => module as unknown as TessModule)
      .catch(() => {
        modulePromise = null;
        throw new OcrError(
          "engine-unavailable",
          "The on-device OCR engine could not be loaded. Check your connection and try again.",
        );
      });
  }
  return modulePromise;
}

async function terminateWorker(): Promise<void> {
  const current = activeWorker;
  activeWorker = null;
  workerGeneration += 1;
  if (!current) return;
  try {
    const worker = await current.promise;
    await worker.terminate();
  } catch {
    // Never started, or already gone: nothing to release.
  }
}

/**
 * Create (or reuse) a worker for the given language set. Changing languages
 * terminates the previous worker so memory is not held twice.
 */
export async function getWorker(
  languages: OcrLanguageCode[],
  onProgress?: (progress: EngineProgress) => void,
): Promise<TessWorker> {
  const key = [...languages].sort().join("+");
  if (activeWorker && activeWorker.languageKey !== key) await terminateWorker();
  if (!activeWorker) {
    const generation = workerGeneration;
    const promise = (async () => {
      const tess = await loadModule();
      const initProgress = (message: EngineProgress) => {
        if (generation !== workerGeneration) return;
        onProgress?.(message);
      };
      try {
        return await withTimeout(
          tess.createWorker(key, undefined, {
            // Same-origin assets only (see the file header).
            workerBlobURL: false,
            workerPath: "/ocr/worker.min.js",
            corePath: "/ocr/",
            langPath: "/ocr/",
            gzip: true,
            cacheMethod: "none",
            logger: (message: { status?: string; progress?: number }) => {
              const status = message.status ?? "";
              const progress = message.progress ?? 0;
              initProgress({ status, progress });
              progressSink?.({ status, progress });
            },
          }),
          INIT_TIMEOUT_MS,
          () =>
            new OcrError(
              "engine-unavailable",
              "The OCR engine took too long to start. Check your connection, then try again.",
            ),
        );
      } catch (error) {
        if (error instanceof OcrError) throw error;
        throw new OcrError(
          "engine-unavailable",
          "The OCR language model could not be loaded. OCR is unavailable right now.",
        );
      }
    })();
    promise.catch(() => {
      if (activeWorker?.promise === promise) activeWorker = null;
    });
    activeWorker = { languageKey: key, promise };
  }
  return activeWorker.promise;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  makeError: () => OcrError,
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

export interface RecognizeOptions {
  /** Tesseract page segmentation mode string, e.g. "3". */
  psm: string;
  /** Ask the engine to correct rotation automatically. */
  autoRotate: boolean;
  onProgress?: (progress: EngineProgress) => void;
  /** Cancellation: when aborted, the worker is terminated and the promise rejects. */
  signal?: AbortSignal;
}

export interface RecognizeResult {
  text: string;
  lines: OcrLine[];
  confidence: number;
  rotateRadians: number;
  durationMs: number;
}

/**
 * Recognise one prepared page. `image` is an ImageData produced by the
 * preprocessing pipeline (already rotated, cropped and enhanced).
 */
export async function recognizeImage(
  image: ImageData,
  languages: OcrLanguageCode[],
  options: RecognizeOptions,
): Promise<RecognizeResult> {
  const started = performance.now();
  const worker = await getWorker(languages, options.onProgress);
  if (options.signal?.aborted) {
    await terminateWorker();
    throw new OcrError("cancelled", "OCR was cancelled.");
  }
  progressSink = options.onProgress ?? null;
  // The engine only understands encoded bytes; see ./encode.ts for why.
  const encoded = await imageDataToPng(image);
  if (options.signal?.aborted) {
    throw new OcrError("cancelled", "OCR was cancelled.");
  }
  let data: TessData;
  try {
    const result = await withTimeout(
      worker.recognize(
        encoded,
        {
          tessedit_pageseg_mode: options.psm,
          rotateAuto: options.autoRotate,
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
        },
        { text: true, blocks: true },
      ),
      RECOGNIZE_BASE_TIMEOUT_MS,
      () =>
        new OcrError(
          "timeout",
          "OCR timed out on this page. It may be very large; try the Speed preference or a smaller area.",
        ),
    );
    data = result.data;
  } catch (error) {
    if (error instanceof OcrError || isFatal(error)) {
      await terminateWorker();
      throw error instanceof OcrError
        ? error
        : new OcrError(
            "engine-unavailable",
            "The OCR engine stopped responding.",
          );
    }
    throw new OcrError(
      "unreadable",
      "This page could not be read. It may be blank, blurred or in an unsupported script.",
    );
  } finally {
    progressSink = null;
  }

  const lines = flattenLines(data.blocks ?? null);
  const confidence =
    typeof data.confidence === "number"
      ? Math.round(data.confidence * 10) / 10
      : lines.length
        ? Math.round(
            (lines.reduce((sum, line) => sum + line.confidence, 0) /
              lines.length) *
              10,
          ) / 10
        : 0;
  return {
    text: (data.text ?? "").replace(/\r\n/gu, "\n"),
    lines,
    confidence,
    rotateRadians: data.rotateRadians ?? 0,
    durationMs: Math.round(performance.now() - started),
  };
}

/** Map the UI's segmentation choice onto tesseract page segmentation modes. */
export function psmFor(
  segmentation:
    "auto" | "single-column" | "single-block" | "single-line" | "sparse",
): string {
  switch (segmentation) {
    case "single-column":
      return "4"; // single column of text of variable sizes
    case "single-block":
      return "6"; // single uniform block of text
    case "single-line":
      return "7"; // single text line
    case "sparse":
      return "11"; // sparse text, find as much as possible
    case "auto":
    default:
      return "3"; // fully automatic page segmentation
  }
}

/** Line-count bbox helper used by tests and previews. */
export function pageBox(lines: OcrLine[]) {
  if (!lines.length) return { width: 0, height: 0 };
  return {
    width: Math.max(...lines.map((line) => line.bbox.x1)),
    height: Math.max(...lines.map((line) => line.bbox.y1)),
  };
}

/** Release the worker (call when a batch finishes or the tool unmounts). */
export async function releaseEngine(): Promise<void> {
  progressSink = null;
  await terminateWorker();
}

/** True when a worker is currently initialised for these languages. */
export function workerReady(languages: OcrLanguageCode[]): boolean {
  const key = [...languages].sort().join("+");
  return activeWorker?.languageKey === key;
}
