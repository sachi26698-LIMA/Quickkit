/**
 * PNG export through a real 2D canvas, so human-readable text is drawn by the
 * platform font engine rather than approximated.
 *
 * The rectangles come from the same `BarcodeLayout` the preview renders, so the
 * exported file carries the symbol that was checked — not a second rendering
 * that might differ by a pixel.
 */
import { paintBarcodeLayout, type PaintContext2D } from "./paint";
import type { BarcodeLayout } from "./layout";

export type PngResult = { bytes: Uint8Array; width: number; height: number };

/** Largest pixel buffer this tool will allocate for one label (≈ 24 MP). */
export const MAX_PNG_PIXELS = 24_000_000;

export function canUseCanvas() {
  return (
    typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined"
  );
}

type AnyCanvas = {
  width: number;
  height: number;
  getContext: (id: "2d") => unknown;
};

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined")
    return new OffscreenCanvas(width, height) as unknown as AnyCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas as unknown as AnyCanvas;
}

async function toPngBytes(canvas: AnyCanvas): Promise<Uint8Array> {
  const withOffscreen = canvas as unknown as OffscreenCanvas;
  if (typeof withOffscreen.convertToBlob === "function") {
    const blob = await withOffscreen.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  }
  const element = canvas as unknown as HTMLCanvasElement;
  const blob = await new Promise<Blob | null>((resolve) =>
    element.toBlob((result) => resolve(result), "image/png"),
  );
  if (!blob)
    throw new Error("The browser could not encode a PNG for this label.");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Rasterise a layout at `scale` device pixels per layout pixel.
 * Uniform scaling only: the aspect ratio of a barcode is not negotiable.
 */
export async function layoutToPng(
  layout: BarcodeLayout,
  scale = 1,
  background?: string,
): Promise<PngResult> {
  const density = Math.min(6, Math.max(0.5, scale));
  const width = Math.max(1, Math.round(layout.width * density));
  const height = Math.max(1, Math.round(layout.height * density));
  if (width * height > MAX_PNG_PIXELS)
    throw new Error(
      `That export would be ${width}×${height} pixels. Lower the export scale or the bar width.`,
    );
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d") as
    | (CanvasRenderingContext2D & {
        setTransform: (
          a: number,
          b: number,
          c: number,
          d: number,
          e: number,
          f: number,
        ) => void;
      })
    | null;
  if (!context)
    throw new Error(
      "Canvas is unavailable in this browser, so PNG export is not possible.",
    );

  // A transparent label still needs a light field behind the bars when the
  // viewer composites onto black — but the user asked for transparency, so the
  // pixels stay transparent and only the on-screen/print preview shows white.
  if (background && !layout.background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  context.setTransform(density, 0, 0, density, 0, 0);
  paintBarcodeLayout(context as unknown as PaintContext2D, layout);
  const bytes = await toPngBytes(canvas);
  // Release the backing store promptly: a 100-label batch would otherwise hold
  // on to gigabytes of bitmap until GC catches up.
  canvas.width = 0;
  canvas.height = 0;
  return { bytes, width, height };
}

export async function layoutToPngBlob(layout: BarcodeLayout, scale = 1) {
  const { bytes } = await layoutToPng(layout, scale);
  return new Blob([bytes as unknown as BlobPart], { type: "image/png" });
}
