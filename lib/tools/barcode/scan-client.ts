/**
 * Client for the barcode decoding worker.
 *
 * Requests are matched by id, the raster is transferred rather than copied, and
 * every request has a main-thread fallback so a browser that cannot start a
 * module Worker — or one whose worker dies mid-scan — still decodes, just
 * synchronously.
 */
import { decodeBarcodes, type DecodeProfile, type Raster } from "./decode";
import type { DecodedBarcode } from "./types";
import type {
  BarcodeScanWorkerRequest,
  BarcodeScanWorkerResponse,
} from "@/workers/barcode-scan.worker";

export type BarcodeScanResult = {
  barcodes: DecodedBarcode[];
  attempts: string[];
};

type Pending = {
  resolve: (result: BarcodeScanResult) => void;
  reject: (error: Error) => void;
  fallback: () => BarcodeScanResult;
};

let worker: Worker | null = null;
let workerBroken = false;
let sequence = 0;
const pending = new Map<string, Pending>();

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../../workers/barcode-scan.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (event: MessageEvent<BarcodeScanWorkerResponse>) => {
      const response = event.data;
      const entry = pending.get(response.id);
      if (!entry) return;
      pending.delete(response.id);
      if (response.ok)
        entry.resolve({ barcodes: response.barcodes, attempts: response.attempts });
      else entry.reject(new Error(response.error));
    });
    worker.addEventListener("error", () => {
      // A worker that fails to start must not take the tool down: mark it
      // broken, fall back for everything in flight, and decode inline from now
      // on.
      workerBroken = true;
      for (const [id, entry] of pending) {
        pending.delete(id);
        try {
          entry.resolve(entry.fallback());
        } catch (error) {
          entry.reject(error instanceof Error ? error : new Error("Decoding failed."));
        }
      }
      worker?.terminate();
      worker = null;
    });
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

function fallbackFor(raster: Raster, profile: DecodeProfile) {
  return () => decodeBarcodes(raster, { profile });
}

/** Decode a raster, preferring the worker. */
export function scanRaster(
  raster: Raster,
  profile: DecodeProfile = "image",
): Promise<BarcodeScanResult> {
  const instance = getWorker();
  const fallback = fallbackFor(raster, profile);
  if (!instance) return Promise.resolve(fallback());

  const id = `barcode-${(sequence += 1)}`;
  const buffer = new Uint8ClampedArray(raster.rgba).buffer;
  const request: BarcodeScanWorkerRequest = {
    id,
    width: raster.width,
    height: raster.height,
    buffer,
    profile,
  };
  return new Promise<BarcodeScanResult>((resolve, reject) => {
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

export function disposeScanWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pending.clear();
}

/** Test seam: forget cached worker state. */
export function resetScanWorkerForTests() {
  disposeScanWorker();
  workerBroken = false;
  sequence = 0;
}
