/**
 * Export formats and file naming.
 *
 * PNG bytes come straight from the verified raster, SVG from the same scene,
 * and PDF wraps the PNG in a printable page — so all three formats carry the
 * symbol that passed verification, not a second rendering that might differ.
 */
import { safeFilenamePart } from "@/lib/tools/filename";
export { csvCell, csvDocument, csvRow } from "@/lib/tools/csv";

export type QrExportFormat = "png" | "png-hires" | "svg" | "pdf";

// Shared with the barcode studio, and re-exported so existing imports keep
// working without pulling the barcode bundle in either direction.
export { safeFilenamePart };

export function qrFilename(options: {
  label: string;
  typeId?: string;
  ext: "png" | "svg" | "pdf" | "zip" | "csv";
  size?: number;
  suffix?: string;
}) {
  const parts = [
    "quickkit-qr",
    safeFilenamePart(options.typeId ?? "code", 14),
    safeFilenamePart(options.label, 42),
    options.size ? `${options.size}px` : "",
    options.suffix ? safeFilenamePart(options.suffix, 18) : "",
  ].filter(Boolean);
  return `${parts.join("-")}.${options.ext}`;
}

export function pngBlob(bytes: Uint8Array) {
  return new Blob([bytes as unknown as BlobPart], { type: "image/png" });
}

export function svgBlob(svg: string) {
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

export type QrPaper = "a4" | "letter" | "square" | "fit";

export const PAPER_SIZES: Record<
  QrPaper,
  { label: string; widthMm: number; heightMm: number }
> = {
  a4: { label: "A4 · 210 × 297 mm", widthMm: 210, heightMm: 297 },
  letter: {
    label: "US Letter · 216 × 279 mm",
    widthMm: 215.9,
    heightMm: 279.4,
  },
  square: { label: "Square label · 60 × 60 mm", widthMm: 60, heightMm: 60 },
  fit: { label: "Fit to the code (no page)", widthMm: 0, heightMm: 0 },
};

export type QrPdfOptions = {
  paper: QrPaper;
  /** Printed width of the code itself, in millimetres. */
  sizeMm: number;
  caption: string | null;
  /** Extra white border around the code, in millimetres. */
  paddingMm: number;
};

export const DEFAULT_PDF_OPTIONS: QrPdfOptions = {
  paper: "a4",
  sizeMm: 45,
  caption: null,
  paddingMm: 6,
};

/*
 * NOTE: no re-export of ./export-pdf here on purpose. A static re-export is a
 * real module edge, so it would drag pdf-lib back into every page that imports
 * this file for pngBlob/svgBlob/csvDocument. Import PDF helpers from
 * "@/lib/tools/qr/export-pdf" directly, and ideally via `await import()`.
 */
