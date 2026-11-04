import { describe, expect, it } from "vitest";
import {
  PDF_STUDIO_ACTIONS,
  buildPageList,
  defaultPdfStudioSettings,
  describePlan,
  dropPage,
  duplicatePage,
  dropRanges,
  keepOnlyRanges,
  keptPages,
  movePage,
  pageNumberLabel,
  pageNumberPlacement,
  parseKeywords,
  watermarkPlacement,
  planProblem,
  rotatePage,
  setRemoved,
  splitGroups,
  studioOutputName,
  summarisePlan,
  toggleRemoved,
} from "@/lib/tools/pdf-studio";

const twoFiles = [
  { name: "a.pdf", pages: 3 },
  { name: "b.pdf", pages: 2 },
];

describe("page list building", () => {
  it("creates one operation per page, in upload order", () => {
    const pages = buildPageList(twoFiles);
    expect(pages).toHaveLength(5);
    expect(pages.map((page) => [page.sourceIndex, page.page])).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 1],
      [1, 2],
    ]);
  });

  it("gives every page a stable, unique id", () => {
    const pages = buildPageList(twoFiles);
    expect(new Set(pages.map((page) => page.id)).size).toBe(5);
    expect(pages.every((page) => page.rotation === 0)).toBe(true);
    expect(pages.every((page) => page.removed === false)).toBe(true);
  });

  it("handles an empty or unreadable source without inventing pages", () => {
    expect(buildPageList([{ name: "empty.pdf", pages: 0 }])).toEqual([]);
    expect(buildPageList([])).toEqual([]);
  });

  it("defaults to a merge with no range", () => {
    const settings = defaultPdfStudioSettings();
    expect(settings.action).toBe("merge");
    expect(settings.ranges).toBe("");
  });

  it("offers the four studio actions", () => {
    expect(PDF_STUDIO_ACTIONS.map((action) => action.id)).toEqual([
      "merge",
      "extract",
      "split",
      "compress",
    ]);
  });
});

describe("rotation", () => {
  it("turns a page clockwise and wraps at 360", () => {
    const pages = buildPageList(twoFiles);
    const id = pages[0].id;
    expect(rotatePage(pages, id, 90)[0].rotation).toBe(90);
    const twice = rotatePage(rotatePage(pages, id, 90), id, 90);
    expect(twice[0].rotation).toBe(180);
    const four = rotatePage(
      rotatePage(rotatePage(rotatePage(pages, id, 90), id, 90), id, 90),
      id,
      90,
    );
    expect(four[0].rotation).toBe(0);
  });

  it("turns counter-clockwise without going negative", () => {
    const pages = buildPageList(twoFiles);
    expect(rotatePage(pages, pages[0].id, -90)[0].rotation).toBe(270);
  });

  it("leaves the other pages alone", () => {
    const pages = buildPageList(twoFiles);
    const rotated = rotatePage(pages, pages[0].id, 90);
    expect(rotated[1].rotation).toBe(0);
    expect(rotated[4].rotation).toBe(0);
  });
});

