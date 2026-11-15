/**
 * Image quality analysis for a photographed barcode.
 *
 * This is a *screening* tool, not a verifier. It measures the things that make
 * a photo fail — too few pixels per module, too little contrast, content that
 * runs off the edge, a missing quiet zone — and says so. It never claims that a
 * symbol meets ISO/IEC 15416 (print) or ISO/IEC 15415 (2D) grading: those need a
 * calibrated verifier with a defined aperture and lighting geometry, which a
 * browser cannot provide.
 */
import type { Raster } from "./decode";

export type AnalysisIssue = {
  code: "resolution" | "contrast" | "cropping" | "quiet-zone" | "balance";
  severity: "warning" | "critical";
  message: string;
};

export type ImageAnalysis = {
  width: number;
  height: number;
  /** Share of pixels darker than the threshold. */
  darkRatio: number;
  contrast: { darkLuminance: number; lightLuminance: number; ratio: number };
  /** Estimated module width in pixels, from the median run length. */
  modulePixels: number;
  quietZone: { left: number; right: number; top: number; bottom: number };
  edgesTouched: string[];
  issues: AnalysisIssue[];
  summary: string;
};

const LUMINANCE = (r: number, g: number, b: number) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function relative(luminance: number) {
  // WCAG relative luminance, so a "contrast ratio" here means what a designer
  // expects it to mean.
  return luminance <= 0.03928
    ? luminance / 12.92
    : ((luminance + 0.055) / 1.055) ** 2.4;
}

