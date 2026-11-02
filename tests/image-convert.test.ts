import { describe, expect, it } from "vitest";
import {
  CONVERT_FORMATS,
  CONVERT_LIMITS,
  INPUT_ACCEPT,
  PAGE_RENDER_DPI,
  PAGE_SIZES,
  buildOutputName,
  buildPdfName,
  buildPdfPageName,
  clampDpi,
  defaultSettings,
  describeImageSettings,
  describePageRange,
  describePdfSettings,
  dpiToPixels,
  estimateConvertedBytes,
  extensionFor,
  formatById,
  inputFormatFromName,
  inputLabel,
  keepsAlpha,
  linkedDimension,
  mimeFor,
  parsePageRange,
  placeImage,
  planOutputSize,
  resolvePage,
  sanitizeFragment,
  uniqueName,
  unsupportedReason,
  usesQuality,
} from "../lib/tools/image-convert";

describe("image converter formats", () => {
  it("offers the seven raster targets with unique mime types and extensions", () => {
    expect(CONVERT_FORMATS).toHaveLength(7);
    expect(new Set(CONVERT_FORMATS.map((format) => format.mime)).size).toBe(7);
    expect(
      new Set(CONVERT_FORMATS.map((format) => format.extension)).size,
    ).toBe(7);
    expect(CONVERT_FORMATS.map((format) => format.id)).toEqual([
      "jpeg",
      "png",
      "webp",
      "avif",
      "gif",
      "bmp",
      "tiff",
    ]);
  });

  it("marks quality and alpha capability per format", () => {
    expect(usesQuality("jpeg")).toBe(true);
    expect(usesQuality("webp")).toBe(true);
    expect(usesQuality("avif")).toBe(true);
    expect(usesQuality("png")).toBe(false);
    expect(usesQuality("bmp")).toBe(false);
    expect(keepsAlpha("png")).toBe(true);
    expect(keepsAlpha("webp")).toBe(true);
    expect(keepsAlpha("tiff")).toBe(true);
    expect(keepsAlpha("jpeg")).toBe(false);
    expect(keepsAlpha("bmp")).toBe(false);
    expect(formatById("tiff").canvas).toBe(false);
    expect(formatById("jpeg").canvas).toBe(true);
    expect(extensionFor("jpeg")).toBe("jpg");
    expect(mimeFor("tiff")).toBe("image/tiff");
  });

  it("accepts file extensions case-insensitively and falls back to the mime", () => {
    expect(inputFormatFromName("PHOTO.JPG", "")).toBe("jpeg");
    expect(inputFormatFromName("photo.jpeg", "image/jpeg")).toBe("jpeg");
    expect(inputFormatFromName("logo.PNG", "")).toBe("png");
    expect(inputFormatFromName("shot.webp", "")).toBe("webp");
    expect(inputFormatFromName("art.avif", "")).toBe("avif");
    expect(inputFormatFromName("loop.gif", "")).toBe("gif");
    expect(inputFormatFromName("old.bmp", "")).toBe("bmp");
    expect(inputFormatFromName("scan.tif", "")).toBe("tiff");
    expect(inputFormatFromName("scan.tiff", "")).toBe("tiff");
    expect(inputFormatFromName("report.PDF", "")).toBe("pdf");
    expect(inputFormatFromName("download", "application/pdf")).toBe("pdf");
    expect(inputFormatFromName("vector.svg", "image/svg+xml")).toBeNull();
    expect(inputFormatFromName("archive.zip", "")).toBeNull();
    expect(inputLabel("pdf")).toBe("PDF");
    expect(inputLabel("jpeg")).toBe("JPG");
    expect(INPUT_ACCEPT).toContain(".tif");
    expect(INPUT_ACCEPT).toContain("application/pdf");
  });

  it("keeps the advertised limits sane and finite", () => {
    expect(CONVERT_LIMITS.maxFiles).toBeGreaterThan(1);
    expect(CONVERT_LIMITS.maxFiles).toBeLessThanOrEqual(50);
    expect(CONVERT_LIMITS.maxImageBytes).toBeGreaterThan(0);
    expect(CONVERT_LIMITS.maxPdfBytes).toBeGreaterThan(0);
    expect(CONVERT_LIMITS.maxBatchBytes).toBeGreaterThan(
      CONVERT_LIMITS.maxImageBytes,
    );
    expect(CONVERT_LIMITS.maxPixels).toBe(24_000_000);
    expect(CONVERT_LIMITS.maxPagePixels).toBeGreaterThan(
      CONVERT_LIMITS.maxPixels,
    );
    expect(PAGE_RENDER_DPI).toEqual([96, 150, 200, 300]);
    expect(PAGE_SIZES.map((page) => page.id)).toEqual([
      "a4",
      "a3",
      "letter",
      "legal",
      "custom",
    ]);
  });

  it("reports no impossible image pair for supported inputs", () => {
    expect(unsupportedReason(null, "png")).toMatch(/unknown input/i);
    expect(unsupportedReason("pdf", "png")).toBeNull();
    expect(unsupportedReason("gif", "tiff")).toBeNull();
    expect(unsupportedReason("tiff", "avif")).toBeNull();
    expect(unsupportedReason("bmp", "bmp")).toBeNull();
  });
});

