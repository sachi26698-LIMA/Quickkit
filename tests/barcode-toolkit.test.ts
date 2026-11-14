/**
 * The three analysis helpers added in phase 19: format detection, image
 * screening and code comparison. All are pure functions over bytes or strings,
 * so they are tested without a browser.
 */
import { describe, expect, it } from "vitest";
import { detectBarcodeFormat } from "@/lib/tools/barcode/detect";
import { analyzeRaster } from "@/lib/tools/barcode/analyze";
import { compareCodes } from "@/lib/tools/barcode/compare";
import type { Raster } from "@/lib/tools/barcode/decode";

function raster(
  width: number,
  height: number,
  paint: (x: number, y: number) => number,
): Raster {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = paint(x, y);
      const offset = (y * width + x) * 4;
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
  }
  return { width, height, rgba };
}

/**
 * Bars of `module` px with a quiet zone, black on white, inside a light border —
 * the shape of a well-framed barcode photo.
 */
function bars(module: number, quiet = 40, ink = 0) {
  const width = quiet * 2 + module * 29;
  const height = 120;
  return raster(width, height, (x, y) => {
    if (y < 20 || y >= height - 20) return 255;
    if (x < quiet || x >= width - quiet) return 255;
    return (x - quiet) % (module * 2) < module ? ink : 255;
  });
}

describe("format detection", () => {
  it("recognises the retail lengths by their check digit", () => {
    expect(detectBarcodeFormat("5901234123457").best?.format).toBe("ean13");
    expect(detectBarcodeFormat("036000291452").best?.format).toBe("upca");
    expect(detectBarcodeFormat("96385074").best?.format).toBe("ean8");
    expect(detectBarcodeFormat("10012345678902").best?.format).toBe("itf14");
  });

  it("does not claim a retail format when the check digit fails", () => {
    const detected = detectBarcodeFormat("5901234123458");
    expect(detected.best?.format).toBe("code128");
    expect(detected.best?.reason).toContain("check digit");
  });

  it("recognises GS1 human-readable data", () => {
    const detected = detectBarcodeFormat("(01)09506000134352(10)LOT-42");
    expect(detected.best?.format).toBe("gs1-128");
    expect(detected.best?.confidence).toBe("certain");
  });

  it("separates a URL from a linear barcode", () => {
    const detected = detectBarcodeFormat("https://quickkit.online/tools");
    expect(detected.best?.reason).toContain("Digital Link");
    expect(detected.note).toContain("QR");
  });

  it("prefers Code 39 for uppercase alphanumeric data", () => {
    expect(detectBarcodeFormat("ABC-1234").best?.format).toBe("code39");
    expect(detectBarcodeFormat("ABC-1234").candidates.length).toBeGreaterThan(
      1,
    );
  });

  it("falls back to Code 128 for mixed case", () => {
    expect(detectBarcodeFormat("QuickKit-2026").best?.format).toBe("code128");
  });

  it("admits when nothing linear can carry the data", () => {
    const detected = detectBarcodeFormat("café ☕");
    expect(detected.best).toBeNull();
    expect(detected.note).toContain("QR Code");
  });

  it("asks for input instead of guessing", () => {
    expect(detectBarcodeFormat("   ").best).toBeNull();
  });
});

describe("image screening", () => {
  it("passes a clean, well-lit image", () => {
    const analysis = analyzeRaster(bars(4));
    expect(analysis.modulePixels).toBe(4);
    expect(
      analysis.issues.filter((issue) => issue.severity === "critical"),
    ).toEqual([]);
    expect(analysis.contrast.ratio).toBeGreaterThan(15);
    expect(analysis.summary).toContain("not an ISO/IEC 15416 grade");
  });

  it("flags a one-pixel module as critical", () => {
    const analysis = analyzeRaster(bars(1, 4));
    expect(analysis.modulePixels).toBe(1);
    expect(
      analysis.issues.some(
        (issue) => issue.code === "resolution" && issue.severity === "critical",
      ),
    ).toBe(true);
  });

  it("flags low contrast", () => {
    const analysis = analyzeRaster(bars(4, 40, 170));
    expect(analysis.contrast.ratio).toBeLessThan(3);
    expect(analysis.issues.some((issue) => issue.code === "contrast")).toBe(
      true,
    );
  });

  it("detects ink that runs off the edge", () => {
    const width = 200;
    const cropped = raster(width, 100, (x) => (x % 4 < 2 ? 0 : 255));
    const analysis = analyzeRaster(cropped);
    expect(analysis.edgesTouched).toContain("left");
    expect(analysis.issues.some((issue) => issue.code === "cropping")).toBe(
      true,
    );
  });

  it("reports a quiet zone in modules", () => {
    const analysis = analyzeRaster(bars(4, 40));
    expect(analysis.quietZone.left).toBeGreaterThanOrEqual(10);
    expect(analysis.quietZone.right).toBeGreaterThanOrEqual(10);
  });

  it("warns when the quiet zone is too narrow", () => {
    const analysis = analyzeRaster(bars(4, 8));
    expect(analysis.quietZone.left).toBeLessThan(5);
    expect(analysis.issues.some((issue) => issue.code === "quiet-zone")).toBe(
      true,
    );
  });

  it("says so when there is no ink at all", () => {
    const blank = raster(100, 60, () => 255);
    const analysis = analyzeRaster(blank);
    expect(analysis.darkRatio).toBe(0);
    expect(analysis.summary).toContain("nothing to read");
  });
});

describe("code comparison", () => {
  it("reports identical values", () => {
    const result = compareCodes("QUICKKIT-2026", "QUICKKIT-2026");
    expect(result.verdict).toBe("identical");
    expect(result.diffs).toEqual([]);
  });

  it("recognises the same GTIN written with different padding", () => {
    const result = compareCodes("5901234123457", "05901234123457");
    expect(result.verdict).toBe("same-gtin");
    expect(result.summary).toContain("GTIN-14");
  });

  it("lists the differing characters of the same length", () => {
    const result = compareCodes("5901234123457", "5901234123458");
    expect(result.verdict).toBe("different");
    expect(result.diffs).toEqual([{ index: 12, left: "7", right: "8" }]);
    expect(result.summary).toContain("position 13");
    expect(result.notes.join(" ")).toContain("check digit");
  });

  it("reports different lengths as their own verdict", () => {
    const result = compareCodes("12345", "123456");
    expect(result.verdict).toBe("different-length");
    expect(result.commonPrefix).toBe(5);
  });

  it("counts a mid-string difference", () => {
    const result = compareCodes("LOT-42-A", "LOT-43-A");
    expect(result.verdict).toBe("different");
    expect(result.diffs).toHaveLength(1);
    expect(result.commonPrefix).toBe(5);
    expect(result.commonSuffix).toBe(2);
  });

  it("asks for both sides", () => {
    expect(compareCodes("", "ABC").verdict).toBe("empty");
  });
});
