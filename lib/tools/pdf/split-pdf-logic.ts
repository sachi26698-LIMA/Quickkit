import {
  PDF_MERGE_LIMITS,
  PdfMergeError,
  parsePageRange,
  sanitizeOutputFilename,
  sanitizePdfTitle,
  serializePageSelection,
} from "./merge-pdf-logic";

/**
 * Browser-safety bounds for the local Splitter. The page/output caps are kept
 * separate from the Merger queue rules so a future tool-specific change cannot
 * silently alter the approved Merger limits.
 */
export const PDF_SPLIT_LIMITS = {
  maxGeneratedPdfBytes: 128 * 1024 * 1024,
  maxOutputFiles: 100,
  maxOutputPages: PDF_MERGE_LIMITS.maxOutputPages,
  maxSourceBytes: PDF_MERGE_LIMITS.maxFileBytes,
  maxSourcePages: PDF_MERGE_LIMITS.maxPagesPerFile,
} as const;

export type PdfSplitMode = "every" | "extract" | "perPage" | "ranges";
export type PdfExtractStyle = "combined" | "separate";
export type PdfSplitNamingStyle = "both" | "pages" | "part";

export interface PdfSplitOutputPlan extends PdfSplitSegmentPlan {
  filename: string;
  title: string;
}

export interface PdfSplitPlan {
  outputs: PdfSplitOutputPlan[];
  totalOutputPages: number;
  warnings: string[];
}

export interface PdfSplitPlanInput {
  baseName: string;
  everyN?: number;
  extractStyle?: PdfExtractStyle;
  mode: PdfSplitMode;
  namingStyle: PdfSplitNamingStyle;
  pageCount: number;
  rangeText?: string;
  selectedPageIndices?: number[];
}

export interface PdfSplitSegmentPlan {
  id: string;
  index: number;
  pageIndices: number[];
  pagesLabel: string;
}

export interface ZipEntryInput {
  bytes: Uint8Array;
  date?: Date;
  name: string;
}

function assertPageCount(pageCount: number): void {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new PdfMergeError(
      "invalid_selection",
      "This PDF has no readable pages to split. Choose a working PDF.",
    );
  }
  if (pageCount > PDF_SPLIT_LIMITS.maxSourcePages) {
    throw new PdfMergeError(
      "too_many_pages",
      `This PDF has ${pageCount.toLocaleString()} pages, above the ${PDF_SPLIT_LIMITS.maxSourcePages.toLocaleString()}-page local-processing limit. Split or export a smaller copy in a PDF editor first.`,
    );
  }
}

function allIndices(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, index) => index);
}

function rangeLabel(pageIndices: number[], pageCount: number): string {
  const serialized = serializePageSelection(pageIndices, pageCount);
  return serialized === "all" ? `1-${pageCount}` : serialized;
}

function assertOutputBounds(segments: PdfSplitSegmentPlan[]): void {
  if (segments.length === 0) {
    throw new PdfMergeError(
      "invalid_selection",
      "Choose at least one page or range before splitting.",
    );
  }
  if (segments.length > PDF_SPLIT_LIMITS.maxOutputFiles) {
    throw new PdfMergeError(
      "too_many_files",
      `This plan would create ${segments.length.toLocaleString()} PDFs. The local Splitter creates up to ${PDF_SPLIT_LIMITS.maxOutputFiles} PDFs at a time; use larger ranges or a larger “every N pages” value.`,
    );
  }
  const totalPages = segments.reduce(
    (total, segment) => total + segment.pageIndices.length,
    0,
  );
  if (totalPages > PDF_SPLIT_LIMITS.maxOutputPages) {
    throw new PdfMergeError(
      "too_many_pages",
      `This plan would write ${totalPages.toLocaleString()} output pages because overlapping ranges repeat pages. Reduce the ranges so the outputs total no more than ${PDF_SPLIT_LIMITS.maxOutputPages.toLocaleString()} pages.`,
    );
  }
}

