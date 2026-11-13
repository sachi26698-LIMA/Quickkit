/**
 * Barcode decoding worker.
 *
 * A 1D decode is cheap; four rotations plus a tiled sweep of a 12-megapixel
 * photo is not, and doing it on the main thread drops the camera preview to
 * single-digit frames. The raster arrives as a transferable buffer, so the
 * pixels are moved rather than copied, and the worker imports the same decoder
 * the tests use — there is no second implementation.
 */
import { decodeBarcodes, type DecodeProfile } from "@/lib/tools/barcode/decode";
import type { DecodedBarcode } from "@/lib/tools/barcode/types";

export type BarcodeScanWorkerRequest = {
  id: string;
  width: number;
  height: number;
  /** RGBA bytes, transferred. */
  buffer: ArrayBuffer;
  profile: DecodeProfile;
};

export type BarcodeScanWorkerSuccess = {
  id: string;
  ok: true;
  barcodes: DecodedBarcode[];
  attempts: string[];
};

export type BarcodeScanWorkerFailure = {
  id: string;
  ok: false;
  error: string;
};

export type BarcodeScanWorkerResponse =
  BarcodeScanWorkerSuccess | BarcodeScanWorkerFailure;

self.addEventListener(
  "message",
  (event: MessageEvent<BarcodeScanWorkerRequest>) => {
    const { id, width, height, buffer, profile } = event.data;
    try {
      const result = decodeBarcodes(
        { width, height, rgba: new Uint8ClampedArray(buffer) },
        { profile },
      );
      const response: BarcodeScanWorkerSuccess = {
        id,
        ok: true,
        barcodes: result.barcodes,
        attempts: result.attempts,
      };
      (self as unknown as Worker).postMessage(response);
    } catch (error) {
      const response: BarcodeScanWorkerFailure = {
        id,
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "The barcode decoder failed.",
      };
      (self as unknown as Worker).postMessage(response);
    }
  },
);
