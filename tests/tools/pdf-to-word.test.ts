import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { hasPdfMagic } from "@/lib/tools/pdf-to-word/extract";
import {
  groupLines,
  structureDocument,
  structurePage,
} from "@/lib/tools/pdf-to-word/structure";
import { buildDocx } from "@/lib/tools/pdf-to-word/render-docx";
import type { ExtractedPage, PdfTextItem } from "@/lib/tools/pdf-to-word/types";
import { PdfToWordError } from "@/lib/tools/pdf-to-word/types";

const item = (
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize = 11,
  bold = false,
): PdfTextItem => ({ text, x, y, width, fontSize, bold, italic: false });

const TINY_PNG = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  ),
);

function samplePage(): ExtractedPage {
  return {
    widthPt: 612,
    heightPt: 792,
    charCount: 500,
    fromOcr: false,
    items: [
      item("Quarterly Report", 72, 60, 210, 24, true),
      item("The quick brown fox jumps over", 72, 110, 210),
      item("the lazy dog near the river bank.", 72, 126, 215),
      item("This docu-", 72, 160, 70),
      item("ment explains the process clearly.", 72, 176, 220),
      item("• First point", 72, 210, 90),
      item("• Second point", 72, 228, 100),
      item("Name", 72, 270, 40),
      item("Score", 300, 270, 45),
      item("Asha", 72, 288, 35),
      item("91", 300, 288, 20),
      item("Ravi", 72, 306, 30),
      item("87", 300, 306, 20),
    ],
    images: [
      {
        x: 72,
        y: 340,
        width: 200,
        height: 120,
        png: TINY_PNG,
        pixelWidth: 1,
        pixelHeight: 1,
      },
    ],
  };
}

