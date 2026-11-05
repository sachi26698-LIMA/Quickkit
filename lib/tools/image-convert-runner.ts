"use client";

/**
 * Browser-side conversion engine for the Image & PDF Converter.
 *
 * Everything here runs locally: files are decoded with the browser's own
 * image decoder, drawn on an offscreen canvas, and encoded with either
 * `canvas.toBlob` or the built-in BMP/GIF/TIFF codecs (in a worker). PDFs are
 * read and written with PDF.js and pdf-lib, both bundled with the site.
 *
 * No blob ever leaves the page: there is no fetch, no upload and no logging of
 * file contents.
 */
import {
  decodeTiff,
  inspectGif,
  inspectTiff,
  tiffDpi,
} from "@/lib/tools/image-codec";
import { METADATA_SCAN_LIMIT, scanMetadata } from "@/lib/tools/exif";
import {
  runSizeSearch,
  targetBytes,
  validateTarget,
  type SizeReport,
} from "@/lib/tools/image-size";
import {
  buildOutputName,
  buildPdfName,
  buildPdfPageName,
  clampDpi,
  CONVERT_LIMITS,
  cropPixels,
  cropIsWhole,
  dpiToPixels,
  formatById,
  hasImageEdits,
  inputFormatFromName,
  keepsAlpha,
  mmToPt,
  parsePageRange,
  placeForFit,
  placeImage,
  planOutputSize,
  resolvePage,
  type ConvertFormat,
  type ConvertSettings,
  type ImageEditsSettings,
  type FitMode,
  uniqueName,
  type InputFormat,
  type InputKind,
  type Placement,
} from "@/lib/tools/image-convert";
import { rotatedSize } from "@/lib/tools/image-edits";
import {
  keptPages,
  pageNumberLabel,
  pageNumberPlacement,
  parseKeywords,
  watermarkPlacement,
  splitGroups,
  studioOutputName,
  type PdfPageOp,
  type PdfSourceSummary,
  type PdfStudioAction,
  type PdfStudioSettings,
} from "@/lib/tools/pdf-studio";
import {
  PDF_COMPRESSION_PRESETS,
  presetSettings,
} from "@/lib/tools/pdf/compress-pdf-logic";
import { compressPdfBytes } from "@/lib/tools/pdf/compress-engine";
import {
  encodeSpecial,
  resetImageEncoder,
} from "@/lib/tools/image-encode-client";

export { resetImageEncoder };
import { createZip, type ZipEntry } from "@/lib/tools/zip";

/* --------------------------------- types --------------------------------- */

export type InputDetails = {
  format: InputFormat;
  kind: InputKind;
  width?: number;
  height?: number;
  pages?: number;
  dpi?: number | null;
  /** GIF only: real frame count, so animations are never silently flattened. */
  frames?: number;
  animated?: boolean;
  /** An embedded ICC profile was found; output is written as sRGB. */
  colorProfile?: boolean;
  /** Embedded metadata found in the source (never copied to the output). */
  metadata?: { exif: boolean; gps: boolean; xmp: boolean };
};

export type ConversionOutput = {
  /** Suggested download name, already sanitised and de-duplicated by caller. */
  name: string;
  blob: Blob;
  format: ConvertFormat | "pdf";
  width?: number;
  height?: number;
  pages?: number;
  /** Honest caveat shown under the result, e.g. GIF first frame. */
  note?: string;
  /** What the size engine actually did. Absent in fixed-quality mode. */
  size?: SizeReport;
};

export type PdfPageOutput = {
  page: number;
  name: string;
  blob: Blob;
  width: number;
  height: number;
};

export type ProgressReporter = (done: number, total: number) => void;

export const UNSUPPORTED_AVIF =
  "This browser cannot decode AVIF. Try Chrome, Edge or Firefox.";
export const UNSUPPORTED_AVIF_EXPORT =
  "This browser cannot encode AVIF. Choose PNG, JPEG or WebP instead.";
export const UNSUPPORTED_WEBP_EXPORT =
  "This browser cannot encode WebP. Choose PNG or JPEG instead.";
export const UNSUPPORTED_HEIC =
  "This browser has no HEIC/HEIF decoder. Open the file in Safari or convert it on the device that took it, then try again.";
export const PASSWORD_PDF =
  "Password-protected PDFs are not supported yet. Remove the password and try again.";

/* ------------------------------- utilities ------------------------------- */

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("The conversion was cancelled.");
}

function checkImageSize(width: number, height: number) {
  if (!width || !height)
    throw new Error("This image reported an invalid size and cannot be used.");
  if (
    width * height > CONVERT_LIMITS.maxPixels ||
    width > CONVERT_LIMITS.maxSide ||
    height > CONVERT_LIMITS.maxSide
  )
    throw new Error(
      `Images must be at most 24 megapixels with neither side above 8,192 pixels (this one is ${width} × ${height}).`,
    );
  return { width, height };
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Canvas rendering is unavailable in this browser.");
  return { canvas, context };
}

function releaseCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

/** Snap any angle to the nearest clockwise quarter turn. */
export function normalizeRotation(value: number): 0 | 90 | 180 | 270 {
  if (!Number.isFinite(value)) return 0;
  const steps = Math.round((((value % 360) + 360) % 360) / 90) % 4;
  return ([0, 90, 180, 270] as const)[steps];
}

/**
 * Rotate a canvas by a quarter turn and return the new canvas. Quarter turns
 * map pixels one-to-one, so the caller loses nothing beyond the single
 * resample it was already about to do when placing the image on a page.
 */
