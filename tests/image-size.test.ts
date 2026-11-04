import { describe, expect, it } from "vitest";
import {
  MAX_PROBES_PER_PASS,
  MAX_TARGET_ENCODES,
  OPTIMIZE_PRESETS,
  SIZE_PRESETS,
  assessTarget,
  autoFormatFor,
  bytesPerPixel,
  degradationLevel,
  degradationWarning,
  defaultSizeSettings,
  describeProbes,
  estimateOutputBytes,
  estimateWithSpread,
  isLossyFormat,
  nextProbeQuality,
  pickBestProbe,
  planDownscale,
  presetById,
  runSizeSearch,
  sizeReportSummary,
  targetBytes,
  targetLabel,
  validateTarget,
  visuallyLossless,
  type SizeProbe,
} from "@/lib/tools/image-size";

const KB = 1024;

describe("target parsing", () => {
  it("converts KB and MB to bytes", () => {
    expect(targetBytes(200, "KB")).toBe(200 * KB);
    expect(targetBytes(1, "MB")).toBe(1024 * KB);
    expect(targetBytes(2.5, "MB")).toBe(2560 * KB);
  });

  it("refuses targets that cannot produce a usable image", () => {
    expect(() => targetBytes(1, "KB")).toThrow(/5 KB/);
    expect(() => targetBytes(0, "KB")).toThrow(/greater|Enter/);
    expect(() => targetBytes(60, "MB")).toThrow(/50 MB/);
  });

  it("validates raw field values without throwing", () => {
    expect(validateTarget("200", "KB")).toBe("");
    expect(validateTarget("", "KB")).toMatch(/Enter a number/);
    expect(validateTarget("abc", "KB")).toMatch(/Enter a number/);
    expect(validateTarget("-5", "KB")).toMatch(/greater than zero/);
    expect(validateTarget("2", "KB")).toMatch(/5 KB/);
  });

  it("labels targets the way the UI shows them", () => {
    expect(targetLabel(200 * KB)).toBe("200 KB");
    expect(targetLabel(1024 * KB)).toBe("1 MB");
    expect(targetLabel(1536 * KB)).toBe("1.50 MB");
  });

  it("ships the six requested presets", () => {
    expect(SIZE_PRESETS.map((preset) => preset.label)).toEqual([
      "20 KB",
      "50 KB",
      "100 KB",
      "200 KB",
      "500 KB",
      "1 MB",
    ]);
  });

  it("defaults to fixed quality so existing behaviour is unchanged", () => {
    const size = defaultSizeSettings();
    expect(size.mode).toBe("quality");
    expect(size.targetUnit).toBe("KB");
    expect(validateTarget(size.targetValue, size.targetUnit)).toBe("");
  });
});

describe("presets", () => {
  it("keeps quality above a floor that gets stricter as size matters more", () => {
    const floors = OPTIMIZE_PRESETS.map((preset) => preset.qualityFloor);
    expect(floors).toEqual([72, 50, 25]);
  });

  it("only the two compression presets may shrink pixels", () => {
    expect(presetById("max-quality").downscale).toBe(false);
    expect(presetById("balanced").downscale).toBe(true);
    expect(presetById("smallest").downscale).toBe(true);
  });

  it("falls back to balanced for an unknown id", () => {
    expect(presetById("balanced").id).toBe("balanced");
    expect(presetById("nonsense" as unknown as "balanced").id).toBe("balanced");
  });
});

describe("lossless vs lossy is never blurred", () => {
  it("marks the lossy encoders", () => {
    expect(isLossyFormat("jpeg")).toBe(true);
    expect(isLossyFormat("webp")).toBe(true);
    expect(isLossyFormat("avif")).toBe(true);
    expect(isLossyFormat("png")).toBe(false);
  });

  it("treats only pixel-exact containers as lossless", () => {
    expect(visuallyLossless("png")).toBe(true);
    expect(visuallyLossless("bmp")).toBe(true);
    expect(visuallyLossless("tiff")).toBe(true);
    // GIF quantises to 256 colours, so it must never be called lossless.
    expect(visuallyLossless("gif")).toBe(false);
    expect(visuallyLossless("jpeg")).toBe(false);
  });
});

