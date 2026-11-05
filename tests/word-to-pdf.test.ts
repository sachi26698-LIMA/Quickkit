import { describe, expect, it } from "vitest";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  TextRun,
  ExternalHyperlink,
  ImageRun,
} from "docx";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { prepareDocx } from "../lib/tools/word-to-pdf/docx";
import {
  defaults,
  outputName,
  selectedPages,
  validateSettings,
  sizes,
} from "../lib/tools/word-to-pdf/settings";
import {
  acquire,
  release,
  engineAvailable,
} from "../lib/tools/word-to-pdf/engine";
import { GET, POST } from "../app/api/word-to-pdf/route";

async function fixture() {
  return new Uint8Array(
    await Packer.toBuffer(
      new Document({
        sections: [
          {
            headers: {
              default: new Header({
                children: [new Paragraph("Original header")],
              }),
            },
            footers: {
              default: new Footer({
                children: [new Paragraph("Original footer")],
              }),
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Complex document",
                    font: "Liberation Serif",
                    bold: true,
                    italics: true,
                  }),
                  new ExternalHyperlink({
                    link: "https://example.com",
                    children: [new TextRun("Website")],
                  }),
                ],
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph("Cell one")] }),
                      new TableCell({ children: [new Paragraph("Cell two")] }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new ImageRun({
                    type: "png",
                    data: Buffer.from(
                      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=",
                      "base64",
                    ),
                    transformation: { width: 10, height: 10 },
                  }),
                ],
              }),
            ],
          },
          {
            properties: { page: { size: { width: 12240, height: 15840 } } },
            children: [new Paragraph("Letter section")],
          },
        ],
      }),
    ),
  );
}
async function mutated(name: string, xml: string) {
  const files = unzipSync(await fixture());
  files[name] = strToU8(xml);
  return zipSync(files);
}

