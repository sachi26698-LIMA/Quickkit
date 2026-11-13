/**
 * Geometry for a barcode label.
 *
 * The layout is the single source of truth for every output: the SVG preview,
 * the canvas PNG, the PDF sheet and the decoder check all draw these numbers.
 * Bars are snapped to whole pixels by edge (not by width) so a fractional
 * module width can never open a hairline gap or swallow a narrow bar — the one
 * way a "beautiful" CSS-scaled barcode usually stops scanning.
 */
import { normalizeHex } from "@/lib/tools/qr/colour";
import type { BarcodeBar, BarcodeSpec } from "./types";

export type BarcodeTextAlign = "left" | "center" | "right";

export type BarcodeRenderOptions = {
  /** Pixels per narrow module. */
  moduleWidth: number;
  /** Height of the bar field, in pixels. */
  barHeight: number;
  /** Requested quiet zone in modules; the symbology minimum always wins. */
  quietZone: number;
  /** Padding around everything, in pixels. */
  margin: number;
  foreground: string;
  background: string;
  transparent: boolean;
  showText: boolean;
  fontFamily: string;
  fontSize: number;
  textAlign: BarcodeTextAlign;
  title: string;
  description: string;
  /** How far guard bars reach into the text line, in pixels. */
  guardExtension: number;
};

export const DEFAULT_RENDER_OPTIONS: BarcodeRenderOptions = {
  moduleWidth: 2.4,
  barHeight: 96,
  quietZone: 10,
  margin: 16,
  foreground: "#111827",
  background: "#ffffff",
  transparent: false,
  showText: true,
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontSize: 13,
  textAlign: "center",
  title: "",
  description: "",
  guardExtension: 8,
};

export type Rect = { x: number; y: number; width: number; height: number };

export type TextBlock = {
  text: string;
  x: number;
  y: number;
  size: number;
  anchor: "start" | "middle" | "end";
  weight: number;
  color: string;
  /** Vertical placement hint: SVG uses the top of the box, like canvas. */
  baseline: "top";
};