describe("estimates", () => {
  const photo = {
    width: 4000,
    height: 3000,
    kind: "photo" as const,
    compression: "lzw" as const,
  };

  it("grows with quality for lossy formats", () => {
    const low = estimateOutputBytes({ ...photo, format: "jpeg", quality: 30 });
    const high = estimateOutputBytes({ ...photo, format: "jpeg", quality: 95 });
    expect(high).toBeGreaterThan(low * 2);
  });

  it("ignores quality for lossless formats", () => {
    const a = estimateOutputBytes({ ...photo, format: "png", quality: 10 });
    const b = estimateOutputBytes({ ...photo, format: "png", quality: 100 });
    expect(a).toBe(b);
  });

  it("keeps lossy formats smaller than PNG for photos", () => {
    const png = estimateOutputBytes({ ...photo, format: "png", quality: 100 });
    const jpeg = estimateOutputBytes({ ...photo, format: "jpeg", quality: 85 });
    const webp = estimateOutputBytes({ ...photo, format: "webp", quality: 85 });
    const avif = estimateOutputBytes({ ...photo, format: "avif", quality: 85 });
    expect(jpeg).toBeLessThan(png);
    expect(webp).toBeLessThan(jpeg);
    expect(avif).toBeLessThan(webp);
  });

  it("lands a typical 12 MP JPEG near real-world sizes", () => {
    const estimate = estimateOutputBytes({
      ...photo,
      format: "jpeg",
      quality: 85,
    });
    // 12 MP at q85 is normally 2–5 MB; the model must stay in that band.
    expect(estimate).toBeGreaterThan(1.5 * 1024 * 1024);
    expect(estimate).toBeLessThan(6 * 1024 * 1024);
  });

  it("never pretends an estimate is exact", () => {
    const spread = estimateWithSpread({
      ...photo,
      format: "jpeg",
      quality: 85,
    });
    expect(spread.low).toBeLessThan(spread.bytes);
    expect(spread.high).toBeGreaterThan(spread.bytes);
    expect(spread.low).toBeGreaterThan(0);
  });

  it("charges more per pixel for photos than for documents", () => {
    const base = {
      width: 800,
      height: 600,
      format: "png" as const,
      quality: 100,
    };
    expect(bytesPerPixel({ ...base, kind: "photo" })).toBeGreaterThan(
      bytesPerPixel({ ...base, kind: "document" }),
    );
  });
});

describe("target assessment warns before any encode", () => {
  const base = {
    width: 4000,
    height: 3000,
    kind: "photo" as const,
    format: "jpeg" as const,
  };

  it("calls a generous target comfortable", () => {
    const result = assessTarget({
      ...base,
      target: 8 * 1024 * 1024,
      preset: "balanced",
      allowDownscale: true,
    });
    expect(result.feasibility).toBe("comfortable");
    expect(result.scaleNeeded).toBe(1);
    expect(result.message).toMatch(/comfortably inside/i);
  });

  it("keeps a 12 MP photo at 4 MB in the cautious band, not the confident one", () => {
    // A 12 MP JPEG at q85 lands near 4 MB, so 4 MB has no real headroom: the
    // tool must say "little headroom" rather than promise a free win.
    const result = assessTarget({
      ...base,
      target: 4 * 1024 * 1024,
      preset: "balanced",
      allowDownscale: true,
    });
    expect(result.feasibility).toBe("tight");
    expect(result.message).toMatch(/little headroom/i);
    expect(result.scaleNeeded).toBe(1);
  });

  it("flags a target that will cost quality", () => {
    const result = assessTarget({
      ...base,
      target: 400 * KB,
      preset: "balanced",
      allowDownscale: true,
    });
    expect(["tight", "downscale"]).toContain(result.feasibility);
  });

  it("reports unreachable targets instead of promising them", () => {
    const result = assessTarget({
      ...base,
      target: 20 * KB,
      preset: "max-quality",
      allowDownscale: false,
    });
    expect(result.feasibility).toBe("unreachable");
    expect(result.message).toMatch(/not reachable/i);
  });

  it("offers a pixel reduction when that is the only way", () => {
    const result = assessTarget({
      ...base,
      target: 60 * KB,
      preset: "smallest",
      allowDownscale: true,
    });
    expect(result.feasibility).toBe("downscale");
    expect(result.scaleNeeded).toBeLessThan(1);
    expect(result.scaleNeeded).toBeGreaterThan(0.1);
  });

  it("says a lossless format has no quality knob", () => {
    const result = assessTarget({
      ...base,
      format: "png",
      target: 200 * KB,
      preset: "max-quality",
      allowDownscale: false,
    });
    expect(result.feasibility).toBe("unreachable");
    expect(result.message).toMatch(/lossless/i);
  });
});

