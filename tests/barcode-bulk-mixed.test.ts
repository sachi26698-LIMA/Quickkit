/**
 * Mixed-symbology batch generation.
 *
 * These tests cover the three things a mixed CSV can get wrong: a format token
 * that names nothing, a row that cannot be encoded while its neighbours can, and
 * a sheet so large that a naive implementation freezes. None of them is mocked —
 * the linear rows go through the real encoder and the 2D rows through bwip-js.
 */
import { describe, expect, it } from "vitest";
import { parseBulkText } from "@/lib/tools/barcode/bulk";
import {
  buildMixedRows,
  exportableMixedRows,
  isTwoDFormat,
  mixedCounts,
  mixedFormatGroups,
  resolveMixedFormat,
} from "@/lib/tools/barcode/bulk-mixed";
import { bulkReportCsv } from "@/lib/tools/barcode/export";

function table(csv: string) {
  return parseBulkText(csv);
}

const MIXED = [
  "data,label,format",
  "5901234123457,Yogurt 400 g,ean13",
  "09506000134352,Case label,itf14",
  "QUICKKIT-2026,Order card,code128",
  "https://quickkit.online,Product page,qrcode",
  "LOT-42-QC,QC tag,datamatrix",
].join("\n");

describe("format tokens", () => {
  it("accepts ids, display names and loose spellings", () => {
    expect(resolveMixedFormat("ean13")).toBe("ean13");
    expect(resolveMixedFormat("EAN-13")).toBe("ean13");
    expect(resolveMixedFormat("EAN 13")).toBe("ean13");
    expect(resolveMixedFormat("Code_128")).toBe("code128");
    expect(resolveMixedFormat("code 128")).toBe("code128");
    expect(resolveMixedFormat("GS1-128")).toBe("gs1-128");
    expect(resolveMixedFormat("UPC A")).toBe("upca");
    expect(resolveMixedFormat("itf-14")).toBe("itf14");
  });

  it("accepts the four 2D symbologies and their common short names", () => {
    expect(resolveMixedFormat("qrcode")).toBe("qrcode");
    expect(resolveMixedFormat("QR code")).toBe("qrcode");
    expect(resolveMixedFormat("QR")).toBe("qrcode");
    expect(resolveMixedFormat("GS1 QR")).toBe("gs1qrcode");
    expect(resolveMixedFormat("gs1qrcode")).toBe("gs1qrcode");
    expect(resolveMixedFormat("Data Matrix")).toBe("datamatrix");
    expect(resolveMixedFormat("dm")).toBe("datamatrix");
    expect(resolveMixedFormat("PDF417")).toBe("pdf417");
  });

  it("refuses anything it cannot name", () => {
    expect(resolveMixedFormat("ean-99")).toBeNull();
    expect(resolveMixedFormat("barcode")).toBeNull();
    expect(resolveMixedFormat("  ")).toBeNull();
  });

  it("knows which formats are 2D", () => {
    expect(isTwoDFormat("qrcode")).toBe(true);
    expect(isTwoDFormat("pdf417")).toBe(true);
    expect(isTwoDFormat("ean13")).toBe(false);
  });
});

describe("mixed build", () => {
  const rows = buildMixedRows(table(MIXED), {
    data: 0,
    title: 1,
    formatColumn: 2,
    fallback: "code128",
  });

  it("encodes every row with its own symbology", () => {
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.format)).toEqual([
      "ean13",
      "itf14",
      "code128",
      "qrcode",
      "datamatrix",
    ]);
    expect(rows.every((row) => row.status === "ok")).toBe(true);
  });

  it("carries a linear spec or a rendered 2D SVG, never both", () => {
    const linear = rows.filter((row) => row.kind === "linear");
    const twoD = rows.filter((row) => row.kind === "2d");
    expect(linear).toHaveLength(3);
    expect(twoD).toHaveLength(2);
    for (const row of linear) {
      expect(row.spec).toBeTruthy();
      expect(row.svg).toBeUndefined();
    }
    for (const row of twoD) {
      expect(row.svg).toContain('viewBox="0 0 ');
      expect(row.width).toBeGreaterThan(0);
      expect(row.spec).toBeUndefined();
    }
  });

  it("groups the export by symbology in first-seen order", () => {
    const groups = mixedFormatGroups(rows);
    expect(groups.map((group) => group.format)).toEqual([
      "ean13",
      "itf14",
      "code128",
      "qrcode",
      "datamatrix",
    ]);
    expect(groups.every((group) => group.rows.length === 1)).toBe(true);
  });

  it("counts the run and the number of formats", () => {
    expect(mixedCounts(rows)).toEqual({
      total: 5,
      ok: 5,
      duplicate: 0,
      skipped: 0,
      invalid: 0,
      formats: 5,
    });
  });
});

