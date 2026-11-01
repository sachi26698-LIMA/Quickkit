/**
 * Per-image editing model for the Image Resizer: crop, rotation, flips,
 * colour adjustments and derived helpers (print size, size estimate, naming).
 * Pure functions only — no DOM — so the maths is unit tested.
 */
import {
  MAX_DIMENSION,
  extensionFor,
  sanitizeBaseName,
  type CropRect,
  type OutputFormat,
} from "./image-resize";

export const DEFAULT_QUALITY = 85;
export const MIN_CROP_PIXELS = 8;
export const CM_PER_INCH = 2.54;

export const CROP_ASPECTS = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1 square", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16 vertical", ratio: 9 / 16 },
  { id: "4:5", label: "4:5 portrait", ratio: 4 / 5 },
] as const;

export type CropAspectId = (typeof CROP_ASPECTS)[number]["id"];
export type QuickFilter = "none" | "grayscale" | "sepia" | "invert" | "warm" | "cool";

export type ImageEdits = {
  crop: CropRect | null;
  /** 0–359 degrees, clockwise. */
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  /** 0–200 (%), 100 = unchanged. */
  brightness: number;
  contrast: number;
  saturation: number;
  filter: QuickFilter;
  /** Honour EXIF orientation when decoding. */
  autoOrient: boolean;
};

export const DEFAULT_EDITS: ImageEdits = {
  crop: null,
  rotation: 0,
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  filter: "none",
  autoOrient: true,
};

export function withDefaults(edits: Partial<ImageEdits> | undefined): ImageEdits {
  return { ...DEFAULT_EDITS, ...(edits ?? {}) };
}

export function clampAdjustment(value: number) {
  if (!Number.isFinite(value)) return 100;
  return Math.min(200, Math.max(0, Math.round(value)));
}

export function normalizeAngle(angle: number) {
  if (!Number.isFinite(angle)) return 0;
  return ((Math.round(angle) % 360) + 360) % 360;
}

/** Output box after rotating a width × height rectangle by `angle` degrees. */
export function rotatedSize(width: number, height: number, angle: number) {
  const safeAngle = normalizeAngle(angle);
  if (safeAngle % 90 === 0) {
    return safeAngle === 90 || safeAngle === 270
      ? { width: height, height: width }
      : { width, height };
  }
  const radians = (safeAngle * Math.PI) / 180;
  return {
    width: Math.max(
      1,
      Math.round(
        Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians)),
      ),
    ),
    height: Math.max(
      1,
      Math.round(
        Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians)),
      ),
    ),
  };
}

function cropCounts(edits: ImageEdits, width?: number, height?: number) {
  if (!edits.crop) return false;
  if (width && height) return !cropIsFull(edits.crop, width, height);
  return true;
}

export function hasEdits(edits: ImageEdits, width?: number, height?: number) {
  return (
    cropCounts(edits, width, height) ||
    normalizeAngle(edits.rotation) !== 0 ||
    edits.flipH ||
    edits.flipV ||
    edits.brightness !== 100 ||
    edits.contrast !== 100 ||
    edits.saturation !== 100 ||
    edits.filter !== "none" ||
    !edits.autoOrient
  );
}

export function describeEdits(edits: ImageEdits, width?: number, height?: number) {
  const parts: string[] = [];
  if (cropCounts(edits, width, height)) parts.push("cropped");
  if (normalizeAngle(edits.rotation)) parts.push(`${normalizeAngle(edits.rotation)}°`);
  if (edits.flipH) parts.push("flipped H");
  if (edits.flipV) parts.push("flipped V");
  if (edits.brightness !== 100) parts.push(`brightness ${edits.brightness}%`);
  if (edits.contrast !== 100) parts.push(`contrast ${edits.contrast}%`);
  if (edits.saturation !== 100) parts.push(`saturation ${edits.saturation}%`);
  if (edits.filter !== "none") parts.push(edits.filter);
  if (!edits.autoOrient) parts.push("EXIF rotation ignored");
  return parts;
}