describe("page geometry", () => {
  it("resolves presets in both orientations", () => {
    const portrait = resolvePage("a4", "portrait", 0, 0);
    expect(portrait.widthMm).toBe(210);
    expect(portrait.heightMm).toBe(297);
    expect(portrait.widthPt).toBeCloseTo(595.28, 1);
    expect(portrait.heightPt).toBeCloseTo(841.89, 1);

    const landscape = resolvePage("a4", "landscape", 0, 0);
    expect(landscape.widthMm).toBe(297);
    expect(landscape.heightMm).toBe(210);
    expect(landscape.widthPt).toBeCloseTo(841.89, 1);
  });

  it("normalises custom sizes to the chosen orientation", () => {
    const swap = resolvePage("custom", "portrait", 300, 200);
    expect(swap.widthMm).toBe(200);
    expect(swap.heightMm).toBe(300);
    const wide = resolvePage("custom", "landscape", 120, 80);
    expect(wide.widthMm).toBe(120);
    expect(wide.heightMm).toBe(80);
    expect(wide.label).toBe("Custom");
  });

  it("rejects impossible page sizes", () => {
    expect(() => resolvePage("custom", "portrait", 0, 200)).toThrow(/width/i);
    expect(() => resolvePage("custom", "portrait", 200, 5000)).toThrow(
      /height/i,
    );
    expect(() => resolvePage("custom", "portrait", Number.NaN, 200)).toThrow();
  });

  it("places an image with contain, cover and fill", () => {
    // 800x400 image into 600x600 page with 60pt margin.
    const contain = placeImage(800, 400, 600, 600, 60, "contain");
    expect(contain.width).toBeCloseTo(480, 5);
    expect(contain.height).toBeCloseTo(240, 5);
    expect(contain.x).toBeCloseTo(60, 5);
    expect(contain.y).toBeCloseTo(180, 5);

    const cover = placeImage(800, 400, 600, 600, 60, "cover");
    expect(cover.width).toBeCloseTo(960, 5);
    expect(cover.height).toBeCloseTo(480, 5);
    expect(cover.x).toBeCloseTo(-180, 5);
    expect(cover.y).toBeCloseTo(60, 5);

    const fill = placeImage(800, 400, 600, 600, 60, "fill");
    expect(fill).toEqual({ x: 60, y: 60, width: 480, height: 480 });
  });

  it("converts DPI to pixels and caps oversized pages", () => {
    const a4 = dpiToPixels(595.28, 841.89, 72);
    expect(a4.width).toBe(595);
    expect(a4.height).toBe(842);
    expect(a4.cappped).toBe(false);

    const high = dpiToPixels(595.28, 841.89, 300);
    expect(high.width).toBe(2480);
    expect(high.cappped).toBe(false);

    const capped = dpiToPixels(2000, 2000, 300);
    expect(capped.width * capped.height).toBeLessThanOrEqual(
      CONVERT_LIMITS.maxPagePixels,
    );
    expect(capped.cappped).toBe(true);
  });

  it("clamps DPI into the advertised range", () => {
    expect(clampDpi(10)).toBe(CONVERT_LIMITS.minDpi);
    expect(clampDpi(999)).toBe(CONVERT_LIMITS.maxDpi);
    expect(clampDpi(Number.NaN)).toBe(150);
    expect(clampDpi(150.4)).toBe(150);
  });
});

