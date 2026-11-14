/**
 * Export formats and file naming.
 *
 * PNG bytes come straight from the verified raster, SVG from the same scene,
 * and PDF wraps the PNG in a printable page — so all three formats carry the
 * symbol that passed verification, not a second rendering that might differ.
 */
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";
import { safeFilenamePart } from "@/lib/tools/filename";
export { csvCell, csvDocument, csvRow } from "@/lib/tools/csv";

export type QrExportFormat = "png" | "png-hires" | "svg" | "pdf";

const MM_TO_PT = 72 / 25.4;

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

export type PdfPage = { png: Uint8Array; caption?: string | null };

/**
 * Build a real PDF. One page per code; each code is centred at the requested
 * physical size so the printed quiet zone matches what was verified.
 */
export async function createQrPdf(
  pages: PdfPage[],
  options: QrPdfOptions,
): Promise<Uint8Array> {
  if (!pages.length) throw new Error("There is nothing to put in the PDF yet.");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const captionFont = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of pages) {
    const image = await doc.embedPng(page.png);
    const sizeMm = Math.min(240, Math.max(10, options.sizeMm));
    const side = sizeMm * MM_TO_PT;
    const padding = Math.max(0, options.paddingMm) * MM_TO_PT;
    const caption = (page.caption ?? options.caption ?? "").trim();
    const captionSize = Math.max(7, Math.min(11, side * 0.05));
    const block = side + padding * 2 + (caption ? captionSize * 2.2 : 0);
    let width: number;
    let height: number;
    if (options.paper === "fit") {
      width = block;
      height = block;
    } else {
      const paper = PAPER_SIZES[options.paper];
      width = paper.widthMm * MM_TO_PT;
      height = paper.heightMm * MM_TO_PT;
    }
    const sheet = doc.addPage([width, height]);
    const x = (width - side) / 2;
    const y = (height - block) / 2 + (caption ? captionSize * 1.6 : 0);
    sheet.drawImage(image, { x, y, width: side, height: side });
    if (caption) {
      const text = caption.length > 160 ? `${caption.slice(0, 157)}…` : caption;
      const widthOf = Math.max(
        0,
        captionFont.widthOfTextAtSize(text, captionSize),
      );
      sheet.drawText(text, {
        x: Math.max(padding, (width - widthOf) / 2),
        y: y - captionSize * 1.5,
        size: captionSize,
        font: captionFont,
        color: rgb(0.09, 0.08, 0.17),
      });
    } else if (options.paper === "fit") {
      sheet.drawText("", { x: 0, y: 0, size: 1, font });
    }
  }
  return doc.save();
}

export function pdfBlob(bytes: Uint8Array) {
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}
