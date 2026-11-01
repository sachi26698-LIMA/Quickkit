import { describe, expect, it } from "vitest";
import {
  CROP_ASPECTS,
  DEFAULT_EDITS,
  buildOutputName,
  centredCrop,
  clampCrop,
  cmFromPx,
  cropIsFull,
  cropWithAspect,
  describeEdits,
  estimateOutputBytes,
  filterCss,
  filterIsIdentity,
  fullCrop,
  hasEdits,
  inchesFromPixels,
  moveCrop,
  normalizeAngle,
  pixelsFromInches,
  previewFilterCss,
  previewTransform,
  printLabel,
  printPixelSize,
  pxFromCm,
  ratioLabel,
  resizeCropByHandle,
  rotatedSize,
  sanitizeFragment,
  validateDpi,
  withDefaults,
  type ImageEdits,
} from "../lib/tools/image-edits";

const edits = (patch: Partial<ImageEdits> = {}): ImageEdits => ({
  ...DEFAULT_EDITS,
  ...patch,
});

describe("crop geometry", () => {
  it("returns the full frame for a missing crop", () => {
    expect(clampCrop(null, 640, 480)).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 480,
    });
  });

  it("clamps out-of-bounds and fractional crops", () => {
    expect(
      clampCrop({ x: -20, y: 900, width: 5000, height: 20.7 }, 640, 480),
    ).toEqual({ x: 0, y: 459, width: 640, height: 21 });
  });

  it("enforces a minimum crop size", () => {
    const result = clampCrop({ x: 10, y: 10, width: 1, height: 1 }, 640, 480);
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
  });

  it("never shrinks below the image when it is tiny", () => {
    expect(clampCrop({ x: 0, y: 0, width: 100, height: 100 }, 4, 3)).toEqual({
      x: 0,
      y: 0,
      width: 4,
      height: 3,
    });
  });

  it("detects a full-frame crop", () => {
    expect(cropIsFull(fullCrop(10, 10), 10, 10)).toBe(true);
    expect(cropIsFull(null, 10, 10)).toBe(true);
    expect(cropIsFull({ x: 1, y: 0, width: 9, height: 10 }, 10, 10)).toBe(false);
  });

  it("builds the largest centred crop for a ratio", () => {
    expect(centredCrop(800, 600, 1)).toEqual({
      x: 100,
      y: 0,
      width: 600,
      height: 600,
    });
    expect(centredCrop(600, 800, 1)).toEqual({
      x: 0,
      y: 100,
      width: 600,
      height: 600,
    });
    expect(centredCrop(800, 600, 16 / 9)).toEqual({
      x: 0,
      y: 75,
      width: 800,
      height: 450,
    });
    expect(centredCrop(800, 600, null)).toEqual(fullCrop(800, 600));
  });

  it("labels common ratios and falls back to decimals", () => {
    expect(ratioLabel({ x: 0, y: 0, width: 400, height: 300 })).toBe("4:3");
    expect(ratioLabel({ x: 0, y: 0, width: 1000, height: 300 })).toBe("3.33:1");
    expect(CROP_ASPECTS.map((option) => option.id)).toContain("9:16");
  });

  it("applies an aspect ratio to an existing crop", () => {
    const next = cropWithAspect(
      { x: 0, y: 0, width: 400, height: 400 },
      800,
      600,
      16 / 9,
    );
    expect(next.width).toBe(400);
    expect(next.height).toBe(225);
  });

  it("moves a crop and keeps it inside the frame", () => {
    const moved = moveCrop({ x: 0, y: 0, width: 200, height: 200 }, 500, -50, 640, 480);
    expect(moved).toEqual({ x: 440, y: 0, width: 200, height: 200 });
  });

  it("resizes from the south-east handle without moving the origin", () => {
    const next = resizeCropByHandle(
      { x: 10, y: 20, width: 100, height: 100 },
      "se",
      40,
      20,
      640,
      480,
      null,
    );
    expect(next).toEqual({ x: 10, y: 20, width: 140, height: 120 });
  });

  it("keeps the opposite corner anchored on the north-west handle", () => {
    const next = resizeCropByHandle(
      { x: 100, y: 100, width: 200, height: 200 },
      "nw",
      20,
      10,
      640,
      480,
      null,
    );
    expect(next.x + next.width).toBe(300);
    expect(next.y + next.height).toBe(300);
    expect(next.width).toBe(180);
    expect(next.height).toBe(190);
  });

  it("respects a fixed ratio while dragging", () => {
    const next = resizeCropByHandle(
      { x: 0, y: 0, width: 200, height: 200 },
      "se",
      100,
      0,
      640,
      480,
      1,
    );
    expect(next.width).toBe(next.height);
    expect(next.width).toBe(300);
  });

  it("does not escape the image when dragging past the edge", () => {
    const next = resizeCropByHandle(
      { x: 0, y: 0, width: 200, height: 200 },
      "se",
      5000,
      5000,
      640,
      480,
      1,
    );
    expect(next.x).toBe(0);
    expect(next.y).toBe(0);
    expect(next.x + next.width).toBeLessThanOrEqual(640);
    expect(next.y + next.height).toBeLessThanOrEqual(480);
    expect(next.width).toBe(next.height);
  });

  it("treats a move handle like a move", () => {
    expect(
      resizeCropByHandle(
        { x: 50, y: 50, width: 100, height: 100 },
        "move",
        10,
        10,
        640,
        480,
        null,
      ),
    ).toEqual({ x: 60, y: 60, width: 100, height: 100 });
  });
});

