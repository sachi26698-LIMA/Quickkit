// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import catalogueJson from "../lib/fonts/data/catalogue.json";
import type { FontRecord } from "../lib/fonts/types";

const catalogue = catalogueJson as unknown as { fonts: FontRecord[] };

type FakeFace = {
  family: string;
  source: string;
  descriptors: FontFaceDescriptors;
  status: string;
  loaded: boolean;
  load: () => Promise<FakeFace>;
};

const faces: FakeFace[] = [];
let failNext = false;

class MockFontFace implements FakeFace {
  family: string;
  source: string;
  descriptors: FontFaceDescriptors;
  status = "unloaded";
  loaded = false;

  constructor(
    family: string,
    source: string,
    descriptors: FontFaceDescriptors = {},
  ) {
    this.family = family;
    this.source = source;
    this.descriptors = descriptors;
    faces.push(this);
  }

  load() {
    if (failNext) {
      failNext = false;
      this.status = "error";
      return Promise.reject(new Error("network"));
    }
    this.status = "loaded";
    this.loaded = true;
    return Promise.resolve(this);
  }
}

const font = catalogue.fonts.find((entry) => entry.slug === "hind")!;
const variableFont = catalogue.fonts.find((entry) => entry.slug === "akshar")!;

beforeEach(async () => {
  faces.length = 0;
  failNext = false;
  vi.resetModules();
  vi.stubGlobal("FontFace", MockFontFace);
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      add: vi.fn(),
      load: vi.fn(() => Promise.resolve([])),
      check: vi.fn(() => true),
      ready: Promise.resolve(),
    },
  });
});

describe("on-demand Devanagari loader", () => {
  it("registers and awaits only the requested weight", async () => {
    const loader = await import("../lib/fonts/loader");
    const state = vi.fn();
    loader.subscribeFontState(state);

    const ok = await loader.loadFont(font, 500);
    expect(ok).toBe(true);
    expect(loader.fontFamilyName("hind")).toBe("BioCraft Hindi hind");

    // Only the requested Devanagari weight is registered and awaited.
    expect(faces).toHaveLength(1);
    const devanagari = faces[0];
    expect(devanagari.source).toContain(
      "/fonts/hindi/hind/devanagari-500.woff2",
    );
    expect(devanagari.loaded).toBe(true);
    expect(devanagari?.descriptors.unicodeRange).toContain("U+0900-097F");
    expect(devanagari?.descriptors.display).toBe("swap");
    expect(state).toHaveBeenCalledWith("hind", "loaded");
    expect(loader.fontLoadState("hind")).toBe("loaded");
  });

  it("loads the Latin subset only when the text needs it", async () => {
    const loader = await import("../lib/fonts/loader");
    expect(loader.containsLatin("नमस्ते")).toBe(false);
    expect(loader.containsLatin("नमस्ते BioCraft")).toBe(true);

    await loader.loadFont(font, 400, { latin: true });
    const latin = faces.find((face) => face.source.includes("latin"));
    // Registered with unicode-range, not preloaded — the browser fetches it on
    // the first Latin glyph.
    expect(latin).toBeTruthy();
    expect(latin?.loaded).toBe(false);
  });

  it("uses the variable range descriptor for variable families", async () => {
    const loader = await import("../lib/fonts/loader");
    await loader.loadFont(variableFont, 650);
    const face = faces.find((entry) => entry.source.includes("devanagari"));
    expect(face?.descriptors.weight).toBe(
      `${variableFont.variable?.wght.min} ${variableFont.variable?.wght.max}`,
    );
    expect(face?.source).toContain("/fonts/hindi/akshar/devanagari.woff2");
  });

  it("deduplicates in-flight work and retries after a failure", async () => {
    const loader = await import("../lib/fonts/loader");
    failNext = true;
    const failed = await loader.loadFont(font, 400);
    expect(failed).toBe(false);
    expect(loader.fontLoadState("hind")).toBe("error");

    const retried = await loader.loadFont(font, 400);
    expect(retried).toBe(true);

    const before = faces.length;
    await Promise.all([
      loader.loadFont(font, 400),
      loader.loadFont(font, 400),
      loader.loadFont(font, 400),
    ]);
    expect(faces.length).toBe(before);
  });

  it("reports failure rather than pretending the family loaded", async () => {
    const loader = await import("../lib/fonts/loader");
    failNext = true;
    expect(await loader.loadFont(font, 400)).toBe(false);
    expect(loader.fontLoadState("hind")).toBe("error");
  });
});
