/**
 * PDF export for QR codes.
 *
 * Kept in its own module so that importing the cheap helpers in ./export
 * (pngBlob, svgBlob, csvDocument, qrFilename) never drags @cantoo/pdf-lib
 * (~240 kB gzipped) into a page's first paint. pdf-lib is also imported
 * dynamically inside createQrPdf, so even this module costs nothing until a
 * PDF is actually built.
 */
import { PAPER_SIZES, type QrPdfOptions } from "./export";

const MM_TO_PT = 72 / 25.4;
export type { QrPdfOptions };
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
  // pdf-lib is ~240 kB gzipped. Loading it here instead of at module scope keeps
  // it out of the first paint of every page that merely imports this module for
  // pngBlob/svgBlob/qrFilename. Only an actual PDF export pays for it.
  const { PDFDocument, StandardFonts, rgb } = await import("@cantoo/pdf-lib");
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