describe("per-row validation", () => {
  const csv = [
    "data,label,format",
    "5901234123457,good,ean13",
    "5901234123459,bad check digit,ean13",
    "QUICKKIT-2026,unknown symbology,aztec",
    "QUICKKIT-2027,blank format uses fallback,",
    "https://quickkit.online,duplicate qr,qrcode",
    "https://quickkit.online,second qr,qrcode",
    " ,empty data,code128",
  ].join("\n");

  const rows = buildMixedRows(table(csv), {
    data: 0,
    title: 1,
    formatColumn: 2,
    fallback: "code128",
  });

  it("keeps a bad row from stopping the good ones", () => {
    expect(rows.map((row) => row.status)).toEqual([
      "ok",
      "invalid",
      "invalid",
      "ok",
      "ok",
      "duplicate",
      "invalid",
    ]);
  });

  it("quotes the unknown token instead of substituting a symbology", () => {
    const unknown = rows[2];
    expect(unknown.format).toBeNull();
    expect(unknown.message).toContain('"aztec"');
    expect(unknown.message).toContain("ean13");
  });

  it("uses the fallback when the format cell is blank", () => {
    expect(rows[3].format).toBe("code128");
    expect(rows[3].status).toBe("ok");
  });

  it("marks a repeated value as a duplicate of the earlier line", () => {
    expect(rows[5].duplicateOf).toBe(6);
    expect(rows[5].message).toContain("row 6");
  });

  it("reports a check-digit failure with the expected digit", () => {
    expect(rows[1].message).toMatch(/should be 7/);
  });

  it("reports an empty data cell as invalid even when the format is fine", () => {
    expect(rows[6].message).toMatch(/no barcode data/i);
  });
});

describe("large and malformed input", () => {
  it("encodes 1,000 rows across two formats within a bounded time", () => {
    const lines = ["data,format"];
    for (let index = 0; index < 990; index += 1) {
      // A valid Code 128 payload of varying length.
      lines.push(`ROW-${String(index).padStart(5, "0")},code128`);
    }
    for (let index = 0; index < 10; index += 1) {
      lines.push(`https://quickkit.online/item/${index},qrcode`);
    }
    const started = Date.now();
    const rows = buildMixedRows(table(lines.join("\n")), {
      data: 0,
      title: -1,
      formatColumn: 1,
      fallback: "code128",
      maxRows: 1000,
    });
    const elapsed = Date.now() - started;
    expect(rows).toHaveLength(1000);
    expect(rows.filter((row) => row.status === "ok")).toHaveLength(1000);
    expect(mixedCounts(rows).formats).toBe(2);
    // Generous ceiling: the point is that it is linear-ish, not that this
    // machine is fast. A quadratic implementation takes minutes here.
    expect(elapsed).toBeLessThan(30_000);
  });

  it("survives an unterminated quote and ragged columns", () => {
    const csv = ["data,format", "A-1,code128", '"B-2,code128', "C-3"].join(
      "\n",
    );
    const rows = buildMixedRows(table(csv), {
      data: 0,
      title: -1,
      formatColumn: 1,
      fallback: "code128",
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(["ok", "invalid", "duplicate", "skipped"]).toContain(row.status);
    }
  });

  it("never emits more rows than the ceiling", () => {
    const lines = ["data,format"];
    for (let index = 0; index < 50; index += 1)
      lines.push(`ROW-${index},code128`);
    const rows = buildMixedRows(table(lines.join("\n")), {
      data: 0,
      title: -1,
      formatColumn: 1,
      fallback: "code128",
      maxRows: 10,
    });
    expect(rows).toHaveLength(10);
  });
});

describe("mixed report", () => {
  it("adds a format column and defuses formulas", () => {
    const rows = buildMixedRows(
      table(["data,format", '=HYPERLINK("http://x"),ean13'].join("\n")),
      { data: 0, title: -1, formatColumn: 1, fallback: "ean13" },
    );
    const text = bulkReportCsv(
      rows.map((row) => ({
        line: row.line,
        status: row.status,
        value: row.data,
        message: row.message,
        format: row.format ?? "",
      })),
    );
    expect(text.split("\r\n")[0]).toBe("row,format,status,value,message");
    expect(text).toContain("ean13");
    expect(text).not.toContain(",=HYPERLINK");
    expect(text).toContain("'=HYPERLINK");
  });

  it("keeps the historic four columns for a single-format report", () => {
    const text = bulkReportCsv([
      { line: 2, status: "ok", value: "5901234123457", message: "Ready" },
    ]);
    expect(text.split("\r\n")[0]).toBe("row,status,value,message");
  });

  it("exports only rows that carry a symbol", () => {
    const rows = buildMixedRows(
      table(
        [
          "data,format",
          "5901234123457,ean13",
          "nope,ean13",
          "https://quickkit.online,qrcode",
        ].join("\n"),
      ),
      { data: 0, title: -1, formatColumn: 1, fallback: "ean13" },
    );
    expect(exportableMixedRows(rows).map((row) => row.format)).toEqual([
      "ean13",
      "qrcode",
    ]);
  });
});
