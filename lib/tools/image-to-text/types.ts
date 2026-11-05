/**
 * Shared types, limits and language data for the Image to Text (OCR) tool.
 *
 * Pipeline: image bytes -> prepared canvas (rotation / crop / enhancement)
 * -> tesseract.js (self-hosted engine, runs in its own web worker)
 * -> OcrPage (lines, words, confidences, bboxes) -> extraction mode
 * -> editable document -> export (TXT / DOCX / PDF / CSV / JSON).
 *
 * Everything is local: there is no fetch to any OCR service, and no file or
 * result is ever stored. Only the self-hosted engine files under /ocr are
 * requested, and only for languages that are actually used.
 */

/** Safety limits, surfaced in the UI and enforced before work starts. */
export const OCR_LIMITS = {
  /** Maximum images (or PDF pages) in one batch. */
  maxFiles: 40,
  /** Maximum size of one uploaded file, bytes. */
  maxFileBytes: 25 * 1024 * 1024,
  /** Maximum combined size of one batch, bytes. */
  maxBatchBytes: 200 * 1024 * 1024,
  /** Maximum pages accepted from one PDF. */
  maxPdfPages: 40,
  /** Largest side fed to the OCR engine, px (bigger images are downscaled). */
  maxOcrSide: 4000,
  /** Upscale small crops so the engine has enough pixels per glyph. */
  minOcrSide: 900,
  /** Bounded-batch concurrency choices. */
  concurrencyChoices: [1, 2, 3] as const,
} as const;

/** Uploaded file kinds the workspace accepts. */
export type OcrInputKind = "image" | "pdf";

export const OCR_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/avif",
  "image/gif",
  "application/pdf",
] as const;

/** Extensions accepted when the browser reports an empty MIME type. */
export const OCR_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
  ".avif",
  ".gif",
  ".pdf",
] as const;

/* ------------------------------- languages -------------------------------- */

export type OcrLanguageCode =
  "eng" | "hin" | "guj" | "mar" | "ben" | "tam" | "tel" | "urd";

export interface OcrLanguage {
  code: OcrLanguageCode;
  /** English name. */
  name: string;
  /** Native name, rendered in the language's own script. */
  native: string;
  /** ISO 639-1/2 tag used for fonts and exports. */
  tag: string;
  /** Script family, used to group the picker. */
  script:
    | "Latin"
    | "Devanagari"
    | "Gujarati"
    | "Bengali"
    | "Tamil"
    | "Telugu"
    | "Arabic";
  /** Rough accuracy expectation, stated honestly in the UI. */
  quality: "high" | "good" | "fair";
  /** One honest sentence about what to expect. */
  note: string;
}

/**
 * Languages shipped with this build. Anything not in this list is *not*
 * supported and is never advertised as supported: the trained data is
 * self-hosted, so the list is exactly what is on disk.
 */
export const OCR_LANGUAGES: readonly OcrLanguage[] = [
  {
    code: "eng",
    name: "English",
    native: "English",
    tag: "en",
    script: "Latin",
    quality: "high",
    note: "Best overall accuracy, including numbers, punctuation and receipts.",
  },
  {
    code: "hin",
    name: "Hindi",
    native: "हिन्दी",
    tag: "hi",
    script: "Devanagari",
    quality: "good",
    note: "Printed Devanagari reads well; matras can slip on poor scans.",
  },
  {
    code: "guj",
    name: "Gujarati",
    native: "ગુજરાતી",
    tag: "gu",
    script: "Gujarati",
    quality: "good",
    note: "Printed Gujarati reads well at 300 DPI or above.",
  },
  {
    code: "mar",
    name: "Marathi",
    native: "मराठी",
    tag: "mr",
    script: "Devanagari",
    quality: "good",
    note: "Shares Hindi's Devanagari model; print reads better than handwriting.",
  },
  {
    code: "ben",
    name: "Bengali",
    native: "বাংলা",
    tag: "bn",
    script: "Bengali",
    quality: "fair",
    note: "Printed Bengali works; conjuncts and thin strokes are harder.",
  },
  {
    code: "tam",
    name: "Tamil",
    native: "தமிழ்",
    tag: "ta",
    script: "Tamil",
    quality: "fair",
    note: "Printed Tamil works best on clean, high-resolution scans.",
  },
  {
    code: "tel",
    name: "Telugu",
    native: "తెలుగు",
    tag: "te",
    script: "Telugu",
    quality: "fair",
    note: "Printed Telugu works; expect proofreading on dense text.",
  },
  {
    code: "urd",
    name: "Urdu",
    native: "اردو",
    tag: "ur",
    script: "Arabic",
    quality: "fair",
    note: "Right-to-left Naskh print. Nastaliq calligraphy is not reliable.",
  },
] as const;

export const OCR_LANGUAGE_CODES = OCR_LANGUAGES.map((l) => l.code);

