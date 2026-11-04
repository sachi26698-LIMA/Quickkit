/**
 * Image Compressor — pure domain helpers.
 *
 * Kept free of DOM/browser APIs so the maths, naming and target-size search
 * rules can be unit tested in Node.
 */

import { sanitizeBaseName } from "./image-resize";

export type CompressFormat =
  "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export type CompressMode = "quality" | "target";
export type SizeUnit = "KB" | "MB";

export const COMPRESS_FORMATS: readonly CompressFormat[] = [
  "image/jpeg",
  "image/webp",
  "image/png",
  "image/avif",
];

export const DEFAULT_FORMAT: CompressFormat = "image/webp";
export const DEFAULT_QUALITY = 80;
export const MIN_QUALITY = 10;
export const MAX_QUALITY = 100;
export const MIN_TARGET_BYTES = 5 * 1024;
export const MAX_TARGET_BYTES = 50 * 1024 * 1024;
export const MAX_BATCH_FILES = 20;
export const MAX_BATCH_PIXELS = 200_000_000;
export const MIN_DOWNSCALE_EDGE = 64;
export const DEFAULT_TARGET_VALUE = "150";

export const FORMAT_NOTES: Record<CompressFormat, string> = {
  "image/webp": "Best balance · transparency kept",
  "image/jpeg": "Most compatible · no transparency",
  "image/png": "Lossless · transparency kept",
  "image/avif": "Smallest files · newer browsers",
};

/** PNG is lossless, so a quality value has no effect on its encoder. */
export function usesQuality(format: CompressFormat) {
  return format !== "image/png";
}

export function formatLabel(format: CompressFormat) {
  if (format === "image/jpeg") return "JPEG";
  if (format === "image/png") return "PNG";
  if (format === "image/webp") return "WebP";
  return "AVIF";
}

export function formatShortLabel(format: CompressFormat) {
  if (format === "image/jpeg") return "JPG";
  if (format === "image/png") return "PNG";
  if (format === "image/webp") return "WEBP";
  return "AVIF";
}

export function extensionFor(format: CompressFormat) {
  if (format === "image/jpeg") return "jpg";
  if (format === "image/png") return "png";
  if (format === "image/webp") return "webp";
  return "avif";
}

/** Formats that cannot carry an alpha channel and must be flattened. */
export function keepsTransparency(format: CompressFormat) {
  return format !== "image/jpeg";
}

