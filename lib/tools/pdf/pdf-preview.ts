"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

const PDFJS_VERSION = "6.4.299";
const PDFJS_ASSET_BASE = `/pdfjs/${PDFJS_VERSION}/`;

type PdfJsModule = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJsModule> | null = null;

function ensurePdfJsRuntimeCompatibility() {
  const mapPrototype = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: (
      key: unknown,
      callback: (key: unknown) => unknown,
    ) => unknown;
  };
  if (typeof mapPrototype.getOrInsertComputed !== "function") {
    Object.defineProperty(mapPrototype, "getOrInsertComputed", {
      configurable: true,
      writable: true,
      value: function <K, V>(this: Map<K, V>, key: K, callback: (key: K) => V) {
        if (this.has(key)) return this.get(key)!;
        const value = callback(key);
        this.set(key, value);
        return value;
      },
    });
  }

  const mathWithSumPrecise = Math as Math & {
    sumPrecise?: (values: Iterable<number>) => number;
  };
  if (typeof mathWithSumPrecise.sumPrecise === "function") return;
  Object.defineProperty(Math, "sumPrecise", {
    configurable: true,
    writable: true,
    value: (values: Iterable<number>) => {
      let total = 0;
      let compensation = 0;
      let sawValue = false;
      let sawPositiveInfinity = false;
      let sawNegativeInfinity = false;
      let allNegativeZero = true;
      for (const value of values) {
        sawValue = true;
        if (Number.isNaN(value)) return Number.NaN;
        if (value === Number.POSITIVE_INFINITY) {
          sawPositiveInfinity = true;
          allNegativeZero = false;
          continue;
        }
        if (value === Number.NEGATIVE_INFINITY) {
          sawNegativeInfinity = true;
          allNegativeZero = false;
          continue;
        }
        if (!Object.is(value, -0)) allNegativeZero = false;
        const next = total + value;
        if (Math.abs(total) >= Math.abs(value))
          compensation += total - next + value;
        else compensation += value - next + total;
        total = next;
      }
      if (sawPositiveInfinity && sawNegativeInfinity) return Number.NaN;
      if (sawPositiveInfinity) return Number.POSITIVE_INFINITY;
      if (sawNegativeInfinity) return Number.NEGATIVE_INFINITY;
      if (!sawValue) return 0;
      if (allNegativeZero) return -0;
      return total + compensation;
    },
  });
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    ensurePdfJsRuntimeCompatibility();
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        `${PDFJS_ASSET_BASE}pdf.worker.compat.mjs`,
        window.location.origin,
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function withPdfDocument<T>(
  bytes: Uint8Array,
  password: string | undefined,
  run: (doc: PDFDocumentProxy, pdfjs: PdfJsModule) => Promise<T>,
): Promise<T> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    cMapPacked: true,
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    data: bytes.slice(),
    disableFontFace: true,
    enableXfa: false,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
    maxImageSize: 16_777_216,
    password,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    stopAtErrors: false,
    useWasm: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
  });

  let doc: PDFDocumentProxy | undefined;
  try {
    doc = await loadingTask.promise;
    return await run(doc, pdfjs);
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      // Cleanup is best-effort after rendering has settled.
    }
  }
}

async function renderPage(
  doc: PDFDocumentProxy,
  pdfjs: PdfJsModule,
  pageIndex: number,
  targetWidth: number,
  maxPixels: number,
): Promise<Blob> {
  if (pageIndex < 0 || pageIndex >= doc.numPages)
    throw new Error("Preview page is out of range.");
  const page = await doc.getPage(pageIndex + 1);
  const baseViewport = page.getViewport({ scale: 1 });
  let scale = Math.min(
    3,
    Math.max(0.1, targetWidth / Math.max(1, baseViewport.width)),
  );
  const estimatedPixels =
    baseViewport.width * scale * (baseViewport.height * scale);
  if (estimatedPixels > maxPixels)
    scale *= Math.sqrt(maxPixels / estimatedPixels);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  if (!context) {
    page.cleanup();
    throw new Error("Canvas previews are unavailable in this browser.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  try {
    const task = page.render({
      annotationMode: pdfjs.AnnotationMode.ENABLE,
      background: "#ffffff",
      canvas,
      canvasContext: context,
      intent: "display",
      viewport,
    });
    await task.promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("The page preview could not be created.");
    return blob;
  } finally {
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function renderPdfThumbnail(
  bytes: Uint8Array,
  password: string | undefined,
  pageIndex = 0,
): Promise<Blob> {
  return withPdfDocument(bytes, password, (doc, pdfjs) =>
    renderPage(doc, pdfjs, pageIndex, 420, 1_200_000),
  );
}

export async function renderPdfResultPreview(
  bytes: Uint8Array,
  pageIndex = 0,
): Promise<Blob> {
  return withPdfDocument(bytes, undefined, (doc, pdfjs) =>
    renderPage(doc, pdfjs, pageIndex, 880, 3_000_000),
  );
}

export async function renderPdfPageBatch(
  bytes: Uint8Array,
  password: string | undefined,
  pageIndices: number[],
  onPage?: (pageIndex: number, blob: Blob) => void,
): Promise<void> {
  await withPdfDocument(bytes, password, async (doc, pdfjs) => {
    for (const pageIndex of pageIndices) {
      const blob = await renderPage(doc, pdfjs, pageIndex, 300, 700_000);
      onPage?.(pageIndex, blob);
    }
  });
}
