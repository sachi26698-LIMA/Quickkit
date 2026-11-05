import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import {
  convert,
  engineStatus,
  MAX_PAGES,
} from "../lib/tools/word-to-pdf/engine";
import { processPdf } from "../lib/tools/word-to-pdf/process-pdf";
import { defaults } from "../lib/tools/word-to-pdf/settings";

const signal = () => new AbortController().signal;

afterEach(() => {
  vi.unstubAllEnvs();
});

async function fixture(name = "docs/word-to-pdf/v4/fixtures/complex.docx") {
  return new Uint8Array(await readFile(name));
}

describe("V5 engine selection and conversion lifecycle", () => {
  it("reports the built-in renderer when no native engine is enabled", async () => {
    vi.stubEnv("WORD_TO_PDF_ENGINE", "auto");
    vi.stubEnv("WORD_TO_PDF_ENABLED", "false");
    vi.stubEnv("WORD_TO_PDF_WORKER_URL", "");
    const status = await engineStatus();
    expect(status.available).toBe(true);
    expect(status.engine).toBe("builtin");
    expect(status.native).toBe(false);
    expect(status.maxPages).toBe(MAX_PAGES);
    expect(status.notes.join(" ")).toMatch(/LibreOffice/);
  });

  it("converts a DOCX end-to-end and returns real bytes plus stages", async () => {
    vi.stubEnv("WORD_TO_PDF_ENGINE", "builtin");
    const stages: string[] = [];
    const result = await convert(await fixture(), defaults, signal(), (event) =>
      stages.push(event.stage),
    );
    expect(result.engine).toBe("builtin");
    expect(result.native).toBe(false);
    expect(result.pages).toBe(5);
    expect(result.sourcePages).toBe(5);
    expect(String.fromCharCode(...result.source.subarray(0, 5))).toBe("%PDF-");
    expect(String.fromCharCode(...result.bytes.subarray(0, 5))).toBe("%PDF-");
    expect(stages[0]).toMatch(/Validating DOCX/);
    expect(stages.at(-1)).toMatch(/settings/i);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("applies page-size and margin rewrites inside the renderer once", async () => {
    vi.stubEnv("WORD_TO_PDF_ENGINE", "builtin");
    const result = await convert(
      await fixture(),
      {
        ...defaults,
        paper: "A5",
        margins: true,
        top: 15,
        right: 15,
        bottom: 15,
        left: 15,
      },
      signal(),
      () => undefined,
    );
    const pdf = await PDFDocument.load(result.bytes);
    expect(Math.round(pdf.getPage(0).getWidth())).toBe(420);
    expect(Math.round(pdf.getPage(0).getHeight())).toBe(595);
  });

  it("does not shrink pages that the base renderer already sized", async () => {
    const source = await PDFDocument.create();
    source.addPage([420, 595]);
    const bytes = await source.save();
    const result = await processPdf(
      bytes,
      {
        ...defaults,
        paper: "A5",
        margins: true,
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
      undefined,
    );
    const pdf = await PDFDocument.load(result.bytes);
    expect(Math.round(pdf.getPage(0).getWidth())).toBe(420);
    expect(Math.round(pdf.getPage(0).getHeight())).toBe(595);
  });

  it("cancels before conversion when the caller aborts", async () => {
    vi.stubEnv("WORD_TO_PDF_ENGINE", "builtin");
    const controller = new AbortController();
    controller.abort();
    await expect(
      convert(await fixture(), defaults, controller.signal, () => undefined),
    ).rejects.toThrow();
  });

  it("rejects legacy/malformed packages with a clear message", async () => {
    vi.stubEnv("WORD_TO_PDF_ENGINE", "builtin");
    await expect(
      convert(
        new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2, 3]),
        defaults,
        signal(),
        () => undefined,
      ),
    ).rejects.toThrow(/DOCX/);
  });
});
