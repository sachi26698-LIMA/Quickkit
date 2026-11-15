/**
 * Print output.
 *
 * Labels are drawn as vector rectangles, not as an embedded bitmap: at 8 px per
 * module a PNG is fine, but a 300 dpi label printed at 40 mm is not, and a
 * blurred bar edge is exactly how printed barcodes fail verification. Text uses
 * the PDF standard fonts so the file has no dependencies and opens everywhere.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "@cantoo/pdf-lib";
import {
  buildLayout,
  type BarcodeLayout,
  type BarcodeRenderOptions,
} from "./layout";
import type { BarcodeSpec } from "./types";

const MM_TO_PT = 72 / 25.4;

export type BarcodePaper = "a4" | "letter" | "fit";

export const BARCODE_PAPERS: Record<
  BarcodePaper,
  { label: string; widthMm: number; heightMm: number }
> = {
  a4: { label: "A4 · 210 × 297 mm", widthMm: 210, heightMm: 297 },
  letter: {
    label: "US Letter · 216 × 279 mm",
    widthMm: 215.9,
    heightMm: 279.4,
  },
  fit: { label: "Fit the page to the label", widthMm: 0, heightMm: 0 },
};

export type BarcodeLabelSize = {
  widthMm: number;
  heightMm: number;
};

export const DEFAULT_LABEL_SIZE: BarcodeLabelSize = {
  widthMm: 64,
  heightMm: 34,
};

export type BarcodePdfOptions = {
  paper: BarcodePaper;
  label: BarcodeLabelSize;
  /** Page margin in millimetres. */
  marginMm: number;
  /** Gap between labels in millimetres. */
  gapMm: number;
  /** Paint an opaque white label background (recommended for coloured stock). */
  whiteBackground: boolean;
  render: Partial<BarcodeRenderOptions>;
};

export const DEFAULT_PDF_OPTIONS: BarcodePdfOptions = {
  paper: "a4",
  label: DEFAULT_LABEL_SIZE,
  marginMm: 10,
  gapMm: 4,
  whiteBackground: true,
  render: {},
};