export function languageByCode(code: string): OcrLanguage | undefined {
  return OCR_LANGUAGES.find((language) => language.code === code);
}

/** Human label: "Hindi (हिन्दी)". */
export function languageLabel(code: string): string {
  const language = languageByCode(code);
  return language ? `${language.name} (${language.native})` : code;
}

/** Languages whose script runs right-to-left. */
export function isRtlLanguage(code: string): boolean {
  return languageByCode(code)?.script === "Arabic";
}

/* ----------------------------- extraction modes --------------------------- */

export type ExtractionMode =
  "plain" | "layout" | "formatted" | "table" | "structured" | "smart";

export interface ExtractionModeInfo {
  id: ExtractionMode;
  label: string;
  hint: string;
  description: string;
}

export const EXTRACTION_MODES: readonly ExtractionModeInfo[] = [
  {
    id: "plain",
    label: "Plain Text",
    hint: "Clean editable text",
    description:
      "Flows every line together and re-joins words broken by hyphenation, so the result is ready to paste anywhere.",
  },
  {
    id: "layout",
    label: "Original Layout",
    hint: "Line breaks and column order",
    description:
      "Keeps columns in reading order and preserves intentional blank lines and indentation.",
  },
  {
    id: "formatted",
    label: "Formatted Text",
    hint: "Headings, lists, paragraphs",
    description:
      "Detects headings by size and weight, list markers and paragraph breaks, and writes them as Markdown-style structure.",
  },
  {
    id: "table",
    label: "Table Extraction",
    hint: "Columns as real tables",
    description:
      "Groups lines into rows by vertical position and splits columns by horizontal gaps. Rows and columns are kept for CSV export.",
  },
  {
    id: "structured",
    label: "Structured Data",
    hint: "Key–value fields",
    description:
      "Pulls out label: value pairs — name, date, invoice number, totals — plus any tables found, as structured records.",
  },
  {
    id: "smart",
    label: "Smart OCR",
    hint: "Chooses for you",
    description:
      "Inspects the page: tables become tables, label/value blocks become fields, everything else keeps its layout.",
  },
] as const;

export function modeInfo(mode: ExtractionMode): ExtractionModeInfo {
  return EXTRACTION_MODES.find((m) => m.id === mode) ?? EXTRACTION_MODES[0];
}

/* -------------------------------- settings -------------------------------- */

/** Layout intent handed to the OCR engine (tesseract page segmentation). */
export type SegmentationMode =
  "auto" | "single-column" | "single-block" | "single-line" | "sparse";

export type AccuracyPreference = "accuracy" | "balanced" | "speed";

export interface EnhancementSettings {
  /** Rotation applied before OCR (degrees, multiples of 90 or any angle). */
  rotation: number;
  /** Normalised crop rect (0..1). Undefined means the whole image. */
  crop?: { x: number; y: number; width: number; height: number };
  grayscale: boolean;
  /** Contrast multiplier, 1 = unchanged, up to 2. */
  contrast: number;
  /** Brightness multiplier, 1 = unchanged, 0.5..1.5. */
  brightness: number;
  /** Black/white point threshold for stubborn scans; 0 disables. */
  binarize: boolean;
  /** Median noise removal pass. */
  denoise: boolean;
  /** Automatic deskew (angle detection) before recognition. */
  deskew: boolean;
  /** Feed the engine at a higher resolution (slower, better on small text). */
  supersample: boolean;
}

export const DEFAULT_ENHANCEMENT: EnhancementSettings = {
  rotation: 0,
  grayscale: false,
  contrast: 1,
  brightness: 1,
  binarize: false,
  denoise: false,
  deskew: false,
  supersample: false,
};

export interface OcrSettings {
  languages: OcrLanguageCode[];
  detections: Array<{ code: OcrLanguageCode; confidence: number }>;
  confidenceThreshold: number;
  mode: ExtractionMode;
  segmentation: SegmentationMode;
  accuracy: AccuracyPreference;
  enhancement: EnhancementSettings;
  concurrency: 1 | 2 | 3;
  autoRotate: boolean;
  pageRange: string;
  maxSide: number;
  keepParagraphBreaks: boolean;
  joinHyphenated: boolean;
}

export const DEFAULT_SETTINGS: OcrSettings = {
  languages: ["eng"],
  detections: [],
  confidenceThreshold: 60,
  mode: "smart",
  segmentation: "auto",
  accuracy: "balanced",
  enhancement: DEFAULT_ENHANCEMENT,
  concurrency: 1,
  autoRotate: true,
  pageRange: "",
  maxSide: 2400,
  keepParagraphBreaks: true,
  joinHyphenated: true,
};

