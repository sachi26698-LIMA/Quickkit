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
import type { BarcodeEncodeOptions, BarcodeFormatId, BarcodeSpec } from "./types";

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
  const wanted = ["data", "value", "barcode", "code", "content", "text", "number", "ean", "upc", "sku"];
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

export function guessTitleColumn(headers: string[], dataColumn: number): number {
  const wanted = ["label", "title", "name", "description", "caption"];
  const lower = headers.map((header) => header.trim().toLowerCase());
  for (const name of wanted) {
    const index = lower.findIndex((header, position) => header === name && position !== dataColumn);
    if (index >= 0) return index;
  }
  return -1;
}

export type BuildBulkOptions = {
  format: BarcodeFormatId;
  columns: BulkColumnChoice;
  encode?: BarcodeEncodeOptions;
  /** Skip rows whose data repeats an earlier row. */
  skipDuplicates?: boolean;
};

/**
 * Validate and encode every row. Pure: no DOM, no timers — the UI batches the
 * returned work on its own schedule (see `renderBulkRows`).
 */
export function buildBulkRows(table: CsvTable, options: BuildBulkOptions): BulkRow[] {
  const firstSeen = new Map<string, number>();
  const rows: BulkRow[] = [];
  const maxRows = Math.min(table.rows.length, BARCODE_BULK_LIMITS.maxRows);

  for (let index = 0; index < maxRows; index += 1) {
    const row = table.rows[index];
    const line = index + 2; // header is line 1
    const rawData = (row[options.columns.data] ?? "").trim();
    const title =
      options.columns.title >= 0 ? (row[options.columns.title] ?? "").trim().slice(0, 80) : "";

    if (!rawData) {
      rows.push({
        line,
        data: "",
        status: "invalid",
        message: "This row has no barcode data — fill the selected column or delete the row.",
        title,
        canonical: "",
      });
      continue;
    }

    const result = buildBarcode(options.format, rawData, options.encode);
    if (!result.ok) {
      rows.push({
        line,
        data: rawData,
        status: "invalid",
        message: result.problems[0]?.message ?? "This row could not be encoded.",
        title,
        canonical: `${options.format}:${rawData}`,
      });
      continue;
    }

    const canonical = `${options.format}:${result.spec.value}`;
    const previous = firstSeen.get(canonical);
    if (previous !== undefined) {
      rows.push({
        line,
        data: rawData,
        status: options.skipDuplicates ? "skipped" : "duplicate",
        message: options.skipDuplicates
          ? `Skipped: same ${options.format.toUpperCase()} value as row ${previous}.`
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
  return rows.filter((row) => row.status === "ok" || row.status === "duplicate");
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
  const batchSize = Math.max(1, options.batchSize ?? BARCODE_BULK_LIMITS.batchSize);
  const results: R[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    if (options.signal?.aborted) return { results, aborted: true };
    for (let offset = index; offset < Math.min(items.length, index + batchSize); offset += 1)
      results.push(work(items[offset], offset));
    options.onProgress?.(Math.min(items.length, index + batchSize), items.length);
    // Yield: a macrotask, so layout and paint can happen between batches.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { results, aborted: false };
}