function rotateCanvasBy(
  source: HTMLCanvasElement,
  degrees: 90 | 180 | 270,
): HTMLCanvasElement {
  const swap = degrees !== 180;
  const width = swap ? source.height : source.width;
  const height = swap ? source.width : source.height;
  const { canvas, context } = makeCanvas(width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  context.restore();
  return canvas;
}

function readBmpSize(bytes: Uint8Array) {
  if (bytes.length < 26 || bytes[0] !== 0x42 || bytes[1] !== 0x4d)
    throw new Error("This file is not a valid BMP image.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = Math.abs(view.getInt32(18, true));
  const height = Math.abs(view.getInt32(22, true));
  return checkImageSize(width, height);
}

function readGifSize(bytes: Uint8Array) {
  if (
    bytes.length < 10 ||
    String.fromCharCode(...bytes.subarray(0, 3)) !== "GIF"
  )
    throw new Error("This file is not a valid GIF image.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return checkImageSize(view.getUint16(6, true), view.getUint16(8, true));
}

async function decodeBitmap(
  blob: Blob,
  orientation: "auto" | "ignore",
): Promise<ImageBitmap> {
  const preference = orientation === "auto" ? "from-image" : "none";
  try {
    return await createImageBitmap(blob, { imageOrientation: preference });
  } catch {
    // Older engines reject the options bag; retry with the default decoder.
    return await createImageBitmap(blob);
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode this image."));
      },
      type,
      quality,
    );
  });
}

/* ------------------------------ inspection ------------------------------- */

/** Read format, pixel dimensions and PDF page count without keeping pixels. */
export async function inspectInput(file: File): Promise<InputDetails> {
  const format = inputFormatFromName(file.name, file.type);
  if (!format)
    throw new Error(
      "Unsupported file type. Use JPG, PNG, WebP, AVIF, GIF, BMP, TIFF or PDF.",
    );
  if (format === "pdf") {
    if (file.size > CONVERT_LIMITS.maxPdfBytes)
      throw new Error("PDFs must be 25 MB or smaller.");
    return { format, kind: "pdf" };
  }

  if (file.size > CONVERT_LIMITS.maxImageBytes)
    throw new Error("Images must be 15 MB or smaller.");
  if (file.size === 0) throw new Error("This file is empty.");

  if (format === "tiff") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const size = inspectTiff(bytes);
      const checked = checkImageSize(size.width, size.height);
      return {
        format,
        kind: "image",
        ...checked,
        dpi: tiffDpi(bytes),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error && error.message.startsWith("Images must")
          ? error.message
          : "This TIFF could not be read. Tiled, 16-bit and CMYK TIFFs are not supported.",
      );
    }
  }

  if (format === "bmp") {
    return {
      format,
      kind: "image",
      ...readBmpSize(new Uint8Array(await file.slice(0, 1024).arrayBuffer())),
    };
  }

  if (format === "gif") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const gif = inspectGif(bytes);
      return {
        format,
        kind: "image",
        ...checkImageSize(gif.width, gif.height),
        frames: gif.frames,
        animated: gif.animated,
      };
    } catch {
      // A truncated GIF still reports its header size, so fall back to that.
      return {
        format,
        kind: "image",
        ...readGifSize(bytes.subarray(0, 64)),
        frames: 1,
        animated: false,
      };
    }
  }

  if (format === "heic") {
    // Only engines with a HEIF codec can decode this; say so plainly.
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await decodeBitmap(file, "auto");
      return {
        format,
        kind: "image",
        ...checkImageSize(bitmap.width, bitmap.height),
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Images must"))
        throw error;
      throw new Error(UNSUPPORTED_HEIC);
    } finally {
      bitmap?.close();
    }
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await decodeBitmap(file, "auto");
    const details = await scanSourceMetadata(file, format);
    return {
      format,
      kind: "image",
      ...checkImageSize(bitmap.width, bitmap.height),
      ...details,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Images must"))
      throw error;
    if (format === "avif") throw new Error(UNSUPPORTED_AVIF);
    throw new Error(
      `This ${format.toUpperCase()} could not be decoded. The file may be corrupt.`,
    );
  } finally {
    bitmap?.close();
  }
}

/**
 * Report what the source carries (EXIF, GPS, XMP, ICC). Only the first
 * 256 KB is read and the bytes are never retained; output is always written
 * clean, so this is disclosure, not a copy.
 */
async function scanSourceMetadata(
  file: File,
  format: InputFormat,
): Promise<Pick<InputDetails, "colorProfile" | "metadata">> {
  if (format !== "jpeg" && format !== "png" && format !== "webp") return {};
  try {
    const bytes = new Uint8Array(
      await file.slice(0, METADATA_SCAN_LIMIT).arrayBuffer(),
    );
    const report = scanMetadata(bytes, formatById(format).mime);
    const found = report.hasExif || report.hasGps || report.hasXmp;
    return {
      colorProfile: report.hasIcc,
      metadata: found
        ? { exif: report.hasExif, gps: report.hasGps, xmp: report.hasXmp }
        : undefined,
    };
  } catch {
    return {};
  }
}

/* ------------------------------ decoding --------------------------------- */

type DecodedImage = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpi: number | null;
};

/** Decode any supported image into a canvas we can re-encode from. */
export async function decodeImage(
  file: File,
  format: Exclude<InputFormat, "pdf">,
  orientation: "auto" | "ignore",
): Promise<DecodedImage> {
  if (format === "heic") {
    // Reachable only when the engine actually has a HEIF codec.
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await decodeBitmap(file, orientation);
      const { width, height } = checkImageSize(bitmap.width, bitmap.height);
      const { canvas, context } = makeCanvas(width, height);
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, width, height);
      return { canvas, width, height, dpi: null };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Images must"))
        throw error;
      throw new Error(UNSUPPORTED_HEIC);
    } finally {
      bitmap?.close();
    }
  }

  if (format === "tiff") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pixels = decodeTiff(bytes);
    checkImageSize(pixels.width, pixels.height);
    const { canvas, context } = makeCanvas(pixels.width, pixels.height);
    const data = new ImageData(
      new Uint8ClampedArray(pixels.data),
      pixels.width,
      pixels.height,
    );
    context.putImageData(data, 0, 0);
    return {
      canvas,
      width: pixels.width,
      height: pixels.height,
      dpi: tiffDpi(bytes),
    };
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await decodeBitmap(file, orientation);
    const { width, height } = checkImageSize(bitmap.width, bitmap.height);
    const { canvas, context } = makeCanvas(width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    return { canvas, width, height, dpi: null };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Images must"))
      throw error;
    if (format === "avif") throw new Error(UNSUPPORTED_AVIF);
    throw new Error(
      `This ${format.toUpperCase()} could not be decoded. The file may be corrupt.`,
    );
  } finally {
    bitmap?.close();
  }
}

