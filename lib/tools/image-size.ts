/**
 * Smart compression model for the Image & PDF Converter.
 *
 * Everything here is pure and DOM-free: it decides *what* to try (targets,
 * quality ladders, downscale steps, format choices) and *what to tell the
 * user* about it. The actual encodes live in `image-convert-runner.ts`.
 *
 * Two rules drive this module:
 *  1. never claim lossless when a lossy encoder produced the bytes;
 *  2. never quietly throw away detail — degradation is measured and reported.
 */

import {
  downscaleRatio,
  downscaledSize,
  type CompressFormat,
} from "./image-compress";
import type { ConvertFormat, FormatKind } from "./image-convert";

/* ------------------------------- settings -------------------------------- */

export type SizeUnit = "KB" | "MB";

export const SIZE_UNITS: readonly SizeUnit[] = ["KB", "MB"] as const;

export type SizeMode = "quality" | "target";

/**
 * Maximum Quality — keep every pixel, only touch the encoder.
 * Balanced    — allow a gentle downscale when quality alone cannot reach it.
 * Smallest    — chase the target, accept a real quality drop.
 */
export type OptimizePreset = "max-quality" | "balanced" | "smallest";

export type SizeSettings = {
  /** "quality" = the classic single-quality encode; "target" = size engine. */
  mode: SizeMode;
  /** Target size as text so the field can hold a half-typed number. */
  targetValue: string;
  targetUnit: SizeUnit;
  preset: OptimizePreset;
  /** Try a lossless encode before any lossy one. */
  losslessFirst: boolean;
  /** May switch to a smaller format when that clearly helps. */
  autoFormat: boolean;
  /** May shrink pixels when quality alone cannot reach the target. */
  allowDownscale: boolean;
  /** Engine hint: does the source have transparency the user wants to keep? */
  keepAlpha?: boolean;
  /** Engine hint: which formats this browser can really encode. */
  supported?: (format: ConvertFormat) => boolean;
};

export const MIN_TARGET_BYTES = 5 * 1024;
export const MAX_TARGET_BYTES = 50 * 1024 * 1024;
/** Encodes per file per downscale pass — bounded so nothing churns forever. */
export const MAX_PROBES_PER_PASS = 4;
/** Downscale passes before we accept the best we have. */
export const MAX_SCALE_PASSES = 2;
/** Absolute ceiling of encodes for one file in target mode. */
export const MAX_TARGET_ENCODES = 8;

export const SIZE_PRESETS: readonly { bytes: number; label: string }[] = [
  { bytes: 20 * 1024, label: "20 KB" },
  { bytes: 50 * 1024, label: "50 KB" },
  { bytes: 100 * 1024, label: "100 KB" },
  { bytes: 200 * 1024, label: "200 KB" },
  { bytes: 500 * 1024, label: "500 KB" },
  { bytes: 1024 * 1024, label: "1 MB" },
] as const;

export type OptimizePresetDef = {
  id: OptimizePreset;
  label: string;
  /** Lowest encoder quality this preset will accept. */
  qualityFloor: number;
  /** Whether this preset may shrink pixels. */
  downscale: boolean;
  note: string;
};

export const OPTIMIZE_PRESETS: readonly OptimizePresetDef[] = [
  {
    id: "max-quality",
    label: "Maximum Quality",
    qualityFloor: 72,
    downscale: false,
    note: "Keeps every pixel. Quality never drops below 72%; if the target still does not fit you get the best file instead of a worse image.",
  },
  {
    id: "balanced",
    label: "Balanced Compression",
    qualityFloor: 50,
    downscale: true,
    note: "Holds quality at 50% or better and shrinks dimensions only when that is the only way to reach the target.",
  },
  {
    id: "smallest",
    label: "Smallest File",
    qualityFloor: 25,
    downscale: true,
    note: "Chases the target: quality may fall to 25% and pixels may be reduced. Visible softening is likely.",
  },
] as const;

