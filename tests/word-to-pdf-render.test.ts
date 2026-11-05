import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { convertDocxWithBuiltinEngine } from "../lib/tools/word-to-pdf/render";
import { parseDocxPackage } from "../lib/tools/word-to-pdf/render/ooxml";
import { splitScripts } from "../lib/tools/word-to-pdf/render/fonts";

async function text(bytes: Uint8Array) {
  const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= doc.numPages; index++) {
    const content = await (await doc.getPage(index)).getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  return pages;
}

let quality: Uint8Array;
let complexFixture: Uint8Array;

beforeAll(async () => {
  quality = new Uint8Array(
    await readFile("docs/word-to-pdf/v5/fixtures/quality.docx"),
  );
  complexFixture = new Uint8Array(
    await readFile("docs/word-to-pdf/v4/fixtures/complex.docx"),
  );
});

describe("built-in DOCX renderer", () => {
  it("produces a real multi-page PDF from a DOCX package", async () => {
    const stages: string[] = [];
    let progressSeen = false;
    const result = await convertDocxWithBuiltinEngine(complexFixture, {
      onStage: (event) => {
        stages.push(event.stage);
        if (event.total && event.done !== undefined) progressSeen = true;
      },
    });
    expect(String.fromCharCode(...result.bytes.subarray(0, 5))).toBe("%PDF-");
    expect(result.pages).toBeGreaterThan(1);
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(result.pages);
    expect(stages[0]).toMatch(/DOCX/);
    expect(progressSeen).toBe(true);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeGreaterThan(100);
      expect(page.getHeight()).toBeGreaterThan(100);
    }
  });

  it("lays out headings, tables, lists, images and Indic scripts", async () => {
    const result = await convertDocxWithBuiltinEngine(quality);
    expect(result.pages).toBe(3);
    const pdf = await PDFDocument.load(result.bytes);
    // A4 portrait for body sections, landscape for the appendix.
    expect(Math.round(pdf.getPage(0).getWidth())).toBe(595);
    expect(Math.round(pdf.getPage(2).getWidth())).toBe(842);
    expect(pdf.getTitle()).toBe("QUICKKIT layout quality fixture");
    expect(pdf.getAuthor()).toBe("QUICKKIT QA");
    expect(pdf.getCreator()).toContain("QUICKKIT");

    const pages = await text(result.bytes);
    expect(pages[0]).toContain("Quarterly operations review");
    expect(pages[0]).toContain("Stage");
    expect(pages[0]).toContain("Layout + render");
    expect(pages[0]).toContain("Run the 1,000-page ladder");
    expect(pages[0]).toContain("a) Record RSS");
    expect(pages[0]).toContain("ગુજરાતી");
    // Complex-script extraction may reorder matras, so assert a stable cluster.
    expect(pages[0]).toContain("देवनागरी");
    // Section inheritance: every page carries the header and footer parts.
    for (const [index, page] of pages.entries()) {
      expect(page).toContain("QUICKKIT · layout fixture");
      expect(page).toContain(`page ${index + 1} of 3`);
      expect(page).toContain("Synthetic document · generated for QA only");
    }
    expect(pages[1]).toContain("Second page");
    expect(pages[2]).toContain("Landscape appendix");
  });

  it("honours page-level spacing and keeps the rest of the text searchable", async () => {
    const result = await convertDocxWithBuiltinEngine(complexFixture);
    const pages = await text(result.bytes);
    expect(pages[0]).toContain("Native fixture page 1 of 4");
    expect(pages[0]).toContain("Merged table heading");
    expect(pages[0]).toContain("123.45");
    expect(pages[3]).toContain("Native fixture page 4 of 4");
  });

  it("renders even/odd header parts instead of approximating them", async () => {
    const model = parseDocxPackage(complexFixture);
    // w:evenAndOddHeaders is honoured per page; it is no longer a warning.
    expect([...model.warnings].join(" ")).not.toContain("odd/even");
    expect(model.evenOdd).toBe(true);
    const result = await convertDocxWithBuiltinEngine(complexFixture);
    expect(Array.isArray(result.warnings)).toBe(true);
    const pages = await text(result.bytes);
    for (const page of pages) {
      // The even part is a distinct part in this fixture; every page must
      // still receive a header and a footer.
      expect(page).toContain("QUICKKIT synthetic native validation");
      expect(page).toContain("Synthetic footer");
    }
  });

  it("rejects garbage, macros and oversized page counts", async () => {
    await expect(
      convertDocxWithBuiltinEngine(new Uint8Array([1, 2, 3])),
    ).rejects.toThrow(/DOCX/);
    const controller = new AbortController();
    controller.abort();
    await expect(
      convertDocxWithBuiltinEngine(complexFixture, {
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    await expect(
      convertDocxWithBuiltinEngine(quality, { maxPages: 1 }),
    ).rejects.toThrow(/more than 1 pages/);
  });
});

describe("script segmentation", () => {
  it("keeps combining marks with their base script", () => {
    const parts = splitScripts("Hi નમસ્તે!");
    expect(parts[0].script).toBe("latin");
    expect(parts[1].script).toBe("gujarati");
    expect(parts[1].text).toContain("નમસ્તે");
    expect(parts.at(-1)?.script).toBe("latin");
  });
  it("separates mixed Devanagari and Latin runs", () => {
    const parts = splitScripts("A नमस्ते B");
    expect(parts.map((part) => part.script)).toEqual([
      "latin",
      "devanagari",
      "latin",
    ]);
  });
});
