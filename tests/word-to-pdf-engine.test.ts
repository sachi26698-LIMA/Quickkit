// A fake executable verifies native-process orchestration only, NOT DOCX rendering fidelity.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  access,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { Document, Packer, Paragraph } from "docx";
import { PDFDocument } from "@cantoo/pdf-lib";
import { convert } from "../lib/tools/word-to-pdf/engine";
import { defaults } from "../lib/tools/word-to-pdf/settings";

let dir: string, previous: string | undefined;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "quickkit-engine-test-"));
  previous = process.env.WORD_TO_PDF_SOFFICE;
});
afterEach(async () => {
  if (previous === undefined) delete process.env.WORD_TO_PDF_SOFFICE;
  else process.env.WORD_TO_PDF_SOFFICE = previous;
  await rm(dir, { recursive: true, force: true });
});
async function source() {
  return new Uint8Array(
    await Packer.toBuffer(
      new Document({
        sections: [{ children: [new Paragraph("Test source")] }],
      }),
    ),
  );
}
async function executable(pageCount = 2, hang = false) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) pdf.addPage([595, 842]);
  const script = join(dir, "fake-soffice.cjs"),
    record = join(dir, "args.json");
  await writeFile(
    script,
    `#!${process.execPath}\nconst fs = require('node:fs'); fs.writeFileSync(${JSON.stringify(record + ".environment.json")}, JSON.stringify({secret:process.env.QUICKKIT_NATIVE_TEST_SECRET,home:process.env.HOME,lang:process.env.LANG})); const path = require('node:path'); fs.writeFileSync(${JSON.stringify(record)}, JSON.stringify(process.argv.slice(2))); ${hang ? "setInterval(() => {}, 1000);" : `fs.writeFileSync(path.join(path.dirname(process.argv.at(-1)), 'input.pdf'), Buffer.from(${JSON.stringify(Buffer.from(await pdf.save()).toString("base64"))}, 'base64'));`}`,
    { mode: 0o700 },
  );
  process.env.WORD_TO_PDF_SOFFICE = script;
  return record;
}
describe("native-process adapter with a fake executable (not rendering QA)", () => {
  it("applies real PDF selection and overlays, passes export filters, removes private temp files", async () => {
    const record = await executable();
    const stages: string[] = [];
    const result = await convert(
      await source(),
      {
        ...defaults,
        pages: "2",
        numbering: true,
        header: "Header",
        footer: "Footer",
        quality: "high",
      },
      new AbortController().signal,
      (stage) => stages.push(stage),
    );
    expect(result.pages).toBe(1);
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBe(595);
    const args = JSON.parse(await readFile(record, "utf8")) as string[];
    expect(args.find((a) => a.startsWith("pdf:writer_pdf_Export:"))).toContain(
      '"ReduceImageResolution":{"type":"boolean","value":"false"}',
    );
    expect(stages).toHaveLength(3);
    await expect(access(dirname(args.at(-1)!))).rejects.toThrow();
  });
  it("does not inherit web secrets into the local child (still not an OS sandbox)", async () => {
    vi.stubEnv("QUICKKIT_NATIVE_TEST_SECRET", "synthetic-sentinel");
    try {
      const record = await executable();
      await convert(
        await source(),
        defaults,
        new AbortController().signal,
        () => {},
      );
      const environment = JSON.parse(
        await readFile(record + ".environment.json", "utf8"),
      );
      expect(environment.secret).toBeUndefined();
      expect(environment.lang).toBe("C.UTF-8");
      expect(environment.home).toContain("quickkit-word-");
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("rejects over-limit native output and still cleans up", async () => {
    const record = await executable(101);
    await expect(
      convert(await source(), defaults, new AbortController().signal, () => {}),
    ).rejects.toThrow(/100-page/);
    const args = JSON.parse(await readFile(record, "utf8"));
    await expect(access(dirname(args.at(-1)))).rejects.toThrow();
  });
  it("cancels the active process and cleans its directory", async () => {
    const record = await executable(1, true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 250);
    try {
      await expect(
        convert(await source(), defaults, controller.signal, () => {}),
      ).rejects.toThrow(/cancelled/);
    } finally {
      clearTimeout(timer);
    }
    const args = JSON.parse(await readFile(record, "utf8"));
    await expect(access(dirname(args.at(-1)))).rejects.toThrow();
  });
  it("rejects corrupted packages before launching a native process", async () => {
    await executable();
    await expect(
      convert(
        new Uint8Array([1, 2]),
        defaults,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow(/DOCX/);
    expect(await readdir(dir)).not.toContain("args.json");
  });
});
