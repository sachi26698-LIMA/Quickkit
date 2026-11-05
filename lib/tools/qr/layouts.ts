/**
 * Print layouts (Phase F).
 *
 * Each layout is a real, physical PDF page built with pdf-lib from the *same*
 * decode-verified PNG the preview shows — never a second rendering. Dimensions
 * are in millimetres so what you measure on paper matches what was promised.
 * "single" keeps the original centre-on-paper behaviour; the rest are concrete
 * artefacts (business card, sticker, product label, poster, folded table tent)
 * plus an A4 grid sheet for cutting many copies.
 */
import { PDFDocument, StandardFonts, degrees, rgb } from "@cantoo/pdf-lib";
import { createQrPdf, type QrPdfOptions } from "./export";

const MM = 72 / 25.4;
const INK = rgb(0.106, 0.059, 0.18); // Midnight
const GUIDE = rgb(0.8, 0.78, 0.86);

export type QrPrintLayoutId =
  | "single"
  | "business-card"
  | "sticker"
  | "product-label"
  | "poster"
  | "table-tent"
  | "a4-sheet";

export type QrPrintLayout = {
  id: QrPrintLayoutId;
  name: string;
  blurb: string;
  /** Fixed page size in mm; null means "use the chosen paper" (single). */
  pageMm: { w: number; h: number } | null;
  /** Printed code width in mm (a starting point the sheet grid can override). */
  codeMm: number;
};

export const PRINT_LAYOUTS: QrPrintLayout[] = [
  {
    id: "single",
    name: "Single code",
    blurb: "One code centred on the paper you choose below.",
    pageMm: null,
    codeMm: 45,
  },
  {
    id: "business-card",
    name: "Business card",
    blurb: "85 × 55 mm card — code on the right, name on the left.",
    pageMm: { w: 85, h: 55 },
    codeMm: 22,
  },
  {
    id: "sticker",
    name: "Sticker",
    blurb: "50 × 50 mm square label — code fills the face.",
    pageMm: { w: 50, h: 50 },
    codeMm: 40,
  },
  {
    id: "product-label",
    name: "Product label",
    blurb: "70 × 40 mm label — code left, caption right.",
    pageMm: { w: 70, h: 40 },
    codeMm: 28,
  },
  {
    id: "poster",
    name: "Poster",
    blurb: "A4 with a large 130 mm code and a bold caption.",
    pageMm: { w: 210, h: 297 },
    codeMm: 130,
  },
  {
    id: "table-tent",
    name: "Table tent",
    blurb: "A4 landscape, fold in half — a code on each standing face.",
    pageMm: { w: 297, h: 210 },
    codeMm: 70,
  },
  {
    id: "a4-sheet",
    name: "A4 cut sheet",
    blurb: "A grid of identical codes on A4, with cut guides.",
    pageMm: { w: 210, h: 297 },
    codeMm: 45,
  },
];

export function printLayoutDef(id: QrPrintLayoutId): QrPrintLayout {
  return PRINT_LAYOUTS.find((layout) => layout.id === id) ?? PRINT_LAYOUTS[0];
}

export type SheetOptions = {
  cols: number;
  rows: number;
  codeMm: number;
  gapMm: number;
};

export const DEFAULT_SHEET: SheetOptions = {
  cols: 3,
  rows: 4,
  codeMm: 45,
  gapMm: 6,
};

/** Clamp a sheet grid to something that actually fits on A4 with a margin. */
export function clampSheet(input: Partial<SheetOptions>): SheetOptions {
  const base = { ...DEFAULT_SHEET, ...input };
  const cols = Math.max(1, Math.min(6, Math.round(base.cols)));
  const rows = Math.max(1, Math.min(8, Math.round(base.rows)));
  const gapMm = Math.max(0, Math.min(15, base.gapMm));
  // Leave a 10 mm outer margin; shrink the code if the grid would overflow.
  const maxCode = Math.min(
    (210 - 20 - gapMm * (cols - 1)) / cols,
    (297 - 20 - gapMm * (rows - 1)) / rows,
  );
  const codeMm = Math.max(12, Math.min(base.codeMm, Math.floor(maxCode)));
  return { cols, rows, codeMm, gapMm };
}

/** Word-wrap a caption to a width (mm) at a font size (pt). */
function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidthPt: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) <= maxWidthPt || !line) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] =
      font.widthOfTextAtSize(`${last}…`, size) <= maxWidthPt
        ? `${last}…`
        : last;
  }
  return lines;
}

/**
 * Build the PDF for a layout. `png` must already be decode-verified. `caption`
 * is the user's label (or null). `pdfOptions` only affects the "single" layout;
 * `sheet` only affects "a4-sheet".
 */
