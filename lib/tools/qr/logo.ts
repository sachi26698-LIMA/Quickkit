/**
 * Safe logo intake.
 *
 * An uploaded image is decoded into raw RGBA pixels and *only* pixels are kept:
 * metadata (EXIF/GPS) and any embedded payloads are dropped by the decode, SVG
 * is refused outright because it can carry script, and no object URL is left
 * behind. Nothing is uploaded anywhere — the file never leaves this tab.
 */
import { QrUserError, type QrLogoImage } from "./types";

export const LOGO_MAX_BYTES = 3 * 1024 * 1024;
export const LOGO_WORK_SIZE = 512;
export const LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
];

const SIGNATURES: { label: string; test: (b: Uint8Array) => boolean }[] = [
  {
    label: "PNG",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    label: "JPEG",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    label: "GIF",
    test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  },
  {
    label: "WebP",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46,
  },
  { label: "BMP", test: (b) => b[0] === 0x42 && b[1] === 0x4d },
];

export function sniffImageType(bytes: Uint8Array) {
  const found = SIGNATURES.find((entry) => entry.test(bytes));
  return found?.label ?? null;
}

function assertSafeFile(file: File) {
  if (file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name))
    throw new QrUserError(
      "SVG logos are not accepted — an SVG can contain scripts. Export a PNG or use a screenshot of your mark.",
      "logo",
    );
  if (file.type && !LOGO_TYPES.includes(file.type))
    throw new QrUserError(
      "Use a PNG, JPEG, WebP, GIF or BMP file for the logo.",
      "logo",
    );
  if (file.size > LOGO_MAX_BYTES)
    throw new QrUserError(
      `That logo is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep it under 3 MB.`,
      "logo",
    );
  if (file.size < 24)
    throw new QrUserError("That file is too small to be an image.", "logo");
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to the <img> path (Safari + AVIF, odd GIFs) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new QrUserError("That image could not be decoded.", "logo"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function context(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new QrUserError("This browser cannot read image pixels.");
  return { canvas, ctx };
}

/**
 * Decode, square-crop-fit and downsample a logo.
 * The result is `LOGO_WORK_SIZE`² RGBA — at most ~1 MB, whatever was uploaded.
 */
export async function prepareLogo(file: File): Promise<QrLogoImage> {
  assertSafeFile(file);
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!sniffImageType(head))
    throw new QrUserError(
      "That file is not a PNG, JPEG, WebP, GIF or BMP image.",
      "logo",
    );
  const source = await decode(file);
  const width = "width" in source ? source.width : LOGO_WORK_SIZE;
  const height = "height" in source ? source.height : LOGO_WORK_SIZE;
  if (!width || !height)
    throw new QrUserError("That image has no readable dimensions.", "logo");
  const { canvas, ctx } = context(LOGO_WORK_SIZE);
  const side = Math.min(width, height);
  // Centre-crop to a square: a stretched logo looks wrong and a letterboxed
  // one wastes the quiet padding around the code.
  const sx = (width - side) / 2;
  const sy = (height - side) / 2;
  try {
    ctx.clearRect(0, 0, LOGO_WORK_SIZE, LOGO_WORK_SIZE);
    ctx.drawImage(
      source as CanvasImageSource,
      sx,
      sy,
      side,
      side,
      0,
      0,
      LOGO_WORK_SIZE,
      LOGO_WORK_SIZE,
    );
    const data = ctx.getImageData(0, 0, LOGO_WORK_SIZE, LOGO_WORK_SIZE);
    return {
      width: LOGO_WORK_SIZE,
      height: LOGO_WORK_SIZE,
      rgba: data.data,
      name: file.name.slice(0, 60),
      bytes: file.size,
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    if ("close" in source && typeof source.close === "function") source.close();
  }
}

/** True when a logo is basically a solid square — a warning worth giving. */
export function logoOpacity(logo: QrLogoImage) {
  let opaque = 0;
  const total = logo.width * logo.height;
  for (let index = 0; index < total; index += 1)
    if (logo.rgba[index * 4 + 3] > 200) opaque += 1;
  return opaque / total;
}
