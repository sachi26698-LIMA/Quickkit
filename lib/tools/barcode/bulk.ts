/**
 * Bulk generation.
 *
 * A CSV row is never dropped quietly: every row comes back with a status and a
 * sentence explaining it, and the report CSV the user downloads says the same
 * thing. The parser itself is the one the QR studio already ships (RFC 4180
 * quotes, delimiter detection, column caps) so there is exactly one CSV
 * implementation in the codebase.
 */
import { parseCsv, parseCsvFile, type CsvTable } from "@/lib/tools/qr/bulk";
import { buildBarcode } from "./encode";
import { BARCODE_FORMATS } from "./formats";
import type {
  BarcodeEncodeOptions,
  BarcodeFormatId,
  BarcodeSpec,
} from "./types";

export const BARCODE_BULK_LIMITS = {
  /** Hard ceiling enforced by the parser and the UI. */
  maxRows: 1000,
  defaultRows: 250,
  maxFileBytes: 5 * 1024 * 1024,
  maxColumns: 30,
  maxCellChars: 1500,
  /** Rows rendered per animation frame, so the tab never freezes. */
  batchSize: 40,
} as const;

export type BulkRowStatus = "ok" | "duplicate" | "invalid" | "skipped";

export type BulkRow = {
  /** 1-based data row number (the header is row 1 in the file). */
  line: number;
  data: string;
  /** The symbology this row was encoded with (or would have been). */
  format: BarcodeFormatId;
  status: BulkRowStatus;
  message: string;
  /** Encoded symbol, present for ok/duplicate/skipped rows. */
  spec?: BarcodeSpec;
  /** Human label from an optional column. */
  title: string;
  /** Canonical identity used for duplicate detection. */
  canonical: string;
  /** Row number of the first row with the same data. */
  duplicateOf?: number;
};

export type BulkColumnChoice = {
  /** Index of the barcode-data column. */
  data: number;
  /** Index of an optional label/title column, or -1. */
  title: number;
};

export const BULK_TEMPLATE = [
  "data,label",
  "590123412345,EAN shelf label",
  "QUICKKIT-2026,Order card",
  "1234567890123,Case label",
].join("\n");

/** Read a CSV file with the shared parser, plus the barcode-specific ceiling. */
export async function readBulkFile(file: File): Promise<CsvTable> {
  if (file.size > BARCODE_BULK_LIMITS.maxFileBytes)
    throw new Error(
      `That CSV is ${(file.size / 1024 / 1024).toFixed(1)} MB. Keep it under ${BARCODE_BULK_LIMITS.maxFileBytes / 1024 / 1024} MB, or split the batch.`,
    );
  return parseCsvFile(file, { maxRows: BARCODE_BULK_LIMITS.maxRows });
}

export function parseBulkText(text: string): CsvTable {
  return parseCsv(text, { maxRows: BARCODE_BULK_LIMITS.maxRows });
}

/** Best guess for the data column: the header that mentions data/value/code. */
export function guessDataColumn(headers: string[]): number {
  const wanted = [
    "data",
    "value",
    "barcode",
    "code",
    "content",
    "text",
    "number",
    "ean",
    "upc",
    "sku",
  ];
  const lower = headers.map((header) => header.trim().toLowerCase());
  for (const name of wanted) {
    const index = lower.findIndex((header) => header === name);
    if (index >= 0) return index;
  }
  for (const name of wanted) {
    const index = lower.findIndex((header) => header.includes(name));
    if (index >= 0) return index;
  }
  return headers.length > 1 ? 0 : 0;
}

export function guessTitleColumn(
  headers: string[],
  dataColumn: number,
): number {
  const wanted = ["label", "title", "name", "description", "caption"];
  const lower = headers.map((header) => header.trim().toLowerCase());
  for (const name of wanted) {
    const index = lower.findIndex(
      (header, position) => header === name && position !== dataColumn,
    );
    if (index >= 0) return index;
  }
  return -1;
}

export type BuildBulkOptions = {
  format: BarcodeFormatId;
  columns: BulkColumnChoice & {
    /**
     * Index of a per-row format column, or -1 for a single-format run. When set,
     * the cell decides the symbology for that row and `format` is only the
     * fallback for a blank cell.
     */
    format?: number;
  };
  encode?: BarcodeEncodeOptions;
  /** Skip rows whose data repeats an earlier row. */
  skipDuplicates?: boolean;
};

/**
 * Validate and encode every row. Pure: no DOM, no timers — the UI batches the
 * returned work on its own schedule (see `renderBulkRows`).
 *
 * Each row is validated and encoded on its own, so one bad row never stops the
 * rest of a sheet. When a format column is configured, a row's symbology comes
 * from its own cell; a cell that names no known format is reported as invalid
 * rather than silently falling back, because printing the wrong symbology
 * produces a label that will not scan.
 */
