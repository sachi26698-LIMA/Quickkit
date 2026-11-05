"use client";

/**
 * Browser adapter: decode an uploaded file into pixels, apply the user's
 * rotation/crop/enhancement settings, and hand back an `ImageData` ready for
 * the OCR engine. Scanned PDFs are rasterised here with the bundled PDF.js.
 *
 * Every step is local. The decoded bitmap is closed as soon as the pixels are
 * copied, and canvases are zeroed after use so a 40-page batch does not pin
 * hundreds of megabytes in memory.
 */
import type { EnhancementSettings, OcrError as OcrErrorType } from "./types";
import { OCR_LIMITS, OcrError } from "./types";
import {
  applyTone,
  cropPixels,
  estimateSkew,
  inkRatio,
  medianDenoise,
  planOcrScale,
  resamplePixels,
  rotateArbitrary,
  rotateQuarterTurns,
  type PixelBuffer,
} from "./preprocess";

/* ------------------------------- decoding -------------------------------- */

export interface DecodedImage {
  pixels: PixelBuffer & { data: Uint8ClampedArray };
  /** Object URL usable in an <img> preview. */
  url: string;
  /** Release the preview URL. */
  release: () => void;
  notes: string[];
}

const TIFF_TYPES = ["image/tiff", "image/tif"];

export function isTiffFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    TIFF_TYPES.includes(file.type) ||
    name.endsWith(".tif") ||
    name.endsWith(".tiff")
  );
}

/** Browsers cannot decode TIFF, so that path uses the bundled TIFF codec. */
async function decodeTiffPixels(file: File): Promise<PixelBuffer> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { decodeTiff } = await import("@/lib/tools/image-codec");
  const image = decodeTiff(bytes);
  // decodeTiff returns RGBA rows already, so a direct copy is enough.
  return {
    data: new Uint8ClampedArray(image.data),
    width: image.width,
    height: image.height,
  };
}

async function decodeBitmap(
  file: File,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some formats (or older Safari builds) only decode through <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    // The element keeps its own reference to the decoded data.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** Decode a single image file into an RGBA pixel buffer. */
export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const notes: string[] = [];
  if (!file.size) throw new OcrError("empty", "This file is empty.");
  let pixels: PixelBuffer;
  if (isTiffFile(file)) {
    try {
      pixels = await decodeTiffPixels(file);
    } catch {
      throw new OcrError(
        "unreadable",
        "This TIFF could not be decoded. Try exporting it as PNG or JPEG first.",
      );
    }
    notes.push("TIFF decoded locally");
  } else {
    let source: ImageBitmap | HTMLImageElement;
    try {
      source = await decodeBitmap(file);
    } catch {
      throw new OcrError(
        "unreadable",
        "This image could not be decoded. It may be damaged or in an unsupported format.",
      );
    }
    const width = "naturalWidth" in source ? source.naturalWidth : source.width;
    const height =
      "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!width || !height) {
      throw new OcrError("unreadable", "This image has no visible pixels.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new OcrError(
        "unreadable",
        "Canvas is unavailable in this browser.",
      );
    // White matte so transparent PNGs do not become black on export.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(source as CanvasImageSource, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height);
    pixels = {
      data: new Uint8ClampedArray(data.data),
      width,
      height,
    };
    canvas.width = 0;
    canvas.height = 0;
    if ("close" in source && typeof source.close === "function") source.close();
  }
  const url = URL.createObjectURL(file);
  return {
    pixels: pixels as DecodedImage["pixels"],
    url,
    release: () => URL.revokeObjectURL(url),
    notes,
  };
}

/* ----------------------------- enhancement ------------------------------- */

export interface PrepareResult {
  image: ImageData;
  width: number;
  height: number;
  scale: number;
  skewAngle: number;
  ink: number;
  notes: string[];
  /** Preview of exactly what the engine saw, as a data URL. */
  previewUrl: string;
}

export interface PrepareOptions {
  enhancement: EnhancementSettings;
  maxSide: number;
  /** Include the OCR-resolution preview data URL (skip during batch runs). */
  preview?: boolean;
}

