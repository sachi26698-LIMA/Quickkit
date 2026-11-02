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
  | "invalid-range"
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
  /** External hyperlink target when a link annotation covers this item. */
  link?: string;
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
  /** 1-based page number in the source PDF. */
  pageNumber: number;
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
  /** External hyperlink target preserved from a PDF link annotation. */
  link?: string;
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
  /** 1-based page number in the source PDF. */
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  blocks: Block[];
  /** True when a two-column layout was detected (reading order approximated). */
  multiColumn: boolean;
  fromOcr: boolean;
}

/** How the structuring heuristics should treat optional content classes. */
export interface StructureOptions {
  /** Detect table-shaped line groups and emit real Word tables. */
  detectTables: boolean;
  /** Promote large/bold lines to headings and markers to real lists. */
  detectHeadingsLists: boolean;
  /** Keep repeated running headers/footers instead of removing them. */
  keepRunningHeadersFooters: boolean;
}

export const DEFAULT_STRUCTURE_OPTIONS: StructureOptions = {
  detectTables: true,
  detectHeadingsLists: true,
  keepRunningHeadersFooters: false,
};

/** OCR languages shipped on-device (data files self-hosted under /ocr). */
export type OcrLanguage = "eng" | "hin" | "guj";

export const OCR_LANGUAGES: { value: OcrLanguage; label: string }[] = [
  { value: "eng", label: "English" },
  { value: "hin", label: "Hindi (हिन्दी)" },
  { value: "guj", label: "Gujarati (ગુજરાતી)" },
];

/** Honest per-file account of what the conversion did and could not do. */
export interface ConversionReport {
  /** Pages in the source PDF. */
  sourcePages: number;
  /** Pages actually converted (after any page-range selection). */
  convertedPages: number;
  /** Human description of the page selection, e.g. "1–3, 5" or null = all. */
  pageSelection: string | null;
  textPages: number;
  ocrPages: number;
  scannedPagesSkipped: number;
  imagesExtracted: number;
  imagesSkipped: number;
  tablesDetected: number;
  /** External hyperlinks preserved as clickable Word links. */
  linksExtracted: number;
  /** Running header/footer lines removed across the document. */
  removedRunningLines: number;
  /** Pages where a multi-column layout made reading order approximate. */
  multiColumnPages: number;
  warnings: string[];
}
