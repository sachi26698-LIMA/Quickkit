/**
 * Built-in single-stroke font for frame labels.
 *
 * Pure geometry (polyline strokes on a 4×6 grid) so the software rasterizer,
 * the SVG serializer and the unit tests all draw the *same* glyphs — no canvas,
 * no network font, no font-licensing question. Round line caps give a clean
 * mono-line sans that stays legible at banner sizes. Uppercase only; unknown
 * characters become spaces so a label can never inject geometry.
 */

export const GLYPH_W = 4;
export const GLYPH_H = 6;

/** Each glyph is a list of polylines; each polyline is a list of [x, y]. */
const GLYPHS: Record<string, number[][][]> = {
  A: [
    [
      [0, 6],
      [2, 0],
      [4, 6],
    ],
    [
      [1, 4],
      [3, 4],
    ],
  ],
  B: [
    [
      [0, 0],
      [0, 6],
    ],
    [
      [0, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [0, 3],
    ],
    [
      [0, 3],
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [0, 6],
    ],
  ],
  C: [
    [
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
    ],
  ],
  D: [
    [
      [0, 0],
      [0, 6],
      [3, 6],
      [4, 5],
      [4, 1],
      [3, 0],
      [0, 0],
    ],
  ],
  E: [
    [
      [4, 0],
      [0, 0],
      [0, 6],
      [4, 6],
    ],
    [
      [0, 3],
      [3, 3],
    ],
  ],
  F: [
    [
      [4, 0],
      [0, 0],
      [0, 6],
    ],
    [
      [0, 3],
      [3, 3],
    ],
  ],
  G: [
    [
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 3],
      [2, 3],
    ],
  ],
  H: [
    [
      [0, 0],
      [0, 6],
    ],
    [
      [4, 0],
      [4, 6],
    ],
    [
      [0, 3],
      [4, 3],
    ],
  ],
  I: [
    [
      [1, 0],
      [3, 0],
    ],
    [
      [2, 0],
      [2, 6],
    ],
    [
      [1, 6],
      [3, 6],
    ],
  ],
  J: [
    [
      [4, 0],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
    ],
  ],
  K: [
    [
      [0, 0],
      [0, 6],
    ],
    [
      [4, 0],
      [0, 3],
      [4, 6],
    ],
  ],
  L: [
    [
      [0, 0],
      [0, 6],
      [4, 6],
    ],
  ],
  M: [
    [
      [0, 6],
      [0, 0],
      [2, 3],
      [4, 0],
      [4, 6],
    ],
  ],
  N: [
    [
      [0, 6],
      [0, 0],
      [4, 6],
      [4, 0],
    ],
  ],
  O: [
    [
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
      [0, 1],
      [1, 0],
    ],
  ],
  P: [
    [
      [0, 6],
      [0, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [0, 3],
    ],
  ],
  Q: [
    [
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
      [0, 1],
      [1, 0],
    ],
    [
      [2.4, 4.4],
      [4.2, 6.2],
    ],
  ],
  R: [
    [
      [0, 6],
      [0, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [0, 3],
    ],
    [
      [2, 3],
      [4, 6],
    ],
  ],
  S: [
    [
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 2],
      [1, 3],
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
    ],
  ],
  T: [
    [
      [0, 0],
      [4, 0],
    ],
    [
      [2, 0],
      [2, 6],
    ],
  ],
  U: [
    [
      [0, 0],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 0],
    ],
  ],
  V: [
    [
      [0, 0],
      [2, 6],
      [4, 0],
    ],
  ],
  W: [
    [
      [0, 0],
      [1, 6],
      [2, 3],
      [3, 6],
      [4, 0],
    ],
  ],
  X: [
    [
      [0, 0],
      [4, 6],
    ],
    [
      [4, 0],
      [0, 6],
    ],
  ],
  Y: [
    [
      [0, 0],
      [2, 3],
      [4, 0],
    ],
    [
      [2, 3],
      [2, 6],
    ],
  ],
  Z: [
    [
      [0, 0],
      [4, 0],
      [0, 6],
      [4, 6],
    ],
  ],
  "0": [
    [
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
      [0, 1],
      [1, 0],
    ],
    [
      [1, 5],
      [3, 1],
    ],
  ],
  "1": [
    [
      [1, 1],
      [2, 0],
      [2, 6],
    ],
    [
      [1, 6],
      [3, 6],
    ],
  ],
  "2": [
    [
      [0, 1],
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [0, 6],
      [4, 6],
    ],
  ],
  "3": [
    [
      [0, 1],
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [2, 3],
    ],
    [
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
    ],
  ],
  "4": [
    [
      [3, 6],
      [3, 0],
      [0, 4],
      [4, 4],
    ],
  ],
  "5": [
    [
      [4, 0],
      [0, 0],
      [0, 3],
      [3, 3],
      [4, 4],
      [4, 5],
      [3, 6],
      [1, 6],
      [0, 5],
    ],
  ],
  "6": [
    [
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 4],
      [3, 3],
      [0, 3],
    ],
  ],
  "7": [
    [
      [0, 0],
      [4, 0],
      [2, 6],
    ],
  ],
  "8": [
    [
      [1, 3],
      [0, 2],
      [0, 1],
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [3, 3],
      [1, 3],
    ],
    [
      [1, 3],
      [0, 4],
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 4],
      [3, 3],
    ],
  ],
  "9": [
    [
      [0, 5],
      [1, 6],
      [3, 6],
      [4, 5],
      [4, 1],
      [3, 0],
      [1, 0],
      [0, 1],
      [0, 2],
      [1, 3],
      [4, 3],
    ],
  ],
  ".": [
    [
      [1.9, 6],
      [2.1, 6],
    ],
  ],
  ",": [
    [
      [2.2, 5.6],
      [1.5, 6.6],
    ],
  ],
  "!": [
    [
      [2, 0],
      [2, 4],
    ],
    [
      [1.9, 5.9],
      [2.1, 5.9],
    ],
  ],
  "?": [
    [
      [0, 1],
      [1, 0],
      [3, 0],
      [4, 1],
      [4, 2],
      [2, 3],
      [2, 4],
    ],
    [
      [1.9, 5.9],
      [2.1, 5.9],
    ],
  ],
  "-": [
    [
      [1, 3],
      [3, 3],
    ],
  ],
  "/": [
    [
      [0, 6],
      [4, 0],
    ],
  ],
  ":": [
    [
      [1.9, 2],
      [2.1, 2],
    ],
    [
      [1.9, 4.6],
      [2.1, 4.6],
    ],
  ],
  "'": [
    [
      [2, 0],
      [2, 1.5],
    ],
  ],
  "(": [
    [
      [3, 0],
      [1, 2],
      [1, 4],
      [3, 6],
    ],
  ],
  ")": [
    [
      [1, 0],
      [3, 2],
      [3, 4],
      [1, 6],
    ],
  ],
  "+": [
    [
      [2, 1.5],
      [2, 4.5],
    ],
    [
      [0.5, 3],
      [3.5, 3],
    ],
  ],
  "&": [
    [
      [4, 6],
      [1, 2.4],
      [1, 1],
      [2, 0],
      [3, 1],
      [3, 2],
      [0, 4.2],
      [0, 5],
      [1, 6],
      [2, 6],
      [4, 4.2],
    ],
  ],
};

