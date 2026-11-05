import { describe, expect, it, vi } from "vitest";
import {
  enhancementFor,
  jobsForSource,
  nextId,
  runBounded,
  type SourceRecord,
} from "@/lib/tools/image-to-text/runner";
import { isTiffFile, parsePageRange } from "@/lib/tools/image-to-text/prepare";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  OCR_LIMITS,
} from "@/lib/tools/image-to-text/types";

function source(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: "src-1",
    file: new File([new Uint8Array([1, 2, 3])], "scan.png", {
      type: "image/png",
    }),
    name: "scan.png",
    size: 3,
    kind: "image",
    previewUrl: "blob:preview",
    rotation: 0,
    selected: true,
    order: 0,
    pageCount: null,
    status: "queued",
    error: null,
    notes: [],
    ...overrides,
  };
}

describe("jobs", () => {
  it("creates one job per page", () => {
    const jobs = jobsForSource(source({ pageCount: 3, kind: "pdf" }));
    expect(jobs.map((job) => job.page)).toEqual([1, 2, 3]);
    expect(jobs.every((job) => job.status === "queued")).toBe(true);
    expect(jobs[0].id).toBe("src-1:1");
  });
  it("treats an uninspected source as a single page", () => {
    expect(jobsForSource(source())).toHaveLength(1);
  });
  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => nextId()));
    expect(ids.size).toBe(50);
  });
});

describe("bounded concurrency", () => {
  it("never runs more than the limit at once", async () => {
    let active = 0;
    let peak = 0;
    const items = Array.from({ length: 12 }, (_, index) => index);
    const results = await runBounded(items, 3, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return item * 2;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(results.map((result) => (result.ok ? result.value : -1))).toEqual(
      items.map((item) => item * 2),
    );
  });
  it("keeps result order even when the work finishes out of order", async () => {
    const results = await runBounded([30, 10, 20], 3, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms;
    });
    expect(results.map((result) => (result.ok ? result.value : -1))).toEqual([
      30, 10, 20,
    ]);
  });
  it("isolates failures per item", async () => {
    const results = await runBounded([1, 2, 3], 2, async (item) => {
      if (item === 2) throw new Error("boom");
      return item;
    });
    expect(results[0]).toEqual({ ok: true, value: 1 });
    expect(results[1].ok).toBe(false);
    expect(results[2]).toEqual({ ok: true, value: 3 });
  });
  it("handles an empty list", async () => {
    expect(await runBounded([], 3, async () => 1)).toEqual([]);
  });
  it("never spawns more runners than items", async () => {
    const worker = vi.fn(async (item: number) => item);
    await runBounded([1], 3, worker);
    expect(worker).toHaveBeenCalledTimes(1);
  });
});

describe("per-source enhancement", () => {
  it("adds the source rotation to the global rotation", () => {
    const enhancement = enhancementFor(source({ rotation: 90 }), {
      ...DEFAULT_SETTINGS.enhancement,
      rotation: 180,
    });
    expect(enhancement.rotation).toBe(270);
  });
  it("prefers the source crop over the global crop", () => {
    const crop = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
    const enhancement = enhancementFor(
      source({ crop }),
      DEFAULT_SETTINGS.enhancement,
    );
    expect(enhancement.crop).toEqual(crop);
  });
  it("keeps the global crop when the source has none", () => {
    const globalCrop = { x: 0, y: 0, width: 1, height: 0.5 };
    const enhancement = enhancementFor(source(), {
      ...DEFAULT_SETTINGS.enhancement,
      crop: globalCrop,
    });
    expect(enhancement.crop).toEqual(globalCrop);
  });
});

describe("page ranges", () => {
  it("returns every page for an empty range", () => {
    expect(parsePageRange("", 3)).toEqual([1, 2, 3]);
  });
  it("parses ranges, single pages and duplicates", () => {
    expect(parsePageRange("1-3, 5, 5, 7", 10)).toEqual([1, 2, 3, 5, 7]);
    expect(parsePageRange("2", 5)).toEqual([2]);
  });
  it("ignores out-of-range and malformed entries", () => {
    expect(parsePageRange("0, 9-12, abc, 3-1, 4", 5)).toEqual([4]);
    expect(parsePageRange("99", 5)).toEqual([]);
  });
});

describe("file kinds", () => {
  it("detects TIFF by MIME type or extension", () => {
    expect(isTiffFile(new File([], "a.tif", { type: "image/tiff" }))).toBe(
      true,
    );
    expect(isTiffFile(new File([], "scan.TIFF", { type: "" }))).toBe(true);
    expect(isTiffFile(new File([], "scan.png", { type: "image/png" }))).toBe(
      false,
    );
  });
});

describe("settings", () => {
  it("falls back to English when no valid language is given", () => {
    expect(
      normalizeSettings({
        ...DEFAULT_SETTINGS,
        languages: ["klingon" as never],
      }).languages,
    ).toEqual(["eng"]);
  });
  it("removes unknown and duplicate languages", () => {
    const settings = normalizeSettings({
      ...DEFAULT_SETTINGS,
      languages: ["hin", "hin", "xx" as never, "guj"],
    });
    expect(settings.languages).toEqual(["hin", "guj"]);
  });
  it("clamps numeric settings into range", () => {
    const settings = normalizeSettings({
      ...DEFAULT_SETTINGS,
      confidenceThreshold: 500,
      concurrency: 9 as never,
      maxSide: 99,
      enhancement: {
        ...DEFAULT_SETTINGS.enhancement,
        contrast: 99,
        brightness: -3,
        rotation: -90,
      },
    });
    expect(settings.confidenceThreshold).toBe(100);
    expect(settings.concurrency).toBe(1);
    expect(settings.maxSide).toBe(1200);
    expect(settings.enhancement.contrast).toBe(2);
    expect(settings.enhancement.brightness).toBe(0.5);
    expect(settings.enhancement.rotation).toBe(270);
  });
  it("normalises a NaN rotation to zero", () => {
    expect(
      normalizeSettings({
        ...DEFAULT_SETTINGS,
        enhancement: { ...DEFAULT_SETTINGS.enhancement, rotation: Number.NaN },
      }).enhancement.rotation,
    ).toBe(0);
  });
  it("exposes honest batch limits", () => {
    expect(OCR_LIMITS.maxFiles).toBeGreaterThan(0);
    expect(OCR_LIMITS.concurrencyChoices).toEqual([1, 2, 3]);
  });
});
