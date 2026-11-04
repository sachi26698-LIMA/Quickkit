/**
 * Multi-symbol localisation.
 *
 * jsQR locates *one* symbol per call. "Extract every QR code from a screenshot"
 * therefore cannot be a loop over the same frame — it needs a finder-pattern
 * search of its own, followed by a mask, so the next call looks at a different
 * part of the picture.
 *
 * The locator below is deliberately simple and honest: it walks horizontal rows
 * looking for the 1:1:3:1:1 dark/light run that defines a finder pattern, checks
 * the candidate vertically and along both diagonals, then groups four hits into
 * a square. Anything it cannot corroborate is discarded. A missed region is a
 * missed code, never an invented one.
 */
import type { Point, Raster } from "./types";
import { toGreyscale } from "./raster";

export type LocatedRegion = {
  /** Inclusive-exclusive pixel bounds in the frame the locator ran on. */
  x: number;
  y: number;
  size: number;
  /** How much corroboration the candidate got; used to order attempts. */
  score: number;
};

type FinderCandidate = Point & { modules: number; score: number };

const isDark = (
  grey: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return grey[y * width + x] < 128;
};

/**
 * Verify the 1:1:3:1:1 ratio around a candidate centre along one axis.
 * `step` is (dx, dy) for the axis; returns the run length in pixels.
 */
function axisRatio(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
  centreX: number,
  centreY: number,
  dx: number,
  dy: number,
): number | null {
  const runs = [0, 0, 0, 0, 0];
  let x = centreX;
  let y = centreY;
  // Centre run (the 3-wide dark square).
  while (isDark(grey, width, height, Math.round(x), Math.round(y))) {
    runs[2] += 1;
    x -= dx;
    y -= dy;
    if (runs[2] > 64) return null;
  }
  while (!isDark(grey, width, height, Math.round(x), Math.round(y))) {
    runs[1] += 1;
    x -= dx;
    y -= dy;
    if (runs[1] > 64) return null;
  }
  while (isDark(grey, width, height, Math.round(x), Math.round(y))) {
    runs[0] += 1;
    x -= dx;
    y -= dy;
    if (runs[0] > 64) return null;
  }
  x = centreX + dx;
  y = centreY + dy;
  while (isDark(grey, width, height, Math.round(x), Math.round(y))) {
    runs[2] += 1;
    x += dx;
    y += dy;
    if (runs[2] > 128) return null;
  }
  while (!isDark(grey, width, height, Math.round(x), Math.round(y))) {
    runs[3] += 1;
    x += dx;
    y += dy;
    if (runs[3] > 64) return null;
  }
  while (isDark(grey, width, height, Math.round(x), Math.round(y))) {
    runs[4] += 1;
    x += dx;
    y += dy;
    if (runs[4] > 64) return null;
  }
  const total = runs.reduce((sum, run) => sum + run, 0);
  if (total < 7) return null;
  const unit = total / 7;
  const tolerance = Math.max(1.5, unit * 0.7);
  for (const [index, expected] of [1, 1, 3, 1, 1].entries())
    if (Math.abs(runs[index] - expected * unit) > tolerance * expected)
      return null;
  return unit;
}

/** Dark-run scan across a row, collecting 1:1:3:1:1 candidates. */
function scanRow(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
  y: number,
  out: FinderCandidate[],
) {
  let run = 0;
  let dark = false;
  const runs: number[] = [];
  const runStart: number[] = [];
  const push = (start: number) => {
    runs.push(run);
    runStart.push(start);
    if (runs.length > 5) {
      runs.shift();
      runStart.shift();
    }
  };
  let start = 0;
  for (let x = 0; x < width; x += 1) {
    const value = isDark(grey, width, height, x, y);
    if (value === dark) {
      run += 1;
      continue;
    }
    push(start);
    dark = value;
    run = 1;
    start = x;
    if (runs.length === 5) {
      const total = runs.reduce((sum, item) => sum + item, 0);
      const unit = total / 7;
      if (
        unit >= 1 &&
        Math.abs(runs[0] - unit) < unit &&
        Math.abs(runs[1] - unit) < unit &&
        Math.abs(runs[2] - 3 * unit) < 3 * unit &&
        Math.abs(runs[3] - unit) < unit &&
        Math.abs(runs[4] - unit) < unit
      ) {
        const centreX = runStart[2] + runs[2] / 2;
        const unitH = axisRatio(
          grey,
          width,
          height,
          Math.round(centreX),
          y,
          1,
          0,
        );
        const unitV = axisRatio(
          grey,
          width,
          height,
          Math.round(centreX),
          y,
          0,
          1,
        );
        const unitD1 = axisRatio(
          grey,
          width,
          height,
          Math.round(centreX),
          y,
          1,
          1,
        );
        const unitD2 = axisRatio(
          grey,
          width,
          height,
          Math.round(centreX),
          y,
          1,
          -1,
        );
        if (unitH !== null && unitV !== null) {
          let score = 2;
          if (unitD1 !== null) score += 1;
          if (unitD2 !== null) score += 1;
          out.push({
            x: centreX,
            y,
            modules: (unitH + unitV) / 2,
            score,
          });
        }
      }
    }
  }
}

/**
 * Group finder patterns into square candidates and expand each to a region the
 * decoder can be pointed at. Regions include the quiet zone plus slack for
 * perspective, and are clamped to the frame.
 */
export function locateSymbolRegions(raster: Raster): LocatedRegion[] {
  const grey = toGreyscale(raster);
  const { width, height } = raster;
  const candidates: FinderCandidate[] = [];
  // Eight rows were enough for phone photos and screenshots in testing; more
  // rows cost time without finding more symbols.
  for (let y = 2; y < height - 2; y += 2)
    scanRow(grey, width, height, y, candidates);
  if (!candidates.length) return [];

  // Merge hits that describe the same pattern (a symbol's centre is reported by
  // several rows).
  const clusters: FinderCandidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    const existing = clusters.find(
      (cluster) =>
        Math.abs(cluster.x - candidate.x) < candidate.modules * 2 &&
        Math.abs(cluster.y - candidate.y) < candidate.modules * 2,
    );
    if (!existing) clusters.push(candidate);
    else if (candidate.score > existing.score) {
      existing.x = (existing.x + candidate.x) / 2;
      existing.y = (existing.y + candidate.y) / 2;
      existing.score = Math.max(existing.score, candidate.score);
      existing.modules = Math.min(existing.modules, candidate.modules);
    }
  }

  const regions: LocatedRegion[] = [];
  const seen = new Set<string>();
  for (const from of clusters) {
    for (const to of clusters) {
      if (from === to) continue;
      const size = Math.hypot(to.x - from.x, to.y - from.y);
      if (size < from.modules * 14 || size > Math.max(width, height)) continue;
      // Pad by the quiet zone (4 modules) plus 30% for perspective skew.
      const pad = size * 0.3 + from.modules * 5;
      const x = Math.max(0, Math.round(Math.min(from.x, to.x) - pad));
      const y = Math.max(0, Math.round(Math.min(from.y, to.y) - pad));
      const right = Math.min(width, Math.round(Math.max(from.x, to.x) + pad));
      const bottom = Math.min(height, Math.round(Math.max(from.y, to.y) + pad));
      const regionSize = Math.min(right - x, bottom - y);
      if (regionSize < 24) continue;
      const key = `${Math.round(x / 16)}:${Math.round(y / 16)}:${Math.round(regionSize / 16)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      regions.push({
        x,
        y,
        size: regionSize,
        score: from.score + to.score,
      });
    }
  }
  return regions.sort((a, b) => b.score - a.score).slice(0, 24);
}
