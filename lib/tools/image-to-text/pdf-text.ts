"use client";

/**
 * Browser-side rendering of text for the PDF export.
 *
 * PDF's standard fonts cannot encode Devanagari, Gujarati, Bengali, Tamil,
 * Telugu or Urdu, and embedding a raw font file is not enough on its own:
 * a PDF text-showing operator prints glyphs one code point at a time, so
 * conjuncts and vowel signs come out detached (ક્ષ becomes ક ્ ષ). The only way
 * to get correct *visible* shaping without shipping a full OpenType layout
 * engine is to let the browser's own text shaper do it, then place a
 * transparent text layer on top so the page stays selectable and searchable.
 *
 * This module produces both halves:
 *  - `renderTextToPng` : the shaped script, drawn by the browser, at print
 *    resolution;
 *  - `textLineBoxes`   : per-line geometry so the export can lay a matching
 *    invisible `/ActualText` span over every rendered line.
 */

export interface RenderedTextImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  /** CSS pixel width the image represents, used for point conversion. */
  cssWidth: number;
  cssHeight: number;
  lines: RenderedTextLine[];
}

export interface RenderedTextLine {
  text: string;
  /** Left offset in CSS pixels from the block's top-left corner. */
  left: number;
  /** Baseline distance from the block's top edge, in CSS pixels. */
  baseline: number;
  /** Line height in CSS pixels. */
  lineHeight: number;
}

const FONT_STACK =
  '"Noto Sans Devanagari", "Noto Sans Gujarati", "Noto Sans Bengali", ' +
  '"Noto Sans Tamil", "Noto Sans Telugu", "Noto Nastaliq Urdu", ' +
  "system-ui, 'Segoe UI', Roboto, sans-serif";

export interface RenderOptions {
  /** Wrapping width in CSS pixels. */
  width: number;
  fontSize: number;
  lineHeight: number;
  rtl?: boolean;
  /** Extra pixels around the text, avoids clipping ascenders. */
  padding?: number;
  scale?: number;
}

/**
 * Draw wrapped text with the platform's own shaper and return a PNG plus the
 * line geometry that maps back onto it.
 */
export async function renderTextToPng(
  text: string,
  options: RenderOptions,
): Promise<RenderedTextImage> {
  const {
    width,
    fontSize,
    lineHeight,
    rtl = false,
    padding = 6,
    scale = 2,
  } = options;

  const lines = wrapLines(text, width - padding * 2, fontSize);
  const cssHeight =
    Math.max(lineHeight, lines.length * lineHeight) + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(cssHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot render text for the PDF.");

  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, cssHeight);
  context.fillStyle = "#1a0f2e";
  context.textBaseline = "alphabetic";
  context.direction = rtl ? "rtl" : "ltr";
  context.font = `${fontSize}px ${FONT_STACK}`;

  const geometry: RenderedTextLine[] = [];
  lines.forEach((line, index) => {
    const baseline = padding + index * lineHeight + fontSize * 0.86;
    const x = rtl ? width - padding : padding;
    context.fillText(line, x, baseline, width - padding * 2);
    geometry.push({
      text: line,
      left: 0,
      baseline,
      lineHeight,
    });
  });

  const blob = await canvasToBlob(canvas);
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width,
    height: canvas.height,
    cssWidth: width,
    cssHeight,
    lines: geometry,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("This browser cannot render text for the PDF."));
    }, "image/png");
  });
}

/**
 * Greedy word wrap measured with the same canvas font the renderer uses, so
 * the invisible text layer lines up with the glyphs that were drawn.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const measure = measuringContext();
  if (measure) measure.font = `${fontSize}px ${FONT_STACK}`;
  const result: string[] = [];
  for (const paragraph of text.split(/\r?\n/u)) {
    if (!paragraph.trim()) {
      result.push("");
      continue;
    }
    const words = paragraph.split(/\s+/u).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = measure
        ? measure.measureText(candidate).width
        : candidate.length * fontSize * 0.55;
      if (current && width > maxWidth) {
        result.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) result.push(current);
  }
  return result.length ? result : [""];
}

let cachedContext: CanvasRenderingContext2D | null | undefined;

function measuringContext(): CanvasRenderingContext2D | null {
  if (cachedContext !== undefined) return cachedContext;
  const canvas = document.createElement("canvas");
  cachedContext = canvas.getContext("2d");
  return cachedContext;
}