describe("rotation and flips", () => {
  it("swaps dimensions for quarter turns", () => {
    expect(rotatedSize(800, 600, 90)).toEqual({ width: 600, height: 800 });
    expect(rotatedSize(800, 600, 180)).toEqual({ width: 800, height: 600 });
    expect(rotatedSize(800, 600, 270)).toEqual({ width: 600, height: 800 });
    expect(rotatedSize(800, 600, 0)).toEqual({ width: 800, height: 600 });
    expect(rotatedSize(800, 600, 360)).toEqual({ width: 800, height: 600 });
  });

  it("computes the bounding box of a free angle", () => {
    const size = rotatedSize(100, 100, 45);
    expect(size.width).toBe(141);
    expect(size.height).toBe(141);
  });

  it("normalises angles", () => {
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(Number.NaN)).toBe(0);
    expect(normalizeAngle(359.6)).toBe(0);
  });

  it("describes the transform for live previews", () => {
    expect(previewTransform(edits())).toBeUndefined();
    expect(previewTransform(edits({ rotation: 90 }))).toBe("rotate(90deg)");
    expect(previewTransform(edits({ flipH: true, flipV: true }))).toBe(
      "scaleX(-1) scaleY(-1)",
    );
    expect(previewTransform(edits({ rotation: 45, flipH: true }))).toBe(
      "rotate(45deg) scaleX(-1)",
    );
  });
});

describe("colour adjustments", () => {
  it("builds a canvas filter string", () => {
    expect(filterCss(edits())).toBe(
      "brightness(100%) contrast(100%) saturate(100%)",
    );
    expect(
      filterCss(edits({ brightness: 120, contrast: 90, saturation: 140 })),
    ).toBe("brightness(120%) contrast(90%) saturate(140%)");
    expect(filterCss(edits({ filter: "grayscale" }))).toContain(
      "grayscale(100%)",
    );
    expect(filterCss(edits({ filter: "sepia" }))).toContain("sepia(85%)");
  });

  it("detects an identity filter and clamps values", () => {
    expect(filterIsIdentity(edits())).toBe(true);
    expect(filterIsIdentity(edits({ contrast: 101 }))).toBe(false);
    expect(filterCss(edits({ brightness: 500 }))).toContain("brightness(200%)");
    expect(filterCss(edits({ brightness: -50 }))).toContain("brightness(0%)");
    expect(filterCss(edits({ brightness: Number.NaN }))).toContain(
      "brightness(100%)",
    );
  });

  it("exposes a safe CSS preview value", () => {
    expect(previewFilterCss(edits())).toBe("none");
    expect(previewFilterCss(edits({ brightness: 110 }))).toContain("110%");
  });

  it("reports which edits are active", () => {
    expect(hasEdits(edits())).toBe(false);
    expect(hasEdits(edits({ rotation: 90 }))).toBe(true);
    expect(hasEdits(edits({ crop: fullCrop(10, 10) }), 10, 10)).toBe(false);
    expect(
      hasEdits(edits({ crop: { x: 1, y: 0, width: 9, height: 10 } }), 10, 10),
    ).toBe(true);
    expect(describeEdits(edits({ rotation: 90, flipH: true }))).toEqual([
      "90°",
      "flipped H",
    ]);
    expect(
      describeEdits(edits({ brightness: 80, filter: "sepia" }), 10, 10),
    ).toEqual(["brightness 80%", "sepia"]);
  });

  it("fills defaults for partial edits", () => {
    expect(withDefaults(undefined)).toEqual(DEFAULT_EDITS);
    expect(withDefaults({ rotation: 180 }).rotation).toBe(180);
    expect(withDefaults({ rotation: 180 }).brightness).toBe(100);
  });
});

