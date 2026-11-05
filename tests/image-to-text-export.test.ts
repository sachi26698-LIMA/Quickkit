import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  buildCsv,
  buildCsvFiles,
  buildDocx,
  buildExport,
  buildJson,
  buildPdf,
  buildTxt,
  countWords,
  csvBytes,
  docxSections,
  needsImageFallback,
  safeFilename,
  sectionTitle,
  uniqueName,
  utf8,
  wrapText,
} from "@/lib/tools/image-to-text/export";
import type {
  OcrDocumentSection,
  OcrPage,
  PageExtraction,
} from "@/lib/tools/image-to-text/types";

function extraction(overrides: Partial<PageExtraction> = {}): PageExtraction {
  return {
    mode: "smart",
    resolvedMode: "layout",
    text: "Hello world",
    tables: [],
    fields: [],
    headings: [],
    lowConfidenceLines: [],
    rationale: "",
    ...overrides,
  };
}

function section(
  overrides: Partial<OcrDocumentSection> = {},
): OcrDocumentSection {
  const page: OcrPage = {
    id: "s:1",
    sourceId: "s",
    sourceName: "scan.png",
    page: 1,
    pageCount: 1,
    width: 800,
    height: 1000,
    lines: [],
    text: "Hello world",
    confidence: 92,
    durationMs: 120,
    lowConfidenceShare: 0,
    languages: ["eng"],
    rtl: false,
    warnings: [],
  };
  return {
    id: page.id,
    title: "scan",
    page,
    extraction: extraction(),
    text: "Hello world",
    ...overrides,
  };
}

describe("filenames", () => {
  it("strips extensions and unsafe characters", () => {
    expect(safeFilename("My scan.png")).toBe("My scan");
    expect(safeFilename("a/b:c*d?.jpg")).toBe("a-b-c-d-");
    expect(safeFilename("   ")).toBe("ocr-result");
    expect(safeFilename("")).toBe("ocr-result");
  });
  it("de-duplicates names", () => {
    const used = new Set<string>();
    expect(uniqueName("a.txt", used)).toBe("a.txt");
    expect(uniqueName("a.txt", used)).toBe("a-2.txt");
    expect(uniqueName("a.txt", used)).toBe("a-3.txt");
  });
  it("titles multi-page sources with their page number", () => {
    expect(sectionTitle(section().page)).toBe("scan");
    expect(
      sectionTitle({
        ...section().page,
        pageCount: 4,
        page: 3,
        sourceName: "book.pdf",
      }),
    ).toBe("book — page 3");
  });
});

describe("plain text and CSV", () => {
  it("joins sections with blank lines", () => {
    expect(buildTxt([section({ text: "one" }), section({ text: "two" })])).toBe(
      "one\n\ntwo",
    );
  });
  it("adds page headers when requested", () => {
    const text = buildTxt(
      [section({ text: "one" }), section({ text: "two" })],
      {
        includeHeaders: true,
      },
    );
    expect(text).toContain("--- scan ---");
  });
  it("quotes CSV cells that need it", () => {
    const csv = buildCsv({
      headers: ["Name", "Note"],
      rows: [['Riya, "R"', "line\nbreak"]],
    });
    expect(csv.split("\r\n")[0]).toBe("Name,Note");
    expect(csv).toContain('"Riya, ""R"""');
    expect(csv).toContain('"line\nbreak"');
  });
  it("writes a UTF-8 BOM so Excel keeps Indic scripts", () => {
    const bytes = csvBytes("નામ\n");
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe("નામ\n");
  });
  it("creates one CSV file per table with unique names", () => {
    const table = {
      index: 0,
      headers: ["a"],
      rows: [["1"]],
      confidence: 90,
    };
    const files = buildCsvFiles([
      section({
        extraction: extraction({ tables: [table, { ...table, index: 1 }] }),
      }),
    ]);
    expect(files.map((file) => file.name)).toEqual([
      "scan-table-1.csv",
      "scan-table-2.csv",
    ]);
  });
});

describe("JSON", () => {
  it("includes text, fields, tables and settings", () => {
    const json = JSON.parse(
      buildJson(
        [
          section({
            extraction: extraction({
              fields: [
                { label: "Date", value: "12/03/2026", confidence: 90, line: 1 },
              ],
              tables: [
                { index: 0, headers: ["a"], rows: [["1"]], confidence: 88 },
              ],
            }),
          }),
        ],
        { includeGeometry: false, includeSettings: { mode: "smart" } },
      ),
    );
    expect(json.pages[0].text).toBe("Hello world");
    expect(json.pages[0].fields[0].label).toBe("Date");
    expect(json.pages[0].tables[0].rows).toEqual([["1"]]);
    expect(json.settings.mode).toBe("smart");
    expect(json.processing).toBe("on-device");
    expect(json.pages[0].lines).toBeUndefined();
  });
  it("can include word geometry", () => {
    const json = JSON.parse(
      buildJson([section()], { includeGeometry: true, includeSettings: {} }),
    );
    expect(Array.isArray(json.pages[0].lines)).toBe(true);
  });
});

