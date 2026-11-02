import { preflightImage } from "./image-header";
import { validateImage } from "./image-input";
import {
  clampAdjustment,
  clampCrop,
  filterCss,
  filterIsIdentity,
  normalizeAngle,
  rotatedSize,
  withDefaults,
  type ImageEdits,
} from "./image-edits";
import {
  MAX_OUTPUT_PIXELS,
  OUTPUT_FORMATS,
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
  edits?: ImageEdits;
};

export type ResizedImage = {
  blob: Blob;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  editedWidth: number;
  editedHeight: number;
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

let filterSupport: boolean | null = null;
/** Safari < 16.4 and old Firefox ignore `ctx.filter`, so detect it once. */
export function supportsCanvasFilter() {
  if (filterSupport !== null) return filterSupport;
  try {
    const ctx = createCanvas(1, 1).getContext("2d");
    if (!ctx) {
      filterSupport = false;
      return false;
    }
    ctx.filter = "grayscale(100%)";
    filterSupport = ctx.filter === "grayscale(100%)";
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

/** Manual colour maths used only when the browser ignores `ctx.filter`. */
function applyManualFilter(canvas: HTMLCanvasElement, edits: ImageEdits) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  if (!width || !height) return;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const brightness = clampAdjustment(edits.brightness) / 100;
  const contrast = clampAdjustment(edits.contrast) / 100;
  const saturation = clampAdjustment(edits.saturation) / 100;
  const grayscale = edits.filter === "grayscale";
  const sepia = edits.filter === "sepia" || edits.filter === "warm";
  const invert = edits.filter === "invert";
  const warmShift =
    edits.filter === "warm" ? 12 : edits.filter === "cool" ? -12 : 0;
  const contrastFactor = (1 - contrast) * 128;

  for (let index = 0; index < data.length; index += 4) {
    let r = data[index] / 255;
    let g = data[index + 1] / 255;
    let b = data[index + 2] / 255;
    const luminance = 0.213 * r + 0.715 * g + 0.072 * b;
    r = luminance + (r - luminance) * saturation;
    g = luminance + (g - luminance) * saturation;
    b = luminance + (b - luminance) * saturation;
    r = (r * 255 * brightness - contrastFactor * 0) * contrast + contrastFactor;
    g = (g * 255 * brightness - 0) * contrast + contrastFactor;
    b = (b * 255 * brightness - 0) * contrast + contrastFactor;
    if (warmShift) {
      r += warmShift;
      b -= warmShift;
    }
    if (sepia) {
      const sr = r * 0.393 + g * 0.769 + b * 0.189;
      const sg = r * 0.349 + g * 0.686 + b * 0.168;
      const sb = r * 0.272 + g * 0.534 + b * 0.131;
      r = sr;
      g = sg;
      b = sb;
    }
    if (grayscale) {
      const grey = 0.299 * r + 0.587 * g + 0.114 * b;
      r = grey;
      g = grey;
      b = grey;
    }
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    data[index] = Math.min(255, Math.max(0, r));
    data[index + 1] = Math.min(255, Math.max(0, g));
    data[index + 2] = Math.min(255, Math.max(0, b));
  }
  ctx.putImageData(image, 0, 0);
}

async function decodeImage(
  file: File,
  autoOrient: boolean,
): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: autoOrient ? "from-image" : "none",
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

/** Crop, rotate, flip and colour-grade into a new canvas. */
function renderEdited(
  source: CanvasImageSource,
  width: number,
  height: number,
  edits: ImageEdits,
) {
  const crop = clampCrop(edits.crop, width, height);
  const size = rotatedSize(crop.width, crop.height, edits.rotation);
  const canvas = createCanvas(size.width, size.height);
  const ctx = context(canvas);
  const css = filterCss(edits);
  const canFilter = supportsCanvasFilter();
  if (canFilter) ctx.filter = css;
  ctx.translate(size.width / 2, size.height / 2);
  ctx.rotate((normalizeAngle(edits.rotation) * Math.PI) / 180);
  ctx.scale(edits.flipH ? -1 : 1, edits.flipV ? -1 : 1);
  ctx.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -crop.width / 2,
    -crop.height / 2,
    crop.width,
    crop.height,
  );
  if (canFilter) ctx.filter = "none";
  else if (!filterIsIdentity(edits)) applyManualFilter(canvas, edits);
  return canvas;
}

/**
 * Draw a source region into the exact output box. Large reductions are halved
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
  if (!OUTPUT_FORMATS.includes(settings.format))
    throw new Error("Unsupported output format.");
  if (
    settings.format === "image/jpeg" &&
    !/^#[0-9a-f]{6}$/i.test(settings.background)
  )
    throw new Error("Choose a valid background colour for JPEG output.");
  const edits = withDefaults(settings.edits);

  const decoded = await decodeImage(file, edits.autoOrient);
  let edited: HTMLCanvasElement | null = null;
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
    edited = renderEdited(decoded.source, decoded.width, decoded.height, edits);
    if (edited.width * edited.height > MAX_OUTPUT_PIXELS)
      throw new Error(
        "This rotation makes the image larger than 24 megapixels. Crop it first.",
      );
    const plan = planResize(edited.width, edited.height, settings);
    validateOutputSize(plan.width, plan.height);
    canvas = renderCanvas(
      edited,
      plan.crop ?? fullFrame(edited.width, edited.height),
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
      editedWidth: edited.width,
      editedHeight: edited.height,
    };
  } finally {
    if (canvas) releaseCanvas(canvas);
    if (edited) releaseCanvas(edited);
    decoded.release();
  }
}

/** Browser capability probe used by the UI before promising a format. */
export function canEncode(format: OutputFormat) {
  const canvas = createCanvas(1, 1);
  try {
    return canvas.toDataURL(format).startsWith(`data:${format}`);
  } catch {
    return false;
  } finally {
    releaseCanvas(canvas);
  }
}

export function formatSupport(): Record<OutputFormat, boolean> {
  return {
    "image/jpeg": canEncode("image/jpeg"),
    "image/png": canEncode("image/png"),
    "image/webp": canEncode("image/webp"),
    "image/avif": canEncode("image/avif"),
  };
}
