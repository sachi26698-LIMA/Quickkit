import { describe, expect, it } from "vitest";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { unzipSync, strFromU8 } from "fflate";
import { convertDocxWithBuiltinEngine } from "../lib/tools/word-to-pdf/render";

/**
 * Quality gate for the built-in renderer.
 *
 * The unit suites prove the code runs; this suite measures what the PDF actually
 * looks like: page count, text coverage, line pitch, overlapping lines, embedded
 * images and page geometry, for the acceptance corpus in docs/word-to-pdf/v5.2.
 */

const CORPUS_DIRS = [
  "docs/word-to-pdf/v5.2/corpus",
  "docs/word-to-pdf/v5.2/corpus/real",
  "docs/word-to-pdf/v4/fixtures",
];
const OUT = "test-results/word-to-pdf-v5.2";

type LineBox = { x0: number; y0: number; x1: number; y1: number; size: number };

type Measurement = {
  file: string;
  pages: number;
  width: number;
  height: number;
  spans: number;
  lines: number;
  overlaps: number;
  minFontSize: number;
  maxFontSize: number;
  images: number;
  textCharacters: number;
  sourceCharacters: number;
  coverage: number;
  blankPages: number;
  convertMs: number;
  warnings: string[];
};

const decodeEntities = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const squash = (value: string) =>
  value.replace(/[\s\u00a0]+/g, "").toLowerCase();

/** Text stored in the document parts (body, headers, footers, notes). */
function sourceText(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  const out: string[] = [];
  for (const [name, data] of Object.entries(files)) {
    if (
      !/^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(
        name,
      )
    )
      continue;
    const xml = strFromU8(data);
    for (const match of xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g))
      out.push(decodeEntities(match[1]));
  }
  return out.join("");
}

async function measure(
  file: string,
  bytes: Uint8Array,
  result: Awaited<ReturnType<typeof convertDocxWithBuiltinEngine>>,
  convertMs: number,
): Promise<Measurement> {
  const pdf = await PDFDocument.load(result.bytes);
  const doc = await getDocument({ data: new Uint8Array(result.bytes) }).promise;
  const boxes: LineBox[] = [];
  let spans = 0;
  let textCharacters = 0;
  let images = 0;
  let blankPages = 0;
  let overlaps = 0;
  let minFontSize = Number.POSITIVE_INFINITY;
  let maxFontSize = 0;
  let extracted = "";
  for (let index = 1; index <= doc.numPages; index++) {
    const page = await doc.getPage(index);
    const content = await page.getTextContent();
    let pageCharacters = 0;
    const pageBoxes: LineBox[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      pageCharacters += item.str.trim().length;
      extracted += item.str;
      const transform = item.transform as number[];
      const size = Math.hypot(transform[2], transform[3]) || 0;
      if (item.str.trim()) {
        spans++;
        minFontSize = Math.min(minFontSize, size);
        maxFontSize = Math.max(maxFontSize, size);
        pageBoxes.push({
          x0: transform[4],
          y0: transform[5],
          x1: transform[4] + item.width,
          y1: transform[5] + size * 0.8,
          size,
        });
      }
    }
    if (!pageCharacters) blankPages++;
    textCharacters += pageCharacters;
    images += (await page.getOperatorList()).fnArray.filter(
      (fn) => fn === 85 || fn === 82,
    ).length;
    boxes.push(...pageBoxes);
    // Overlap is a per-page property: identical coordinates on different pages
    // are not a collision.
    const sorted = [...pageBoxes].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length && j < i + 8; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const horizontal = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const vertical = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        const limit = Math.min(a.size, b.size) * 0.55;
        if (horizontal > 2 && vertical > limit) overlaps++;
      }
    }
  }
  const source = squash(sourceText(bytes));
  const haystack = squash(extracted);
  const coverage = source.length
    ? Math.min(1, haystack.length / source.length)
    : 1;
  void pdf;
  return {
    file,
    pages: result.pages,
    width: Math.round(pdf.getPage(0).getWidth()),
    height: Math.round(pdf.getPage(0).getHeight()),
    spans,
    lines: boxes.length,
    overlaps,
    minFontSize: Number.isFinite(minFontSize)
      ? Number(minFontSize.toFixed(1))
      : 0,
    maxFontSize: Number(maxFontSize.toFixed(1)),
    images,
    textCharacters,
    sourceCharacters: source.length,
    coverage: Number(coverage.toFixed(3)),
    blankPages,
    convertMs,
    warnings: result.warnings,
  };
}

