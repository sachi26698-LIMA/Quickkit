import { describe, expect, it } from "vitest";
import {
  applyTone,
  cropPixels,
  estimateSkew,
  inkRatio,
  medianDenoise,
  normalizeCrop,
  otsuThreshold,
  planOcrScale,
  resamplePixels,
  rotateArbitrary,
  rotateQuarterTurns,
  type PixelBuffer,
} from "@/lib/tools/image-to-text/preprocess";

/** Build a white image with an optional dark rectangle (a fake glyph block). */
function synthetic(
  width: number,
  height: number,
  rect?: { x: number; y: number; w: number; h: number; value?: number },
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  if (rect) {
    const value = rect.value ?? 0;
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const offset = (y * width + x) * 4;
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
      }
    }
  }
  return { data, width, height };
}

const pixel = (buffer: PixelBuffer, x: number, y: number) => {
  const offset = (y * buffer.width + x) * 4;
  return [
    buffer.data[offset],
    buffer.data[offset + 1],
    buffer.data[offset + 2],
    buffer.data[offset + 3],
  ];
};

describe("crop", () => {
  it("clamps normalised crops into the unit square", () => {
    expect(normalizeCrop({ x: -1, y: 2, width: 3, height: 0.001 })).toEqual({
      x: 0,
      y: 0.98,
      width: 1,
      height: 0.02,
    });
    expect(normalizeCrop(undefined)).toBeNull();
    expect(normalizeCrop({ x: 0, y: 0, width: 1, height: 1 })).not.toBeNull();
  });
  it("returns the source when the crop covers everything", () => {
    const source = synthetic(10, 10);
    expect(cropPixels(source, undefined)).toBe(source);
    expect(cropPixels(source, { x: 0, y: 0, width: 1, height: 1 })).toBe(
      source,
    );
  });
  it("keeps only the requested region", () => {
    const source = synthetic(100, 100, { x: 40, y: 40, w: 20, h: 20 });
    const cropped = cropPixels(source, {
      x: 0.4,
      y: 0.4,
      width: 0.2,
      height: 0.2,
    });
    expect(cropped.width).toBe(20);
    expect(cropped.height).toBe(20);
    expect(pixel(cropped, 0, 0)).toEqual([0, 0, 0, 255]);
  });
});

describe("rotation", () => {
  const source = synthetic(4, 2, { x: 0, y: 0, w: 1, h: 1 });
  it("rotates 90° and swaps dimensions", () => {
    const rotated = rotateQuarterTurns(source, 90);
    expect(rotated.width).toBe(2);
    expect(rotated.height).toBe(4);
    // Top-left dark pixel moves to the top-right corner.
    expect(pixel(rotated, 1, 0)).toEqual([0, 0, 0, 255]);
  });
  it("rotates 180° in place", () => {
    const rotated = rotateQuarterTurns(source, 180);
    expect(rotated.width).toBe(4);
    expect(pixel(rotated, 3, 1)).toEqual([0, 0, 0, 255]);
  });
  it("is identity for 0 and 360", () => {
    expect(rotateQuarterTurns(source, 0)).toBe(source);
    expect(rotateQuarterTurns(source, 360)).toBe(source);
  });
  it("normalises negative and oversized angles", () => {
    const rotated = rotateQuarterTurns(source, -90);
    expect(rotated.width).toBe(2);
    expect(rotateQuarterTurns(source, 450).width).toBe(2);
  });
  it("rotates arbitrary angles onto a white background", () => {
    const rotated = rotateArbitrary(source, 15);
    expect(rotated.width).toBeGreaterThanOrEqual(4);
    expect(pixel(rotated, 0, 0)[3]).toBe(255);
    expect(rotateArbitrary(source, 0)).toBe(source);
  });
});

