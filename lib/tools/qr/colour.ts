/**
 * Colour maths and gradient geometry shared by the SVG serializer, the pixel
 * rasterizer and the design clamps, so every code path reads the same colours
 * the same way.
 */
import type { QrFill } from "./types";

export type Rgb = [number, number, number];
export type GradientStop = { at: number; rgb: Rgb };
export type Paint =
  | { type: "solid"; rgb: Rgb }
  | {
      type: "linear";
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      dx: number;
      dy: number;
      length: number;
      stops: GradientStop[];
    }
  | {
      type: "radial";
      cx: number;
      cy: number;
      r: number;
      stops: GradientStop[];
    };

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string) {
  return HEX_RE.test(value.trim());
}

export function normalizeHex(value: string, fallback = "#000000") {
  const clean = value.trim().toLowerCase();
  if (!HEX_RE.test(clean)) return fallback;
  const body = clean.startsWith("#") ? clean.slice(1) : clean;
  return `#${
    body.length === 3
      ? body
          .split("")
          .map((char) => char + char)
          .join("")
      : body
  }`;
}

export function hexToRgb(hex: string): Rgb | null {
  if (!HEX_RE.test(hex.trim())) return null;
  const body = normalizeHex(hex).slice(1);
  return [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
  ];
}

export function rgbToHex(rgb: Rgb) {
  return `#${rgb
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function mixHex(a: string, b: string, t: number) {
  return rgbToHex(
    mixRgb(hexToRgb(a) ?? [0, 0, 0], hexToRgb(b) ?? [0, 0, 0], t),
  );
}

function relativeLuminance(rgb: Rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1–21, 0 if unreadable). */
export function contrastRatio(a: string, b: string) {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return 0;
  const la = relativeLuminance(rgbA);
  const lb = relativeLuminance(rgbB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const MIN_CONTRAST = 3;
export const GOOD_CONTRAST = 4.5;

/** Stops a fill paints with — one for solid fills, two for gradients. */
export function fillStops(fill: QrFill): Rgb[] {
  const base = hexToRgb(fill.base) ?? [0, 0, 0];
  if (fill.kind === "solid") return [base];
  return [base, hexToRgb(fill.accent) ?? base];
}

/** Worst contrast a scanner can meet inside a design (gradients included). */
export function effectiveContrast(fg: QrFill, bg: QrFill) {
  let worst = Infinity;
  for (const a of fillStops(fg))
    for (const b of fillStops(bg))
      worst = Math.min(worst, contrastRatio(rgbToHex(a), rgbToHex(b)));
  return Number.isFinite(worst) ? worst : 0;
}

/**
 * Geometry of a fill over a square canvas, in pixels. The same numbers drive
 * `<linearGradient gradientUnits="userSpaceOnUse">` in SVG and the per-pixel
 * interpolation in the rasterizer.
 */
export function fillToPaint(fill: QrFill, size: number): Paint {
  const base = hexToRgb(fill.base) ?? [0, 0, 0];
  const accent = hexToRgb(fill.accent) ?? base;
  if (fill.kind === "solid") return { type: "solid", rgb: base };
  if (fill.kind === "radial")
    return {
      type: "radial",
      cx: size / 2,
      cy: size / 2,
      r: size / 2,
      stops: [
        { at: 0, rgb: base },
        { at: 1, rgb: accent },
      ],
    };
  const rad = (fill.angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(dx) + Math.abs(dy)) * (size / 2);
  return {
    type: "linear",
    x0: size / 2 - dx * half,
    y0: size / 2 - dy * half,
    x1: size / 2 + dx * half,
    y1: size / 2 + dy * half,
    dx,
    dy,
    length: half * 2,
    stops: [
      { at: 0, rgb: base },
      { at: 1, rgb: accent },
    ],
  };
}
