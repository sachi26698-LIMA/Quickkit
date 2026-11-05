/**
 * Client for the decoding worker.
 *
 * Same contract as the PDF tools: requests are matched by id, the raster buffer
 * is transferred (not copied), and every request has a main-thread fallback so a
 * browser that cannot start a module Worker — or one whose Worker dies mid-scan
 * — still decodes, just synchronously.
 */
import { decodeRaster } from "./decoder";
import type { DecodedSymbol, ImageAdjustments, Raster } from "./types";
import type {
  QrScanWorkerRequest,
  QrScanWorkerResponse,
} from "@/workers/qr-scan.worker";

export type ScanResult = {
  symbols: DecodedSymbol[];
  attempts: string[];
};

type Pending = {
  resolve: (result: ScanResult) => void;
  reject: (error: Error) => void;
  fallback: () => ScanResult;
};

let worker: Worker | null = null;
let workerBroken = false;
let sequence = 0;
const pending = new Map<string, Pending>();

function fallbackFor(
  raster: Raster,
  profile: "image" | "frame" | "precise",
  adjustments?: Partial<ImageAdjustments>,
): ScanResult {
  return decodeRaster({
    raster: {
      width: raster.width,
      height: raster.height,
      rgba: new Uint8ClampedArray(raster.rgba),
    },
    profile,
    adjustments,
  });
}

function failAll(reason: string) {
  for (const [, entry] of pending) {
    try {
      entry.resolve(entry.fallback());
    } catch (error) {
      entry.reject(error instanceof Error ? error : new Error(reason));
    }
  }
  pending.clear();
}

function getWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  if (typeof Worker === "undefined") {
    workerBroken = true;
    return null;
  }
  try {
    const instance = new Worker(
      new URL("../../../workers/qr-scan.worker.ts", import.meta.url),
      { type: "module" },
    );
    instance.addEventListener(
      "message",
      (event: MessageEvent<QrScanWorkerResponse>) => {
        const entry = pending.get(event.data.id);
        if (!entry) return;
        pending.delete(event.data.id);
        if (event.data.ok)
          entry.resolve({
            symbols: event.data.symbols,
            attempts: event.data.attempts,
          });
        else entry.resolve(entry.fallback());
      },
    );
    instance.addEventListener("error", () => {
      workerBroken = true;
      worker = null;
      failAll("The decoding worker stopped unexpectedly.");
    });
    worker = instance;
    return instance;
  } catch {
    workerBroken = true;
    return null;
  }
}

/**
 * Decode a raster, off the main thread when possible.
 *
 * The caller's raster is never mutated: the bytes handed to the worker are a
 * private copy, so a `frame`-profile call cannot blank out an image the UI is
 * still showing.
 */
export function scanRaster(
  raster: Raster,
  options: {
    profile?: "image" | "frame" | "precise";
    adjustments?: Partial<ImageAdjustments>;
  } = {},
): Promise<ScanResult> {
  const profile = options.profile ?? "image";
  const adjustments = options.adjustments;
  const instance = getWorker();
  const fallback = () => fallbackFor(raster, profile, adjustments);
  if (!instance) return Promise.resolve(fallback());

  const id = `scan-${(sequence += 1)}`;
  // A private copy: transferable, so it must not alias the caller's pixels.
  const buffer = new Uint8ClampedArray(raster.rgba).buffer;
  const request: QrScanWorkerRequest = {
    id,
    width: raster.width,
    height: raster.height,
    buffer,
    profile,
    adjustments,
  };
  return new Promise<ScanResult>((resolve, reject) => {
    pending.set(id, { resolve, reject, fallback });
    try {
      instance.postMessage(request, [buffer]);
    } catch {
      pending.delete(id);
      try {
        resolve(fallback());
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Decoding failed."));
      }
    }
  });
}

/** Terminate the worker so a closed tab or a finished batch leaks nothing. */
export function disposeScanWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pending.clear();
}

/** Test seam: forget the cached worker state. */
export function resetScanWorkerForTests() {
  disposeScanWorker();
  workerBroken = false;
  sequence = 0;
}