describe("automatic format selection", () => {
  const supported = () => true;

  it("prefers a smaller lossy container for photos", () => {
    const choice = autoFormatFor({
      format: "jpeg",
      kind: "photo",
      hasAlpha: false,
      keepAlpha: false,
      supported,
    });
    expect(choice?.format).toBe("avif");
  });

  it("keeps transparency when the user asked to keep it", () => {
    const choice = autoFormatFor({
      format: "png",
      kind: "graphic",
      hasAlpha: true,
      keepAlpha: true,
      supported,
    });
    expect(choice?.format).toBe("webp");
  });

  it("never switches when the current format is already the best pick", () => {
    const choice = autoFormatFor({
      format: "webp",
      kind: "graphic",
      hasAlpha: true,
      keepAlpha: true,
      supported,
    });
    expect(choice).toBeNull();
  });

  it("respects what the browser can actually encode", () => {
    const choice = autoFormatFor({
      format: "jpeg",
      kind: "photo",
      hasAlpha: false,
      keepAlpha: false,
      supported: (format) => format !== "avif",
    });
    expect(choice?.format).toBe("webp");
  });
});

describe("quality search is bounded and monotonic", () => {
  const probe = (quality: number, bytes: number): SizeProbe => ({
    quality,
    bytes,
    lossless: false,
  });

  it("searches upward after a fitting sample", () => {
    const next = nextProbeQuality([probe(50, 100 * KB)], 200 * KB, 25, 4);
    expect(next).toBeGreaterThan(50);
  });

  it("searches downward after an oversized sample", () => {
    const next = nextProbeQuality([probe(90, 900 * KB)], 200 * KB, 25, 4);
    expect(next).toBeLessThan(90);
    expect(next).toBeGreaterThanOrEqual(25);
  });

  it("never goes below the preset floor or above the ceiling", () => {
    for (const samples of [[probe(30, 50 * KB)], [probe(99, 9 * KB)]]) {
      const next = nextProbeQuality(samples, 200 * KB, 50, 4, 80);
      if (next !== null) {
        expect(next).toBeGreaterThanOrEqual(50);
        expect(next).toBeLessThanOrEqual(80);
      }
    }
  });

  it("stops when the probe budget for the pass is spent", () => {
    const samples = [
      probe(90, 800 * KB),
      probe(60, 400 * KB),
      probe(40, 250 * KB),
      probe(30, 210 * KB),
    ];
    expect(
      nextProbeQuality(samples, 200 * KB, 25, MAX_PROBES_PER_PASS),
    ).toBeNull();
  });

  it("stops when every remaining quality is already sampled", () => {
    const samples = [probe(50, 300 * KB), probe(51, 290 * KB)];
    expect(nextProbeQuality(samples, 200 * KB, 50, 8, 51)).toBeNull();
  });

  it("picks the highest fitting quality, never the smallest file", () => {
    const samples = [
      probe(40, 90 * KB),
      probe(70, 180 * KB),
      probe(85, 300 * KB),
    ];
    const best = pickBestProbe(samples, 200 * KB);
    expect(best?.quality).toBe(70);
    expect(best?.fits).toBe(true);
  });

  it("admits failure when nothing fits", () => {
    const best = pickBestProbe(
      [probe(30, 500 * KB), probe(25, 420 * KB)],
      200 * KB,
    );
    expect(best?.fits).toBe(false);
    expect(best?.quality).toBe(25);
  });

  it("keeps the whole job inside the encode ceiling", () => {
    // 4 probes per pass over 3 passes (initial + 2 downscale) = 12 slots, so
    // the hard ceiling has to be the tighter of the two.
    expect(MAX_TARGET_ENCODES).toBeLessThanOrEqual(MAX_PROBES_PER_PASS * 3 + 1);
    expect(MAX_TARGET_ENCODES).toBe(8);
  });

  it("describes the audit trail honestly", () => {
    expect(describeProbes([probe(85, 480 * KB), probe(61, 198 * KB)])).toBe(
      "q85 480 KB → q61 198 KB",
    );
    expect(
      describeProbes([{ quality: 100, bytes: 120 * KB, lossless: true }]),
    ).toBe("q100 120 KB lossless");
  });
});

