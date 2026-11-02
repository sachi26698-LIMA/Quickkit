/**
 * Pure cropping model for the QUICKKIT Image Cropper.
 *
 * Coordinates are always expressed in *oriented* image space: the pixels the
 * user sees after EXIF orientation, quarter-turn rotation and flips have been
 * applied. Nothing here touches the DOM, so every rule is unit tested.
 */
import {
  CROP_HANDLES,
  MIN_CROP_PIXELS,
  buildOutputName,
  clampCrop,
  centredCrop,
  cropWithAspect,
  estimateOutputBytes,
  moveCrop,
  normalizeAngle,
  resizeCropByHandle,
  ratioFromCrop,
  rotatedSize,
  type CropHandle,
} from "./image-edits";
import {
  MAX_DIMENSION,
  MAX_OUTPUT_PIXELS,
  SOCIAL_PRESETS,
  extensionFor,
  sanitizeBaseName,
  type CropRect,
} from "./image-resize";

export {
  CROP_HANDLES,
  MIN_CROP_PIXELS,
  MAX_DIMENSION,
  MAX_OUTPUT_PIXELS,
  buildOutputName,
  clampCrop,
  centredCrop,
  cropWithAspect,
  cropWithAspect as cropToRatio,
  estimateOutputBytes,
  moveCrop,
  normalizeAngle,
  ratioFromCrop,
  resizeCropByHandle,
  rotatedSize,
  sanitizeBaseName,
  extensionFor,
  type CropHandle,
  type CropRect,
};

/* --------------------------------- shapes --------------------------------- */

export type CropShape = "rect" | "square" | "circle";

export const CROP_SHAPES: readonly {
  id: CropShape;
  label: string;
  hint: string;
}[] = [
  { id: "rect", label: "Rectangle", hint: "Any shape the crop allows" },
  { id: "square", label: "Square", hint: "1:1, sharp corners" },
  { id: "circle", label: "Circle", hint: "1:1 with a round mask" },
];

export const CROP_FORMATS = ["image/jpeg", "image/png", "image/webp"] as const;
export type CropFormat = (typeof CROP_FORMATS)[number];
export const DEFAULT_FORMAT: CropFormat = "image/webp";

export const MIN_QUALITY = 10;
export const MAX_QUALITY = 100;
export const DEFAULT_QUALITY = 90;
export const DEFAULT_BACKGROUND = "#ffffff";
export const DEFAULT_SUFFIX = "cropped";
export const MAX_BATCH_FILES = 20;
export const MAX_BATCH_PIXELS = 200_000_000;
export const MIN_OUTPUT_SCALE = 10;
export const MAX_OUTPUT_SCALE = 400;
export const MIN_CUSTOM_SIDE = 8;

/* ---------------------------- aspect + presets ---------------------------- */

export type CropRatioOption = {
  id: string;
  label: string;
  ratio: number | null;
  note?: string;
  platform?: string;
  presetWidth?: number;
  presetHeight?: number;
};

export const CROP_RATIOS: readonly CropRatioOption[] = [
  { id: "free", label: "Free", ratio: null, note: "Draw the crop yourself" },
  { id: "1:1", label: "1:1", ratio: 1, note: "Square" },
  { id: "4:3", label: "4:3", ratio: 4 / 3, note: "Classic photo" },
  { id: "3:2", label: "3:2", ratio: 3 / 2, note: "Camera frame" },
  { id: "16:9", label: "16:9", ratio: 16 / 9, note: "Widescreen" },
  { id: "9:16", label: "9:16", ratio: 9 / 16, note: "Vertical" },
  { id: "4:5", label: "4:5", ratio: 4 / 5, note: "Portrait feed" },
] as const;

/**
 * The social presets reuse the Image Resizer's platform catalogue so both
 * tools quote the same pixel sizes. A preset sets the ratio *and* a suggested
 * export size; the crop stays free to move inside the image.
 */
export const SOCIAL_CROP_PRESETS: readonly CropRatioOption[] =
  SOCIAL_PRESETS.filter((preset) => Boolean(preset.platform)).map((preset) => ({
    id: `preset-${preset.id}`,
    label: preset.label,
    ratio: preset.width / preset.height,
    note: preset.note,
    platform: preset.platform,
    presetWidth: preset.width,
    presetHeight: preset.height,
  }));

export const RATIO_OPTIONS: readonly CropRatioOption[] = [
  ...CROP_RATIOS,
  ...SOCIAL_CROP_PRESETS,
];

