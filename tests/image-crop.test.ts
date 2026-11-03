import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY,
  RATIO_OPTIONS,
  SOCIAL_CROP_PRESETS,
  SOCIAL_PLATFORMS,
  ZOOM_MAX,
  ZOOM_MIN,
  applyCustomSize,
  applyPreset,
  applyRatio,
  applyShape,
  canRedo,
  canUndo,
  clampSettings,
  clampZoom,
  commitHistory,
  createHistory,
  cropOutputName,
  defaultSettings,
  describeSettings,
  estimatedCropBytes,
  flipSettings,
  groupedPresets,
  orientedSize,
  outputPlan,
  presetFor,
  redoHistory,
  resetGeometry,
  resolutionNote,
  rotateCropRect,
  rotateSettings,
  stepZoom,
  undoHistory,
  uniqueName,
  validateCropSettings,
  visibleCrop,
  zoomLabel,
} from "../lib/tools/image-crop";

describe("crop presets", () => {
  it("lists Instagram, YouTube, Facebook and other social sizes", () => {
    for (const platform of [
      "Instagram",
      "YouTube",
      "Facebook",
      "X",
      "LinkedIn",
      "Pinterest",
      "WhatsApp",
    ])
      expect(SOCIAL_PLATFORMS).toContain(platform);
    expect(SOCIAL_CROP_PRESETS.length).toBeGreaterThanOrEqual(15);
    expect(groupedPresets().length).toBe(SOCIAL_PLATFORMS.length);
  });

  it("derives each preset ratio from its pixel size", () => {
    for (const preset of SOCIAL_CROP_PRESETS) {
      expect(preset.ratio).toBeCloseTo(
        (preset.presetWidth as number) / (preset.presetHeight as number),
        6,
      );
      expect(preset.presetWidth).toBeGreaterThan(0);
    }
    const story = SOCIAL_CROP_PRESETS.find(
      (preset) => preset.id === "preset-instagram-story",
    );
    expect(story?.presetWidth).toBe(1080);
    expect(story?.presetHeight).toBe(1920);
  });

  it("has unique ids and a square option", () => {
    expect(new Set(RATIO_OPTIONS.map((option) => option.id)).size).toBe(
      RATIO_OPTIONS.length,
    );
    expect(RATIO_OPTIONS.find((option) => option.id === "1:1")?.ratio).toBe(1);
    expect(RATIO_OPTIONS.find((option) => option.id === "free")?.ratio).toBe(
      null,
    );
  });
});

