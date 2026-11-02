/**
 * Pure model for the Image Converter: format catalogue, conversion settings,
 * page geometry, page-range parsing, fit maths and naming.
 *
 * Everything here is DOM-free so the maths stays unit testable. Anything that
 * needs a canvas, a decoder or PDF.js lives in `image-convert-runner.ts` and
 * `pdf-convert-runner.ts`.
 */

/* -------------------------------- formats -------------------------------- */

export type ConvertFormat =
  "jpeg" | "png" | "webp" | "avif" | "gif" | "bmp" | "tiff";

export type FormatKind = "photo" | "graphic" | "document";

export type ConvertFormatDef = {
  id: ConvertFormat;
  label: string;
  mime: string;
  extension: string;
  /** Canvas can produce this type directly (others use the built-in codecs). */
  canvas: boolean;
  /** Quality is meaningful and applied (lossy only). */
  lossy: boolean;
  /** The container can store an alpha channel. */
  alpha: boolean;
  kind: FormatKind;
  note: string;
};

export const CONVERT_FORMATS: readonly ConvertFormatDef[] = [
  {
    id: "jpeg",
    label: "JPG",
    mime: "image/jpeg",
    extension: "jpg",
    canvas: true,
    lossy: true,
    alpha: false,
    kind: "photo",
    note: "Smallest photos. No transparency — transparent pixels become the background colour.",
  },
  {
    id: "png",
    label: "PNG",
    mime: "image/png",
    extension: "png",
    canvas: true,
    lossy: false,
    alpha: true,
    kind: "graphic",
    note: "Lossless with transparency. Best for screenshots, logos and line art.",
  },
  {
    id: "webp",
    label: "WEBP",
    mime: "image/webp",
    extension: "webp",
    canvas: true,
    lossy: true,
    alpha: true,
    kind: "photo",
    note: "Modern format with transparency. Quality applies; supported wherever the browser can encode it.",
  },
  {
    id: "avif",
    label: "AVIF",
    mime: "image/avif",
    extension: "avif",
    canvas: true,
    lossy: true,
    alpha: true,
    kind: "photo",
    note: "Smallest files, encoded only where the browser supports AVIF output.",
  },
  {
    id: "gif",
    label: "GIF",
    mime: "image/gif",
    extension: "gif",
    canvas: false,
    lossy: false,
    alpha: true,
    kind: "graphic",
    note: "256-colour palette, single frame. Animated GIF inputs convert their first frame only.",
  },
  {
    id: "bmp",
    label: "BMP",
    mime: "image/bmp",
    extension: "bmp",
    canvas: false,
    lossy: false,
    alpha: false,
    kind: "document",
    note: "Uncompressed 24-bit Windows bitmap. Large files; transparency is flattened.",
  },
  {
    id: "tiff",
    label: "TIFF",
    mime: "image/tiff",
    extension: "tiff",
    canvas: false,
    lossy: false,
    alpha: true,
    kind: "document",
    note: "Baseline TIFF written here (LZW or uncompressed). Browsers cannot decode TIFF, so QUICKKIT reads it with a built-in decoder.",
  },
] as const;

export const FORMAT_BY_ID: Record<ConvertFormat, ConvertFormatDef> =
  Object.fromEntries(
    CONVERT_FORMATS.map((format) => [format.id, format]),
  ) as Record<ConvertFormat, ConvertFormatDef>;

export function formatById(id: ConvertFormat): ConvertFormatDef {
  return FORMAT_BY_ID[id];
}

export function formatLabel(id: ConvertFormat): string {
  return FORMAT_BY_ID[id].label;
}

export function extensionFor(id: ConvertFormat): string {
  return FORMAT_BY_ID[id].extension;
}

export function mimeFor(id: ConvertFormat): string {
  return FORMAT_BY_ID[id].mime;
}

/** Quality only changes bytes for these formats. */
export function usesQuality(id: ConvertFormat): boolean {
  return FORMAT_BY_ID[id].lossy;
}

