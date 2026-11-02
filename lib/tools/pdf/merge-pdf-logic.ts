export const PDF_MERGE_LIMITS = {
  maxFiles: 25,
  maxFileBytes: 50 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  maxPagesPerFile: 1000,
  maxOutputPages: 1000,
} as const;

export type PdfMergeIssueCode =
  | "cancelled"
  | "corrupt_or_unsupported"
  | "duplicate_page_selection"
  | "encrypted_unsupported"
  | "file_too_large"
  | "invalid_page_range"
  | "invalid_pdf"
  | "invalid_selection"
  | "output_validation_failed"
  | "password_invalid"
  | "password_required"
  | "signed_pdf"
  | "too_many_files"
  | "too_many_pages"
  | "total_too_large"
  | "unsupported_form"
  | "unsupported_pdf_structure"
  | "unsupported_xfa"
  | "worker_failed";

export class PdfMergeError extends Error {
  readonly code: PdfMergeIssueCode;
  readonly entryId?: string;

  constructor(code: PdfMergeIssueCode, message: string, entryId?: string) {
    super(message);
    this.name = "PdfMergeError";
    this.code = code;
    this.entryId = entryId;
  }
}

export interface PdfFileCandidate {
  name: string;
  size: number;
  type?: string;
}

export interface PdfInspectionFeatures {
  hasAttachments: boolean;
  hasForm: boolean;
  hasJavaScript: boolean;
  hasLayers: boolean;
  hasOutlines: boolean;
  hasSignatureField: boolean;
  hasSignedSignature: boolean;
  hasTags: boolean;
  hasXFA: boolean;
}

export interface PdfInspection {
  encrypted: boolean;
  features: PdfInspectionFeatures;
  firstPage: {
    height: number;
    rotation: number;
    width: number;
  };
  pageCount: number;
  title?: string;
  warnings: string[];
}

export interface PdfMergeEntrySelection {
  entryId: string;
  name: string;
  pageIndices: number[];
  totalPages: number;
}

export interface PdfMergeOutputSegment extends PdfMergeEntrySelection {
  outputEnd: number;
  outputStart: number;
}

export function formatMiB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const value = bytes / 1024;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} KiB`;
  }
  const value = bytes / (1024 * 1024);
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} MiB`;
}