/* ----------------------------- canvas encoding ---------------------------- */

export type CanvasSupport = Record<"jpeg" | "png" | "webp" | "avif", boolean>;

let supportPromise: Promise<CanvasSupport> | null = null;

/**
 * Real feature detection: some browsers silently produce PNG when asked for
 * WebP or AVIF, so we check the blob type instead of trusting `toBlob`.
 */
export function canvasEncodeSupport(): Promise<CanvasSupport> {
  if (!supportPromise) {
    supportPromise = (async () => {
      const support: CanvasSupport = {
        jpeg: false,
        png: false,
        webp: false,
        avif: false,
      };
      if (typeof document === "undefined") return support;
      const { canvas, context } = makeCanvas(2, 2);
      context.fillStyle = "#7c5cff";
      context.fillRect(0, 0, 2, 2);
      for (const id of ["jpeg", "png", "webp", "avif"] as const) {
        const type = formatById(id).mime;
        try {
          const blob = await canvasToBlob(canvas, type, 0.92);
          support[id] = blob.type === type;
        } catch {
          support[id] = false;
        }
      }
      releaseCanvas(canvas);
      return support;
    })();
  }
  return supportPromise;
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: ConvertFormat,
  quality: number,
  options: {
    background: string;
    transparent: boolean;
    compression: "lzw" | "none";
    dpi: number;
  },
): Promise<Blob> {
  const def = formatById(format);
  if (def.canvas) {
    const blob = await canvasToBlob(
      canvas,
      def.mime,
      def.lossy ? Math.min(100, Math.max(10, quality)) / 100 : undefined,
    );
    if (blob.type !== def.mime) {
      if (format === "avif") throw new Error(UNSUPPORTED_AVIF_EXPORT);
      if (format === "webp") throw new Error(UNSUPPORTED_WEBP_EXPORT);
      throw new Error(
        `This browser cannot encode ${def.label}. Choose another format.`,
      );
    }
    return blob;
  }

  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Canvas rendering is unavailable in this browser.");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const bytes = await encodeSpecial(
    {
      width: canvas.width,
      height: canvas.height,
      data: pixels.data,
    },
    format as "bmp" | "gif" | "tiff",
    {
      background: options.background,
      transparent: options.transparent,
      compression: options.compression,
      dpi: options.dpi,
    },
  );
  return new Blob([new Uint8Array(bytes)], { type: def.mime });
}

/* -------------------------- image → image -------------------------------- */

export type ConvertImageOptions = {
  format: ConvertFormat;
  settings: ConvertSettings;
  details?: InputDetails;
  signal?: AbortSignal;
  /** 1-based position in the batch, for the `{index}` name template token. */
  index?: number;
};

/** True when a GIF can be copied through byte-for-byte. */
function canPreserveGif(
  details: InputDetails,
  format: ConvertFormat,
  settings: ConvertSettings,
): boolean {
  if (details.format !== "gif" || !details.animated) return false;
  if (format !== "gif") return false;
  if (settings.image.resize.mode !== "none") return false;
  // Any pixel work — crop, rotate, flip — means the bytes cannot be copied.
  if (hasImageEdits(settings.image.edits)) return false;
  // Flattening would rewrite pixels, which a byte copy cannot do.
  return settings.image.alpha === "keep";
}

function gifNote(
  details: InputDetails,
  format: ConvertFormat,
): string | undefined {
  if (details.format !== "gif" || !details.animated) return undefined;
  if (format === "gif")
    return `Animation preserved — all ${details.frames} frames copied unchanged.`;
  return `This GIF has ${details.frames} frames; only the first frame is exported. Choose GIF as the output to keep the animation.`;
}

function metadataNote(details: InputDetails): string | undefined {
  const found: string[] = [];
  if (details.metadata?.exif) found.push("EXIF");
  if (details.metadata?.gps) found.push("GPS location");
  if (details.metadata?.xmp) found.push("XMP");
  if (details.colorProfile) found.push("colour profile");
  if (!found.length) return undefined;
  return `Removed from the output: ${found.join(", ")}. Colours are written as sRGB.`;
}

/** Join the honest caveats into one readable note. */
function joinNotes(
  ...notes: (string | undefined | null)[]
): string | undefined {
  const kept = notes.filter((note): note is string => Boolean(note));
  return kept.length ? kept.join(" ") : undefined;
}

/**
 * Convert one image file. Honours per-file format overrides, quality or a
 * target file size, alpha handling, optional resize and EXIF orientation.
 *
 * The source `File` is only ever read — nothing here writes back to it.
 */