export const SOCIAL_PLATFORMS: readonly string[] = Array.from(
  new Set(SOCIAL_CROP_PRESETS.map((preset) => preset.platform as string)),
);

export function ratioOption(id: string): CropRatioOption | undefined {
  return RATIO_OPTIONS.find((option) => option.id === id);
}

export function presetFor(id: string) {
  const option = ratioOption(id);
  return option && option.presetWidth && option.presetHeight
    ? {
        width: option.presetWidth,
        height: option.presetHeight,
        label: option.label,
      }
    : null;
}

/** Social presets grouped by platform, for an opt-grouped select. */
export function groupedPresets() {
  return SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    presets: SOCIAL_CROP_PRESETS.filter(
      (preset) => preset.platform === platform,
    ),
  }));
}

export function ratioForSettings(settings: Pick<CropSettings, "ratioId">) {
  return ratioOption(settings.ratioId)?.ratio ?? null;
}

/** `1:1` from 800 × 800, otherwise a two-decimal ratio. */
export function ratioLabelFor(
  settings: Pick<CropSettings, "ratioId" | "rect">,
) {
  const option = ratioOption(settings.ratioId);
  if (option) return option.label;
  const ratio = ratioFromCrop(settings.rect);
  if (!ratio) return "Free";
  return `${ratio.toFixed(2)}:1`;
}

/* --------------------------------- model ---------------------------------- */

export type CropSizeMode = "natural" | "scale" | "custom" | "preset";

export type CropSettings = {
  /** Aspect option id: `free`, `1:1`, `4:3` … or `preset-instagram-post`. */
  ratioId: string;
  /** Crop rectangle in oriented image pixels. */
  rect: CropRect;
  /** Clockwise quarter turns: 0, 90, 180 or 270. */
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  shape: CropShape;
  format: CropFormat;
  quality: number;
  sizeMode: CropSizeMode;
  /** Percent of the crop pixels when `sizeMode` is `scale`. */
  scale: number;
  /** Exact output pixels when `sizeMode` is `custom`. */
  width: number;
  height: number;
  /** CSS colour that fills JPEG corners and circle masks. */
  background: string;
  baseName: string;
  suffix: string;
  /** Honour EXIF orientation on decode. */
  autoOrient: boolean;
};

export type CropOutput = { width: number; height: number };

export function defaultSettings(width: number, height: number): CropSettings {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  return {
    ratioId: "free",
    rect: { x: 0, y: 0, width: safeWidth, height: safeHeight },
    rotation: 0,
    flipH: false,
    flipV: false,
    shape: "rect",
    format: DEFAULT_FORMAT,
    quality: DEFAULT_QUALITY,
    sizeMode: "natural",
    scale: 100,
    width: safeWidth,
    height: safeHeight,
    background: DEFAULT_BACKGROUND,
    baseName: "",
    suffix: DEFAULT_SUFFIX,
    autoOrient: true,
  };
}

export function orientedSize(width: number, height: number, rotation: number) {
  return rotatedSize(width, height, normalizeAngle(rotation));
}

/** The frame the crop rectangle currently lives in (after rotation). */
function frameFor(
  settings: Pick<CropSettings, "rotation">,
  width: number,
  height: number,
) {
  return orientedSize(width, height, settings.rotation);
}

function normaliseTurn(turns: number) {
  const angle = normalizeAngle(turns);
  return (Math.round(angle / 90) * 90) % 360;
}

/**
 * Rotate a crop rectangle with the image. A clockwise quarter turn moves the
 * old top-left corner to the new top-right, so the selection keeps covering
 * exactly the same pixels.
 */
export function rotateCropRect(
  rect: CropRect,
  imageWidth: number,
  imageHeight: number,
  direction: "cw" | "ccw" = "cw",
): CropRect {
  const start = clampCrop(rect, imageWidth, imageHeight);
  if (direction === "cw")
    return clampCrop(
      {
        x: imageHeight - (start.y + start.height),
        y: start.x,
        width: start.height,
        height: start.width,
      },
      imageHeight,
      imageWidth,
    );
  return clampCrop(
    {
      x: start.y,
      y: imageWidth - (start.x + start.width),
      width: start.height,
      height: start.width,
    },
    imageHeight,
    imageWidth,
  );
}