export function isPdfSignature(bytes: Uint8Array): boolean {
  const prefixLength = Math.min(bytes.byteLength, 1024);
  const header = "%PDF-";
  for (let offset = 0; offset <= prefixLength - header.length; offset += 1) {
    let matches = true;
    for (let index = 0; index < header.length; index += 1) {
      if (bytes[offset + index] !== header.charCodeAt(index)) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

export function validatePdfFileCandidate(
  file: PdfFileCandidate,
  currentFileCount: number,
  currentTotalBytes: number,
): PdfMergeError | null {
  if (currentFileCount >= PDF_MERGE_LIMITS.maxFiles) {
    return new PdfMergeError(
      "too_many_files",
      `You can merge up to ${PDF_MERGE_LIMITS.maxFiles} PDFs at once. Remove a file or split this into smaller batches.`,
    );
  }

  const hasPdfExtension = /\.pdf$/i.test(file.name.trim());
  const hasPdfType =
    !file.type || file.type.toLowerCase() === "application/pdf";
  if (!hasPdfExtension || !hasPdfType) {
    return new PdfMergeError(
      "invalid_pdf",
      `“${file.name}” is not a PDF. Choose a file ending in .pdf; images and documents are not converted by this tool.`,
    );
  }

  if (file.size === 0) {
    return new PdfMergeError(
      "invalid_pdf",
      `“${file.name}” is empty. Choose a complete PDF exported from your document app.`,
    );
  }

  if (file.size > PDF_MERGE_LIMITS.maxFileBytes) {
    return new PdfMergeError(
      "file_too_large",
      `“${file.name}” is ${formatMiB(file.size)}, above the ${formatMiB(PDF_MERGE_LIMITS.maxFileBytes)} per-file limit. Split or compress it in a PDF editor, then add it again.`,
    );
  }

  if (currentTotalBytes + file.size > PDF_MERGE_LIMITS.maxTotalBytes) {
    return new PdfMergeError(
      "total_too_large",
      `Adding “${file.name}” would take the queue to ${formatMiB(currentTotalBytes + file.size)}, above the ${formatMiB(PDF_MERGE_LIMITS.maxTotalBytes)} total limit. Remove a file or merge in smaller batches.`,
    );
  }

  return null;
}

function assertPageWithinRange(page: number, pageCount: number): void {
  if (page < 1 || page > pageCount) {
    throw new PdfMergeError(
      "invalid_page_range",
      `Page ${page} is outside this PDF’s 1–${pageCount} page range. Choose a page from 1 to ${pageCount}.`,
    );
  }
}

/**
 * Parses an explicit, 1-based page selection. Every selected page is returned
 * once and in document order. Duplicates are errors rather than being removed
 * silently, so the user can see exactly what needs correcting.
 */
export function parsePageRange(input: string, pageCount: number): number[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new PdfMergeError(
      "invalid_selection",
      "This PDF has no readable pages to select. Remove it and add a working PDF.",
    );
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new PdfMergeError(
      "invalid_page_range",
      "Enter pages to include, for example 1-3, 5 — or use All pages.",
    );
  }

  if (/^all$/i.test(trimmed)) {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const selected = new Set<number>();
  const addPage = (page: number) => {
    assertPageWithinRange(page, pageCount);
    if (selected.has(page)) {
      throw new PdfMergeError(
        "duplicate_page_selection",
        `Page ${page} is selected more than once. Remove the duplicate so every included page is explicit.`,
      );
    }
    selected.add(page);
  };

  for (const rawToken of trimmed.split(",")) {
    const token = rawToken.trim();
    if (!token) {
      throw new PdfMergeError(
        "invalid_page_range",
        "There is an empty item in the page selection. Remove the extra comma and try again.",
      );
    }

    if (/^all$/i.test(token)) {
      throw new PdfMergeError(
        "invalid_page_range",
        "Use “all” by itself, or list specific pages such as 1-3, 5.",
      );
    }

    const single = /^(\d+)$/.exec(token);
    if (single) {
      addPage(Number.parseInt(single[1], 10));
      continue;
    }

    const range = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(token);
    if (range) {
      const start = Number.parseInt(range[1], 10);
      const end = Number.parseInt(range[2], 10);
      assertPageWithinRange(start, pageCount);
      assertPageWithinRange(end, pageCount);
      if (start > end) {
        throw new PdfMergeError(
          "invalid_page_range",
          `Range ${start}-${end} is reversed. Write the lower page first, for example ${end}-${start}.`,
        );
      }
      for (let page = start; page <= end; page += 1) addPage(page);
      continue;
    }

    if (/^\d+\s*[-–—]\s*$/.test(token)) {
      throw new PdfMergeError(
        "invalid_page_range",
        `Range “${token}” is incomplete. Add an ending page, for example ${token.replace(/[-–—]\s*$/, "")}-${pageCount}.`,
      );
    }

    if (/^\s*[-–—]\s*\d+$/.test(token)) {
      throw new PdfMergeError(
        "invalid_page_range",
        `Range “${token}” needs a starting page. Write it like 1-${pageCount}.`,
      );
    }

    throw new PdfMergeError(
      "invalid_page_range",
      `“${token}” is not a valid page or range. Use pages like 1-3, 5.`,
    );
  }

  if (selected.size === 0) {
    throw new PdfMergeError(
      "invalid_page_range",
      "Select at least one page, or remove this PDF from the queue.",
    );
  }

  return [...selected].sort((a, b) => a - b).map((page) => page - 1);
}

export function serializePageSelection(
  pageIndices: number[],
  pageCount: number,
): string {
  const pages = [...new Set(pageIndices)]
    .filter((page) => Number.isInteger(page) && page >= 0 && page < pageCount)
    .sort((a, b) => a - b)
    .map((page) => page + 1);

  if (pages.length === 0) return "";
  if (pages.length === pageCount) return "all";

  const parts: string[] = [];
  let start = pages[0];
  let previous = pages[0];
  for (const page of pages.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    parts.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = page;
    previous = page;
  }
  parts.push(start === previous ? `${start}` : `${start}-${previous}`);
  return parts.join(", ");
}

export function formatPageSelectionSummary(
  pageIndices: number[],
  pageCount: number,
): string {
  if (pageIndices.length === 0) return "No pages selected";
  if (pageIndices.length === pageCount) return `All ${pageCount} pages`;
  return `${pageIndices.length} of ${pageCount} pages · ${serializePageSelection(pageIndices, pageCount)}`;
}

export function buildMergeSummary(entries: PdfMergeEntrySelection[]): {
  segments: PdfMergeOutputSegment[];
  totalPages: number;
} {
  const segments: PdfMergeOutputSegment[] = [];
  let cursor = 1;
  for (const entry of entries) {
    const indices = [...entry.pageIndices].sort((a, b) => a - b);
    if (indices.length === 0) continue;
    const outputStart = cursor;
    const outputEnd = cursor + indices.length - 1;
    segments.push({ ...entry, pageIndices: indices, outputStart, outputEnd });
    cursor = outputEnd + 1;
  }
  return { segments, totalPages: cursor - 1 };
}

export function moveItem<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function sortEntriesByName<T extends { name: string }>(
  entries: T[],
): T[] {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (a, b) =>
        collator.compare(a.entry.name, b.entry.name) || a.index - b.index,
    )
    .map(({ entry }) => entry);
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function sanitizePdfTitle(
  input: string,
  fallback = "Merged PDF",
): string {
  const cleaned = input.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  const value = cleaned || fallback;
  return [...value].slice(0, 120).join("");
}

export function sanitizeOutputFilename(
  input: string,
  fallback = "merged",
): string {
  const withoutExtension = input.trim().replace(/\.pdf$/i, "");
  const cleaned = withoutExtension
    .replace(CONTROL_CHARS, " ")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "");
  const base =
    [...(cleaned || fallback)].slice(0, 80).join("").trim() || fallback;
  return `${base}.pdf`;
}

export function bookmarkTitleFromFilename(
  filename: string,
  fallback: string,
): string {
  const cleaned = filename
    .replace(/\.pdf$/i, "")
    .replace(CONTROL_CHARS, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [...(cleaned || fallback)].slice(0, 80).join("");
}

export function makeUniqueBookmarkTitles(filenames: string[]): string[] {
  const counts = new Map<string, number>();
  return filenames.map((filename, index) => {
    const base = bookmarkTitleFromFilename(filename, `Document ${index + 1}`);
    const count = (counts.get(base.toLocaleLowerCase()) ?? 0) + 1;
    counts.set(base.toLocaleLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

export async function hashPdfBytes(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      bytes as BufferSource,
    );
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback for older test environments. This is only a duplicate-content
  // hint; the authoritative path above is SHA-256 in supported browsers.
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${bytes.byteLength}-${hash.toString(16).padStart(8, "0")}`;
}

export function getInspectionWarnings(
  features: PdfInspectionFeatures,
): string[] {
  const warnings: string[] = [];
  if (features.hasXFA) {
    warnings.push(
      "Dynamic XFA forms are not supported. Print or export this file to a standard PDF, then add that copy.",
    );
  }
  if (features.hasSignedSignature) {
    warnings.push(
      "This PDF appears to be digitally signed. Merging is blocked so a signature is not silently invalidated.",
    );
  } else if (features.hasSignatureField) {
    warnings.push(
      "Signature fields cannot remain interactive; their visible appearance will be flattened if supported.",
    );
  }
  if (features.hasForm) {
    warnings.push(
      "Form fields will be flattened to static page content where safely supported; they will not stay editable.",
    );
  }
  if (features.hasOutlines) {
    warnings.push(
      "Original bookmarks are not carried over. You can add one new bookmark per source file below.",
    );
  }
  if (features.hasAttachments) {
    warnings.push(
      "Embedded file attachments are not carried into the merged PDF. Keep the original if you need them.",
    );
  }
  if (features.hasLayers) {
    warnings.push(
      "Layer controls are not preserved; pages keep their default visible appearance.",
    );
  }
  if (features.hasTags) {
    warnings.push(
      "Tagged-PDF accessibility structure is not preserved by this merge engine.",
    );
  }
  if (features.hasJavaScript) {
    warnings.push(
      "Document scripts and script actions are removed; visible page content is kept.",
    );
  }
  return warnings;
}

export function isBlockingInspection(features: PdfInspectionFeatures): boolean {
  return features.hasXFA || features.hasSignedSignature;
}
