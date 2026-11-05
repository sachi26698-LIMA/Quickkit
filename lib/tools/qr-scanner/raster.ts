/**
 * Raster helpers for the scanner: orientation, crop, greyscale, contrast,
 * sharpening, binarisation and rotation.
 *
 * Pure functions on RGBA bytes — no canvas, no DOM — so the exact same code
 * runs in the decoder worker, on the main thread when a Worker is unavailable,
 * and under Vitest in Node. That is what makes the unit tests meaningful: they
 * exercise the code that actually ships, not a stand-in.
 */
import type { CropRect, ImageRotation, Raster } from "./types";

export function createRaster(width: number, height: number): Raster {
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    rgba: new Uint8ClampedArray(Math.max(1, Math.round(width * height)) * 4),
  };
}

export function cloneRaster(raster: Raster): Raster {
  return {
    width: raster.width,
    height: raster.height,
    rgba: new Uint8ClampedArray(raster.rgba),
  };
}

/** Composite onto an opaque field. Luminance decoders ignore alpha entirely. */
export function flatten(
  raster: Raster,
  rgb: [number, number, number] = [255, 255, 255],
): Raster {
  const { width, height, rgba } = raster;
  const out = new Uint8ClampedArray(rgba.length);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const alpha = rgba[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel += 1)
      out[offset + channel] =
        rgba[offset + channel] * alpha + rgb[channel] * (1 - alpha);
    out[offset + 3] = 255;
  }
  return { width, height, rgba: out };
}

/**
 * Crop by fractional rectangle. Values outside 0–1 are clamped, and a
 * degenerate rectangle falls back to the whole image rather than producing a
 * zero-pixel raster the decoder would choke on.
 */
export function cropRaster(raster: Raster, crop: CropRect | null): Raster {
  if (!crop) return raster;
  const x0 = Math.round(Math.min(1, Math.max(0, crop.x)) * raster.width);
  const y0 = Math.round(Math.min(1, Math.max(0, crop.y)) * raster.height);
  const x1 = Math.round(
    Math.min(1, Math.max(0, crop.x + crop.width)) * raster.width,
  );
  const y1 = Math.round(
    Math.min(1, Math.max(0, crop.y + crop.height)) * raster.height,
  );
  const width = Math.max(0, x1 - x0);
  const height = Math.max(0, y1 - y0);
  if (width < 8 || height < 8) return raster;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const source = ((y + y0) * raster.width + x0) * 4;
    out.set(raster.rgba.subarray(source, source + width * 4), y * width * 4);
  }
  return { width, height, rgba: out };
}

/** Rotate by a right angle. Returned raster is always freshly allocated. */
export function rotateRaster(raster: Raster, rotation: ImageRotation): Raster {
  if (rotation === 0) return raster;
  const { width, height, rgba } = raster;
  const swap = rotation === 90 || rotation === 270;
  const outWidth = swap ? height : width;
  const outHeight = swap ? width : height;
  const out = new Uint8ClampedArray(rgba.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      let dx: number;
      let dy: number;
      if (rotation === 90) {
        dx = height - 1 - y;
        dy = x;
      } else if (rotation === 180) {
        dx = width - 1 - x;
        dy = height - 1 - y;
      } else {
        dx = y;
        dy = width - 1 - x;
      }
      const target = (dy * outWidth + dx) * 4;
      out[target] = rgba[source];
      out[target + 1] = rgba[source + 1];
      out[target + 2] = rgba[source + 2];
      out[target + 3] = rgba[source + 3];
    }
  }
  return { width: outWidth, height: outHeight, rgba: out };
}

/** ITU-R BT.601 luma, pushed into a plain byte array (one byte per pixel). */
export function toGreyscale(raster: Raster): Uint8ClampedArray {
  const { width, height, rgba } = raster;
  const out = new Uint8ClampedArray(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const alpha = rgba[offset + 3] / 255;
    out[index] =
      (rgba[offset] * 0.299 +
        rgba[offset + 1] * 0.587 +
        rgba[offset + 2] * 0.114) *
        alpha +
      255 * (1 - alpha);
  }
  return out;
}

/** Greyscale bytes back into an RGBA raster the decoder accepts. */
export function greyToRaster(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
): Raster {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const value = grey[index];
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  return { width, height, rgba };
}

/** Contrast around mid-grey. `amount` 1 is a no-op, 0 flattens, 2 is steep. */
export function applyContrast(
  grey: Uint8ClampedArray,
  amount: number,
): Uint8ClampedArray {
  if (!Number.isFinite(amount) || Math.abs(amount - 1) < 0.01) return grey;
  const clamped = Math.min(3, Math.max(0, amount));
  const out = new Uint8ClampedArray(grey.length);
  for (let index = 0; index < grey.length; index += 1)
    out[index] = (grey[index] - 128) * clamped + 128;
  return out;
}

/**
 * 3×3 unsharp mask. Strengthening is capped and skipped at the edges where a
 * neighbourhood is incomplete, so a thin quiet zone is never eaten.
 */
