/**
 * Pure resizing maths and preset data for the Image Resizer.
 * Nothing here touches the DOM, so it can be unit tested in Node.
 */

export const MIN_DIMENSION = 1;
export const MAX_DIMENSION = 8192;
export const MAX_OUTPUT_PIXELS = 24_000_000;
export const MIN_PERCENTAGE = 5;
export const MAX_PERCENTAGE = 400;
export const MAX_BATCH_FILES = 20;

export type ResizeMode =
  | "dimensions"
  | "percentage"
  | "preset"
  | "longest"
  | "shortest";
export type FitMode = "cover" | "contain" | "stretch";
export type OutputFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type PresetSize = {
  id: string;
  label: string;
  width: number;
  height: number;
  note: string;
  platform?: string;
};

export const PRESET_SIZES: readonly PresetSize[] = [
  { id: "hd", label: "HD", width: 1280, height: 720, note: "720p landscape" },
  {
    id: "full-hd",
    label: "Full HD",
    width: 1920,
    height: 1080,
    note: "1080p landscape",
  },
  { id: "4k", label: "4K UHD", width: 3840, height: 2160, note: "3840 × 2160" },
  {
    id: "square",
    label: "Square",
    width: 1080,
    height: 1080,
    note: "1:1 profile image",
  },
  {
    id: "portrait",
    label: "Portrait",
    width: 1080,
    height: 1350,
    note: "4:5 portrait",
  },
  {
    id: "web-compact",
    label: "Compact",
    width: 800,
    height: 600,
    note: "4:3 web image",
  },
  {
    id: "thumbnail",
    label: "Thumbnail",
    width: 400,
    height: 400,
    note: "Small square",
  },
  {
    id: "original-hd",
    label: "1920 wide",
    width: 1920,
    height: 1280,
    note: "3:2 photo print",
  },
];

export const SOCIAL_PRESETS: readonly PresetSize[] = [
  {
    id: "instagram-post",
    platform: "Instagram",
    label: "Instagram post",
    width: 1080,
    height: 1080,
    note: "1:1 feed",
  },
  {
    id: "instagram-portrait",
    platform: "Instagram",
    label: "Instagram portrait",
    width: 1080,
    height: 1350,
    note: "4:5 feed",
  },
  {
    id: "instagram-story",
    platform: "Instagram",
    label: "Instagram story",
    width: 1080,
    height: 1920,
    note: "9:16 story / reel cover",
  },
  {
    id: "facebook-post",
    platform: "Facebook",
    label: "Facebook post",
    width: 1200,
    height: 630,
    note: "1.91:1 link card",
  },
  {
    id: "x-post",
    platform: "X",
    label: "X post",
    width: 1600,
    height: 900,
    note: "16:9 timeline image",
  },
  {
    id: "linkedin-banner",
    platform: "LinkedIn",
    label: "LinkedIn banner",
    width: 1584,
    height: 396,
    note: "4:1 profile cover",
  },
  {
    id: "youtube-thumbnail",
    platform: "YouTube",
    label: "YouTube thumbnail",
    width: 1280,
    height: 720,
    note: "16:9 thumbnail",
  },
  {
    id: "pinterest-pin",
    platform: "Pinterest",
    label: "Pinterest pin",
    width: 1000,
    height: 1500,
    note: "2:3 tall pin",
  },
  {
    id: "instagram-square-thumb",
    platform: "Instagram",
    label: "Instagram grid",
    width: 1440,
    height: 1440,
    note: "High-res 1:1",
  },
  {
    id: "youtube-banner",
    platform: "YouTube",
    label: "YouTube banner",
    width: 2048,
    height: 1152,
    note: "Channel art 16:9",
  },
  {
    id: "youtube-shorts",
    platform: "YouTube",
    label: "YouTube Short",
    width: 1080,
    height: 1920,
    note: "9:16 vertical",
  },
  {
    id: "facebook-cover",
    platform: "Facebook",
    label: "Facebook cover",
    width: 851,
    height: 315,
    note: "Page cover",
  },
  {
    id: "facebook-story",
    platform: "Facebook",
    label: "Facebook story",
    width: 1080,
    height: 1920,
    note: "9:16 story",
  },
  {
    id: "whatsapp-status",
    platform: "WhatsApp",
    label: "WhatsApp status",
    width: 1080,
    height: 1920,
    note: "9:16 status",
  },
  {
    id: "whatsapp-profile",
    platform: "WhatsApp",
    label: "WhatsApp profile",
    width: 640,
    height: 640,
    note: "1:1 avatar",
  },
  {
    id: "whatsapp-chat",
    platform: "WhatsApp",
    label: "WhatsApp photo",
    width: 1600,
    height: 1600,
    note: "Square chat photo",
  },
  {
    id: "x-header",
    platform: "X",
    label: "X header",
    width: 1500,
    height: 500,
    note: "3:1 profile header",
  },
  {
    id: "x-profile",
    platform: "X",
    label: "X profile photo",
    width: 400,
    height: 400,
    note: "1:1 avatar",
  },
];

