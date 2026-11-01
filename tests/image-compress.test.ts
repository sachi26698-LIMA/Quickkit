import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUALITY,
  buildCompressName,
  compactSavings,
  downscaleRatio,
  downscaledSize,
  extensionFor,
  formatLabel,
  keepsTransparency,
  mimeFromType,
  savingsLabel,
  savingsPercent,
  targetBytes,
  targetLabel,
  uniqueName,
  usesQuality,
  validateTarget,
} from "../lib/tools/image-compress";

describe("image compressor formats", () => {
  it("maps formats to extensions and labels", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/avif")).toBe("avif");
    expect(formatLabel("image/jpeg")).toBe("JPEG");
    expect(formatLabel("image/avif")).toBe("AVIF");
  });
  it("knows which formats keep transparency", () => {
    expect(keepsTransparency("image/png")).toBe(true);
    expect(keepsTransparency("image/webp")).toBe(true);
    expect(keepsTransparency("image/avif")).toBe(true);
    expect(keepsTransparency("image/jpeg")).toBe(false);
  });
  it("only applies quality to lossy formats", () => {
    expect(usesQuality("image/png")).toBe(false);
    expect(usesQuality("image/jpeg")).toBe(true);
    expect(usesQuality("image/webp")).toBe(true);
    expect(usesQuality("image/avif")).toBe(true);
  });
  it("parses mime types", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif"])
      expect(mimeFromType(type)).toBe(type);
    expect(mimeFromType("text/plain")).toBeNull();
    expect(mimeFromType("image/gif")).toBeNull();
  });
});

describe("target file size", () => {
  it("converts KB and MB to bytes", () => {
    expect(targetBytes(150, "KB")).toBe(153_600);
    expect(targetBytes(2, "MB")).toBe(2_097_152);
    expect(targetBytes(0.5, "MB")).toBe(524_288);
  });
  it("rejects impossible targets with plain language", () => {
    expect(() => targetBytes(0, "KB")).toThrow("greater than zero");
    expect(() => targetBytes(Number.NaN, "KB")).toThrow();
    expect(() => targetBytes(2, "KB")).toThrow("at least 5 KB");
    expect(() => targetBytes(80, "MB")).toThrow("below 50 MB");
    expect(validateTarget(150, "KB")).toBe(true);
  });
  it("labels targets roundly", () => {
    expect(targetLabel(153_600)).toBe("150 KB");
    expect(targetLabel(2_097_152)).toBe("2 MB");
    expect(targetLabel(1_572_864)).toBe("1.50 MB");
  });
});

describe("downscale maths", () => {
  it("never downsizes when the target is already met", () => {
    const size = downscaledSize(1600, 1200, 1);
    expect(size).toEqual({ width: 1600, height: 1200, changed: false });
  });
  it("scales both sides by the ratio and keeps the aspect", () => {
    const size = downscaledSize(1600, 1200, 0.5);
    expect(size).toEqual({ width: 800, height: 600, changed: true });
  });
  it("never scales below the minimum edge or above the source", () => {
    expect(downscaledSize(1600, 1200, 0.001)).toEqual({
      width: 64,
      height: 64,
      changed: true,
    });
    expect(downscaledSize(300, 200, 3)).toEqual({
      width: 300,
      height: 200,
      changed: false,
    });
  });
  it("derives a clamped ratio from the smallest encode", () => {
    expect(downscaleRatio(400_000, 200_000)).toBeCloseTo(0.6788, 3);
    expect(downscaleRatio(10, 1_000_000)).toBe(0.95); // never upscales
    expect(downscaleRatio(1_000_000, 1)).toBe(0.2);
    expect(downscaleRatio(0, 100)).toBe(1);
  });
});

describe("savings", () => {
  it("computes percentages in both directions", () => {
    expect(savingsPercent(1000, 250)).toBeCloseTo(75);
    expect(savingsPercent(1000, 1500)).toBeCloseTo(-50);
    expect(savingsPercent(0, 100)).toBe(0);
  });
  it("renders readable labels including growth", () => {
    expect(savingsLabel(2_000_000, 1_240_000)).toBe("38.0% smaller");
    expect(savingsLabel(1000, 1400)).toBe("40.0% larger");
    expect(savingsLabel(1000, 1000)).toBe("same size as the source");
  });
  it("renders compact queue figures", () => {
    expect(compactSavings(1000, 250)).toBe("−75%");
    expect(compactSavings(1000, 1500)).toBe("+50%");
  });
});

describe("output naming", () => {
  it("appends the compressed qualifier and extension", () => {
    expect(buildCompressName("holiday.jpg", { format: "image/webp" })).toBe(
      "holiday-compressed.webp",
    );
  });
  it("uses a suffix instead of the default qualifier", () => {
    expect(
      buildCompressName("holiday.jpg", { format: "image/jpeg", suffix: "web" }),
    ).toBe("holiday-web.jpg");
  });
  it("honours a rename and sanitises unsafe characters", () => {
    expect(
      buildCompressName("IMG 0001 (1).png", {
        format: "image/avif",
        baseName: "Hero Shot / final",
        suffix: "kb",
      }),
    ).toBe("Hero-Shot-final-kb.avif");
  });
  it("appends dimensions when given so batch names never collide", () => {
    expect(
      buildCompressName("mountain-lake.png", {
        format: "image/webp",
        size: { width: 1800, height: 1200 },
      }),
    ).toBe("mountain-lake-compressed-1800x1200.webp");
  });
  it("falls back to a safe base name for odd input", () => {
    expect(buildCompressName("...", { format: "image/png" })).toBe(
      "image-compressed.png",
    );
  });
  it("de-duplicates names case-insensitively", () => {
    const used = new Set<string>();
    expect(uniqueName("photo.webp", used)).toBe("photo.webp");
    expect(uniqueName("photo.webp", used)).toBe("photo (2).webp");
    expect(uniqueName("PHOTO.WEBP", used)).toBe("PHOTO (3).WEBP");
  });
});

describe("defaults", () => {
  it("uses a sensible starting quality", () => {
    expect(DEFAULT_QUALITY).toBe(80);
  });
});