export function sharpen(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
): Uint8ClampedArray {
  const strength = Math.min(2, Math.max(0, amount));
  if (strength < 0.05 || width < 3 || height < 3) return grey;
  const out = new Uint8ClampedArray(grey.length);
  out.set(grey);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const centre = grey[index];
      const blur =
        (grey[index - width - 1] +
          grey[index - width] +
          grey[index - width + 1] +
          grey[index - 1] +
          centre +
          grey[index + 1] +
          grey[index + width - 1] +
          grey[index + width] +
          grey[index + width + 1]) /
        9;
      out[index] = centre + (centre - blur) * strength;
    }
  }
  return out;
}

/**
 * Otsu's method: the threshold that maximises between-class variance. Returns
 * `null` when the histogram has no usable separation, so callers can skip the
 * pass instead of inventing contrast that is not in the pixels.
 */
export function otsuThreshold(grey: Uint8ClampedArray): number | null {
  const histogram = new Array<number>(256).fill(0);
  for (let index = 0; index < grey.length; index += 1)
    histogram[grey[index]] += 1;
  const total = grey.length;
  if (!total) return null;
  let sum = 0;
  for (let value = 0; value < 256; value += 1) sum += value * histogram[value];
  let sumBackground = 0;
  let weightBackground = 0;
  let best = 0;
  let bestVariance = -1;
  for (let value = 0; value < 256; value += 1) {
    weightBackground += histogram[value];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;
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
  // `best` is the last level belonging to the background class; +1 makes it a
  // usable cut point for a `value < threshold` comparison.
  return bestVariance <= 0 ? null : Math.min(255, best + 1);
}

/** Hard threshold to 0/255. Used only when a pass deliberately wants it. */
export function binarize(
  grey: Uint8ClampedArray,
  threshold: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(grey.length);
  for (let index = 0; index < grey.length; index += 1)
    out[index] = grey[index] < threshold ? 0 : 255;
  return out;
}

/** Invert luminance while keeping the image legible (inverted QR symbols). */
export function invertGrey(grey: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(grey.length);
  for (let index = 0; index < grey.length; index += 1)
    out[index] = 255 - grey[index];
  return out;
}

/**
 * Box resample to an exact width, preserving aspect ratio. Integer AND
 * fractional factors are supported; the latter matters because a 4032 px phone
 * photo rarely divides evenly into a decode-friendly frame.
 */
export function resample(raster: Raster, targetWidth: number): Raster {
  const source = raster.width;
  const target = Math.max(8, Math.round(targetWidth));
  if (target === source) return raster;
  const height = Math.max(1, Math.round((raster.height * target) / source));
  const out = new Uint8ClampedArray(target * height * 4);
  const strideX = source / target;
  const strideY = raster.height / height;
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y * strideY);
    const y1 = Math.min(
      raster.height,
      Math.max(y0 + 1, Math.ceil((y + 1) * strideY)),
    );
    for (let x = 0; x < target; x += 1) {
      const x0 = Math.floor(x * strideX);
      const x1 = Math.min(
        source,
        Math.max(x0 + 1, Math.ceil((x + 1) * strideX)),
      );
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy += 1)
        for (let sx = x0; sx < x1; sx += 1) {
          const offset = (sy * source + sx) * 4;
          r += raster.rgba[offset];
          g += raster.rgba[offset + 1];
          b += raster.rgba[offset + 2];
          a += raster.rgba[offset + 3];
          count += 1;
        }
      const offset = (y * target + x) * 4;
      out[offset] = r / Math.max(1, count);
      out[offset + 1] = g / Math.max(1, count);
      out[offset + 2] = b / Math.max(1, count);
      out[offset + 3] = a / Math.max(1, count);
    }
  }
  return { width: target, height, rgba: out };
}

/**
 * Scale up small images so a dense symbol reaches a decodable module size.
 * Capped by `maxSide` so a 200×200 upload cannot explode into a 4,000 px frame.
 */
export function upscale(
  raster: Raster,
  factor: number,
  maxSide = 2400,
): Raster {
  const wanted = Math.min(
    maxSide,
    Math.max(raster.width, raster.height) * factor,
  );
  if (wanted <= Math.max(raster.width, raster.height)) return raster;
  const width = Math.round(
    (raster.width * wanted) / Math.max(raster.width, raster.height),
  );
  return resample(raster, width);
}

/**
 * Quarter-turned variants of a raster, for the 90°/180°/270° retry passes.
 * Browsers normally apply EXIF orientation themselves, but files that carry
 * the flag *and* a sideways frame (or screenshots of rotated photos) still
 * exist, so the retry ladder covers them honestly rather than guessing.
 */
export function rotatedVariants(
  raster: Raster,
  rotations: ImageRotation[] = [90, 180, 270],
): { rotation: ImageRotation; raster: Raster }[] {
  return rotations.map((rotation) => ({
    rotation,
    raster: rotateRaster(raster, rotation),
  }));
}