describe("downscale planning", () => {
  it("shrinks towards the target without ever collapsing the image", () => {
    const plan = planDownscale(4000, 3000, 800 * KB, 200 * KB);
    expect(plan.changed).toBe(true);
    expect(plan.width).toBeLessThan(4000);
    expect(plan.width).toBeGreaterThan(400);
    expect(Math.round((plan.width / plan.height) * 100)).toBe(
      Math.round((4000 / 3000) * 100),
    );
  });

  it("keeps a minimum edge so a thumbnail never disappears", () => {
    const plan = planDownscale(200, 150, 10 * 1024 * 1024, 5 * KB, 0.05);
    expect(plan.width).toBeGreaterThanOrEqual(64);
    expect(plan.height).toBeGreaterThanOrEqual(64);
  });

  it("leaves dimensions alone when the target is already met", () => {
    const plan = planDownscale(1000, 800, 100 * KB, 500 * KB);
    expect(plan.changed).toBe(false);
    expect(plan.width).toBe(1000);
  });
});

describe("degradation is reported, never hidden", () => {
  it("calls a lossless, full-size output clean", () => {
    expect(
      degradationLevel({
        lossless: true,
        quality: 100,
        floor: 72,
        downscaled: false,
        targetMet: true,
      }),
    ).toBe("none");
  });

  it("flags a low-quality encode as significant when pixels also shrank", () => {
    expect(
      degradationLevel({
        lossless: false,
        quality: 28,
        floor: 25,
        downscaled: true,
        targetMet: true,
      }),
    ).toBe("significant");
  });

  it("warns in words the user can act on", () => {
    const warning = degradationWarning(
      {
        lossless: false,
        quality: 30,
        floor: 25,
        downscaled: true,
        targetMet: false,
      },
      50 * KB,
    );
    expect(warning).toMatch(/50 KB/);
    expect(warning).toMatch(/Maximum Quality/);
  });

  it("stays quiet when nothing was lost", () => {
    expect(
      degradationWarning(
        {
          lossless: true,
          quality: 100,
          floor: 72,
          downscaled: false,
          targetMet: true,
        },
        200 * KB,
      ),
    ).toBeNull();
  });

  it("summarises a result without ever claiming lossless for lossy output", () => {
    const lossy = sizeReportSummary(
      {
        lossless: false,
        quality: 62,
        probes: 3,
        targetMet: true,
        downscaled: false,
      },
      200 * KB,
    );
    expect(lossy).toMatch(/Lossy encode at quality 62%/);
    expect(lossy).toMatch(/Target 200 KB met/);
    const lossless = sizeReportSummary({
      lossless: true,
      quality: 100,
      probes: 1,
      targetMet: true,
      downscaled: false,
    });
    expect(lossless).toMatch(/Lossless/);
  });

  it("says so when the target was not reached", () => {
    const summary = sizeReportSummary(
      {
        lossless: false,
        quality: 25,
        probes: 4,
        targetMet: false,
        downscaled: true,
      },
      50 * KB,
    );
    expect(summary).toMatch(/Closest achievable to 50 KB/);
    expect(summary).toMatch(/Dimensions reduced/);
  });
});

/* ----------------------------------------------------------------------- *
 * runSizeSearch — the real orchestration, driven by deterministic fakes.
 * The canvas and the encoder are the only browser parts; everything that can
 * go wrong (search order, budgets, downscale rules, reporting) is here.
 * ----------------------------------------------------------------------- */

type FakeCanvas = { width: number; height: number; id: number };

const fakeBlob = (bytes: number) =>
  new Blob([new Uint8Array(Math.min(bytes, 8))], { type: "image/test" }) &&
  ({ size: bytes } as Blob);

/** Deterministic size model: bytes grow with pixels and with quality. */
function fakeBytes(
  format: string,
  quality: number,
  width: number,
  height: number,
): number {
  const pixels = width * height;
  if (format === "png") return Math.round(pixels * 1);
  if (format === "avif")
    return Math.round(pixels * (0.03 + 0.12 * (quality / 100)));
  if (format === "webp")
    return Math.round(pixels * (0.05 + 0.16 * (quality / 100)));
  return Math.round(pixels * (0.09 + 0.3 * (quality / 100)));
}

