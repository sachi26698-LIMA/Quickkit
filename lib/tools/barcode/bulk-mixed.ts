/**
 * Mixed-symbology bulk generation.
 *
 * A label sheet is not necessarily one symbology: a carton line usually carries
 * an ITF-14 on the case and a QR on the accompanying paperwork. This module
 * builds every row with its own format, validates each row independently, and
 * groups the export by symbology — because a mixed sheet cannot be combined into
 * one print run without per-row layout decisions, so the archive keeps the
 * formats in separate folders instead of pretending they are one job.
 *
 * Linear rows go through the studio's own encoder; 2D rows go through bwip-js
 * via `twod.ts`. Both are pure here (SVG strings), so the UI can render and ZIP
 * them without touching the network.
 */
import type { CsvTable } from "@/lib/tools/qr/bulk";
import { buildBarcode } from "./encode";
import { resolveBulkFormat } from "./bulk";
import { buildTwoD, type TwoDFormatId } from "./twod";
import type { BarcodeFormatId, BarcodeSpec } from "./types";

export type MixedFormat = BarcodeFormatId | TwoDFormatId;

export const TWO_D_TOKEN_ALIASES: Record<string, TwoDFormatId> = {
  qr: "qrcode",
  qrcode: "qrcode",
  qrcodegs1: "gs1qrcode",
  gs1qr: "gs1qrcode",
  gs1qrcode: "gs1qrcode",
  gs1: "gs1qrcode",
  dm: "datamatrix",
  datamatrix: "datamatrix",
  pdf417: "pdf417",
};

export type MixedRow = {
  /** 1-based data row number (the header is line 1 in the file). */
  line: number;
  data: string;
  title: string;
  /** Resolved symbology, or null when the format cell named nothing known. */
  format: MixedFormat | null;
  /** The token that was read, so an error can quote the user's own cell. */
  requested: string;
  kind: "linear" | "2d";
  status: "ok" | "duplicate" | "invalid" | "skipped";
  message: string;
  /** Linear symbol, for SVG/PNG export. */
  spec?: BarcodeSpec;
  /** 2D symbol, already rendered. */
  svg?: string;
  width?: number;
  height?: number;
  canonical: string;
  duplicateOf?: number;
};

/** Resolve a cell (or a fallback string) to a symbology this tool can build. */
export function resolveMixedFormat(token: string): MixedFormat | null {
  const normalised = token
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!normalised) return null;
  const twoD = TWO_D_TOKEN_ALIASES[normalised];
  if (twoD) return twoD;
  return resolveBulkFormat(token);
}

export function isTwoDFormat(format: MixedFormat): format is TwoDFormatId {
  return (
    format === "qrcode" ||
    format === "gs1qrcode" ||
    format === "datamatrix" ||
    format === "pdf417"
  );
}

export type MixedBuildOptions = {
  /** Column holding the barcode payload. */
  data: number;
  /** Column holding an optional human label, or -1. */
  title: number;
  /** Column holding the per-row format, or -1 for one format for the sheet. */
  formatColumn: number;
  /** Format used when the cell is blank, and the only format when there is no column. */
  fallback: MixedFormat;
  maxRows?: number;
  /** 2D module scale; linear rows use their own render options. */
  scale?: number;
  padding?: number;
};

