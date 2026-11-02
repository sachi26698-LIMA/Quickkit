/**
 * Shared types + configurable limits for the PDF to Word converter.
 *
 * Pipeline: PDF bytes -> ExtractedPage[] (pdfjs / OCR) -> StructuredPage[]
 * (pure structuring in structure.ts) -> DOCX Blob (render-docx.ts).
 * All coordinates are PDF points (1/72"), origin at the TOP-LEFT of the
 * page, y growing downwards (converted once during extraction).
 */

/** Configurable safety limits (shown in the UI; enforced before work). */
export const PDF_TO_WORD_LIMITS = {
  /** Maximum files accepted into one batch. */
  maxFiles: 50,
  /** Maximum size of one PDF (bytes). */
  maxFileBytes: 25 * 1024 * 1024,
  /** Maximum combined size of one batch (bytes). */
  maxBatchBytes: 250 * 1024 * 1024,
  /** Maximum pages converted from one PDF. */
  maxPagesPerFile: 300,
} as const;

export type ConversionMode = "layout" | "clean";

/** Why a file (or the batch) could not be converted. Never silent. */
export type PdfToWordErrorKind =
  | "not-a-pdf"
  | "corrupted"
  | "password-protected"
  | "too-large"
  | "too-many-pages"
  | "empty"
  | "ocr-unavailable"
  | "ocr-failed"
  | "cancelled"
  | "conversion-failed";

export class PdfToWordError extends Error {
  readonly kind: PdfToWordErrorKind;
  constructor(kind: PdfToWordErrorKind, message: string) {
    super(message);
    this.name = "PdfToWordError";
    this.kind = kind;
  }
}

/** One positioned text fragment from pdfjs (or one OCR line). */
export interface PdfTextItem {
  text: string;
  /** Left edge, points from page left. */
  x: number;
  /** Top edge, points from page top. */
  y: number;
  /** Advance width in points (approximate for OCR items). */
  width: number;
  /** Font size in points (approximate for OCR items). */
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

/** One embedded raster image extracted from a page. */
export interface PdfImageItem {
  x: number;
  y: number;
  /** Display size on the PDF page, in points. */
  width: number;
  height: number;
  /** PNG-encoded bytes. */
  png: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
}

export interface ExtractedPage {
  widthPt: number;
  heightPt: number;
  items: PdfTextItem[];
  images: PdfImageItem[];
  /** Non-whitespace characters found in the text layer (0 for scans). */
  charCount: number;
  /** True when the items came from OCR rather than the text layer. */
  fromOcr: boolean;
}

/* ------------------------- Structured model ------------------------- */

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

export type BlockAlign = "left" | "center" | "right" | "justify";

export type Block =
  | {
      kind: "heading";
      level: 1 | 2 | 3;
      runs: TextRun[];
      x: number;
      y: number;
      fontSize: number;
      align: BlockAlign;
    }
  | {
      kind: "paragraph";
      runs: TextRun[];
      x: number;
      y: number;
      widthPt: number;
      fontSize: number;
      align: BlockAlign;
      /** Vertical gap before this block, points (layout mode spacing). */
      spaceBeforePt: number;
    }
  | {
      kind: "list";
      ordered: boolean;
      items: TextRun[][];
      x: number;
      y: number;
      fontSize: number;
    }
  | {
      kind: "table";
      rows: string[][];
      /** Column widths in points, one per column. */
      colWidthsPt: number[];
      x: number;
      y: number;
      fontSize: number;
    }
  | {
      kind: "image";
      image: PdfImageItem;
    };

export interface StructuredPage {
  widthPt: number;
  heightPt: number;
  blocks: Block[];
  /** True when a two-column layout was detected (reading order approximated). */
  multiColumn: boolean;
  fromOcr: boolean;
}

/** Honest per-file account of what the conversion did and could not do. */
export interface ConversionReport {
  pages: number;
  textPages: number;
  ocrPages: number;
  scannedPagesSkipped: number;
  imagesExtracted: number;
  imagesSkipped: number;
  tablesDetected: number;
  warnings: string[];
}
