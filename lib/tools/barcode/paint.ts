/**
 * Canvas painting, expressed against a four-method interface.
 *
 * Keeping the painter this narrow means the PNG export can use a real
 * `CanvasRenderingContext2D` (or an `OffscreenCanvas` one) while the tests use
 * a recording stub and assert the exact rectangles a browser would receive.
 */
import type { BarcodeLayout } from "./layout";

export type PaintContext2D = {
  fillStyle: unknown;
  font: string;
  textAlign: string;
  textBaseline: string;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
};

/** Draw a finished layout. Assumes the context is already scaled to `scale`. */
export function paintBarcodeLayout(context: PaintContext2D, layout: BarcodeLayout) {
  if (layout.background) {
    context.fillStyle = layout.background;
    context.fillRect(0, 0, layout.width, layout.height);
  }
  context.fillStyle = layout.foreground;
  for (const bar of layout.bars)
    context.fillRect(bar.x, bar.y, bar.width, bar.height);

  context.textBaseline = "top";
  for (const block of layout.texts) {
    context.fillStyle = block.color;
    context.font = `${block.weight} ${block.size}px ${layout.fontFamily}`;
    context.textAlign =
      block.anchor === "middle" ? "center" : block.anchor === "end" ? "right" : "left";
    context.fillText(block.text, block.x, block.y);
  }
  // Restore a predictable state for any caller that keeps drawing.
  context.textBaseline = "alphabetic";
  context.textAlign = "start";
}
