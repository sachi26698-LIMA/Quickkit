/**
 * Phase F — print layouts + PNG DPI metadata.
 *
 * Proves the export engine produces *real* files: PNGs carry a correct pHYs
 * resolution chunk and still decode byte-for-byte; every print layout is a
 * valid PDF whose page dimensions match the promised millimetres; the A4 sheet
 * grid is clamped to fit and tiles the right number of codes.
 */
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { PDFDocument } from "@cantoo/pdf-lib";
import { readPngDpi, withPngDpi } from "@/lib/tools/qr/png";
import { renderQr } from "@/lib/tools/qr/render";
import { verifyBitmap } from "@/lib/tools/qr/verify";
import { defaultDesign } from "@/lib/tools/qr/style";
import { DEFAULT_PDF_OPTIONS } from "@/lib/tools/qr/export";
import {
  DEFAULT_SHEET,
  PRINT_LAYOUTS,
  clampSheet,
  createLayoutPdf,
  createPrintSheetPdf,
  printLayoutDef,
} from "@/lib/tools/qr/layouts";

const MM = 72 / 25.4;
const PAYLOAD = "https://quickkit.tools/print";

async function verifiedPng(size = 320) {
  const out = await renderQr({
    payload: PAYLOAD,
    design: { ...defaultDesign(), size },
    artifacts: { png: true },
    verify: true,
  });
  expect(out.verification?.ok, out.verification?.message).toBe(true);
  return out.png!;
}

function decodePng(bytes: Uint8Array) {
  const png = PNG.sync.read(Buffer.from(bytes));
  return verifyBitmap(
    {
      width: png.width,
      height: png.height,
      rgba: new Uint8ClampedArray(png.data),
    },
    PAYLOAD,
  );
}

describe("PNG DPI metadata (pHYs)", () => {
  it("stamps a resolution that reads back and leaves the code decodable", async () => {
    const png = await verifiedPng();
    expect(readPngDpi(png)).toBeNull(); // no resolution by default
    for (const dpi of [72, 150, 300, 600]) {
      const stamped = withPngDpi(png, dpi);
      expect(readPngDpi(stamped)).toBe(dpi);
      const decoded = decodePng(stamped);
      expect(decoded.ok, decoded.message).toBe(true);
      expect(decoded.decoded).toBe(PAYLOAD);
    }
  }, 30_000);

  it("replaces an existing resolution rather than duplicating the chunk", async () => {
    const png = await verifiedPng();
    const once = withPngDpi(png, 300);
    const twice = withPngDpi(once, 600);
    expect(readPngDpi(twice)).toBe(600);
    // Exactly one pHYs chunk.
    const text = Buffer.from(twice).toString("latin1");
    expect(text.split("pHYs").length - 1).toBe(1);
    expect(decodePng(twice).ok).toBe(true);
  }, 30_000);

  it("ignores a non-positive DPI and non-PNG input", async () => {
    const png = await verifiedPng();
    expect(withPngDpi(png, 0)).toBe(png);
    expect(withPngDpi(png, -5)).toBe(png);
    const notPng = new Uint8Array([1, 2, 3, 4]);
    expect(withPngDpi(notPng, 300)).toBe(notPng);
    expect(readPngDpi(notPng)).toBeNull();
  });
});

describe("print layouts produce real PDFs at the promised size", () => {
  it("every layout loads back as a valid PDF with the right page size", async () => {
    const png = await verifiedPng();
    for (const layout of PRINT_LAYOUTS) {
      const bytes = await createLayoutPdf(
        png,
        "Quickkit Coffee",
        layout.id,
        DEFAULT_PDF_OPTIONS,
        DEFAULT_SHEET,
      );
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount(), layout.id).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      if (layout.pageMm) {
        expect(width, `${layout.id} width`).toBeCloseTo(
          layout.pageMm.w * MM,
          0,
        );
        expect(height, `${layout.id} height`).toBeCloseTo(
          layout.pageMm.h * MM,
          0,
        );
      }
      // A real PDF with an embedded image is comfortably over a kilobyte.
      expect(bytes.length, layout.id).toBeGreaterThan(1000);
    }
  }, 60_000);

  it("the table tent is A4 landscape with a fold guide", async () => {
    const png = await verifiedPng();
    const bytes = await createLayoutPdf(
      png,
      "Scan me",
      "table-tent",
      DEFAULT_PDF_OPTIONS,
    );
    const doc = await PDFDocument.load(bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeGreaterThan(height); // landscape
    expect(width).toBeCloseTo(297 * MM, 0);
    expect(height).toBeCloseTo(210 * MM, 0);
  }, 30_000);

  it("the single layout honours the chosen paper", async () => {
    const png = await verifiedPng();
    const bytes = await createLayoutPdf(png, null, "single", {
      ...DEFAULT_PDF_OPTIONS,
      paper: "letter",
    });
    const doc = await PDFDocument.load(bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(215.9 * MM, 0);
    expect(height).toBeCloseTo(279.4 * MM, 0);
  }, 30_000);

  it("layouts work without a caption", async () => {
    const png = await verifiedPng();
    for (const id of [
      "business-card",
      "sticker",
      "product-label",
      "poster",
    ] as const) {
      const bytes = await createLayoutPdf(png, null, id, DEFAULT_PDF_OPTIONS);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount(), id).toBe(1);
    }
  }, 30_000);
});

describe("A4 cut sheet grid", () => {
  it("clamps an oversized grid to fit A4", () => {
    const sheet = clampSheet({ cols: 99, rows: 99, codeMm: 200, gapMm: 50 });
    expect(sheet.cols).toBeLessThanOrEqual(6);
    expect(sheet.rows).toBeLessThanOrEqual(8);
    expect(sheet.gapMm).toBeLessThanOrEqual(15);
    const gridW = sheet.cols * sheet.codeMm + (sheet.cols - 1) * sheet.gapMm;
    const gridH = sheet.rows * sheet.codeMm + (sheet.rows - 1) * sheet.gapMm;
    expect(gridW).toBeLessThanOrEqual(210);
    expect(gridH).toBeLessThanOrEqual(297);
  });

  it("defaults to a sane 3×4 grid that fits", () => {
    const sheet = clampSheet({});
    expect(sheet.cols).toBe(3);
    expect(sheet.rows).toBe(4);
    expect(sheet.codeMm).toBeGreaterThan(12);
  });

  it("renders one A4 page with the requested grid", async () => {
    const png = await verifiedPng();
    const bytes = await createPrintSheetPdf(png, "Label", {
      cols: 2,
      rows: 3,
      codeMm: 50,
      gapMm: 8,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(210 * MM, 0);
    expect(height).toBeCloseTo(297 * MM, 0);
    expect(bytes.length).toBeGreaterThan(1000);
  }, 30_000);

  it("printLayoutDef falls back to single for an unknown id", () => {
    expect(printLayoutDef("nope" as never).id).toBe("single");
  });
});
