import { preflightImage } from "./image-header";
import { validateImage } from "./image-input";
import {
  MAX_OUTPUT_PIXELS,
  planResize,
  validateOutputSize,
  type CropRect,
  type OutputFormat,
  type ResizePlan,
  type ResizeSettings,
} from "./image-resize";

export type OutputSettings = ResizeSettings & {
  format: OutputFormat;
  /** 0.1 – 1. PNG ignores this value. */
  quality: number;
  /** CSS colour used to flatten transparency in JPEG output. */
  background: string;
};

export type ResizedImage = {
  blob: Blob;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

export function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
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

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      const width = bitmap.width;
      const height = bitmap.height;
      if (!width || !height) {
        bitmap.close();
        throw new Error("This image has no pixels to resize.");
      }
      return {
        source: bitmap,
        width,
        height,
        release: () => bitmap.close(),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "This image has no pixels to resize."
      )
        throw error;
      // createImageBitmap is missing/broken for this file: fall back to <img>.
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
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height)
      throw new Error("This image has no pixels to resize.");
    return {
      source: image,
      width,
      height,
      release: () => {
        image.removeAttribute("src");
      },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const fullFrame = (width: number, height: number): CropRect => ({
  x: 0,
  y: 0,
  width,
  height,
});

/**
 * Draw `source` crop into the exact output box. Large reductions are halved
 * progressively first so edges stay smooth instead of aliased.
 */
function renderCanvas(
  source: CanvasImageSource,
  crop: CropRect,
  width: number,
  height: number,
  background: string | null,
) {
  const output = createCanvas(width, height);
  const outputContext = context(output);
  if (background) {
    outputContext.fillStyle = background;
    outputContext.fillRect(0, 0, width, height);
  }

  const stage = createCanvas(crop.width, crop.height);
  context(stage).drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  let stageWidth = crop.width;
  let stageHeight = crop.height;
  let current = stage;
  while (stageWidth > width * 2 && stageHeight > height * 2) {
    const nextWidth = Math.max(width, Math.floor(stageWidth / 2));
    const nextHeight = Math.max(height, Math.floor(stageHeight / 2));
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

  outputContext.drawImage(
    current,
    0,
    0,
    stageWidth,
    stageHeight,
    0,
    0,
    width,
    height,
  );
  if (current !== stage) releaseCanvas(current);
  releaseCanvas(stage);
  return output;
}

function encode(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "The browser could not encode this image. Try JPEG, PNG or WebP.",
            ),
          );
          return;
        }
        if (blob.type !== format) {
          reject(
            new Error(
              "Your browser cannot encode this format. Choose JPEG or PNG instead.",
            ),
          );
          return;
        }
        resolve(blob);
      },
      format,
      format === "image/png" ? undefined : quality,
    );
  });
}

export async function inspectFile(file: File) {
  validateImage(file);
  return preflightImage(file);
}

export function planFor(
  width: number,
  height: number,
  settings: ResizeSettings,
): ResizePlan {
  return planResize(width, height, settings);
}

export async function resizeImageFile(
  file: File,
  settings: OutputSettings,
): Promise<ResizedImage> {
  validateImage(file);
  await preflightImage(file);
  if (
    !Number.isFinite(settings.quality) ||
    settings.quality < 0.1 ||
    settings.quality > 1
  )
    throw new Error("Quality must be between 10% and 100%.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(settings.format))
    throw new Error("Unsupported output format.");
  if (
    settings.format === "image/jpeg" &&
    !/^#[0-9a-f]{6}$/i.test(settings.background)
  )
    throw new Error("Choose a valid background colour for JPEG output.");

  const decoded = await decodeImage(file);
  let canvas: HTMLCanvasElement | null = null;
  try {
    if (
      !decoded.width ||
      !decoded.height ||
      decoded.width * decoded.height > MAX_OUTPUT_PIXELS ||
      decoded.width > 8192 ||
      decoded.height > 8192
    )
      throw new Error(
        "Use an image up to 24 megapixels, with neither side above 8,192 pixels.",
      );
    const plan = planResize(decoded.width, decoded.height, settings);
    validateOutputSize(plan.width, plan.height);
    canvas = renderCanvas(
      decoded.source,
      plan.crop ?? fullFrame(decoded.width, decoded.height),
      plan.width,
      plan.height,
      settings.format === "image/jpeg" ? settings.background : null,
    );
    const blob = await encode(canvas, settings.format, settings.quality);
    return {
      blob,
      width: plan.width,
      height: plan.height,
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
    };
  } finally {
    if (canvas) releaseCanvas(canvas);
    decoded.release();
  }
}

/** Browser capability probe used by the UI before promising WebP/JPEG output. */
export function canEncode(format: OutputFormat) {
  const canvas = createCanvas(1, 1);
  try {
    return canvas.toDataURL(format).startsWith(`data:${format}`);
  } finally {
    releaseCanvas(canvas);
  }
}
