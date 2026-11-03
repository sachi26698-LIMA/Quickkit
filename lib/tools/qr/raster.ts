/**
 * Software rasterizer: scene → RGBA pixels.
 *
 * Deliberately free of `<canvas>`: the same function runs in the browser and in
 * Node tests, so "what you verified in the test suite" and "what you download"
 * are literally the same code path. Anti-aliasing comes from analytic coverage,
 * so no supersampling (and no 4× memory spike) is needed at large sizes.
 */
import type { Paint } from "./colour";
import type { QrScene, Radii, Shape } from "./scene";

export type QrBitmap = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

function paintColor(
  paint: Paint,
  x: number,
  y: number,
): [number, number, number] {
  if (paint.type === "solid") return paint.rgb;
  if (paint.type === "radial") {
    const t = clamp01(Math.hypot(x - paint.cx, y - paint.cy) / paint.r);
    return [
      paint.stops[0].rgb[0] +
        (paint.stops[1].rgb[0] - paint.stops[0].rgb[0]) * t,
      paint.stops[0].rgb[1] +
        (paint.stops[1].rgb[1] - paint.stops[0].rgb[1]) * t,
      paint.stops[0].rgb[2] +
        (paint.stops[1].rgb[2] - paint.stops[0].rgb[2]) * t,
    ];
  }
  const t = clamp01(
    ((x - paint.x0) * paint.dx + (y - paint.y0) * paint.dy) / paint.length,
  );
  return [
    paint.stops[0].rgb[0] + (paint.stops[1].rgb[0] - paint.stops[0].rgb[0]) * t,
    paint.stops[0].rgb[1] + (paint.stops[1].rgb[1] - paint.stops[0].rgb[1]) * t,
    paint.stops[0].rgb[2] + (paint.stops[1].rgb[2] - paint.stops[0].rgb[2]) * t,
  ];
}

/** Signed distance to a rounded rectangle (negative inside). */
function sdRoundRect(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: Radii,
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = px - cx;
  const dy = py - cy;
  const right = dx > 0;
  const down = dy > 0;
  const radius = Math.max(0, right ? (down ? r[2] : r[1]) : down ? r[0] : r[3]);
  const ox = Math.abs(dx) - (w / 2 - radius);
  const oy = Math.abs(dy) - (h / 2 - radius);
  const outside = Math.hypot(Math.max(ox, 0), Math.max(oy, 0));
  const inside = Math.min(Math.max(ox, oy), 0);
  return outside + inside - radius;
}

function coverageFromDistance(distance: number) {
  return clamp01(0.5 - distance);
}

function shapeBounds(
  shape: Shape,
  size: number,
): { x0: number; y0: number; x1: number; y1: number } {
  const pad = 2;
  let x0 = size;
  let y0 = size;
  let x1 = 0;
  let y1 = 0;
  switch (shape.type) {
    case "rect":
    case "roundrect":
    case "ringrect":
    case "image":
      x0 = shape.x;
      y0 = shape.y;
      x1 = shape.x + shape.w;
      y1 = shape.y + shape.h;
      break;
    case "circle":
      x0 = shape.cx - shape.r;
      y0 = shape.cy - shape.r;
      x1 = shape.cx + shape.r;
      y1 = shape.cy + shape.r;
      break;
    case "ring":
      x0 = shape.cx - shape.rOuter;
      y0 = shape.cy - shape.rOuter;
      x1 = shape.cx + shape.rOuter;
      y1 = shape.cy + shape.rOuter;
      break;
  }
  return {
    x0: Math.max(0, Math.floor(x0 - pad)),
    y0: Math.max(0, Math.floor(y0 - pad)),
    x1: Math.min(size, Math.ceil(x1 + pad)),
    y1: Math.min(size, Math.ceil(y1 + pad)),
  };
}

function shapeCoverage(shape: Shape, px: number, py: number) {
  switch (shape.type) {
    case "rect":
      return (
        clamp01(px + 0.5 - shape.x) *
        clamp01(shape.x + shape.w - (px + 0.5)) *
        clamp01(py + 0.5 - shape.y) *
        clamp01(shape.y + shape.h - (py + 0.5))
      );
    case "roundrect":
      return coverageFromDistance(
        sdRoundRect(px, py, shape.x, shape.y, shape.w, shape.h, shape.radii),
      );
    case "ringrect": {
      const outer = sdRoundRect(
        px,
        py,
        shape.x,
        shape.y,
        shape.w,
        shape.h,
        shape.radii,
      );
      const t = shape.thickness;
      const innerRadii = shape.radii.map((r) => Math.max(0, r - t)) as Radii;
      const inner = sdRoundRect(
        px,
        py,
        shape.x + t,
        shape.y + t,
        shape.w - t * 2,
        shape.h - t * 2,
        innerRadii,
      );
      return coverageFromDistance(Math.max(outer, -inner));
    }
    case "circle":
      return coverageFromDistance(
        Math.hypot(px - shape.cx, py - shape.cy) - shape.r,
      );
    case "ring": {
      const distance = Math.hypot(px - shape.cx, py - shape.cy);
      return coverageFromDistance(
        Math.max(distance - shape.rOuter, shape.rInner - distance),
      );
    }
    case "image":
      return 1;
  }
}