export const ALL_PRESETS: readonly PresetSize[] = [
  ...PRESET_SIZES,
  ...SOCIAL_PRESETS,
];

export const PERCENTAGE_STEPS = [25, 50, 75, 100] as const;

export type ResizeSettings = {
  mode: ResizeMode;
  width: number;
  height: number;
  lockAspect: boolean;
  percentage: number;
  fit: FitMode;
  preset: { width: number; height: number } | null;
  /** Target size for the longest/shortest-side modes. */
  sideLength?: number;
};

export type CropRect = { x: number; y: number; width: number; height: number };

export type ResizePlan = {
  width: number;
  height: number;
  /** Source rectangle to sample. Full frame when no crop is needed. */
  crop: CropRect | null;
  /** True when the source frame is cropped to reach the requested box. */
  cropped: boolean;
  fit: FitMode;
};

const whole = (value: number) =>
  Number.isFinite(value) && Number.isInteger(value);

export function validateDimension(value: number, label = "Dimension") {
  if (!whole(value))
    throw new Error(`${label} must be a whole number of pixels.`);
  if (value < MIN_DIMENSION)
    throw new Error(`${label} must be at least ${MIN_DIMENSION} pixel.`);
  if (value > MAX_DIMENSION)
    throw new Error(
      `${label} must be ${MAX_DIMENSION.toLocaleString("en-US")} pixels or less.`,
    );
  return value;
}

export function validateOutputSize(width: number, height: number) {
  validateDimension(width, "Width");
  validateDimension(height, "Height");
  if (width * height > MAX_OUTPUT_PIXELS)
    throw new Error(
      "That output is over 24 megapixels. Choose smaller dimensions.",
    );
  return { width, height };
}

export function validatePercentage(value: number) {
  if (!Number.isFinite(value))
    throw new Error("Enter a percentage between 5% and 400%.");
  if (value < MIN_PERCENTAGE || value > MAX_PERCENTAGE)
    throw new Error("Percentage must be between 5% and 400%.");
  return value;
}

export function validateSourceSize(width: number, height: number) {
  if (!whole(width) || !whole(height) || width < 1 || height < 1)
    throw new Error("This image has invalid pixel dimensions.");
  return { width, height };
}

function assertSource(width: number, height: number) {
  validateSourceSize(width, height);
}

/**
 * Resolve the exact output box, plus an optional centred source crop,
 * for a single image and the current workspace settings.
 */