describe("crop geometry", () => {
  it("starts with the full frame and a natural output size", () => {
    const settings = defaultSettings(1200, 800);
    expect(settings.rect).toEqual({ x: 0, y: 0, width: 1200, height: 800 });
    expect(outputPlan(settings, 1200, 800)).toEqual({
      width: 1200,
      height: 800,
    });
    expect(settings.shape).toBe("rect");
    expect(settings.suffix).toBe("cropped");
  });

  it("centres the largest crop for a fixed ratio", () => {
    const settings = applyRatio(defaultSettings(1200, 800), 1200, 800, "1:1");
    expect(settings.rect).toEqual({ x: 200, y: 0, width: 800, height: 800 });
    expect(settings.ratioId).toBe("1:1");

    const wide = applyRatio(defaultSettings(800, 1200), 800, 1200, "16:9");
    expect(wide.rect.width).toBe(800);
    expect(wide.rect.height).toBe(450);
    expect(wide.rect.y).toBe(375);
  });

  it("keeps a free crop when the ratio is unlocked", () => {
    const square = applyRatio(defaultSettings(900, 600), 900, 600, "1:1");
    expect(square.rect.width).toBe(square.rect.height);
    const free = applyRatio(square, 900, 600, "free");
    expect(free.ratioId).toBe("free");
    expect(free.rect).toEqual(square.rect);
  });

  it("squares and circles force a 1:1 crop", () => {
    const base = applyRatio(defaultSettings(1000, 700), 1000, 700, "4:3");
    const square = applyShape(base, 1000, 700, "square");
    expect(square.rect.width).toBe(square.rect.height);
    expect(square.ratioId).toBe("1:1");

    const circle = applyShape(base, 1000, 700, "circle");
    expect(circle.shape).toBe("circle");
    expect(circle.rect.width).toBe(circle.rect.height);
    expect(outputPlan(circle, 1000, 700).width).toBe(
      outputPlan(circle, 1000, 700).height,
    );

    // Shape changes recentre the largest square, like the 1:1 ratio chip.
    const wide = applyRatio(defaultSettings(1200, 800), 1200, 800, "16:9");
    expect(wide.rect).toEqual({ x: 0, y: 62, width: 1200, height: 675 });
    expect(applyShape(wide, 1200, 800, "circle").rect).toEqual({
      x: 200,
      y: 0,
      width: 800,
      height: 800,
    });

    expect(applyShape(base, 1000, 700, "rect").shape).toBe("rect");
  });

  it("applies a social preset ratio and export size", () => {
    const settings = applyPreset(
      defaultSettings(4000, 3000),
      4000,
      3000,
      "preset-instagram-post",
    );
    expect(settings.rect.width).toBe(3000);
    expect(settings.rect.height).toBe(3000);
    expect(settings.sizeMode).toBe("preset");
    expect(outputPlan(settings, 4000, 3000)).toEqual({
      width: 1080,
      height: 1080,
    });
    expect(presetFor("preset-youtube-thumbnail")).toEqual({
      width: 1280,
      height: 720,
      label: "YouTube thumbnail",
    });
  });

  it("sets a custom width and height with its ratio", () => {
    const settings = applyCustomSize(
      defaultSettings(1600, 1200),
      1600,
      1200,
      600,
      600,
    );
    expect(settings.ratioId).toBe("custom");
    expect(settings.sizeMode).toBe("custom");
    expect(settings.rect).toEqual({ x: 200, y: 0, width: 1200, height: 1200 });
    expect(outputPlan(settings, 1600, 1200)).toEqual({
      width: 600,
      height: 600,
    });
  });

  it("rejects impossible custom sizes", () => {
    const base = defaultSettings(4000, 3000);
    expect(() => applyCustomSize(base, 4000, 3000, 0, 100)).toThrow(
      /at least/i,
    );
    expect(() => applyCustomSize(base, 4000, 3000, 100, 9000)).toThrow(/8,192/);
    expect(() => applyCustomSize(base, 4000, 3000, 6000, 5000)).toThrow(
      /24 megapixels/i,
    );
    expect(() => applyCustomSize(base, 4000, 3000, 100.5, 100)).toThrow(
      /whole number/i,
    );
  });

  it("rotates the crop with the image", () => {
    const rect = { x: 0, y: 0, width: 200, height: 100 };
    expect(rotateCropRect(rect, 1000, 500, "cw")).toEqual({
      x: 400,
      y: 0,
      width: 100,
      height: 200,
    });
    expect(rotateCropRect(rect, 1000, 500, "ccw")).toEqual({
      x: 0,
      y: 800,
      width: 100,
      height: 200,
    });
  });

  it("tracks rotation state and swaps the displayed size", () => {
    let settings = defaultSettings(1000, 500);
    settings = rotateSettings(settings, 1000, 500, 90);
    expect(settings.rotation).toBe(90);
    expect(orientedSize(1000, 500, 90)).toEqual({ width: 500, height: 1000 });
    expect(outputPlan(settings, 1000, 500)).toEqual({
      width: 500,
      height: 1000,
    });
    settings = rotateSettings(settings, 1000, 500, 90);
    expect(settings.rotation).toBe(180);
    settings = rotateSettings(settings, 1000, 500, -90);
    expect(settings.rotation).toBe(90);
  });

  it("applies ratios and shapes to the rotated frame", () => {
    const rotated = rotateSettings(defaultSettings(400, 300), 400, 300, 90);
    expect(orientedSize(400, 300, rotated.rotation)).toEqual({
      width: 300,
      height: 400,
    });
    expect(applyRatio(rotated, 400, 300, "16:9").rect).toEqual({
      x: 0,
      y: 115,
      width: 300,
      height: 169,
    });
    expect(applyShape(rotated, 400, 300, "circle").rect).toEqual({
      x: 0,
      y: 50,
      width: 300,
      height: 300,
    });
    expect(
      outputPlan(applyShape(rotated, 400, 300, "square"), 400, 300),
    ).toEqual({ width: 300, height: 300 });
  });

  it("rotates back to the original frame cleanly", () => {
    let settings = defaultSettings(400, 300);
    settings = rotateSettings(settings, 400, 300, 90);
    settings = rotateSettings(settings, 400, 300, -90);
    expect(settings.rotation).toBe(0);
    expect(settings.rect).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    settings = rotateSettings(settings, 400, 300, 180);
    settings = rotateSettings(settings, 400, 300, 180);
    expect(settings.rotation).toBe(0);
    expect(settings.rect).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  it("keeps a rotate-then-reset crop inside the swapped frame", () => {
    let settings = rotateSettings(defaultSettings(1000, 500), 1000, 500, 90);
    settings = applyRatio(settings, 1000, 500, "1:1");
    expect(settings.rect.width).toBeLessThanOrEqual(500);
    expect(settings.rect.height).toBeLessThanOrEqual(1000);
  });

  it("keeps 180° rotations mirrored correctly", () => {
    const base = applyRatio(defaultSettings(1000, 600), 1000, 600, "1:1");
    const kept = rotateSettings(base, 1000, 600, 180);
    expect(kept.rect.x).toBe(1000 - (base.rect.x + base.rect.width));
    expect(kept.rect.y).toBe(600 - (base.rect.y + base.rect.height));
    expect(kept.rect.width).toBe(base.rect.width);
  });

  it("mirrors the crop when flipped", () => {
    const base = applyRatio(defaultSettings(1000, 600), 1000, 600, "1:1");
    const moved = { ...base, rect: { x: 0, y: 0, width: 400, height: 400 } };
    const flipped = flipSettings(moved, 1000, 600, "h");
    expect(flipped.flipH).toBe(true);
    expect(flipped.rect.x).toBe(600);
    const vertical = flipSettings(moved, 1000, 600, "v");
    expect(vertical.rect.y).toBe(200);
    expect(flipSettings(flipped, 1000, 600, "h").rect).toEqual(moved.rect);
  });

  it("clamps stale crops after a rotation change", () => {
    const settings = clampSettings(
      {
        ...defaultSettings(800, 400),
        rotation: 90,
        rect: { x: 700, y: 300, width: 300, height: 300 },
      },
      800,
      400,
    );
    expect(settings.rect.x + settings.rect.width).toBeLessThanOrEqual(400);
    expect(settings.rect.y + settings.rect.height).toBeLessThanOrEqual(800);
  });

  it("resets geometry without losing export preferences", () => {
    let settings = applyShape(defaultSettings(900, 600), 900, 600, "circle");
    settings = rotateSettings(settings, 900, 600, 90);
    settings = { ...settings, format: "image/png", baseName: "avatar" };
    const reset = resetGeometry(settings, 900, 600);
    expect(reset.rect).toEqual({ x: 0, y: 0, width: 900, height: 600 });
    expect(reset.rotation).toBe(0);
    expect(reset.shape).toBe("rect");
    expect(reset.format).toBe("image/png");
    expect(reset.baseName).toBe("avatar");
  });
});

describe("crop output", () => {
  it("honours scale, custom and preset export sizes", () => {
    const base = defaultSettings(1000, 800);
    expect(
      outputPlan({ ...base, sizeMode: "scale", scale: 50 }, 1000, 800),
    ).toEqual({ width: 500, height: 400 });
    expect(
      outputPlan(
        { ...base, sizeMode: "custom", width: 320, height: 240 },
        1000,
        800,
      ),
    ).toEqual({ width: 320, height: 240 });
    expect(
      outputPlan(
        { ...base, sizeMode: "preset", ratioId: "preset-youtube-thumbnail" },
        1000,
        800,
      ),
    ).toEqual({ width: 1280, height: 720 });
  });

  it("validates quality, format and JPEG backgrounds", () => {
    const base = defaultSettings(800, 600);
    expect(() =>
      validateCropSettings({ ...base, quality: 5 }, 800, 600),
    ).toThrow(/Quality/);
    expect(() =>
      validateCropSettings(
        { ...base, format: "image/avif" as never },
        800,
        600,
      ),
    ).toThrow(/JPEG, PNG or WebP/);
    expect(() =>
      validateCropSettings(
        { ...base, format: "image/jpeg", background: "white" },
        800,
        600,
      ),
    ).toThrow(/background colour/);
    expect(
      validateCropSettings(
        { ...base, format: "image/jpeg", background: "#000000" },
        800,
        600,
      ),
    ).toMatchObject({ width: 800, height: 600 });
  });

  it("explains when the export is 1:1, downscaled or upscaled", () => {
    const base = defaultSettings(2000, 1500);
    expect(resolutionNote(base, 2000, 1500)).toMatch(/1:1 crop pixels/);
    expect(
      resolutionNote({ ...base, sizeMode: "scale", scale: 50 }, 2000, 1500),
    ).toMatch(/Downscaled to 1000 × 750/);
    expect(
      resolutionNote(
        { ...base, sizeMode: "custom", width: 4000, height: 3000 },
        2000,
        1500,
      ),
    ).toMatch(/Upscaled to 4000 × 3000/);
  });

  it("estimates bytes and describes the edit", () => {
    const settings = applyShape(
      defaultSettings(1200, 900),
      1200,
      900,
      "circle",
    );
    expect(estimatedCropBytes(settings, 1200, 900)).toBeGreaterThan(0);
    const labels = describeSettings(settings, 1200, 900);
    expect(labels).toContain("circle");
    expect(labels).toContain("1:1");
    expect(labels.at(-1)).toBe("900 × 900");
  });

  it("builds safe, custom output names", () => {
    const settings = {
      ...defaultSettings(1200, 900),
      baseName: "my photo",
      suffix: "ig",
    };
    expect(
      cropOutputName("photo.png", settings, { width: 1080, height: 1080 }),
    ).toBe("my-photo-ig-1080x1080.webp");
    expect(
      cropOutputName("../../etc/passwd", defaultSettings(10, 10), {
        width: 10,
        height: 10,
      }),
    ).toBe("etcpasswd-cropped-10x10.webp");
    const used = new Set<string>();
    expect(uniqueName("a.jpg", used)).toBe("a.jpg");
    expect(uniqueName("a.jpg", used)).toBe("a (2).jpg");
    expect(uniqueName("a.jpg", used)).toBe("a (3).jpg");
  });
});

describe("undo and redo", () => {
  it("walks backwards and forwards through edits", () => {
    let history = createHistory(1);
    history = commitHistory(history, 2);
    history = commitHistory(history, 3);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
    history = undoHistory(history);
    expect(history.present).toBe(2);
    expect(canRedo(history)).toBe(true);
    history = undoHistory(undoHistory(history));
    expect(history.present).toBe(1);
    expect(undoHistory(history)).toBe(history);
    history = redoHistory(history);
    expect(history.present).toBe(2);
    history = commitHistory(history, 9);
    expect(history.future).toEqual([]);
    expect(canRedo(history)).toBe(false);
  });

  it("ignores no-op commits and caps the stack", () => {
    let history = createHistory({ a: 1 });
    expect(commitHistory(history, { a: 1 })).toBe(history);
    for (let index = 0; index < MAX_HISTORY + 10; index += 1)
      history = commitHistory(history, { a: index + 2 });
    expect(history.past).toHaveLength(MAX_HISTORY);
    expect(history.present).toEqual({ a: MAX_HISTORY + 11 });
  });
});

describe("zoom and visible area", () => {
  it("clamps and steps the stage zoom", () => {
    expect(clampZoom(5)).toBe(ZOOM_MIN);
    expect(clampZoom(999)).toBe(ZOOM_MAX);
    expect(clampZoom(Number.NaN)).toBe(100);
    expect(stepZoom(100, 1)).toBe(125);
    expect(stepZoom(100, -1)).toBe(75);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
    expect(zoomLabel(150)).toBe("150%");
  });

  it("turns the scrolled viewport into a crop rectangle", () => {
    expect(
      visibleCrop(
        { scrollLeft: 100, scrollTop: 50, clientWidth: 400, clientHeight: 300 },
        2,
        2000,
        1500,
      ),
    ).toEqual({ x: 50, y: 25, width: 200, height: 150 });
    expect(
      visibleCrop(
        { scrollLeft: 0, scrollTop: 0, clientWidth: 5000, clientHeight: 5000 },
        1,
        800,
        600,
      ),
    ).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });
});