/** Run the full preprocessing chain and return pixels sized for the engine. */
export function preparePixels(
  source: PixelBuffer,
  options: PrepareOptions,
): PrepareResult {
  const notes: string[] = [];
  const { enhancement } = options;
  let working: PixelBuffer = source;

  if (enhancement.rotation) {
    working = rotateQuarterTurns(working, enhancement.rotation);
  }
  if (enhancement.crop) {
    working = cropPixels(working, enhancement.crop);
  }
  if (enhancement.deskew) {
    const angle = estimateSkew(working);
    if (angle) {
      working = rotateArbitrary(working, angle);
      notes.push(`Deskewed by ${angle}°`);
    }
  }
  if (enhancement.denoise) {
    working = medianDenoise(working);
    notes.push("Noise removed");
  }
  if (
    enhancement.grayscale ||
    enhancement.binarize ||
    enhancement.contrast !== 1 ||
    enhancement.brightness !== 1
  ) {
    working = applyTone(working, {
      grayscale: enhancement.grayscale,
      contrast: enhancement.contrast,
      brightness: enhancement.brightness,
      binarize: enhancement.binarize,
    });
  }
  const scalePlan = planOcrScale(
    working.width,
    working.height,
    options.maxSide,
    enhancement.supersample,
  );
  if (scalePlan.scale !== 1)
    working = resamplePixels(working, scalePlan.width, scalePlan.height);
  if (scalePlan.reason) notes.push(scalePlan.reason);

  const ink = inkRatio(working);
  const canvas = document.createElement("canvas");
  canvas.width = working.width;
  canvas.height = working.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context)
    throw new OcrError("unreadable", "Canvas is unavailable in this browser.");
  const image = new ImageData(
    new Uint8ClampedArray(working.data),
    working.width,
    working.height,
  );
  context.putImageData(image, 0, 0);
  const previewUrl = options.preview
    ? canvas.toDataURL("image/jpeg", 0.72)
    : "";
  canvas.width = 0;
  canvas.height = 0;
  if (ink < 0.001) notes.push("Almost no ink found — the page may be blank");
  return {
    image,
    width: working.width,
    height: working.height,
    scale: scalePlan.scale,
    skewAngle: 0,
    ink,
    notes,
    previewUrl,
  };
}

/** Decode + prepare an image file in one step. */
export async function prepareImageFile(
  file: File,
  options: PrepareOptions,
): Promise<{ prepared: PrepareResult; decoded: DecodedImage }> {
  const decoded = await decodeImageFile(file);
  const prepared = preparePixels(decoded.pixels, options);
  return { prepared, decoded };
}

export const OCR_IMAGE_LIMITS = OCR_LIMITS;

/* -------------------------------- PDF pages ------------------------------- */

const PDFJS_VERSION = "6.4.299";
const PDFJS_ASSET_BASE = `/pdfjs/${PDFJS_VERSION}/`;

export interface PdfPageRender {
  page: number;
  pageCount: number;
  pixels: PixelBuffer;
  /** Object URL of a preview-sized render. */
  previewUrl: string;
}

export interface RenderedPdfPage {
  page: number;
  pageCount: number;
  prepared: PrepareResult;
}

/** Parse a 1-based page range ("1-3, 5") into page numbers within `count`. */
export function parsePageRange(input: string, count: number): number[] {
  const all = Array.from({ length: count }, (_, index) => index + 1);
  const trimmed = input.trim();
  if (!trimmed) return all;
  const selected = new Set<number>();
  for (const part of trimmed.split(",")) {
    const piece = part.trim();
    if (!piece) continue;
    const match = /^(\d+)\s*-\s*(\d+)$/u.exec(piece);
    if (match) {
      const from = Number(match[1]);
      const to = Number(match[2]);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) continue;
      for (let page = Math.max(1, from); page <= Math.min(count, to); page += 1)
        selected.add(page);
      continue;
    }
    const single = Number(piece);
    if (Number.isInteger(single) && single >= 1 && single <= count)
      selected.add(single);
  }
  return [...selected].sort((a, b) => a - b);
}