export async function createLayoutPdf(
  png: Uint8Array,
  caption: string | null,
  layoutId: QrPrintLayoutId,
  pdfOptions: QrPdfOptions,
  sheet: SheetOptions = DEFAULT_SHEET,
): Promise<Uint8Array> {
  if (layoutId === "single") {
    return createQrPdf([{ png, caption }], pdfOptions);
  }
  if (layoutId === "a4-sheet") {
    return createPrintSheetPdf(png, caption, sheet);
  }
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(png);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const def = printLayoutDef(layoutId);
  const page = doc.addPage([def.pageMm!.w * MM, def.pageMm!.h * MM]);
  const W = def.pageMm!.w * MM;
  const H = def.pageMm!.h * MM;
  const text = (caption ?? "").trim();
  const side = def.codeMm * MM;

  const drawCaption = (
    lines: string[],
    x: number,
    topY: number,
    size: number,
    align: "left" | "center" = "left",
    useBold = true,
  ) => {
    const f = useBold ? bold : font;
    lines.forEach((line, i) => {
      const w = f.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: align === "center" ? x - w / 2 : x,
        y: topY - i * size * 1.3,
        size,
        font: f,
        color: INK,
      });
    });
  };

  switch (layoutId) {
    case "business-card": {
      const margin = 6 * MM;
      const codeX = W - side - margin;
      const codeY = (H - side) / 2;
      page.drawImage(image, { x: codeX, y: codeY, width: side, height: side });
      if (text) {
        const size = 11;
        const lines = wrapText(text, bold, size, codeX - margin * 2, 3);
        drawCaption(
          lines,
          margin,
          H / 2 + (lines.length * size * 1.3) / 2,
          size,
        );
      }
      break;
    }
    case "sticker": {
      const codeY = text ? (H - side) / 2 + 3 * MM : (H - side) / 2;
      page.drawImage(image, {
        x: (W - side) / 2,
        y: codeY,
        width: side,
        height: side,
      });
      if (text) {
        const size = 8;
        const lines = wrapText(text, bold, size, W - 8 * MM, 1);
        drawCaption(lines, W / 2, codeY - 3 * MM, size, "center");
      }
      break;
    }
    case "product-label": {
      const margin = 5 * MM;
      const codeY = (H - side) / 2;
      page.drawImage(image, { x: margin, y: codeY, width: side, height: side });
      if (text) {
        const textX = margin + side + 5 * MM;
        const size = 10;
        const lines = wrapText(text, bold, size, W - textX - margin, 3);
        drawCaption(
          lines,
          textX,
          H / 2 + (lines.length * size * 1.3) / 2,
          size,
        );
      }
      break;
    }
    case "poster": {
      const codeY = H - side - 30 * MM;
      page.drawImage(image, {
        x: (W - side) / 2,
        y: codeY,
        width: side,
        height: side,
      });
      if (text) {
        const size = 22;
        const lines = wrapText(text, bold, size, W - 30 * MM, 2);
        drawCaption(lines, W / 2, codeY - 12 * MM, size, "center");
      }
      break;
    }
    case "table-tent": {
      // Fold along the vertical centre; the right face is printed upside-down
      // so both standing faces read correctly once folded.
      const half = W / 2;
      const codeY = (H - side) / 2 + 8 * MM;
      page.drawImage(image, {
        x: (half - side) / 2,
        y: codeY,
        width: side,
        height: side,
      });
      page.drawImage(image, {
        x: half + (half - side) / 2,
        y: codeY,
        width: side,
        height: side,
        rotate: degrees(180),
      });
      // Dashed fold guide.
      page.drawLine({
        start: { x: half, y: 6 * MM },
        end: { x: half, y: H - 6 * MM },
        thickness: 0.6,
        color: GUIDE,
        dashArray: [4, 4],
      });
      if (text) {
        const size = 12;
        const lines = wrapText(text, bold, size, half - 16 * MM, 2);
        drawCaption(lines, half / 2, codeY - 6 * MM, size, "center");
        // Mirror the caption for the inverted face.
        lines.forEach((line, i) => {
          const w = bold.widthOfTextAtSize(line, size);
          page.drawText(line, {
            x: half + half / 2 + w / 2,
            y: H - (codeY - 6 * MM) + i * size * 1.3,
            size,
            font: bold,
            color: INK,
            rotate: degrees(180),
          });
        });
      }
      break;
    }
  }
  return doc.save();
}

/**
 * A4 sheet of identical codes in a cols×rows grid with light cut guides. The
 * grid is clamped to fit the page; each cell carries the code and an optional
 * one-line caption. Returns a single A4 page.
 */
export async function createPrintSheetPdf(
  png: Uint8Array,
  caption: string | null,
  input: SheetOptions,
): Promise<Uint8Array> {
  const sheet = clampSheet(input);
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(png);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 210 * MM;
  const H = 297 * MM;
  const page = doc.addPage([W, H]);
  const side = sheet.codeMm * MM;
  const gap = sheet.gapMm * MM;
  const text = (caption ?? "").trim();
  const captionH = text ? 5 * MM : 0;
  const cellH = side + captionH;
  const gridW = sheet.cols * side + (sheet.cols - 1) * gap;
  const gridH = sheet.rows * cellH + (sheet.rows - 1) * gap;
  const startX = (W - gridW) / 2;
  const startY = (H - gridH) / 2;
  for (let row = 0; row < sheet.rows; row += 1) {
    for (let col = 0; col < sheet.cols; col += 1) {
      const x = startX + col * (side + gap);
      const yTop = startY + gridH - row * (cellH + gap);
      const codeY = yTop - side;
      // Cut guide around the cell.
      page.drawRectangle({
        x: x - 1.5,
        y: codeY - captionH - 1.5,
        width: side + 3,
        height: cellH + 3,
        borderColor: GUIDE,
        borderWidth: 0.5,
      });
      page.drawImage(image, { x, y: codeY, width: side, height: side });
      if (text) {
        const size = Math.max(6, Math.min(9, side * 0.07));
        const line = wrapText(text, bold, size, side, 1)[0] ?? "";
        const w = bold.widthOfTextAtSize(line, size);
        page.drawText(line, {
          x: x + (side - w) / 2,
          y: codeY - 3.6 * MM,
          size,
          font: bold,
          color: INK,
        });
      }
    }
  }
  return doc.save();
}
