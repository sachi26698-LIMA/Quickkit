import { describe, expect, it } from "vitest";
import {
  CONVERT_FORMATS,
  CONVERT_LIMITS,
  INPUT_ACCEPT,
  PAGE_RENDER_DPI,
  PAGE_SIZES,
  buildOutputName,
  estimatePdfImageBytes,
  expandNameTemplate,
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
  cropForAspect,
  cropIsWhole,
  cropPixels,
  describeImageEdits,
  editedSize,
  hasImageEdits,
  parsePageRange,
  placeForFit,
  presetById,
  printSize,
  printSummary,
  pixelsForPrint,
  RESIZE_DPI,
  RESIZE_PRESETS,
  upscaleInfo,
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
    expect(inputFormatFromName("IMG_0001.HEIC", "")).toBe("heic");
    expect(inputFormatFromName("photo.heif", "image/heif")).toBe("heic");
    expect(inputFormatFromName("scan.tif", "")).toBe("tiff");
    expect(inputFormatFromName("notes.txt", "text/plain")).toBeNull();
  });

  it("accepts HEIC input without offering it as an output format", () => {
    // Reading is browser-dependent; writing HEIC is never promised.
    expect(
      CONVERT_FORMATS.some((format) => (format.id as string) === "heic"),
    ).toBe(false);
    expect(INPUT_ACCEPT).toContain(".heic");
    expect(INPUT_ACCEPT).toContain("image/heif");
    expect(inputLabel("heic")).toBe("HEIC");
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
    expect(PAGE_RENDER_DPI).toEqual([96, 150, 200, 300, 400, 600]);
    expect(PAGE_SIZES.map((page) => page.id)).toEqual([
      "a4",
      "a3",
      "a5",
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

  it("enforces the 100-page per-document ceiling", () => {
    expect(parsePageRange("all", 100)).toHaveLength(100);
    expect(() => parsePageRange("all", 101)).toThrow(/limit/i);
    expect(() => parsePageRange("1-101", 101)).toThrow(/limit/i);
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
        fit: "stretch",
        dpi: 96,
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
      fit: "stretch",
      dpi: 96,
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
      fit: "stretch",
      dpi: 96,
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
      fit: "stretch",
      dpi: 96,
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
      fit: "stretch",
      dpi: 96,
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
      fit: "stretch",
      dpi: 96,
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
      fit: "stretch" as const,
      dpi: 96,
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

/* --------------------- Phase 3: resize, fit, DPI, print --------------------- */

describe("fit placement", () => {
  it("stretches the whole source into the box", () => {
    expect(placeForFit(1000, 500, 800, 800, "stretch")).toEqual({
      sx: 0,
      sy: 0,
      sw: 1000,
      sh: 500,
      dx: 0,
      dy: 0,
      dw: 800,
      dh: 800,
    });
  });

  it("contains the whole image and centres it", () => {
    const placement = placeForFit(1000, 500, 800, 800, "contain");
    // Width is the limiting side: 800 wide, 400 tall, 200px of margin top/bottom.
    expect(placement.dw).toBe(800);
    expect(placement.dh).toBe(400);
    expect(placement.dy).toBe(200);
    expect(placement.dx).toBe(0);
    // Nothing is cropped: the full source is sampled.
    expect(placement.sw).toBe(1000);
    expect(placement.sh).toBe(500);
  });

  it("covers the box and crops the overflow symmetrically", () => {
    const placement = placeForFit(1000, 500, 800, 800, "cover");
    expect(placement.dx).toBe(0);
    expect(placement.dy).toBe(0);
    expect(placement.dw).toBe(800);
    expect(placement.dh).toBe(800);
    // Source is cropped to a square, centred horizontally.
    expect(placement.sw).toBe(500);
    expect(placement.sx).toBe(250);
    expect(placement.sh).toBe(500);
  });

  it("is an identity for a box that already matches the source ratio", () => {
    for (const fit of ["stretch", "contain", "cover"] as const) {
      const placement = placeForFit(1000, 500, 500, 250, fit);
      expect(placement.dw).toBe(500);
      expect(placement.dh).toBe(250);
      expect(placement.sw).toBe(1000);
      expect(placement.sh).toBe(500);
      expect(placement.dx).toBe(0);
      expect(placement.dy).toBe(0);
    }
  });

  it("never produces a zero-size rectangle", () => {
    const placement = placeForFit(3, 4000, 4000, 3, "contain");
    expect(placement.dw).toBeGreaterThan(0);
    expect(placement.dh).toBeGreaterThan(0);
    expect(placement.sw).toBeGreaterThan(0);
    expect(placement.sh).toBeGreaterThan(0);
  });
});

describe("print size", () => {
  it("reports inches, centimetres and millimetres together", () => {
    const size = printSize(300, 300, 300);
    expect(size.inches).toEqual({ width: 1, height: 1 });
    expect(size.cm.width).toBeCloseTo(2.54, 5);
    expect(size.mm.width).toBeCloseTo(25.4, 5);
  });

  it("scales with DPI as a print size must", () => {
    const low = printSize(1200, 600, 72);
    const high = printSize(1200, 600, 300);
    expect(low.inches.width).toBeCloseTo(16.67, 1);
    expect(high.inches.width).toBe(4);
  });

  it("summarises all three units in one line", () => {
    expect(printSummary(1200, 600, 150)).toBe(
      "8.00 × 4.00 in · 20.3 × 10.2 cm · 203 × 102 mm at 150 DPI",
    );
  });

  it("falls back to 96 DPI instead of dividing by zero", () => {
    const size = printSize(96, 96, 0);
    expect(size.inches.width).toBe(1);
  });

  it("converts a physical size back to pixels", () => {
    expect(pixelsForPrint(2.54, 2.54, 300)).toEqual({
      width: 300,
      height: 300,
    });
  });

  it("offers the requested DPI steps", () => {
    expect([...RESIZE_DPI]).toEqual([72, 96, 150, 200, 300]);
  });
});

describe("upscaling is disclosed", () => {
  it("stays quiet when the output is not larger", () => {
    expect(upscaleInfo(1000, 500, 800, 400).upscaling).toBe(false);
    expect(upscaleInfo(1000, 500, 1000, 500).warning).toBeNull();
  });

  it("warns and quantifies a real enlargement", () => {
    const info = upscaleInfo(1000, 500, 2000, 1000);
    expect(info.upscaling).toBe(true);
    expect(info.factor).toBe(2);
    expect(info.warning).toMatch(/100% larger/);
    expect(info.warning).toMatch(/cannot restore detail/);
  });

  it("ignores a partial enlargement on one axis only", () => {
    // The limiting side decides: this fits inside the source on one axis.
    expect(upscaleInfo(1000, 500, 2000, 500).upscaling).toBe(false);
  });
});

describe("resize presets", () => {
  it("exposes a reusable catalogue", () => {
    expect(RESIZE_PRESETS.length).toBeGreaterThan(5);
    for (const preset of RESIZE_PRESETS) {
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });

  it("looks a preset up by id and returns null for an unknown one", () => {
    const first = RESIZE_PRESETS[0];
    expect(presetById(first.id)?.width).toBe(first.width);
    expect(presetById("not-a-preset")).toBeNull();
  });

  it("defaults new settings to no resize at 96 DPI", () => {
    const settings = defaultSettings("image");
    expect(settings.image.resize.mode).toBe("none");
    expect(settings.image.resize.dpi).toBe(96);
    expect(settings.image.resize.fit).toBe("stretch");
  });
});

/* -------------------- Phase 3: crop, rotate, straighten --------------------- */

describe("crop fractions", () => {
  it("treats a full-frame crop as no crop at all", () => {
    expect(cropIsWhole(null)).toBe(true);
    expect(cropIsWhole({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
    expect(cropIsWhole({ x: 0.5, y: 0, width: 0.5, height: 1 })).toBe(false);
  });

  it("centres a ratio crop on the long axis only", () => {
    const crop = cropForAspect(1, 1600, 900);
    expect(crop).not.toBeNull();
    expect(crop!.y).toBe(0);
    expect(crop!.height).toBe(1);
    expect(crop!.width).toBeCloseTo(900 / 1600, 5);
    expect(crop!.x).toBeCloseTo((1 - 900 / 1600) / 2, 5);
  });

  it("centres a portrait crop on a landscape source by trimming the sides", () => {
    // 1600 × 900 cropped to 9:16 keeps the full height and narrows the width.
    const crop = cropForAspect(9 / 16, 1600, 900);
    expect(crop!.y).toBe(0);
    expect(crop!.height).toBe(1);
    const expectedWidth = (900 * 9) / 16 / 1600;
    expect(crop!.width).toBeCloseTo(expectedWidth, 5);
    expect(crop!.x).toBeCloseTo((1 - expectedWidth) / 2, 5);
  });

  it("centres a wide crop on a portrait source by trimming top and bottom", () => {
    const crop = cropForAspect(16 / 9, 900, 1600);
    expect(crop!.x).toBe(0);
    expect(crop!.width).toBe(1);
    const expectedHeight = (900 * 9) / 16 / 1600;
    expect(crop!.height).toBeCloseTo(expectedHeight, 5);
    expect(crop!.y).toBeCloseTo((1 - expectedHeight) / 2, 5);
  });

  it("returns null when the source already has that ratio", () => {
    expect(cropForAspect(1, 800, 800)).toBeNull();
    expect(cropForAspect(null, 800, 600)).toBeNull();
  });

  it("converts fractions to clamped source pixels", () => {
    expect(
      cropPixels({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, 1000, 800),
    ).toEqual({ x: 250, y: 200, width: 500, height: 400 });
  });

  it("clamps a crop that runs off the edge", () => {
    const rect = cropPixels(
      { x: 0.9, y: 0.9, width: 0.5, height: 0.5 },
      1000,
      1000,
    );
    expect(rect.x + rect.width).toBeLessThanOrEqual(1000);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1000);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });

  it("clamps nonsense fractions instead of producing a broken rectangle", () => {
    const rect = cropPixels(
      { x: Number.NaN, y: -3, width: 9, height: Number.POSITIVE_INFINITY },
      1000,
      1000,
    );
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(1000);
    expect(rect.height).toBe(1000);
  });
});

describe("edited size", () => {
  const none = defaultSettings("image").image.edits;

  it("leaves the size alone with no edits", () => {
    expect(editedSize(none, 1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it("applies the crop first", () => {
    expect(
      editedSize(
        { ...none, crop: { x: 0, y: 0, width: 0.5, height: 1 } },
        1200,
        800,
      ),
    ).toEqual({ width: 600, height: 800 });
  });

  it("swaps the sides on a 90° rotation", () => {
    expect(editedSize({ ...none, rotate: 90 }, 1200, 800)).toEqual({
      width: 800,
      height: 1200,
    });
    expect(editedSize({ ...none, rotate: 270 }, 1200, 800)).toEqual({
      width: 800,
      height: 1200,
    });
    expect(editedSize({ ...none, rotate: 180 }, 1200, 800)).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it("grows the box to hold a straightened image", () => {
    const straight = editedSize({ ...none, straighten: 45 }, 1000, 1000);
    // A 45° turn of a square needs a √2 box, rounded.
    expect(straight.width).toBeGreaterThan(1400);
    expect(straight.width).toBeLessThan(1420);
    expect(straight.height).toBe(straight.width);
  });

  it("chains crop, straighten and rotation in that order", () => {
    const size = editedSize(
      {
        ...none,
        crop: { x: 0, y: 0, width: 0.5, height: 1 },
        straighten: 0,
        rotate: 90,
      },
      1200,
      800,
    );
    expect(size).toEqual({ width: 800, height: 600 });
  });

  it("flips do not change the size", () => {
    expect(
      editedSize({ ...none, flipH: true, flipV: true }, 1200, 800),
    ).toEqual({
      width: 1200,
      height: 800,
    });
  });
});

describe("edit reporting", () => {
  const none = defaultSettings("image").image.edits;

  it("says nothing when nothing was done", () => {
    expect(hasImageEdits(none)).toBe(false);
    expect(describeImageEdits(none)).toEqual([]);
  });

  it("does not count a full-frame crop as an edit", () => {
    expect(
      hasImageEdits({ ...none, crop: { x: 0, y: 0, width: 1, height: 1 } }),
    ).toBe(false);
  });

  it("lists every edit in words", () => {
    expect(
      describeImageEdits({
        ...none,
        crop: { x: 0.1, y: 0, width: 0.8, height: 1 },
        straighten: -2.5,
        rotate: 90,
        flipH: true,
        flipV: true,
      }),
    ).toEqual([
      "cropped",
      "straightened -2.5°",
      "rotated 90°",
      "flipped horizontally",
      "flipped vertically",
    ]);
  });

  it("surfaces edits in the settings summary", () => {
    const settings = defaultSettings("image");
    const summary = describeImageSettings({
      ...settings.image,
      edits: { ...none, rotate: 180 },
    });
    expect(summary).toContain("rotated 180°");
  });

  it("reports the DPI once a resize is in play", () => {
    const settings = defaultSettings("image");
    expect(
      describeImageSettings({
        ...settings.image,
        resize: { ...settings.image.resize, mode: "exact", dpi: 300 },
      }),
    ).toContain("300 DPI");
    // With no resize the source DPI is carried, so nothing is claimed.
    expect(describeImageSettings(settings.image).join(" ")).not.toContain(
      "DPI",
    );
  });
});

describe("output name templates", () => {
  const FIXED_DATE = new Date(2026, 10, 3); // 2026-11-03 local

  it("keeps the historical naming when no template is set", () => {
    expect(
      buildOutputName(
        "Holiday Photo.JPG",
        { baseName: "", suffix: "" },
        "webp",
      ),
    ).toBe("Holiday-Photo-converted.webp");
  });

  it("expands every documented token", () => {
    expect(
      expandNameTemplate("{name}-{index}-{date}.{ext}", {
        originalName: "Holiday Photo.JPG",
        extension: "webp",
        index: 7,
        date: FIXED_DATE,
      }),
    ).toBe("Holiday-Photo-7-2026-11-03.webp");
  });

  it("is case-insensitive and ignores unknown tokens", () => {
    expect(
      expandNameTemplate("{NAME}_{nope}{ext}", {
        originalName: "a.png",
        extension: "jpg",
        index: 1,
      }),
    ).toBe("a_jpg");
  });

  it("never lets a template inject a path separator or stray braces", () => {
    const out = expandNameTemplate("../../etc/{name}", {
      originalName: "passwd",
      extension: "png",
      index: 1,
    });
    expect(out).not.toContain("/");
    expect(out).not.toContain("{");
    expect(out).not.toContain("..");
    // sanitizeFragment deletes "/" rather than replacing it, so the traversal
    // collapses into one safe token.
    expect(out).toBe("etcpasswd");
  });

  it("returns null for a blank or fully-unknown template so callers fall back", () => {
    expect(
      expandNameTemplate("   ", {
        originalName: "a.png",
        extension: "png",
        index: 1,
      }),
    ).toBeNull();
    expect(
      expandNameTemplate("{bogus}", {
        originalName: "a.png",
        extension: "png",
        index: 1,
      }),
    ).toBeNull();
  });

  it("does not double the extension when the template already ends with it", () => {
    expect(
      buildOutputName(
        "shot.png",
        { baseName: "", suffix: "", nameTemplate: "{name}.{ext}" },
        "webp",
      ),
    ).toBe("shot.webp");
  });

  it("adds the extension when the template omits it", () => {
    expect(
      buildOutputName(
        "shot.png",
        { baseName: "", suffix: "", nameTemplate: "{name}-final" },
        "avif",
      ),
    ).toBe("shot-final.avif");
  });

  it("numbers a batch in template order", () => {
    const names = ["a.jpg", "b.jpg", "c.jpg"].map((n, i) =>
      buildOutputName(
        n,
        { baseName: "", suffix: "", nameTemplate: "img-{index}" },
        "png",
        i + 1,
      ),
    );
    expect(names).toEqual(["img-1.png", "img-2.png", "img-3.png"]);
  });
});

describe("PDF page render size estimate", () => {
  // A4 portrait is 595 × 842 pt.
  const a4 = { widthPt: 595, heightPt: 842 };

  it("scales pixel dimensions with DPI", () => {
    const at96 = estimatePdfImageBytes({
      ...a4,
      dpi: 96,
      format: "png",
      quality: 90,
      pageCount: 1,
    });
    const at300 = estimatePdfImageBytes({
      ...a4,
      dpi: 300,
      format: "png",
      quality: 90,
      pageCount: 1,
    });
    expect(at96.pixelsWide).toBeLessThan(at300.pixelsWide);
    // 595 pt at 300 DPI is 595 / 72 * 300 = 2479 px.
    expect(at300.pixelsWide).toBe(2479);
    expect(at300.pixelsHigh).toBe(3508);
  });

  it("multiplies the estimate by the page count", () => {
    const one = estimatePdfImageBytes({
      ...a4,
      dpi: 150,
      format: "jpeg",
      quality: 80,
      pageCount: 1,
    });
    const ten = estimatePdfImageBytes({
      ...a4,
      dpi: 150,
      format: "jpeg",
      quality: 80,
      pageCount: 10,
    });
    expect(ten.bytes).toBe(one.bytes * 10);
    expect(ten.low).toBe(one.low * 10);
    expect(ten.high).toBe(one.high * 10);
  });

  it("clamps an out-of-range DPI instead of trusting it", () => {
    const clamped = estimatePdfImageBytes({
      ...a4,
      dpi: 5000,
      format: "png",
      quality: 90,
      pageCount: 1,
    });
    const atMax = estimatePdfImageBytes({
      ...a4,
      dpi: CONVERT_LIMITS.maxDpi,
      format: "png",
      quality: 90,
      pageCount: 1,
    });
    expect(clamped.pixelsWide).toBe(atMax.pixelsWide);
    // Prove the ceiling does real work rather than merely matching itself: an
    // unclamped 5000 DPI A4 render would be 41,339 px wide, so the clamped
    // result must be dramatically smaller.
    const unclamped = (5000 / 72) * 595.28;
    expect(clamped.pixelsWide).toBeLessThan(unclamped / 4);
  });

  it("reports a spread rather than a single promised number", () => {
    const estimate = estimatePdfImageBytes({
      ...a4,
      dpi: 150,
      format: "jpeg",
      quality: 80,
      pageCount: 3,
    });
    expect(estimate.low).toBeLessThan(estimate.bytes);
    expect(estimate.high).toBeGreaterThan(estimate.bytes);
  });

  it("never returns zero for a fractional or missing page count", () => {
    for (const pageCount of [0, -1, 1.7]) {
      const estimate = estimatePdfImageBytes({
        ...a4,
        dpi: 96,
        format: "png",
        quality: 90,
        pageCount,
      });
      expect(estimate.bytes, `pageCount ${pageCount}`).toBeGreaterThan(0);
    }
  });

  it("estimates PNG below JPEG for document pages, not above", () => {
    // Counter-intuitive but correct: PDF pages are text and line art, which
    // deflate compresses better than DCT. At quality 80 the model gives JPEG
    // ~0.30 bytes/px against PNG's 0.17 for the "document" kind. Asserting the
    // usual "lossy is smaller" intuition here would lock in a wrong estimate.
    const common = { ...a4, dpi: 150, quality: 80, pageCount: 1 };
    const png = estimatePdfImageBytes({ ...common, format: "png" });
    const jpeg = estimatePdfImageBytes({ ...common, format: "jpeg" });
    expect(png.bytes).toBeLessThan(jpeg.bytes);
  });

  it("estimates WebP below JPEG at the same quality", () => {
    const common = { ...a4, dpi: 150, quality: 80, pageCount: 1 };
    const webp = estimatePdfImageBytes({ ...common, format: "webp" });
    const jpeg = estimatePdfImageBytes({ ...common, format: "jpeg" });
    expect(webp.bytes).toBeLessThan(jpeg.bytes);
  });
});