function harness(options: {
  width?: number;
  height?: number;
  target: number;
  settings?: Partial<
    Parameters<typeof runSizeSearch<FakeCanvas>>[0]["settings"]
  >;
  format?: "jpeg" | "png" | "webp";
  ceiling?: number;
  alwaysHuge?: boolean;
}) {
  const width = options.width ?? 1000;
  const height = options.height ?? 1000;
  const encodes: {
    format: string;
    quality: number;
    bytes: number;
    width: number;
    height: number;
  }[] = [];
  const released: FakeCanvas[] = [];
  let ids = 0;

  const result = runSizeSearch<FakeCanvas>({
    drawAt: (w, h) => ({ width: w, height: h, id: ids++ }),
    encodeAt: async (canvas, format, quality) => {
      const bytes = options.alwaysHuge
        ? 10 * 1024 * 1024
        : fakeBytes(format, quality, canvas.width, canvas.height);
      encodes.push({
        format,
        quality,
        bytes,
        width: canvas.width,
        height: canvas.height,
      });
      return fakeBlob(bytes);
    },
    release: (canvas) => released.push(canvas),
    format: options.format ?? "jpeg",
    width,
    height,
    ceiling: options.ceiling ?? 90,
    target: options.target,
    settings: {
      ...defaultSizeSettings(),
      mode: "target",
      targetValue: String(options.target),
      targetUnit: "KB",
      ...options.settings,
    },
  });

  return { result, encodes, released };
}

