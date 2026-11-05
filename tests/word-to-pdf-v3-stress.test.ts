import { afterAll, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { defaults } from "../lib/tools/word-to-pdf/settings";
import { processPdf } from "../lib/tools/word-to-pdf/process-pdf";
import { initialPlan, rotatePages } from "../lib/tools/word-to-pdf/page-plan";
const results: Record<string, unknown>[] = [];
afterAll(async () => {
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/word-to-pdf-v3-stress.json",
    JSON.stringify(
      {
        kind: "Actual authored PDF fixtures, NOT native DOCX conversion",
        productionSourceAndOutputCap: 1000,
        supersededBy: "tests/word-to-pdf-v5-stress.test.ts",
        rssNote:
          "RSS is sampled before/after; maxRSS is cumulative process lifetime, not isolated case peak. Vitest workers and fixtures affect it.",
        results,
      },
      null,
      2,
    ),
  );
});
describe("V3 real PDF fixture stress and large-document guard", () => {
  for (const count of [100])
    it(`${count} actual PDF pages: edit and verify all pages`, async () => {
      const start = performance.now(),
        pdf = await PDFDocument.create();
      for (let i = 0; i < count; i++) {
        const page = pdf.addPage([400 + i, 800]);
        page.drawText(`Authored stress fixture page ${i + 1}`, {
          x: 30,
          y: 700,
          size: 12,
        });
      }
      const source = await pdf.save(),
        fixtureMs = performance.now() - start,
        before = process.memoryUsage().rss,
        editStart = performance.now();
      if (count === 100) {
        let plan = initialPlan(
          count,
          Array.from({ length: count }, (_, i) => count - i - 1),
        );
        plan = rotatePages(plan, ["source-100", "source-1"]);
        const ticks: number[] = [];
        const result = await processPdf(
          source,
          {
            ...defaults,
            visualPlan: plan,
            numbering: true,
            numberFormat: "Page {n} of {total}",
            watermarkText: "AUTHORED STRESS FIXTURE",
          },
          undefined,
          (done) => ticks.push(done),
        );
        const final = await PDFDocument.load(result.bytes);
        expect(final.getPageCount()).toBe(100);
        expect(final.getPage(0).getWidth()).toBe(499);
        expect(final.getPage(99).getWidth()).toBe(400);
        expect(final.getPage(0).getRotation().angle).toBe(90);
        expect(final.getPage(99).getRotation().angle).toBe(90);
        expect(ticks).toEqual(Array.from({ length: 101 }, (_, i) => i));
        const original = await PDFDocument.load(source);
        expect(original.getPage(0).getWidth()).toBe(400);
        expect(original.getPage(0).getRotation().angle).toBe(0);
        results.push({
          pages: count,
          status: "PASS - actual 100-page PDF edited and parsed",
          sourceBytes: source.length,
          outputBytes: result.bytes.length,
          fixtureMs,
          editAndVerifyMs: performance.now() - editStart,
          rssBeforeMiB: before / 2 ** 20,
          rssAfterMiB: process.memoryUsage().rss / 2 ** 20,
          processLifetimeMaxRssMiB: process.resourceUsage().maxRSS / 1024,
        });
      }
    }, 30_000);
});