const LETTER_SPACING = 1.7;
const SPACE_ADVANCE = 3.2;

export type TextSegment = { x1: number; y1: number; x2: number; y2: number };

/** Sanitize a label to characters the font can draw (uppercase, known set). */
export function sanitizeLabelText(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((ch) => (GLYPHS[ch] || ch === " " ? ch : " "))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lay a label out as line segments in a local box: x from 0..width, y from
 * 0 (cap top) to capHeight (baseline). The caller centres it in the banner.
 */
export function layoutText(
  text: string,
  capHeight: number,
): { segments: TextSegment[]; width: number } {
  const clean = sanitizeLabelText(text);
  const scale = capHeight / GLYPH_H;
  const advance = (GLYPH_W + LETTER_SPACING) * scale;
  const spaceAdvance = SPACE_ADVANCE * scale;
  const segments: TextSegment[] = [];
  let pen = 0;
  for (const ch of clean) {
    if (ch === " ") {
      pen += spaceAdvance;
      continue;
    }
    const glyph = GLYPHS[ch];
    if (!glyph) {
      pen += spaceAdvance;
      continue;
    }
    for (const polyline of glyph) {
      for (let i = 0; i < polyline.length - 1; i += 1) {
        const [ax, ay] = polyline[i];
        const [bx, by] = polyline[i + 1];
        segments.push({
          x1: pen + ax * scale,
          y1: ay * scale,
          x2: pen + bx * scale,
          y2: by * scale,
        });
      }
    }
    pen += advance;
  }
  // Width excludes the trailing letter-spacing of the final glyph.
  const width = Math.max(0, pen - LETTER_SPACING * scale);
  return { segments, width };
}
