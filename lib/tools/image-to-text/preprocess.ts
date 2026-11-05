/**
 * Image preparation for OCR: rotation, cropping, grayscale, contrast,
 * brightness, binarisation, median denoise, deskew estimation and scaling.
 *
 * Everything here operates on `ImageData`-shaped pixels (no DOM APIs beyond
 * the canvas the caller passes in), so it runs inside a worker or a plain
 * test alike. Nothing is uploaded and nothing is stored.
 */

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Clamp a normalised crop rect into the unit square; too-small rects fail. */
export function normalizeCrop(crop: CropRect | undefined): CropRect | null {
  if (!crop) return null;
  // Size first, then position, so a minimum-size crop never runs off the page.
  const width = Math.min(1, Math.max(0.02, crop.width));
  const height = Math.min(1, Math.max(0.02, crop.height));
  const round = (value: number) => Math.round(value * 10_000) / 10_000;
  const x = round(Math.min(1 - width, Math.max(0, crop.x)));
  const y = round(Math.min(1 - height, Math.max(0, crop.y)));
  return { x, y, width: round(width), height: round(height) };
}

/** Pixel crop of an ImageData-like buffer. Returns the source when whole. */
export function cropPixels(
  source: PixelBuffer,
  crop: CropRect | undefined,
): PixelBuffer {
  const normalised = normalizeCrop(crop);
  if (!normalised) return source;
  const x = Math.max(0, Math.round(normalised.x * source.width));
  const y = Math.max(0, Math.round(normalised.y * source.height));
  const width = Math.min(
    source.width - x,
    Math.max(1, Math.round(normalised.width * source.width)),
  );
  const height = Math.min(
    source.height - y,
    Math.max(1, Math.round(normalised.height * source.height)),
  );
  if (width === source.width && height === source.height) return source;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const from = ((y + row) * source.width + x) * 4;
    out.set(source.data.subarray(from, from + width * 4), row * width * 4);
  }
  return { data: out, width, height };
}

/** Rotate by 90° steps (0/90/180/270). Arbitrary angles use `rotateArbitrary`. */
export function rotateQuarterTurns(
  source: PixelBuffer,
  degrees: number,
): PixelBuffer {
  const turns = ((Math.round(degrees / 90) % 4) + 4) % 4;
  if (turns === 0) return source;
  if (turns === 2) {
    const out = new Uint8ClampedArray(source.data.length);
    const pixels = source.width * source.height;
    for (let index = 0; index < pixels; index += 1) {
      const from = index * 4;
      const to = (pixels - 1 - index) * 4;
      out[to] = source.data[from];
      out[to + 1] = source.data[from + 1];
      out[to + 2] = source.data[from + 2];
      out[to + 3] = source.data[from + 3];
    }
    return { data: out, width: source.width, height: source.height };
  }
  const width = source.height;
  const height = source.width;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const from = (y * source.width + x) * 4;
      const targetX = turns === 1 ? source.height - 1 - y : y;
      const targetY = turns === 1 ? x : source.width - 1 - x;
      const to = (targetY * width + targetX) * 4;
      out[to] = source.data[from];
      out[to + 1] = source.data[from + 1];
      out[to + 2] = source.data[from + 2];
      out[to + 3] = source.data[from + 3];
    }
  }
  return { data: out, width, height };
}

/**
 * Rotate by an arbitrary angle using nearest-neighbour sampling and a white
 * background. Used for fine deskew only (angles are small).
 */
export function rotateArbitrary(
  source: PixelBuffer,
  degrees: number,
): PixelBuffer {
  const angle = ((-degrees % 360) + 360) % 360;
  if (!angle) return source;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const width = source.width;
  const height = source.height;
  const outWidth = Math.ceil(Math.abs(width * cos) + Math.abs(height * sin));
  const outHeight = Math.ceil(Math.abs(width * sin) + Math.abs(height * cos));
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  // White background: OCR engines handle paper-white better than transparent.
  for (let index = 0; index < out.length; index += 4) {
    out[index] = 255;
    out[index + 1] = 255;
    out[index + 2] = 255;
    out[index + 3] = 255;
  }
  const cx = width / 2;
  const cy = height / 2;
  const ocx = outWidth / 2;
  const ocy = outHeight / 2;
  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      const dx = x - ocx;
      const dy = y - ocy;
      const sx = Math.round(cos * dx + sin * dy + cx);
      const sy = Math.round(-sin * dx + cos * dy + cy);
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      const from = (sy * width + sx) * 4;
      const to = (y * outWidth + x) * 4;
      out[to] = source.data[from];
      out[to + 1] = source.data[from + 1];
      out[to + 2] = source.data[from + 2];
      out[to + 3] = 255;
    }
  }
  return { data: out, width: outWidth, height: outHeight };
}

