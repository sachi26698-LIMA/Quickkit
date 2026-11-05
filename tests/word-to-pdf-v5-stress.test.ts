/**
 * V5 stress ladder: 100 / 250 / 500 / 750 / 1000 pages, run on the REAL
 * built-in DOCX renderer (actual generated pages), then through the export
 * pipeline. Metrics are written to test-results/word-to-pdf-v5-stress.json.
 */
import { afterAll, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { Document, Packer, Paragraph, TextRun, PageBreak } from "docx";
import { PDFDocument } from "@cantoo/pdf-lib";
import { defaults } from "../lib/tools/word-to-pdf/settings";
import { processPdf } from "../lib/tools/word-to-pdf/process-pdf";
import { convertDocxWithBuiltinEngine } from "../lib/tools/word-to-pdf/render";

const LADDER = [100, 250, 500, 750, 1000];
const results: Record<string, unknown>[] = [];

afterAll(async () => {
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/word-to-pdf-v5-stress.json",
    JSON.stringify(
      {
        kind: "Actual DOCX -> PDF conversions with the built-in renderer plus authored PDF export stress",
        cap: 1000,
        rssNote:
          "RSS is sampled before/after each case. maxRSS is process-lifetime, not per-case peak.",
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        results,
      },
      null,
      2,
    ),
  );
});

async function docx(pages: number) {
  const children: Paragraph[] = [];
  for (let i = 0; i < pages; i++) {
    children.push(
      new Paragraph({
        children: [
          ...(i ? [new PageBreak()] : []),
          new TextRun({ text: `Stress page ${i + 1} of ${pages}`, bold: true }),
        ],
      }),
      new Paragraph(
        `Body text for page ${i + 1}. It exercises run layout, wrapping, spacing and pagination for the stress ladder.`,
      ),
    );
  }
  return new Uint8Array(
    await Packer.toBuffer(new Document({ sections: [{ children }] })),
  );
}

describe("V5 stress ladder (actual conversion, bounded processing)", () => {
  for (const pages of LADDER) {
    it(`converts and exports ${pages} pages`, async () => {
      const rssBefore = process.memoryUsage().rss;
      const buildStart = performance.now();
      const source = await docx(pages);
      const buildMs = performance.now() - buildStart;

      const renderStart = performance.now();
      const converted = await convertDocxWithBuiltinEngine(source, {
        maxPages: 1000,
      });
      const renderMs = performance.now() - renderStart;
      expect(converted.pages).toBe(pages);
      expect(String.fromCharCode(...converted.bytes.subarray(0, 5))).toBe(
        "%PDF-",
      );

      const parsed = await PDFDocument.load(converted.bytes);
      expect(parsed.getPageCount()).toBe(pages);

      const exportStart = performance.now();
      const final = await processPdf(converted.bytes, {
        ...defaults,
        numbering: true,
        numberFormat: "Page {n} of {total}",
        watermarkText: "QUICKKIT STRESS",
      });
      const exportMs = performance.now() - exportStart;
      expect(final.pages).toBe(pages);
      const exported = await PDFDocument.load(final.bytes);
      expect(exported.getPageCount()).toBe(pages);

      results.push({
        pages,
        docxBuildMs: Math.round(buildMs),
        convertMs: Math.round(renderMs),
        exportMs: Math.round(exportMs),
        docxBytes: source.length,
        pdfBytes: converted.bytes.length,
        finalBytes: final.bytes.length,
        rssBeforeMiB: +(rssBefore / 2 ** 20).toFixed(1),
        rssAfterMiB: +(process.memoryUsage().rss / 2 ** 20).toFixed(1),
        processMaxRssMiB: +(process.resourceUsage().maxRSS / 1024).toFixed(1),
        status: "PASS",
      });
    }, 180_000);
  }

  it("refuses to exceed the documented 1,000-page ceiling", async () => {
    const source = await docx(1001);
    await expect(
      convertDocxWithBuiltinEngine(source, { maxPages: 1000 }),
    ).rejects.toThrow(/more than 1000 pages/);
  }, 180_000);
});