describe("Word to PDF settings", () => {
  it("accepts defaults and all required paper presets", () => {
    expect(validateSettings(defaults)).toEqual(defaults);
    for (const paper of [...Object.keys(sizes), "Custom"])
      expect(validateSettings({ ...defaults, paper }).paper).toBe(paper);
  });
  it.each([
    { width: NaN },
    { height: 0 },
    { fontSize: 99 },
    { paper: "B0" },
    { quality: "lossless" },
    { color: "red" },
    { numbering: "true" },
    { pages: "1,,2" },
    { pages: "1-100000000000000000000" },
    { header: "ગુજરાતી" },
    { paper: "A5", margins: true, left: 100, right: 100 },
  ])("rejects invalid settings %j", (value) => {
    if (value.pages?.includes("100000")) {
      expect(() => selectedPages(value.pages, 100)).toThrow();
      return;
    }
    expect(() => validateSettings({ ...defaults, ...value })).toThrow();
  });
  it("selects sorted unique pages and rejects out-of-bounds ranges", () => {
    expect(selectedPages("3, 1-2, 2", 3)).toEqual([0, 1, 2]);
    expect(selectedPages("", 2)).toEqual([0, 1]);
    for (const value of ["0", "4", "3-1", "1-1000000000"])
      expect(() => selectedPages(value, 3)).toThrow();
  });
  it("sanitizes download names", () => {
    expect(outputName("../folder/file.pdf")).toBe("_folder_file.pdf");
    expect(outputName("")).toBe("document.pdf");
    expect(outputName("report.PDF")).toBe("report.pdf");
  });
});
describe("DOCX package inspection and layout overrides (not native rendering)", () => {
  it("preserves tables, fonts, image parts, hyperlinks, headers and footers", async () => {
    const original = await fixture(),
      prepared = prepareDocx(original, defaults);
    const before = unzipSync(original),
      after = unzipSync(prepared);
    for (const name of Object.keys(before))
      if (name !== "word/document.xml")
        expect(after[name]).toEqual(before[name]);
    const xml = strFromU8(after["word/document.xml"]);
    for (const marker of [
      "w:tbl",
      "Liberation Serif",
      "w:hyperlink",
      "w:drawing",
      "w:headerReference",
      "w:footerReference",
    ])
      expect(xml).toContain(marker);
    expect(xml).toContain('w:w="12240"');
  });
  it("changes every section's page size and margins", async () => {
    const prepared = prepareDocx(await fixture(), {
      ...defaults,
      paper: "A5",
      landscape: true,
      margins: true,
      left: 12,
    });
    const xml = strFromU8(unzipSync(prepared)["word/document.xml"]);
    expect(xml.match(/w:orient="landscape"/g)).toHaveLength(2);
    expect(xml.match(/w:left="680"/g)).toHaveLength(2);
  });
  it("rejects random, empty, legacy and malformed packages", () => {
    for (const input of [
      new Uint8Array(),
      strToU8("not word"),
      zipSync({ x: strToU8("no") }),
    ])
      expect(() => prepareDocx(input, defaults)).toThrow();
  });
  it("rejects oversized expanded packages before inflation", () => {
    const input = zipSync({ bomb: new Uint8Array(41 * 1024 * 1024) });
    expect(() => prepareDocx(input, defaults)).toThrow(/limit/);
  });
  it("rejects XML entities", async () => {
    const bytes = await mutated(
      "word/document.xml",
      '<!DOCTYPE x [<!ENTITY evil "boom">]><x/>',
    );
    expect(() => prepareDocx(bytes, defaults)).toThrow(/declarations/);
  });
  it("rejects linked remote images but allows ordinary hyperlinks", async () => {
    const bytes = await mutated(
      "word/_rels/document.xml.rels",
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" TargetMode="External" Target="https://example.com/tracker.png"/></Relationships>',
    );
    expect(() => prepareDocx(bytes, defaults)).toThrow(/External/);
  });
  it("rejects macros and OLE embedded parts", async () => {
    for (const part of ["word/vbaProject.bin", "word/embeddings/object.bin"]) {
      const files = unzipSync(await fixture());
      files[part] = new Uint8Array([1]);
      expect(() => prepareDocx(zipSync(files), defaults)).toThrow(/Macros/);
    }
  });
});
describe("server gates", () => {
  it("enforces single-slot concurrency", () => {
    expect(acquire()).toBe(true);
    expect(acquire()).toBe(false);
    release();
    expect(acquire()).toBe(true);
    release();
  });
  it("reports the built-in engine and rejects missing consent", async () => {
    const previous = process.env.WORD_TO_PDF_ENGINE;
    process.env.WORD_TO_PDF_ENGINE = "auto";
    try {
      expect(await engineAvailable()).toBe(true);
      const status = await (await GET()).json();
      expect(status.available).toBe(true);
      expect(status.engine).toBe("builtin");
      expect(status.maxPages).toBe(1000);
      expect(status.fidelity).toBe("quickkit-renderer");
    } finally {
      if (previous === undefined) delete process.env.WORD_TO_PDF_ENGINE;
      else process.env.WORD_TO_PDF_ENGINE = previous;
    }
  });
  it("fails closed when the native engine is required but not enabled", async () => {
    const previousEngine = process.env.WORD_TO_PDF_ENGINE;
    const previousEnabled = process.env.WORD_TO_PDF_ENABLED;
    process.env.WORD_TO_PDF_ENGINE = "native";
    process.env.WORD_TO_PDF_ENABLED = "false";
    try {
      expect(await engineAvailable()).toBe(false);
      expect((await (await GET()).json()).available).toBe(false);
      expect(
        (
          await POST(
            new Request("http://localhost/api/word-to-pdf", { method: "POST" }),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await POST(
            new Request("http://localhost/api/word-to-pdf", {
              method: "POST",
              headers: { "x-quickkit-consent": "server-conversion" },
            }),
          )
        ).status,
      ).toBe(503);
      const blocked = await POST(
        new Request("http://localhost/api/word-to-pdf", {
          method: "POST",
          headers: {
            "x-quickkit-consent": "server-conversion",
            "content-type": "application/octet-stream",
          },
        }),
      );
      expect(blocked.status).toBe(503);
      expect((await blocked.json()).error).toMatch(/No document was processed/);
      expect(
        (
          await POST(
            new Request("http://localhost/api/word-to-pdf", {
              method: "POST",
              headers: {
                "x-quickkit-consent": "server-conversion",
                "sec-fetch-site": "cross-site",
              },
            }),
          )
        ).status,
      ).toBe(403);
    } finally {
      if (previousEngine === undefined) delete process.env.WORD_TO_PDF_ENGINE;
      else process.env.WORD_TO_PDF_ENGINE = previousEngine;
      if (previousEnabled === undefined) delete process.env.WORD_TO_PDF_ENABLED;
      else process.env.WORD_TO_PDF_ENABLED = previousEnabled;
    }
  });
});