/** Bilinear sample of the uploaded logo, pre-multiplied by its alpha. */
function sampleImage(
  src: { width: number; height: number; rgba: Uint8ClampedArray },
  u: number,
  v: number,
): [number, number, number, number] {
  const fx = u * (src.width - 1);
  const fy = v * (src.height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(src.width - 1, x0 + 1);
  const y1 = Math.min(src.height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const rgba = src.rgba;
  const at = (x: number, y: number) => (y * src.width + x) * 4;
  const i00 = at(x0, y0);
  const i10 = at(x1, y0);
  const i01 = at(x0, y1);
  const i11 = at(x1, y1);
  const top = (channel: number) =>
    rgba[i00 + channel] * (1 - tx) + rgba[i10 + channel] * tx;
  const bottom = (channel: number) =>
    rgba[i01 + channel] * (1 - tx) + rgba[i11 + channel] * tx;
  const mix = (channel: number) =>
    top(channel) * (1 - ty) + bottom(channel) * ty;
  return [mix(0), mix(1), mix(2), mix(3) / 255];
}

function fillBackground(target: Uint8ClampedArray, shape: Shape, size: number) {
  if (shape.type !== "rect") return;
  const { paint } = shape;
  if (paint.type === "solid") {
    const [r, g, b] = paint.rgb;
    for (let index = 0; index < size * size; index += 1) {
      const offset = index * 4;
      target[offset] = r;
      target[offset + 1] = g;
      target[offset + 2] = b;
      target[offset + 3] = 255;
    }
    return;
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = paintColor(paint, x + 0.5, y + 0.5);
      const offset = (y * size + x) * 4;
      target[offset] = r;
      target[offset + 1] = g;
      target[offset + 2] = b;
      target[offset + 3] = 255;
    }
  }
}

export function rasterizeScene(scene: QrScene): QrBitmap {
  const size = Math.max(1, Math.round(scene.size));
  const rgba = new Uint8ClampedArray(size * size * 4);
  if (scene.background) fillBackground(rgba, scene.background, size);

  for (const shape of scene.shapes) {
    const bounds = shapeBounds(shape, size);
    if (bounds.x1 <= bounds.x0 || bounds.y1 <= bounds.y0) continue;
    const paint = "paint" in shape ? shape.paint : null;
    for (let y = bounds.y0; y < bounds.y1; y += 1) {
      const rowOffset = y * size * 4;
      for (let x = bounds.x0; x < bounds.x1; x += 1) {
        const px = x + 0.5;
        const py = y + 0.5;
        if (shape.type === "image") {
          const u = (px - shape.x) / shape.w;
          const v = (py - shape.y) / shape.h;
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          const inside = shape.radii[0]
            ? coverageFromDistance(
                sdRoundRect(
                  px,
                  py,
                  shape.x,
                  shape.y,
                  shape.w,
                  shape.h,
                  shape.radii,
                ),
              )
            : 1;
          if (inside <= 0) continue;
          const [r, g, b, a] = sampleImage(shape.src, u, v);
          if (a <= 0) continue;
          const alpha = a * inside;
          const offset = rowOffset + x * 4;
          const destinationAlpha = rgba[offset + 3] / 255;
          const outAlpha = alpha + destinationAlpha * (1 - alpha);
          if (outAlpha <= 0) continue;
          rgba[offset] =
            (r * alpha + rgba[offset] * destinationAlpha * (1 - alpha)) /
            outAlpha;
          rgba[offset + 1] =
            (g * alpha + rgba[offset + 1] * destinationAlpha * (1 - alpha)) /
            outAlpha;
          rgba[offset + 2] =
            (b * alpha + rgba[offset + 2] * destinationAlpha * (1 - alpha)) /
            outAlpha;
          rgba[offset + 3] = outAlpha * 255;
          continue;
        }
        if (!paint) continue;
        const coverage = shapeCoverage(shape, px, py);
        if (coverage <= 0) continue;
        const [r, g, b] = paintColor(paint, px, py);
        const offset = rowOffset + x * 4;
        const destinationAlpha = rgba[offset + 3] / 255;
        const outAlpha = coverage + destinationAlpha * (1 - coverage);
        if (outAlpha <= 0) continue;
        rgba[offset] =
          (r * coverage + rgba[offset] * destinationAlpha * (1 - coverage)) /
          outAlpha;
        rgba[offset + 1] =
          (g * coverage +
            rgba[offset + 1] * destinationAlpha * (1 - coverage)) /
          outAlpha;
        rgba[offset + 2] =
          (b * coverage +
            rgba[offset + 2] * destinationAlpha * (1 - coverage)) /
          outAlpha;
        rgba[offset + 3] = outAlpha * 255;
      }
    }
  }
  return { width: size, height: size, rgba };
}

/** Downscale an RGBA bitmap for the cheap live preview (box filter). */
export function scaleBitmap(bitmap: QrBitmap, target: number): QrBitmap {
  if (target >= bitmap.width) return bitmap;
  const factor = Math.floor(bitmap.width / target);
  const size = Math.floor(bitmap.width / factor);
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < factor; dy += 1)
        for (let dx = 0; dx < factor; dx += 1) {
          const offset =
            ((y * factor + dy) * bitmap.width + x * factor + dx) * 4;
          const alpha = bitmap.rgba[offset + 3] / 255;
          r += bitmap.rgba[offset] * alpha;
          g += bitmap.rgba[offset + 1] * alpha;
          b += bitmap.rgba[offset + 2] * alpha;
          a += alpha;
        }
      const offset = (y * size + x) * 4;
      const meanAlpha = a / (factor * factor);
      if (meanAlpha <= 0) continue;
      rgba[offset] = r / a;
      rgba[offset + 1] = g / a;
      rgba[offset + 2] = b / a;
      rgba[offset + 3] = meanAlpha * 255;
    }
  return { width: size, height: size, rgba };
}
