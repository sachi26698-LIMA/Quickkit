/**
 * A dependency-free rasteriser for the bar field.
 *
 * PNG export in the studio goes through the browser canvas so human-readable
 * text uses a real font. This module exists for the cases where canvas must not
 * be involved: the decoder round-trip tests, the worker-side "did it really
 * scan?" check, and any environment without a 2D context. It draws exactly the
 * rectangles the layout produced, which is what makes the check meaningful.
 */
import type { BarcodeLayout } from "./layout";

export type Raster = { width: number; height: number; rgba: Uint8ClampedArray };

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

/**
 * Rasterise the layout at `scale` device pixels per layout pixel.
 * A transparent label is rasterised onto white: a barcode needs a light field
 * to scan, and a transparent PNG opened in a dark viewer would otherwise
 * decode as an inverted symbol.
 */
export function rasterizeLayout(
  layout: BarcodeLayout,
  options: { scale?: number } = {},
): Raster {
  const scale = Math.max(0.5, Math.min(6, options.scale ?? 1));
  const width = Math.max(1, Math.round(layout.width * scale));
  const height = Math.max(1, Math.round(layout.height * scale));
  const rgba = new Uint8ClampedArray(width * height * 4);
  const [br, bg, bb] = parseHex(layout.background ?? "#ffffff");
  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = br;
    rgba[index + 1] = bg;
    rgba[index + 2] = bb;
    rgba[index + 3] = 255;
  }
  const [fr, fg, fb] = parseHex(layout.foreground);
  for (const bar of layout.bars) {
    const x0 = Math.max(0, Math.round(bar.x * scale));
    const y0 = Math.max(0, Math.round(bar.y * scale));
    const x1 = Math.min(width, Math.round((bar.x + bar.width) * scale));
    const y1 = Math.min(height, Math.round((bar.y + bar.height) * scale));
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const offset = (y * width + x) * 4;
        rgba[offset] = fr;
        rgba[offset + 1] = fg;
        rgba[offset + 2] = fb;
        rgba[offset + 3] = 255;
      }
    }
  }
  return { width, height, rgba };
}
