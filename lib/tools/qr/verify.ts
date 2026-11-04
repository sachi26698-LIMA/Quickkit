/**
 * Independent decode verification.
 *
 * `jsQR` — a real, pure-JS QR reader, the same family of algorithm a phone
 * camera app uses — reads the rendered pixels back. A design is only reported
 * as good when the decoded payload is *exactly* the string that went in, so
 * styling can never silently produce a broken code.
 *
 * Like every practical scanner, the decoder is handed a resampled frame: camera
 * pipelines never hand a decoder a 2,048 px image with 40 px modules either, and
 * jsQR's local-threshold binarizer loses lock when modules dwarf its 8 px
 * analysis blocks. Every frame we try is recorded in `attempts`, so the verdict
 * can be audited rather than trusted.
 */
import jsQR from "jsqr";
import type { QrBitmap } from "./raster";

export type QrVerification = {
  ok: boolean;
  /** What the decoder read back, when it read anything. */
  decoded: string | null;
  expected: string;
  message: string;
  /** Pixels per module in the frame that was decoded. */
  modulePx: number;
  attempts: string[];
  /** Width of the frame that worked, in pixels. */
  frameWidth: number;
};

/** Composite onto a solid field: luminance decoders ignore the alpha channel. */
export function flattenBitmap(
  bitmap: QrBitmap,
  rgb: [number, number, number] = [255, 255, 255],
): QrBitmap {
  const { width, height, rgba } = bitmap;
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

/** Greyscale box resample to an exact width — integer or fractional. */
export function resampleToWidth(bitmap: QrBitmap, width: number): QrBitmap {
  const source = bitmap.width;
  const target = Math.max(8, Math.min(source, Math.round(width)));
  if (target === source) {
    const rgba = new Uint8ClampedArray(source * bitmap.height * 4);
    for (let index = 0; index < source * bitmap.height; index += 1) {
      const offset = index * 4;
      const alpha = bitmap.rgba[offset + 3] / 255;
      const value =
        (bitmap.rgba[offset] * 0.299 +
          bitmap.rgba[offset + 1] * 0.587 +
          bitmap.rgba[offset + 2] * 0.114) *
          alpha +
        255 * (1 - alpha);
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
    return { width: source, height: bitmap.height, rgba };
  }
  const height = Math.round((bitmap.height * target) / source);
  const rgba = new Uint8ClampedArray(target * height * 4);
  const strideX = source / target;
  const strideY = bitmap.height / height;
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y * strideY);
    const y1 = Math.max(y0 + 1, Math.ceil((y + 1) * strideY));
    for (let x = 0; x < target; x += 1) {
      const x0 = Math.floor(x * strideX);
      const x1 = Math.max(x0 + 1, Math.ceil((x + 1) * strideX));
      let sum = 0;
      let count = 0;
      for (let sy = y0; sy < y1 && sy < bitmap.height; sy += 1)
        for (let sx = x0; sx < x1 && sx < source; sx += 1) {
          const offset = (sy * source + sx) * 4;
          const alpha = bitmap.rgba[offset + 3] / 255;
          sum +=
            (bitmap.rgba[offset] * 0.299 +
              bitmap.rgba[offset + 1] * 0.587 +
              bitmap.rgba[offset + 2] * 0.114) *
              alpha +
            255 * (1 - alpha);
          count += 1;
        }
      const value = Math.round(sum / Math.max(1, count));
      const offset = (y * target + x) * 4;
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
  }
  return { width: target, height, rgba };
}

/**
 * Frame widths to try, derived from the module count so the decoder is handed
 * ~3–11 px per module. `0` means "as authored".
 */
export function widthLadder(
  sourceWidth: number,
  totalModules: number,
): number[] {
  const modulePx = sourceWidth / Math.max(1, totalModules);
  const widths = new Set<number>([0]);
  for (const target of [11, 8, 6, 4.5, 3.2, 2.4]) {
    if (modulePx <= target) continue;
    const width = Math.round(totalModules * target);
    if (width >= 96 && width < sourceWidth) widths.add(width);
  }
  const sorted = [...widths].sort((a, b) => b - a);
  const deduped: number[] = [];
  for (const width of sorted) {
    if (width === 0) {
      deduped.push(width);
      continue;
    }
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous - width) / previous < 0.18) continue;
    deduped.push(width);
  }
  return deduped.slice(0, 6);
}

/** Midpoint split; refuses to invent contrast that is not there. */
function threshold(rgba: Uint8ClampedArray) {
  let min = 255;
  let max = 0;
  for (let index = 0; index < rgba.length; index += 4) {
    const value = rgba[index];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (max - min < 60) return null; // no real separation — do not fake one
  const cut = (min + max) / 2;
  const out = new Uint8ClampedArray(rgba.length);
  for (let index = 0; index < rgba.length; index += 4) {
    const value = rgba[index] < cut ? 0 : 255;
    out[index] = value;
    out[index + 1] = value;
    out[index + 2] = value;
    out[index + 3] = 255;
  }
  return out;
}

export function verifyBitmap(
  bitmap: QrBitmap,
  expected: string,
  options: {
    /** Modules across the whole image, quiet zone included. */
    totalModules?: number;
    /** Legacy: symbol modules; a 4-module quiet zone is assumed each side. */
    modules?: number;
    background?: [number, number, number];
  } = {},
): QrVerification {
  const opaque = flattenBitmap(bitmap, options.background ?? [255, 255, 255]);
  const totalModules =
    options.totalModules ?? (options.modules ? options.modules + 8 : 0);
  const ladder = totalModules
    ? widthLadder(opaque.width, totalModules)
    : [0, Math.round(opaque.width / 2), Math.round(opaque.width / 4)];
  const attempts: string[] = [];
  let bestModulePx = opaque.width / Math.max(1, totalModules || 1);

  for (const width of ladder) {
    const frame =
      width === 0
        ? resampleToWidth(opaque, opaque.width)
        : resampleToWidth(opaque, width);
    const label = width === 0 ? "as rendered" : `${frame.width}px`;
    const frames: [string, Uint8ClampedArray][] = [["", frame.rgba]];
    const hard = threshold(frame.rgba);
    if (hard) frames.push([" hard", hard]);
    for (const [suffix, data] of frames) {
      const result = jsQR(data, frame.width, frame.height, {
        inversionAttempts: "attemptBoth",
      });
      if (result?.data === expected) {
        const modulePx = totalModules
          ? frame.width / totalModules
          : frame.width;
        return {
          ok: true,
          decoded: result.data,
          expected,
          modulePx,
          frameWidth: frame.width,
          attempts: [...attempts, `${label}${suffix}: matched`],
          message: `Verified — a QR reader decoded ${expected.length.toLocaleString()} characters from the rendered ${frame.width}×${frame.height}px frame (${label}${suffix}).`,
        };
      }
      if (result?.data) {
        return {
          ok: false,
          decoded: result.data,
          expected,
          modulePx: totalModules ? frame.width / totalModules : frame.width,
          frameWidth: frame.width,
          attempts: [...attempts, `${label}${suffix}: different content`],
          message:
            "A reader locked on but decoded something different, so the styling corrupted the symbol. Export stays blocked.",
        };
      }
      attempts.push(`${label}${suffix}: no lock`);
    }
    bestModulePx = totalModules ? frame.width / totalModules : bestModulePx;
  }

  return {
    ok: false,
    decoded: null,
    expected,
    modulePx: bestModulePx,
    frameWidth: opaque.width,
    attempts,
    message:
      "No QR code was found in the rendered pixels — the colours, styling or size are hiding it. Export is blocked until this check passes.",
  };
}