export async function convertImageFile(
  file: File,
  options: ConvertImageOptions,
): Promise<ConversionOutput> {
  const { settings, signal } = options;
  const details = options.details ?? (await inspectInput(file));
  if (details.format === "pdf")
    throw new Error(
      "PDFs are converted with the PDF modes, not image-to-image.",
    );
  assertNotAborted(signal);

  const requested = options.format;
  const size = settings.image.size;
  const targetMode = size.mode === "target";
  const target = targetMode
    ? targetBytes(Number(size.targetValue), size.targetUnit)
    : 0;
  if (targetMode) {
    const invalid = validateTarget(size.targetValue, size.targetUnit);
    if (invalid) throw new Error(invalid);
  }

  // An animated GIF that needs no pixel work is copied, not re-encoded: every
  // frame, delay and loop survives and nothing is lost to a palette rebuild.
  if (canPreserveGif(details, requested, settings)) {
    const blob = file.slice(0, file.size, formatById("gif").mime);
    return {
      name: buildOutputName(file.name, settings, requested, options.index),
      blob,
      format: requested,
      width: details.width,
      height: details.height,
      note: gifNote(details, requested),
      size: {
        lossless: true,
        quality: 100,
        probes: 0,
        targetMet: !targetMode || blob.size <= target,
        downscaled: false,
        target: targetMode ? target : undefined,
      },
    };
  }

  const decoded = await decodeImage(
    file,
    details.format,
    settings.image.orientation,
  );
  const edited = applyEdits(decoded, settings.image.edits);
  try {
    assertNotAborted(signal);
    const keepAlpha = settings.image.alpha === "keep";
    const transparent = keepsAlpha(requested) && keepAlpha;
    const plan = planOutputSize(
      edited.width,
      edited.height,
      settings.image.resize,
    );
    checkImageSize(plan.width, plan.height);
    // A chosen resolution wins; otherwise the source's own DPI is carried over
    // so a 300 DPI scan does not silently become a 96 DPI one.
    const dpi =
      settings.image.resize.mode === "none"
        ? (decoded.dpi ?? 96)
        : settings.image.resize.dpi;
    // Fit only means something against an exact box; the other modes keep the
    // source ratio, where every fit mode is identical anyway.
    const fit =
      settings.image.resize.mode === "exact"
        ? settings.image.resize.fit
        : "stretch";

    const drawAt = (width: number, height: number) => {
      const { canvas, context } = makeCanvas(width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (!transparent) {
        context.fillStyle = settings.image.background;
        context.fillRect(0, 0, width, height);
      }
      const placement = placeForFit(
        edited.width,
        edited.height,
        width,
        height,
        fit,
      );
      context.drawImage(
        edited.canvas,
        placement.sx,
        placement.sy,
        placement.sw,
        placement.sh,
        placement.dx,
        placement.dy,
        placement.dw,
        placement.dh,
      );
      return canvas;
    };
    const encodeAt = (
      canvas: HTMLCanvasElement,
      format: ConvertFormat,
      quality: number,
    ) =>
      encodeCanvas(canvas, format, quality, {
        background: settings.image.background,
        transparent: keepsAlpha(format) && keepAlpha,
        compression: settings.image.compression,
        dpi,
      });

    if (!targetMode) {
      const canvas = drawAt(plan.width, plan.height);
      try {
        const blob = await encodeAt(canvas, requested, settings.image.quality);
        return {
          name: buildOutputName(file.name, settings, requested, options.index),
          blob,
          format: requested,
          width: plan.width,
          height: plan.height,
          note: joinNotes(
            gifNote(details, requested),
            largerThanSource(file.size, blob.size, plan.resized)
              ? `Re-encoding made this file larger than the original (${formatKb(blob.size)} vs ${formatKb(file.size)}). The source was already well compressed.`
              : undefined,
            metadataNote(details),
          ),
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    // The whole decision procedure lives in the pure, unit-tested engine;
    // this module only supplies the canvas, the encoder and the abort check.
    const support = await canvasEncodeSupport();
    const outcome = await runSizeSearch<HTMLCanvasElement>({
      drawAt: (width, height) => {
        checkImageSize(width, height);
        return drawAt(width, height);
      },
      encodeAt,
      release: releaseCanvas,
      assertNotAborted: () => assertNotAborted(signal),
      format: requested,
      width: plan.width,
      height: plan.height,
      settings: {
        ...size,
        keepAlpha,
        supported: (candidate) =>
          !formatById(candidate).canvas ||
          support[candidate as keyof CanvasSupport],
      },
      ceiling: settings.image.quality,
      target,
    });
    // The engine already freed every render it created, winner included.
    const warning = outcome.report.warning;

    return {
      name: buildOutputName(file.name, settings, outcome.format, options.index),
      blob: outcome.blob,
      format: outcome.format,
      width: outcome.width,
      height: outcome.height,
      note: joinNotes(
        gifNote(details, outcome.format),
        outcome.report.switchedFrom
          ? `Switched ${formatById(outcome.report.switchedFrom).label} → ${formatById(outcome.format).label} to reach the target.`
          : undefined,
        outcome.report.downscaled
          ? `Dimensions reduced to ${outcome.width} × ${outcome.height} px to reach the target.`
          : undefined,
        largerThanSource(file.size, outcome.blob.size, true)
          ? `The output is larger than the original (${formatKb(outcome.blob.size)} vs ${formatKb(file.size)}).`
          : undefined,
        metadataNote(details),
      ),
      size: {
        ...outcome.report,
        target: targetMode ? target : undefined,
        warning,
      },
    };
  } finally {
    releaseCanvas(edited.canvas);
    // The edit step may have produced a new canvas; free both when they differ.
    if (edited.canvas !== decoded.canvas) releaseCanvas(decoded.canvas);
  }
}

/**
 * Apply crop, straighten, quick rotation and flips, in that order.
 *
 * Returns the decoded canvas untouched when there is nothing to do, so the
 * common path never pays for an extra canvas.
 */
function applyEdits(
  decoded: { canvas: HTMLCanvasElement; width: number; height: number },
  edits: ImageEditsSettings,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  if (!hasImageEdits(edits)) return decoded;

  let canvas = decoded.canvas;
  let width = decoded.width;
  let height = decoded.height;
  const scratch: HTMLCanvasElement[] = [];

  const draw = (
    next: HTMLCanvasElement,
    paint: (ctx: CanvasRenderingContext2D) => void,
  ) => {
    const context = next.getContext("2d");
    if (!context)
      throw new Error("Canvas rendering is unavailable in this browser.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    paint(context);
    return next;
  };

  try {
    // 1 — crop, in source pixel space.
    if (!cropIsWhole(edits.crop) && edits.crop) {
      const rect = cropPixels(edits.crop, width, height);
      const cropped = draw(makeCanvas(rect.width, rect.height).canvas, (ctx) =>
        ctx.drawImage(
          canvas,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          0,
          0,
          rect.width,
          rect.height,
        ),
      );
      if (canvas !== decoded.canvas) scratch.push(canvas);
      canvas = cropped;
      width = rect.width;
      height = rect.height;
    }

    // 2 — straighten: an arbitrary angle, so the box grows to hold the corners.
    if (Math.abs(edits.straighten) > 0.01) {
      const box = rotatedSize(width, height, edits.straighten);
      const radians = (edits.straighten * Math.PI) / 180;
      const straightened = draw(
        makeCanvas(box.width, box.height).canvas,
        (ctx) => {
          ctx.translate(box.width / 2, box.height / 2);
          ctx.rotate(radians);
          ctx.drawImage(canvas, -width / 2, -height / 2, width, height);
        },
      );
      if (canvas !== decoded.canvas) scratch.push(canvas);
      canvas = straightened;
      width = box.width;
      height = box.height;
    }

    // 3 — quick rotation in 90° steps.
    if (edits.rotate === 90 || edits.rotate === 270 || edits.rotate === 180) {
      const swapped = edits.rotate !== 180;
      const target = swapped
        ? { width: height, height: width }
        : { width, height };
      const rotated = draw(
        makeCanvas(target.width, target.height).canvas,
        (ctx) => {
          ctx.translate(target.width / 2, target.height / 2);
          ctx.rotate((edits.rotate * Math.PI) / 180);
          ctx.drawImage(canvas, -width / 2, -height / 2, width, height);
        },
      );
      if (canvas !== decoded.canvas) scratch.push(canvas);
      canvas = rotated;
      width = target.width;
      height = target.height;
    }

    // 4 — flips.
    if (edits.flipH || edits.flipV) {
      const flipped = draw(makeCanvas(width, height).canvas, (ctx) => {
        ctx.translate(edits.flipH ? width : 0, edits.flipV ? height : 0);
        ctx.scale(edits.flipH ? -1 : 1, edits.flipV ? -1 : 1);
        ctx.drawImage(canvas, 0, 0, width, height);
      });
      if (canvas !== decoded.canvas) scratch.push(canvas);
      canvas = flipped;
    }

    // The caller frees the canvas we hand back; free the intermediates now.
    for (const entry of scratch)
      if (entry !== canvas && entry !== decoded.canvas) releaseCanvas(entry);
    return { canvas, width, height };
  } catch (error) {
    for (const entry of scratch)
      if (entry !== decoded.canvas) releaseCanvas(entry);
    throw error;
  }
}

function formatKb(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function largerThanSource(
  sourceBytes: number,
  outputBytes: number,
  ignore: boolean,
) {
  return !ignore && outputBytes > sourceBytes;
}

/* ----------------------------- images → PDF ------------------------------ */

type PdfLib = typeof import("@cantoo/pdf-lib");
let pdfLibPromise: Promise<PdfLib> | null = null;

function loadPdfLib(): Promise<PdfLib> {
  pdfLibPromise ??= import("@cantoo/pdf-lib");
  return pdfLibPromise;
}

const PDF_EMBED_DPI = 300;
const PDF_EMBED_MAX_SIDE = 3600;

/** Pixel size for a raster embedded in a PDF page placement. */
export function planPdfEmbedSize(
  width: number,
  height: number,
  placement: Placement,
  dpi = PDF_EMBED_DPI,
  maxSide = PDF_EMBED_MAX_SIDE,
) {
  if (width < 1 || height < 1)
    throw new Error("The image has no pixels to place on the page.");
  const targetWidth = (placement.width / 72) * dpi;
  const targetHeight = (placement.height / 72) * dpi;
  const scale = Math.min(
    1,
    targetWidth / width,
    targetHeight / height,
    maxSide / Math.max(width, height),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: scale < 1,
  };
}

/** Centre-crop pixel rectangle matching an aspect ratio (cover mode). */
export function coverCrop(
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
) {
  if (width < 1 || height < 1 || targetWidth < 1 || targetHeight < 1)
    throw new Error("Invalid page geometry for this image.");
  const sourceRatio = width / height;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const cropWidth = Math.round(height * targetRatio);
    return {
      x: Math.max(0, Math.round((width - cropWidth) / 2)),
      y: 0,
      width: Math.min(width, cropWidth),
      height,
    };
  }
  const cropHeight = Math.round(width / targetRatio);
  return {
    x: 0,
    y: Math.max(0, Math.round((height - cropHeight) / 2)),
    width,
    height: Math.min(height, cropHeight),
  };
}

export type PdfFromImagesOptions = {
  signal?: AbortSignal;
  onPage?: (done: number, total: number) => void;
  /**
   * Clockwise quarter turns per image, matched to `files` by index. Anything
   * absent or out of range is treated as 0, so callers that do not care about
   * rotation keep working unchanged.
   */
  rotations?: readonly number[];
};

/**
 * Build a real multi-page PDF: one image per page, chosen paper size,
 * orientation, margins, fit mode and page background. Images are embedded as
 * JPEG so large photos stay a sane size; text stays raster (never claim
 * editable text here).
 */
export async function imagesToPdf(
  files: File[],
  settings: ConvertSettings,
  options: PdfFromImagesOptions = {},
): Promise<ConversionOutput> {
  if (!files.length) throw new Error("Add at least one image first.");
  if (files.length > CONVERT_LIMITS.maxFiles)
    throw new Error(`Add at most ${CONVERT_LIMITS.maxFiles} images at a time.`);

  const page = resolvePage(
    settings.pdfMake.pageSize,
    settings.pdfMake.orientation,
    settings.pdfMake.customWidthMm,
    settings.pdfMake.customHeightMm,
  );
  if (
    !Number.isFinite(settings.pdfMake.marginMm) ||
    settings.pdfMake.marginMm < 0 ||
    settings.pdfMake.marginMm > CONVERT_LIMITS.maxMarginMm
  )
    throw new Error(
      `Margins must be between 0 and ${CONVERT_LIMITS.maxMarginMm} mm.`,
    );
  const marginPt = mmToPt(settings.pdfMake.marginMm);
  if (marginPt * 2 >= page.widthPt || marginPt * 2 >= page.heightPt)
    throw new Error("The margins are too large for this page size.");

  const pdfLib = await loadPdfLib();
  const pdfDoc = await pdfLib.PDFDocument.create();
  const fallbackName = buildPdfName(settings);
  pdfDoc.setTitle(settings.pdfMake.title.trim() || fallbackName);
  pdfDoc.setCreator("QUICKKIT Image & PDF Converter");
  pdfDoc.setProducer("QUICKKIT (pdf-lib)");
  const [bgR, bgG, bgB] = hexToRgbTuple(settings.pdfMake.background);

  for (let index = 0; index < files.length; index += 1) {
    assertNotAborted(options.signal);
    const file = files[index];
    const details = await inspectInput(file);
    if (details.format === "pdf")
      throw new Error(
        `"${file.name}" is a PDF. Images to PDF accepts image files only.`,
      );

    const decoded = await decodeImage(
      file,
      details.format,
      settings.image.orientation,
    );
    const rotation = normalizeRotation(options.rotations?.[index] ?? 0);
    const source =
      rotation === 0
        ? decoded.canvas
        : rotateCanvasBy(decoded.canvas, rotation);
    const sourceWidth = source.width;
    const sourceHeight = source.height;
    try {
      const fit: FitMode = settings.pdfMake.fit;
      const placementBox = {
        x: 0,
        y: 0,
        width: page.widthPt - marginPt * 2,
        height: page.heightPt - marginPt * 2,
      };
      const crop =
        fit === "cover"
          ? coverCrop(
              sourceWidth,
              sourceHeight,
              placementBox.width,
              placementBox.height,
            )
          : { x: 0, y: 0, width: sourceWidth, height: sourceHeight };

      const plan = planPdfEmbedSize(
        crop.width,
        crop.height,
        placementBox,
        clampDpi(settings.pdfMake.dpi),
      );
      const { canvas, context } = makeCanvas(plan.width, plan.height);
      let jpeg: Uint8Array;
      try {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        // Flatten onto the page colour so transparent PNGs look right.
        context.fillStyle = settings.pdfMake.background;
        context.fillRect(0, 0, plan.width, plan.height);
        context.drawImage(
          source,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          plan.width,
          plan.height,
        );
        const blob = await canvasToBlob(
          canvas,
          "image/jpeg",
          Math.min(100, Math.max(10, settings.pdfMake.imageQuality)) / 100,
        );
        jpeg = new Uint8Array(await blob.arrayBuffer());
      } finally {
        releaseCanvas(canvas);
      }

      const embedded = await pdfDoc.embedJpg(jpeg);
      const pdfPage = pdfDoc.addPage([page.widthPt, page.heightPt]);
      pdfPage.drawRectangle({
        x: 0,
        y: 0,
        width: page.widthPt,
        height: page.heightPt,
        color: pdfLib.rgb(bgR / 255, bgG / 255, bgB / 255),
      });
      const placement = placeImage(
        crop.width,
        crop.height,
        page.widthPt,
        page.heightPt,
        marginPt,
        // A cover crop already has the inner-box aspect ratio, so containing
        // it fills the box exactly. Fill intentionally stretches.
        fit === "cover" ? "contain" : fit,
      );
      pdfPage.drawImage(embedded, {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      });
      options.onPage?.(index + 1, files.length);
      await yieldToUi();
    } finally {
      // A quarter turn allocates a second canvas; give it back too.
      if (source !== decoded.canvas) releaseCanvas(source);
      releaseCanvas(decoded.canvas);
    }
  }

  const bytes = await pdfDoc.save();
  return {
    name: fallbackName,
    blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    format: "pdf",
    pages: pdfDoc.getPageCount(),
    note: "PDF pages contain raster images; there is no editable text layer.",
  };
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const value = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!value) return [255, 255, 255];
  const parsed = Number.parseInt(value[1], 16);
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

/* --------------------------------- PDF.js -------------------------------- */

const PDFJS_VERSION = "6.4.299";
const PDFJS_ASSET_BASE = `/pdfjs/${PDFJS_VERSION}/`;

type PdfJsModule = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJsModule> | null = null;

function loadPdfJs(): Promise<PdfJsModule> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

async function openPdf(blob: Blob) {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const task = pdfjs.getDocument({
    cMapPacked: true,
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    data: bytes,
    disableFontFace: true,
    enableXfa: false,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
    maxImageSize: 16_777_216,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    stopAtErrors: false,
    useWasm: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
  });
  try {
    const doc = await task.promise;
    return { doc, pdfjs, task };
  } catch (error) {
    try {
      await task.destroy();
    } catch {
      // Best effort cleanup for a failed load.
    }
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") throw new Error(PASSWORD_PDF);
    throw new Error(
      "This PDF could not be opened. It may be corrupt or password-protected.",
    );
  }
}

export type PdfDocInfo = {
  pageCount: number;
  /** First page size in PDF points, for pre-render output estimates. */
  widthPt: number;
  heightPt: number;
};

/**
 * Page count plus the first page's size, from a single document load. Pages in
 * one PDF can differ in size, so this is the first page only — enough to
 * estimate output size, and labelled as an estimate in the UI.
 */
export async function readPdfDocInfo(blob: Blob): Promise<PdfDocInfo> {
  const { doc, task } = await openPdf(blob);
  try {
    if (doc.numPages > CONVERT_LIMITS.maxPdfPages)
      throw new Error(
        `This PDF has ${doc.numPages} pages. The limit is ${CONVERT_LIMITS.maxPdfPages} pages per document.`,
      );
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    return {
      pageCount: doc.numPages,
      widthPt: Math.round(viewport.width),
      heightPt: Math.round(viewport.height),
    };
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

export async function readPdfPageCount(blob: Blob): Promise<number> {
  const info = await readPdfDocInfo(blob);
  return info.pageCount;
}

function yieldToUi() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

type RenderOptions = {
  background: string;
  maxWidth?: number;
  maxPixels?: number;
  signal?: AbortSignal;
};

async function renderPdfPageToCanvas(
  doc: Awaited<ReturnType<typeof openPdf>>["doc"],
  pdfjs: PdfJsModule,
  pageNumber: number,
  scale: number,
  options: RenderOptions,
) {
  assertNotAborted(options.signal);
  const page = await doc.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    let target = Math.max(0.2, scale);
    if (options.maxWidth)
      target = Math.min(target, options.maxWidth / Math.max(1, base.width));
    const pixels = base.width * target * (base.height * target);
    if (options.maxPixels && pixels > options.maxPixels)
      target *= Math.sqrt(options.maxPixels / pixels);
    const viewport = page.getViewport({ scale: target });
    const { canvas, context } = makeCanvas(viewport.width, viewport.height);
    try {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const task = page.render({
        annotationMode: pdfjs.AnnotationMode.ENABLE,
        background: options.background,
        canvas,
        canvasContext: context,
        intent: "display",
        viewport,
      });
      await task.promise;
      return {
        canvas,
        width: canvas.width,
        height: canvas.height,
      };
    } catch (error) {
      releaseCanvas(canvas);
      throw error;
    }
  } finally {
    page.cleanup();
  }
}

export type PdfRenderOptions = {
  onPage?: (done: number, total: number) => void;
  signal?: AbortSignal;
};

/** Render selected PDF pages to real raster files at the requested DPI. */
export async function pdfToImages(
  file: File,
  settings: ConvertSettings,
  options: PdfRenderOptions = {},
): Promise<{ outputs: PdfPageOutput[]; pageCount: number; pages: number[] }> {
  const render = settings.pdfRender;
  const dpi = clampDpi(render.dpi);
  if (!["jpeg", "png", "webp"].includes(render.format))
    throw new Error("Choose JPEG, PNG or WebP for PDF to image.");

  const { doc, pdfjs, task } = await openPdf(file);
  const outputs: PdfPageOutput[] = [];
  try {
    const pageCount = doc.numPages;
    const pages = parsePageRange(render.range, pageCount);
    if (!pages.length) throw new Error("Select at least one page to export.");
    const seen = new Set<string>();

    for (const pageNumber of pages) {
      assertNotAborted(options.signal);
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      page.cleanup();
      const planned = dpiToPixels(base.width, base.height, dpi);
      const scale = planned.width / Math.max(1, base.width);
      const rendered = await renderPdfPageToCanvas(
        doc,
        pdfjs,
        pageNumber,
        scale,
        {
          background: render.background,
          maxPixels: CONVERT_LIMITS.maxPagePixels,
          signal: options.signal,
        },
      );
      try {
        const blob = await encodeCanvas(
          rendered.canvas,
          render.format,
          render.quality,
          {
            background: render.background,
            transparent: false,
            compression: "lzw",
            dpi,
          },
        );
        let name = buildPdfPageName(
          file.name,
          pageNumber,
          render.format,
          settings,
        );
        if (seen.has(name)) {
          let suffix = 2;
          while (seen.has(`${name}-${suffix}`)) suffix += 1;
          name = `${name}-${suffix}`;
        }
        seen.add(name);
        outputs.push({
          page: pageNumber,
          name,
          blob,
          width: rendered.width,
          height: rendered.height,
        });
      } finally {
        releaseCanvas(rendered.canvas);
      }
      options.onPage?.(outputs.length, pages.length);
      await yieldToUi();
    }
    return { outputs, pageCount, pages };
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

export type PdfThumb = {
  page: number;
  blob: Blob;
  width: number;
  height: number;
};

/** Render small page previews sequentially in one document load. */
export async function renderPdfThumbnails(
  blob: Blob,
  pages: number[],
  options: { maxWidth?: number; signal?: AbortSignal } = {},
  onThumb?: (thumb: PdfThumb) => void,
): Promise<PdfThumb[]> {
  const { doc, pdfjs, task } = await openPdf(blob);
  const thumbs: PdfThumb[] = [];
  try {
    for (const page of pages) {
      if (page < 1 || page > doc.numPages) continue;
      assertNotAborted(options.signal);
      const rendered = await renderPdfPageToCanvas(doc, pdfjs, page, 1, {
        background: "#ffffff",
        maxPixels: 1_400_000,
        maxWidth: options.maxWidth ?? 360,
        signal: options.signal,
      });
      try {
        const preview = await canvasToBlob(rendered.canvas, "image/png");
        const thumb: PdfThumb = {
          page,
          blob: preview,
          width: rendered.width,
          height: rendered.height,
        };
        thumbs.push(thumb);
        onThumb?.(thumb);
      } finally {
        releaseCanvas(rendered.canvas);
      }
      await yieldToUi();
    }
    return thumbs;
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

/* ---------------------------------- ZIP ---------------------------------- */

/** Bundle results into a plain ZIP (stored, no encryption). */
export async function zipOutputs(
  outputs: { name: string; blob: Blob }[],
): Promise<Blob> {
  if (!outputs.length) throw new Error("There is nothing to download yet.");
  const used = new Set<string>();
  const entries: ZipEntry[] = [];
  for (const output of outputs) {
    let name = output.name;
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const extension = dot > 0 ? name.slice(dot) : "";
      let index = 2;
      while (used.has(`${stem}-${index}${extension}`)) index += 1;
      name = `${stem}-${index}${extension}`;
    }
    used.add(name);
    entries.push({
      name,
      data: new Uint8Array(await output.blob.arrayBuffer()),
    });
  }
  return new Blob([new Uint8Array(createZip(entries))], {
    type: "application/zip",
  });
}

/* ------------------------------ PDF studio ------------------------------- */

export type PdfStudioRunOptions = {
  /** Source PDFs, in the order shown in the queue. */
  files: File[];
  pages: PdfPageOp[];
  action: PdfStudioAction;
  settings: PdfStudioSettings;
  sources: PdfSourceSummary[];
  signal?: AbortSignal;
  onProgress?: ProgressReporter;
};

export type PdfStudioOutput = {
  name: string;
  blob: Blob;
  pages: number;
  label?: string;
  /** Bytes of the source this output came from, for a savings comparison. */
  sourceBytes: number;
  notices: string[];
};

/**
 * Rebuild a PDF from an explicit page plan: order, rotation and removal are
 * applied here, so the source documents are only ever read.
 */
export async function runPdfStudio(
  options: PdfStudioRunOptions,
): Promise<PdfStudioOutput[]> {
  const { files, pages, action, settings, sources, signal, onProgress } =
    options;
  const pdfLib = await loadPdfLib();
  const kept = keptPages(pages);
  if (!kept.length)
    throw new Error("Every page is removed. Keep at least one.");

  const documents = await Promise.all(
    files.map(async (file) => {
      assertNotAborted(signal);
      const bytes = new Uint8Array(await file.arrayBuffer());
      try {
        return await pdfLib.PDFDocument.load(bytes, {
          ignoreEncryption: false,
        });
      } catch (error) {
        // Only a genuine encryption failure may be reported as a password
        // problem. A corrupt or truncated file also lands here, and blaming a
        // password that the document does not have sends the user off to remove
        // something that was never there.
        if (error instanceof pdfLib.EncryptedPDFError) {
          throw new Error(PASSWORD_PDF);
        }
        throw new Error(
          `${file.name} could not be opened as a PDF. It may be corrupt or truncated.`,
        );
      }
    }),
  );

  const buildDocument = async (
    selected: PdfPageOp[],
  ): Promise<{ bytes: Uint8Array; count: number }> => {
    const output = await pdfLib.PDFDocument.create();
    for (const [index, page] of selected.entries()) {
      assertNotAborted(signal);
      const source = documents[page.sourceIndex];
      if (!source)
        throw new Error(
          `Page ${page.page} refers to a file that is not loaded.`,
        );
      const [copied] = await output.copyPages(source, [page.page - 1]);
      if (page.rotation)
        copied.setRotation(
          pdfLib.degrees(
            (copied.getRotation().angle + page.rotation + 360) % 360,
          ),
        );
      output.addPage(copied);
      onProgress?.(index + 1, selected.length);
    }

    // Page numbers are stamped after every page is placed, so the total is
    // known and numbering is sequential in the written document regardless of
    // the source page numbers they came from.
    if (settings.pageNumbers && output.getPageCount() > 0) {
      const font = await output.embedFont(pdfLib.StandardFonts.Helvetica);
      const total = output.getPageCount();
      const colour = pdfLib.rgb(0.25, 0.25, 0.25);
      output.getPages().forEach((stamped, index) => {
        const label = pageNumberLabel(
          settings.pageNumberFormat,
          index + 1,
          total,
        );
        if (!label) return;
        const { widthPt, heightPt } = (() => {
          const size = stamped.getSize();
          return { widthPt: size.width, heightPt: size.height };
        })();
        const placement = pageNumberPlacement(
          settings.pageNumberPosition,
          widthPt,
          heightPt,
        );
        const textWidth = font.widthOfTextAtSize(
          label,
          settings.pageNumberSize,
        );
        const x =
          placement.align === "center"
            ? placement.x - textWidth / 2
            : placement.align === "right"
              ? placement.x - textWidth
              : placement.x;
        // A top position sits the text below the margin so it is not clipped.
        const y =
          placement.y > heightPt / 2
            ? placement.y - settings.pageNumberSize
            : placement.y;
        stamped.drawText(label, {
          x,
          y,
          size: settings.pageNumberSize,
          font,
          color: colour,
        });
      });
    }

    // The watermark is drawn after page numbers so it sits on top, and only
    // when there is text to draw - an empty field writes nothing at all.
    if (settings.watermarkText.trim() && output.getPageCount() > 0) {
      const font = await output.embedFont(pdfLib.StandardFonts.HelveticaBold);
      const text = settings.watermarkText.trim();
      const size = settings.watermarkSize;
      const opacity =
        Math.min(100, Math.max(0, settings.watermarkOpacity)) / 100;
      const textWidth = font.widthOfTextAtSize(text, size);
      const textHeight = font.heightAtSize(size);
      output.getPages().forEach((stamped) => {
        const { width, height } = stamped.getSize();
        const placement = watermarkPlacement(
          width,
          height,
          textWidth,
          textHeight,
          settings.watermarkAngle,
        );
        stamped.drawText(text, {
          x: placement.x,
          y: placement.y,
          size,
          font,
          color: pdfLib.rgb(0.35, 0.35, 0.35),
          opacity,
          rotate: pdfLib.degrees(placement.angle),
        });
      });
    }

    if (settings.title.trim()) output.setTitle(settings.title.trim());
    if (settings.author.trim()) output.setAuthor(settings.author.trim());
    if (settings.subject.trim()) output.setSubject(settings.subject.trim());
    const keywords = parseKeywords(settings.keywords);
    if (keywords.length) output.setKeywords(keywords);
    output.setProducer("QUICKKIT");
    return { bytes: await output.save(), count: output.getPageCount() };
  };

  const totalSourceBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (action === "split") {
    const groups = splitGroups(pages, settings.ranges, sources);
    if (!groups.length) throw new Error("No page matches that range.");
    const outputs: PdfStudioOutput[] = [];
    const used = new Set<string>();
    for (const [index, group] of groups.entries()) {
      assertNotAborted(signal);
      const built = await buildDocument(group.pages);
      const name = uniqueName(
        studioOutputName(settings.filename, group.label),
        used,
      );
      outputs.push({
        name,
        blob: new Blob([new Uint8Array(built.bytes)], {
          type: "application/pdf",
        }),
        pages: built.count,
        label: group.label,
        sourceBytes: totalSourceBytes / groups.length,
        notices: [],
      });
      onProgress?.(index + 1, groups.length);
    }
    return outputs;
  }

  const built = await buildDocument(kept);
  const baseName = studioOutputName(settings.filename, null);

  if (action === "compress") {
    assertNotAborted(signal);
    const preset =
      PDF_COMPRESSION_PRESETS.find(
        (entry) => entry.id === settings.compressPresetId,
      ) ?? PDF_COMPRESSION_PRESETS[0];
    const result = await compressPdfBytes(
      built.bytes,
      presetSettings(preset.id),
      { entryId: "studio" },
    );
    return [
      {
        name: baseName,
        blob: new Blob([new Uint8Array(result.bytes)], {
          type: "application/pdf",
        }),
        pages: result.pageCount,
        sourceBytes: built.bytes.byteLength,
        notices: result.notices,
      },
    ];
  }

  return [
    {
      name: baseName,
      blob: new Blob([new Uint8Array(built.bytes)], {
        type: "application/pdf",
      }),
      pages: built.count,
      sourceBytes: totalSourceBytes,
      notices: [],
    },
  ];
}