export function keepsAlpha(id: ConvertFormat): boolean {
  return FORMAT_BY_ID[id].alpha;
}

/** Every input format the converter understands, including PDF. */
export type InputKind = "image" | "pdf";

export type InputFormat = ConvertFormat | "pdf";

export const INPUT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/tiff,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp,.tiff,.tif,application/pdf,.pdf";

export const INPUT_ACCEPT_PDF = "application/pdf,.pdf";

export function inputFormatFromName(
  name: string,
  mime: string,
): InputFormat | null {
  const lower = name.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mime === "image/jpeg" || /\.jpe?g$/.test(lower)) return "jpeg";
  if (mime === "image/png" || lower.endsWith(".png")) return "png";
  if (mime === "image/webp" || lower.endsWith(".webp")) return "webp";
  if (mime === "image/avif" || lower.endsWith(".avif")) return "avif";
  if (mime === "image/gif" || lower.endsWith(".gif")) return "gif";
  if (
    mime === "image/bmp" ||
    mime === "image/x-ms-bmp" ||
    lower.endsWith(".bmp")
  )
    return "bmp";
  if (
    mime === "image/tiff" ||
    mime === "image/x-tiff" ||
    lower.endsWith(".tiff") ||
    lower.endsWith(".tif")
  )
    return "tiff";
  return null;
}

export function inputLabel(format: InputFormat): string {
  return format === "pdf" ? "PDF" : formatLabel(format);
}

/* -------------------------------- limits --------------------------------- */

export const CONVERT_LIMITS = {
  /** Images per batch. */
  maxFiles: 20,
  /** Bytes per image. */
  maxImageBytes: 15 * 1024 * 1024,
  /** Pixels per image (both sides capped too). */
  maxPixels: 24_000_000,
  maxSide: 8192,
  /** Bytes per PDF. */
  maxPdfBytes: 25 * 1024 * 1024,
  /** Pages rendered from one PDF per run. */
  maxPdfPages: 100,
  /** Combined bytes the queue may hold before conversions are refused. */
  maxBatchBytes: 150 * 1024 * 1024,
  /** Output pixels per rendered PDF page. */
  maxPagePixels: 36_000_000,
  minDpi: 72,
  maxDpi: 300,
  minQuality: 10,
  maxQuality: 100,
  defaultQuality: 85,
  minMarginMm: 0,
  maxMarginMm: 60,
} as const;

export const PAGE_RENDER_DPI = [96, 150, 200, 300] as const;

/* --------------------------------- modes --------------------------------- */

export type ConvertMode = "image" | "images-to-pdf" | "pdf-to-image";

export const CONVERT_MODES: readonly {
  id: ConvertMode;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    id: "image",
    label: "Image → Image",
    short: "Images",
    hint: "Convert images between JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF.",
  },
  {
    id: "images-to-pdf",
    label: "Images → PDF",
    short: "To PDF",
    hint: "Combine one or many images into a single PDF, one image per page.",
  },
  {
    id: "pdf-to-image",
    label: "PDF → Images",
    short: "From PDF",
    hint: "Render PDF pages to JPG, PNG or WEBP at the DPI you choose.",
  },
] as const;

/* ---------------------------- page geometry ------------------------------ */

export type PageSizeId = "a4" | "a3" | "letter" | "legal" | "custom";
export type Orientation = "portrait" | "landscape";
export type FitMode = "contain" | "cover" | "fill";