export function presetById(id: OptimizePreset): OptimizePresetDef {
  return (
    OPTIMIZE_PRESETS.find((preset) => preset.id === id) ?? OPTIMIZE_PRESETS[1]
  );
}

export function defaultSizeSettings(): SizeSettings {
  return {
    mode: "quality",
    targetValue: "200",
    targetUnit: "KB",
    preset: "balanced",
    losslessFirst: true,
    autoFormat: false,
    allowDownscale: true,
  };
}

/* -------------------------------- targets -------------------------------- */

export function targetBytes(value: number, unit: SizeUnit): number {
  const bytes =
    unit === "MB" ? Math.round(value * 1024 * 1024) : Math.round(value * 1024);
  if (!Number.isFinite(bytes) || bytes <= 0)
    throw new Error("Enter a target size.");
  if (bytes < MIN_TARGET_BYTES)
    throw new Error("Targets start at 5 KB — anything smaller is unusable.");
  if (bytes > MAX_TARGET_BYTES) throw new Error("Set a target below 50 MB.");
  return bytes;
}

/** Error text for a raw field value, or "" when it is usable. */
export function validateTarget(value: string, unit: SizeUnit): string {
  const parsed = Number(value);
  if (!value.trim() || !Number.isFinite(parsed))
    return "Enter a number, for example 200.";
  if (parsed <= 0) return "The target must be greater than zero.";
  try {
    targetBytes(parsed, unit);
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid target.";
  }
  return "";
}

export function presetForBytes(bytes: number): number | null {
  const match = SIZE_PRESETS.find((preset) => preset.bytes === bytes);
  return match ? match.bytes : null;
}

export function targetLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(2)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

/** Smallest realistic target for a given pixel count — used to warn early. */
export function floorTargetForPixels(width: number, height: number): number {
  const pixels = Math.max(1, width * height);
  // Roughly the size of a q30 WebP at 40% linear scale, with a hard floor.
  return Math.max(MIN_TARGET_BYTES, Math.round(pixels * 0.16 * 0.045));
}

/* ------------------------------- estimating ------------------------------ */

type LossyModel = { base: number; span: number; power: number };

/** Bytes-per-pixel model for the lossy encoders, fitted to typical photos. */
const LOSSY_MODELS: Record<"jpeg" | "webp" | "avif", LossyModel> = {
  jpeg: { base: 0.09, span: 0.3, power: 1.6 },
  webp: { base: 0.05, span: 0.165, power: 1.6 },
  avif: { base: 0.035, span: 0.115, power: 1.6 },
};

/** Bytes-per-pixel for the lossless containers, split by content type. */
const LOSSLESS_BPP: Record<
  "png" | "gif" | "bmp" | "tiff",
  Record<FormatKind, number>
> = {
  png: { photo: 1.05, graphic: 0.4, document: 0.17 },
  gif: { photo: 0.4, graphic: 0.2, document: 0.11 },
  bmp: { photo: 3, graphic: 3, document: 3 },
  tiff: { photo: 0.95, graphic: 0.34, document: 0.15 },
};

const LOSSY_IDS: readonly ConvertFormat[] = ["jpeg", "webp", "avif"];

export function isLossyFormat(format: ConvertFormat): boolean {
  return LOSSY_IDS.includes(format);
}

/**
 * True only when every output pixel can equal the input pixel.
 * GIF is excluded on purpose: its 256-colour palette is a lossy quantisation.
 */
export function visuallyLossless(format: ConvertFormat): boolean {
  return format === "png" || format === "bmp" || format === "tiff";
}

export type EstimateInput = {
  width: number;
  height: number;
  format: ConvertFormat;
  quality: number;
  kind: FormatKind;
  /** TIFF only: uncompressed files are far bigger than LZW. */
  compression?: "lzw" | "none";
};

