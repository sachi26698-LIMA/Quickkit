/**
 * Scene builder: the single source of truth for what a styled QR code looks
 * like. Both the SVG serializer and the pixel rasterizer consume this scene,
 * so the preview, the downloaded SVG and the downloaded PNG cannot drift apart.
 *
 * Pure data in, pure data out — no canvas, no DOM — which is what lets unit
 * tests rasterise and decode the exact bytes the browser produces.
 */
import { fillToPaint, type Paint } from "./colour";
import { isFinderModule, type QrMatrix } from "./matrix";
import type { QrDesign, QrLogoImage } from "./types";

export type Radii = [number, number, number, number]; // tl tr br bl

export type Shape =
  | { type: "rect"; x: number; y: number; w: number; h: number; paint: Paint }
  | {
      type: "roundrect";
      x: number;
      y: number;
      w: number;
      h: number;
      radii: Radii;
      paint: Paint;
    }
  | {
      type: "ringrect";
      x: number;
      y: number;
      w: number;
      h: number;
      thickness: number;
      radii: Radii;
      paint: Paint;
    }
  | { type: "circle"; cx: number; cy: number; r: number; paint: Paint }
  | {
      type: "ring";
      cx: number;
      cy: number;
      rOuter: number;
      rInner: number;
      paint: Paint;
    }
  | {
      type: "image";
      src: QrLogoImage;
      x: number;
      y: number;
      w: number;
      h: number;
      radii: Radii;
    };

export type QrScene = {
  size: number;
  modules: number;
  marginPx: number;
  modulePx: number;
  background: Shape | null;
  shapes: Shape[];
  foreground: Paint;
  logo: { x: number; y: number; w: number; h: number } | null;
};

const radii = (value: number): Radii => [value, value, value, value];

function moduleShape(
  x: number,
  y: number,
  m: number,
  design: QrDesign,
  paint: Paint,
): Shape {
  if (design.dotStyle === "square")
    return { type: "rect", x, y, w: m, h: m, paint };
  const inset = (1 - design.dotScale) * m;
  const gx = x + inset / 2;
  const gy = y + inset / 2;
  const gw = m - inset;
  const gh = m - inset;
  switch (design.dotStyle) {
    case "dots":
      return {
        type: "circle",
        cx: x + m / 2,
        cy: y + m / 2,
        r: (m * design.dotScale) / 2,
        paint,
      };
    case "rounded": {
      const r = Math.min(Math.min(gw, gh) / 2, design.cornerRadius * m * 2);
      return {
        type: "roundrect",
        x: gx,
        y: gy,
        w: gw,
        h: gh,
        radii: radii(r),
        paint,
      };
    }
    case "classy": {
      const r = Math.min(Math.min(gw, gh) / 2, gw * 0.55);
      return {
        type: "roundrect",
        x: gx,
        y: gy,
        w: gw,
        h: gh,
        radii: [r, 0, r, 0],
        paint,
      };
    }
    case "classy-rounded":
    default: {
      const r = Math.min(gw, gh) * 0.45;
      return {
        type: "roundrect",
        x: gx,
        y: gy,
        w: gw,
        h: gh,
        radii: [r, Math.min(r, m * 0.16), r, Math.min(r, m * 0.16)],
        paint,
      };
    }
  }
}

/**
 * The three finder patterns carry the same bits in every QR code, so replacing
 * their square outline with a styled outline changes nothing about validity —
 * as long as the dark ring and the 3×3 centre stay dark and separated by one
 * light module. Every style here respects that rule.
 */
