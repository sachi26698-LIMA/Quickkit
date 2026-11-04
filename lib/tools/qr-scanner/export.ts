/**
 * Export formatting for scan results and history.
 *
 * CSV is the format that silently corrupts data when escaped carelessly, so it
 * is written by one function with one rule set:
 *
 *  · any field containing " , ; \n or " is quoted,
 *  · a quote inside a field is doubled,
 *  · a field that begins with = + - @ (or a leading tab/CR) is prefixed with a
 *    single quote, because spreadsheets treat those as formulas — a decoded QR
 *    payload is attacker-controlled text, so this is a real injection vector,
 *  · a UTF-8 BOM is prepended so Excel opens non-ASCII payloads correctly.
 *
 * JSON and TXT are produced from the same normalised rows, so the three files
 * always agree.
 */
import type { ContentTypeId } from "./content";
import type { HistoryRecord } from "./history";
import type { ScannerSettings } from "./settings";

export type ExportRow = {
  payload: string;
  type: ContentTypeId;
  typeLabel: string;
  sourceName: string;
  scannedAt: number;
  status: "decoded" | "no code found";
  count: number;
  /** Extra human detail, e.g. a parsed Wi-Fi network name. */
  summary: string;
};

export type ExportOptions = Pick<
  ScannerSettings,
  "exportTimestamps" | "exportTypes" | "exportFilenames" | "exportStatus"
>;

const FORMULA_START = /^[=+\-@\t\r]/;

/** Quote for CSV and defuse spreadsheet formulas. */
export function csvField(value: string): string {
  let text = value ?? "";
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",;\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: ExportRow[], options: ExportOptions): string {
  const headers = ["Content"];
  if (options.exportTypes) headers.push("Content type");
  if (options.exportFilenames) headers.push("Source");
  if (options.exportStatus) headers.push("Status", "Codes found");
  if (options.exportTimestamps) headers.push("Scanned at (ISO)");
  headers.push("Summary");

  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) {
    const cells = [row.payload];
    if (options.exportTypes) cells.push(row.typeLabel);
    if (options.exportFilenames) cells.push(row.sourceName);
    if (options.exportStatus) cells.push(row.status, String(row.count));
    if (options.exportTimestamps)
      cells.push(new Date(row.scannedAt).toISOString());
    cells.push(row.summary);
    lines.push(cells.map(csvField).join(","));
  }
  // BOM: Excel needs it to read UTF-8 payloads without mangling accents.
  return `\ufeff${lines.join("\r\n")}\r\n`;
}

export function toJson(rows: ExportRow[], options: ExportOptions): string {
  const data = {
    tool: "QUICKKIT QR Code Scanner",
    exportedAt: new Date().toISOString(),
    count: rows.length,
    results: rows.map((row) => ({
      content: row.payload,
      ...(options.exportTypes
        ? { contentType: row.type, typeLabel: row.typeLabel }
        : {}),
      ...(options.exportFilenames ? { source: row.sourceName } : {}),
      ...(options.exportStatus
        ? { status: row.status, codesFound: row.count }
        : {}),
      ...(options.exportTimestamps
        ? { scannedAt: new Date(row.scannedAt).toISOString() }
        : {}),
      summary: row.summary,
    })),
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function toTxt(rows: ExportRow[], options: ExportOptions): string {
  const separator = "\n" + "─".repeat(56) + "\n";
  const blocks = rows.map((row, index) => {
    const meta: string[] = [];
    if (options.exportTypes) meta.push(`Type: ${row.typeLabel}`);
    if (options.exportFilenames) meta.push(`Source: ${row.sourceName}`);
    if (options.exportStatus)
      meta.push(
        `Status: ${row.status} (${row.count} code${row.count === 1 ? "" : "s"})`,
      );
    if (options.exportTimestamps)
      meta.push(`Scanned: ${new Date(row.scannedAt).toISOString()}`);
    return [
      `#${index + 1}`,
      ...meta,
      "",
      row.payload,
      "",
      `Summary: ${row.summary}`,
    ].join("\n");
  });
  const header = `QUICKKIT QR Code Scanner — ${rows.length} result${
    rows.length === 1 ? "" : "s"
  }\nExported ${new Date().toISOString()}\n`;
  return `${header}${blocks.length ? separator + blocks.join(separator) : "\n(no results)\n"}\n`;
}

export function rowsFromHistory(records: HistoryRecord[]): ExportRow[] {
  return records.map((record) => ({
    payload: record.payload ?? "(content withheld — stored as sensitive)",
    type: record.type,
    typeLabel: record.typeLabel,
    sourceName: record.sourceName,
    scannedAt: record.at,
    status: record.status === "decoded" ? "decoded" : "no code found",
    count: record.count,
    summary: record.summary,
  }));
}

/** Filesystem-safe name for a downloaded result or image. */
export function safeFilename(name: string, fallback = "qr-scan"): string {
  const base = (name || fallback)
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[^\w\-. ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return base || fallback;
}

export function exportFilename(
  kind: "results" | "history" | "result" | "batch",
  extension: string,
  extra?: string,
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return extra
    ? `${safeFilename(extra)}-${kind}.${extension}`
    : `quickkit-qr-${kind}-${stamp}.${extension}`;
}