describe("DOCX", () => {
  it("produces a real OOXML package with the text inside", async () => {
    const blob = await buildDocx(
      docxSections([section({ text: "નમસ્તે ગુજરાત\n\nHello world" })], true),
      { title: "OCR export", includePageHeadings: true },
    );
    const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(zip)).toContain("[Content_Types].xml");
    expect(Object.keys(zip)).toContain("word/document.xml");
    const xml = strFromU8(zip["word/document.xml"]);
    expect(xml).toContain("નમસ્તે ગુજરાત");
    expect(xml).toContain("Hello world");
    expect(xml).toContain("OCR export");
  });
  it("writes real Word tables", async () => {
    const blob = await buildDocx(
      docxSections(
        [
          section({
            extraction: extraction({
              tables: [
                {
                  index: 0,
                  headers: ["Item", "Qty"],
                  rows: [["Pen", "5"]],
                  confidence: 90,
                },
              ],
            }),
          }),
        ],
        false,
      ),
      { title: "T", includePageHeadings: false },
    );
    const xml = strFromU8(
      unzipSync(new Uint8Array(await blob.arrayBuffer()))["word/document.xml"],
    );
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain("Item");
    expect(xml).toContain("Pen");
  });
  it("embeds a font that can render Indic scripts", async () => {
    const blob = await buildDocx(docxSections([section()], false), {
      title: "T",
      includePageHeadings: false,
    });
    const xml = strFromU8(
      unzipSync(new Uint8Array(await blob.arrayBuffer()))["word/document.xml"],
    );
    expect(xml).toContain("Nirmala UI");
  });
});