type PdfJsModule = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export interface PdfInspection {
  pageCount: number;
  hasTextLayer: boolean;
  encrypted: boolean;
}

/** Inspect a PDF before rendering: page count and whether it has real text. */
export async function inspectPdf(file: File): Promise<PdfInspection> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let task: ReturnType<PdfJsModule["getDocument"]>;
  try {
    task = pdfjs.getDocument({
      cMapPacked: true,
      cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
      data: bytes,
      disableFontFace: true,
      iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
      standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
      stopAtErrors: false,
      useWasm: false,
      verbosity: pdfjs.VerbosityLevel.ERRORS,
      wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
    });
  } catch {
    throw new OcrError("pdf-corrupt", "This PDF could not be opened.");
  }
  try {
    const doc = await task.promise;
    let hasTextLayer = false;
    const limit = Math.min(doc.numPages, 3);
    for (let page = 1; page <= limit; page += 1) {
      const pdfPage = await doc.getPage(page);
      const content = await pdfPage.getTextContent();
      if (
        content.items.some(
          (item) => "str" in item && item.str.trim().length > 0,
        )
      )
        hasTextLayer = true;
      pdfPage.cleanup();
      if (hasTextLayer) break;
    }
    return {
      pageCount: doc.numPages,
      hasTextLayer,
      encrypted: false,
    };
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "";
    if (name === "PasswordException")
      throw new OcrError(
        "pdf-protected",
        "This PDF is password-protected. Remove the password first, then try again.",
      );
    throw new OcrError("pdf-corrupt", "This PDF could not be read.");
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

/**
 * Rasterise selected PDF pages at a resolution that suits OCR, then run the
 * normal preprocessing chain. Renders are sequential so a 40-page PDF does not
 * allocate 40 full-page bitmaps at once.
 */
export async function preparePdfPages(
  file: File,
  pageRange: string,
  options: PrepareOptions,
  onPage?: (page: number, pageCount: number) => void,
  signal?: AbortSignal,
): Promise<RenderedPdfPage[]> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    cMapPacked: true,
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    data: bytes,
    disableFontFace: true,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    stopAtErrors: false,
    useWasm: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
  });
  const rendered: RenderedPdfPage[] = [];
  try {
    const doc = await task.promise;
    if (doc.numPages > OCR_LIMITS.maxPdfPages)
      throw new OcrError(
        "too-many",
        `This PDF has ${doc.numPages} pages; the limit is ${OCR_LIMITS.maxPdfPages}. Enter a page range to read part of it.`,
      );
    const pages = parsePageRange(pageRange, doc.numPages);
    if (!pages.length)
      throw new OcrError(
        "empty",
        "That page range does not match any page in this PDF.",
      );
    for (const pageNumber of pages) {
      if (signal?.aborted)
        throw new OcrError("cancelled", "OCR was cancelled.");
      onPage?.(pageNumber, pages.length);
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      // ~300 DPI equivalent, capped so a huge page cannot exhaust memory.
      let scale = Math.min(4, 2400 / Math.max(base.width, base.height));
      scale = Math.max(1, scale);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context)
        throw new OcrError(
          "unreadable",
          "Canvas is unavailable in this browser.",
        );
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({
        annotationMode: pdfjs.AnnotationMode.DISABLE,
        background: "#ffffff",
        canvas,
        canvasContext: context,
        intent: "print",
        viewport,
      }).promise;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels: PixelBuffer = {
        data: new Uint8ClampedArray(imageData.data),
        width: canvas.width,
        height: canvas.height,
      };
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      const prepared = preparePixels(pixels, options);
      prepared.notes.unshift(
        `Page ${pageNumber} rendered at ${Math.round(scale * 72)} DPI`,
      );
      rendered.push({ page: pageNumber, pageCount: doc.numPages, prepared });
    }
  } finally {
    await task.destroy().catch(() => undefined);
  }
  return rendered;
}

export type { OcrErrorType };
