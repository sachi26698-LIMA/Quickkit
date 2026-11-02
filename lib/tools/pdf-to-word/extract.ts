import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { recognizeCanvas } from "./ocr";
import type { ExtractedPage, PdfImageItem, PdfTextItem } from "./types";
import { PDF_TO_WORD_LIMITS, PdfToWordError } from "./types";

/**
 * PDF -> ExtractedPage[] using pdfjs. Mirrors the same-origin asset setup
 * of lib/tools/pdf/pdf-preview.ts. Everything runs locally in the browser.
 */

const PDFJS_VERSION = "6.4.299";
const PDFJS_ASSET_BASE = `/pdfjs/${PDFJS_VERSION}/`;
/** Pages with fewer non-space characters than this count as scanned. */
const SCANNED_CHAR_THRESHOLD = 20;
const MAX_IMAGE_WIDTH_PX = 1800;

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

/** True when the bytes carry a PDF signature in the first 1 KB. */
export function hasPdfMagic(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, Math.min(bytes.length, 1024));
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  outer: for (let i = 0; i + 5 <= head.length; i++) {
    for (let j = 0; j < 5; j++)
      if (head[i + j] !== signature[j]) continue outer;
    return true;
  }
  return false;
}

function classifyOpenError(error: unknown): PdfToWordError {
  const name = error instanceof Error ? error.name : "";
  if (name === "PasswordException") {
    return new PdfToWordError(
      "password-protected",
      "This PDF is password-protected. Remove the password in your PDF app, then try again.",
    );
  }
  if (
    name === "InvalidPDFException" ||
    name === "MissingPDFException" ||
    name === "UnexpectedResponseException"
  ) {
    return new PdfToWordError(
      "corrupted",
      "This file could not be read as a PDF. It may be corrupted or incomplete.",
    );
  }
  return new PdfToWordError(
    "conversion-failed",
    "This PDF could not be opened. Try re-exporting it from your PDF app.",
  );
}

async function openPdf(bytes: Uint8Array): Promise<{
  doc: PDFDocumentProxy;
  pdfjs: PdfJsModule;
  destroy: () => Promise<void>;
}> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    cMapPacked: true,
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    data: bytes.slice(),
    disableFontFace: true,
    enableXfa: false,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
    maxImageSize: 67_108_864,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    stopAtErrors: false,
    useWasm: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
  });
  try {
    const doc = await loadingTask.promise;
    return {
      doc,
      pdfjs,
      destroy: async () => {
        await loadingTask.destroy().catch(() => undefined);
      },
    };
  } catch (error) {
    throw classifyOpenError(error);
  }
}

async function pageCharCount(page: PDFPageProxy): Promise<number> {
  const content = await page.getTextContent();
  let chars = 0;
  for (const item of content.items) {
    if ("str" in item) chars += item.str.replace(/\s/g, "").length;
  }
  return chars;
}

export interface InspectResult {
  pageCount: number;
  kind: "text" | "scanned" | "mixed";
}

/** Lightweight inspection for the queue: page count + text/scanned sample. */
export async function inspectPdf(bytes: Uint8Array): Promise<InspectResult> {
  if (!hasPdfMagic(bytes)) {
    throw new PdfToWordError(
      "not-a-pdf",
      "This file is not a PDF. Choose a file ending in .pdf.",
    );
  }
  const { doc, destroy } = await openPdf(bytes);
  try {
    const pageCount = doc.numPages;
    if (pageCount > PDF_TO_WORD_LIMITS.maxPagesPerFile) {
      throw new PdfToWordError(
        "too-many-pages",
        `This PDF has ${pageCount} pages. The limit is ${PDF_TO_WORD_LIMITS.maxPagesPerFile} pages per file.`,
      );
    }
    const samples = Math.min(3, pageCount);
    let scannedSamples = 0;
    for (let p = 1; p <= samples; p++) {
      const page = await doc.getPage(p);
      if ((await pageCharCount(page)) < SCANNED_CHAR_THRESHOLD)
        scannedSamples++;
      page.cleanup();
    }
    const kind =
      scannedSamples === 0
        ? "text"
        : scannedSamples === samples
          ? "scanned"
          : "mixed";
    return { pageCount, kind };
  } finally {
    await destroy();
  }
}

interface FontStyle {
  bold: boolean;
  italic: boolean;
}

function fontStyleFor(
  page: PDFPageProxy,
  fontName: string,
  cache: Map<string, FontStyle>,
): FontStyle {
  const cached = cache.get(fontName);
  if (cached) return cached;
  let style: FontStyle = { bold: false, italic: false };
  try {
    const font = page.commonObjs.get(fontName) as
      { name?: string; bold?: boolean; italic?: boolean } | undefined;
    const name = font?.name ?? "";
    style = {
      bold:
        Boolean(font?.bold) || /bold|black|heavy|semi[-\s]?bold/i.test(name),
      italic: Boolean(font?.italic) || /italic|oblique/i.test(name),
    };
  } catch {
    // Font not resolved yet; styling stays regular.
  }
  cache.set(fontName, style);
  return style;
}