describe("hasPdfMagic", () => {
  it("accepts real PDF signatures, rejects other files", () => {
    expect(hasPdfMagic(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(hasPdfMagic(new TextEncoder().encode("hello world"))).toBe(false);
    expect(hasPdfMagic(new TextEncoder().encode("junk%PDF-1.4"))).toBe(true);
    expect(hasPdfMagic(new Uint8Array(0))).toBe(false);
  });
});

describe("groupLines", () => {
  it("merges same-baseline runs and inserts spaces at gaps", () => {
    const lines = groupLines([
      item("Hello", 72, 100, 40),
      item("wide", 130, 100, 35),
      item("Next line", 72, 120, 60),
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("Hello wide");
    expect(lines[1].text).toBe("Next line");
  });
});

describe("structurePage", () => {
  const page = structurePage(samplePage());

  it("detects the heading at level 1", () => {
    const heading = page.blocks.find((b) => b.kind === "heading");
    expect(heading).toMatchObject({ kind: "heading", level: 1 });
    if (heading?.kind === "heading") {
      expect(heading.runs.map((r) => r.text).join("")).toBe("Quarterly Report");
    }
  });

  it("merges wrapped lines into one paragraph and dehyphenates", () => {
    const paragraphs = page.blocks.filter((b) => b.kind === "paragraph");
    const texts = paragraphs.map((p) =>
      p.kind === "paragraph" ? p.runs.map((r) => r.text).join("") : "",
    );
    expect(texts).toContain(
      "The quick brown fox jumps over the lazy dog near the river bank.",
    );
    expect(texts.some((t) => t.includes("document explains"))).toBe(true);
  });

  it("dehyphenates when the hyphen ends a separate run", () => {
    const hyphenPage = structurePage({
      widthPt: 612,
      heightPt: 792,
      charCount: 80,
      fromOcr: false,
      items: [
        item("The team focused on", 72, 120, 130),
        item("fulfil-", 210, 120, 40),
        item("ment speed improves delivery overall.", 72, 136, 240),
      ],
      images: [],
    });
    const paragraph = hyphenPage.blocks.find((b) => b.kind === "paragraph");
    const text =
      paragraph?.kind === "paragraph"
        ? paragraph.runs.map((r) => r.text).join("")
        : "";
    expect(text).toContain("fulfilment speed");
  });

  it("groups bullets into a list with markers stripped", () => {
    const list = page.blocks.find((b) => b.kind === "list");
    expect(list).toBeDefined();
    if (list?.kind === "list") {
      expect(list.ordered).toBe(false);
      expect(list.items).toHaveLength(2);
      expect(list.items[0].map((r) => r.text).join("")).toBe("First point");
    }
  });

  it("detects the 3x2 table", () => {
    const table = page.blocks.find((b) => b.kind === "table");
    expect(table).toBeDefined();
    if (table?.kind === "table") {
      expect(table.rows).toEqual([
        ["Name", "Score"],
        ["Asha", "91"],
        ["Ravi", "87"],
      ]);
    }
  });

  it("keeps the image as an image block", () => {
    expect(page.blocks.some((b) => b.kind === "image")).toBe(true);
  });
});

describe("structureDocument", () => {
  it("removes running footers repeated across pages", () => {
    const makePage = (body: string): ExtractedPage => ({
      widthPt: 612,
      heightPt: 792,
      charCount: 100,
      fromOcr: false,
      items: [
        item(body, 72, 120, 300),
        item(body.replace("Page", "More text on page"), 72, 140, 320),
        item("QUICKKIT Internal", 72, 740, 120),
      ],
      images: [],
    });
    const { pages, removedRunningLines } = structureDocument([
      makePage("Page one body text here for reading."),
      makePage("Page two body text here for reading."),
      makePage("Page three body text here for reading."),
    ]);
    expect(removedRunningLines).toBe(3);
    const allText = pages
      .flatMap((p) => p.blocks)
      .map((b) =>
        b.kind === "paragraph" || b.kind === "heading"
          ? b.runs.map((r) => r.text).join("")
          : "",
      )
      .join(" ");
    expect(allText).not.toContain("QUICKKIT Internal");
    expect(allText).toContain("body text");
  });
});

describe("buildDocx", () => {
  it("produces a genuine DOCX (OOXML zip) in clean mode", async () => {
    const { pages } = structureDocument([samplePage()]);
    const blob = await buildDocx(pages, "clean", "sample.pdf");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // ZIP magic, not a renamed PDF.
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    expect(strFromU8(bytes.subarray(0, 4))).not.toBe("%PDF");

    const unzipped = unzipSync(bytes);
    expect(Object.keys(unzipped)).toContain("[Content_Types].xml");
    expect(Object.keys(unzipped)).toContain("word/document.xml");
    const xml = strFromU8(unzipped["word/document.xml"]);
    expect(xml).toContain("Quarterly Report");
    expect(xml).toContain("Heading1");
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain("Asha");
    expect(xml).toContain("First point");
    expect(Object.keys(unzipped).some((k) => k.startsWith("word/media/"))).toBe(
      true,
    );
    const numbering = strFromU8(unzipped["word/numbering.xml"]);
    expect(numbering).toContain("bullet");
  });

  it("keeps original page size per section in layout mode", async () => {
    const { pages } = structureDocument([samplePage(), samplePage()]);
    const blob = await buildDocx(pages, "layout", "sample.pdf");
    const unzipped = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const xml = strFromU8(unzipped["word/document.xml"]);
    // 612pt x 792pt = 12240 x 15840 twips.
    expect(xml).toContain('w:w="12240"');
    expect(xml).toContain('w:h="15840"');
    expect(xml.match(/<w:sectPr/g)).toHaveLength(2);
  });

  it("refuses to build a document from no content", async () => {
    const empty: ExtractedPage = {
      widthPt: 612,
      heightPt: 792,
      charCount: 0,
      fromOcr: false,
      items: [],
      images: [],
    };
    const { pages } = structureDocument([empty]);
    await expect(buildDocx(pages, "clean", "empty.pdf")).rejects.toMatchObject({
      kind: "empty",
    });
    await expect(buildDocx(pages, "clean", "empty.pdf")).rejects.toBeInstanceOf(
      PdfToWordError,
    );
  });
});