describe("removing pages", () => {
  it("toggles one page", () => {
    const pages = buildPageList(twoFiles);
    const id = pages[2].id;
    expect(toggleRemoved(pages, id)[2].removed).toBe(true);
    expect(toggleRemoved(toggleRemoved(pages, id), id)[2].removed).toBe(false);
  });

  it("removes a whole range across every source", () => {
    const pages = buildPageList(twoFiles);
    // "1-2" applies per source: pages 1–2 of a.pdf and 1–2 of b.pdf.
    const result = dropRanges(pages, "1-2", twoFiles);
    expect(result.map((page) => page.removed)).toEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it("ignores an empty range instead of dropping everything", () => {
    const pages = buildPageList(twoFiles);
    expect(dropRanges(pages, "   ", twoFiles)).toEqual(pages);
  });

  it("keeps only the pages inside a range", () => {
    const pages = buildPageList(twoFiles);
    const result = keepOnlyRanges(pages, "3", twoFiles);
    expect(keptPages(result).map((page) => page.page)).toEqual([3]);
  });

  it("restores every page when the range is cleared", () => {
    const pages = buildPageList(twoFiles);
    const dropped = dropRanges(pages, "1-3", twoFiles);
    expect(keptPages(keepOnlyRanges(dropped, "", twoFiles))).toHaveLength(5);
  });

  it("marks several ids at once", () => {
    const pages = buildPageList(twoFiles);
    const ids = [pages[0].id, pages[4].id];
    const result = setRemoved(pages, ids, true);
    expect(keptPages(result)).toHaveLength(3);
    expect(setRemoved(result, ids, false)).toHaveLength(5);
  });
});

describe("ordering", () => {
  it("moves a page by a step and clamps at the ends", () => {
    const pages = buildPageList(twoFiles);
    const moved = movePage(pages, pages[0].id, 2);
    expect(moved.map((page) => page.id)).toEqual([
      pages[1].id,
      pages[2].id,
      pages[0].id,
      pages[3].id,
      pages[4].id,
    ]);
    expect(movePage(pages, pages[0].id, -5)).toEqual(pages);
    expect(movePage(pages, pages[4].id, 9)[4].id).toBe(pages[4].id);
  });

  it("drops a page into another page's position", () => {
    const pages = buildPageList(twoFiles);
    const result = dropPage(pages, pages[4].id, pages[1].id);
    expect(result.map((page) => page.id)).toEqual([
      pages[0].id,
      pages[4].id,
      pages[1].id,
      pages[2].id,
      pages[3].id,
    ]);
  });

  it("leaves the order untouched for a no-op drop", () => {
    const pages = buildPageList(twoFiles);
    expect(dropPage(pages, pages[1].id, pages[1].id)).toEqual(pages);
    expect(dropPage(pages, "missing", pages[1].id)).toEqual(pages);
  });

  it("keeps rotation and removal attached to the page, not the slot", () => {
    const pages = buildPageList(twoFiles);
    // The UI turns pages in 90° steps, so a half turn is two of them.
    const rotated = rotatePage(
      rotatePage(pages, pages[0].id, 90),
      pages[0].id,
      90,
    );
    const moved = movePage(rotated, pages[0].id, 3);
    const movedPage = moved.find((page) => page.id === pages[0].id);
    expect(movedPage?.rotation).toBe(180);
  });
});

describe("splitting", () => {
  it("produces one group per range, in the order given", () => {
    const pages = buildPageList(twoFiles);
    const groups = splitGroups(pages, "1, 2-3", twoFiles);
    expect(groups.map((group) => group.label)).toEqual(["1", "2-3"]);
    expect(groups[0].pages).toHaveLength(2); // page 1 of each source
    expect(groups[1].pages).toHaveLength(3);
  });

  it("drops ranges that match nothing", () => {
    const pages = buildPageList(twoFiles);
    expect(splitGroups(pages, "9", twoFiles)).toEqual([]);
  });

  it("treats an empty range as one group of everything kept", () => {
    const pages = buildPageList(twoFiles);
    const groups = splitGroups(pages, "", twoFiles);
    expect(groups).toHaveLength(1);
    expect(groups[0].pages).toHaveLength(5);
  });

  it("never writes a removed page", () => {
    const pages = buildPageList(twoFiles);
    const dropped = toggleRemoved(pages, pages[0].id);
    expect(splitGroups(dropped, "1", twoFiles)[0].pages).toHaveLength(1);
  });
});

describe("plan reporting and validation", () => {
  it("counts what will be written", () => {
    const pages = buildPageList(twoFiles);
    const edited = rotatePage(
      toggleRemoved(pages, pages[0].id),
      pages[1].id,
      90,
    );
    const summary = summarisePlan(edited, "merge", "", twoFiles);
    expect(summary).toMatchObject({
      total: 5,
      kept: 4,
      removed: 1,
      rotated: 1,
      outputs: 1,
      sources: 2,
    });
    expect(describePlan(summary)).toContain("4 of 5 pages");
    expect(describePlan(summary)).toContain("from 2 files");
    expect(describePlan(summary)).toContain("1 rotated");
  });

  it("counts one output per split range", () => {
    const pages = buildPageList(twoFiles);
    const summary = summarisePlan(pages, "split", "1, 2", twoFiles);
    expect(summary.outputs).toBe(2);
    expect(describePlan(summary)).toContain("into 2 PDFs");
  });

  it("says nothing will be written when every page is removed", () => {
    const pages = buildPageList(twoFiles);
    const all = setRemoved(
      pages,
      pages.map((page) => page.id),
      true,
    );
    expect(describePlan(summarisePlan(all, "merge", "", twoFiles))).toMatch(
      /nothing will be written/i,
    );
    expect(planProblem(all, "merge", "", twoFiles)).toMatch(
      /keep at least one/i,
    );
  });

  it("rejects an impossible range for a split", () => {
    const pages = buildPageList(twoFiles);
    expect(planProblem(pages, "split", "42", twoFiles)).toMatch(
      /no page matches/i,
    );
  });

  it("rejects a malformed range", () => {
    const pages = buildPageList(twoFiles);
    expect(planProblem(pages, "extract", "1-", twoFiles)).toBeTruthy();
  });

  it("accepts a runnable plan", () => {
    const pages = buildPageList(twoFiles);
    expect(planProblem(pages, "merge", "", twoFiles)).toBeNull();
    expect(planProblem(pages, "split", "1-2", twoFiles)).toBeNull();
  });

  it("asks for a file when the queue is empty", () => {
    expect(planProblem([], "merge", "", [])).toMatch(/add a pdf/i);
  });
});

describe("output naming", () => {
  it("uses the chosen filename", () => {
    expect(studioOutputName("report.pdf", null)).toBe("report.pdf");
    expect(studioOutputName("report", null)).toBe("report.pdf");
  });

  it("labels split parts", () => {
    expect(studioOutputName("report.pdf", "1-3")).toBe("report-1-3.pdf");
  });

  it("sanitises characters that cannot appear in a filename", () => {
    // Leading dots are stripped so a download can never look like traversal.
    expect(studioOutputName("../../etc/passwd", null)).toBe("etc-passwd.pdf");
    expect(studioOutputName("report", "1-3")).toBe("report-1-3.pdf");
    expect(studioOutputName("   ", null)).toBe("quickkit-pages.pdf");
  });
});

describe("duplicatePage", () => {
  const twoSources = () =>
    buildPageList([
      { pages: 2, name: "a.pdf" },
      { pages: 1, name: "b.pdf" },
    ]);

  it("inserts the copy directly after its source", () => {
    const pages = twoSources();
    const next = duplicatePage(pages, pages[0].id);

    expect(next).toHaveLength(4);
    expect(next[0].sourceIndex).toBe(0);
    expect(next[0].page).toBe(1);
    expect(next[1].sourceIndex).toBe(0);
    expect(next[1].page).toBe(1);
    expect(next[2].page).toBe(2);
    expect(next[3].sourceIndex).toBe(1);
  });

  it("gives the copy a distinct id so React keys stay unique", () => {
    const pages = twoSources();
    const next = duplicatePage(pages, pages[0].id);
    const ids = next.map((page) => page.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(next[1].id).not.toBe(next[0].id);
  });

  it("carries the source rotation across", () => {
    const pages = twoSources();
    const turned = rotatePage(pages, pages[0].id, 90);
    const next = duplicatePage(turned, turned[0].id);
    expect(next[1].rotation).toBe(90);
  });

  it("inserts the copy kept, even when the source is struck through", () => {
    const pages = twoSources();
    const dropped = setRemoved(pages, [pages[0].id], true);
    expect(dropped[0].removed).toBe(true);

    const next = duplicatePage(dropped, dropped[0].id);
    expect(next[0].removed).toBe(true);
    expect(next[1].removed, "the duplicate is usable").toBe(false);
  });

  it("returns an unchanged copy for an unknown id", () => {
    const pages = twoSources();
    const next = duplicatePage(pages, "does-not-exist");
    expect(next).toHaveLength(pages.length);
    expect(next).not.toBe(pages);
  });

  it("does not mutate the input list", () => {
    const pages = twoSources();
    const before = pages.map((page) => page.id);
    duplicatePage(pages, pages[0].id);
    expect(pages.map((page) => page.id)).toEqual(before);
  });

  it("keeps every duplicate unique across repeated calls", () => {
    let pages = twoSources();
    const first = pages[0].id;
    pages = duplicatePage(pages, first);
    pages = duplicatePage(pages, first);
    pages = duplicatePage(pages, first);
    expect(pages).toHaveLength(6);
    const ids = pages.map((page) => page.id);
    expect(new Set(ids).size).toBe(6);
  });
});

describe("page number stamping", () => {
  it("expands every documented token", () => {
    expect(pageNumberLabel("{n}", 3, 12)).toBe("3");
    expect(pageNumberLabel("{n} / {total}", 3, 12)).toBe("3 / 12");
    expect(pageNumberLabel("Page {n} of {total}", 1, 5)).toBe("Page 1 of 5");
    expect(pageNumberLabel("{n} of {total}", 12, 12)).toBe("12 of 12");
  });

  it("is case-insensitive and drops unknown tokens", () => {
    expect(pageNumberLabel("{N} of {TOTAL}", 2, 9)).toBe("2 of 9");
    expect(pageNumberLabel("{bogus}{n}", 4, 9)).toBe("4");
  });

  it("numbers from 1 and reaches the total", () => {
    const total = 5;
    const labels = Array.from({ length: total }, (_, i) =>
      pageNumberLabel("{n} / {total}", i + 1, total),
    );
    expect(labels[0]).toBe("1 / 5");
    expect(labels[total - 1]).toBe("5 / 5");
  });

  it("centres on the page for a centre position", () => {
    const placement = pageNumberPlacement("bottom-center", 595, 842);
    expect(placement.x).toBe(595 / 2);
    expect(placement.align).toBe("center");
    expect(placement.y).toBe(24);
  });

  it("honours the margin on every corner", () => {
    expect(pageNumberPlacement("bottom-left", 595, 842)).toEqual({
      x: 24,
      y: 24,
      align: "left",
    });
    expect(pageNumberPlacement("bottom-right", 595, 842)).toEqual({
      x: 571,
      y: 24,
      align: "right",
    });
    expect(pageNumberPlacement("top-left", 595, 842)).toEqual({
      x: 24,
      y: 818,
      align: "left",
    });
    expect(pageNumberPlacement("top-right", 595, 842)).toEqual({
      x: 571,
      y: 818,
      align: "right",
    });
    expect(pageNumberPlacement("top-center", 595, 842)).toEqual({
      x: 297.5,
      y: 818,
      align: "center",
    });
  });

  it("adapts to a non-A4 page size rather than hardcoding A4", () => {
    // US Letter is 612 × 792 pt.
    const placement = pageNumberPlacement("bottom-center", 612, 792);
    expect(placement.x).toBe(306);
    expect(placement.y).toBe(24);
  });
});

describe("parseKeywords", () => {
  it("splits on commas and semicolons", () => {
    expect(parseKeywords("finance, q3; report")).toEqual([
      "finance",
      "q3",
      "report",
    ]);
  });

  it("trims and drops empty entries", () => {
    expect(parseKeywords("  finance ,, q3 ,  ")).toEqual(["finance", "q3"]);
    expect(parseKeywords("")).toEqual([]);
    expect(parseKeywords(" , ; ")).toEqual([]);
  });

  it("de-duplicates case-insensitively but keeps the first spelling", () => {
    expect(parseKeywords("Finance, finance, FINANCE, q3")).toEqual([
      "Finance",
      "q3",
    ]);
  });

  it("preserves spaces inside a keyword", () => {
    expect(parseKeywords("annual report, tax year")).toEqual([
      "annual report",
      "tax year",
    ]);
  });
});

describe("watermarkPlacement", () => {
  it("centres a zero-degree watermark on the page", () => {
    // At 0 degrees the rotated box is the text box itself, so the origin is
    // the page centre minus half the text size.
    const placement = watermarkPlacement(595, 842, 200, 48, 0);
    expect(placement.x).toBeCloseTo(595 / 2 - 100, 5);
    expect(placement.y).toBeCloseTo(842 / 2 - 24, 5);
    expect(placement.angle).toBe(0);
  });

  it("keeps the centre fixed when the text is rotated 45 degrees", () => {
    // The rotated box centre must land on the page centre for any angle, so
    // compare the midpoint of the placed text against the page midpoint.
    const pageW = 595;
    const pageH = 842;
    const textW = 300;
    const textH = 48;
    for (const angle of [0, 15, 45, -45, 90]) {
      const { x, y } = watermarkPlacement(pageW, pageH, textW, textH, angle);
      const radians = (angle * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      // Centre of the rotated box, reconstructed from the draw origin.
      const cx = x + (textW * cos - textH * sin) / 2;
      const cy = y + (textW * sin + textH * cos) / 2;
      expect(cx, `angle ${angle} x-centre`).toBeCloseTo(pageW / 2, 5);
      expect(cy, `angle ${angle} y-centre`).toBeCloseTo(pageH / 2, 5);
    }
  });

  it("normalises angles into 0-359", () => {
    expect(watermarkPlacement(595, 842, 100, 20, -45).angle).toBe(315);
    expect(watermarkPlacement(595, 842, 100, 20, 405).angle).toBe(45);
    expect(watermarkPlacement(595, 842, 100, 20, 0).angle).toBe(0);
  });

  it("adapts to page size rather than hardcoding A4", () => {
    // US Letter 612 × 792: at 0 degrees the origin is centre minus half text.
    const placement = watermarkPlacement(612, 792, 100, 20, 0);
    expect(placement.x).toBeCloseTo(612 / 2 - 50, 5);
    expect(placement.y).toBeCloseTo(792 / 2 - 10, 5);
  });
});