export type PageSizeDef = {
  id: PageSizeId;
  label: string;
  /** Millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  note: string;
};

export const PAGE_SIZES: readonly PageSizeDef[] = [
  { id: "a4", label: "A4", widthMm: 210, heightMm: 297, note: "210 × 297 mm" },
  { id: "a3", label: "A3", widthMm: 297, heightMm: 420, note: "297 × 420 mm" },
  {
    id: "letter",
    label: "Letter",
    widthMm: 215.9,
    heightMm: 279.4,
    note: "8.5 × 11 in",
  },
  {
    id: "legal",
    label: "Legal",
    widthMm: 215.9,
    heightMm: 355.6,
    note: "8.5 × 14 in",
  },
  {
    id: "custom",
    label: "Custom",
    widthMm: 200,
    heightMm: 200,
    note: "Set your own size in millimetres",
  },
] as const;

export const MM_PER_INCH = 25.4;
export const POINTS_PER_INCH = 72;

export function mmToPt(mm: number): number {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

export function ptToMm(pt: number): number {
  return (pt / POINTS_PER_INCH) * MM_PER_INCH;
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

export function pageSizeById(id: PageSizeId): PageSizeDef {
  return PAGE_SIZES.find((page) => page.id === id) ?? PAGE_SIZES[0];
}

export type ResolvedPage = {
  label: string;
  widthPt: number;
  heightPt: number;
  widthMm: number;
  heightMm: number;
};

/** Page box in points after orientation, with honest validation. */
export function resolvePage(
  pageSize: PageSizeId,
  orientation: Orientation,
  customWidthMm: number,
  customHeightMm: number,
): ResolvedPage {
  const preset = pageSizeById(pageSize);
  let widthMm = pageSize === "custom" ? customWidthMm : preset.widthMm;
  let heightMm = pageSize === "custom" ? customHeightMm : preset.heightMm;
  if (!Number.isFinite(widthMm) || widthMm < 20 || widthMm > 2000)
    throw new Error("Page width must be between 20 mm and 2,000 mm.");
  if (!Number.isFinite(heightMm) || heightMm < 20 || heightMm > 2000)
    throw new Error("Page height must be between 20 mm and 2,000 mm.");
  if (orientation === "landscape" && heightMm > widthMm)
    [widthMm, heightMm] = [heightMm, widthMm];
  if (orientation === "portrait" && widthMm > heightMm)
    [widthMm, heightMm] = [heightMm, widthMm];
  return {
    label: pageSize === "custom" ? "Custom" : preset.label,
    widthMm: Math.round(widthMm * 10) / 10,
    heightMm: Math.round(heightMm * 10) / 10,
    widthPt: Math.round(mmToPt(widthMm) * 100) / 100,
    heightPt: Math.round(mmToPt(heightMm) * 100) / 100,
  };
}

export type Placement = { x: number; y: number; width: number; height: number };

/**
 * Where an image lands on a page. Coordinates are PDF points with the origin at
 * the bottom-left, matching pdf-lib.
 *
 * contain — whole image visible, letterboxed
 * cover   — fills the box, overflowing symmetrically (the page clips it)
 * fill    — stretched to the box (aspect ratio intentionally ignored)
 */
export function placeImage(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  marginPt: number,
  fit: FitMode,
): Placement {
  const innerWidth = Math.max(1, pageWidth - marginPt * 2);
  const innerHeight = Math.max(1, pageHeight - marginPt * 2);
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  const scaleX = innerWidth / safeWidth;
  const scaleY = innerHeight / safeHeight;
  const scale =
    fit === "contain"
      ? Math.min(scaleX, scaleY)
      : fit === "cover"
        ? Math.max(scaleX, scaleY)
        : 0;
  const width = fit === "fill" ? innerWidth : safeWidth * scale;
  const height = fit === "fill" ? innerHeight : safeHeight * scale;
  return {
    x: marginPt + (innerWidth - width) / 2,
    y: marginPt + (innerHeight - height) / 2,
    width,
    height,
  };
}

/** Pixel size of a PDF page rendered at a DPI. */
export function dpiToPixels(widthPt: number, heightPt: number, dpi: number) {
  const scale = clampDpi(dpi) / POINTS_PER_INCH;
  const width = Math.max(1, Math.round(widthPt * scale));
  const height = Math.max(1, Math.round(heightPt * scale));
  if (width * height > CONVERT_LIMITS.maxPagePixels) {
    const factor = Math.sqrt(CONVERT_LIMITS.maxPagePixels / (width * height));
    return {
      width: Math.max(1, Math.round(width * factor)),
      height: Math.max(1, Math.round(height * factor)),
      cappped: true,
    };
  }
  if (width > CONVERT_LIMITS.maxSide || height > CONVERT_LIMITS.maxSide) {
    const factor = Math.min(
      CONVERT_LIMITS.maxSide / width,
      CONVERT_LIMITS.maxSide / height,
    );
    return {
      width: Math.max(1, Math.round(width * factor)),
      height: Math.max(1, Math.round(height * factor)),
      cappped: true,
    };
  }
  return { width, height, cappped: false };
}

export function clampDpi(dpi: number): number {
  if (!Number.isFinite(dpi)) return 150;
  const rounded = Math.round(dpi);
  return Math.min(
    CONVERT_LIMITS.maxDpi,
    Math.max(CONVERT_LIMITS.minDpi, rounded),
  );
}

/* ------------------------------ page ranges ------------------------------ */

/**
 * Parse "1-3, 5, 8-6" into ordered unique page numbers clamped to the document.
 * Empty input means every page.
 */
export function parsePageRange(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  const total = Math.max(1, Math.floor(pageCount));
  if (!trimmed || /^all$/i.test(trimmed))
    return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set<number>();
  for (const chunk of trimmed.split(",")) {
    const part = chunk.trim();
    if (!part) continue;
    const match = /^(\d+)\s*(?:[-–]\s*(\d+))?$/.exec(part);
    if (!match)
      throw new Error(
        `"${part}" is not a page or range. Use numbers like 1-3, 5 or 8.`,
      );
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < 1) throw new Error("Page numbers start at 1.");
    if (start > total || end > total)
      throw new Error(
        `This document has ${total} page${total === 1 ? "" : "s"}; ${Math.max(start, end)} is out of range.`,
      );
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    for (let page = from; page <= to; page += 1) pages.add(page);
  }
  if (!pages.size) throw new Error("Choose at least one page.");
  return [...pages].sort((a, b) => a - b);
}