export type BarcodePdfItem = {
  spec: BarcodeSpec;
  /** Optional per-label heading, e.g. a CSV row label. */
  title?: string;
  description?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function toRgb(hex: string) {
  const clean = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(
    (offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255 || 0,
  );
  return rgb(r, g, b);
}

/** The layout a label is drawn from — exposed so the UI can report it too. */
export function labelLayout(item: BarcodePdfItem, options: BarcodePdfOptions) {
  return buildLayout({
    spec: item.spec,
    options: {
      ...options.render,
      title: item.title ?? options.render.title ?? "",
      description: item.description ?? options.render.description ?? "",
    },
  });
}

/**
 * Physical x-dimension (narrow module width) of a label, in millimetres, once
 * the layout is fitted into the requested label box.
 */
export function labelMetrics(item: BarcodePdfItem, options: BarcodePdfOptions) {
  const layout = labelLayout(item, options);
  const boxWidth = clamp(options.label.widthMm, 8, 320);
  const boxHeight = clamp(options.label.heightMm, 8, 320);
  const scale = Math.min(boxWidth / layout.width, boxHeight / layout.height);
  return {
    layout,
    scale,
    widthMm: layout.width * scale,
    heightMm: layout.height * scale,
    moduleMm: layout.moduleWidth * scale,
  };
}

function drawLayout(
  page: PDFPage,
  layout: BarcodeLayout,
  box: { x: number; y: number; width: number; height: number },
  fonts: { regular: PDFFont; bold: PDFFont },
  whiteBackground: boolean,
) {
  const scale = Math.min(box.width / layout.width, box.height / layout.height);
  const drawWidth = layout.width * scale;
  const drawHeight = layout.height * scale;
  const originX = box.x + (box.width - drawWidth) / 2;
  const originY = box.y + (box.height - drawHeight) / 2;
  const topY = originY + drawHeight;

  if (whiteBackground || layout.background) {
    page.drawRectangle({
      x: originX,
      y: originY,
      width: drawWidth,
      height: drawHeight,
      color: toRgb(layout.background ?? "#ffffff"),
    });
  }

  const barColor = toRgb(layout.foreground);
  for (const bar of layout.bars) {
    page.drawRectangle({
      x: originX + bar.x * scale,
      y: topY - (bar.y + bar.height) * scale,
      width: Math.max(0.2, bar.width * scale),
      height: Math.max(0.2, bar.height * scale),
      color: barColor,
    });
  }

  for (const block of layout.texts) {
    const size = Math.max(4, Math.min(72, block.size * scale));
    const font = block.weight >= 600 ? fonts.bold : fonts.regular;
    let width: number;
    try {
      width = font.widthOfTextAtSize(block.text, size);
    } catch {
      width = block.text.length * size * 0.56;
    }
    let x = originX + block.x * scale;
    if (block.anchor === "middle") x -= width / 2;
    else if (block.anchor === "end") x -= width;
    page.drawText(block.text, {
      x: Math.max(originX, x),
      y: topY - (block.y + block.size * 0.78) * scale,
      size,
      font,
      color: toRgb(block.color),
    });
  }
}

export type BarcodePdfPlan = {
  columns: number;
  rows: number;
  perPage: number;
  pages: number;
};

/** How many labels fit on a sheet — shared by the UI and the tests. */
export function planSheet(
  count: number,
  options: BarcodePdfOptions,
): BarcodePdfPlan {
  const labelW = clamp(options.label.widthMm, 8, 320);
  const labelH = clamp(options.label.heightMm, 8, 320);
  const margin = clamp(options.marginMm, 0, 40);
  const gap = clamp(options.gapMm, 0, 30);
  if (options.paper === "fit")
    return { columns: 1, rows: 1, perPage: 1, pages: Math.max(1, count) };
  const paper = BARCODE_PAPERS[options.paper];
  const columns = Math.max(
    1,
    Math.floor((paper.widthMm - margin * 2 + gap) / (labelW + gap)),
  );
  const rows = Math.max(
    1,
    Math.floor((paper.heightMm - margin * 2 + gap) / (labelH + gap)),
  );
  const perPage = columns * rows;
  return {
    columns,
    rows,
    perPage,
    pages: Math.max(1, Math.ceil(count / perPage)),
  };
}

/** Build the PDF. One page per sheet for `a4`/`letter`, one page per label for `fit`. */
export async function createBarcodePdf(
  items: BarcodePdfItem[],
  options: BarcodePdfOptions,
): Promise<Uint8Array> {
  if (!items.length) throw new Error("There is nothing to put in the PDF yet.");
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };

  const labelW = clamp(options.label.widthMm, 8, 320);
  const labelH = clamp(options.label.heightMm, 8, 320);
  const margin = clamp(options.marginMm, 0, 40);
  const gap = clamp(options.gapMm, 0, 30);

  if (options.paper === "fit") {
    for (const item of items) {
      const layout = labelLayout(item, options);
      const widthPt = labelW * MM_TO_PT;
      const heightPt = labelH * MM_TO_PT;
      const page = doc.addPage([widthPt, heightPt]);
      drawLayout(
        page,
        layout,
        { x: 0, y: 0, width: widthPt, height: heightPt },
        fonts,
        options.whiteBackground,
      );
    }
    return doc.save();
  }

  const paper = BARCODE_PAPERS[options.paper];
  const widthPt = paper.widthMm * MM_TO_PT;
  const heightPt = paper.heightMm * MM_TO_PT;
  const plan = planSheet(items.length, options);
  const labelWPt = labelW * MM_TO_PT;
  const labelHPt = labelH * MM_TO_PT;
  const gapPt = gap * MM_TO_PT;
  const marginPt = margin * MM_TO_PT;

  for (let index = 0; index < items.length; index += plan.perPage) {
    const page = doc.addPage([widthPt, heightPt]);
    const slice = items.slice(index, index + plan.perPage);
    slice.forEach((item, position) => {
      const column = position % plan.columns;
      const row = Math.floor(position / plan.columns);
      const box = {
        x: marginPt + column * (labelWPt + gapPt),
        y: heightPt - marginPt - labelHPt - row * (labelHPt + gapPt),
        width: labelWPt,
        height: labelHPt,
      };
      if (box.y < 0) return;
      drawLayout(
        page,
        labelLayout(item, options),
        box,
        fonts,
        options.whiteBackground,
      );
    });
  }
  return doc.save();
}

export function pdfBlob(bytes: Uint8Array) {
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}
