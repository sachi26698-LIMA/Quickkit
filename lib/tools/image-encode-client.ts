/**
 * Client for the encoder worker. Requests are matched by id, bytes come back
 * transferred, and everything falls back to the main thread if a Worker cannot
 * be created (older Safari, hardened browser settings).
 */
import {
  encodeBmp,
  encodeGif,
  encodeTiff,
  type RgbaImage,
} from "@/lib/tools/image-codec";
import type {
  ImageEncodeRequest,
  ImageEncodeResponse,
} from "@/workers/image-encode.worker";

export type SpecialFormat = "bmp" | "gif" | "tiff";

export type EncodeOptions = {
  background: string;
  transparent: boolean;
  compression: "lzw" | "none";
  dpi: number;
};

type Pending = {
  resolve: (bytes: Uint8Array) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let workerBroken = false;
let sequence = 0;
const pending = new Map<string, Pending>();

function getWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  if (typeof Worker === "undefined") {
    workerBroken = true;
    return null;
  }
  try {
    const instance = new Worker(
      new URL("../../workers/image-encode.worker.ts", import.meta.url),
      { type: "module" },
    );
    instance.addEventListener(
      "message",
      (event: MessageEvent<ImageEncodeResponse>) => {
        const request = pending.get(event.data.id);
        if (!request) return;
        pending.delete(event.data.id);
        if (event.data.type === "done") request.resolve(event.data.bytes);
        else request.reject(new Error(event.data.message));
      },
    );
    instance.addEventListener("error", () => {
      workerBroken = true;
      for (const request of pending.values())
        request.reject(
          new Error("The background encoder stopped unexpectedly."),
        );
      pending.clear();
      worker = null;
    });
    worker = instance;
    return instance;
  } catch {
    workerBroken = true;
    return null;
  }
}

function encodeHere(
  image: RgbaImage,
  format: SpecialFormat,
  options: EncodeOptions,
): Uint8Array {
  if (format === "bmp") return encodeBmp(image, options.background);
  if (format === "gif")
    return encodeGif(image, { transparent: options.transparent });
  return encodeTiff(image, {
    compression: options.compression,
    dpi: options.dpi,
  });
}

/** Encode RGBA pixels to BMP, GIF or TIFF, off-thread when possible. */
export async function encodeSpecial(
  image: RgbaImage,
  format: SpecialFormat,
  options: EncodeOptions,
): Promise<Uint8Array> {
  const instance = getWorker();
  if (!instance) return encodeHere(image, format, options);

  const id = `encode-${sequence++}`;
  const buffer = image.data.slice().buffer as ArrayBuffer;
  const request: ImageEncodeRequest = {
    id,
    format,
    width: image.width,
    height: image.height,
    buffer,
    background: options.background,
    transparent: options.transparent,
    compression: options.compression,
    dpi: options.dpi,
  };
  return new Promise<Uint8Array>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      instance.postMessage(request, [buffer]);
    } catch (error) {
      pending.delete(id);
      try {
        resolve(encodeHere(image, format, options));
      } catch {
        reject(
          error instanceof Error
            ? error
            : new Error("The encoder could not start."),
        );
      }
    }
  });
}

/** Stop the worker after a batch so its memory is released promptly. */
export function resetImageEncoder() {
  if (!worker) return;
  worker.terminate();
  worker = null;
  for (const request of pending.values())
    request.reject(new Error("The conversion was cancelled."));
  pending.clear();
}
