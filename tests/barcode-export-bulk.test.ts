import { describe, expect, it } from "vitest";
import { PDFDocument } from "@cantoo/pdf-lib";
import { buildBarcode } from "@/lib/tools/barcode/encode";
import type { BarcodeFormatId, BarcodeSpec } from "@/lib/tools/barcode/types";
import {
  barcodeFilename,
  bulkEntryNames,
  bulkReportCsv,
  bulkSummary,
  exportLayout,
  pngBlob,
  svgBlob,
  svgFor,
  textBlob,
  type BulkReportRow,
} from "@/lib/tools/barcode/export";
import {
  BARCODE_BULK_LIMITS,
  BULK_TEMPLATE,
  buildBulkRows,
  bulkCounts,
  exportableRows,
  guessDataColumn,
  guessTitleColumn,
  parseBulkText,
  processInBatches,
  readBulkFile,
} from "@/lib/tools/barcode/bulk";
import {
  BARCODE_PAPERS,
  DEFAULT_LABEL_SIZE,
  DEFAULT_PDF_OPTIONS,
  createBarcodePdf,
  labelMetrics,
  planSheet,
  type BarcodePdfOptions,
} from "@/lib/tools/barcode/pdf";
import { isSvgSafe } from "@/lib/tools/barcode/svg";

function specFor(format: BarcodeFormatId, data: string): BarcodeSpec {
  const result = buildBarcode(format, data);
  if (!result.ok) throw new Error(JSON.stringify(result.problems));
  return result.spec;
}

const csv = (...rows: string[]) => rows.join("\n");