export function bytesPerPixel(input: EstimateInput): number {
  const quality = Math.min(100, Math.max(1, input.quality)) / 100;
  if (
    input.format === "jpeg" ||
    input.format === "webp" ||
    input.format === "avif"
  ) {
    const model = LOSSY_MODELS[input.format];
    return model.base + model.span * Math.pow(quality, model.power);
  }
  if (input.format === "bmp") return 3;
  if (input.format === "tiff" && input.compression === "none") return 3.05;
  return LOSSLESS_BPP[input.format as "png" | "gif" | "tiff"][input.kind];
}

/** Point estimate of the encoded size. Treat it as a hint, never as truth. */
export function estimateOutputBytes(input: EstimateInput): number {
  const pixels = Math.max(
    1,
    Math.round(input.width) * Math.round(input.height),
  );
  const overhead = input.format === "tiff" ? 1024 : 2048;
  return Math.max(1, Math.round(pixels * bytesPerPixel(input)) + overhead);
}

/** Honest spread around an estimate: encoders vary with image content. */
export function estimateSpread(format: ConvertFormat): number {
  return isLossyFormat(format) ? 0.4 : 0.3;
}

export type SizeEstimate = {
  bytes: number;
  low: number;
  high: number;
};

export function estimateWithSpread(input: EstimateInput): SizeEstimate {
  const bytes = estimateOutputBytes(input);
  const spread = estimateSpread(input.format);
  return {
    bytes,
    low: Math.max(1, Math.round(bytes * (1 - spread))),
    high: Math.round(bytes * (1 + spread)),
  };
}

export type Feasibility = "comfortable" | "tight" | "downscale" | "unreachable";

export type TargetAssessment = {
  target: number;
  feasibility: Feasibility;
  /** Best-case bytes at full size, at the preset's quality floor. */
  bestAtFullSize: number;
  /** Linear scale needed to hit the target, 1 when none is required. */
  scaleNeeded: number;
  message: string;
};

/**
 * Predict what a target will cost *before* anything is encoded, so the UI can
 * warn instead of surprising the user after the fact.
 */
export function assessTarget(
  input: Omit<EstimateInput, "quality"> & {
    target: number;
    preset: OptimizePreset;
    allowDownscale: boolean;
  },
): TargetAssessment {
  const preset = presetById(input.preset);
  const best = estimateOutputBytes({ ...input, quality: preset.qualityFloor });
  const atSetting = estimateOutputBytes({
    ...input,
    quality: isLossyFormat(input.format) ? 85 : preset.qualityFloor,
  });
  const target = input.target;

  let feasibility: Feasibility;
  let scaleNeeded = 1;
  let message: string;

  if (visuallyLossless(input.format)) {
    if (best <= target * 0.85) {
      feasibility = "comfortable";
      message = `${formatKindWord(input.kind)} like this usually fits ${targetLabel(target)} losslessly.`;
    } else if (best <= target) {
      feasibility = "tight";
      message = `A lossless file will be close to ${targetLabel(target)}. There is no quality knob for this format.`;
    } else if (input.allowDownscale) {
      scaleNeeded = clampScale(Math.sqrt(target / best) * 0.95);
      feasibility = "downscale";
      message = `Lossless output needs about ${Math.round(scaleNeeded * 100)}% of the current dimensions to fit ${targetLabel(target)}. Pixels will be reduced.`;
    } else {
      feasibility = "unreachable";
      message = `A lossless ${formatByIdWord(input.format)} of this size cannot reach ${targetLabel(target)}. Allow smaller dimensions or switch to a lossy format.`;
    }
  } else if (atSetting <= target * 0.85) {
    feasibility = "comfortable";
    message = `Expect roughly ${targetLabel(atSetting)} — comfortably inside ${targetLabel(target)}.`;
  } else if (best <= target) {
    feasibility = "tight";
    message = `Reachable with little headroom: expect roughly ${targetLabel(atSetting)} and quality may come down towards ${preset.qualityFloor}% to stay inside ${targetLabel(target)}.`;
  } else if (input.allowDownscale) {
    scaleNeeded = clampScale(Math.sqrt(target / best) * 0.95);
    feasibility = "downscale";
    message = `Even at ${preset.qualityFloor}% this needs about ${Math.round(scaleNeeded * 100)}% of the current dimensions. Expect visible softening.`;
  } else {
    feasibility = "unreachable";
    message = `${targetLabel(target)} is not reachable at this size. Allow smaller dimensions, raise the target, or pick a smaller format.`;
  }

  return { target, feasibility, bestAtFullSize: best, scaleNeeded, message };
}