/** Mirror the crop rectangle across the image axes it was flipped around. */
export function flipCropRect(
  rect: CropRect,
  imageWidth: number,
  imageHeight: number,
  flipH: boolean,
  flipV: boolean,
): CropRect {
  const start = clampCrop(rect, imageWidth, imageHeight);
  return clampCrop(
    {
      x: flipH ? imageWidth - (start.x + start.width) : start.x,
      y: flipV ? imageHeight - (start.y + start.height) : start.y,
      width: start.width,
      height: start.height,
    },
    imageWidth,
    imageHeight,
  );
}

/** Switching to a ratio keeps the current selection as large as it can be. */
export function applyRatio(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
  ratioId: string,
): CropSettings {
  const option = ratioOption(ratioId);
  const ratio = option?.ratio ?? null;
  if (!option) return clampSettings(settings, imageWidth, imageHeight);
  const frame = frameFor(settings, imageWidth, imageHeight);
  const rect =
    ratio === null
      ? clampCrop(settings.rect, frame.width, frame.height)
      : centredCrop(frame.width, frame.height, ratio);
  const preset = presetFor(ratioId);
  const keepsShape = ratio === 1;
  return {
    ...settings,
    ratioId,
    rect,
    shape: keepsShape ? settings.shape : "rect",
    sizeMode: preset
      ? "preset"
      : settings.sizeMode === "preset"
        ? "natural"
        : settings.sizeMode,
    width: preset?.width ?? settings.width,
    height: preset?.height ?? settings.height,
  };
}

/** Rectangle, square or circle; square and circle force a 1:1 crop. */
export function applyShape(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
  shape: CropShape,
): CropSettings {
  if (shape === "rect") return { ...settings, shape };
  const frame = frameFor(settings, imageWidth, imageHeight);
  return {
    ...settings,
    shape,
    ratioId: "1:1",
    rect: centredCrop(frame.width, frame.height, 1),
    sizeMode: settings.sizeMode === "preset" ? "natural" : settings.sizeMode,
  };
}

/** Custom pixel width × height: sets both the crop ratio and the export size. */
export function applyCustomSize(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
): CropSettings {
  const size = validateOutputSize(width, height);
  const frame = frameFor(settings, imageWidth, imageHeight);
  return {
    ...settings,
    ratioId: "custom",
    rect: centredCrop(frame.width, frame.height, size.width / size.height),
    sizeMode: "custom",
    width: size.width,
    height: size.height,
  };
}

export function applyPreset(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
  presetId: string,
): CropSettings {
  const option = ratioOption(presetId);
  if (!option?.presetWidth || !option.presetHeight)
    return applyRatio(settings, imageWidth, imageHeight, presetId);
  const frame = frameFor(settings, imageWidth, imageHeight);
  return {
    ...settings,
    ratioId: presetId,
    rect: centredCrop(frame.width, frame.height, option.ratio ?? 1),
    sizeMode: "preset",
    width: option.presetWidth,
    height: option.presetHeight,
  };
}

/** Rotate the image and carry the crop with it. `delta` is ±90. */
export function rotateSettings(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
  delta: 90 | -90 | 180,
): CropSettings {
  const rotation = normaliseTurn(settings.rotation + delta);
  const current = frameFor(settings, imageWidth, imageHeight);
  const rect =
    Math.abs(delta) === 180
      ? clampCrop(
          {
            x: current.width - (settings.rect.x + settings.rect.width),
            y: current.height - (settings.rect.y + settings.rect.height),
            width: settings.rect.width,
            height: settings.rect.height,
          },
          current.width,
          current.height,
        )
      : rotateCropRect(
          settings.rect,
          current.width,
          current.height,
          delta === 90 ? "cw" : "ccw",
        );
  const next = orientedSize(imageWidth, imageHeight, rotation);
  return {
    ...settings,
    rotation,
    rect: clampCrop(rect, next.width, next.height),
  };
}

export function flipSettings(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
  axis: "h" | "v",
): CropSettings {
  const flipH = axis === "h" ? !settings.flipH : settings.flipH;
  const flipV = axis === "v" ? !settings.flipV : settings.flipV;
  const oriented = orientedSize(imageWidth, imageHeight, settings.rotation);
  return {
    ...settings,
    flipH,
    flipV,
    rect: flipCropRect(
      settings.rect,
      oriented.width,
      oriented.height,
      axis === "h",
      axis === "v",
    ),
  };
}

