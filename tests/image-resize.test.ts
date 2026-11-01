import { describe, expect, it } from "vitest";
import {
  ALL_PRESETS,
  MAX_DIMENSION,
  PRESET_SIZES,
  SOCIAL_PLATFORMS,
  SOCIAL_PRESETS,
  presetsByPlatform,
  linkedHeight,
  linkedWidth,
  extensionFor,
  formatLabel,
  outputFileName,
  planResize,
  sanitizeBaseName,
  scalePercent,
  sizeDeltaLabel,
  uniqueName,
  validateOutputSize,
  validatePercentage,
  type ResizeSettings,
} from "../lib/tools/image-resize";

const base: ResizeSettings = {
  mode: "dimensions",
  width: 320,
  height: 240,
  lockAspect: true,
  percentage: 50,
  fit: "cover",
  preset: { width: 1080, height: 1080 },
};

const settings = (patch: Partial<ResizeSettings>): ResizeSettings => ({
  ...base,
  ...patch,
});

describe("dimension mode", () => {
  it("uses both values when the aspect ratio is unlocked", () =>
    expect(
      planResize(
        640,
        480,
        settings({ lockAspect: false, width: 300, height: 300 }),
      ),
    ).toMatchObject({ width: 300, height: 300, crop: null }));

  it("derives the height from width when locked", () =>
    expect(
      planResize(640, 480, settings({ width: 320, height: 999 })),
    ).toMatchObject({ width: 320, height: 240 }));

  it("derives a portrait height for portrait sources", () =>
    expect(
      planResize(480, 640, settings({ width: 240, height: 1 })),
    ).toMatchObject({
      width: 240,
      height: 320,
    }));

  it("keeps the original height when the width is unchanged", () =>
    expect(
      planResize(640, 480, settings({ width: 640, height: 1 })),
    ).toMatchObject({
      width: 640,
      height: 480,
    }));

  it.each([
    [0, "at least 1 pixel"],
    [-5, "at least 1 pixel"],
    [12.5, "whole number"],
    [MAX_DIMENSION + 1, "8,192 pixels or less"],
  ])("rejects invalid width %s", (width, message) =>
    expect(() =>
      planResize(640, 480, settings({ lockAspect: false, width })),
    ).toThrow(message),
  );

  it("rejects outputs above 24 megapixels", () =>
    expect(() =>
      planResize(
        8000,
        6000,
        settings({ lockAspect: false, width: 6000, height: 5000 }),
      ),
    ).toThrow("24 megapixels"));

  it("allows exactly 24 megapixels", () =>
    expect(
      planResize(
        8000,
        6000,
        settings({ lockAspect: false, width: 6000, height: 4000 }),
      ),
    ).toMatchObject({ width: 6000, height: 4000 }));
});

