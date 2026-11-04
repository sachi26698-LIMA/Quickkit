import { describe, expect, it } from "vitest";
import {
  PDFDocument,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
  PDFName,
  PDFDict,
} from "@cantoo/pdf-lib";
import {
  defaults,
  validateSettings,
  nativeKey,
  nativeRequestSettings,
  decodeWatermark,
} from "../lib/tools/word-to-pdf/settings";
import {
  processPdf,
  extractPdfPages,
} from "../lib/tools/word-to-pdf/process-pdf";
import {
  initialPlan,
  movePages,
  deletePages,
  rotatePages,
  duplicatePages,
  insertBlank,
  moveSection,
  patchPages,
  validatePlan,
} from "../lib/tools/word-to-pdf/page-plan";
const plan = () => initialPlan(3, [0, 1, 2]);
const ids = ["source-1", "source-2", "source-3"];
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=";
async function fixture(count = 3) {
  const p = await PDFDocument.create();
  for (let i = 0; i < count; i++) {
    const page = p.addPage([400 + i, 800]);
    page.drawText(`Source ${i + 1}`, { x: 40, y: 700 });
  }
  p.setTitle("Original metadata");
  return p.save();
}
function streams(pdf: PDFDocument, index: number) {
  const value = pdf.getPage(index).node.Contents();
  return (
    value instanceof PDFArray
      ? value.asArray().map((v) => pdf.context.lookup(v))
      : [value]
  )
    .map((v) =>
      v instanceof PDFRawStream
        ? Buffer.from(decodePDFRawStream(v).decode()).toString("latin1")
        : "",
    )
    .join("\n");
}
describe("V3 identity-based page plan", () => {
  it("preserves source identities across reorder and delete", () => {
    const p = deletePages(movePages(plan(), [ids[2]], ids[0]), [ids[1]]);
    expect(p.pages.map((v) => [v.id, v.source])).toEqual([
      [ids[2], 2],
      [ids[0], 0],
    ]);
  });
  it("duplicates independently and inserts genuine blank references", () => {
    let p = duplicatePages(plan(), [ids[0]], () => "copy");
    p = insertBlank(p, "copy", () => "blank");
    p = rotatePages(p, ["copy"]);
    expect(p.pages.map((v) => [v.source, v.rotation])).toEqual([
      [0, 0],
      [0, 90],
      [null, 0],
      [1, 0],
      [2, 0],
    ]);
    expect(plan().pages[0].rotation).toBe(0);
  });
  it("moves selected pages to output sections, not just labels", () => {
    const p = moveSection(plan(), [ids[0]], "Appendix");
    expect(p.pages.map((v) => v.source)).toEqual([1, 2, 0]);
    expect(p.pages[2].section).toBe("Appendix");
  });
  it("moves into an existing section after its last page", () => {
    let p = moveSection(plan(), [ids[1]], "Appendix");
    p = moveSection(p, [ids[0]], "Appendix");
    expect(p.pages.map((v) => [v.source, v.section])).toEqual([
      [2, "Main"],
      [1, "Appendix"],
      [0, "Appendix"],
    ]);
  });
  it("patches only selected appearance properties", () => {
    let p = patchPages(plan(), [ids[0]], { header: "A", fontSize: 16 });
    p = patchPages(p, [ids[0], ids[1]], { backgroundEnabled: true });
    expect(p.pages[0].overrides).toEqual({
      header: "A",
      fontSize: 16,
      backgroundEnabled: true,
    });
    expect(p.pages[1].overrides).toEqual({ backgroundEnabled: true });
    expect(p.pages[2].overrides).toEqual({});
  });
  it("rejects zero pages, more than 100 pages, duplicate ids and invalid source references", () => {
    expect(() => deletePages(plan(), ids)).toThrow(/1–100/);
    const p = initialPlan(
      100,
      Array.from({ length: 100 }, (_, i) => i),
    );
    expect(() => duplicatePages(p, ["source-1"], () => "copy")).toThrow(
      /1–100/,
    );
    expect(() =>
      validatePlan({ ...plan(), pages: [plan().pages[0], plan().pages[0]] }),
    ).toThrow(/unique/);
    expect(() =>
      validatePlan({ ...plan(), pages: [{ ...plan().pages[0], source: 100 }] }),
    ).toThrow(/unavailable/);
  });
  it("rejects unsafe section labels and unsupported overrides", () => {
    expect(() => moveSection(plan(), [ids[0]], "\nBad")).toThrow(/section/);
    expect(() =>
      validatePlan({
        ...plan(),
        pages: [{ ...plan().pages[0], overrides: { quality: "print" } }],
      }),
    ).toThrow(/Unsupported/);
  });
  it("does not move a selected block onto itself", () =>
    expect(movePages(plan(), [ids[0]], ids[0])).toEqual(plan()));
});
describe("V3 local settings and image boundaries", () => {
  it("keeps edits local without changing native signature", () => {
    const s = {
      ...defaults,
      visualPlan: plan(),
      imageWatermark: png,
      imageWatermarkEnabled: true,
      numberFormat: "Page {n} of {total}",
    };
    expect(nativeKey(s)).toBe(nativeKey(defaults));
    const sent = nativeRequestSettings(s);
    expect(sent.visualPlan).toBeNull();
    expect(sent.imageWatermark).toBe("");
    expect(sent.imageWatermarkEnabled).toBe(false);
    expect(validateSettings(sent).quality).toBe("standard");
  });
  it.each(["{evil}", "Page {total}", "{n} \n", "{n} {missing}"])(
    "rejects invalid number format %s",
    (format) =>
      expect(() =>
        validateSettings({ ...defaults, numberFormat: format }),
      ).toThrow(/format/),
  );
  it("checks nested appearance with the same strict validator", () =>
    expect(() =>
      validateSettings({
        ...defaults,
        visualPlan: patchPages(plan(), [ids[0]], { fontSize: 100 }),
      }),
    ).toThrow(/fontSize/));
  it("accepts PNG data, rejects external/SVG/oversized assets", () => {
    expect(decodeWatermark(png)?.type).toBe("image/png");
    for (const value of [
      "https://example.com/a.png",
      "data:image/svg+xml;base64,AAAA",
      "x".repeat(350001),
    ])
      expect(() => decodeWatermark(value)).toThrow();
  });
  it("checks decoded image dimensions before allocation", () => {
    const bytes = Buffer.from(png.split(",")[1], "base64");
    bytes.writeUInt32BE(4097, 16);
    expect(() =>
      decodeWatermark("data:image/png;base64," + bytes.toString("base64")),
    ).toThrow(/4,096/);
  });
});
describe("V3 actual PDF materialization", () => {
  it("exports reorder, duplicate, blank, rotation and deletion without mutating base", async () => {
    const base = await fixture(),
      snapshot = base.slice();
    let p = duplicatePages(plan(), [ids[0]], () => "copy");
    p = rotatePages(p, ["copy"]);
    p = insertBlank(p, "copy", () => "blank");
    p = deletePages(p, [ids[1]]);
    p = movePages(p, [ids[2]], ids[0]);
    const out = await processPdf(base, { ...defaults, visualPlan: p });
    const pdf = await PDFDocument.load(out.bytes);
    expect(out.indices).toEqual([2, 0, 0, null]);
    expect(pdf.getPages().map((p) => p.getRotation().angle)).toEqual([
      0, 0, 90, 0,
    ]);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([
      402, 400, 400, 400,
    ]);
    expect(streams(pdf, 0)).toContain(
      Buffer.from("Source 3").toString("hex").toUpperCase(),
    );
    expect(streams(pdf, 3)).not.toContain("Tj");
    expect(base).toEqual(snapshot);
    expect(pdf.getTitle()).toBe("Original metadata");
  });
  it("applies selected geometry, background and header only to selected actual pages", async () => {
    const p = patchPages(plan(), [ids[1]], {
      paper: "A5",
      landscape: true,
      backgroundEnabled: true,
      backgroundColor: "#FF6B6B",
      header: "Selected",
      fontSize: 14,
    });
    const result = await processPdf(await fixture(), {
      ...defaults,
      visualPlan: p,
    });
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPage(0).getWidth()).toBe(400);
    expect(pdf.getPage(1).getWidth()).toBeCloseTo((210 * 72) / 25.4);
    expect(streams(pdf, 1)).toContain("re f");
    expect(streams(pdf, 1)).toContain(
      Buffer.from("Selected").toString("hex").toUpperCase(),
    );
    expect(streams(pdf, 0)).not.toContain(
      Buffer.from("Selected").toString("hex").toUpperCase(),
    );
  });
  it("numbers selected output pages with custom Roman formats and section labels", async () => {
    const p = moveSection(plan(), [ids[0]], "Appendix");
    const result = await processPdf(await fixture(), {
      ...defaults,
      visualPlan: p,
      numbering: true,
      numberingPages: "2-3",
      startNumber: 4,
      numberStyle: "roman",
      numberFormat: "{section} {n} of {total}",
    });
    const pdf = await PDFDocument.load(result.bytes);
    expect(streams(pdf, 0)).not.toContain(
      Buffer.from("Main IV of III").toString("hex").toUpperCase(),
    );
    expect(streams(pdf, 1)).toContain(
      Buffer.from("Main V of III").toString("hex").toUpperCase(),
    );
    expect(streams(pdf, 2)).toContain(
      Buffer.from("Appendix VI of III").toString("hex").toUpperCase(),
    );
  });
  it("regenerates from immutable source without accumulating watermarks", async () => {
    const base = await fixture();
    await processPdf(base, { ...defaults, watermarkText: "OLD" });
    const result = await processPdf(base, {
      ...defaults,
      watermarkText: "NEW",
      watermarkPages: "2",
    });
    const pdf = await PDFDocument.load(result.bytes);
    expect(streams(pdf, 0)).not.toContain(
      Buffer.from("NEW").toString("hex").toUpperCase(),
    );
    expect(streams(pdf, 1)).toContain(
      Buffer.from("NEW").toString("hex").toUpperCase(),
    );
    expect(streams(pdf, 1)).not.toContain(
      Buffer.from("OLD").toString("hex").toUpperCase(),
    );
  });
  it("embeds an actual image XObject only on selected output pages", async () => {
    const result = await processPdf(await fixture(), {
      ...defaults,
      imageWatermark: png,
      imageWatermarkEnabled: true,
      watermarkPages: "2",
    });
    const pdf = await PDFDocument.load(result.bytes);
    const resources = pdf.getPage(1).node.Resources();
    expect(
      resources!.lookup(PDFName.of("XObject"), PDFDict).keys().length,
    ).toBeGreaterThan(0);
    expect(streams(pdf, 1)).toContain(" Do");
    expect(streams(pdf, 0)).not.toContain(" Do");
  });
  it("extracts final numbered/rotated pages without adding overlays twice", async () => {
    const result = await processPdf(await fixture(), {
      ...defaults,
      numbering: true,
      numberFormat: "Page {n}",
      rotation: 90,
    });
    const bytes = await extractPdfPages(result.bytes, [2, 0]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPages().map((p) => p.getRotation().angle)).toEqual([90, 90]);
    expect(streams(pdf, 0)).toContain(
      Buffer.from("Page 3").toString("hex").toUpperCase(),
    );
    expect(streams(pdf, 0).match(/506167652033/g)).toHaveLength(1);
  });
  it("rejects stale pagination, invalid extraction and supports cancellation", async () => {
    const base = await fixture();
    await expect(
      processPdf(base, { ...defaults, visualPlan: initialPlan(2, [0, 1]) }),
    ).rejects.toThrow(/pagination changed/);
    await expect(extractPdfPages(base, [3])).rejects.toThrow(/existing output/);
    const c = new AbortController();
    c.abort();
    await expect(processPdf(base, defaults, c.signal)).rejects.toThrow();
    await expect(extractPdfPages(base, [0], c.signal)).rejects.toThrow();
  });
  it("reports actual processed page counts and permits mid-edit cancellation", async () => {
    const c = new AbortController(),
      progress: number[] = [];
    await expect(
      processPdf(await fixture(8), defaults, c.signal, (done, total) => {
        expect(total).toBe(8);
        progress.push(done);
        if (done === 4) c.abort();
      }),
    ).rejects.toThrow();
    expect(progress).toEqual([0, 1, 2, 3, 4]);
  });
});