/** Reset geometry only — format, quality and naming stay as the user set them. */
export function resetGeometry(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
): CropSettings {
  return {
    ...settings,
    ratioId: "free",
    rect: { x: 0, y: 0, width: imageWidth, height: imageHeight },
    rotation: 0,
    flipH: false,
    flipV: false,
    shape: "rect",
    sizeMode: "natural",
    scale: 100,
    width: imageWidth,
    height: imageHeight,
  };
}

/** Clamp every field that depends on the oriented image size. */
export function clampSettings(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
): CropSettings {
  const oriented = orientedSize(imageWidth, imageHeight, settings.rotation);
  return {
    ...settings,
    rect: clampCrop(settings.rect, oriented.width, oriented.height),
  };
}

/* ------------------------------ output maths ------------------------------ */

export function validateOutputSize(width: number, height: number): CropOutput {
  for (const [label, value] of [
    ["Width", width],
    ["Height", height],
  ] as const) {
    if (!Number.isFinite(value) || !Number.isInteger(value))
      throw new Error(`${label} must be a whole number of pixels.`);
    if (value < MIN_CUSTOM_SIDE)
      throw new Error(`${label} must be at least ${MIN_CUSTOM_SIDE} pixels.`);
    if (value > MAX_DIMENSION)
      throw new Error(
        `${label} must be ${MAX_DIMENSION.toLocaleString("en-US")} pixels or less.`,
      );
  }
  if (width * height > MAX_OUTPUT_PIXELS)
    throw new Error(
      "That output is over 24 megapixels. Choose smaller dimensions.",
    );
  return { width, height };
}

/**
 * The exact pixels the cropper will write. `natural` is a 1:1 copy of the
 * crop, which is the lossless-resolution default.
 */
export function outputPlan(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
): CropOutput {
  const oriented = orientedSize(imageWidth, imageHeight, settings.rotation);
  const rect = clampCrop(settings.rect, oriented.width, oriented.height);
  if (settings.sizeMode === "preset") {
    const preset = presetFor(settings.ratioId);
    if (preset) return { width: preset.width, height: preset.height };
  }
  if (settings.sizeMode === "custom")
    return validateOutputSize(settings.width, settings.height);
  if (settings.sizeMode === "scale") {
    const factor = clampScale(settings.scale) / 100;
    return {
      width: Math.max(1, Math.round(rect.width * factor)),
      height: Math.max(1, Math.round(rect.height * factor)),
    };
  }
  return { width: rect.width, height: rect.height };
}

export function clampScale(value: number) {
  if (!Number.isFinite(value)) return 100;
  return Math.min(
    MAX_OUTPUT_SCALE,
    Math.max(MIN_OUTPUT_SCALE, Math.round(value)),
  );
}

export function validateCropSettings(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
) {
  if (!CROP_FORMATS.includes(settings.format))
    throw new Error("Choose JPEG, PNG or WebP output.");
  if (
    !Number.isFinite(settings.quality) ||
    settings.quality < MIN_QUALITY ||
    settings.quality > MAX_QUALITY
  )
    throw new Error(
      `Quality must be between ${MIN_QUALITY}% and ${MAX_QUALITY}%.`,
    );
  if (
    settings.format === "image/jpeg" &&
    !/^#[0-9a-f]{6}$/i.test(settings.background)
  )
    throw new Error("Choose a valid background colour for JPEG output.");
  const oriented = orientedSize(imageWidth, imageHeight, settings.rotation);
  const rect = clampCrop(settings.rect, oriented.width, oriented.height);
  if (rect.width < 1 || rect.height < 1)
    throw new Error("The crop is too small. Drag a larger area.");
  const plan = outputPlan(settings, imageWidth, imageHeight);
  return { ...validateOutputSize(plan.width, plan.height), rect, oriented };
}

export function estimatedCropBytes(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
) {
  const plan = outputPlan(settings, imageWidth, imageHeight);
  return estimateOutputBytes(
    plan.width,
    plan.height,
    settings.format,
    settings.quality,
  );
}

/** A short, human explanation of how many pixels the export keeps. */
export function resolutionNote(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
) {
  const oriented = orientedSize(imageWidth, imageHeight, settings.rotation);
  const rect = clampCrop(settings.rect, oriented.width, oriented.height);
  const plan = outputPlan(settings, imageWidth, imageHeight);
  if (plan.width === rect.width && plan.height === rect.height)
    return `1:1 crop pixels — no resampling, full quality (${plan.width} × ${plan.height}).`;
  if (plan.width * plan.height < rect.width * rect.height)
    return `Downscaled to ${plan.width} × ${plan.height} from ${rect.width} × ${rect.height} crop pixels.`;
  return `Upscaled to ${plan.width} × ${plan.height} from ${rect.width} × ${rect.height} crop pixels — extra pixels add no detail.`;
}