describe("percentage mode", () => {
  it("halves both sides", () =>
    expect(
      planResize(640, 480, settings({ mode: "percentage", percentage: 50 })),
    ).toMatchObject({ width: 320, height: 240 }));

  it("rounds to whole pixels", () =>
    expect(
      planResize(101, 99, settings({ mode: "percentage", percentage: 25 })),
    ).toMatchObject({ width: 25, height: 25 }));

  it("never produces a zero-pixel side", () =>
    expect(
      planResize(1, 1, settings({ mode: "percentage", percentage: 5 })),
    ).toMatchObject({ width: 1, height: 1 }));

  it("scales up", () =>
    expect(
      planResize(100, 50, settings({ mode: "percentage", percentage: 400 })),
    ).toMatchObject({ width: 400, height: 200 }));

  it.each([4, 401, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects percentage %s",
    (percentage) =>
      expect(() =>
        planResize(640, 480, settings({ mode: "percentage", percentage })),
      ).toThrow("between 5% and 400%"),
  );

  it("explains when a percentage exceeds the per-side limit", () =>
    expect(() =>
      planResize(4000, 3000, settings({ mode: "percentage", percentage: 300 })),
    ).toThrow("over the 8,192 px limit"));
});

describe("longest and shortest side modes", () => {
  it("scales a landscape image by its longest side", () =>
    expect(
      planResize(1600, 1200, settings({ mode: "longest", sideLength: 800 })),
    ).toMatchObject({ width: 800, height: 600 }));

  it("scales a portrait image by its longest side", () =>
    expect(
      planResize(1200, 1600, settings({ mode: "longest", sideLength: 800 })),
    ).toMatchObject({ width: 600, height: 800 }));

  it("scales by the shortest side", () =>
    expect(
      planResize(1600, 1200, settings({ mode: "shortest", sideLength: 600 })),
    ).toMatchObject({ width: 800, height: 600 }));

  it("refuses a shortest side larger than the image", () =>
    expect(() =>
      planResize(1600, 1200, settings({ mode: "shortest", sideLength: 2000 })),
    ).toThrow("shortest side of this image is 1,200 px"));

  it("refuses outputs above 24 megapixels", () =>
    expect(() =>
      planResize(4000, 3000, settings({ mode: "longest", sideLength: 8192 })),
    ).toThrow("24 megapixels"));


  it("requires a positive whole side length", () =>
    expect(() =>
      planResize(1600, 1200, settings({ mode: "longest", sideLength: 0 })),
    ).toThrow("at least 1 pixel"));
});

describe("preset mode", () => {
  it("fills and crops a landscape image to a square", () => {
    const plan = planResize(
      640,
      480,
      settings({ mode: "preset", fit: "cover" }),
    );
    expect(plan).toMatchObject({ width: 1080, height: 1080, cropped: true });
    expect(plan.crop).toEqual({ x: 80, y: 0, width: 480, height: 480 });
  });

  it("crops a portrait image vertically", () => {
    const plan = planResize(
      480,
      640,
      settings({ mode: "preset", fit: "cover" }),
    );
    expect(plan.crop).toEqual({ x: 0, y: 80, width: 480, height: 480 });
  });

  it("does not crop a source that already matches", () => {
    const plan = planResize(
      1080,
      1080,
      settings({ mode: "preset", fit: "cover" }),
    );
    expect(plan.cropped).toBe(false);
    expect(plan.crop).toEqual({ x: 0, y: 0, width: 1080, height: 1080 });
  });

  it("fits inside without cropping", () => {
    const plan = planResize(
      640,
      480,
      settings({ mode: "preset", fit: "contain" }),
    );
    expect(plan).toMatchObject({
      width: 1080,
      height: 810,
      cropped: false,
      crop: null,
    });
  });

  it("stretches to the exact preset box", () => {
    const plan = planResize(
      640,
      480,
      settings({ mode: "preset", fit: "stretch" }),
    );
    expect(plan).toMatchObject({ width: 1080, height: 1080, crop: null });
  });

  it("rejects a missing preset", () =>
    expect(() =>
      planResize(640, 480, settings({ mode: "preset", preset: null })),
    ).toThrow("Choose a preset"));

  it.each(ALL_PRESETS)("supports the $label preset", (preset) => {
    const plan = planResize(
      1600,
      1200,
      settings({ mode: "preset", preset, fit: "cover" }),
    );
    expect(plan).toMatchObject({ width: preset.width, height: preset.height });
  });

  it("exposes unique ids and realistic social dimensions", () => {
    expect(new Set(ALL_PRESETS.map((preset) => preset.id)).size).toBe(
      ALL_PRESETS.length,
    );
    expect(
      SOCIAL_PRESETS.find((preset) => preset.id === "instagram-post"),
    ).toMatchObject({
      width: 1080,
      height: 1080,
    });
    expect(PRESET_SIZES.length).toBeGreaterThanOrEqual(6);
  });

  it("groups social presets for every supported platform", () => {
    const platforms = new Set(SOCIAL_PRESETS.map((preset) => preset.platform));
    for (const platform of [
      "Instagram",
      "YouTube",
      "Facebook",
      "WhatsApp",
      "X",
    ])
      expect(platforms.has(platform)).toBe(true);
    expect(presetsByPlatform("WhatsApp").length).toBeGreaterThanOrEqual(2);
    expect(presetsByPlatform("Instagram")).toHaveLength(4);
    expect(SOCIAL_PLATFORMS.length).toBeGreaterThanOrEqual(7);
  });

  it("uses exact, well-known social dimensions", () => {
    const find = (id: string) => SOCIAL_PRESETS.find((preset) => preset.id === id);
    expect(find("instagram-story")).toMatchObject({ width: 1080, height: 1920 });
    expect(find("youtube-thumbnail")).toMatchObject({ width: 1280, height: 720 });
    expect(find("facebook-post")).toMatchObject({ width: 1200, height: 630 });
    expect(find("whatsapp-status")).toMatchObject({ width: 1080, height: 1920 });
    expect(find("x-post")).toMatchObject({ width: 1600, height: 900 });
  });
});

describe("helpers", () => {
  it("links height and width with rounding and clamping", () => {
    expect(linkedHeight(320, 640, 480)).toBe(240);
    expect(linkedWidth(240, 640, 480)).toBe(320);
    expect(linkedHeight(99999, 640, 480)).toBe(MAX_DIMENSION);
    expect(linkedHeight(0, 640, 480)).toBe(1);
  });

  it("validates output bounds", () => {
    expect(validateOutputSize(8192, 1)).toEqual({ width: 8192, height: 1 });
    expect(() => validateOutputSize(0, 10)).toThrow("at least 1 pixel");
    expect(() => validateOutputSize(9000, 10)).toThrow("8,192");
    expect(() => validateOutputSize(8192, 3000)).toThrow("24 megapixels");
  });

  it.each([
    [5, 5],
    [400, 400],
  ])("accepts percentage %s", (percentage) =>
    expect(validatePercentage(percentage)).toBe(percentage),
  );

  it("describes file-size changes in plain language", () => {
    expect(sizeDeltaLabel(500, 1000)).toBe("50% smaller than the source file");
    expect(sizeDeltaLabel(2000, 1000)).toBe("100% larger than the source file");
    expect(sizeDeltaLabel(1001, 1000)).toBe(
      "about the same as the source file",
    );
    expect(sizeDeltaLabel(999, 1000)).toBe("about the same as the source file");
    expect(sizeDeltaLabel(0, 1000)).toBe("100% smaller than the source file");
    expect(sizeDeltaLabel(1000, 0)).toBe("file size unavailable");
    expect(sizeDeltaLabel(Number.NaN, 10)).toBe("file size unavailable");
  });

  it("computes scale percentages safely", () => {
    expect(scalePercent(320, 640)).toBe(50);
    expect(scalePercent(5, 0)).toBe(0);
  });

  it("sanitises unsafe names and keeps useful characters", () => {
    expect(sanitizeBaseName("../../Holiday Photo (1).PNG")).toBe(
      "Holiday-Photo-1",
    );
    expect(sanitizeBaseName("café_über.jpg")).toBe("cafe-uber");
    expect(sanitizeBaseName("😀.png")).toBe("image");
    expect(sanitizeBaseName("a".repeat(120)).length).toBeLessThanOrEqual(60);
    expect(sanitizeBaseName("name.tar.gz")).toBe("name.tar");
  });

  it("builds readable output names", () => {
    expect(outputFileName("Holiday.JPG", 1920, 1080, "image/webp")).toBe(
      "Holiday-1920x1080.webp",
    );
    expect(outputFileName("photo.png", 800, 600, "image/jpeg")).toBe(
      "photo-800x600.jpg",
    );
    expect(outputFileName("", 1, 1, "image/png")).toBe("image-1x1.png");
    expect(outputFileName("photo.jpg", 100, 100, "image/avif")).toBe(
      "photo-100x100.avif",
    );
    expect(extensionFor("image/avif")).toBe("avif");
    expect(formatLabel("image/avif")).toBe("AVIF");
  });

  it("deduplicates ZIP entry names case-insensitively", () => {
    const used = new Set<string>();
    expect(uniqueName("photo-100x100.png", used)).toBe("photo-100x100.png");
    expect(uniqueName("photo-100x100.png", used)).toBe("photo-100x100 (2).png");
    expect(uniqueName("PHOTO-100x100.PNG", used)).toBe("PHOTO-100x100 (3).PNG");
    expect(uniqueName("no-extension", used)).toBe("no-extension");
  });

  it("rejects invalid sources", () => {
    expect(() => planResize(0, 100, base)).toThrow("invalid pixel");
    expect(() => planResize(100.5, 100, base)).toThrow("invalid pixel");
  });
});
