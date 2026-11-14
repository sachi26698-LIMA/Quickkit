import { readFileSync } from "node:fs";
import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import {
  inspectImage,
  inspectPdf,
  inspectDocx,
} from "../lib/tools/security/metadata";

describe("local metadata inspection", () => {
  it("reports bounded image metadata and dimensions", async () => {
    const bytes = readFileSync("tests/fixtures/image-to-text/blank.png");
    const file = new File([bytes], "blank.png", { type: "image/png" });
    const output = await inspectImage(file);
    expect(output).toContain("Format: PNG");
    expect(output).toContain("scanned for selected metadata markers");
  });
  it("reads DOCX properties without opening other package parts", async () => {
    const bytes = readFileSync("docs/word-to-pdf/v5.2/corpus/a-simple.docx");
    const result = await inspectDocx(new File([bytes], "example.docx"));
    expect(result).toContain("Only common DOCX");
    await expect(
      inspectDocx(new File(["not a zip"], "bad.docx")),
    ).rejects.toThrow();
  });
  it("rejects spoofed image content", async () => {
    await expect(
      inspectImage(new File(["not a png"], "fake.png", { type: "image/png" })),
    ).rejects.toThrow();
  });
  it("reads PDF info without asserting all metadata is covered", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.setTitle("Test title");
    pdf.setAuthor("Test author");
    const file = new File([new Uint8Array(await pdf.save())], "test.pdf", {
      type: "application/pdf",
    });
    const result = await inspectPdf(file);
    expect(result).toContain("Title: Test title");
    expect(result).toContain("Author: Test author");
    expect(result).toContain("XMP");
    await expect(
      inspectPdf(new File(["broken"], "bad.pdf", { type: "application/pdf" })),
    ).rejects.toThrow();
  });
});

describe("PDF document-level metadata cleaning", () => {
  it("removes Info and catalog XMP, retains pages, and rejects bad input", async () => {
    const { PDFName } = await import("@cantoo/pdf-lib");
    const { cleanPdfDocumentMetadata } =
      await import("../lib/tools/security/metadata");
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.setAuthor("private author");
    pdf.setTitle("private title");
    const xmp = pdf.context.stream("private XMP", {
      Type: "Metadata",
      Subtype: "XML",
    });
    const ref = pdf.context.register(xmp);
    pdf.catalog.set(PDFName.of("Metadata"), ref);
    const before = new File(
      [new Uint8Array(await pdf.save({ useObjectStreams: false }))],
      "a.pdf",
    );
    const cleaned = await cleanPdfDocumentMetadata(before);
    const bytes = new Uint8Array(await cleaned.arrayBuffer());
    const check = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(check.getPageCount()).toBe(1);
    expect(check.context.trailerInfo.Info).toBeUndefined();
    expect(check.catalog.has(PDFName.of("Metadata"))).toBe(false);
    expect(new TextDecoder().decode(bytes)).not.toContain("private XMP");
    await expect(
      cleanPdfDocumentMetadata(new File(["bad"], "x.pdf")),
    ).rejects.toThrow();
  });
});

it("removes page metadata references without destroying shared objects", async () => {
  const { PDFName } = await import("@cantoo/pdf-lib");
  const { cleanPdfDocumentMetadata } =
    await import("../lib/tools/security/metadata");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const unshared = pdf.context.register(
    pdf.context.stream("page-private-metadata"),
  );
  const shared = pdf.context.register(pdf.context.stream("shared-not-removed"));
  page.node.set(PDFName.of("Metadata"), unshared);
  pdf.catalog.set(PDFName.of("Metadata"), shared);
  page.node.set(PDFName.of("CustomReference"), shared);
  const input = new File(
    [new Uint8Array(await pdf.save({ useObjectStreams: false }))],
    "input.pdf",
  );
  const before = await inspectPdf(input);
  expect(before).toContain("Pages with metadata references: 1");
  const cleaned = await cleanPdfDocumentMetadata(input);
  const bytes = new Uint8Array(await cleaned.arrayBuffer());
  const after = await PDFDocument.load(bytes, { updateMetadata: false });
  expect(after.getPages()[0].node.has(PDFName.of("Metadata"))).toBe(false);
  expect(after.context.lookup(shared)).toBeDefined();
  const raw = new TextDecoder().decode(bytes);
  expect(raw).not.toContain("page-private-metadata");
  expect(raw).toContain("shared-not-removed");
  expect(await inspectPdf(new File([cleaned], "output.pdf"))).toContain(
    "Pages with metadata references: 0",
  );
});

it("finds PNG metadata after 256 KiB rather than silently stopping early", async () => {
  const bytes = readFileSync("tests/fixtures/image-to-text/blank.png");
  // Insert a long ancillary chunk followed by an XMP marker, immediately before IEND.
  function chunk(type: string, data: Buffer) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)]);
  }
  const source = Buffer.concat([
    bytes.subarray(0, bytes.length - 12),
    chunk("tEXt", Buffer.alloc(270_000, 65)),
    chunk("iTXt", Buffer.from("XML:com.adobe.xmp\0example")),
    bytes.subarray(bytes.length - 12),
  ]);
  const output = await inspectImage(
    new File([source], "image.png", { type: "image/png" }),
  );
  expect(output).toContain("XMP detected: yes");
});

it("reports shallow PDF attachment, annotation and form indicators without claiming absence", async () => {
  const { PDFName } = await import("@cantoo/pdf-lib");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  page.node.set(
    PDFName.of("Annots"),
    pdf.context.obj([
      { Type: "Annot", Subtype: "Text", Contents: "private note" },
    ]),
  );
  pdf.catalog.set(PDFName.of("AcroForm"), pdf.context.obj({ Fields: [] }));
  await pdf.attach(
    new TextEncoder().encode("private attachment"),
    "secret.txt",
    { mimeType: "text/plain" },
  );
  const report = await inspectPdf(
    new File([new Uint8Array(await pdf.save())], "input.pdf"),
  );
  expect(report).toContain("Catalog embedded-file name tree: present");
  expect(report).toContain("Page annotation references: 1");
  expect(report).toContain("Interactive form reference: present");
  expect(report).toContain("does not prove");
  expect(report).not.toContain("private note");
  expect(report).not.toContain("private attachment");
});

it("reports shallow DOCX package indicators without reading or revealing their contents", async () => {
  const { zipSync, strToU8 } = await import("fflate");
  const fixture = zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "word/document.xml": strToU8("<document>secret body</document>"),
    "word/comments.xml": strToU8("<comments>secret comment</comments>"),
    "docProps/custom.xml": strToU8("<properties>secret custom</properties>"),
    "word/embeddings/secret.bin": strToU8("secret embedded"),
    "word/vbaProject.bin": strToU8("secret macro"),
  });
  const report = await inspectDocx(new File([fixture], "sample.docx"));
  expect(report).toContain("Comments part: present");
  expect(report).toContain("Custom properties part: present");
  expect(report).toContain("Embedded object entries: present");
  expect(report).toContain("VBA project entry: present");
  expect(report).toContain("absent indicator does not establish safety");
  expect(report).not.toContain("secret");
});