type Matrix = [number, number, number, number, number, number];

interface RawImage {
  width?: number;
  height?: number;
  data?: Uint8Array | Uint8ClampedArray;
  kind?: number;
  bitmap?: ImageBitmap;
}

async function rawImageToPng(img: RawImage): Promise<{
  png: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
} | null> {
  const width = img.width ?? img.bitmap?.width ?? 0;
  const height = img.height ?? img.bitmap?.height ?? 0;
  if (!width || !height || width < 8 || height < 8) return null;

  const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;

  if (img.bitmap) {
    context.drawImage(img.bitmap, 0, 0, canvas.width, canvas.height);
  } else if (img.data) {
    const rgba = new Uint8ClampedArray(width * height * 4);
    const data = img.data;
    if (img.kind === 3) {
      // RGBA_32BPP
      rgba.set(data.subarray(0, rgba.length));
    } else if (img.kind === 2) {
      // RGB_24BPP
      for (let i = 0, j = 0; i < width * height; i++, j += 4) {
        rgba[j] = data[i * 3] ?? 0;
        rgba[j + 1] = data[i * 3 + 1] ?? 0;
        rgba[j + 2] = data[i * 3 + 2] ?? 0;
        rgba[j + 3] = 255;
      }
    } else if (img.kind === 1) {
      // GRAYSCALE_1BPP
      for (let i = 0; i < width * height; i++) {
        const byte = data[i >> 3] ?? 0;
        const bit = (byte >> (7 - (i & 7))) & 1;
        const v = bit ? 255 : 0;
        rgba[i * 4] = v;
        rgba[i * 4 + 1] = v;
        rgba[i * 4 + 2] = v;
        rgba[i * 4 + 3] = 255;
      }
    } else {
      return null;
    }
    const full = document.createElement("canvas");
    full.width = width;
    full.height = height;
    const fullCtx = full.getContext("2d");
    if (!fullCtx) return null;
    fullCtx.putImageData(new ImageData(rgba, width, height), 0, 0);
    context.drawImage(full, 0, 0, canvas.width, canvas.height);
  } else {
    return null;
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return null;
  return {
    png: new Uint8Array(await blob.arrayBuffer()),
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
  };
}

async function extractImages(
  page: PDFPageProxy,
  pdfjs: PdfJsModule,
  viewportTransform: Matrix,
): Promise<{ images: PdfImageItem[]; skipped: number }> {
  const images: PdfImageItem[] = [];
  let skipped = 0;
  let ops;
  try {
    ops = await page.getOperatorList();
  } catch {
    return { images, skipped };
  }
  const { OPS, Util } = pdfjs;
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  const pending: {
    raw: Promise<RawImage | undefined>;
    rect: { x: number; y: number; width: number; height: number };
  }[] = [];

  const applyMatrix = (m: Matrix, x: number, y: number): [number, number] => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5],
  ];
  const rectFor = (matrix: Matrix) => {
    const full = Util.transform(viewportTransform, matrix) as Matrix;
    const corners = [
      applyMatrix(full, 0, 0),
      applyMatrix(full, 1, 0),
      applyMatrix(full, 0, 1),
      applyMatrix(full, 1, 1),
    ];
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return {
      x: left,
      y: top,
      width: Math.abs(Math.max(...xs) - left),
      height: Math.abs(Math.max(...ys) - top),
    };
  };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push([...ctm] as Matrix);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) {
      ctm = Util.transform(ctm, args as Matrix) as Matrix;
    } else if (fn === OPS.paintImageXObject) {
      const objId = args[0] as string;
      const rect = rectFor(ctm);
      pending.push({
        raw: new Promise<RawImage | undefined>((resolve) => {
          try {
            page.objs.get(objId, (value: unknown) =>
              resolve(value as RawImage | undefined),
            );
          } catch {
            resolve(undefined);
          }
        }),
        rect,
      });
    } else if (fn === OPS.paintInlineImageXObject) {
      pending.push({
        raw: Promise.resolve(args[0] as RawImage),
        rect: rectFor(ctm),
      });
    }
  }

  for (const entry of pending) {
    try {
      const raw = await entry.raw;
      if (!raw || entry.rect.width < 6 || entry.rect.height < 6) continue;
      const converted = await rawImageToPng(raw);
      if (!converted) {
        skipped++;
        continue;
      }
      images.push({
        x: entry.rect.x,
        y: entry.rect.y,
        width: entry.rect.width,
        height: entry.rect.height,
        png: converted.png,
        pixelWidth: converted.pixelWidth,
        pixelHeight: converted.pixelHeight,
      });
    } catch {
      skipped++;
    }
  }
  return { images, skipped };
}