function makeSegments(
  pageGroups: number[][],
  pageCount: number,
): PdfSplitSegmentPlan[] {
  const segments = pageGroups.map((pageIndices, index) => ({
    id: `segment-${index + 1}`,
    index,
    pageIndices,
    pagesLabel: rangeLabel(pageIndices, pageCount),
  }));
  assertOutputBounds(segments);
  return segments;
}

/**
 * Splits semicolon/newline-separated output groups. Each group uses the same
 * reviewed explicit range grammar as the Merger; duplicates inside one group
 * remain errors, while overlaps between groups are surfaced as warnings by
 * buildPdfSplitPlan rather than being silently changed.
 */
export function parseRangeGroups(input: string, pageCount: number): number[][] {
  assertPageCount(pageCount);
  const groups = input
    .split(/[;\n]/)
    .map((group) => group.trim())
    .filter(Boolean);
  if (groups.length === 0) {
    throw new PdfMergeError(
      "invalid_page_range",
      "Enter at least one output range. Use a semicolon between outputs, for example 1-3; 4-6; 7.",
    );
  }
  if (groups.length > PDF_SPLIT_LIMITS.maxOutputFiles) {
    throw new PdfMergeError(
      "too_many_files",
      `You entered ${groups.length.toLocaleString()} output ranges. Create no more than ${PDF_SPLIT_LIMITS.maxOutputFiles} PDFs in one run.`,
    );
  }
  return groups.map((group, index) => {
    try {
      return parsePageRange(group, pageCount);
    } catch (error) {
      if (error instanceof PdfMergeError) {
        throw new PdfMergeError(
          error.code,
          `Output ${index + 1}: ${error.message}`,
        );
      }
      throw error;
    }
  });
}

export function filenameBase(input: string, fallback = "split-pdf"): string {
  return sanitizeOutputFilename(input, fallback).replace(/\.pdf$/i, "");
}

function partSuffix(index: number, total: number): string {
  const width = Math.max(2, String(total).length);
  return `part-${String(index + 1).padStart(width, "0")}`;
}

function pagesSuffix(pageIndices: number[]): string {
  if (pageIndices.length === 1) return `page-${pageIndices[0] + 1}`;
  const first = pageIndices[0] + 1;
  const last = pageIndices[pageIndices.length - 1] + 1;
  const contiguous = pageIndices.every(
    (page, index) => page === pageIndices[0] + index,
  );
  return contiguous
    ? `pages-${first}-${last}`
    : `pages-${pageIndices.map((page) => page + 1).join("-")}`;
}

export function buildSplitOutputFilename(
  baseName: string,
  segment: PdfSplitSegmentPlan,
  totalOutputs: number,
  namingStyle: PdfSplitNamingStyle,
): string {
  const base = filenameBase(baseName);
  const suffixes: string[] = [];
  if (namingStyle === "part" || namingStyle === "both") {
    suffixes.push(partSuffix(segment.index, totalOutputs));
  }
  if (namingStyle === "pages" || namingStyle === "both") {
    suffixes.push(pagesSuffix(segment.pageIndices));
  }
  return sanitizeOutputFilename(`${base}-${suffixes.join("-")}`, "split-pdf");
}

export function buildZipFilename(
  input: string,
  fallback = "split-pdfs",
): string {
  const base = sanitizeOutputFilename(input, fallback)
    .replace(/\.pdf$/i, "")
    .replace(/\.zip$/i, "");
  return `${base}.zip`;
}

function assignUniqueFilenames(outputs: PdfSplitOutputPlan[]): void {
  const seen = new Map<string, number>();
  for (const output of outputs) {
    const key = output.filename.toLocaleLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) {
      output.filename = sanitizeOutputFilename(
        `${output.filename.replace(/\.pdf$/i, "")} (${count})`,
        "split-pdf",
      );
    }
  }
}