export function mimeFromType(type: string): CompressFormat | null {
  if (type === "image/jpeg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  if (type === "image/avif") return "image/avif";
  return null;
}

/* --------------------------------- target --------------------------------- */

/** Converts the target input into bytes, with plain-language validation. */
export function targetBytes(value: number, unit: SizeUnit) {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error("Enter a target file size greater than zero.");
  const bytes = Math.round(value * (unit === "MB" ? 1024 * 1024 : 1024));
  if (bytes < MIN_TARGET_BYTES)
    throw new Error("Set a target of at least 5 KB.");
  if (bytes > MAX_TARGET_BYTES) throw new Error("Set a target below 50 MB.");
  return bytes;
}

export function validateTarget(value: number, unit: SizeUnit) {
  targetBytes(value, unit);
  return true;
}

/** "150 KB" style label for notices and stats. */
export function targetLabel(bytes: number) {
  if (bytes >= 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) ? 2 : 0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export type QualitySample = { quality: number; bytes: number };

/**
 * Highest quality whose encoded size still fits the target.
 * `null` means even the lowest sampled quality was too big.
 */
export function pickQualityForTarget(
  samples: readonly QualitySample[],
  target: number,
) {
  const fitting = samples
    .filter((sample) => sample.bytes <= target)
    .sort((a, b) => b.quality - a.quality);
  return fitting.length ? fitting[0].quality : null;
}

export type EncodeAttempt = { quality: number; bytes: number };

/** Display helper: "q 62 · 148 KB" list for the target-size audit. */
export function describeAttempts(attempts: readonly EncodeAttempt[]) {
  return attempts
    .map(
      (attempt) => `q${attempt.quality} ${Math.round(attempt.bytes / 1024)} KB`,
    )
    .join(" → ");
}

/**
 * Scale factor used when a target cannot be reached by quality alone.
 * Based on the area ratio between the smallest sample and the target,
 * clamped so one pass never destroys the image.
 */
export function downscaleRatio(
  smallestBytes: number,
  target: number,
  currentScale = 1,
) {
  if (!smallestBytes || !target) return currentScale;
  const linear = Math.sqrt(target / smallestBytes) * 0.96;
  return Math.min(0.95, Math.max(0.2, Math.min(currentScale, linear)));
}

export function downscaledSize(
  width: number,
  height: number,
  ratio: number,
  minEdge = MIN_DOWNSCALE_EDGE,
) {
  const targetWidth = Math.max(minEdge, Math.round(width * ratio));
  const targetHeight = Math.max(minEdge, Math.round(height * ratio));
  const cappedWidth = Math.min(width, targetWidth);
  const cappedHeight = Math.min(height, targetHeight);
  return {
    width: Math.max(1, cappedWidth),
    height: Math.max(1, cappedHeight),
    changed: cappedWidth !== width || cappedHeight !== height,
  };
}

/* ---------------------------------- size ---------------------------------- */

/** Positive = smaller than the source. Can be negative for unoptimised output. */
export function savingsPercent(originalBytes: number, compressedBytes: number) {
  if (!originalBytes) return 0;
  return (1 - compressedBytes / originalBytes) * 100;
}

export function savingsLabel(originalBytes: number, compressedBytes: number) {
  const percent = savingsPercent(originalBytes, compressedBytes);
  if (Math.abs(percent) < 0.05) return "same size as the source";
  return percent > 0
    ? `${percent.toFixed(1)}% smaller`
    : `${Math.abs(percent).toFixed(1)}% larger`;
}

/** Compact percentage used in queue rows and stats. */
export function compactSavings(originalBytes: number, compressedBytes: number) {
  const percent = savingsPercent(originalBytes, compressedBytes);
  const rounded = Math.round(Math.abs(percent));
  return percent >= 0 ? `−${rounded}%` : `+${rounded}%`;
}

/* --------------------------------- naming --------------------------------- */

export function sanitizeFragment(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return sanitizeBaseName(trimmed, "");
}

export type CompressNameOptions = {
  baseName?: string;
  suffix?: string;
  format: CompressFormat;
  qualifier?: string;
  size?: { width: number; height: number };
};

/**
 * `holiday.png` → `holiday-compressed.webp`
 * with a suffix → `holiday-web.webp`; with a rename → `hero-web.webp`.
 * Passing a size appends `-1920x1080` so batch outputs never collide.
 */
export function buildCompressName(
  originalName: string,
  options: CompressNameOptions,
) {
  const base =
    sanitizeFragment(options.baseName ?? "") ||
    sanitizeBaseName(originalName, "image");
  const suffix = sanitizeFragment(options.suffix ?? "");
  const qualifier =
    suffix || sanitizeFragment(options.qualifier ?? "") || "compressed";
  const size = options.size
    ? `-${Math.round(options.size.width)}x${Math.round(options.size.height)}`
    : "";
  return `${[base, qualifier].filter(Boolean).join("-")}${size}.${extensionFor(
    options.format,
  )}`;
}

/** Adds " (2)", " (3)" … when two outputs would collide. */
export function uniqueName(name: string, used: Set<string>) {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  let counter = 2;
  while (used.has(candidate.toLocaleLowerCase())) {
    candidate = `${stem} (${counter})${ext}`;
    counter += 1;
  }
  used.add(candidate.toLocaleLowerCase());
  return candidate;
}
