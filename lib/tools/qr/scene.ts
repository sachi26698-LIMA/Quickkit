/**
 * Scene builder: the single source of truth for what a styled QR code looks
 * like. Both the SVG serializer and the pixel rasterizer consume this scene,
 * so the preview, the downloaded SVG and the downloaded PNG cannot drift apart.
 *
 * Pure data in, pure data out — no canvas, no DOM — which is what lets unit
 * tests rasterise and decode the exact bytes the browser produces.
 */
import { fillToPaint, hexToRgb, type Paint } from "./colour";
import { layoutText } from "./font";
import { isFinderModule, type QrMatrix } from "./matrix";
import { FRAME_PRESET_TEXT, type QrDesign, type QrLogoImage } from "./types";

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
    }
  | {
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      thickness: number;
      paint: Paint;
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

/** Frame geometry, shared with the safety audit so px/module stays honest. */
export const FRAME_PAD_RATIO = 0.035;
export const FRAME_BANNER_RATIO = 0.14;

/** Fraction of the canvas the square symbol occupies (1 when unframed). */
export function codeRegionRatio(design: QrDesign): number {
  return design.frame.style === "none"
    ? 1
    : 1 - FRAME_PAD_RATIO * 2 - FRAME_BANNER_RATIO;
}

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
  framePaint: Paint,
  ballPaint: Paint,
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
    paint: framePaint,
  };
  switch (design.eyeStyle) {
    case "rounded":
      return [
        { ...common, type: "ringrect", radii: radii(m * 1.8) },
        {
          type: "roundrect",
          ...center,
          radii: radii(m * 1.1),
          paint: ballPaint,
        },
      ];
    case "dots":
      return [
        {
          type: "ring",
          cx,
          cy,
          rOuter: side / 2,
          rInner: side / 2 - m,
          paint: framePaint,
        },
        { type: "circle", cx, cy, r: 1.5 * m, paint: ballPaint },
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
          paint: framePaint,
        },
        { type: "circle", cx, cy, r: 1.25 * m, paint: ballPaint },
      ];
    case "classy":
      return [
        { ...common, type: "ringrect", radii: [m * 2.8, 0, m * 2.8, 0] },
        {
          type: "roundrect",
          ...center,
          radii: [m * 1.1, 0, m * 1.1, 0],
          paint: ballPaint,
        },
      ];
    case "square":
    default:
      return [
        { ...common, type: "ringrect" },
        { type: "rect", ...center, paint: ballPaint },
      ];
  }
}

/** Solid paint from a hex colour, with a safe fallback. */
function solidHex(hex: string, fallback: [number, number, number]): Paint {
  return { type: "solid", rgb: hexToRgb(hex) ?? fallback };
}

/**
 * Frame geometry: a rounded border plus a bottom label banner, drawn outside
 * the symbol's quiet zone. Returns the shapes and the (smaller) square code
 * region the symbol must fit into. Text is laid out with the built-in stroke
 * font and shrunk to fit the banner width.
 */