export function buildMixedRows(
  table: CsvTable,
  options: MixedBuildOptions,
): MixedRow[] {
  const maxRows = Math.min(table.rows.length, options.maxRows ?? 1000);
  const firstSeen = new Map<string, number>();
  const rows: MixedRow[] = [];

  for (let index = 0; index < maxRows; index += 1) {
    const source = table.rows[index];
    const line = index + 2;
    const data = (source[options.data] ?? "").trim();
    const title =
      options.title >= 0
        ? (source[options.title] ?? "").trim().slice(0, 80)
        : "";
    const token =
      options.formatColumn >= 0
        ? (source[options.formatColumn] ?? "").trim()
        : "";
    const requested = token || options.fallback;

    const format = token ? resolveMixedFormat(token) : options.fallback;

    if (!format) {
      rows.push({
        line,
        data,
        title,
        format: null,
        requested: token,
        kind: "linear",
        status: "invalid",
        message: `"${token.slice(0, 24)}" is not a symbology this tool encodes. Use one of the ids shown in the format list, e.g. ean13, code128, qrcode or datamatrix.`,
        canonical: "",
      });
      continue;
    }

    if (!data) {
      rows.push({
        line,
        data: "",
        title,
        format,
        requested,
        kind: isTwoDFormat(format) ? "2d" : "linear",
        status: "invalid",
        message:
          "This row has no barcode data — fill the selected column or delete the row.",
        canonical: "",
      });
      continue;
    }

    if (isTwoDFormat(format)) {
      const built = buildTwoD(format, data, {
        scale: options.scale ?? 4,
        padding: options.padding ?? 4,
      });
      if (!built.ok) {
        rows.push({
          line,
          data,
          title,
          format,
          requested,
          kind: "2d",
          status: "invalid",
          message:
            built.problems[0]?.message ??
            "This row could not be encoded as a 2D symbol.",
          canonical: `${format}:${data}`,
        });
        continue;
      }
      const canonical = `${format}:${data}`;
      const previous = firstSeen.get(canonical);
      if (previous !== undefined) {
        rows.push({
          line,
          data,
          title,
          format,
          requested,
          kind: "2d",
          status: "duplicate",
          message: `Duplicate of row ${previous} — kept, because labels are often printed twice on purpose.`,
          svg: built.svg,
          width: built.width,
          height: built.height,
          canonical,
          duplicateOf: previous,
        });
        continue;
      }
      firstSeen.set(canonical, line);
      rows.push({
        line,
        data,
        title,
        format,
        requested,
        kind: "2d",
        status: "ok",
        message: `${built.format.toUpperCase()} at ${Math.round(built.width)} × ${Math.round(built.height)} px.`,
        svg: built.svg,
        width: built.width,
        height: built.height,
        canonical,
      });
      continue;
    }

    const built = buildBarcode(format, data);
    if (!built.ok) {
      rows.push({
        line,
        data,
        title,
        format,
        requested,
        kind: "linear",
        status: "invalid",
        message: built.problems[0]?.message ?? "This row could not be encoded.",
        canonical: `${format}:${data}`,
      });
      continue;
    }
    const canonical = `${format}:${built.spec.value}`;
    const previous = firstSeen.get(canonical);
    if (previous !== undefined) {
      rows.push({
        line,
        data,
        title,
        format,
        requested,
        kind: "linear",
        status: "duplicate",
        message: `Duplicate of row ${previous} — kept, because labels are often printed twice on purpose.`,
        spec: built.spec,
        canonical,
        duplicateOf: previous,
      });
      continue;
    }
    firstSeen.set(canonical, line);
    rows.push({
      line,
      data,
      title,
      format,
      requested,
      kind: "linear",
      status: "ok",
      message: built.spec.notes[0] ?? "Encoded and ready.",
      spec: built.spec,
      canonical,
    });
  }

  return rows;
}

export function exportableMixedRows(rows: MixedRow[]) {
  return rows.filter(
    (row) => row.status === "ok" || row.status === "duplicate",
  );
}

/** Exportable rows grouped by symbology, in the order each format first appears. */
export function mixedFormatGroups(rows: MixedRow[]) {
  const groups = new Map<MixedFormat, MixedRow[]>();
  for (const row of exportableMixedRows(rows)) {
    if (!row.format) continue;
    const list = groups.get(row.format) ?? [];
    list.push(row);
    groups.set(row.format, list);
  }
  return [...groups.entries()].map(([format, list]) => ({
    format,
    rows: list,
  }));
}

export function mixedCounts(rows: MixedRow[]) {
  return {
    total: rows.length,
    ok: rows.filter((row) => row.status === "ok").length,
    duplicate: rows.filter((row) => row.status === "duplicate").length,
    skipped: rows.filter((row) => row.status === "skipped").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
    formats: new Set(rows.filter((row) => row.format).map((row) => row.format))
      .size,
  };
}
