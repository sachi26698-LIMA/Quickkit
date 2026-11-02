/**
 * Browser-side crop pipeline: decode with EXIF orientation, rotate/flip,
 * sample the crop rectangle, apply an optional circular mask and encode.
 * Everything happens on an in-memory canvas; no file ever leaves the tab.
 */
import { scanMetadata, type MetadataReport } from "./exif";
import { preflightImage } from "./image-header";
import { validateImage } from "./image-input";
import {
  MAX_OUTPUT_PIXELS,
  orientedSize,
  outputPlan,
  validateCropSettings,
  type CropFormat,
  type CropSettings,
  type CropShape,
} from "./image-crop";
import { normalizeAngle } from "./image-edits";
import type { CropRect } from "./image-resize";

export type DecodedSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

export type CropResult = {
  blob: Blob;
  width: number;
  height: number;
  format: CropFormat;
  quality: number;
  sourceWidth: number;
  sourceHeight: number;
  orientedWidth: number;
  orientedHeight: number;
  crop: CropRect;
};

export type InspectedCropFile = {
  /** Dimensions as the browser will display them (EXIF orientation applied). */
  width: number;
  height: number;
  /** Raw header dimensions, before EXIF rotation. */
  headerWidth: number;
  headerHeight: number;
  orientation: number | null;
  metadata: MetadataReport;
};

export function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error(
      "Canvas processing is unavailable in this browser. Try an updated browser.",
    );
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The image could not be processed.";

/** Decode a file, optionally honouring its EXIF orientation. */
export async function decodeCropSource(
  file: File,
  autoOrient = true,
): Promise<DecodedSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: autoOrient ? "from-image" : "none",
      });
      if (!bitmap.width || !bitmap.height) {
        bitmap.close();
        throw new Error("This image has no pixels to crop.");
      }
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "This image has no pixels to crop."
      )
        throw error;
      // Fall through to <img> for browsers without a working createImageBitmap.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error(
        "This image could not be decoded. It may be damaged or unsupported.",
      );
    }
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("This image has no pixels to crop.");
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => image.removeAttribute("src"),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Validate the file, read its header and report its EXIF orientation. */
export async function inspectCropFile(file: File): Promise<InspectedCropFile> {
  validateImage(file);
  const header = await preflightImage(file);
  const metadata = scanMetadata(
    new Uint8Array(await file.slice(0, 262_144).arrayBuffer()),
    file.type,
  );
  const orientation = metadata.orientation;
  const decoded = await decodeCropSource(file, true);
  try {
    return {
      width: decoded.width,
      height: decoded.height,
      headerWidth: header.width,
      headerHeight: header.height,
      orientation,
      metadata,
    };
  } finally {
    decoded.release();
  }
}

/* ------------------------------- rendering -------------------------------- */

/** Rotate and flip the whole image into oriented space. */
function renderOriented(
  source: CanvasImageSource,
  width: number,
  height: number,
  rotation: number,
  flipH: boolean,
  flipV: boolean,
  scale = 1,
) {
  const size = orientedSize(width, height, rotation);
  if (!normalizeAngle(rotation) && !flipH && !flipV && scale === 1)
    return { image: source, width, height, owned: false as const };
  const canvas = createCanvas(size.width * scale, size.height * scale);
  const ctx = context(canvas);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  // Flips act on what the user sees, so they sit outside the rotation:
  // rotate first, then mirror in screen space.
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.rotate((normalizeAngle(rotation) * Math.PI) / 180);
  ctx.drawImage(
    source,
    (-width * scale) / 2,
    (-height * scale) / 2,
    width * scale,
    height * scale,
  );
  return {
    image: canvas,
    width: canvas.width,
    height: canvas.height,
    owned: true as const,
  };
}

/**
 * Draw `rect` (oriented pixels) into an exact `outWidth × outHeight` canvas.
 * Big reductions are halved repeatedly so edges stay smooth.
 */
function scaleRegion(
  image: CanvasImageSource,
  rect: CropRect,
  outWidth: number,
  outHeight: number,
) {
  const stage = createCanvas(rect.width, rect.height);
  context(stage).drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height,
  );
  let current = stage;
  let stageWidth = stage.width;
  let stageHeight = stage.height;
  while (stageWidth > outWidth * 2 && stageHeight > outHeight * 2) {
    const nextWidth = Math.max(outWidth, Math.floor(stageWidth / 2));
    const nextHeight = Math.max(outHeight, Math.floor(stageHeight / 2));
    const next = createCanvas(nextWidth, nextHeight);
    context(next).drawImage(
      current,
      0,
      0,
      stageWidth,
      stageHeight,
      0,
      0,
      nextWidth,
      nextHeight,
    );
    if (current !== stage) releaseCanvas(current);
    current = next;
    stageWidth = nextWidth;
    stageHeight = nextHeight;
  }
  const releaseStage = () => {
    if (current !== stage) releaseCanvas(stage);
  };
  if (stageWidth === outWidth && stageHeight === outHeight) {
    releaseStage();
    return current;
  }
  const output = createCanvas(outWidth, outHeight);
  context(output).drawImage(
    current,
    0,
    0,
    stageWidth,
    stageHeight,
    0,
    0,
    outWidth,
    outHeight,
  );
  if (current !== stage) releaseCanvas(current);
  releaseCanvas(stage);
  return output;
}