function clampScale(scale: number) {
  return Math.min(1, Math.max(0.1, scale));
}

function formatKindWord(kind: FormatKind) {
  if (kind === "photo") return "Photos";
  if (kind === "graphic") return "Graphics";
  return "Documents";
}

function formatByIdWord(format: ConvertFormat) {
  return format.toUpperCase();
}

/* ---------------------------- format selection --------------------------- */

export type AutoFormatChoice = {
  format: ConvertFormat;
  reason: string;
} | null;

/**
 * Pick a smaller container when that is a clear win. Alpha is never traded
 * away: a source with transparency only ever maps to alpha-capable formats.
 */
export function autoFormatFor(options: {
  format: ConvertFormat;
  kind: FormatKind;
  hasAlpha: boolean;
  keepAlpha: boolean;
  /** Formats this browser can actually encode. */
  supported: (format: ConvertFormat) => boolean;
}): AutoFormatChoice {
  const { format, kind, hasAlpha, keepAlpha, supported } = options;
  const needsAlpha = hasAlpha && keepAlpha;
  const candidates: ConvertFormat[] =
    kind === "photo"
      ? needsAlpha
        ? ["webp", "avif"]
        : ["avif", "webp", "jpeg"]
      : needsAlpha
        ? ["webp", "png"]
        : ["webp", "jpeg"];

  const best = candidates.find((candidate) => supported(candidate));
  if (!best || best === format) return null;
  const reason = needsAlpha
    ? `${best.toUpperCase()} keeps transparency and is usually smaller than ${format.toUpperCase()}.`
    : `${best.toUpperCase()} is usually smaller than ${format.toUpperCase()} for this content.`;
  return { format: best, reason };
}

/* ----------------------------- quality search ---------------------------- */

export type SizeProbe = { quality: number; bytes: number; lossless: boolean };

/**
 * Next quality to encode at, or null when the search is finished.
 *
 * Binary search between the preset floor and the best quality already known to
 * fit, so a file needs at most a handful of encodes instead of a sweep.
 */
export function nextProbeQuality(
  samples: readonly SizeProbe[],
  target: number,
  floor: number,
  maxProbes: number,
  ceiling = 100,
): number | null {
  if (samples.length >= maxProbes) return null;
  const fitting = samples.filter((sample) => sample.bytes <= target);
  const failing = samples.filter((sample) => sample.bytes > target);
  // Everything at or below the best fitting quality is known to work, so the
  // search continues just above it; everything at or above the smallest
  // failing quality is known to be too big.
  const low = fitting.length
    ? Math.max(floor, Math.max(...fitting.map((sample) => sample.quality)) + 1)
    : floor;
  const high = failing.length
    ? Math.min(
        ceiling,
        Math.min(...failing.map((sample) => sample.quality)) - 1,
      )
    : ceiling;
  if (high < low) return null;
  const mid = Math.round((low + high) / 2);
  if (samples.some((sample) => sample.quality === mid)) return null;
  return mid;
}

/** Highest quality that fits, else the smallest sample we managed. */
export function pickBestProbe(
  samples: readonly SizeProbe[],
  target: number,
): (SizeProbe & { fits: boolean }) | null {
  if (!samples.length) return null;
  const fitting = samples
    .filter((sample) => sample.bytes <= target)
    .sort((a, b) => b.quality - a.quality || a.bytes - b.bytes);
  if (fitting.length) return { ...fitting[0], fits: true };
  const smallest = [...samples].sort((a, b) => a.bytes - b.bytes)[0];
  return { ...smallest, fits: false };
}

