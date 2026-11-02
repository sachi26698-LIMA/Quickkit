import { describe, expect, it } from "vitest";

import {
  PDF_MERGE_LIMITS,
  PdfMergeError,
  buildMergeSummary,
  formatMiB,
  formatPageSelectionSummary,
  isPdfSignature,
  makeUniqueBookmarkTitles,
  moveItem,
  parsePageRange,
  sanitizeOutputFilename,
  sanitizePdfTitle,
  serializePageSelection,
  sortEntriesByName,
  validatePdfFileCandidate,
} from "@/lib/tools/pdf/merge-pdf-logic";

describe("PDF merger pure logic", () => {
  it("parses explicit page ranges into sorted zero-based indices", () => {
    expect(parsePageRange("all", 4)).toEqual([0, 1, 2, 3]);
    expect(parsePageRange("3, 1-2, 5", 6)).toEqual([0, 1, 2, 4]);
    expect(parsePageRange(" 2 – 3 ", 5)).toEqual([1, 2]);
  });

  it("gives actionable errors for invalid and duplicate ranges", () => {
    expect(() => parsePageRange("", 4)).toThrow("Enter pages to include");
    expect(() => parsePageRange("5-2", 6)).toThrow("is reversed");
    expect(() => parsePageRange("1, 2-3, 3", 6)).toThrow(PdfMergeError);
    expect(() => parsePageRange("1, 2-3, 3", 6)).toThrow(
      "selected more than once",
    );
    expect(() => parsePageRange("9", 4)).toThrow(
      "outside this PDF’s 1–4 page range",
    );
    expect(() => parsePageRange("1-", 4)).toThrow("is incomplete");
    expect(() => parsePageRange("1,,2", 4)).toThrow("extra comma");
    expect(() => parsePageRange("chapter", 4)).toThrow(
      "is not a valid page or range",
    );
  });

  it("serializes and summarizes selections", () => {
    expect(serializePageSelection([0, 1, 2, 4, 7, 8], 10)).toBe("1-3, 5, 8-9");
    expect(serializePageSelection([0, 1], 2)).toBe("all");
    expect(formatPageSelectionSummary([0, 2], 5)).toBe("2 of 5 pages · 1, 3");
    expect(formatPageSelectionSummary([], 5)).toBe("No pages selected");
  });

  it("builds output spans without skipping files", () => {
    const summary = buildMergeSummary([
      { entryId: "a", name: "A.pdf", pageIndices: [2, 0], totalPages: 5 },
      { entryId: "b", name: "B.pdf", pageIndices: [1], totalPages: 3 },
    ]);
    expect(summary.totalPages).toBe(3);
    expect(summary.segments).toEqual([
      expect.objectContaining({
        outputEnd: 2,
        outputStart: 1,
        pageIndices: [0, 2],
      }),
      expect.objectContaining({
        outputEnd: 3,
        outputStart: 3,
        pageIndices: [1],
      }),
    ]);
  });

  it("validates candidates and reports MiB limits", () => {
    expect(
      validatePdfFileCandidate(
        { name: "image.png", size: 12, type: "image/png" },
        0,
        0,
      ),
    ).toMatchObject({
      code: "invalid_pdf",
    });
    expect(
      validatePdfFileCandidate(
        { name: "empty.pdf", size: 0, type: "application/pdf" },
        0,
        0,
      ),
    ).toMatchObject({
      code: "invalid_pdf",
    });
    expect(
      validatePdfFileCandidate(
        {
          name: "large.pdf",
          size: PDF_MERGE_LIMITS.maxFileBytes + 1,
          type: "application/pdf",
        },
        0,
        0,
      ),
    ).toMatchObject({ code: "file_too_large" });
    expect(
      validatePdfFileCandidate(
        { name: "next.pdf", size: 2, type: "application/pdf" },
        1,
        PDF_MERGE_LIMITS.maxTotalBytes - 1,
      ),
    ).toMatchObject({ code: "total_too_large" });
    expect(
      validatePdfFileCandidate({ name: "ok.PDF", size: 2048, type: "" }, 0, 0),
    ).toBeNull();
    expect(formatMiB(512)).toBe("512 B");
    expect(formatMiB(1024 * 1024)).toBe("1.00 MiB");
  });

  it("recognizes a PDF signature conservatively", () => {
    expect(isPdfSignature(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(isPdfSignature(new TextEncoder().encode("not pdf"))).toBe(false);
  });

  it("moves and naturally sorts entries stably", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(
      sortEntriesByName([
        { name: "File 10.pdf" },
        { name: "File 2.pdf" },
        { name: "File 1.pdf" },
      ]),
    ).toEqual([
      { name: "File 1.pdf" },
      { name: "File 2.pdf" },
      { name: "File 10.pdf" },
    ]);
  });

  it("sanitizes output names and titles", () => {
    expect(sanitizeOutputFilename("  My / merged: report?.PDF  ")).toBe(
      "My merged report.pdf",
    );
    expect(sanitizeOutputFilename("...")).toBe("merged.pdf");
    expect(sanitizePdfTitle("  A\u0000   title  ")).toBe("A title");
    expect(
      makeUniqueBookmarkTitles(["Report_final.pdf", "Report final.PDF"]),
    ).toEqual(["Report final", "Report final (2)"]);
  });
});
