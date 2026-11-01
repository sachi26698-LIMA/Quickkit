/**
 * Image Compressor — local, DOM-based compression pipeline.
 *
 * Decode → draw at the source dimensions (or a downscaled size when a target
 * must be reached) → encode with canvas.toBlob. Nothing leaves the browser.
 */

import { inspectImageHeader } from "./image-header";
import { MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS } from "./image-input";
import {
  MAX_QUALITY,
  MIN_QUALITY,
  downscaleRatio,
  downscaledSize,
  keepsTransparency,
  usesQuality,
  type CompressFormat,
  type CompressMode,
  type QualitySample,
} from "./image-compress";

export type CompressSettings = {
  format: CompressFormat;
  mode: CompressMode;
  /** 10–100, ignored by PNG. */
  quality: number;
  /** Only used when mode === "target". */
  targetBytes: number;
  allowDownscale: boolean;
  /** JPEG flatten colour. */
  background: string;
};

export type CompressOutput = {
  blob: Blob;
  width: number;
  height: number;
  /** Quality actually used (100 for PNG). */
  quality: number;
  targetMet: boolean;
  scaled: boolean;
  attempts: number;
};

/** Hard ceiling for encodes per image, across every downscale pass. */
export const MAX_TOTAL_ATTEMPTS = 26;
/** Downscale passes attempted before giving up on an unreachable target. */
export const MAX_SCALE_PASSES = 4;

export class CompressCancelled extends Error {
  constructor() {
    super("Compression cancelled.");
    this.name = "CompressCancelled";
  }
}

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export function validateCompressInput(file: { type: string; size: number }) {
  if (!SUPPORTED_TYPES.includes(file.type as (typeof SUPPORTED_TYPES)[number]))
    throw new Error(
      "Choose a JPEG, PNG, WebP or AVIF image. Other formats are not supported.",
    );
  if (!file.size) throw new Error("This file is empty. Choose another image.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Choose an image smaller than 15 MB.");
}

/**
 * Bounded AVIF (ISO-BMFF) dimension read: find the `ispe` box and use its
 * 32-bit width/height. Cheap and allocation-free compared with a decode.
 */
function inspectAvif(bytes: Uint8Array) {
  if (bytes.length < 16) throw invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) !== "ftyp")
    throw invalid();
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (!["avif", "avis", "mif1", "msf1"].includes(brand)) throw invalid();
  const limit = Math.min(bytes.length, 256 * 1024);
  for (let index = 0; index + 16 <= limit; index += 1) {
    if (
      bytes[index] === 0x69 && // i
      bytes[index + 1] === 0x73 && // s
      bytes[index + 2] === 0x70 && // p
      bytes[index + 3] === 0x65 // e
    ) {
      const width = view.getUint32(index + 8);
      const height = view.getUint32(index + 12);
      if (width > 0 && height > 0 && width <= 100_000 && height <= 100_000)
        return {
          width,
          height,
        };
    }
  }
  throw invalid();
}

const invalid = () =>
  new Error(
    "This image could not be decoded. Check its contents and file type.",
  );

export async function inspectCompressFile(file: File) {
  validateCompressInput(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions =
    file.type === "image/avif"
      ? inspectAvif(bytes)
      : inspectImageHeader(bytes, file.type);
  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS)
    throw new Error(
      "Use an image up to 24 megapixels, with neither side above 8,192 pixels.",
    );
  return dimensions;
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      if (bitmap.width && bitmap.height)
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close: () => bitmap.close(),
        };
      bitmap.close();
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw invalid();
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(url),
  };
}

function drawCanvas(
  decoded: Decoded,
  width: number,
  height: number,
  format: CompressFormat,
  background: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Canvas processing is unavailable in this browser.");
  if (!keepsTransparency(format)) {
    context.fillStyle = /^#[0-9a-f]{6}$/i.test(background)
      ? background
      : "#ffffff";
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(decoded.source, 0, 0, width, height);
  return canvas;
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: CompressFormat,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The browser could not encode this image."));
          return;
        }
        if (blob.type !== format) {
          reject(
            new Error(
              `Your browser cannot encode ${format.replace("image/", "").toUpperCase()}. Choose JPEG, PNG or WebP.`,
            ),
          );
          return;
        }
        resolve(blob);
      },
      format,
      usesQuality(format)
        ? Math.min(1, Math.max(0.01, quality / 100))
        : undefined,
    );
  });
}

/**
 * Highest quality that fits the target, or the smallest sample if none fits.
 * Each call gets its own probe budget so later downscale passes still search,
 * while `attempts` keeps the whole job bounded.
 */
