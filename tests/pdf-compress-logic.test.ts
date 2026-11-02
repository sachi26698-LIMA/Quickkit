import { describe, expect, it } from "vitest";

import {
  PDF_COMPRESS_LIMITS,
  PDF_COMPRESSION_PRESETS,
  buildCompressionAttempts,
  compressionBlocker,
  compressionFeatureWarnings,
  defaultCompressedFilename,
  formatSavingsPercent,
  makeUniqueFilenames,
  normalizeCompressionSettings,
  parseTargetSize,
  presetSettings,
  savingsPercent,
  validatePdfCompressionCandidate,
} from "../lib/tools/pdf/compress-pdf-logic";
import { PdfMergeError } from "../lib/tools/pdf/merge-pdf-logic";

const features = {
  hasAttachments: false,
  hasForm: false,
  hasJavaScript: false,
  hasLayers: false,
  hasOutlines: false,
  hasSignatureField: false,
  hasSignedSignature: false,
  hasTags: false,
  hasXFA: false,
};

describe("PDF compression settings", () => {
  it("provides low, medium, high and maximum presets in quality order", () => {
    expect(PDF_COMPRESSION_PRESETS.map((preset) => preset.id)).toEqual([
      "low",
      "medium",
      "high",
      "maximum",
    ]);
    expect(presetSettings("low").imageQuality).toBeGreaterThan(
      presetSettings("medium").imageQuality,
    );
    expect(presetSettings("high").maxImageDimension).toBeLessThan(
      presetSettings("medium").maxImageDimension,
    );
    expect(presetSettings("maximum").imageQuality).toBe(0.5);
  });

  it("normalizes settings and rejects unsafe quality, dimensions and targets", () => {
    expect(
      normalizeCompressionSettings({
        grayscaleImages: true,
        imageQuality: 0.7777,
        maxImageDimension: 2000,
        preset: "custom",
        recompressImages: true,
        targetBytes: 2048,
      }),
    ).toMatchObject({ imageQuality: 0.778, targetBytes: 2048 });

    expect(() =>
      normalizeCompressionSettings({
        ...presetSettings("medium"),
        imageQuality: 0.1,
      }),
    ).toThrow(PdfMergeError);
    expect(() =>
      normalizeCompressionSettings({
        ...presetSettings("medium"),
        maxImageDimension: 100,
      }),
    ).toThrow(/500 and 6,000/);
    expect(() =>
      normalizeCompressionSettings({
        ...presetSettings("medium"),
        targetBytes: 12,
      }),
    ).toThrow(/at least 1 KiB/);
  });

  it("builds one attempt without a target and a bounded quality ladder with one", () => {
    expect(buildCompressionAttempts(presetSettings("medium"))).toHaveLength(1);
    const attempts = buildCompressionAttempts({
      ...presetSettings("medium"),
      targetBytes: 500_000,
    });
    expect(attempts).toHaveLength(5);
    expect(attempts[0]).toMatchObject({
      imageQuality: 0.78,
      maxImageDimension: 2400,
    });
    expect(attempts.at(-1)?.imageQuality).toBeGreaterThanOrEqual(0.28);
    expect(attempts.at(-1)?.maxImageDimension).toBeLessThan(1000);
  });

  it("does not pretend target attempts can help when image recompression is off", () => {
    expect(
      buildCompressionAttempts({
        ...presetSettings("maximum"),
        recompressImages: false,
        targetBytes: 100_000,
      }),
    ).toHaveLength(1);
  });

  it("parses binary target sizes", () => {
    expect(parseTargetSize("500", "KiB")).toBe(512_000);
    expect(parseTargetSize("1.5", "MiB")).toBe(1_572_864);
    expect(() => parseTargetSize("0", "MiB")).toThrow(/positive/);
  });
});

describe("PDF compression file logic", () => {
  it("validates type, empty files, per-file size, batch size and count", () => {
    expect(PDF_COMPRESS_LIMITS.maxImagePixels).toBe(24_000_000);
    expect(
      validatePdfCompressionCandidate(
        { name: "scan.pdf", size: 1000, type: "application/pdf" },
        0,
        0,
      ),
    ).toBeNull();
    expect(
      validatePdfCompressionCandidate(
        { name: "scan.png", size: 1000, type: "image/png" },
        0,
        0,
      )?.message,
    ).toMatch(/not a PDF/);
    expect(
      validatePdfCompressionCandidate({ name: "scan.pdf", size: 0 }, 0, 0)
        ?.code,
    ).toBe("invalid_pdf");
    expect(
      validatePdfCompressionCandidate(
        { name: "scan.pdf", size: 51 * 1024 * 1024 },
        0,
        0,
      )?.code,
    ).toBe("file_too_large");
    expect(
      validatePdfCompressionCandidate(
        { name: "scan.pdf", size: 2 * 1024 * 1024 },
        0,
        99 * 1024 * 1024,
      )?.code,
    ).toBe("total_too_large");
    expect(
      validatePdfCompressionCandidate({ name: "scan.pdf", size: 1000 }, 20, 0)
        ?.code,
    ).toBe("too_many_files");
  });

  it("builds safe default and unique output names", () => {
    expect(defaultCompressedFilename("My Scan!.pdf")).toBe(
      "My Scan!-compressed.pdf",
    );
    expect(makeUniqueFilenames(["a.pdf", "A.pdf", "a.pdf"])).toEqual([
      "a.pdf",
      "A (2).pdf",
      "a (3).pdf",
    ]);
  });

  it("reports exact savings and growth", () => {
    expect(savingsPercent(1000, 750)).toBe(25);
    expect(formatSavingsPercent(1000, 750)).toBe("25.0% smaller");
    expect(formatSavingsPercent(1000, 1100)).toBe("10.0% larger");
    expect(formatSavingsPercent(1000, 1000)).toBe("No size change");
  });

  it("blocks signed/XFA files and warns about fidelity-sensitive features", () => {
    expect(
      compressionBlocker({ ...features, hasSignedSignature: true }),
    ).toMatch(/digitally signed/);
    expect(compressionBlocker({ ...features, hasXFA: true })).toMatch(/XFA/);
    expect(
      compressionFeatureWarnings({
        ...features,
        hasAttachments: true,
        hasForm: true,
        hasJavaScript: true,
        hasTags: true,
      }).join(" "),
    ).toMatch(/Form structure.*attachments.*Tagged-PDF.*scripts/i);
  });
});