describe("tone", () => {
  it("does nothing when settings are neutral", () => {
    const source = synthetic(2, 2);
    expect(
      applyTone(source, {
        grayscale: false,
        contrast: 1,
        brightness: 1,
        binarize: false,
      }),
    ).toBe(source);
  });
  it("converts to grayscale", () => {
    const source = synthetic(1, 1);
    source.data[0] = 255;
    source.data[1] = 0;
    source.data[2] = 0;
    const out = applyTone(source, {
      grayscale: true,
      contrast: 1,
      brightness: 1,
      binarize: false,
    });
    expect(out.data[0]).toBe(out.data[1]);
    expect(out.data[1]).toBe(out.data[2]);
  });
  it("raises contrast around mid-grey", () => {
    const source = synthetic(1, 1);
    source.data[0] = 200;
    source.data[1] = 200;
    source.data[2] = 200;
    const out = applyTone(source, {
      grayscale: false,
      contrast: 1.5,
      brightness: 1,
      binarize: false,
    });
    expect(out.data[0]).toBe(236);
  });
  it("binarises with Otsu into pure black and white", () => {
    const source = synthetic(20, 20, { x: 5, y: 5, w: 10, h: 10, value: 40 });
    const out = applyTone(source, {
      grayscale: false,
      contrast: 1,
      brightness: 1,
      binarize: true,
    });
    expect(new Set([out.data[0], out.data[(10 * 20 + 10) * 4]])).toEqual(
      new Set([0, 255]),
    );
  });
  it("computes a sensible Otsu threshold", () => {
    const luma = new Uint8Array(200);
    luma.fill(10, 0, 100);
    luma.fill(240, 100);
    const threshold = otsuThreshold(luma);
    expect(threshold).toBeGreaterThanOrEqual(10);
    expect(threshold).toBeLessThan(240);
    expect(otsuThreshold(new Uint8Array(0))).toBe(128);
  });
});

describe("denoise", () => {
  it("removes an isolated speck", () => {
    const source = synthetic(5, 5);
    const offset = (2 * 5 + 2) * 4;
    source.data[offset] = 0;
    source.data[offset + 1] = 0;
    source.data[offset + 2] = 0;
    const out = medianDenoise(source);
    expect(out.data[offset]).toBe(255);
  });
  it("leaves tiny images untouched", () => {
    const source = synthetic(2, 2);
    expect(medianDenoise(source)).toBe(source);
  });
});

describe("deskew", () => {
  it("returns 0 for an already straight page", () => {
    const source = synthetic(300, 200);
    for (let row = 20; row < 180; row += 20)
      for (let x = 20; x < 280; x += 1) {
        const offset = (row * 300 + x) * 4;
        source.data[offset] = 0;
        source.data[offset + 1] = 0;
        source.data[offset + 2] = 0;
      }
    expect(Math.abs(estimateSkew(source))).toBeLessThan(0.5);
  });
  it("finds a skew that was introduced deliberately", () => {
    const base = synthetic(300, 220);
    for (let row = 40; row < 180; row += 24)
      for (let x = 30; x < 270; x += 1) {
        const offset = (row * 300 + x) * 4;
        base.data[offset] = 0;
        base.data[offset + 1] = 0;
        base.data[offset + 2] = 0;
      }
    const skewed = rotateArbitrary(base, -3);
    const angle = estimateSkew(skewed);
    expect(Math.abs(angle)).toBeGreaterThan(1);
  });
  it("ignores corrections smaller than a third of a degree", () => {
    expect(estimateSkew(synthetic(10, 10))).toBe(0);
  });
});

describe("scaling", () => {
  it("keeps images that already fit", () => {
    expect(planOcrScale(1200, 900, 2400)).toEqual({
      scale: 1,
      width: 1200,
      height: 900,
      reason: null,
    });
  });
  it("enlarges small images", () => {
    const plan = planOcrScale(300, 200, 2400);
    expect(plan.scale).toBe(2);
    expect(plan.reason).toMatch(/Enlarged/i);
  });
  it("downscales oversized scans to the maximum side", () => {
    const plan = planOcrScale(8000, 4000, 2400);
    expect(plan.width).toBe(2400);
    expect(plan.reason).toMatch(/Downscaled/i);
  });
  it("upscales when supersampling is requested", () => {
    const plan = planOcrScale(1200, 800, 2400, true);
    expect(plan.scale).toBe(2);
    expect(plan.reason).toMatch(/Upscaled/i);
  });
  it("handles a zero-sized image", () => {
    expect(planOcrScale(0, 0, 2400)).toEqual({
      scale: 1,
      width: 1,
      height: 1,
      reason: null,
    });
  });
  it("resamples with bilinear interpolation", () => {
    const source = synthetic(10, 10, { x: 0, y: 0, w: 5, h: 5 });
    const small = resamplePixels(source, 5, 5);
    expect(small.width).toBe(5);
    expect(pixel(small, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(resamplePixels(source, 10, 10)).toBe(source);
  });
});

describe("ink ratio", () => {
  it("reports no ink for a blank page", () => {
    expect(inkRatio(synthetic(50, 50))).toBe(0);
  });
  it("reports ink for a dark page", () => {
    expect(inkRatio(synthetic(50, 50, { x: 0, y: 0, w: 50, h: 50 }))).toBe(1);
  });
});