/** Clamp every numeric setting into its supported range. */
export function normalizeSettings(input: OcrSettings): OcrSettings {
  const languages = input.languages.filter((code) =>
    OCR_LANGUAGE_CODES.includes(code),
  );
  const enhancement = input.enhancement;
  const clamp = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return {
    ...input,
    languages: languages.length ? Array.from(new Set(languages)) : ["eng"],
    detections: (input.detections ?? []).filter((d) =>
      OCR_LANGUAGE_CODES.includes(d.code),
    ),
    confidenceThreshold: Math.round(
      clamp(
        input.confidenceThreshold,
        0,
        100,
        DEFAULT_SETTINGS.confidenceThreshold,
      ),
    ),
    concurrency: ([1, 2, 3] as const).includes(input.concurrency)
      ? input.concurrency
      : 1,
    maxSide: Math.round(
      clamp(input.maxSide, 1200, OCR_LIMITS.maxOcrSide, 2400),
    ),
    enhancement: {
      rotation:
        ((Math.round(clamp(enhancement.rotation, -180, 180, 0)) % 360) + 360) %
        360,
      crop: enhancement.crop,
      grayscale: Boolean(enhancement.grayscale),
      contrast: clamp(enhancement.contrast, 0.5, 2, 1),
      brightness: clamp(enhancement.brightness, 0.5, 1.5, 1),
      binarize: Boolean(enhancement.binarize),
      denoise: Boolean(enhancement.denoise),
      deskew: Boolean(enhancement.deskew),
      supersample: Boolean(enhancement.supersample),
    },
  };
}

/* ------------------------------ OCR results ------------------------------- */

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  /** Height of the line box, used for heading detection. */
  height: number;
  words: OcrWord[];
  /** Paragraph index assigned by the engine. */
  paragraph: number;
  /** Block index assigned by the engine (column-ish grouping). */
  block: number;
}

export interface OcrPage {
  /** Stable id: "<sourceId>:<page>". */
  id: string;
  sourceId: string;
  sourceName: string;
  /** 1-based page number inside the source (1 for plain images). */
  page: number;
  pageCount: number;
  width: number;
  height: number;
  lines: OcrLine[];
  /** Raw engine text, kept for the plain fallback and for exports. */
  text: string;
  confidence: number;
  /** Milliseconds spent recognising this page. */
  durationMs: number;
  /** Mean confidence of the lowest-scoring 15% of words. */
  lowConfidenceShare: number;
  languages: string[];
  /** Text direction used when displaying and exporting. */
  rtl: boolean;
  warnings: string[];
}

export type OcrErrorKind =
  | "unsupported-type"
  | "too-large"
  | "too-many"
  | "empty"
  | "unreadable"
  | "pdf-protected"
  | "pdf-corrupt"
  | "no-text"
  | "engine-unavailable"
  | "cancelled"
  | "timeout";

export class OcrError extends Error {
  readonly kind: OcrErrorKind;
  constructor(kind: OcrErrorKind, message: string) {
    super(message);
    this.name = "OcrError";
    this.kind = kind;
  }
}

/* ------------------------------- extraction ------------------------------- */

export type StructuredValue =
  | string
  | number
  | null
  | StructuredValue[]
  | { [key: string]: StructuredValue };

export interface ExtractedTable {
  /** Detection order within the page. */
  index: number;
  /** Column header row when one could be identified. */
  headers: string[];
  rows: string[][];
  /** Confidence of the weakest cell in the table. */
  confidence: number;
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
  line: number;
}

export interface PageExtraction {
  mode: ExtractionMode;
  /** Mode actually used (Smart OCR resolves to one of the others). */
  resolvedMode: Exclude<ExtractionMode, "smart">;
  /** Plain, readable text for the editor and TXT export. */
  text: string;
  tables: ExtractedTable[];
  fields: ExtractedField[];
  /** Headings in reading order, used by DOCX export. */
  headings: string[];
  /** Lines whose confidence is below the threshold. */
  lowConfidenceLines: number[];
  /** Why Smart OCR chose what it chose, shown to the user. */
  rationale: string;
}

/* -------------------------------- exports --------------------------------- */

export interface OcrDocumentSection {
  id: string;
  title: string;
  page: OcrPage;
  extraction: PageExtraction;
  /** User-edited text. When unchanged it equals extraction.text. */
  text: string;
}

export type ExportFormat = "txt" | "docx" | "pdf" | "csv" | "json";

export const EXPORT_FORMATS: readonly {
  id: ExportFormat;
  label: string;
  extension: string;
  hint: string;
}[] = [
  { id: "txt", label: "TXT", extension: "txt", hint: "Plain Unicode text" },
  { id: "docx", label: "DOCX", extension: "docx", hint: "Editable Word file" },
  { id: "pdf", label: "PDF", extension: "pdf", hint: "Searchable text PDF" },
  { id: "csv", label: "CSV", extension: "csv", hint: "Tables, one file each" },
  {
    id: "json",
    label: "JSON",
    extension: "json",
    hint: "Text, fields, tables",
  },
] as const;