describe("page ranges", () => {
  it("treats empty and 'all' as every page", () => {
    expect(parsePageRange("", 3)).toEqual([1, 2, 3]);
    expect(parsePageRange("   ", 2)).toEqual([1, 2]);
    expect(parsePageRange("all", 4)).toEqual([1, 2, 3, 4]);
    expect(parsePageRange("ALL", 1)).toEqual([1]);
  });

  it("parses comma lists, ranges and reversed ranges without duplicates", () => {
    expect(parsePageRange("1-3,5", 8)).toEqual([1, 2, 3, 5]);
    expect(parsePageRange("5,3-4,3", 8)).toEqual([3, 4, 5]);
    expect(parsePageRange("4-2", 8)).toEqual([2, 3, 4]);
    expect(parsePageRange("2,2,2", 3)).toEqual([2]);
    expect(parsePageRange(" 1 - 2 , 6 ", 6)).toEqual([1, 2, 6]);
  });

  it("rejects bad or out-of-range input with a helpful message", () => {
    expect(() => parsePageRange("0", 3)).toThrow(/start at 1/i);
    expect(() => parsePageRange("1-9", 3)).toThrow(/out of range/i);
    expect(() => parsePageRange("nine", 3)).toThrow(/not a page/i);
    expect(parsePageRange("1,,2", 3)).toEqual([1, 2]);
    expect(() => parsePageRange("1.5", 3)).toThrow();
    expect(() => parsePageRange("-2", 3)).toThrow();
  });

  it("describes runs compactly", () => {
    expect(describePageRange([1, 2, 3, 5, 7, 8])).toBe("1-3, 5, 7-8");
    expect(describePageRange([2])).toBe("2");
    expect(describePageRange([])).toBe("no pages");
  });
});

describe("output sizing", () => {
  it("keeps the original size when resize is off", () => {
    expect(
      planOutputSize(1200, 800, {
        mode: "none",
        width: 100,
        height: 100,
        percent: 50,
        longest: 100,
        lock: true,
      }),
    ).toEqual({ width: 1200, height: 800, resized: false });
  });

  it("scales by percent", () => {
    const plan = planOutputSize(1000, 500, {
      mode: "percent",
      width: 1,
      height: 1,
      percent: 25,
      longest: 1,
      lock: true,
    });
    expect(plan).toEqual({ width: 250, height: 125, resized: true });
  });

  it("fits the longest side without upscaling beyond the request", () => {
    const plan = planOutputSize(4000, 2000, {
      mode: "longest",
      width: 1,
      height: 1,
      percent: 100,
      longest: 1000,
      lock: true,
    });
    expect(plan.width).toBe(1000);
    expect(plan.height).toBe(500);

    const upscale = planOutputSize(400, 200, {
      mode: "longest",
      width: 1,
      height: 1,
      percent: 100,
      longest: 800,
      lock: true,
    });
    expect(upscale.width).toBe(800);
    expect(upscale.height).toBe(400);
  });

  it("honours exact width and aspect lock", () => {
    const locked = planOutputSize(1000, 500, {
      mode: "exact",
      width: 800,
      height: 999,
      percent: 100,
      longest: 1000,
      lock: true,
    });
    expect(locked.width).toBe(800);
    expect(locked.height).toBe(400);

    const unlocked = planOutputSize(1000, 500, {
      mode: "exact",
      width: 800,
      height: 999,
      percent: 100,
      longest: 1000,
      lock: false,
    });
    expect(unlocked.width).toBe(800);
    expect(unlocked.height).toBe(999);
  });

  it("rejects sizes outside the safe range", () => {
    const base = {
      mode: "exact" as const,
      width: 100,
      height: 100,
      percent: 100,
      longest: 1000,
      lock: false,
    };
    expect(() => planOutputSize(100, 100, { ...base, width: 0 })).toThrow();
    expect(() => planOutputSize(100, 100, { ...base, width: 9000 })).toThrow();
    expect(() =>
      planOutputSize(100, 100, { ...base, mode: "percent", percent: 0 }),
    ).toThrow();
    expect(() =>
      planOutputSize(100, 100, { ...base, mode: "longest", longest: 5 }),
    ).toThrow();
  });

  it("links the other dimension when typing a width or height", () => {
    expect(linkedDimension(1000, 500, "width", 200)).toEqual({
      width: 200,
      height: 100,
    });
    expect(linkedDimension(1000, 500, "height", 250)).toEqual({
      width: 500,
      height: 250,
    });
  });
});

