import { describe, expect, it } from "vitest";
import {
  PDFDocument,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "@cantoo/pdf-lib";
import {
  defaults,
  nativeKey,
  orderedPages,
  pageNumber,
  validateSettings,
} from "../lib/tools/word-to-pdf/settings";
import { processPdf } from "../lib/tools/word-to-pdf/process-pdf";
import { boundedPreviewScale } from "../lib/tools/pdf/preview-size";
async function fixture() {
  const pdf = await PDFDocument.create();
  for (const w of [400, 500, 600]) {
    const page = pdf.addPage([w, 800]);
    page.drawText(`Source page ${w}`, { x: 40, y: 700 });
  }
  pdf.setTitle("Native title");
  return pdf.save();
}
function contents(pdf: PDFDocument, index: number) {
  const value = pdf.getPage(index).node.Contents();
  const streams =
    value instanceof PDFArray
      ? value.asArray().map((v) => pdf.context.lookup(v))
      : [value];
  return streams
    .map((v) =>
      v instanceof PDFRawStream
        ? Buffer.from(decodePDFRawStream(v).decode()).toString("latin1")
        : "",
    )
    .join("\n");
}
describe("V2 settings and native/local boundary", () => {
  it("does not require an upload for local edits", () => {
    expect(
      nativeKey({
        ...defaults,
        header: "Header",
        title: "A title",
        rotation: 90,
        pages: "2",
        startNumber: 9,
        backgroundEnabled: true,
      }),
    ).toBe(nativeKey(defaults));
    expect(
      nativeKey({
        ...defaults,
        layoutScope: "selected",
        paper: "A3",
        margins: true,
      }),
    ).toBe(nativeKey(defaults));
    expect(nativeKey({ ...defaults, paper: "A3" })).not.toBe(
      nativeKey(defaults),
    );
    expect(
      nativeKey({ ...defaults, imageDpi: 150, preserveResolution: false }),
    ).not.toBe(nativeKey(defaults));
  });
  it.each([
    { startNumber: 0 },
    { startNumber: 3901 },
    { jpegQuality: 101 },
    { imageDpi: 10 },
    { rotation: 45 },
    { numberStyle: "words" },
    { backgroundColor: "url(x)" },
    { excludePages: "1,,2" },
    { layoutScope: "unknown" },
    { title: "x\nscript" },
    { tagged: "true" },
  ])("rejects invalid studio settings %j", (value) =>
    expect(() => validateSettings({ ...defaults, ...value })).toThrow(),
  );
  it("includes, excludes and explicitly reorders source pages", () => {
    expect(
      orderedPages(
        { ...defaults, pages: "1-5", excludePages: "2,4", pageOrder: "5,1,3" },
        5,
      ),
    ).toEqual([4, 0, 2]);
  });
  it.each(["1,1,2", "1-2", "4,1,2", "1,2,3,4"])(
    "rejects incomplete, duplicate and invalid output orders %s",
    (pageOrder) =>
      expect(() => orderedPages({ ...defaults, pageOrder }, 3)).toThrow(),
  );
  it("rejects an empty output selection", () =>
    expect(() => orderedPages({ ...defaults, excludePages: "1-3" }, 3)).toThrow(
      /every page/,
    ));
  it("supports Arabic and Roman numerals through the maximum permitted batch", () => {
    expect(pageNumber(12, "arabic")).toBe("12");
    expect(pageNumber(49, "roman")).toBe("XLIX");
    expect(pageNumber(3999, "roman")).toBe("MMMCMXCIX");
  });
});
describe("shared V2 preview/export PDF pipeline", () => {
  it("does not mutate the retained native bytes", async () => {
    const source = await fixture(),
      copy = source.slice();
    await processPdf(source, { ...defaults, header: "Header" });
    expect(source).toEqual(copy);
  });
  it("exports exact requested pages/order, metadata and rotations", async () => {
    const result = await processPdf(await fixture(), {
      ...defaults,
      pages: "1-3",
      excludePages: "2",
      pageOrder: "3,1",
      rotation: 90,
      title: "Final title",
      author: "QA",
      subject: "Review",
      keywords: "one, two",
    });
    const pdf = await PDFDocument.load(result.bytes);
    expect(result.indices).toEqual([2, 0]);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([600, 400]);
    expect(pdf.getPage(0).getRotation().angle).toBe(90);
    expect(pdf.getTitle()).toBe("Final title");
    expect(pdf.getAuthor()).toBe("QA");
    expect(pdf.getSubject()).toBe("Review");
    expect(pdf.getKeywords()).toContain("two");
  });
  it("ignores inactive selective-layout ranges in all-page mode", async () => {
    const result = await processPdf(await fixture(), {
      ...defaults,
      layoutPages: "999",
    });
    expect(result.pages).toBe(3);
  });
  it("preserves native metadata when fields are blank", async () => {
    const result = await processPdf(await fixture(), defaults);
    expect((await PDFDocument.load(result.bytes)).getTitle()).toBe(
      "Native title",
    );
  });
  it("applies selective PDF geometry without changing unrelated page sizes", async () => {
    const result = await processPdf(await fixture(), {
      ...defaults,
      layoutScope: "selected",
      layoutPages: "2",
      paper: "A5",
      margins: true,
      left: 10,
    });
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPage(0).getWidth()).toBe(400);
    expect(pdf.getPage(1).getWidth()).toBeCloseTo((148 * 72) / 25.4);
    expect(pdf.getPage(2).getWidth()).toBe(600);
  });
  it("adds a real background stream behind source content", async () => {
    const result = await processPdf(await fixture(), {
      ...defaults,
      backgroundEnabled: true,
      backgroundColor: "#F4D7D4",
    });
    const pdf = await PDFDocument.load(result.bytes);
    const text = contents(pdf, 0);
    expect(text.indexOf(" re f Q")).toBeGreaterThan(-1);
    expect(text.indexOf(" re f Q")).toBeLessThan(text.indexOf("BT"));
  });
  it("applies selected overlays, Roman numbering and a different first page", async () => {
    const result = await processPdf(await fixture(), {
      ...defaults,
      numbering: true,
      startNumber: 4,
      numberStyle: "roman",
      skipFirstNumber: true,
      overlayPages: "1-2",
      header: "HEADER",
    });
    const pdf = await PDFDocument.load(result.bytes);
    expect(contents(pdf, 0)).toContain("484541444552");
    expect(contents(pdf, 0)).not.toContain("<4956>");
    expect(contents(pdf, 1)).toContain("<4956>");
    expect(contents(pdf, 2)).not.toContain("484541444552");
  });
  it("rejects invalid overlays and out-of-document layout ranges", async () => {
    const source = await fixture();
    await expect(
      processPdf(source, {
        ...defaults,
        header: "H".repeat(120),
        fontSize: 36,
      }),
    ).rejects.toThrow(/too wide/);
    await expect(
      processPdf(source, {
        ...defaults,
        layoutScope: "selected",
        layoutPages: "4",
      }),
    ).rejects.toThrow(/outside/);
  });
  it("cancellation prevents publication of new output", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      processPdf(await fixture(), defaults, controller.signal),
    ).rejects.toThrow();
  });
});

describe("V2 preview canvas bounds", () => {
  it.each([
    [600, 842, 8_000_000],
    [100, 1e9, 8_000_000],
    [1e9, 100, 700_000],
  ])("bounds pixel area and edge for %j x %j", (width, height, budget) => {
    const scale = boundedPreviewScale(width, height, 2800, budget);
    const w = Math.max(1, Math.floor(width * scale)),
      h = Math.max(1, Math.floor(height * scale));
    expect(w * h).toBeLessThanOrEqual(budget);
    expect(Math.max(w, h)).toBeLessThanOrEqual(16_384);
  });
  it("rejects non-finite page geometry before canvas allocation", () => {
    expect(() => boundedPreviewScale(Infinity, 1, 100, 1000)).toThrow();
    expect(() => boundedPreviewScale(0, 100, 100, 1000)).toThrow();
  });
});