/** Median of a numeric list (0 for an empty list). */
function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function analyzeRaster(raster: Raster): ImageAnalysis {
  const { width, height, rgba } = raster;
  const total = width * height;
  const lum = new Float32Array(total);
  for (let index = 0; index < total; index += 1) {
    const offset = index * 4;
    lum[index] = LUMINANCE(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
  }

  // Otsu-style split on the luminance histogram: robust for a barcode photo,
  // which is bimodal by nature.
  const histogram = new Array<number>(256).fill(0);
  for (let index = 0; index < total; index += 1)
    histogram[Math.min(255, Math.max(0, Math.round(lum[index] * 255)))] += 1;
  let bestThreshold = 128;
  let bestVariance = -1;
  let totalSum = 0;
  for (let level = 0; level < 256; level += 1)
    totalSum += level * histogram[level];
  let background = 0;
  let backgroundCount = 0;
  for (let level = 0; level < 256; level += 1) {
    backgroundCount += histogram[level];
    if (!backgroundCount) continue;
    const foregroundCount = total - backgroundCount;
    if (!foregroundCount) break;
    background += level * histogram[level];
    const meanBackground = background / backgroundCount;
    const meanForeground = (totalSum - background) / foregroundCount;
    const variance =
      backgroundCount *
      foregroundCount *
      (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = level;
    }
  }

  // Otsu can land on the extreme end of a perfectly bimodal histogram (a
  // threshold of 0 would classify every pixel as light). Keep the split strictly
  // inside the observed range, falling back to the midpoint of that range.
  let minLevel = 255;
  let maxLevel = 0;
  for (let level = 0; level < 256; level += 1) {
    if (!histogram[level]) continue;
    if (level < minLevel) minLevel = level;
    if (level > maxLevel) maxLevel = level;
  }
  const threshold =
    bestThreshold <= minLevel || bestThreshold >= maxLevel
      ? Math.round((minLevel + maxLevel) / 2)
      : bestThreshold;

  let darkCount = 0;
  let darkSum = 0;
  let lightCount = 0;
  let lightSum = 0;
  for (let index = 0; index < total; index += 1) {
    if (lum[index] * 255 < threshold) {
      darkCount += 1;
      darkSum += lum[index];
    } else {
      lightCount += 1;
      lightSum += lum[index];
    }
  }
  const darkLuminance = darkCount ? darkSum / darkCount : 0;
  const lightLuminance = lightCount ? lightSum / lightCount : 1;
  const ratio =
    (relative(Math.max(darkLuminance, lightLuminance)) + 0.05) /
    (relative(Math.min(darkLuminance, lightLuminance)) + 0.05);

  // Run lengths along the middle row estimate the narrow module.
  const row = Math.floor(height / 2);
  const runs: number[] = [];
  let run = 1;
  for (let x = 1; x < width; x += 1) {
    const previous = lum[row * width + x - 1] * 255 < threshold;
    const current = lum[row * width + x] * 255 < threshold;
    if (previous === current) run += 1;
    else {
      runs.push(run);
      run = 1;
    }
  }
  runs.push(run);
  // Ignore the outer margins, which are usually one long uniform run.
  const innerRuns = runs.slice(1, -1).filter((length) => length > 0);
  const modulePixels = Math.max(1, Math.round(median(innerRuns) || 0));

  // Bounding box of ink, so quiet zones can be measured in modules.
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (lum[y * width + x] * 255 >= threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const found = maxX >= 0;

  const quietZone = found
    ? {
        left: Math.round(minX / modulePixels),
        right: Math.round((width - 1 - maxX) / modulePixels),
        top: Math.round(minY / modulePixels),
        bottom: Math.round((height - 1 - maxY) / modulePixels),
      }
    : { left: 0, right: 0, top: 0, bottom: 0 };

  const edgesTouched: string[] = [];
  if (found) {
    if (minX <= 1) edgesTouched.push("left");
    if (maxX >= width - 2) edgesTouched.push("right");
    if (minY <= 1) edgesTouched.push("top");
    if (maxY >= height - 2) edgesTouched.push("bottom");
  }

  const issues: AnalysisIssue[] = [];
  if (modulePixels < 2)
    issues.push({
      code: "resolution",
      severity: "critical",
      message: `The narrow module is about ${modulePixels} px. Most readers need at least 2 px per module, and 3–4 px is safer. Move closer or use a higher-resolution photo.`,
    });
  else if (modulePixels < 3)
    issues.push({
      code: "resolution",
      severity: "warning",
      message: `The narrow module is about ${modulePixels} px — readable, but the margin is thin if the photo is slightly blurred.`,
    });

  if (ratio < 3)
    issues.push({
      code: "contrast",
      severity: "critical",
      message: `Ink and background are only ${ratio.toFixed(1)}:1 apart. Barcode readers need a solid dark-on-light difference; avoid shadows, glare and coloured ink.`,
    });
  else if (ratio < 7)
    issues.push({
      code: "contrast",
      severity: "warning",
      message: `Contrast is ${ratio.toFixed(1)}:1. It may decode, but a flat, evenly lit photo does better.`,
    });

  if (edgesTouched.length)
    issues.push({
      code: "cropping",
      severity: "critical",
      message: `Ink touches the ${edgesTouched.join(" and ")} edge of the image, so the symbol is probably cropped. Retake the photo with the whole barcode plus its white margin visible.`,
    });

  if (found && Math.min(quietZone.left, quietZone.right) < 5)
    issues.push({
      code: "quiet-zone",
      severity: "warning",
      message: `The left/right quiet zone is about ${Math.min(quietZone.left, quietZone.right)} modules. Linear symbols want at least 10 modules (EAN/UPC and ITF-14 have their own minimums) of empty space on each side.`,
    });

  if (
    darkCount / Math.max(1, total) > 0.75 ||
    darkCount / Math.max(1, total) < 0.02
  )
    issues.push({
      code: "balance",
      severity: "warning",
      message:
        "Almost the whole image is one tone. A barcode photo should be a clear mix of dark bars and light background.",
    });

  const critical = issues.filter(
    (issue) => issue.severity === "critical",
  ).length;
  const summary = !found
    ? "No dark ink was found, so there is nothing to read."
    : critical
      ? `${critical} problem${critical === 1 ? "" : "s"} would stop most scanners.`
      : issues.length
        ? "The image looks workable; the warnings below are worth fixing if it fails to scan."
        : "No structural problem found. This is a screening result, not an ISO/IEC 15416 grade.";

  return {
    width,
    height,
    darkRatio: darkCount / Math.max(1, total),
    contrast: { darkLuminance, lightLuminance, ratio },
    modulePixels,
    quietZone,
    edgesTouched,
    issues,
    summary,
  };
}
