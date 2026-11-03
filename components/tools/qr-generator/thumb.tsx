"use client";
/**
 * A real rendered thumbnail. Both the preset grid and the history list show an
 * actual code drawn from the stored design — never a decorative placeholder —
 * so what you apply is what you see.
 */
import { useEffect, useState } from "react";
import { renderQr } from "@/lib/tools/qr/render";
import { defaultDesign } from "@/lib/tools/qr/style";
import type { QrDesign } from "@/lib/tools/qr/types";
import { QR_SAMPLE_URL } from "./use-qr-studio";

export function QrThumb({
  payload = QR_SAMPLE_URL,
  design,
  size = 88,
  label,
}: {
  payload?: string;
  design: Partial<QrDesign>;
  size?: number;
  label: string;
}) {
  const [bitmap, setBitmap] = useState<{
    width: number;
    rgba: Uint8ClampedArray;
  } | null>(null);
  const key = JSON.stringify([payload, design, size]);
  useEffect(() => {
    let cancelled = false;
    void renderQr({
      payload,
      design: { ...defaultDesign(), ...design, size, margin: 2 },
      artifacts: { preview: size },
    })
      .then((out) => {
        if (!cancelled && out.preview)
          setBitmap({
            width: out.preview.width,
            rgba: out.preview.rgba,
          });
      })
      .catch(() => {
        if (!cancelled) setBitmap(null);
      });
    return () => {
      cancelled = true;
    };
    // `key` folds payload + design + size into one dependency on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [node, setNode] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!node || !bitmap) return;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, node.width, node.height);
    const frame = ctx.createImageData(bitmap.width, bitmap.width);
    frame.data.set(bitmap.rgba);
    ctx.putImageData(frame, 0, 0);
  }, [bitmap, node]);

  return (
    <span className="qr-thumb">
      <canvas
        ref={setNode}
        width={size}
        height={size}
        role="img"
        aria-label={label}
      />
    </span>
  );
}