const FILTER_TINTS: Record<QuickFilter, string> = {
  none: "",
  grayscale: " grayscale(100%)",
  sepia: " sepia(85%)",
  invert: " invert(100%)",
  warm: " sepia(28%) saturate(135%) hue-rotate(-12deg)",
  cool: " saturate(120%) hue-rotate(14deg)",
};

/** CSS filter string understood by canvas `ctx.filter`. */
export function filterCss(edits: ImageEdits) {
  return [
    `brightness(${clampAdjustment(edits.brightness)}%)`,
    `contrast(${clampAdjustment(edits.contrast)}%)`,
    `saturate(${clampAdjustment(edits.saturation)}%)`,
    FILTER_TINTS[edits.filter] ?? "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterIsIdentity(edits: ImageEdits) {
  return filterCss(edits) === "brightness(100%) contrast(100%) saturate(100%)";
}

/** CSS transform used to show rotation/flip live in the preview. */
export function previewTransform(edits: ImageEdits) {
  const parts: string[] = [];
  const angle = normalizeAngle(edits.rotation);
  if (angle) parts.push(`rotate(${angle}deg)`);
  if (edits.flipH) parts.push("scaleX(-1)");
  if (edits.flipV) parts.push("scaleY(-1)");
  return parts.length ? parts.join(" ") : undefined;
}

/** Same look as the canvas filter, for live DOM previews. */
export function previewFilterCss(edits: ImageEdits) {
  return filterIsIdentity(edits) ? "none" : filterCss(edits);
}

/* ------------------------------- crop maths ------------------------------- */

export function fullCrop(width: number, height: number): CropRect {
  return { x: 0, y: 0, width, height };
}

export function cropIsFull(crop: CropRect | null, width: number, height: number) {
  if (!crop) return true;
  return (
    crop.x === 0 &&
    crop.y === 0 &&
    crop.width === width &&
    crop.height === height
  );
}

/** Keep a crop inside the image, at least MIN_CROP_PIXELS and whole pixels. */
export function clampCrop(
  crop: CropRect | null,
  width: number,
  height: number,
): CropRect {
  if (!crop) return fullCrop(width, height);
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const minWidth = Math.min(MIN_CROP_PIXELS, safeWidth);
  const minHeight = Math.min(MIN_CROP_PIXELS, safeHeight);
  const cropWidth = Math.min(
    safeWidth,
    Math.max(minWidth, Math.round(crop.width) || minWidth),
  );
  const cropHeight = Math.min(
    safeHeight,
    Math.max(minHeight, Math.round(crop.height) || minHeight),
  );
  return {
    x: Math.min(Math.max(0, Math.round(crop.x) || 0), safeWidth - cropWidth),
    y: Math.min(Math.max(0, Math.round(crop.y) || 0), safeHeight - cropHeight),
    width: cropWidth,
    height: cropHeight,
  };
}

/** Largest centred crop for an aspect ratio (null = the whole image). */
export function centredCrop(
  width: number,
  height: number,
  ratio: number | null,
): CropRect {
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return fullCrop(width, height);
  if (width / height > ratio) {
    const cropWidth = Math.max(1, Math.round(height * ratio));
    return {
      x: Math.floor((width - cropWidth) / 2),
      y: 0,
      width: cropWidth,
      height,
    };
  }
  const cropHeight = Math.max(1, Math.round(width / ratio));
  return {
    x: 0,
    y: Math.floor((height - cropHeight) / 2),
    width,
    height: cropHeight,
  };
}

export function ratioFromCrop(crop: CropRect) {
  if (!crop.height) return 0;
  return crop.width / crop.height;
}

/** Format a ratio as a friendly "4:3" style label when it matches one. */
export function ratioLabel(crop: CropRect) {
  const ratio = ratioFromCrop(crop);
  const match = CROP_ASPECTS.find(
    (option) => option.ratio !== null && Math.abs(option.ratio - ratio) < 0.01,
  );
  if (match) return match.label;
  return `${ratio.toFixed(2)}:1`;
}

/** Crop rect for a target aspect, resized around the crop's own top-left. */
export function cropWithAspect(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
  ratio: number | null,
) {
  if (!ratio) return clampCrop(crop, imageWidth, imageHeight);
  const width = Math.max(1, Math.min(imageWidth, Math.round(crop.width)));
  let height = Math.round(width / ratio);
  if (height > imageHeight) {
    height = imageHeight;
    return clampCrop(
      { x: crop.x, y: crop.y, width: Math.round(height * ratio), height },
      imageWidth,
      imageHeight,
    );
  }
  return clampCrop(
    { x: crop.x, y: crop.y, width, height: Math.max(1, height) },
    imageWidth,
    imageHeight,
  );
}

/* --------------------------------- print --------------------------------- */

export function validateDpi(value: number) {
  if (!Number.isFinite(value)) throw new Error("DPI must be a number.");
  const rounded = Math.round(value);
  if (rounded < 36 || rounded > 1200)
    throw new Error("DPI must be between 36 and 1,200.");
  return rounded;
}

export function inchesFromPixels(pixels: number, dpi: number) {
  if (!dpi) return 0;
  return pixels / dpi;
}

export function pixelsFromInches(inches: number, dpi: number) {
  if (!Number.isFinite(inches) || inches <= 0 || !dpi) return 0;
  return Math.round(inches * dpi);
}

export function pxFromCm(cm: number, dpi: number) {
  return pixelsFromInches(cm / CM_PER_INCH, dpi);
}

export function cmFromPx(px: number, dpi: number) {
  return (inchesFromPixels(px, dpi) * CM_PER_INCH);
}

export function printLabel(px: number, dpi: number) {
  if (!dpi) return "—";
  const inches = inchesFromPixels(px, dpi);
  return `${inches.toFixed(2)} in · ${(inches * CM_PER_INCH).toFixed(1)} cm`;
}

/** Megapixels needed to print a physical size at a DPI. */
export function printPixelSize(
  widthCm: number,
  heightCm: number,
  dpi: number,
) {
  return {
    width: pxFromCm(widthCm, dpi),
    height: pxFromCm(heightCm, dpi),
  };
}

/* ------------------------------ size estimate ----------------------------- */

const OVERHEAD: Record<OutputFormat, number> = {
  "image/jpeg": 1_000,
  "image/png": 4_000,
  "image/webp": 2_000,
  "image/avif": 2_000,
};

/**
 * Rough encoded-size estimate used before an encode happens. Compression
 * ratios vary with content, so the UI labels this as an estimate and replaces
 * it with the real size after processing.
 */
export function estimateOutputBytes(
  width: number,
  height: number,
  format: OutputFormat,
  quality: number,
) {
  const safeWidth = Number.isFinite(width) && width > 0 ? Math.round(width) : 1;
  const safeHeight =
    Number.isFinite(height) && height > 0 ? Math.round(height) : 1;
  const pixels = Math.max(1, safeWidth * safeHeight);
  const q =
    Math.min(100, Math.max(10, Number.isFinite(quality) ? Math.round(quality) : 85)) /
    100;
  let bitsPerPixel: number;
  switch (format) {
    case "image/png":
      bitsPerPixel = 7.2;
      break;
    case "image/webp":
      bitsPerPixel = (0.035 + 0.14 * Math.pow(q / 0.5, 3)) * 0.75;
      break;
    case "image/avif":
      bitsPerPixel = (0.035 + 0.14 * Math.pow(q / 0.5, 3)) * 0.55;
      break;
    default:
      bitsPerPixel = 0.06 + 0.2 * Math.pow(q / 0.5, 3);
  }
  return Math.max(1, Math.round((pixels * bitsPerPixel) / 8) + OVERHEAD[format]);
}

/** Cheap quality heuristic for already-encoded output (not re-encoding). */
export function bytesPerPixel(bytes: number, width: number, height: number) {
  const pixels = width * height;
  return pixels ? (bytes * 8) / pixels : 0;
}

/* -------------------------------- naming ---------------------------------- */

/** Like sanitizeBaseName but returns "" for empty input (for optional affixes). */
export function sanitizeFragment(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  const clean = sanitizeBaseName(trimmedValue, "");
  return clean;
}

export type NameOptions = {
  baseName?: string;
  suffix?: string;
  width: number;
  height: number;
  format: OutputFormat;
};

/** `photo.jpg` → `photo-<suffix>-1920x1080.webp` (suffix optional). */
export function buildOutputName(originalName: string, options: NameOptions) {
  const base = sanitizeFragment(options.baseName ?? "") || sanitizeBaseName(originalName);
  const suffix = sanitizeFragment(options.suffix ?? "");
  const parts = [base, suffix].filter(Boolean);
  return `${parts.join("-")}-${options.width}x${options.height}.${extensionFor(
    options.format,
  )}`;
}

export function formatOptionsList() {
  return ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
}

export function formatShortLabel(format: OutputFormat) {
  if (format === "image/jpeg") return "JPG";
  if (format === "image/png") return "PNG";
  if (format === "image/webp") return "WebP";
  return "AVIF";
}

export function maxDimensionWarning(width: number, height: number) {
  if (width > MAX_DIMENSION || height > MAX_DIMENSION)
    return `Output is ${Math.round(width)} × ${Math.round(height)} px, over the 8,192 px per-side limit.`;
  return "";
}

/* ------------------------------ crop dragging ----------------------------- */

export type CropHandle = "move" | "nw" | "ne" | "sw" | "se";
export const CROP_HANDLES: readonly CropHandle[] = ["nw", "ne", "sw", "se"];

export function moveCrop(
  crop: CropRect,
  dx: number,
  dy: number,
  imageWidth: number,
  imageHeight: number,
) {
  const start = clampCrop(crop, imageWidth, imageHeight);
  return clampCrop(
    { ...start, x: start.x + dx, y: start.y + dy },
    imageWidth,
    imageHeight,
  );
}

/**
 * Resize a crop rect by dragging a corner. `ratio` (width ÷ height) keeps a
 * fixed aspect; the opposite corner stays anchored and the box stays inside.
 */
export function resizeCropByHandle(
  crop: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  imageWidth: number,
  imageHeight: number,
  ratio: number | null,
): CropRect {
  const start = clampCrop(crop, imageWidth, imageHeight);
  if (handle === "move") return moveCrop(start, dx, dy, imageWidth, imageHeight);

  const left = start.x;
  const top = start.y;
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  const movesLeft = handle === "nw" || handle === "sw";
  const movesTop = handle === "nw" || handle === "ne";

  const widthMax = movesLeft ? right : imageWidth - left;
  const heightMax = movesTop ? bottom : imageHeight - top;
  const minWidth = Math.min(MIN_CROP_PIXELS, widthMax);
  const minHeight = Math.min(MIN_CROP_PIXELS, heightMax);

  let width = movesLeft ? start.width - dx : start.width + dx;
  let height = movesTop ? start.height - dy : start.height + dy;

  width = Math.min(widthMax, Math.max(minWidth, width));
  if (ratio) {
    height = width / ratio;
    if (height > heightMax) {
      height = heightMax;
      width = height * ratio;
    }
    if (height < minHeight) {
      height = minHeight;
      width = height * ratio;
    }
  } else {
    height = Math.min(heightMax, Math.max(minHeight, height));
  }

  const nextWidth = Math.max(1, Math.min(widthMax, Math.round(width)));
  const nextHeight = Math.max(1, Math.min(heightMax, Math.round(height)));
  const x = movesLeft ? right - nextWidth : left;
  const y = movesTop ? bottom - nextHeight : top;
  return clampCrop(
    { x, y, width: nextWidth, height: nextHeight },
    imageWidth,
    imageHeight,
  );
}