function selectedIndices(input: PdfSplitPlanInput): number[] {
  const selected = [...new Set(input.selectedPageIndices ?? [])].sort(
    (a, b) => a - b,
  );
  if (selected.length === 0) {
    throw new PdfMergeError(
      "invalid_page_range",
      "Select at least one page to extract. Tap page previews or enter pages such as 1-3, 5.",
    );
  }
  for (const pageIndex of selected) {
    if (
      !Number.isInteger(pageIndex) ||
      pageIndex < 0 ||
      pageIndex >= input.pageCount
    ) {
      throw new PdfMergeError(
        "invalid_page_range",
        `Page ${pageIndex + 1} is outside this PDF’s 1–${input.pageCount} page range.`,
      );
    }
  }
  return selected;
}

export function buildPdfSplitPlan(input: PdfSplitPlanInput): PdfSplitPlan {
  assertPageCount(input.pageCount);
  let pageGroups: number[][];

  switch (input.mode) {
    case "ranges":
      pageGroups = parseRangeGroups(input.rangeText ?? "", input.pageCount);
      break;
    case "extract": {
      const selected = selectedIndices(input);
      pageGroups =
        input.extractStyle === "separate"
          ? selected.map((pageIndex) => [pageIndex])
          : [selected];
      break;
    }
    case "every": {
      const everyN = input.everyN;
      if (!Number.isInteger(everyN) || !everyN || everyN < 1) {
        throw new PdfMergeError(
          "invalid_page_range",
          "Enter a whole number of pages per PDF, for example 5.",
        );
      }
      if (everyN > input.pageCount) {
        throw new PdfMergeError(
          "invalid_page_range",
          `Pages per PDF cannot be more than this PDF’s ${input.pageCount} pages. Enter ${input.pageCount} or fewer.`,
        );
      }
      pageGroups = [];
      for (let start = 0; start < input.pageCount; start += everyN) {
        pageGroups.push(
          Array.from(
            { length: Math.min(everyN, input.pageCount - start) },
            (_, offset) => start + offset,
          ),
        );
      }
      break;
    }
    case "perPage":
      pageGroups = allIndices(input.pageCount).map((pageIndex) => [pageIndex]);
      break;
    default:
      throw new PdfMergeError(
        "invalid_selection",
        "Choose a splitting method before continuing.",
      );
  }

  const segments = makeSegments(pageGroups, input.pageCount);
  const outputs = segments.map<PdfSplitOutputPlan>((segment) => {
    const titleBase = sanitizePdfTitle(
      filenameBase(input.baseName).replace(/[-_]+/g, " "),
      "Split PDF",
    );
    return {
      ...segment,
      filename: buildSplitOutputFilename(
        input.baseName,
        segment,
        segments.length,
        input.namingStyle,
      ),
      title: sanitizePdfTitle(
        `${titleBase} — pages ${segment.pagesLabel}`,
        "Split PDF",
      ),
    };
  });
  assignUniqueFilenames(outputs);

  const counts = new Map<number, number>();
  for (const segment of segments) {
    for (const pageIndex of segment.pageIndices) {
      counts.set(pageIndex, (counts.get(pageIndex) ?? 0) + 1);
    }
  }
  const repeated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([pageIndex]) => pageIndex);
  const omitted = allIndices(input.pageCount).filter(
    (pageIndex) => !counts.has(pageIndex),
  );
  const warnings: string[] = [];
  if (repeated.length > 0) {
    warnings.push(
      `Pages ${rangeLabel(repeated, input.pageCount)} appear in more than one output because the ranges overlap. They will be copied into each listed PDF—nothing is removed silently.`,
    );
  }
  if (omitted.length > 0) {
    warnings.push(
      `Pages ${rangeLabel(omitted, input.pageCount)} are not included in any output in this plan.`,
    );
  }

  return {
    outputs,
    totalOutputPages: outputs.reduce(
      (total, output) => total + output.pageIndices.length,
      0,
    ),
    warnings,
  };
}

export function outputsForPage(
  outputs: readonly PdfSplitOutputPlan[],
  pageIndex: number,
): PdfSplitOutputPlan[] {
  return outputs.filter((output) => output.pageIndices.includes(pageIndex));
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  return { dosDate, dosTime };
}