/** "q82 480 KB → q61 198 KB" — the audit trail shown next to a result. */
export function describeProbes(samples: readonly SizeProbe[]): string {
  return samples
    .map(
      (sample) =>
        `q${sample.quality} ${Math.round(sample.bytes / 1024)} KB${sample.lossless ? " lossless" : ""}`,
    )
    .join(" → ");
}

/* ------------------------------ downscaling ------------------------------ */

export type DownscalePlan = {
  width: number;
  height: number;
  ratio: number;
  changed: boolean;
};

export function planDownscale(
  width: number,
  height: number,
  smallestBytes: number,
  target: number,
  currentRatio = 1,
): DownscalePlan {
  // Nothing to chase: the smallest encode already fits, so pixels stay put.
  if (smallestBytes <= target)
    return { width, height, ratio: currentRatio, changed: false };
  const ratio = downscaleRatio(smallestBytes, target, currentRatio);
  const next = downscaledSize(width, height, ratio, 64);
  return {
    width: next.width,
    height: next.height,
    ratio,
    changed: next.changed,
  };
}

/* ------------------------------ degradation ------------------------------ */

export type DegradationLevel = "none" | "minor" | "significant";

export type DegradationInput = {
  lossless: boolean;
  quality: number;
  floor: number;
  downscaled: boolean;
  targetMet: boolean;
};

/** How much of the original the output really kept — never guessed upwards. */
export function degradationLevel(input: DegradationInput): DegradationLevel {
  if (input.lossless && !input.downscaled) return "none";
  if (input.downscaled && input.quality < input.floor + 15)
    return "significant";
  if (input.downscaled || input.quality < input.floor + 20) return "minor";
  return input.quality < 80 ? "minor" : "none";
}

export type SizeReport = {
  lossless: boolean;
  quality: number;
  probes: number;
  targetMet: boolean;
  downscaled: boolean;
  /** The target this run aimed at, in bytes. */
  target?: number;
  /** Set when the engine changed the output format to reach the target. */
  switchedFrom?: ConvertFormat;
  warning?: string;
};

/** Human-readable summary for the result card. */
export function sizeReportSummary(report: SizeReport, target?: number): string {
  const parts: string[] = [
    report.lossless
      ? "Lossless — every output pixel matches the input"
      : `Lossy encode at quality ${report.quality}%`,
  ];
  if (target)
    parts.push(
      report.targetMet
        ? `Target ${targetLabel(target)} met`
        : `Closest achievable to ${targetLabel(target)}`,
    );
  if (report.downscaled) parts.push("Dimensions reduced to fit");
  if (report.probes > 1) parts.push(`${report.probes} encodes compared`);
  return parts.join(" · ");
}

/** True when the pipeline should stop early and tell the user the truth. */
export function degradationWarning(
  input: DegradationInput,
  target: number,
): string | null {
  const level = degradationLevel(input);
  if (level === "none") return null;
  if (level === "significant")
    return `Reaching ${targetLabel(target)} needed real quality loss: quality ${input.quality}%${input.downscaled ? " with reduced dimensions" : ""}. The best-quality version is available by switching to Maximum Quality.`;
  return `Reaching ${targetLabel(target)} cost some detail (quality ${input.quality}%${input.downscaled ? ", smaller dimensions" : ""}). Raise the target for a sharper file.`;
}

/* --------------------------- shared compressor --------------------------- */

/**
 * The Image Compressor tool reuses these mappers so its MIME strings and the
 * converter's format ids never drift apart.
 */
export function compressFormatFor(
  format: ConvertFormat,
): CompressFormat | null {
  const map: Partial<Record<ConvertFormat, CompressFormat>> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };
  return map[format] ?? null;
}

export { downscaleRatio, downscaledSize };

/* ----------------------------- search engine ----------------------------- */