export function buildBulkRows(
  table: CsvTable,
  options: BuildBulkOptions,
): BulkRow[] {
  const formatColumn = options.columns.format ?? -1;
  const firstSeen = new Map<string, number>();
  const rows: BulkRow[] = [];
  const maxRows = Math.min(table.rows.length, BARCODE_BULK_LIMITS.maxRows);

  for (let index = 0; index < maxRows; index += 1) {
    const row = table.rows[index];
    const line = index + 2; // header is line 1
    const rawData = (row[options.columns.data] ?? "").trim();
    const title =
      options.columns.title >= 0
        ? (row[options.columns.title] ?? "").trim().slice(0, 80)
        : "";
    const token = formatColumn >= 0 ? (row[formatColumn] ?? "").trim() : "";
    const resolved = token ? resolveBulkFormat(token) : options.format;

    if (token && !resolved) {
      rows.push({
        line,
        data: rawData,
        format: options.format,
        status: "invalid",
        message: `"${token.slice(0, 24)}" is not a symbology this tool encodes. Use one of: ${BULK_FORMAT_TOKENS.join(", ")}.`,
        title,
        canonical: "",
      });
      continue;
    }

    const format = resolved ?? options.format;

    if (!rawData) {
      rows.push({
        line,
        data: "",
        format,
        status: "invalid",
        message:
          "This row has no barcode data — fill the selected column or delete the row.",
        title,
        canonical: "",
      });
      continue;
    }

    const result = buildBarcode(format, rawData, options.encode);
    if (!result.ok) {
      rows.push({
        line,
        data: rawData,
        format,
        status: "invalid",
        message:
          result.problems[0]?.message ?? "This row could not be encoded.",
        title,
        canonical: `${format}:${rawData}`,
      });
      continue;
    }

    const canonical = `${format}:${result.spec.value}`;
    const previous = firstSeen.get(canonical);
    if (previous !== undefined) {
      rows.push({
        line,
        data: rawData,
        format,
        status: options.skipDuplicates ? "skipped" : "duplicate",
        message: options.skipDuplicates
          ? `Skipped: same ${format.toUpperCase()} value as row ${previous}.`
          : `Duplicate of row ${previous} — kept, because labels are often printed twice on purpose.`,
        spec: result.spec,
        title,
        canonical,
        duplicateOf: previous,
      });
      continue;
    }
    firstSeen.set(canonical, line);
    rows.push({
      line,
      data: rawData,
      format,
      status: "ok",
      message: result.spec.notes[0] ?? "Encoded and ready.",
      spec: result.spec,
      title,
      canonical,
    });
  }
  return rows;
}

/** Rows that will be rendered and exported, in file order. */
export function exportableRows(rows: BulkRow[]) {
  return rows.filter(
    (row) => row.status === "ok" || row.status === "duplicate",
  );
}

/** Loose spellings people actually put in a spreadsheet column. */
const FORMAT_ALIASES: Record<string, BarcodeFormatId> = {
  code128: "code128",
  code39: "code39",
  code93: "code93",
  ean13: "ean13",
  ean8: "ean8",
  upca: "upca",
  upce: "upce",
  itf14: "itf14",
  codabar: "codabar",
  msi: "msi",
  pharmacode: "pharmacode",
  gs1128: "gs1-128",
};

/**
 * Resolve a format token from a CSV cell.
 *
 * Accepts the id (`ean13`), the display name (`EAN-13`), and the loose
 * spellings a spreadsheet user types (`EAN 13`, `Code_128`, `GS1 128`). Returns
 * null for anything else; the caller reports that row as invalid, because
 * guessing a symbology would print a label that cannot be scanned.
 */
export function resolveBulkFormat(token: string): BarcodeFormatId | null {
  const normalised = token
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!normalised) return null;
  if (FORMAT_ALIASES[normalised]) return FORMAT_ALIASES[normalised];
  for (const meta of BARCODE_FORMATS) {
    const id = meta.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = meta.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalised === id || normalised === name) return meta.id;
  }
  return null;
}

/** Every token that resolves, for the invalid-row message the UI shows. */
export const BULK_FORMAT_TOKENS = BARCODE_FORMATS.map((meta) => meta.id);

/** Exportable rows grouped by symbology, in the order each format first appears. */
export function bulkFormatGroups(rows: BulkRow[]) {
  const groups = new Map<BarcodeFormatId, BulkRow[]>();
  for (const row of exportableRows(rows)) {
    const list = groups.get(row.format) ?? [];
    list.push(row);
    groups.set(row.format, list);
  }
  return [...groups.entries()].map(([format, list]) => ({
    format,
    rows: list,
  }));
}

export function bulkCounts(rows: BulkRow[]) {
  return {
    total: rows.length,
    ok: rows.filter((row) => row.status === "ok").length,
    duplicate: rows.filter((row) => row.status === "duplicate").length,
    skipped: rows.filter((row) => row.status === "skipped").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
  };
}

/**
 * Chunk helper for the batched renderer: yields control back to the event loop
 * between chunks so a 1,000-row batch never blocks input or the preview.
 */
export async function processInBatches<T, R>(
  items: T[],
  work: (item: T, index: number) => R,
  options: {
    batchSize?: number;
    onProgress?: (done: number, total: number) => void;
    signal?: { aborted: boolean };
  } = {},
): Promise<{ results: R[]; aborted: boolean }> {
  const batchSize = Math.max(
    1,
    options.batchSize ?? BARCODE_BULK_LIMITS.batchSize,
  );
  const results: R[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    if (options.signal?.aborted) return { results, aborted: true };
    for (
      let offset = index;
      offset < Math.min(items.length, index + batchSize);
      offset += 1
    )
      results.push(work(items[offset], offset));
    options.onProgress?.(
      Math.min(items.length, index + batchSize),
      items.length,
    );
    // Yield: a macrotask, so layout and paint can happen between batches.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { results, aborted: false };
}