/** Compact description used in summaries: "1-3" style runs. */
export function describePageRange(pages: number[]): string {
  if (!pages.length) return "no pages";
  const runs: string[] = [];
  let start = pages[0];
  let previous = pages[0];
  for (const page of pages.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    runs.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = page;
    previous = page;
  }
  runs.push(start === previous ? `${start}` : `${start}-${previous}`);
  return runs.join(", ");
}

/* -------------------------------- settings ------------------------------- */

export type ResizeMode = "none" | "exact" | "percent" | "longest";

export type ResizeSettings = {
  mode: ResizeMode;
  width: number;
  height: number;
  percent: number;
  longest: number;
  lock: boolean;
};

export type ImageSettings = {
  format: ConvertFormat;
  quality: number;
  /** Keep alpha for capable formats, or flatten onto `background`. */
  alpha: "keep" | "background";
  background: string;
  resize: ResizeSettings;
  /** Honour EXIF rotation when decoding, or ignore it deliberately. */
  orientation: "auto" | "ignore";
  /** TIFF only: LZW keeps files small, none is uncompressed. */
  compression: "lzw" | "none";
};

export type PdfMakeSettings = {
  pageSize: PageSizeId;
  orientation: Orientation;
  customWidthMm: number;
  customHeightMm: number;
  marginMm: number;
  fit: FitMode;
  background: string;
  imageQuality: number;
  /** Optional document title written into the PDF info dictionary. */
  title: string;
  filename: string;
};

export type PdfRenderSettings = {
  format: "jpeg" | "png" | "webp";
  quality: number;
  dpi: number;
  range: string;
  background: string;
};

export type ConvertSettings = {
  mode: ConvertMode;
  image: ImageSettings;
  pdfMake: PdfMakeSettings;
  pdfRender: PdfRenderSettings;
  baseName: string;
  suffix: string;
};

export const DEFAULT_RESIZE: ResizeSettings = {
  mode: "none",
  width: 1600,
  height: 1200,
  percent: 100,
  longest: 1920,
  lock: true,
};

export function defaultImageSettings(): ImageSettings {
  return {
    format: "png",
    quality: CONVERT_LIMITS.defaultQuality,
    alpha: "keep",
    background: "#ffffff",
    resize: { ...DEFAULT_RESIZE },
    orientation: "auto",
    compression: "lzw",
  };
}