function frameShapes(
  design: QrDesign,
  size: number,
): { shapes: Shape[]; codeSide: number; ox: number; oy: number } {
  const frame = design.frame;
  const pad = size * FRAME_PAD_RATIO;
  const bannerH = size * FRAME_BANNER_RATIO;
  const codeSide = size - pad * 2 - bannerH;
  const ox = (size - codeSide) / 2;
  const oy = pad;
  const fgPaint = solidHex(frame.fg, [59, 27, 79]);
  const bgPaint = solidHex(frame.bg, [244, 215, 212]);
  const shapes: Shape[] = [];
  const borderInset = size * 0.012;
  shapes.push({
    type: "ringrect",
    x: borderInset,
    y: borderInset,
    w: size - borderInset * 2,
    h: size - borderInset * 2,
    thickness: Math.max(2, size * 0.012),
    radii: radii(size * 0.045),
    paint: fgPaint,
  });
  const bannerY = size - pad - bannerH;
  const bannerW = size - pad * 2;
  shapes.push({
    type: "roundrect",
    x: pad,
    y: bannerY,
    w: bannerW,
    h: bannerH,
    radii: radii(size * 0.03),
    paint: bgPaint,
  });
  const presetText =
    frame.style !== "none" && frame.style !== "custom"
      ? FRAME_PRESET_TEXT[frame.style]
      : frame.text;
  const label = (frame.text.trim() ? frame.text : presetText) || "SCAN ME";
  let capHeight = bannerH * 0.42;
  let laid = layoutText(label, capHeight);
  const maxW = bannerW * 0.86;
  if (laid.width > maxW && laid.width > 0) {
    capHeight *= maxW / laid.width;
    laid = layoutText(label, capHeight);
  }
  const textX = (size - laid.width) / 2;
  const textY = bannerY + (bannerH - capHeight) / 2;
  const thickness = Math.max(1.5, capHeight * 0.16);
  for (const seg of laid.segments) {
    shapes.push({
      type: "line",
      x1: textX + seg.x1,
      y1: textY + seg.y1,
      x2: textX + seg.x2,
      y2: textY + seg.y2,
      thickness,
      paint: fgPaint,
    });
  }
  return { shapes, codeSide, ox, oy };
}

export function buildScene(
  matrix: QrMatrix,
  design: QrDesign,
  logo: QrLogoImage | null,
): QrScene {
  const size = design.size;
  const total = matrix.size + design.margin * 2;
  const framed = design.frame.style !== "none";
  const frame = framed ? frameShapes(design, size) : null;
  // With a frame the symbol lives in a smaller square region above the banner;
  // without one it fills the canvas exactly as before.
  const codeSide = frame ? frame.codeSide : size;
  const ox = frame ? frame.ox : 0;
  const oy = frame ? frame.oy : 0;
  const modulePx = codeSide / total;
  const shapes: Shape[] = [];
  // `invert` swaps which colour paints modules and which paints the field.
  const moduleFill = design.invert ? design.bg : design.fg;
  const fieldFill = design.invert ? design.fg : design.bg;
  const paint = fillToPaint(moduleFill, size);
  const eyeFramePaint = design.eyeFrame
    ? fillToPaint(design.eyeFrame, size)
    : paint;
  const eyeBallPaint = design.eyeBall
    ? fillToPaint(design.eyeBall, size)
    : paint;
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
          ox + (col + design.margin) * modulePx,
          oy + (row + design.margin) * modulePx,
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
          x: ox + (origin.col + design.margin) * modulePx,
          y: oy + (origin.row + design.margin) * modulePx,
        },
        modulePx,
        design,
        eyeFramePaint,
        eyeBallPaint,
      ),
    );

  // Frame border + banner + label sit outside the quiet zone, over the field.
  if (frame) shapes.push(...frame.shapes);

  let logoBox: QrScene["logo"] = null;
  if (logo) {
    const side = design.logo.scale * codeSide;
    const cx = ox + codeSide / 2 + design.logo.offsetX * codeSide;
    const cy = oy + codeSide / 2 + design.logo.offsetY * codeSide;
    const x = cx - side / 2;
    const y = cy - side / 2;
    const pad = design.logo.padding * modulePx;
    // A halo keeps the logo from sitting on live modules and is what makes an
    // overlaid logo survivable at all. Its colour is the field by default, or
    // an explicit override the user picked.
    if (design.logo.halo || design.transparent) {
      const haloSize = side + pad * 2;
      const round =
        design.logo.shape === "circle"
          ? haloSize / 2
          : design.logo.shape === "rounded"
            ? haloSize * 0.18
            : 0;
      const haloPaint: Paint = design.logo.bg
        ? solidHex(design.logo.bg, [255, 255, 255])
        : design.transparent
          ? { type: "solid", rgb: design.invert ? [0, 0, 0] : [255, 255, 255] }
          : fillToPaint(fieldFill, size);
      shapes.push({
        type: "roundrect",
        x: x - pad,
        y: y - pad,
        w: haloSize,
        h: haloSize,
        radii: radii(round),
        paint: haloPaint,
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