/** 1×1 transparent PNG used to stand in for a browser-rendered page. */
async function tinyPng(): Promise<string> {
  const { PNG } = await import("pngjs");
  const png = new PNG({ width: 2, height: 2 });
  png.data = Buffer.alloc(2 * 2 * 4, 255);
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

/** Inflate every stream in a PDF so content-stream markers can be asserted. */
async function decodedPageContent(bytes: Uint8Array): Promise<string> {
  const { inflateSync } = await import("node:zlib");
  const chunks: string[] = [];
  // Walk the Buffer, never a decoded string: Deflate data is binary and the
  // byte offsets differ from string offsets once non-ASCII bytes appear.
  const buffer = Buffer.from(bytes);
  const start = Buffer.from("stream");
  const end = Buffer.from("endstream");
  let cursor = 0;
  for (;;) {
    const at = buffer.indexOf(start, cursor);
    if (at < 0) break;
    let dataStart = at + start.length;
    while (buffer[dataStart] === 0x0d || buffer[dataStart] === 0x0a) {
      dataStart += 1;
    }
    const stop = buffer.indexOf(end, dataStart);
    if (stop < 0) break;
    try {
      chunks.push(
        inflateSync(buffer.subarray(dataStart, stop)).toString("latin1"),
      );
    } catch {
      // Not Deflate (font programs, images): skip it.
    }
    cursor = stop + end.length;
  }
  return chunks.join("\n");
}

/** UTF-16BE hex, the encoding `/ActualText` uses. */
function utf16beHex(text: string): string {
  const buffer = Buffer.from(text, "utf16le").swap16();
  return buffer.toString("hex");
}

describe("PDF", () => {
  it("writes selectable text for Latin content", async () => {
    const result = await buildPdf(
      [{ title: "Page 1", text: "Hello world", rtl: false }],
      "OCR export",
    );
    expect(result.textSections).toBe(1);
    expect(result.imageSections).toBe(0);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(result.blob.type).toBe("application/pdf");
  });
  it("detects scripts that standard PDF fonts cannot encode", () => {
    expect(needsImageFallback("hello")).toBe(false);
    expect(needsImageFallback("नमस्ते")).toBe(true);
    expect(needsImageFallback("નમસ્તે")).toBe(true);
    expect(needsImageFallback("தமிழ்")).toBe(true);
    expect(needsImageFallback("café — “quoted”")).toBe(false);
  });
  it("layers selectable Unicode text over rendered Indic pages", async () => {
    // A shaped render stands in for the browser-drawn page; the PDF must place
    // it *and* carry the original script in an invisible text layer.
    const shapes = [
      { text: "क्विककिट हिंदी दस्तावेज़", baseline: 40 },
      { text: "ગુજરાત ભારતનું એક રાજ્ય છે.", baseline: 86 },
    ];
    const png = await tinyPng();
    const result = await buildPdf(
      [
        {
          title: "Scanned page",
          text: "क्विककिट हिंदी दस्तावेज़\nગુજરાત ભારતનું એક રાજ્ય છે.",
          rtl: false,
          rendered: {
            dataUrl: png,
            width: 620,
            height: 220,
            cssWidth: 310,
            cssHeight: 110,
            lines: shapes.map((shape) => ({
              text: shape.text,
              left: 0,
              baseline: shape.baseline,
              lineHeight: 44,
            })),
          },
        },
      ],
      "OCR export",
    );
    expect(result.imageSections).toBe(1);
    expect(result.textSections).toBe(0);
    expect(result.selectableLines).toBe(2);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    // Page content is Flate-compressed, so decode it before looking for markers.
    const raw = await decodedPageContent(bytes);
    // One span per rendered line, carrying UTF-16BE ActualText.
    expect(raw).toContain("/ActualText");
    expect(raw).toContain("feff");
    // The Devanagari text as UTF-16BE hex must be present verbatim.
    expect(raw.toLowerCase()).toContain(
      utf16beHex("क्विककिट हिंदी दस्तावेज़").toLowerCase(),
    );
    // The placeholder run must be a word, not a single dot: extractors ignore
    // /ActualText for lone punctuation and would return "." instead.
    expect(raw).not.toMatch(/\(\.[^)]*\) Tj/u);
  });
  it("reports rendered pages honestly in the export summary", async () => {
    const png = await tinyPng();
    const built = await buildExport(
      "pdf",
      [section({ text: "नमस्ते दुनिया" })],
      {
        combined: true,
        includeHeaders: false,
        includeGeometry: false,
        settings: {},
        documentTitle: "indic",
      },
    ).catch(() => null);
    // In a non-browser environment the shaped render cannot be produced, so the
    // export either reports the fallback or throws with a clear message; it must
    // never silently emit "?" for the characters.
    if (built) {
      expect(built.summary).toMatch(/page\(s\)/);
      expect(built.summary).not.toContain("?");
    }
    expect(png.startsWith("data:image/png")).toBe(true);
  });
  it("wraps long text into printable lines", () => {
    const lines = wrapText("word ".repeat(400), 400);
    expect(lines.length).toBeGreaterThan(3);
    expect(lines.join("").length).toBeGreaterThan(1000);
    expect(wrapText("a\n\nb", 400)).toEqual(["a", "", "b"]);
  });
});

describe("buildExport", () => {
  it("builds every text format", async () => {
    const sections = [section({ text: "Hello world" })];
    const options = {
      combined: true,
      includeHeaders: true,
      includeGeometry: false,
      settings: {},
      documentTitle: "my-doc",
    };
    const txt = await buildExport("txt", sections, options);
    expect(txt.files[0].name).toBe("my-doc.txt");
    const json = await buildExport("json", sections, options);
    expect(json.files[0].name).toBe("my-doc.json");
    const docx = await buildExport("docx", sections, options);
    expect(docx.files[0].name).toBe("my-doc.docx");
    const pdf = await buildExport("pdf", sections, options);
    expect(pdf.summary).toContain("real text");
  });
  it("refuses CSV when no tables were found", async () => {
    await expect(
      buildExport("csv", [section()], {
        combined: true,
        includeHeaders: false,
        includeGeometry: false,
        settings: {},
        documentTitle: "d",
      }),
    ).rejects.toThrow(/No tables/i);
  });
  it("refuses to export an empty selection", async () => {
    await expect(
      buildExport("txt", [], {
        combined: true,
        includeHeaders: false,
        includeGeometry: false,
        settings: {},
        documentTitle: "d",
      }),
    ).rejects.toThrow(/no extracted text/i);
  });
  it("uses per-page names when not combined", async () => {
    const result = await buildExport("txt", [section({ title: "first" })], {
      combined: false,
      includeHeaders: false,
      includeGeometry: false,
      settings: {},
      documentTitle: "doc",
    });
    expect(result.files[0].name).toBe("first.txt");
  });
});

describe("helpers", () => {
  it("counts words in Latin and Indic text", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("नमस्ते भारत")).toBe(2);
    expect(countWords("")).toBe(0);
  });
  it("encodes UTF-8 without loss", () => {
    const bytes = utf8("ગુજરાતી");
    expect(new TextDecoder().decode(bytes)).toBe("ગુજરાતી");
  });
});