export type BarcodeLayout = {
  width: number;
  height: number;
  bars: Rect[];
  texts: TextBlock[];
  background: string | null;
  foreground: string;
  moduleWidth: number;
  barHeight: number;
  symbolLeft: number;
  symbolTop: number;
  symbolWidth: number;
  quietLeft: number;
  quietRight: number;
  fontFamily: string;
  /** Dimensions of the label in the units the caller asked for. */
  scaled: { width: number; height: number; scale: number };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const MODULE_WIDTH_RANGE = { min: 0.75, max: 16 } as const;

/** Rough advance width — used for bounds only; the browser measures the rest. */
export function estimateTextWidth(text: string, size: number, monospace = false) {
  return text.length * size * (monospace ? 0.62 : 0.56);
}

function withAlpha(hex: string, alpha: number) {
  const clean = normalizeHex(hex, "#000000").slice(1);
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type LayoutInput = {
  spec: BarcodeSpec;
  options: Partial<BarcodeRenderOptions>;
  /** Extra render density for exports (1 = preview pixels). */
  scale?: number;
};

export function buildLayout({ spec, options, scale = 1 }: LayoutInput): BarcodeLayout {
  const merged: BarcodeRenderOptions = { ...DEFAULT_RENDER_OPTIONS, ...options };
  const density = clamp(scale, 0.25, 8);
  const moduleWidth = clamp(merged.moduleWidth, MODULE_WIDTH_RANGE.min, MODULE_WIDTH_RANGE.max);
  const barHeight = clamp(merged.barHeight, 16, 1200);
  const margin = clamp(merged.margin, 0, 160);
  const fontSize = clamp(merged.fontSize, 6, 96);
  const requestedQuiet = clamp(merged.quietZone, 0, 80);
  const quietLeft = Math.max(spec.quiet.left, requestedQuiet);
  const quietRight = Math.max(spec.quiet.right, requestedQuiet);
  const guardExtension = merged.showText ? clamp(merged.guardExtension, 0, barHeight) : 0;

  const foreground = normalizeHex(merged.foreground, "#111827");
  const background = normalizeHex(merged.background, "#ffffff");
  const transparent = Boolean(merged.transparent);

  const title = merged.title.trim();
  const description = merged.description.trim();
  const titleSize = fontSize * 1.15;
  const titleHeight = title ? titleSize * 1.35 : 0;
  const titleGap = title ? fontSize * 0.4 : 0;
  const descSize = fontSize * 0.92;
  const descHeight = description ? descSize * 1.5 : 0;
  const descGap = description ? fontSize * 0.45 : 0;
  const hriSize = fontSize;
  const hriHeight = merged.showText ? hriSize * 1.3 : 0;
  const hriGap = merged.showText ? Math.max(2, fontSize * 0.18) : 0;

  const symbolLeftBase = margin + quietLeft * moduleWidth;
  const symbolWidth = spec.modules * moduleWidth;
  const baseWidth =
    margin * 2 + (quietLeft + spec.modules + quietRight) * moduleWidth;

  // Keep EAN/UPC quiet-zone digits and long HRI lines inside the canvas.
  let extraLeft = 0;
  let extraRight = 0;
  if (merged.showText)
    for (const segment of spec.segments) {
      const width = estimateTextWidth(segment.text, hriSize);
      const centre = symbolLeftBase + segment.center * moduleWidth;
      extraLeft = Math.max(extraLeft, Math.ceil(-(centre - width / 2) + 2));
      extraRight = Math.max(
        extraRight,
        Math.ceil(centre + width / 2 - (baseWidth - margin) + 2),
      );
    }
  extraLeft = Math.max(0, extraLeft);
  extraRight = Math.max(0, extraRight);

  const width = baseWidth + extraLeft + extraRight;
  const symbolLeft = symbolLeftBase + extraLeft;
  const symbolTop = margin + titleHeight + titleGap;
  const barsBottom = symbolTop + barHeight;
  const textTop = barsBottom + guardExtension + hriGap;
  const height = barsBottom + guardExtension + hriGap + hriHeight + descGap + descHeight + margin;

  const anchorFor = (align: BarcodeTextAlign): TextBlock["anchor"] =>
    align === "left" ? "start" : align === "right" ? "end" : "middle";
  const alignX = (align: BarcodeTextAlign) =>
    align === "left" ? margin : align === "right" ? width - margin : width / 2;

  const texts: TextBlock[] = [];
  if (title)
    texts.push({
      text: title,
      x: alignX(merged.textAlign),
      y: margin,
      size: titleSize,
      anchor: anchorFor(merged.textAlign),
      weight: 700,
      color: foreground,
      baseline: "top",
    });

  if (merged.showText) {
    const single = spec.segments.length === 1;
    for (const segment of spec.segments) {
      const anchor: TextBlock["anchor"] = single
        ? anchorFor(merged.textAlign)
        : "middle";
      let x = symbolLeft + segment.center * moduleWidth;
      if (single && merged.textAlign === "left") x = symbolLeft;
      if (single && merged.textAlign === "right") x = symbolLeft + symbolWidth;
      texts.push({
        text: segment.text,
        x,
        y: textTop,
        size: hriSize,
        anchor,
        weight: 500,
        color: foreground,
        baseline: "top",
      });
    }
  }

  if (description)
    texts.push({
      text: description,
      x: alignX(merged.textAlign),
      y: height - margin - descHeight + descSize * 0.18,
      size: descSize,
      anchor: anchorFor(merged.textAlign),
      weight: 400,
      color: transparent ? foreground : withAlpha(foreground, 0.72),
      baseline: "top",
    });

  const snap = (bar: BarcodeBar, top: number, bottom: number): Rect => {
    const left = Math.round(symbolLeft + bar.x * moduleWidth);
    const right = Math.round(symbolLeft + (bar.x + bar.width) * moduleWidth);
    return {
      x: left,
      y: Math.round(top),
      width: Math.max(1, right - left),
      height: Math.max(1, Math.round(bottom - top)),
    };
  };

  const bars: Rect[] = spec.bars.map((bar) => snap(bar, symbolTop, barsBottom));
  if (guardExtension > 0)
    for (const guard of spec.guards) bars.push(snap(guard, barsBottom - Math.max(1, moduleWidth), barsBottom + guardExtension));

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    bars,
    texts,
    background: transparent ? null : background,
    foreground,
    moduleWidth,
    barHeight,
    symbolLeft,
    symbolTop,
    symbolWidth,
    quietLeft,
    quietRight,
    fontFamily: merged.fontFamily,
    scaled: {
      width: Math.max(1, Math.round(width * density)),
      height: Math.max(1, Math.round(height * density)),
      scale: density,
    },
  };
}

/** Physical size helpers used by the print notice and the PDF sheet. */
export function millimetresAt(dpi: number, pixels: number) {
  return (pixels / dpi) * 25.4;
}

export function layoutMillimetres(layout: BarcodeLayout, dpi = 300) {
  return {
    width: millimetresAt(dpi, layout.width),
    height: millimetresAt(dpi, layout.height),
    module: millimetresAt(dpi, layout.moduleWidth),
  };
}