describe("DPI and print size", () => {
  it("validates DPI", () => {
    expect(validateDpi(300)).toBe(300);
    expect(validateDpi(35.6)).toBe(36);
    expect(() => validateDpi(10)).toThrow("between 36 and 1,200");
    expect(() => validateDpi(2000)).toThrow("between 36 and 1,200");
    expect(() => validateDpi(Number.NaN)).toThrow("must be a number");
  });

  it("converts pixels, inches and centimetres", () => {
    expect(inchesFromPixels(3000, 300)).toBeCloseTo(10);
    expect(pixelsFromInches(10, 300)).toBe(3000);
    expect(pxFromCm(2.54, 300)).toBe(300);
    expect(cmFromPx(3000, 300)).toBeCloseTo(25.4);
    expect(printLabel(3000, 300)).toBe("10.00 in · 25.4 cm");
    expect(printLabel(3000, 0)).toBe("—");
  });

  it("computes the pixels needed for a print", () => {
    expect(printPixelSize(10, 15, 300)).toEqual({ width: 1181, height: 1772 });
  });
});

describe("output naming", () => {
  it("applies rename and suffix fragments", () => {
    expect(
      buildOutputName("Holiday Photo.JPG", {
        baseName: "beach",
        suffix: "web",
        width: 1080,
        height: 1080,
        format: "image/webp",
      }),
    ).toBe("beach-web-1080x1080.webp");
  });

  it("keeps the original name when no override is given", () => {
    expect(
      buildOutputName("Holiday.JPG", {
        width: 800,
        height: 600,
        format: "image/jpeg",
      }),
    ).toBe("Holiday-800x600.jpg");
  });

  it("handles AVIF extensions and empty fragments", () => {
    expect(
      buildOutputName("photo.png", {
        baseName: "  ",
        suffix: "",
        width: 10,
        height: 10,
        format: "image/avif",
      }),
    ).toBe("photo-10x10.avif");
    expect(sanitizeFragment("  ")).toBe("");
    expect(sanitizeFragment("../../evil")).toBe("evil");
  });

  it("strips unsafe characters from overrides", () => {
    expect(
      buildOutputName("a.png", {
        baseName: "my/../file",
        suffix: "v 2",
        width: 1,
        height: 1,
        format: "image/png",
      }),
    ).toBe("my.file-v-2-1x1.png");
  });
});

describe("size estimation", () => {
  it("scales with pixels, format and quality", () => {
    const base = estimateOutputBytes(1000, 1000, "image/jpeg", 85);
    expect(estimateOutputBytes(2000, 2000, "image/jpeg", 85)).toBeGreaterThan(
      base * 3,
    );
    expect(estimateOutputBytes(1000, 1000, "image/jpeg", 50)).toBeLessThan(base);
    expect(estimateOutputBytes(1000, 1000, "image/png", 85)).toBeGreaterThan(
      base,
    );
    expect(estimateOutputBytes(1000, 1000, "image/avif", 85)).toBeLessThan(
      estimateOutputBytes(1000, 1000, "image/webp", 85),
    );
  });

  it("stays positive for tiny or invalid inputs", () => {
    expect(estimateOutputBytes(0, 0, "image/webp", 0)).toBeGreaterThan(0);
    expect(
      estimateOutputBytes(Number.NaN, 10, "image/jpeg", 200),
    ).toBeGreaterThan(0);
  });
});
