import { describe, expect, it } from "vitest";

import {
  PDF_SPLIT_LIMITS,
  buildPdfSplitPlan,
  buildZipFilename,
  createStoredZip,
  crc32,
  outputsForPage,
  parseRangeGroups,
} from "@/lib/tools/pdf/split-pdf-logic";

function readStoredZipEntries(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const entries: { crc: number; data: Uint8Array; name: string }[] = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const crc = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push({
      crc,
      data: zip.slice(dataStart, dataStart + size),
      name: decoder.decode(zip.slice(nameStart, nameStart + nameLength)),
    });
    offset = dataStart + size;
  }
  expect(view.getUint32(offset, true)).toBe(0x02014b50);
  const eocdOffset = zip.byteLength - 22;
  expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
  expect(view.getUint16(eocdOffset + 10, true)).toBe(entries.length);
  return entries;
}

describe("PDF split planning", () => {
  it("parses semicolon and newline separated output ranges", () => {
    expect(parseRangeGroups("1-2; 4, 6\n7", 7)).toEqual([[0, 1], [3, 5], [6]]);
  });

  it("names overlapping ranges explicitly and warns instead of rewriting them", () => {
    const plan = buildPdfSplitPlan({
      baseName: "Board pack",
      mode: "ranges",
      namingStyle: "both",
      pageCount: 6,
      rangeText: "1-3; 3-4",
    });

    expect(plan.outputs.map((output) => output.filename)).toEqual([
      "Board pack-part-01-pages-1-3.pdf",
      "Board pack-part-02-pages-3-4.pdf",
    ]);
    expect(plan.outputs.map((output) => output.title)).toEqual([
      "Board pack — pages 1-3",
      "Board pack — pages 3-4",
    ]);
    expect(plan.totalOutputPages).toBe(5);
    expect(plan.warnings).toEqual([
      expect.stringContaining("Pages 3 appear in more than one output"),
      expect.stringContaining("Pages 5-6 are not included"),
    ]);
    expect(outputsForPage(plan.outputs, 2)).toHaveLength(2);
  });

  it("rejects a duplicate inside one range group with the output number", () => {
    expect(() => parseRangeGroups("1-2; 3, 3", 4)).toThrowError(
      expect.objectContaining({
        code: "duplicate_page_selection",
        message: expect.stringContaining("Output 2: Page 3"),
      }),
    );
  });

  it("supports combined and separate selected-page extraction", () => {
    const combined = buildPdfSplitPlan({
      baseName: "Extract",
      extractStyle: "combined",
      mode: "extract",
      namingStyle: "pages",
      pageCount: 6,
      selectedPageIndices: [4, 0, 2, 2],
    });
    expect(combined.outputs).toHaveLength(1);
    expect(combined.outputs[0].pageIndices).toEqual([0, 2, 4]);
    expect(combined.outputs[0].filename).toBe("Extract-pages-1-3-5.pdf");

    const separate = buildPdfSplitPlan({
      baseName: "Extract",
      extractStyle: "separate",
      mode: "extract",
      namingStyle: "part",
      pageCount: 6,
      selectedPageIndices: [4, 0, 2],
    });
    expect(separate.outputs.map((output) => output.pageIndices)).toEqual([
      [0],
      [2],
      [4],
    ]);
    expect(separate.outputs.map((output) => output.filename)).toEqual([
      "Extract-part-01.pdf",
      "Extract-part-02.pdf",
      "Extract-part-03.pdf",
    ]);
  });

  it("splits every N pages and keeps the remainder in the final output", () => {
    const plan = buildPdfSplitPlan({
      baseName: "Chapters",
      everyN: 2,
      mode: "every",
      namingStyle: "pages",
      pageCount: 5,
    });
    expect(plan.outputs.map((output) => output.pagesLabel)).toEqual([
      "1-2",
      "3-4",
      "5",
    ]);
    expect(plan.warnings).toEqual([]);
  });

  it("enforces the output-file and written-page safety bounds", () => {
    expect(() =>
      buildPdfSplitPlan({
        baseName: "Many",
        mode: "perPage",
        namingStyle: "part",
        pageCount: PDF_SPLIT_LIMITS.maxOutputFiles + 1,
      }),
    ).toThrowError(expect.objectContaining({ code: "too_many_files" }));

    expect(() =>
      buildPdfSplitPlan({
        baseName: "Overlap",
        mode: "ranges",
        namingStyle: "part",
        pageCount: 600,
        rangeText: "all; all",
      }),
    ).toThrowError(expect.objectContaining({ code: "too_many_pages" }));
  });

  it("sanitizes output and ZIP names", () => {
    const plan = buildPdfSplitPlan({
      baseName: "  ../Quarterly: report?.pdf  ",
      mode: "extract",
      namingStyle: "pages",
      pageCount: 2,
      selectedPageIndices: [1],
    });
    expect(plan.outputs[0].filename).toBe("Quarterly report-page-2.pdf");
    expect(buildZipFilename("Quarterly: report.zip")).toBe(
      "Quarterly report.zip",
    );
  });
});

describe("local stored ZIP packaging", () => {
  it("uses the standard CRC32 check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes readable stored entries with matching CRCs and central count", () => {
    const first = new TextEncoder().encode("first pdf bytes");
    const second = new TextEncoder().encode("second pdf bytes");
    const zip = createStoredZip([
      {
        bytes: first,
        date: new Date(2026, 10, 1, 12, 30, 20),
        name: "part-01.pdf",
      },
      {
        bytes: second,
        date: new Date(2026, 10, 1, 12, 30, 22),
        name: "ünïcode part.pdf",
      },
    ]);

    const entries = readStoredZipEntries(zip);
    expect(entries.map((entry) => entry.name)).toEqual([
      "part-01.pdf",
      "ünïcode part.pdf",
    ]);
    expect(entries[0].data).toEqual(first);
    expect(entries[1].data).toEqual(second);
    expect(entries[0].crc).toBe(crc32(first));
    expect(entries[1].crc).toBe(crc32(second));
  });

  it("rejects duplicate ZIP entry names instead of overwriting one output", () => {
    expect(() =>
      createStoredZip([
        { bytes: new Uint8Array([1]), name: "same.pdf" },
        { bytes: new Uint8Array([2]), name: "SAME.pdf" },
      ]),
    ).toThrowError(
      expect.objectContaining({ code: "output_validation_failed" }),
    );
  });
});
