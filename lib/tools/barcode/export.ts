/**
 * File naming and blob plumbing for the barcode studio.
 *
 * Deliberately free of `pdf-lib` and of any canvas access, so the bulk panel
 * can name a hundred files without pulling the PDF or raster bundle into the
 * page. The heavy builders are imported dynamically by the components that
 * need them.
 */
import { csvDocument } from "@/lib/tools/csv";
import { safeFilenamePart } from "@/lib/tools/filename";
import type { BarcodeFormatId } from "./types";
import {
  buildLayout,
  type BarcodeLayout,
  type BarcodeRenderOptions,
} from "./layout";
import { layoutToSvg } from "./svg";
import type { BarcodeSpec } from "./types";

export type BarcodeExtension = "png" | "jpeg" | "svg" | "pdf" | "zip" | "csv";

export function barcodeFilename(options: {
  format: BarcodeFormatId;
  value: string;
  ext: BarcodeExtension;
  suffix?: string;
  index?: number;
}) {
  const parts = [
    "quickkit-barcode",
    safeFilenamePart(options.format, 12),
    safeFilenamePart(options.value || "label", 40),
    options.index !== undefined ? String(options.index).padStart(3, "0") : "",
    options.suffix ? safeFilenamePart(options.suffix, 16) : "",
  ].filter(Boolean);
  return `${parts.join("-")}.${options.ext}`;
}

/** Unique, filesystem-safe names for a bulk ZIP, even with repeated data. */
export function bulkEntryNames(
  items: { format: BarcodeFormatId; value: string }[],
  ext: "png" | "svg",
) {
  const used = new Map<string, number>();
  return items.map((item, index) => {
    const base = `${String(index + 1).padStart(4, "0")}-${safeFilenamePart(item.value || "label", 36)}`;
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return count === 1 ? `${base}.${ext}` : `${base}-${count}.${ext}`;
  });
}

export function svgFor(
  spec: BarcodeSpec,
  options: Partial<BarcodeRenderOptions>,
  title?: string,
) {
  const layout = buildLayout({ spec, options });
  return layoutToSvg(layout, {
    title: title ?? `${spec.format.toUpperCase()} ${spec.display}`,
    description: `Barcode encoding ${spec.display}`,
  });
}

export function svgBlob(svg: string) {
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

export function pngBlob(bytes: Uint8Array) {
  return new Blob([bytes as unknown as BlobPart], { type: "image/png" });
}

export function textBlob(text: string, mime = "text/csv;charset=utf-8") {
  return new Blob([text], { type: mime });
}

export type BulkReportRow = {
  line: number;
  status: "ok" | "invalid" | "duplicate" | "skipped";
  value: string;
  message: string;
};

/** The CSV a user gets back: what succeeded, what did not, and why. */
export function bulkReportCsv(rows: BulkReportRow[]) {
  const header = ["row", "status", "value", "message"];
  return csvDocument([
    header,
    ...rows.map((row) => [row.line, row.status, row.value, row.message]),
  ]);
}

/** Summary line used in the UI and in the report file name. */
export function bulkSummary(rows: BulkReportRow[]) {
  const total = rows.length;
  const ok = rows.filter((row) => row.status === "ok").length;
  const duplicate = rows.filter((row) => row.status === "duplicate").length;
  const invalid = rows.filter((row) => row.status === "invalid").length;
  const skipped = rows.filter((row) => row.status === "skipped").length;
  return {
    total,
    ok,
    duplicate,
    invalid,
    skipped,
    failed: duplicate + invalid + skipped,
  };
}

/** A layout at export density, used by the PNG path in the browser. */
export function exportLayout(
  spec: BarcodeSpec,
  options: Partial<BarcodeRenderOptions>,
  scale: number,
): BarcodeLayout {
  return buildLayout({ spec, options, scale });
}