export function planResize(
  sourceWidth: number,
  sourceHeight: number,
  settings: ResizeSettings,
): ResizePlan {
  assertSource(sourceWidth, sourceHeight);

  if (settings.mode === "dimensions") {
    let width: number;
    let height: number;
    if (settings.lockAspect) {
      width = validateDimension(settings.width, "Width");
      height =
        width === sourceWidth
          ? sourceHeight
          : Math.max(
              1,
              Math.min(
                MAX_DIMENSION,
                Math.round((width * sourceHeight) / sourceWidth),
              ),
            );
    } else {
      width = validateDimension(settings.width, "Width");
      height = validateDimension(settings.height, "Height");
    }
    validateOutputSize(width, height);
    return { width, height, crop: null, cropped: false, fit: "stretch" };
  }

  if (settings.mode === "percentage") {
    const percentage = validatePercentage(settings.percentage);
    const width = Math.max(1, Math.round((sourceWidth * percentage) / 100));
    const height = Math.max(1, Math.round((sourceHeight * percentage) / 100));
    if (width > MAX_DIMENSION || height > MAX_DIMENSION)
      throw new Error(
        `${percentage}% of this image is ${width.toLocaleString("en-US")} × ${height.toLocaleString("en-US")} px, over the 8,192 px limit per side.`,
      );
    validateOutputSize(width, height);
    return { width, height, crop: null, cropped: false, fit: "stretch" };
  }

  if (settings.mode === "longest" || settings.mode === "shortest") {
    const reference = Math.max(sourceWidth, sourceHeight);
    const smallest = Math.min(sourceWidth, sourceHeight);
    const target = validateDimension(
      settings.sideLength ?? 0,
      settings.mode === "longest" ? "Longest side" : "Shortest side",
    );
    if (settings.mode === "shortest" && target > smallest)
      throw new Error(
        `The shortest side of this image is ${smallest.toLocaleString("en-US")} px. Enter ${smallest.toLocaleString("en-US")} or less to shrink it.`,
      );
    const scale = target / (settings.mode === "longest" ? reference : smallest);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    if (width > MAX_DIMENSION || height > MAX_DIMENSION)
      throw new Error(
        `That scales the other side to ${Math.max(width, height).toLocaleString("en-US")} px, over the 8,192 px limit.`,
      );
    validateOutputSize(width, height);
    return { width, height, crop: null, cropped: false, fit: "stretch" };
  }

  if (!settings.preset)
    throw new Error("Choose a preset size before resizing.");
  const targetWidth = validateDimension(settings.preset.width, "Preset width");
  const targetHeight = validateDimension(
    settings.preset.height,
    "Preset height",
  );
  validateOutputSize(targetWidth, targetHeight);

  if (settings.fit === "stretch") {
    return {
      width: targetWidth,
      height: targetHeight,
      crop: null,
      cropped: false,
      fit: "stretch",
    };
  }

  if (settings.fit === "contain") {
    const scale = Math.min(
      targetWidth / sourceWidth,
      targetHeight / sourceHeight,
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    validateOutputSize(width, height);
    return { width, height, crop: null, cropped: false, fit: "contain" };
  }

  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = sourceWidth / sourceHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceAspect > targetAspect) {
    cropWidth = Math.max(1, Math.round(sourceHeight * targetAspect));
  } else if (sourceAspect < targetAspect) {
    cropHeight = Math.max(1, Math.round(sourceWidth / targetAspect));
  }
  cropWidth = Math.min(sourceWidth, cropWidth);
  cropHeight = Math.min(sourceHeight, cropHeight);
  const crop: CropRect = {
    x: Math.floor((sourceWidth - cropWidth) / 2),
    y: Math.floor((sourceHeight - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
  return {
    width: targetWidth,
    height: targetHeight,
    crop,
    cropped: cropWidth !== sourceWidth || cropHeight !== sourceHeight,
    fit: "cover",
  };
}

/** Height that keeps the source ratio for a given width. */
export function linkedHeight(
  width: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  if (!sourceWidth || !sourceHeight || !Number.isFinite(width)) return width;
  return Math.max(
    1,
    Math.min(MAX_DIMENSION, Math.round((width * sourceHeight) / sourceWidth)),
  );
}

/** Width that keeps the source ratio for a given height. */
export function linkedWidth(
  height: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  if (!sourceWidth || !sourceHeight || !Number.isFinite(height)) return height;
  return Math.max(
    1,
    Math.min(MAX_DIMENSION, Math.round((height * sourceWidth) / sourceHeight)),
  );
}

export function extensionFor(format: OutputFormat) {
  if (format === "image/jpeg") return "jpg";
  if (format === "image/png") return "png";
  if (format === "image/webp") return "webp";
  return "avif";
}

export function formatLabel(format: OutputFormat) {
  if (format === "image/jpeg") return "JPEG";
  if (format === "image/png") return "PNG";
  if (format === "image/webp") return "WebP";
  return "AVIF";
}

/** Social presets grouped by platform, in a stable display order. */
export const SOCIAL_PLATFORMS = [
  "Instagram",
  "YouTube",
  "Facebook",
  "WhatsApp",
  "X",
  "LinkedIn",
  "Pinterest",
] as const;

export function presetsByPlatform(platform: string) {
  return SOCIAL_PRESETS.filter((preset) => preset.platform === platform);
}

export function sanitizeBaseName(name: string, fallback = "image") {
  const base = name
    .replace(/\.[^.\\/]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\.{2,}/g, ".")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60)
    .replace(/[-.]+$/g, "");
  return base || fallback;
}

export function outputFileName(
  originalName: string,
  width: number,
  height: number,
  format: OutputFormat,
) {
  return `${sanitizeBaseName(originalName)}-${width}x${height}.${extensionFor(format)}`;
}

/** Adds " (2)", " (3)" … when a batch produces duplicate names. */
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

export function formatPixels(value: number) {
  return Number.isFinite(value)
    ? Math.round(value).toLocaleString("en-US")
    : "—";
}

export function scalePercent(target: number, source: number) {
  if (!source || !Number.isFinite(target)) return 0;
  return Math.round((target / source) * 100);
}

/** Readable file-size comparison, e.g. "64% smaller than the source file". */
export function sizeDeltaLabel(outputBytes: number, inputBytes: number) {
  if (
    !inputBytes ||
    !Number.isFinite(outputBytes) ||
    !Number.isFinite(inputBytes)
  )
    return "file size unavailable";
  const ratio = outputBytes / inputBytes;
  if (Math.abs(ratio - 1) < 0.005) return "about the same as the source file";
  const percent = Math.max(1, Math.round(Math.abs(1 - ratio) * 100));
  return ratio < 1
    ? `${percent}% smaller than the source file`
    : `${percent}% larger than the source file`;
}

export function pixelCount(width: number, height: number) {
  return width * height;
}

export function megapixels(width: number, height: number) {
  return Math.round((width * height) / 10_000) / 100;
}