export interface ToneSettings {
  grayscale: boolean;
  /** 1 = unchanged, 0.5..2. */
  contrast: number;
  /** 1 = unchanged, 0.5..1.5. */
  brightness: number;
  binarize: boolean;
}

/** Grayscale + contrast/brightness + optional binarisation (Otsu). */
export function applyTone(
  source: PixelBuffer,
  settings: ToneSettings,
): PixelBuffer {
  const needsWork =
    settings.grayscale ||
    settings.binarize ||
    settings.contrast !== 1 ||
    settings.brightness !== 1;
  if (!needsWork) return source;
  const out = new Uint8ClampedArray(source.data);
  const pixels = out.length / 4;
  let threshold = -1;
  if (settings.binarize) {
    const luma = new Uint8Array(pixels);
    for (let index = 0; index < pixels; index += 1) {
      const offset = index * 4;
      luma[index] = Math.round(
        0.299 * out[offset] + 0.587 * out[offset + 1] + 0.114 * out[offset + 2],
      );
    }
    threshold = otsuThreshold(luma);
    for (let index = 0; index < pixels; index += 1) {
      const offset = index * 4;
      const value = luma[index] > threshold ? 255 : 0;
      out[offset] = value;
      out[offset + 1] = value;
      out[offset + 2] = value;
      out[offset + 3] = 255;
    }
    return { data: out, width: source.width, height: source.height };
  }
  for (let index = 0; index < pixels; index += 1) {
    const offset = index * 4;
    if (settings.grayscale) {
      const luma = Math.round(
        0.299 * out[offset] + 0.587 * out[offset + 1] + 0.114 * out[offset + 2],
      );
      const value = applyContrastBrightness(
        luma,
        settings.contrast,
        settings.brightness,
      );
      out[offset] = value;
      out[offset + 1] = value;
      out[offset + 2] = value;
    } else {
      out[offset] = applyContrastBrightness(
        out[offset],
        settings.contrast,
        settings.brightness,
      );
      out[offset + 1] = applyContrastBrightness(
        out[offset + 1],
        settings.contrast,
        settings.brightness,
      );
      out[offset + 2] = applyContrastBrightness(
        out[offset + 2],
        settings.contrast,
        settings.brightness,
      );
    }
    out[offset + 3] = 255;
  }
  return { data: out, width: source.width, height: source.height };
}

function applyContrastBrightness(
  value: number,
  contrast: number,
  brightness: number,
) {
  const lifted = value * brightness;
  // Contrast pivots around mid-grey.
  return Math.min(
    255,
    Math.max(0, Math.round((lifted - 128) * contrast + 128)),
  );
}

/** Otsu's method: the threshold that maximises between-class variance. */
export function otsuThreshold(luma: Uint8Array): number {
  const histogram = new Array<number>(256).fill(0);
  for (let index = 0; index < luma.length; index += 1)
    histogram[luma[index]] += 1;
  const total = luma.length;
  if (!total) return 128;
  let sum = 0;
  for (let value = 0; value < 256; value += 1) sum += value * histogram[value];
  let sumBackground = 0;
  let weightBackground = 0;
  let best = 0;
  let bestVariance = -1;
  for (let value = 0; value < 256; value += 1) {
    weightBackground += histogram[value];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += value * histogram[value];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) *
      (meanBackground - meanForeground);
    if (variance > bestVariance) {
      bestVariance = variance;
      best = value;
    }
  }
  return best;
}

/** 3×3 median filter: removes salt-and-pepper noise without blurring glyph edges. */
export function medianDenoise(source: PixelBuffer): PixelBuffer {
  const { width, height } = source;
  if (width < 3 || height < 3) return source;
  const out = new Uint8ClampedArray(source.data);
  const window: number[] = new Array(9);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            window[count] =
              source.data[((y + dy) * width + (x + dx)) * 4 + channel];
            count += 1;
          }
        }
        window.sort((a, b) => a - b);
        out[offset + channel] = window[4];
      }
      out[offset + 3] = source.data[offset + 3];
    }
  }
  return { data: out, width, height };
}

/**
 * Estimate skew with a projection-profile search: for a range of angles,
 * rotate the luma and score how sharply ink concentrates into rows.
 * Returns degrees to rotate *back* (positive = counter-clockwise correction).
 */
