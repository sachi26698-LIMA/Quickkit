import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { PdfToWordError } from "./types";

/**
 * Interactive preview of the ORIGINAL PDF: opens the document once and
 * renders pages/thumbnails on demand (lazy, one page at a time) so even
 * a 300-page file never lands in memory all at once. Mirrors the
 * same-origin pdfjs asset setup used by extract.ts. The handle must be
 * destroyed when the preview closes.
 */

const PDFJS_VERSION = "6.4.299";
const PDFJS_ASSET_BASE = `/pdfjs/${PDFJS_VERSION}/`;
const MAX_CANVAS_WIDTH_PX = 2800;

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

export interface PdfPageSize {
  widthPt: number;
  heightPt: number;
}

export interface PdfPreviewHandle {
  pageCount: number;
  /** Page size in points at the given view rotation (0/90/180/270). */
  pageSize(pageNo: number, rotation?: number): Promise<PdfPageSize>;
  /**
   * Render a page into `canvas` at `targetWidthPx` device pixels wide.
   * Resolves to the rendered pixel size, or null when superseded.
   */
  renderPage(
    pageNo: number,
    canvas: HTMLCanvasElement,
    targetWidthPx: number,
    rotation?: number,
  ): Promise<{ width: number; height: number } | null>;
  /** Render a small thumbnail; resolves to an object URL (caller revokes). */
  renderThumbnail(pageNo: number, widthPx?: number): Promise<string | null>;
  destroy(): Promise<void>;
}

export async function openPdfPreview(
  bytes: Uint8Array,
): Promise<PdfPreviewHandle> {
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
  let doc: PDFDocumentProxy;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new PdfToWordError(
      name === "PasswordException" ? "password-protected" : "corrupted",
      name === "PasswordException"
        ? "This PDF is password-protected, so it cannot be previewed."
        : "This PDF could not be opened for preview.",
    );
  }

  const sizeCache = new Map<string, PdfPageSize>();
  let currentTask: RenderTask | null = null;
  let renderSerial = 0;
  let destroyed = false;
  let thumbnailChain: Promise<string | null> = Promise.resolve(null);

  const handle: PdfPreviewHandle = {
    pageCount: doc.numPages,

    async pageSize(pageNo, rotation = 0) {
      const key = `${pageNo}:${rotation}`;
      const cached = sizeCache.get(key);
      if (cached) return cached;
      const page = await doc.getPage(pageNo);
      const viewport = page.getViewport({ scale: 1, rotation });
      const size = { widthPt: viewport.width, heightPt: viewport.height };
      sizeCache.set(key, size);
      page.cleanup();
      return size;
    },

    async renderPage(pageNo, canvas, targetWidthPx, rotation = 0) {
      if (destroyed) return null;
      const serial = ++renderSerial;
      currentTask?.cancel();
      const page = await doc.getPage(pageNo);
      const base = page.getViewport({ scale: 1, rotation });
      const widthPx = Math.max(
        40,
        Math.min(MAX_CANVAS_WIDTH_PX, Math.round(targetWidthPx)),
      );
      const scale = widthPx / base.width;
      const viewport = page.getViewport({ scale, rotation });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const task = page.render({ canvas, viewport });
      currentTask = task;
      try {
        await task.promise;
      } catch {
        // Cancelled by a newer render or by destroy().
        return null;
      } finally {
        if (currentTask === task) currentTask = null;
        page.cleanup();
      }
      if (serial !== renderSerial || destroyed) return null;
      return { width: canvas.width, height: canvas.height };
    },

    async renderThumbnail(pageNo, widthPx = 144) {
      if (destroyed) return null;
      // Independent of the main render slot: thumbnails must never cancel
      // the page the user is looking at. Serialized through a chain so a
      // fast scroll through the strip cannot flood the pdfjs worker.
      const job = thumbnailChain.then(async () => {
        if (destroyed) return null;
        const page = await doc.getPage(pageNo);
        try {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: (widthPx * dpr) / base.width,
          });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const context = canvas.getContext("2d");
          if (!context) return null;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, viewport }).promise;
          if (destroyed) return null;
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );
          canvas.width = 0;
          canvas.height = 0;
          return blob ? URL.createObjectURL(blob) : null;
        } catch {
          return null;
        } finally {
          page.cleanup();
        }
      });
      thumbnailChain = job.catch(() => null);
      return job;
    },

    async destroy() {
      destroyed = true;
      renderSerial++;
      currentTask?.cancel();
      currentTask = null;
      sizeCache.clear();
      await loadingTask.destroy().catch(() => undefined);
    },
  };
  return handle;
}