function eyeShapes(
  origin: { x: number; y: number },
  m: number,
  design: QrDesign,
  paint: Paint,
): Shape[] {
  const { x, y } = origin;
  const side = 7 * m;
  const cx = x + side / 2;
  const cy = y + side / 2;
  const center = { x: x + 2 * m, y: y + 2 * m, w: 3 * m, h: 3 * m };
  const common = {
    x,
    y,
    w: side,
    h: side,
    thickness: m,
    radii: radii(0),
    paint,
  };
  switch (design.eyeStyle) {
    case "rounded":
      return [
        { ...common, type: "ringrect", radii: radii(m * 1.8) },
        { type: "roundrect", ...center, radii: radii(m * 1.1), paint },
      ];
    case "dots":
      return [
        {
          type: "ring",
          cx,
          cy,
          rOuter: side / 2,
          rInner: side / 2 - m,
          paint,
        },
        { type: "circle", cx, cy, r: 1.5 * m, paint },
      ];
    case "circle":
      // Open bullseye: a one-module round ring with extra air around a round
      // centre. The centre must stay circular — a square centre here pokes
      // diagonally toward the ring and defeated both jsQR and ZXing in testing,
      // which is exactly what the decode gate is for.
      return [
        {
          type: "ring",
          cx,
          cy,
          rOuter: side / 2,
          rInner: side / 2 - m,
          paint,
        },
        { type: "circle", cx, cy, r: 1.25 * m, paint },
      ];
    case "classy":
      return [
        { ...common, type: "ringrect", radii: [m * 2.8, 0, m * 2.8, 0] },
        {
          type: "roundrect",
          ...center,
          radii: [m * 1.1, 0, m * 1.1, 0],
          paint,
        },
      ];
    case "square":
    default:
      return [
        { ...common, type: "ringrect" },
        { type: "rect", ...center, paint },
      ];
  }
}

export function buildScene(
  matrix: QrMatrix,
  design: QrDesign,
  logo: QrLogoImage | null,
): QrScene {
  const total = matrix.size + design.margin * 2;
  const modulePx = design.size / total;
  const size = design.size;
  const shapes: Shape[] = [];
  // `invert` swaps which colour paints modules and which paints the field.
  const moduleFill = design.invert ? design.bg : design.fg;
  const fieldFill = design.invert ? design.fg : design.bg;
  const paint = fillToPaint(moduleFill, size);
  const background: Shape | null = design.transparent
    ? null
    : {
        type: "rect",
        x: 0,
        y: 0,
        w: size,
        h: size,
        paint: fillToPaint(fieldFill, size),
      };

  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (!matrix.data[row * matrix.size + col]) continue;
      if (isFinderModule(matrix.size, row, col)) continue;
      shapes.push(
        moduleShape(
          (col + design.margin) * modulePx,
          (row + design.margin) * modulePx,
          modulePx,
          design,
          paint,
        ),
      );
    }
  }

  const last = matrix.size - 7;
  for (const origin of [
    { row: 0, col: 0 },
    { row: 0, col: last },
    { row: last, col: 0 },
  ])
    shapes.push(
      ...eyeShapes(
        {
          x: (origin.col + design.margin) * modulePx,
          y: (origin.row + design.margin) * modulePx,
        },
        modulePx,
        design,
        paint,
      ),
    );

  let logoBox: QrScene["logo"] = null;
  if (logo) {
    const side = design.logo.scale * size;
    const cx = size / 2 + design.logo.offsetX * size;
    const cy = size / 2 + design.logo.offsetY * size;
    const x = cx - side / 2;
    const y = cy - side / 2;
    const pad = design.logo.padding * modulePx;
    // A halo of field colour keeps the logo from sitting on live modules and
    // is what makes an overlaid logo survivable at all.
    if (design.logo.halo || design.transparent) {
      const haloSize = side + pad * 2;
      const round =
        design.logo.shape === "circle"
          ? haloSize / 2
          : design.logo.shape === "rounded"
            ? haloSize * 0.18
            : 0;
      shapes.push({
        type: "roundrect",
        x: x - pad,
        y: y - pad,
        w: haloSize,
        h: haloSize,
        radii: radii(round),
        paint: design.transparent
          ? { type: "solid", rgb: design.invert ? [0, 0, 0] : [255, 255, 255] }
          : fillToPaint(fieldFill, size),
      });
    }
    const logoRadius =
      design.logo.shape === "circle"
        ? side / 2
        : design.logo.shape === "rounded"
          ? side * 0.18
          : 0;
    shapes.push({
      type: "image",
      src: logo,
      x,
      y,
      w: side,
      h: side,
      radii: radii(logoRadius),
    });
    logoBox = { x, y, w: side, h: side };
  }

  return {
    size,
    modules: matrix.size,
    marginPx: design.margin * modulePx,
    modulePx,
    background,
    shapes,
    foreground: paint,
    logo: logoBox,
  };
}