export function estimateSkew(
  source: PixelBuffer,
  maxAngle = 6,
  step = 0.5,
): number {
  // Downsample with a single, isotropic factor: a stretched sample would
  // change the apparent angle and make every estimate wrong.
  const factor = Math.min(1, 400 / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * factor));
  const height = Math.max(1, Math.round(source.height * factor));
  if (width < 20 || height < 20) return 0;
  const scaleX = source.width / width;
  const scaleY = source.height / height;
  const ink = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(source.width - 1, Math.floor(x * scaleX));
      const sy = Math.min(source.height - 1, Math.floor(y * scaleY));
      const offset = (sy * source.width + sx) * 4;
      ink[y * width + x] = 255 - source.data[offset];
    }
  }
  const profileLength = height * 2;
  const profile = new Float32Array(profileLength);
  /**
   * Rotate the ink map by `degrees` and score how concentrated it becomes in
   * horizontal bands. Text lines form sharp peaks; a wrongly rotated page
   * smears across many rows.
   */
  const scoreAt = (degrees: number) => {
    profile.fill(0);
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const cx = width / 2;
    const cy = height / 2;
    let total = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = ink[y * width + x];
        if (value <= 24) continue;
        const ty = Math.round(-sin * (x - cx) + cos * (y - cy) + height / 2);
        if (ty < 0 || ty >= profileLength) continue;
        profile[ty] += value;
        total += value;
      }
    }
    if (!total) return 0;
    let sum = 0;
    let sumSquares = 0;
    for (let index = 0; index < profileLength; index += 1) {
      const value = profile[index];
      sum += value;
      sumSquares += value * value;
    }
    const mean = sum / profileLength;
    const variance = sumSquares / profileLength - mean * mean;
    // Normalise by ink mass so a rotation that clips ink cannot win.
    return variance / (total * total);
  };
  let bestAngle = 0;
  let bestScore = -1;
  for (let angle = -maxAngle; angle <= maxAngle + 0.001; angle += step) {
    const score = scoreAt(angle);
    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }
  // Refine around the best coarse angle for sub-degree accuracy.
  let refined = bestAngle;
  let refinedScore = bestScore;
  for (
    let angle = bestAngle - step;
    angle <= bestAngle + step + 0.001;
    angle += step / 4
  ) {
    const score = scoreAt(angle);
    if (score > refinedScore) {
      refinedScore = score;
      refined = angle;
    }
  }
  // Ignore corrections under a third of a degree: rotating for that little
  // costs time and can introduce resampling noise.
  return Math.abs(refined) < 0.34 ? 0 : Math.round(refined * 4) / 4;
}

export interface OcrScalePlan {
  scale: number;
  width: number;
  height: number;
  reason: string | null;
}

/**
 * Decide the size fed to the engine. Printed text needs roughly 30px glyph
 * height, so tiny crops are upscaled and huge scans are downscaled, with the
 * user's maximum side respected.
 */
export function planOcrScale(
  width: number,
  height: number,
  maxSide: number,
  supersample = false,
): OcrScalePlan {
  const longest = Math.max(width, height);
  if (!longest) return { scale: 1, width: 1, height: 1, reason: null };
  if (supersample && longest < 2400) {
    const scale = Math.min(2, 2400 / longest);
    return {
      scale,
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      reason: "Upscaled for finer detail",
    };
  }
  if (longest < 900) {
    const scale = Math.min(2, 900 / longest);
    return {
      scale,
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      reason: "Enlarged small image for better recognition",
    };
  }
  if (longest > maxSide) {
    const scale = maxSide / longest;
    return {
      scale,
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      reason: `Downscaled to ${Math.round(maxSide)}px for memory and speed`,
    };
  }
  return { scale: 1, width, height, reason: null };
}

/** Bilinear resample backed by the page's canvas (kept here for testability). */
export function resamplePixels(
  source: PixelBuffer,
  width: number,
  height: number,
): PixelBuffer {
  if (width === source.width && height === source.height) return source;
  const out = new Uint8ClampedArray(width * height * 4);
  const scaleX = source.width / width;
  const scaleY = source.height / height;
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(source.height - 1, (y + 0.5) * scaleY - 0.5);
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(source.height - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(source.width - 1, (x + 0.5) * scaleX - 0.5);
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(source.width - 1, x0 + 1);
      const wx = sx - x0;
      const to = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const p00 = source.data[(y0 * source.width + x0) * 4 + channel];
        const p10 = source.data[(y0 * source.width + x1) * 4 + channel];
        const p01 = source.data[(y1 * source.width + x0) * 4 + channel];
        const p11 = source.data[(y1 * source.width + x1) * 4 + channel];
        const top = p00 + (p10 - p00) * wx;
        const bottom = p01 + (p11 - p01) * wx;
        out[to + channel] = Math.round(top + (bottom - top) * wy);
      }
    }
  }
  return { data: out, width, height };
}

/** Fraction of pixels that are dark, used to warn about blank pages. */
export function inkRatio(source: PixelBuffer, sampleStep = 4): number {
  let dark = 0;
  let total = 0;
  const step = Math.max(1, Math.floor(sampleStep));
  for (let y = 0; y < source.height; y += step) {
    for (let x = 0; x < source.width; x += step) {
      const offset = (y * source.width + x) * 4;
      const luma =
        0.299 * source.data[offset] +
        0.587 * source.data[offset + 1] +
        0.114 * source.data[offset + 2];
      if (luma < 140) dark += 1;
      total += 1;
    }
  }
  return total ? dark / total : 0;
}
