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
import { decodeTiff, inspectTiff, tiffDpi } from "@/lib/tools/image-codec";
import {
  buildOutputName,
  buildPdfName,
  buildPdfPageName,
  clampDpi,
  CONVERT_LIMITS,
  dpiToPixels,
  formatById,
  inputFormatFromName,
  keepsAlpha,
  mmToPt,
  parsePageRange,
  placeImage,
  planOutputSize,
  resolvePage,
  type ConvertFormat,
  type ConvertSettings,
  type FitMode,
  type InputFormat,
  type InputKind,
  type Placement,
} from "@/lib/tools/image-convert";
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
    return {
      format,
      kind: "image",
      ...readGifSize(new Uint8Array(await file.slice(0, 64).arrayBuffer())),
    };
  }

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
    if (format === "avif") throw new Error(UNSUPPORTED_AVIF);
    throw new Error(
      `This ${format.toUpperCase()} could not be decoded. The file may be corrupt.`,
    );
  } finally {
    bitmap?.close();
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
};

/**
 * Convert one image file. Honours per-file format overrides, quality, alpha
 * handling, optional resize and EXIF orientation.
 */
export async function convertImageFile(
  file: File,
  options: ConvertImageOptions,
): Promise<ConversionOutput> {
  const { format, settings, signal } = options;
  const details = options.details ?? (await inspectInput(file));
  if (details.format === "pdf")
    throw new Error(
      "PDFs are converted with the PDF modes, not image-to-image.",
    );
  assertNotAborted(signal);

  const decoded = await decodeImage(
    file,
    details.format,
    settings.image.orientation,
  );
  try {
    assertNotAborted(signal);
    const transparent = keepsAlpha(format) && settings.image.alpha === "keep";
    const plan = planOutputSize(
      decoded.width,
      decoded.height,
      settings.image.resize,
    );
    checkImageSize(plan.width, plan.height);

    const { canvas, context } = makeCanvas(plan.width, plan.height);
    try {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (!transparent) {
        context.fillStyle = settings.image.background;
        context.fillRect(0, 0, plan.width, plan.height);
      }
      context.drawImage(decoded.canvas, 0, 0, plan.width, plan.height);

      const dpi = decoded.dpi ?? 96;
      const blob = await encodeCanvas(canvas, format, settings.image.quality, {
        background: settings.image.background,
        transparent,
        compression: settings.image.compression,
        dpi,
      });
      return {
        name: buildOutputName(file.name, settings, format),
        blob,
        format,
        width: plan.width,
        height: plan.height,
        note:
          details.format === "gif"
            ? "Animated GIFs are exported as a single (first) frame."
            : undefined,
      };
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    releaseCanvas(decoded.canvas);
  }
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
              decoded.width,
              decoded.height,
              placementBox.width,
              placementBox.height,
            )
          : { x: 0, y: 0, width: decoded.width, height: decoded.height };

      const plan = planPdfEmbedSize(crop.width, crop.height, placementBox);
      const { canvas, context } = makeCanvas(plan.width, plan.height);
      let jpeg: Uint8Array;
      try {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        // Flatten onto the page colour so transparent PNGs look right.
        context.fillStyle = settings.pdfMake.background;
        context.fillRect(0, 0, plan.width, plan.height);
        context.drawImage(
          decoded.canvas,
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

export async function readPdfPageCount(blob: Blob): Promise<number> {
  const { doc, task } = await openPdf(blob);
  try {
    if (doc.numPages > CONVERT_LIMITS.maxPdfPages)
      throw new Error(
        `This PDF has ${doc.numPages} pages. The limit is ${CONVERT_LIMITS.maxPdfPages} pages per document.`,
      );
    return doc.numPages;
  } finally {
    await task.destroy().catch(() => undefined);
  }
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