async function renderPageForOcr(
  page: PDFPageProxy,
): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, 2600 / Math.max(base.width, 1));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  if (!context)
    throw new PdfToWordError(
      "ocr-failed",
      "Could not render this page for OCR.",
    );
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, viewport }).promise;
  return { canvas, scale };
}

export interface ExtractStats {
  textPages: number;
  ocrPages: number;
  scannedPagesSkipped: number;
  ocrFailedPages: number;
  imagesExtracted: number;
  imagesSkipped: number;
}

export interface ExtractOptions {
  /** Run OCR on pages without a text layer. */
  ocr: boolean;
  onProgress?: (pagesDone: number, totalPages: number) => void;
  signal?: AbortSignal;
}

export async function extractPdf(
  bytes: Uint8Array,
  options: ExtractOptions,
): Promise<{ pages: ExtractedPage[]; stats: ExtractStats }> {
  if (!hasPdfMagic(bytes)) {
    throw new PdfToWordError(
      "not-a-pdf",
      "This file is not a PDF. Choose a file ending in .pdf.",
    );
  }
  const { doc, pdfjs, destroy } = await openPdf(bytes);
  const stats: ExtractStats = {
    textPages: 0,
    ocrPages: 0,
    scannedPagesSkipped: 0,
    ocrFailedPages: 0,
    imagesExtracted: 0,
    imagesSkipped: 0,
  };
  const pages: ExtractedPage[] = [];
  try {
    if (doc.numPages > PDF_TO_WORD_LIMITS.maxPagesPerFile) {
      throw new PdfToWordError(
        "too-many-pages",
        `This PDF has ${doc.numPages} pages. The limit is ${PDF_TO_WORD_LIMITS.maxPagesPerFile} pages per file.`,
      );
    }
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      if (options.signal?.aborted) {
        throw new PdfToWordError("cancelled", "Conversion was cancelled.");
      }
      const page = await doc.getPage(pageNo);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const widthPt = viewport.width;
        const heightPt = viewport.height;
        const fontCache = new Map<string, FontStyle>();

        const content = await page.getTextContent();
        const items: PdfTextItem[] = [];
        let charCount = 0;
        for (const item of content.items) {
          if (!("str" in item) || !item.str) continue;
          charCount += item.str.replace(/\s/g, "").length;
          if (!item.str.trim()) continue;
          const tx = pdfjs.Util.transform(
            viewport.transform,
            item.transform,
          ) as Matrix;
          const fontSize = Math.hypot(tx[2], tx[3]) || item.height || 11;
          const style = fontStyleFor(page, item.fontName, fontCache);
          items.push({
            text: item.str,
            x: tx[4],
            y: tx[5] - fontSize * 0.85,
            width: item.width,
            fontSize,
            bold: style.bold,
            italic: style.italic,
          });
        }

        const { images, skipped } = await extractImages(
          page,
          pdfjs,
          viewport.transform as Matrix,
        );
        stats.imagesExtracted += images.length;
        stats.imagesSkipped += skipped;

        let fromOcr = false;
        if (charCount < SCANNED_CHAR_THRESHOLD) {
          if (options.ocr) {
            try {
              const { canvas, scale } = await renderPageForOcr(page);
              const ocrItems = await recognizeCanvas(canvas, scale);
              if (ocrItems.length > 0) {
                items.push(...ocrItems);
                fromOcr = true;
                stats.ocrPages++;
              } else {
                stats.scannedPagesSkipped++;
              }
              canvas.width = 0;
              canvas.height = 0;
            } catch (error) {
              if (
                error instanceof PdfToWordError &&
                error.kind === "ocr-unavailable"
              ) {
                stats.ocrFailedPages++;
                stats.scannedPagesSkipped++;
              } else {
                stats.ocrFailedPages++;
                stats.scannedPagesSkipped++;
              }
            }
          } else {
            stats.scannedPagesSkipped++;
          }
        } else {
          stats.textPages++;
        }

        pages.push({
          widthPt,
          heightPt,
          items,
          images,
          charCount,
          fromOcr,
        });
      } finally {
        page.cleanup();
      }
      options.onProgress?.(pageNo, doc.numPages);
    }
  } finally {
    await destroy();
  }

  const totalChars = pages.reduce(
    (n, p) => n + p.items.reduce((m, i) => m + i.text.trim().length, 0),
    0,
  );
  const totalImages = pages.reduce((n, p) => n + p.images.length, 0);
  if (totalChars === 0 && totalImages === 0) {
    throw new PdfToWordError(
      "empty",
      options.ocr
        ? "No readable text or images were found in this PDF, even with OCR."
        : "No extractable text was found. If this is a scanned PDF, enable OCR and try again.",
    );
  }
  return { pages, stats };
}