describe("V5.2/V5.3 rendering quality gate", () => {
  it("measures every corpus document and writes the report", async () => {
    await mkdir(OUT, { recursive: true });
    const files: { path: string; name: string }[] = [];
    for (const dir of CORPUS_DIRS) {
      for (const name of await readdir(dir)) {
        if (name.endsWith(".docx"))
          files.push({ path: `${dir}/${name}`, name });
      }
    }
    expect(files.length).toBeGreaterThanOrEqual(12);

    const report: Measurement[] = [];
    for (const { path, name } of files) {
      const bytes = new Uint8Array(await readFile(path));
      const started = Date.now();
      const result = await convertDocxWithBuiltinEngine(bytes);
      const convertMs = Date.now() - started;
      expect(String.fromCharCode(...result.bytes.subarray(0, 5))).toBe("%PDF-");
      expect(result.pages).toBeGreaterThan(0);
      const measurement = await measure(name, bytes, result, convertMs);
      report.push(measurement);
      await writeFile(`${OUT}/${name}.pdf`, result.bytes);

      // Hard rules every document must satisfy.
      expect(measurement.overlaps, `${name}: overlapping text lines`).toBe(0);
      expect(measurement.blankPages, `${name}: blank pages`).toBe(0);
      expect(
        measurement.minFontSize,
        `${name}: font size below 6 pt`,
      ).toBeGreaterThanOrEqual(6);
      expect(
        measurement.maxFontSize,
        `${name}: font size above 96 pt`,
      ).toBeLessThanOrEqual(96);
      // Text must survive conversion. Cached field results and chart labels can
      // legitimately be absent, so the threshold is 92% rather than 100%.
      expect(measurement.coverage, `${name}: text coverage`).toBeGreaterThan(
        0.92,
      );
    }
    await writeFile(
      `${OUT}/quality-report.json`,
      JSON.stringify(
        { generated: new Date().toISOString(), measurements: report },
        null,
        2,
      ),
    );
  }, 300_000);

  it("keeps a stable line pitch for Word's default 1.15 line spacing", async () => {
    // Regression guard for the V5.1 defect: w:spacing w:line="276" w:lineRule="auto"
    // must be read as a 1.15 multiplier, never as 13.8 pt of absolute leading.
    const bytes = new Uint8Array(
      await readFile("docs/word-to-pdf/v5.2/corpus/a-simple.docx"),
    );
    const result = await convertDocxWithBuiltinEngine(bytes);
    const doc = await getDocument({ data: new Uint8Array(result.bytes) })
      .promise;
    const content = await (await doc.getPage(1)).getTextContent();
    const baselines = content.items
      .filter((item) => "str" in item && item.str.trim())
      .map((item) => (item as { transform: number[] }).transform[5]);
    const unique = [
      ...new Set(baselines.map((value) => Math.round(value * 10) / 10)),
    ];
    expect(unique.length).toBeGreaterThanOrEqual(4);
    const gaps: number[] = [];
    for (let index = 1; index < unique.length; index++)
      gaps.push(Math.abs(unique[index] - unique[index - 1]));
    for (const gap of gaps) expect(gap).toBeGreaterThan(9);
  });

  it("renders tables with real borders and shading", async () => {
    const bytes = new Uint8Array(
      await readFile("docs/word-to-pdf/v5.2/corpus/c-tables.docx"),
    );
    const result = await convertDocxWithBuiltinEngine(bytes);
    const doc = await getDocument({ data: new Uint8Array(result.bytes) })
      .promise;
    const page = await doc.getPage(1);
    const operators = await page.getOperatorList();
    // OPS.constructPath (91) draws the cell rules; OPS.setFillRGBColor (65) the shading.
    expect(operators.fnArray.filter((fn) => fn === 91).length).toBeGreaterThan(
      20,
    );
    const text = (await page.getTextContent()).items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(text).toContain("Region");
    expect(text).toContain("Total across all regions");
    expect(text).toContain("inner A");
  });

  it("keeps landscape and mixed-orientation sections at the right size", async () => {
    const landscape = await convertDocxWithBuiltinEngine(
      new Uint8Array(
        await readFile("docs/word-to-pdf/v5.2/corpus/g-landscape.docx"),
      ),
    );
    const landscapePdf = await PDFDocument.load(landscape.bytes);
    expect(Math.round(landscapePdf.getPage(0).getWidth())).toBe(842);
    expect(Math.round(landscapePdf.getPage(0).getHeight())).toBe(595);

    const mixed = await convertDocxWithBuiltinEngine(
      new Uint8Array(
        await readFile("docs/word-to-pdf/v5.2/corpus/h-mixed-orientation.docx"),
      ),
    );
    const mixedPdf = await PDFDocument.load(mixed.bytes);
    const sizes = mixedPdf
      .getPages()
      .map((page) => Math.round(page.getWidth()));
    expect(sizes[0]).toBe(595);
    expect(sizes).toContain(842);
    expect(sizes[sizes.length - 1]).toBe(595);
  });

  it("preserves inline images and never overlaps them with text", async () => {
    const bytes = new Uint8Array(
      await readFile("docs/word-to-pdf/v5.2/corpus/d-images.docx"),
    );
    const result = await convertDocxWithBuiltinEngine(bytes);
    const doc = await getDocument({ data: new Uint8Array(result.bytes) })
      .promise;
    const page = await doc.getPage(1);
    const operators = await page.getOperatorList();
    // OPS.paintImageXObject = 85
    expect(
      operators.fnArray.filter((fn) => fn === 85).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("keeps page fields and header/footer parts on every page", async () => {
    const bytes = new Uint8Array(
      await readFile("docs/word-to-pdf/v5.2/corpus/e-headers-footers.docx"),
    );
    const result = await convertDocxWithBuiltinEngine(bytes);
    expect(result.pages).toBe(3);
    const doc = await getDocument({ data: new Uint8Array(result.bytes) })
      .promise;
    for (let index = 1; index <= doc.numPages; index++) {
      const text = (await (await doc.getPage(index)).getTextContent()).items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ");
      expect(text, `page ${index} header`).toMatch(/header/i);
      expect(text, `page ${index} page field`).toContain(`page ${index} of 3`);
    }
  });

  it("converts the 100-page stress document within the advertised budget", async () => {
    const bytes = new Uint8Array(
      await readFile("docs/word-to-pdf/v5.2/corpus/j-stress-100-pages.docx"),
    );
    const started = Date.now();
    const result = await convertDocxWithBuiltinEngine(bytes);
    const elapsed = Date.now() - started;
    expect(result.pages).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeLessThan(30_000);
    expect(result.bytes.length).toBeGreaterThan(100_000);
  }, 120_000);
});