describe("export file names", () => {
  it("names a single download after the format, value and extension", () => {
    expect(
      barcodeFilename({ format: "ean13", value: "5901234123457", ext: "svg" }),
    ).toBe("quickkit-barcode-ean13-5901234123457.svg");
    expect(
      barcodeFilename({ format: "code128", value: "A/B C", ext: "png" }),
    ).toBe("quickkit-barcode-code128-a-b-c.png");
  });

  it("adds an index and a suffix without ever repeating a name", () => {
    const names = [1, 2, 3].map((index) =>
      barcodeFilename({
        format: "code39",
        value: "ABC",
        ext: "svg",
        index,
        suffix: "labels",
      }),
    );
    expect(names).toEqual([
      "quickkit-barcode-code39-abc-001-labels.svg",
      "quickkit-barcode-code39-abc-002-labels.svg",
      "quickkit-barcode-code39-abc-003-labels.svg",
    ]);
    expect(new Set(names).size).toBe(3);
  });

  it("falls back to a placeholder when the value is only punctuation", () => {
    const name = barcodeFilename({
      format: "code128",
      value: "///",
      ext: "svg",
    });
    expect(name.startsWith("quickkit-barcode-code128-")).toBe(true);
    expect(name).not.toContain("///");
  });

  it("keeps every bulk entry name unique and ordered", () => {
    const names = bulkEntryNames(
      [
        { format: "ean13", value: "5901234123457" },
        { format: "ean13", value: "5901234123457" },
        { format: "code128", value: "A B" },
      ],
      "svg",
    );
    expect(names).toEqual([
      "0001-5901234123457.svg",
      "0002-5901234123457.svg",
      "0003-a-b.svg",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("single-file exports", () => {
  const spec = specFor("code128", "QUICKKIT-2026");

  it("builds a safe SVG with the value in its accessible title", () => {
    const svg = svgFor(spec, { moduleWidth: 2.4 }, "Order card");
    expect(isSvgSafe(svg)).toBe(true);
    expect(svg).toContain('<title id="bc-title">Order card</title>');
    expect(svg).toContain("<rect");
  });

  it("wraps blobs in the right MIME types", async () => {
    expect(svgBlob("<svg></svg>").type).toContain("image/svg+xml");
    expect(pngBlob(new Uint8Array([1, 2, 3])).type).toBe("image/png");
    expect(textBlob("a,b\r\n").type).toContain("text/csv");
    expect(await svgBlob("<svg></svg>").text()).toBe("<svg></svg>");
  });

  it("scales the export layout without touching the preview geometry", () => {
    const preview = exportLayout(spec, { moduleWidth: 2.4 }, 1);
    const triple = exportLayout(spec, { moduleWidth: 2.4 }, 3);
    expect(triple.bars).toEqual(preview.bars);
    expect(triple.scaled.scale).toBe(3);
    expect(
      Math.abs(triple.scaled.width - preview.width * 3),
    ).toBeLessThanOrEqual(1);
  });
});

describe("bulk CSV report", () => {
  const rows: BulkReportRow[] = [
    { line: 2, status: "ok", value: "5901234123457", message: "Ready" },
    {
      line: 3,
      status: "duplicate",
      value: "5901234123457",
      message: "Same as row 2",
    },
    {
      line: 4,
      status: "invalid",
      value: '=HYPERLINK("http://x")',
      message: "EAN-13 needs 12 digits",
    },
  ];

  it("writes a header and one line per row", () => {
    const text = bulkReportCsv(rows);
    const lines = text.trimEnd().split("\r\n");
    expect(lines[0]).toBe("row,status,value,message");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("2,ok,5901234123457,Ready");
    expect(text.endsWith("\r\n")).toBe(true);
  });

  it("defuses spreadsheet formulas in user data", () => {
    const text = bulkReportCsv(rows);
    expect(text).not.toContain(",=HYPERLINK");
    expect(text).toContain("'=HYPERLINK");
  });

  it("quotes cells containing commas, quotes or newlines", () => {
    const text = bulkReportCsv([
      { line: 2, status: "invalid", value: 'a,b"c', message: "line\nbreak" },
    ]);
    expect(text).toContain('"a,b""c"');
    expect(text).toContain('"line\nbreak"');
  });

  it("summarises the run", () => {
    expect(bulkSummary(rows)).toEqual({
      total: 3,
      ok: 1,
      duplicate: 1,
      invalid: 1,
      skipped: 0,
      failed: 2,
    });
  });
});

describe("bulk row building", () => {
  const table = parseBulkText(
    csv(
      "data,label",
      "590123412345,Shelf label",
      "590123412345,Duplicate shelf label",
      "59012341234,Too short",
      ",No data",
      "9638507,Short code",
    ),
  );

  it("parses the header and the rows", () => {
    expect(table.headers).toEqual(["data", "label"]);
    expect(table.rows).toHaveLength(5);
  });

  it("marks each row ready, duplicate or invalid without dropping any", () => {
    const rows = buildBulkRows(table, {
      format: "ean13",
      columns: { data: 0, title: 1 },
    });
    expect(rows.map((row) => row.status)).toEqual([
      "ok",
      "duplicate",
      "invalid",
      "invalid",
      "invalid",
    ]);
    expect(rows.map((row) => row.line)).toEqual([2, 3, 4, 5, 6]);
    expect(rows[0].spec?.value).toBe("5901234123457");
    expect(rows[0].title).toBe("Shelf label");
    expect(rows[1].duplicateOf).toBe(2);
    expect(rows[2].message).toContain("11");
    expect(rows[3].message).toMatch(/data/i);
    expect(bulkCounts(rows)).toEqual({
      total: 5,
      ok: 1,
      duplicate: 1,
      skipped: 0,
      invalid: 3,
    });
  });

  it("skips duplicates only when the option is on, and never silently", () => {
    const rows = buildBulkRows(table, {
      format: "ean13",
      columns: { data: 0, title: 1 },
      skipDuplicates: true,
    });
    expect(rows.map((row) => row.status)).toEqual([
      "ok",
      "skipped",
      "invalid",
      "invalid",
      "invalid",
    ]);
    expect(rows[1].duplicateOf).toBe(2);
    expect(rows[1].spec).toBeTruthy();
    expect(bulkCounts(rows).skipped).toBe(1);
  });

  it("exports only rows that carry a symbol, including labelled duplicates", () => {
    const rows = buildBulkRows(table, {
      format: "ean13",
      columns: { data: 0, title: 1 },
    });
    expect(exportableRows(rows)).toHaveLength(2);
    const skipped = buildBulkRows(table, {
      format: "ean13",
      columns: { data: 0, title: 1 },
      skipDuplicates: true,
    });
    expect(exportableRows(skipped)).toHaveLength(1);
  });

  it("applies the format's own rules per row", () => {
    const ean = parseBulkText(csv("value", "590123412345", "5901234123458"));
    const rows = buildBulkRows(ean, {
      format: "ean13",
      columns: { data: 0, title: -1 },
    });
    expect(rows[0].status).toBe("ok");
    expect(rows[1].status).toBe("invalid");
    expect(rows[1].message).toContain("should be 7");
    const pharma = parseBulkText(csv("value", "2", "1234"));
    const pharmaRows = buildBulkRows(pharma, {
      format: "pharmacode",
      columns: { data: 0, title: -1 },
    });
    expect(pharmaRows.map((row) => row.status)).toEqual(["invalid", "ok"]);
  });

  it("trims titles and caps them so a spreadsheet cannot break the layout", () => {
    const long = "x".repeat(200);
    const rows = buildBulkRows(
      parseBulkText(csv("data,label", `590123412345,${long}`)),
      {
        format: "ean13",
        columns: { data: 0, title: 1 },
      },
    );
    expect(rows[0].title).toHaveLength(80);
  });

  it("caps the work at the documented row limit", () => {
    const body = Array.from(
      { length: 40 },
      (_, index) => `5901234${String(index).padStart(5, "0")}`,
    );
    const rows = buildBulkRows(parseBulkText(csv("data", ...body)), {
      format: "ean13",
      columns: { data: 0, title: -1 },
    });
    expect(rows).toHaveLength(40);
    expect(rows.every((row) => row.status === "ok")).toBe(true);
    expect(BARCODE_BULK_LIMITS.maxRows).toBe(1000);
  });
});

describe("CSV helpers", () => {
  it("parses the downloadable template", () => {
    const table = parseBulkText(BULK_TEMPLATE);
    expect(table.headers).toEqual(["data", "label"]);
    expect(table.rows).toHaveLength(3);
    expect(guessDataColumn(table.headers)).toBe(0);
    expect(guessTitleColumn(table.headers, 0)).toBe(1);
  });

  it("guesses the data column from common headers", () => {
    expect(guessDataColumn(["sku", "barcode", "notes"])).toBe(1);
    expect(guessDataColumn(["label", "value"])).toBe(1);
    expect(guessDataColumn(["ean13"])).toBe(0);
    expect(guessDataColumn([])).toBe(0);
    expect(guessTitleColumn(["data", "name"], 0)).toBe(1);
    expect(guessTitleColumn(["data"], 0)).toBe(-1);
  });

  it("rejects an oversized file before reading it", async () => {
    await expect(
      readBulkFile({ size: BARCODE_BULK_LIMITS.maxFileBytes + 1 } as File),
    ).rejects.toThrow(/5 MB/);
  });
});

describe("batched processing", () => {
  it("runs in order and reports progress", async () => {
    const seen: number[] = [];
    const progress: number[] = [];
    const { results, aborted } = await processInBatches(
      [1, 2, 3, 4, 5, 6, 7],
      (item) => {
        seen.push(item);
        return item * 2;
      },
      { batchSize: 3, onProgress: (done) => progress.push(done) },
    );
    expect(aborted).toBe(false);
    expect(seen).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(progress).toEqual([3, 6, 7]);
  });

  it("stops as soon as the signal is set and keeps what finished", async () => {
    const signal = { aborted: false };
    const { results, aborted } = await processInBatches(
      [1, 2, 3, 4, 5, 6, 7, 8],
      (item) => {
        if (item === 4) signal.aborted = true;
        return item;
      },
      { batchSize: 2, signal },
    );
    expect(aborted).toBe(true);
    expect(results).toEqual([1, 2, 3, 4]);
  });

  it("yields to the event loop between batches", async () => {
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
    }, 0);
    await processInBatches([1, 2, 3, 4], (item) => item, { batchSize: 1 });
    clearInterval(timer);
    // A macrotask per batch means timers get a chance to run: the bulk tab can
    // paint while a thousand thumbnails are being prepared.
    expect(ticks).toBeGreaterThan(0);
  });

  it("handles an empty list without a stray progress call", async () => {
    const progress: number[] = [];
    const { results } = await processInBatches([], () => 1, {
      onProgress: (done) => progress.push(done),
    });
    expect(results).toEqual([]);
    expect(progress).toEqual([]);
  });
});

describe("PDF sheets", () => {
  const options: BarcodePdfOptions = {
    ...DEFAULT_PDF_OPTIONS,
    paper: "a4",
    label: { ...DEFAULT_LABEL_SIZE },
    marginMm: 10,
    gapMm: 4,
  };

  it("fits two columns by seven rows of 64 × 34 mm labels on A4", () => {
    const plan = planSheet(100, options);
    expect(plan.columns).toBe(2);
    expect(plan.rows).toBe(7);
    expect(plan.perPage).toBe(14);
    expect(plan.pages).toBe(8);
  });

  it("clamps hostile label and margin values", () => {
    const plan = planSheet(5, {
      ...options,
      label: { widthMm: 5000, heightMm: 1 },
      marginMm: -20,
      gapMm: 999,
    });
    expect(plan.columns).toBeGreaterThanOrEqual(1);
    expect(plan.rows).toBeGreaterThanOrEqual(1);
    expect(plan.perPage).toBeGreaterThanOrEqual(1);
  });

  it("gives every label its own page when the paper is fitted", () => {
    expect(planSheet(7, { ...options, paper: "fit" })).toEqual({
      columns: 1,
      rows: 1,
      perPage: 1,
      pages: 7,
    });
  });

  it("measures the physical symbol inside the label box", () => {
    const metrics = labelMetrics(
      { spec: specFor("ean13", "5901234123457") },
      options,
    );
    expect(metrics.widthMm).toBeLessThanOrEqual(
      DEFAULT_LABEL_SIZE.widthMm + 0.001,
    );
    expect(metrics.heightMm).toBeLessThanOrEqual(
      DEFAULT_LABEL_SIZE.heightMm + 0.001,
    );
    expect(metrics.moduleMm).toBeGreaterThan(0.1);
    expect(metrics.scale).toBeGreaterThan(0);
  });

  it("writes an A4 document with the planned number of pages", async () => {
    const items = Array.from({ length: 20 }, (_, index) => ({
      spec: specFor("ean13", `59012341234${index % 10}`),
      title: `Label ${index + 1}`,
    }));
    const bytes = await createBarcodePdf(items, options);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(planSheet(items.length, options).pages);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(
      (BARCODE_PAPERS.a4.widthMm / 25.4) * 72,
      1,
    );
    expect(doc.getPage(0).getHeight()).toBeCloseTo(
      (BARCODE_PAPERS.a4.heightMm / 25.4) * 72,
      1,
    );
  });

  it("uses US Letter points and one page per label for a fitted page", async () => {
    const items = [0, 1, 2].map((index) => ({
      spec: specFor("code128", `ITEM-${index}`),
    }));
    const letter = await createBarcodePdf(items, {
      ...options,
      paper: "letter",
    });
    const letterDoc = await PDFDocument.load(letter);
    expect(letterDoc.getPageCount()).toBe(1);
    expect(letterDoc.getPage(0).getWidth()).toBeCloseTo(612, 1);
    expect(letterDoc.getPage(0).getHeight()).toBeCloseTo(792, 1);

    const fit = await createBarcodePdf(items, { ...options, paper: "fit" });
    const fitDoc = await PDFDocument.load(fit);
    expect(fitDoc.getPageCount()).toBe(3);
    const fitWidth = fitDoc.getPage(0).getWidth();
    const fitHeight = fitDoc.getPage(0).getHeight();
    // "Fit" means the page *is* the label, so a 64 × 34 mm label produces a
    // 64 × 34 mm page — the physical size the user asked for, to the point.
    expect(fitWidth).toBeCloseTo((DEFAULT_LABEL_SIZE.widthMm / 25.4) * 72, 1);
    expect(fitHeight).toBeCloseTo((DEFAULT_LABEL_SIZE.heightMm / 25.4) * 72, 1);
  });

  it("refuses to build an empty document", async () => {
    await expect(createBarcodePdf([], options)).rejects.toThrow(/nothing/i);
  });

  it("keeps the vector bars, not a flattened image", async () => {
    const bytes = await createBarcodePdf(
      [{ spec: specFor("code128", "VECTOR") }],
      options,
    );
    const raw = new TextDecoder("latin1").decode(bytes);
    expect(raw).not.toContain("/Subtype /Image");
    expect(raw).toContain("/Type /Page");
  });
});
