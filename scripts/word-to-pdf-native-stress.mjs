// Operator-only native probe. Never enabled by the browser or ordinary unit tests.
import { mkdir, writeFile } from "node:fs/promises";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  PageBreak,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  ImageRun,
} from "docx";
import { PDFDocument } from "@cantoo/pdf-lib";
const base = process.env.WORD_TO_PDF_TEST_URL || "http://127.0.0.1:3001";
const output = "test-results/word-to-pdf-v3-native-stress.json";
const report = {
  date: new Date().toISOString(),
  kind: "Real native DOCX probe; no mock/fallback conversion",
  endpoint: new URL("/api/word-to-pdf", base).toString(),
  engineAvailable: false,
  results: [],
  fidelity:
    "PDF parse/page counts are automated checks, not font/layout fidelity certification. Inspect fonts, tables, images, headers/footers and page breaks manually on the isolated native host.",
  serverPeakRss: null,
};
async function fixture(count) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=",
    "base64",
  );
  const children = [];
  for (let i = 0; i < count; i++) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Native stress fixture page ${i + 1} of ${count}`,
            font: "Arial",
            size: 24,
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Serif sample / pagination and font substitution require manual inspection.",
            font: "Times New Roman",
            size: 20,
          }),
        ],
      }),
    );
    if (i % 10 === 0) {
      children.push(
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Table fixture")] }),
                new TableCell({ children: [new Paragraph(String(i + 1))] }),
              ],
            }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: png,
              type: "png",
              transformation: { width: 32, height: 32 },
            }),
          ],
        }),
      );
    }
    if (i < count - 1)
      children.push(new Paragraph({ children: [new PageBreak()] }));
  }
  return Packer.toBuffer(
    new Document({
      sections: [
        {
          headers: {
            default: new Header({
              children: [new Paragraph("Native fixture header")],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph("Native fixture footer")],
            }),
          },
          children,
        },
      ],
    }),
  );
}
try {
  const availability = await fetch(report.endpoint, {
    signal: AbortSignal.timeout(10_000),
  }).then((r) => r.json());
  report.engineAvailable = availability.available === true;
  if (!report.engineAvailable)
    for (const pages of [100, 500, 1000])
      report.results.push({
        pages,
        status: "BLOCKED",
        reason:
          "Native engine unavailable; no DOCX uploaded and no successful conversion simulated.",
      });
  else if (
    !process.argv.includes("--consent-server-processing") ||
    !process.argv.includes("--isolated-host")
  )
    for (const pages of [100, 500, 1000])
      report.results.push({
        pages,
        status: "BLOCKED",
        reason:
          "Operator must verify isolated native hosting and supply --isolated-host --consent-server-processing. No DOCX uploaded.",
      });
  else
    for (const pages of [100, 500, 1000]) {
      const bytes = await fixture(pages),
        started = performance.now();
      try {
        const response = await fetch(report.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Quickkit-Consent": "server-conversion",
            "X-Quickkit-Settings": "{}",
            "X-Quickkit-Base": "true",
          },
          body: bytes,
          signal: AbortSignal.timeout(155_000),
        });
        if (!response.ok)
          throw new Error(
            `HTTP ${response.status}: ${(await response.json()).error || "native request failed"}`,
          );
        const text = await response.text();
        if (text.length > 72 * 1024 * 1024)
          throw new Error("Oversized native response");
        const events = text
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line)),
          error = events.find((e) => e.error);
        if (error) {
          if (pages > 100 && /100-page limit/.test(error.error)) {
            report.results.push({
              pages,
              status: "EXPECTED GUARD REJECTION",
              reason: error.error,
              durationMs: performance.now() - started,
            });
            continue;
          }
          throw new Error(error.error);
        }
        const result = events.find((e) => e.result);
        if (!result) throw new Error("No native PDF returned");
        const pdf = await PDFDocument.load(
          Buffer.from(result.result, "base64"),
        );
        if (pages > 100)
          throw new Error(
            "Unexpected oversized conversion success; investigate cap before advertising support",
          );
        if (pdf.getPageCount() !== pages)
          throw new Error(
            `Expected ${pages} pages, native produced ${pdf.getPageCount()}`,
          );
        report.results.push({
          pages,
          status:
            "PASS - native PDF parsed, manual fidelity review still required",
          actualPages: pdf.getPageCount(),
          durationMs: performance.now() - started,
        });
      } catch (e) {
        report.results.push({
          pages,
          status: "FAIL",
          reason: e instanceof Error ? e.message : String(e),
          durationMs: performance.now() - started,
        });
      }
    }
} catch (e) {
  for (const pages of [100, 500, 1000])
    report.results.push({
      pages,
      status: "BLOCKED",
      reason: e instanceof Error ? e.message : String(e),
    });
}
await mkdir("test-results", { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.results.some((r) => r.status === "FAIL")) process.exitCode = 1;
else if (report.results.some((r) => r.status === "BLOCKED"))
  process.exitCode = 2;