async function searchQuality(
  makeSampler: (
    quality: number,
  ) => Promise<{ blob: Blob; canvas: HTMLCanvasElement }>,
  targetBytes: number,
  attempts: { count: number },
  isCancelled?: () => boolean,
): Promise<{
  blob: Blob;
  quality: number;
  canvas: HTMLCanvasElement;
  samples: QualitySample[];
  fits: boolean;
}> {
  const samples: QualitySample[] = [];
  const encodeAt = async (quality: number) => {
    if (isCancelled?.()) throw new CompressCancelled();
    const { blob, canvas } = await makeSampler(quality);
    attempts.count += 1;
    samples.push({ quality, bytes: blob.size });
    return { blob, canvas };
  };

  const top = await encodeAt(MAX_QUALITY);
  if (top.blob.size <= targetBytes)
    return {
      blob: top.blob,
      quality: MAX_QUALITY,
      canvas: top.canvas,
      samples,
      fits: true,
    };

  let smallest = { ...top, quality: MAX_QUALITY };
  let best: { blob: Blob; canvas: HTMLCanvasElement; quality: number } | null =
    null;
  let low = MIN_QUALITY;
  let high = MAX_QUALITY - 1;

  let probes = 0;
  while (low <= high && probes < 8 && attempts.count < MAX_TOTAL_ATTEMPTS) {
    probes += 1;
    const mid = Math.round((low + high) / 2);
    const result = await encodeAt(mid);
    if (result.blob.size <= targetBytes) {
      if (!best || mid > best.quality) best = { ...result, quality: mid };
      low = mid + 1;
    } else {
      if (result.blob.size < smallest.blob.size)
        smallest = { ...result, quality: mid };
      high = mid - 1;
    }
  }

  if (best)
    return {
      blob: best.blob,
      quality: best.quality,
      canvas: best.canvas,
      samples,
      fits: true,
    };
  return {
    blob: smallest.blob,
    quality: smallest.quality,
    canvas: smallest.canvas,
    samples,
    fits: false,
  };
}

export async function compressImageFile(
  file: File,
  settings: CompressSettings,
  isCancelled?: () => boolean,
): Promise<CompressOutput> {
  await inspectCompressFile(file);
  const decoded = await decodeImage(file);
  try {
    const attempts = { count: 0 };
    const isTarget = settings.mode === "target";

    if (!isTarget) {
      if (isCancelled?.()) throw new CompressCancelled();
      const canvas = drawCanvas(
        decoded,
        decoded.width,
        decoded.height,
        settings.format,
        settings.background,
      );
      const quality = usesQuality(settings.format) ? settings.quality : 100;
      const blob = await encodeCanvas(canvas, settings.format, quality);
      canvas.width = 0;
      canvas.height = 0;
      return {
        blob,
        width: decoded.width,
        height: decoded.height,
        quality,
        targetMet: true,
        scaled: false,
        attempts: 1,
      };
    }

    let width = decoded.width;
    let height = decoded.height;
    let scaled = false;
    /** Smallest encode produced so far — the honest fallback if the target
     * cannot be met without visible damage. */
    let smallest: {
      blob: Blob;
      quality: number;
      width: number;
      height: number;
      samples: QualitySample[];
    } | null = null;

    for (let pass = 0; pass < MAX_SCALE_PASSES; pass += 1) {
      const size = { width, height };
      const outcome = await searchQuality(
        async (quality) => {
          const canvas = drawCanvas(
            decoded,
            size.width,
            size.height,
            settings.format,
            settings.background,
          );
          const blob = await encodeCanvas(canvas, settings.format, quality);
          return { blob, canvas };
        },
        settings.targetBytes,
        attempts,
        isCancelled,
      );
      outcome.canvas.width = 0;
      outcome.canvas.height = 0;
      if (!smallest || outcome.blob.size < smallest.blob.size)
        smallest = {
          blob: outcome.blob,
          quality: outcome.quality,
          width,
          height,
          samples: outcome.samples,
        };
      if (outcome.fits)
        return {
          blob: outcome.blob,
          width,
          height,
          quality: outcome.quality,
          targetMet: true,
          scaled,
          attempts: attempts.count,
        };

      if (!settings.allowDownscale) break;
      const floor = Math.min(...outcome.samples.map((sample) => sample.bytes));
      const ratio = downscaleRatio(floor, settings.targetBytes);
      const next = downscaledSize(width, height, ratio);
      if (!next.changed) break;
      width = next.width;
      height = next.height;
      scaled = true;
      if (attempts.count >= MAX_TOTAL_ATTEMPTS) break;
    }

    if (!smallest) throw new Error("The browser could not encode this image.");
    return {
      blob: smallest.blob,
      width: smallest.width,
      height: smallest.height,
      quality: smallest.quality,
      targetMet: false,
      scaled:
        smallest.width !== decoded.width || smallest.height !== decoded.height,
      attempts: attempts.count,
    };
  } finally {
    decoded.close();
  }
}

/* ------------------------------- capability ------------------------------- */

const supportCache = new Map<CompressFormat, boolean>();

export function canEncode(format: CompressFormat) {
  const cached = supportCache.get(format);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;
  const data = canvas.toDataURL(format);
  canvas.width = 0;
  canvas.height = 0;
  // Environments without a real canvas (SSR/jsdom) return null; treat the
  // capability as unknown-but-enabled rather than disabling every format.
  const supported =
    typeof data !== "string" ? true : data.startsWith(`data:${format}`);
  supportCache.set(format, supported);
  return supported;
}

export function formatSupport(): Record<CompressFormat, boolean> {
  return {
    "image/jpeg": canEncode("image/jpeg"),
    "image/png": canEncode("image/png"),
    "image/webp": canEncode("image/webp"),
    "image/avif": canEncode("image/avif"),
  };
}