export type SizeSearchOptions<C> = {
  /** Render the source at a pixel size. Called once per downscale pass. */
  drawAt: (width: number, height: number) => C;
  /** Encode what was rendered. The only side-effecting call in here. */
  encodeAt: (
    canvas: C,
    format: ConvertFormat,
    quality: number,
  ) => Promise<Blob>;
  /**
   * Free a render. Every canvas this search creates is handed back through it
   * before the search returns, winner included — the chosen bytes are already
   * in a Blob, so no render needs to outlive the search.
   */
  release: (canvas: C) => void;
  /** Throw when the user cancelled. */
  assertNotAborted?: () => void;
  format: ConvertFormat;
  width: number;
  height: number;
  settings: SizeSettings;
  /** Highest quality the user is willing to accept. */
  ceiling: number;
  target: number;
};

export type SizeSearchResult = {
  blob: Blob;
  format: ConvertFormat;
  width: number;
  height: number;
  report: SizeReport;
};

/**
 * Find the best quality/size combination that fits a target.
 *
 * This is the whole decision procedure, kept free of any browser API so it can
 * be tested with deterministic fake encoders:
 *
 *  1. a lossless PNG attempt first, when the chosen format is lossy — a
 *     screenshot that already fits is better than any lossy encode;
 *  2. the chosen format, searched top-down in bounded binary steps;
 *  3. fewer pixels, but only when the preset and the user both allow it;
 *  4. an honest "closest achievable" result when nothing fits.
 *
 * Encode counts are hard-capped: repeated lossy encoding is exactly what
 * destroys detail, so the search stops and says so instead of grinding.
 */