export function defaultSettings(mode: ConvertMode = "image"): ConvertSettings {
  return {
    mode,
    image: defaultImageSettings(),
    pdfMake: {
      pageSize: "a4",
      orientation: "portrait",
      customWidthMm: 200,
      customHeightMm: 200,
      marginMm: 10,
      fit: "contain",
      background: "#ffffff",
      imageQuality: 90,
      title: "",
      filename: "quickkit-images.pdf",
    },
    pdfRender: {
      format: "png",
      quality: 90,
      dpi: 150,
      range: "",
      background: "#ffffff",
    },
    baseName: "",
    suffix: "",
  };
}

/* ------------------------------- resizing -------------------------------- */

export type OutputSize = { width: number; height: number; resized: boolean };

/** Target pixel size for one image after the optional resize step. */
export function planOutputSize(
  width: number,
  height: number,
  resize: ResizeSettings,
): OutputSize {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  if (resize.mode === "none")
    return { width: safeWidth, height: safeHeight, resized: false };
  if (resize.mode === "percent") {
    const percent = Number.isFinite(resize.percent) ? resize.percent : 100;
    if (percent < 1 || percent > 800)
      throw new Error("Scale must be between 1% and 800%.");
    const next = {
      width: Math.max(1, Math.round((safeWidth * percent) / 100)),
      height: Math.max(1, Math.round((safeHeight * percent) / 100)),
    };
    return { ...next, resized: true };
  }
  if (resize.mode === "longest") {
    if (
      !Number.isFinite(resize.longest) ||
      resize.longest < 16 ||
      resize.longest > 8192
    )
      throw new Error("Longest side must be between 16 and 8,192 pixels.");
    const scale = resize.longest / Math.max(safeWidth, safeHeight);
    return {
      width: Math.max(1, Math.round(safeWidth * scale)),
      height: Math.max(1, Math.round(safeHeight * scale)),
      resized: true,
    };
  }
  let targetWidth = Math.round(resize.width);
  let targetHeight = Math.round(resize.height);
  if (!Number.isFinite(targetWidth) || targetWidth < 1 || targetWidth > 8192)
    throw new Error("Output width must be between 1 and 8,192 pixels.");
  if (!Number.isFinite(targetHeight) || targetHeight < 1 || targetHeight > 8192)
    throw new Error("Output height must be between 1 and 8,192 pixels.");
  if (resize.lock) {
    // Keep the source ratio: the width drives the height.
    targetHeight = Math.max(
      1,
      Math.round((targetWidth * safeHeight) / safeWidth),
    );
    if (targetHeight > 8192) {
      targetHeight = 8192;
      targetWidth = Math.max(
        1,
        Math.round((targetHeight * safeWidth) / safeHeight),
      );
    }
  }
  return { width: targetWidth, height: targetHeight, resized: true };
}

export function linkedDimension(
  width: number,
  height: number,
  next: "width" | "height",
  value: number,
): { width: number; height: number } {
  if (next === "width") {
    const safe = Math.max(1, Math.round(value));
    return {
      width: safe,
      height: Math.max(1, Math.round((safe * height) / Math.max(1, width))),
    };
  }
  const safe = Math.max(1, Math.round(value));
  return {
    width: Math.max(1, Math.round((safe * width) / Math.max(1, height))),
    height: safe,
  };
}

/* --------------------------------- naming -------------------------------- */

export function sanitizeFragment(value: string): string {
  return value
    .trim()
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
}

export function baseNameFor(
  originalName: string,
  settings: Pick<ConvertSettings, "baseName" | "suffix">,
): string {
  const base =
    sanitizeFragment(settings.baseName) ||
    sanitizeFragment(originalName) ||
    "image";
  const suffix = sanitizeFragment(settings.suffix);
  return suffix ? `${base}-${suffix}` : base;
}

