// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_HISTORY_RETENTION_KEY,
  MAX_IMAGE_HISTORY_BLOB_BYTES,
  addImageHistoryItem,
  clearImageHistory,
  imageHistorySummary,
  loadImageHistory,
  loadImageHistoryRetention,
  removeImageHistoryItem,
  skipReason,
  saveImageHistoryRetention,
} from "@/lib/tools/image-history";

const sample = {
  sourceName: "Holiday Photo.jpg",
  resultName: "Holiday-Photo-converted.webp",
  mime: "image/webp",
  summary: "1600 × 1200 · WEBP · 82% quality",
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }),
};

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("retention preference", () => {
  it("defaults to session, which persists nothing", () => {
    expect(loadImageHistoryRetention()).toBe("session");
  });

  it("round-trips a chosen retention", () => {
    saveImageHistoryRetention("7d");
    expect(window.localStorage.getItem(IMAGE_HISTORY_RETENTION_KEY)).toBe("7d");
    expect(loadImageHistoryRetention()).toBe("7d");
  });

  it("falls back to session on a stored value it does not recognise", () => {
    window.localStorage.setItem(IMAGE_HISTORY_RETENTION_KEY, "forever");
    expect(loadImageHistoryRetention()).toBe("session");
  });

  it("never throws when storage is unavailable", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadImageHistoryRetention()).toBe("session");
  });
});

describe("history storage degrades safely without IndexedDB", () => {
  it("loads an empty list rather than throwing", async () => {
    expect(await loadImageHistory("7d")).toEqual([]);
  });

  it("returns null instead of failing the conversion", async () => {
    expect(await addImageHistoryItem("7d", sample)).toBeNull();
  });

  it("tolerates remove and clear", async () => {
    await expect(removeImageHistoryItem("nope")).resolves.toBeUndefined();
    await expect(clearImageHistory()).resolves.toBeUndefined();
  });
});

describe("retention and size rules", () => {
  // These exercise the pure predicate directly. Going through
  // addImageHistoryItem cannot prove anything in jsdom: IndexedDB is absent
  // there, so every call returns null regardless of the rules under test.
  it("never stores anything under session retention", () => {
    expect(skipReason("session", 1024)).toBe("session");
    expect(skipReason("session", 0)).toBe("session");
  });

  it("accepts a result under the cap for a persisting retention", () => {
    expect(skipReason("7d", MAX_IMAGE_HISTORY_BLOB_BYTES)).toBeNull();
    expect(skipReason("24h", 1024)).toBeNull();
  });

  it("refuses results over the cap instead of bloating IndexedDB", () => {
    expect(skipReason("7d", MAX_IMAGE_HISTORY_BLOB_BYTES + 1)).toBe(
      "too-large",
    );
    expect(skipReason("24h", 8, 4)).toBe("too-large");
    expect(skipReason("24h", 4, 4)).toBeNull();
  });

  it("still returns null from the async path when storage is unavailable", async () => {
    expect(await addImageHistoryItem("7d", sample)).toBeNull();
  });
});

describe("summary line", () => {
  it("states dimensions and format, and quality only when lossy", () => {
    expect(
      imageHistorySummary({
        width: 1600,
        height: 1200,
        formatLabel: "WEBP",
        quality: 82,
      }),
    ).toBe("1,600 × 1,200 · WEBP · 82% quality");
  });

  it("says lossless rather than inventing a quality number", () => {
    expect(
      imageHistorySummary({
        width: 800,
        height: 600,
        formatLabel: "PNG",
        lossless: true,
      }),
    ).toBe("800 × 600 · PNG · lossless");
  });

  it("rounds a fractional quality", () => {
    expect(
      imageHistorySummary({
        width: 10,
        height: 10,
        formatLabel: "JPEG",
        quality: 73.6,
      }),
    ).toContain("74% quality");
  });
});
