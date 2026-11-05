/**
 * Turning uploaded files into rasters.
 *
 * A note on formats, because this is where tools usually overpromise:
 *
 * · JPG, PNG, WebP, GIF (first frame) and BMP all decode through the browser's
 *   own image pipeline, so if `<img>` can show it, this can scan it.
 * · HEIC/HEIF is *not* decodable in most browsers today. Chrome, Edge and
 *   Firefox cannot decode it at all; Safari can. The file is accepted and given
 *   to the browser, and if the browser cannot decode it the user is told the
 *   truth instead of a generic "invalid image".
 * · SVG, PDF and everything else are rejected before any work is done.
 *
 * EXIF orientation is applied by the browser during `img.decode()`, which is
 * what makes phone photos arrive the right way up.
 */
import type { Raster } from "./types";

export const MAX_SCAN_BYTES = 25 * 1024 * 1024;
export const MAX_SCAN_PIXELS = 40_000_000;

export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/avif",
  "image/heic",
  "image/heif",
];

export const ACCEPT_ATTRIBUTE =
  "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif";

/** True when the file is a type this tool will attempt. */
export function isAcceptedFile(file: { type: string; name: string }): boolean {
  if (ACCEPTED_TYPES.includes(file.type.toLocaleLowerCase())) return true;
  // Some platforms report an empty type for HEIC and BMP; fall back to the
  // extension rather than rejecting a file the browser may well decode.
  return /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name);
}

export class ImageLoadError extends Error {
  code: "type" | "size" | "decode" | "pixels" | "canvas";
  constructor(code: ImageLoadError["code"], message: string) {
    super(message);
    this.name = "ImageLoadError";
    this.code = code;
  }
}

export function validateScanFile(file: File): void {
  if (!isAcceptedFile(file))
    throw new ImageLoadError(
      "type",
      `${file.name}: unsupported file type. Use JPG, PNG, WebP, GIF or BMP — HEIC only where your browser can decode it.`,
    );
  if (!file.size)
    throw new ImageLoadError("size", `${file.name}: this file is empty.`);
  if (file.size > MAX_SCAN_BYTES)
    throw new ImageLoadError(
      "size",
      `${file.name}: larger than 25 MB. Crop or shrink the image first.`,
    );
}

/**
 * Decode a file to an RGBA raster, capped in size.
 *
 * Large photos are downscaled to `maxSide` *before* the pixels are read, which
 * keeps a 40-megapixel phone photo from allocating 160 MB of RGBA.
 */
export async function fileToRaster(
  file: File,
  options: { maxSide?: number } = {},
): Promise<Raster> {
  validateScanFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new ImageLoadError(
        "decode",
        `${file.name}: your browser cannot decode this image${
          /heic|heif/i.test(file.name + file.type)
            ? " — HEIC is only supported in Safari. Export it as JPEG and try again"
            : ""
        }. It may be damaged or in an unsupported format.`,
      );
    }
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!naturalWidth || !naturalHeight)
      throw new ImageLoadError(
        "decode",
        `${file.name}: the image has no dimensions.`,
      );
    if (naturalWidth * naturalHeight > MAX_SCAN_PIXELS)
      throw new ImageLoadError(
        "pixels",
        `${file.name}: ${((naturalWidth * naturalHeight) / 1_000_000).toFixed(1)} megapixels is beyond the 40 MP limit.`,
      );
    const maxSide = options.maxSide ?? 2000;
    const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new ImageLoadError(
        "canvas",
        "Canvas processing is unavailable in this browser, so images cannot be read.",
      );
    // Composite onto white: a transparent PNG must not decode as a black field.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height);
    const raster: Raster = {
      width,
      height,
      rgba: new Uint8ClampedArray(data.data),
    };
    canvas.width = 0;
    canvas.height = 0;
    return raster;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decode a clipboard image (paste) through the same path as an upload. */
export async function blobToRaster(
  blob: Blob,
  name = "Pasted image",
  options: { maxSide?: number } = {},
): Promise<Raster> {
  const file = new File([blob], name, { type: blob.type || "image/png" });
  return fileToRaster(file, options);
}