export function buildOutputName(
  originalName: string,
  settings: Pick<ConvertSettings, "baseName" | "suffix">,
  format: ConvertFormat,
): string {
  const def = formatById(format);
  return `${baseNameFor(originalName, settings)}-converted.${def.extension}`;
}

export function buildPdfPageName(
  pdfName: string,
  page: number,
  format: "jpeg" | "png" | "webp",
  settings: Pick<ConvertSettings, "baseName" | "suffix">,
): string {
  const base = baseNameFor(pdfName, settings);
  return `${base}-page-${String(page).padStart(3, "0")}.${formatById(format).extension}`;
}

export function buildPdfName(
  settings: Pick<ConvertSettings, "pdfMake" | "baseName" | "suffix">,
): string {
  const explicit = sanitizeFragment(settings.pdfMake.filename);
  if (explicit)
    return explicit.toLowerCase().endsWith(".pdf")
      ? explicit
      : `${explicit}.pdf`;
  const base = sanitizeFragment(settings.baseName) || "quickkit-images";
  const suffix = sanitizeFragment(settings.suffix);
  return `${suffix ? `${base}-${suffix}` : base}.pdf`;
}

export function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  while (used.has(`${stem}-${index}${extension}`)) index += 1;
  const next = `${stem}-${index}${extension}`;
  used.add(next);
  return next;
}

/* ------------------------------- summaries ------------------------------- */

export function qualitySummary(settings: ImageSettings): string {
  return usesQuality(settings.format) ? `${settings.quality}%` : "lossless";
}

export function describeImageSettings(settings: ImageSettings): string[] {
  const parts = [formatLabel(settings.format)];
  parts.push(
    usesQuality(settings.format) ? `q${settings.quality}` : "lossless",
  );
  if (!keepsAlpha(settings.format) || settings.alpha === "background")
    parts.push(`background ${settings.background}`);
  if (settings.resize.mode !== "none") parts.push("resized");
  if (settings.format === "tiff")
    parts.push(settings.compression === "lzw" ? "LZW" : "uncompressed");
  parts.push(settings.orientation === "auto" ? "EXIF auto" : "EXIF ignored");
  return parts;
}

export function describePdfSettings(settings: PdfMakeSettings): string[] {
  const page = resolvePage(
    settings.pageSize,
    settings.orientation,
    settings.customWidthMm,
    settings.customHeightMm,
  );
  return [
    `${page.label} ${settings.orientation}`,
    `${page.widthMm} × ${page.heightMm} mm`,
    `${settings.marginMm} mm margin`,
    `${settings.fit} fit`,
    `images q${settings.imageQuality}`,
  ];
}

/** Estimated encoded size, replaced by real bytes after conversion. */
export function estimateConvertedBytes(
  width: number,
  height: number,
  format: ConvertFormat,
  quality: number,
): number {
  const pixels = Math.max(1, width * height);
  if (format === "bmp") return pixels * 3 + 54;
  if (format === "tiff") return pixels * 3 + 1024;
  if (format === "png") return Math.round(pixels * 0.9) + 4000;
  if (format === "gif") return Math.round(pixels * 0.35) + 2000;
  const q = Math.min(100, Math.max(10, quality)) / 100;
  const perPixel =
    format === "avif"
      ? 0.02 + 0.1 * Math.pow(q / 0.5, 3)
      : format === "webp"
        ? 0.03 + 0.14 * Math.pow(q / 0.5, 3)
        : 0.05 + 0.2 * Math.pow(q / 0.5, 3);
  return Math.max(1, Math.round(pixels * perPixel)) + 1000;
}

/**
 * Conversions the tool cannot promise. Returns a reason string, or null when
 * the pair is safe. Used to disable impossible choices instead of producing
 * broken files.
 */
export function unsupportedReason(
  from: InputFormat | null,
  to: ConvertFormat,
): string | null {
  if (!from) return "Unknown input format.";
  if (from === "pdf") return null;
  if (from === to) return null;
  // Every image input can reach every raster output through the canvas or the
  // built-in codecs; only alpha handling differs, which is surfaced in the UI.
  return null;
}