describe("output names", () => {
  it("sanitises fragments without losing useful characters", () => {
    expect(sanitizeFragment("My Photo (final).JPG")).toBe("My-Photo-final");
    expect(sanitizeFragment("../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFragment("   ")).toBe("");
    expect(sanitizeFragment("café-über")).toBe("caf-ber");
    expect(sanitizeFragment("a".repeat(120))).toHaveLength(80);
  });

  it("builds per-file image names with a custom base and suffix", () => {
    const settings = { baseName: "Holiday", suffix: "web" };
    expect(buildOutputName("IMG_0001.JPG", settings, "webp")).toBe(
      "Holiday-web-converted.webp",
    );
    expect(
      buildOutputName("photo.png", { baseName: "", suffix: "" }, "png"),
    ).toBe("photo-converted.png");
  });

  it("builds PDF page names with padded numbers", () => {
    const settings = { baseName: "brochure", suffix: "" };
    expect(buildPdfPageName("brochure.pdf", 7, "png", settings)).toBe(
      "brochure-page-007.png",
    );
    expect(buildPdfPageName("x.pdf", 12, "jpeg", settings)).toBe(
      "brochure-page-012.jpg",
    );
  });

  it("builds the images-to-PDF filename", () => {
    const settings = defaultSettings("images-to-pdf");
    expect(buildPdfName(settings)).toBe("quickkit-images.pdf");
    settings.pdfMake.filename = "album";
    expect(buildPdfName(settings)).toBe("album.pdf");
    settings.pdfMake.filename = "Album Final.PDF";
    expect(buildPdfName(settings)).toBe("Album-Final.pdf");
    settings.pdfMake.filename = "";
    settings.baseName = "Team";
    settings.suffix = "2026";
    expect(buildPdfName(settings)).toBe("Team-2026.pdf");
  });

  it("de-duplicates names inside one batch", () => {
    const used = new Set<string>();
    expect(uniqueName("a.png", used)).toBe("a.png");
    expect(uniqueName("a.png", used)).toBe("a-2.png");
    expect(uniqueName("a.png", used)).toBe("a-3.png");
    expect(uniqueName("b", used)).toBe("b");
    expect(uniqueName("b", used)).toBe("b-2");
  });
});

describe("defaults and summaries", () => {
  it("returns a complete, valid settings object per mode", () => {
    const image = defaultSettings("image");
    expect(image.mode).toBe("image");
    expect(image.image.format).toBe("png");
    expect(image.image.quality).toBe(CONVERT_LIMITS.defaultQuality);
    expect(image.image.compression).toBe("lzw");
    expect(image.image.resize.mode).toBe("none");

    const pdf = defaultSettings("images-to-pdf");
    expect(pdf.mode).toBe("images-to-pdf");
    expect(pdf.pdfMake.pageSize).toBe("a4");
    expect(pdf.pdfMake.orientation).toBe("portrait");
    expect(pdf.pdfMake.fit).toBe("contain");

    const render = defaultSettings("pdf-to-image");
    expect(render.pdfRender.dpi).toBe(150);
    expect(render.pdfRender.format).toBe("png");
    expect(render.pdfRender.range).toBe("");
  });

  it("describes settings for the summary line", () => {
    const image = defaultSettings("image");
    expect(describeImageSettings(image.image)).toEqual([
      "PNG",
      "lossless",
      "EXIF auto",
    ]);
    image.image.format = "jpeg";
    image.image.quality = 80;
    image.image.alpha = "background";
    expect(describeImageSettings(image.image)).toContain("q80");
    expect(describeImageSettings(image.image)).toContain("background #ffffff");

    const pdf = defaultSettings("images-to-pdf");
    const summary = describePdfSettings(pdf.pdfMake);
    expect(summary[0]).toBe("A4 portrait");
    expect(summary[1]).toBe("210 × 297 mm");
    expect(summary[2]).toBe("10 mm margin");
    expect(summary[3]).toBe("contain fit");
  });

  it("gives rough size estimates in a believable order", () => {
    const bmp = estimateConvertedBytes(1000, 1000, "bmp", 90);
    const png = estimateConvertedBytes(1000, 1000, "png", 90);
    const jpegLow = estimateConvertedBytes(1000, 1000, "jpeg", 20);
    const jpegHigh = estimateConvertedBytes(1000, 1000, "jpeg", 95);
    expect(bmp).toBeGreaterThan(png);
    expect(jpegHigh).toBeGreaterThan(jpegLow);
    expect(estimateConvertedBytes(0, 0, "png", 90)).toBeGreaterThan(0);
  });
});