describe("runSizeSearch orchestration", () => {
  it("takes the lossless PNG when it already fits, losing no quality", async () => {
    const { result, encodes } = harness({ target: 2 * 1024 * 1024 });
    const outcome = await result;
    expect(outcome.format).toBe("png");
    expect(outcome.report.lossless).toBe(true);
    expect(outcome.report.quality).toBe(100);
    expect(outcome.report.probes).toBe(1);
    expect(outcome.report.switchedFrom).toBe("jpeg");
    expect(encodes).toEqual([
      {
        format: "png",
        quality: 100,
        bytes: 1_000_000,
        width: 1000,
        height: 1000,
      },
    ]);
  });

  it("skips the lossless attempt when the user turned it off", async () => {
    const { result, encodes } = harness({
      target: 2 * 1024 * 1024,
      settings: { losslessFirst: false },
    });
    const outcome = await result;
    expect(outcome.format).toBe("jpeg");
    expect(encodes.every((encode) => encode.format === "jpeg")).toBe(true);
  });

  it("continues to the lossy format when the lossless attempt is too big", async () => {
    const { result, encodes } = harness({ target: 300 * KB });
    const outcome = await result;
    expect(outcome.format).toBe("jpeg");
    expect(encodes[0].format).toBe("png");
    expect(outcome.report.targetMet).toBe(true);
    expect(outcome.report.lossless).toBe(false);
    // It must never describe a lossy encode as lossless.
    expect(outcome.report.quality).toBeLessThan(100);
  });

  it("searches for the highest quality that fits instead of the smallest file", async () => {
    const { result, encodes } = harness({ target: 300 * KB });
    const outcome = await result;
    const fitting = encodes.filter(
      (encode) => encode.format === "jpeg" && encode.bytes <= 300 * KB,
    );
    const bestFit = Math.max(...fitting.map((encode) => encode.quality));
    expect(outcome.report.quality).toBe(bestFit);
    expect(outcome.blob.size).toBeLessThanOrEqual(300 * KB);
    expect(outcome.report.downscaled).toBe(false);
  });

  it("stays inside the per-pass probe budget", async () => {
    const { result, encodes } = harness({ target: 300 * KB });
    await result;
    expect(encodes.length).toBeLessThanOrEqual(1 + MAX_PROBES_PER_PASS);
  });

  it("reduces pixels only after quality alone has failed", async () => {
    const { result, encodes } = harness({
      width: 1000,
      height: 1000,
      target: 200 * KB,
      settings: { preset: "balanced", losslessFirst: false },
    });
    const outcome = await result;
    expect(outcome.report.targetMet).toBe(true);
    expect(outcome.report.downscaled).toBe(true);
    expect(outcome.width).toBeLessThan(1000);
    // Quality is exhausted at full size before a single pixel is dropped.
    const firstReduced = encodes.findIndex((encode) => encode.width < 1000);
    expect(firstReduced).toBeGreaterThan(0);
    expect(
      encodes
        .slice(0, firstReduced)
        .every((encode) => encode.width === 1000 && encode.height === 1000),
    ).toBe(true);
    // The quality search really ran at full size, it was not one lucky probe.
    expect(firstReduced).toBeGreaterThanOrEqual(2);
  });

  it("refuses to shrink pixels when the preset forbids it", async () => {
    const { result } = harness({
      target: 20 * KB,
      settings: { preset: "max-quality", losslessFirst: false },
    });
    const outcome = await result;
    expect(outcome.report.downscaled).toBe(false);
    expect(outcome.report.targetMet).toBe(false);
    expect(outcome.width).toBe(1000);
    expect(outcome.report.warning).toMatch(/Maximum Quality|quality/i);
  });

  it("honours allowDownscale=false even on the aggressive preset", async () => {
    const { result } = harness({
      target: 20 * KB,
      settings: {
        preset: "smallest",
        allowDownscale: false,
        losslessFirst: false,
      },
    });
    const outcome = await result;
    expect(outcome.report.downscaled).toBe(false);
    expect(outcome.report.targetMet).toBe(false);
  });

  it("stops inside the encode ceiling and says the target was missed", async () => {
    const { result, encodes } = harness({
      target: 20 * KB,
      alwaysHuge: true,
      settings: { preset: "smallest", losslessFirst: false },
    });
    const outcome = await result;
    // The reachable worst case is one lossless probe plus four probes in the
    // first pass plus one floor probe per downscale pass; the hard ceiling sits
    // above it as a backstop against a runaway search.
    expect(encodes.length).toBeLessThanOrEqual(MAX_TARGET_ENCODES);
    expect(encodes.length).toBeGreaterThan(1);
    expect(outcome.report.targetMet).toBe(false);
    expect(outcome.report.warning).toMatch(/could not reach/i);
  });

  it("frees every canvas it rendered, including the winner", async () => {
    const { result, released } = harness({ target: 300 * KB });
    const outcome = await result;
    // Lossless probe + the render that won: nothing may stay allocated, or a
    // 20-file batch would exhaust the browser's canvas budget.
    expect(released.length).toBe(2);
    expect(released.some((canvas) => canvas.width === outcome.width)).toBe(
      true,
    );
  });

  it("still frees its canvases when the search throws", async () => {
    const released: FakeCanvas[] = [];
    await expect(
      runSizeSearch<FakeCanvas>({
        drawAt: (width, height) => ({ width, height, id: 1 }),
        encodeAt: async () => {
          throw new Error("encoder exploded");
        },
        release: (canvas) => released.push(canvas),
        format: "jpeg",
        width: 100,
        height: 100,
        ceiling: 90,
        target: 300 * KB,
        settings: {
          ...defaultSizeSettings(),
          mode: "target",
          losslessFirst: true,
        },
      }),
    ).rejects.toThrow(/encoder exploded/);
    expect(released).toHaveLength(1);
  });

  it("switches format only when auto selection is on", async () => {
    const off = await harness({
      target: 150 * KB,
      settings: { autoFormat: false, losslessFirst: false },
    }).result;
    expect((await off).format).toBe("jpeg");

    const on = await harness({
      target: 150 * KB,
      settings: { autoFormat: true, losslessFirst: false },
    }).result;
    const outcome = await on;
    expect(outcome.format).toBe("avif");
    expect(outcome.report.switchedFrom).toBe("jpeg");
  });

  it("stops immediately when the run is cancelled", async () => {
    const { result } = harness({ target: 300 * KB });
    await expect(
      runSizeSearch<FakeCanvas>({
        drawAt: (w, h) => ({ width: w, height: h, id: 1 }),
        encodeAt: async () => fakeBlob(10),
        release: () => {},
        assertNotAborted: () => {
          throw new Error("The conversion was cancelled.");
        },
        format: "jpeg",
        width: 100,
        height: 100,
        ceiling: 90,
        target: 300 * KB,
        settings: {
          ...defaultSizeSettings(),
          mode: "target",
          losslessFirst: true,
        },
      }),
    ).rejects.toThrow(/cancelled/i);
    expect(result).toBeTruthy();
  });

  it("handles a lossless target format with a single encode", async () => {
    const { result, encodes } = harness({
      target: 2 * 1024 * 1024,
      format: "png",
      settings: { losslessFirst: false },
    });
    const outcome = await result;
    expect(outcome.report.lossless).toBe(true);
    expect(encodes).toHaveLength(1);
    expect(outcome.report.targetMet).toBe(true);
  });

  it("reports an unreachable lossless target honestly", async () => {
    const { result } = harness({
      target: 100 * KB,
      format: "png",
      settings: { losslessFirst: false, allowDownscale: false },
    });
    const outcome = await result;
    expect(outcome.report.targetMet).toBe(false);
    expect(outcome.report.lossless).toBe(true);
    expect(outcome.report.warning).toMatch(/could not reach/i);
    expect(outcome.report.warning).toMatch(/losslessly/);
  });
});
