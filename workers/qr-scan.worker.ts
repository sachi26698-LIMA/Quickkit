/**
 * Decoding worker.
 *
 * Decoding is CPU-bound and, on a hard image, takes long enough to drop frames.
 * Running it off the main thread keeps the camera preview and the UI live while
 * a batch grinds through forty screenshots.
 *
 * The raster travels in as a transferable `ArrayBuffer`, so a 12-megapixel photo
 * is moved rather than copied. Everything the worker needs is imported from the
 * same pure modules the tests use — there is no second decoder implementation.
 */
import { decodeRaster } from "@/lib/tools/qr-scanner/decoder";
import type {
  DecodedSymbol,
  ImageAdjustments,
} from "@/lib/tools/qr-scanner/types";

export type QrScanWorkerRequest = {
  id: string;
  width: number;
  height: number;
  /** RGBA bytes, transferred. */
  buffer: ArrayBuffer;
  profile: "image" | "frame" | "precise";
  adjustments?: Partial<ImageAdjustments>;
};

export type QrScanWorkerSuccess = {
  id: string;
  ok: true;
  symbols: DecodedSymbol[];
  attempts: string[];
};

export type QrScanWorkerFailure = {
  id: string;
  ok: false;
  error: string;
};

export type QrScanWorkerResponse = QrScanWorkerSuccess | QrScanWorkerFailure;

self.addEventListener("message", (event: MessageEvent<QrScanWorkerRequest>) => {
  const { id, width, height, buffer, profile, adjustments } = event.data;
  try {
    const result = decodeRaster({
      raster: { width, height, rgba: new Uint8ClampedArray(buffer) },
      profile,
      adjustments,
    });
    const response: QrScanWorkerSuccess = {
      id,
      ok: true,
      symbols: result.symbols,
      attempts: result.attempts,
    };
    (self as unknown as Worker).postMessage(response);
  } catch (error) {
    const response: QrScanWorkerFailure = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : "The decoder failed.",
    };
    (self as unknown as Worker).postMessage(response);
  }
});