function applyCircleMask(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.ellipse(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2,
    canvas.height / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function composeCrop(
  image: CanvasImageSource,
  rect: CropRect,
  outWidth: number,
  outHeight: number,
  shape: CropShape,
  background: string | null,
) {
  const cropped = scaleRegion(image, rect, outWidth, outHeight);
  if (shape === "circle") applyCircleMask(cropped);
  if (!background) return cropped;
  const output = createCanvas(outWidth, outHeight);
  const ctx = context(output);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.drawImage(cropped, 0, 0);
  if (cropped.width) releaseCanvas(cropped);
  return output;
}

/**
 * Fast preview used by the editor: renders only as many pixels as the screen
 * needs (capped at `maxSide`), which keeps dragging smooth on large photos.
 */
export function renderCropPreview(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  settings: CropSettings,
  maxSide = 1100,
) {
  const oriented = orientedSize(sourceWidth, sourceHeight, settings.rotation);
  const rect = settings.rect;
  const scale = Math.min(
    1,
    Math.sqrt(4_000_000 / Math.max(1, oriented.width * oriented.height)),
    maxSide / Math.max(1, rect.width, rect.height),
  );
  const orientedImage = renderOriented(
    source,
    sourceWidth,
    sourceHeight,
    settings.rotation,
    settings.flipH,
    settings.flipV,
    scale,
  );
  const scaledRect: CropRect = {
    x: rect.x * scale,
    y: rect.y * scale,
    width: Math.max(1, rect.width * scale),
    height: Math.max(1, rect.height * scale),
  };
  const outWidth = Math.max(1, Math.round(scaledRect.width));
  const outHeight = Math.max(1, Math.round(scaledRect.height));
  const canvas = composeCrop(
    orientedImage.image,
    scaledRect,
    outWidth,
    outHeight,
    settings.shape,
    null,
  );
  if (orientedImage.owned)
    releaseCanvas(orientedImage.image as HTMLCanvasElement);
  return canvas;
}

function encode(
  canvas: HTMLCanvasElement,
  format: CropFormat,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };
    canvas.toBlob(
      (blob) => {
        if (settled) return;
        if (!blob) {
          fail(
            "The browser could not encode this image. Try JPEG, PNG or WebP.",
          );
          return;
        }
        if (blob.type !== format) {
          fail(
            "Your browser cannot encode this format. Choose JPEG, PNG or WebP instead.",
          );
          return;
        }
        settled = true;
        resolve(blob);
      },
      format,
      format === "image/png" ? undefined : quality / 100,
    );
  });
}

/** Crop one file with its own settings and return the encoded result. */
export async function cropImageFile(
  file: File,
  settings: CropSettings,
  isCancelled?: () => boolean,
): Promise<CropResult> {
  validateImage(file);
  await preflightImage(file);
  const decoded = await decodeCropSource(file, settings.autoOrient);
  let orientedCanvas: HTMLCanvasElement | null = null;
  let output: HTMLCanvasElement | null = null;
  try {
    if (isCancelled?.()) throw new Error("Cropping cancelled.");
    const plan = outputPlan(settings, decoded.width, decoded.height);
    const validated = validateCropSettings(
      settings,
      decoded.width,
      decoded.height,
    );
    if (plan.width * plan.height > MAX_OUTPUT_PIXELS)
      throw new Error(
        "That output is over 24 megapixels. Choose smaller dimensions.",
      );
    const orientedImage = renderOriented(
      decoded.source,
      decoded.width,
      decoded.height,
      settings.rotation,
      settings.flipH,
      settings.flipV,
    );
    if (orientedImage.owned)
      orientedCanvas = orientedImage.image as HTMLCanvasElement;
    output = composeCrop(
      orientedImage.image,
      validated.rect,
      plan.width,
      plan.height,
      settings.shape,
      settings.format === "image/jpeg" ? settings.background : null,
    );
    if (isCancelled?.()) throw new Error("Cropping cancelled.");
    const blob = await encode(output, settings.format, settings.quality);
    return {
      blob,
      width: plan.width,
      height: plan.height,
      format: settings.format,
      quality: settings.format === "image/png" ? 100 : settings.quality,
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
      orientedWidth: orientedImage.width,
      orientedHeight: orientedImage.height,
      crop: validated.rect,
    };
  } catch (error) {
    throw new Error(errorMessage(error));
  } finally {
    if (output) releaseCanvas(output);
    if (orientedCanvas) releaseCanvas(orientedCanvas);
    decoded.release();
  }
}

/* ------------------------------ capability -------------------------------- */

const supportCache = new Map<CropFormat, boolean>();

export function canEncodeCrop(format: CropFormat) {
  const cached = supportCache.get(format);
  if (cached !== undefined) return cached;
  const canvas = createCanvas(1, 1);
  let supported = false;
  try {
    supported = canvas.toDataURL(format).startsWith(`data:${format}`);
  } catch {
    supported = false;
  } finally {
    releaseCanvas(canvas);
  }
  supportCache.set(format, supported);
  return supported;
}

export function cropFormatSupport(): Record<CropFormat, boolean> {
  return {
    "image/jpeg": canEncodeCrop("image/jpeg"),
    "image/png": canEncodeCrop("image/png"),
    "image/webp": canEncodeCrop("image/webp"),
  };
}
