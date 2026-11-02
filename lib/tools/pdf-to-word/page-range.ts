import { PdfToWordError } from "./types";

/**
 * Page-range parsing for selective conversion, e.g. "1-3, 5, 8-10".
 * Pure and unit-tested; throws PdfToWordError("invalid-range") with a
 * user-readable message on garbage input instead of guessing.
 */

const MAX_SELECTED = 1000;

/**
 * Parse a range string into a set of 1-based page numbers.
 * Returns null for empty input (meaning: all pages).
 */
export function parsePageRange(input: string): Set<number> | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const invalid = (detail: string) =>
    new PdfToWordError(
      "invalid-range",
      `Page range "${input}" is not valid: ${detail}. Use forms like 1-3, 5, 8-10.`,
    );

  const pages = new Set<number>();
  for (const rawToken of trimmed.split(",")) {
    const token = rawToken.trim();
    if (!token) throw invalid("empty entry");
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(token);
    if (!match) throw invalid(`"${token}" is not a page or range`);
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);
    if (start < 1) throw invalid("page numbers start at 1");
    if (end < start) throw invalid(`"${token}" ends before it starts`);
    if (end - start + 1 + pages.size > MAX_SELECTED) {
      throw invalid(`it selects more than ${MAX_SELECTED} pages`);
    }
    for (let p = start; p <= end; p++) pages.add(p);
  }
  if (pages.size === 0) throw invalid("it selects no pages");
  return pages;
}

/** Pages of `selection` that exist in a document of `pageCount` pages. */
export function intersectRange(
  selection: Set<number> | null,
  pageCount: number,
): { pages: number[]; outsideCount: number } {
  if (!selection) {
    return {
      pages: Array.from({ length: pageCount }, (_, i) => i + 1),
      outsideCount: 0,
    };
  }
  const pages = [...selection]
    .filter((p) => p <= pageCount)
    .sort((a, b) => a - b);
  return { pages, outsideCount: selection.size - pages.length };
}