export async function runSizeSearch<C>(
  options: SizeSearchOptions<C>,
): Promise<SizeSearchResult> {
  const { drawAt, encodeAt, release, assertNotAborted, settings, target } =
    options;
  const preset = presetById(settings.preset);
  const allowDownscale = settings.allowDownscale && preset.downscale;
  const ceiling = Math.min(100, Math.max(preset.qualityFloor, options.ceiling));
  const keep = new Set<C>();
  let encodes = 0;
  let switchedFrom: ConvertFormat | undefined;
  const best: { value: SizeCandidate<C> | null } = { value: null };
  const smallest: { value: SizeCandidate<C> | null } = { value: null };

  const freeAll = () => {
    for (const canvas of keep) release(canvas);
    keep.clear();
  };
  try {
    return await searchSize();
  } finally {
    // Browsers cap live canvases hard, so nothing is left allocated — not the
    // rejected probes, and not the winning render either.
    freeAll();
  }

  async function searchSize(): Promise<SizeSearchResult> {
    const track = (canvas: C) => {
      keep.add(canvas);
      return canvas;
    };
    const consider = (candidate: SizeCandidate<C>) => {
      if (!best.value || candidate.quality > best.value.quality)
        best.value = candidate;
      if (!smallest.value || candidate.blob.size < smallest.value.blob.size)
        smallest.value = candidate;
    };
    const encodeOnce = async (
      canvas: C,
      format: ConvertFormat,
      quality: number,
      width: number,
      height: number,
    ): Promise<SizeCandidate<C>> => {
      assertNotAborted?.();
      encodes += 1;
      if (encodes > MAX_TARGET_ENCODES)
        throw new Error(
          "The size search stopped after eight encodes. Use a larger target or a fixed quality instead.",
        );
      const blob = await encodeAt(canvas, format, quality);
      return {
        blob,
        quality,
        canvas,
        width,
        height,
        format,
        lossless: visuallyLossless(format),
      };
    };

    // 1 — Lossless first, if a lossless result is even possible here.
    if (settings.losslessFirst && isLossyFormat(options.format)) {
      const canvas = track(drawAt(options.width, options.height));
      const candidate = await encodeOnce(
        canvas,
        "png",
        100,
        options.width,
        options.height,
      );
      if (candidate.blob.size <= target)
        return {
          blob: candidate.blob,
          format: "png",
          width: candidate.width,
          height: candidate.height,
          report: {
            lossless: true,
            quality: 100,
            probes: 1,
            targetMet: true,
            downscaled: false,
            target,
            switchedFrom: options.format,
          },
        };
    }

    // 2 — The requested format. Auto selection only ever trades sideways to a
    // smaller container, never transparency away.
    let format = options.format;
    if (settings.autoFormat) {
      const choice = autoFormatFor({
        format,
        kind: autoFormatKind(format),
        hasAlpha: settings.keepAlpha ?? false,
        keepAlpha: settings.keepAlpha ?? false,
        supported: (candidate) => settings.supported?.(candidate) ?? true,
      });
      if (choice) {
        switchedFrom = format;
        format = choice.format;
      }
    }

    const losslessFormat = visuallyLossless(format);
    let scale = 1;
    let canvas = track(drawAt(options.width, options.height));
    let width = options.width;
    let height = options.height;

    for (let pass = 0; pass <= MAX_SCALE_PASSES; pass += 1) {
      if (pass > 0) {
        if (!allowDownscale || !smallest.value) break;
        const next = planDownscale(
          options.width,
          options.height,
          smallest.value.blob.size,
          target,
          scale,
        );
        if (!next.changed) break;
        scale = next.ratio;
        width = next.width;
        height = next.height;
        canvas = track(drawAt(width, height));
      }

      const passSamples: SizeProbe[] = [];
      const startQuality = losslessFormat
        ? 100
        : pass === 0
          ? ceiling
          : preset.qualityFloor;
      const first = await encodeOnce(
        canvas,
        format,
        startQuality,
        width,
        height,
      );
      passSamples.push({
        quality: first.quality,
        bytes: first.blob.size,
        lossless: first.lossless,
      });
      consider(first);
      if (first.blob.size <= target) break;
      // A lossless container has no quality knob; only pixels are left to trade.
      if (losslessFormat) continue;

      for (;;) {
        const next = nextProbeQuality(
          passSamples,
          target,
          preset.qualityFloor,
          MAX_PROBES_PER_PASS,
          ceiling,
        );
        if (next === null) break;
        const probe = await encodeOnce(canvas, format, next, width, height);
        passSamples.push({
          quality: probe.quality,
          bytes: probe.blob.size,
          lossless: probe.lossless,
        });
        consider(probe);
        if (probe.blob.size <= target) break;
      }

      if (best.value && best.value.blob.size <= target) break;
    }

    const chosen =
      best.value && best.value.blob.size <= target
        ? best.value
        : smallest.value;
    if (!chosen)
      throw new Error("No encoding could be produced for this image.");

    const targetMet = chosen.blob.size <= target;
    const downscaled =
      chosen.width !== options.width || chosen.height !== options.height;
    const degradation =
      degradationWarning(
        {
          lossless: chosen.lossless,
          quality: chosen.quality,
          floor: preset.qualityFloor,
          downscaled,
          targetMet,
        },
        target,
      ) ?? undefined;
    return {
      blob: chosen.blob,
      format: chosen.format,
      width: chosen.width,
      height: chosen.height,
      report: {
        lossless: chosen.lossless,
        quality: chosen.quality,
        probes: encodes,
        targetMet,
        downscaled,
        target,
        switchedFrom:
          switchedFrom && switchedFrom !== chosen.format
            ? switchedFrom
            : undefined,
        // A missed target is never silent, even when nothing was degraded.
        warning:
          degradation ??
          (targetMet
            ? undefined
            : `Could not reach ${targetLabel(target)}: the closest this image gets is ${targetLabel(chosen.blob.size)}${chosen.lossless ? " losslessly" : ` at quality ${chosen.quality}%`}. Raise the target${downscaled ? "" : " or allow smaller dimensions"} for a better result.`),
      },
    };
  }
}

type SizeCandidate<C> = {
  blob: Blob;
  quality: number;
  canvas: C;
  width: number;
  height: number;
  format: ConvertFormat;
  lossless: boolean;
};

/** Content type used when auto-selecting a format. */
function autoFormatKind(format: ConvertFormat): FormatKind {
  if (format === "jpeg" || format === "avif") return "photo";
  if (format === "png" || format === "gif") return "graphic";
  if (format === "tiff" || format === "bmp") return "document";
  return "photo";
}