export function describeSettings(
  settings: CropSettings,
  imageWidth: number,
  imageHeight: number,
) {
  const plan = outputPlan(settings, imageWidth, imageHeight);
  const parts: string[] = [];
  const option = ratioOption(settings.ratioId);
  parts.push(
    settings.ratioId === "custom"
      ? "Custom ratio"
      : option
        ? option.label
        : "Free crop",
  );
  if (settings.shape === "circle") parts.push("circle");
  else if (settings.shape === "square") parts.push("square");
  if (normalizeAngle(settings.rotation))
    parts.push(`${normalizeAngle(settings.rotation)}°`);
  if (settings.flipH) parts.push("flipped H");
  if (settings.flipV) parts.push("flipped V");
  parts.push(`${plan.width} × ${plan.height}`);
  return parts;
}

/* --------------------------------- naming --------------------------------- */

export function sanitizeFragment(value: string) {
  return value.trim() ? sanitizeBaseName(value.trim(), "") : "";
}

export function cropOutputName(
  originalName: string,
  settings: CropSettings,
  plan: CropOutput,
) {
  return buildOutputName(originalName, {
    baseName: settings.baseName,
    suffix: settings.suffix,
    width: plan.width,
    height: plan.height,
    format: settings.format,
  });
}

/** Add ` (2)`, ` (3)` … before the extension when a batch repeats a name. */
export function uniqueName(name: string, used: Set<string>) {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  while (used.has(`${stem} (${index})${ext}`)) index += 1;
  const next = `${stem} (${index})${ext}`;
  used.add(next);
  return next;
}

/* -------------------------------- history --------------------------------- */

export type History<T> = { past: T[]; present: T; future: T[] };

export const MAX_HISTORY = 50;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function commitHistory<T>(
  history: History<T>,
  next: T,
  limit = MAX_HISTORY,
): History<T> {
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  return {
    past: [...history.past, history.present].slice(-limit),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, MAX_HISTORY),
  };
}

export function redoHistory<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY),
    present: next,
    future: rest,
  };
}

export const canUndo = <T>(history: History<T>) => history.past.length > 0;
export const canRedo = <T>(history: History<T>) => history.future.length > 0;

/* ---------------------------------- zoom ---------------------------------- */

export const ZOOM_MIN = 25;
export const ZOOM_MAX = 400;
export const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200, 300, 400] as const;

export function clampZoom(value: number) {
  if (!Number.isFinite(value)) return 100;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value)));
}

/** Next zoom stop in the requested direction; never leaves the range. */
export function stepZoom(value: number, direction: 1 | -1) {
  const current = clampZoom(value);
  if (direction === 1)
    return ZOOM_STEPS.find((step) => step > current) ?? ZOOM_MAX;
  return [...ZOOM_STEPS].reverse().find((step) => step < current) ?? ZOOM_MIN;
}

/**
 * Convert the visible stage window into a crop rectangle in oriented pixels.
 * `scale` is displayed screen pixels per oriented image pixel.
 */
export function visibleCrop(
  view: {
    scrollLeft: number;
    scrollTop: number;
    clientWidth: number;
    clientHeight: number;
  },
  scale: number,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const safeScale = scale > 0 ? scale : 1;
  const rect = {
    x: view.scrollLeft / safeScale,
    y: view.scrollTop / safeScale,
    width: view.clientWidth / safeScale,
    height: view.clientHeight / safeScale,
  };
  return clampCrop(
    {
      x: Math.max(0, Math.round(rect.x)),
      y: Math.max(0, Math.round(rect.y)),
      width: Math.max(MIN_CROP_PIXELS, Math.round(rect.width)),
      height: Math.max(MIN_CROP_PIXELS, Math.round(rect.height)),
    },
    imageWidth,
    imageHeight,
  );
}

export function zoomLabel(value: number) {
  return `${clampZoom(value)}%`;
}

export function formatLabel(format: CropFormat) {
  if (format === "image/jpeg") return "JPG";
  if (format === "image/png") return "PNG";
  return "WebP";
}

export function keepsTransparency(format: CropFormat) {
  return format !== "image/jpeg";
}