/**
 * Creates a deterministic stored (uncompressed) ZIP entirely in memory.
 * PDF streams are already compressed inside the PDF files; avoiding another
 * compression library keeps this local packaging path small and auditable.
 */
export function createStoredZip(entries: ZipEntryInput[]): Uint8Array {
  if (entries.length === 0) {
    throw new PdfMergeError(
      "invalid_selection",
      "There are no split PDFs to package into a ZIP.",
    );
  }
  if (entries.length > 0xffff) {
    throw new PdfMergeError(
      "too_many_files",
      "There are too many split PDFs to package into one ZIP.",
    );
  }

  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const prepared = entries.map((entry) => {
    const name = entry.name.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!name || name.includes("../") || name.includes("..\\")) {
      throw new PdfMergeError(
        "output_validation_failed",
        "A split PDF filename could not be packaged safely. Rename the outputs and try again.",
      );
    }
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) {
      throw new PdfMergeError(
        "output_validation_failed",
        `Two outputs are named “${name}”, so they cannot be placed in one ZIP. Change the output naming and try again.`,
      );
    }
    seen.add(key);
    if (entry.bytes.byteLength > 0xffffffff) {
      throw new PdfMergeError(
        "total_too_large",
        "A split PDF is too large for the local ZIP package. Download the PDFs separately instead.",
      );
    }
    const nameBytes = encoder.encode(name);
    if (nameBytes.byteLength > 0xffff) {
      throw new PdfMergeError(
        "output_validation_failed",
        "A split PDF filename is too long for a ZIP package. Shorten the output name and try again.",
      );
    }
    const { dosDate, dosTime } = dosDateTime(entry.date ?? new Date());
    return {
      bytes: entry.bytes,
      crc: crc32(entry.bytes),
      dosDate,
      dosTime,
      nameBytes,
    };
  });

  const localHeaderBytes = prepared.reduce(
    (total, entry) => total + 30 + entry.nameBytes.byteLength,
    0,
  );
  const dataBytes = prepared.reduce(
    (total, entry) => total + entry.bytes.byteLength,
    0,
  );
  const centralBytes = prepared.reduce(
    (total, entry) => total + 46 + entry.nameBytes.byteLength,
    0,
  );
  const totalBytes = localHeaderBytes + dataBytes + centralBytes + 22;
  if (!Number.isSafeInteger(totalBytes) || totalBytes > 0xffffffff) {
    throw new PdfMergeError(
      "total_too_large",
      "The split PDFs are too large for one local ZIP package. Split the work into smaller batches.",
    );
  }

  const output = new Uint8Array(totalBytes);
  const view = new DataView(
    output.buffer,
    output.byteOffset,
    output.byteLength,
  );
  let offset = 0;
  const localOffsets: number[] = [];

  for (const entry of prepared) {
    localOffsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0x0800, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, entry.dosTime, true);
    view.setUint16(offset + 12, entry.dosDate, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.bytes.byteLength, true);
    view.setUint32(offset + 22, entry.bytes.byteLength, true);
    view.setUint16(offset + 26, entry.nameBytes.byteLength, true);
    view.setUint16(offset + 28, 0, true);
    offset += 30;
    output.set(entry.nameBytes, offset);
    offset += entry.nameBytes.byteLength;
    output.set(entry.bytes, offset);
    offset += entry.bytes.byteLength;
  }

  const centralStart = offset;
  prepared.forEach((entry, index) => {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, entry.dosTime, true);
    view.setUint16(offset + 14, entry.dosDate, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.bytes.byteLength, true);
    view.setUint32(offset + 24, entry.bytes.byteLength, true);
    view.setUint16(offset + 28, entry.nameBytes.byteLength, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, localOffsets[index], true);
    offset += 46;
    output.set(entry.nameBytes, offset);
    offset += entry.nameBytes.byteLength;
  });

  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, prepared.length, true);
  view.setUint16(offset + 10, prepared.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true);
  return output;
}
