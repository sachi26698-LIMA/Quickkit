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

const thumbCache = new Map<
  string,
  { width: number; rgba: Uint8ClampedArray }
>();

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
  const key = JSON.stringify([payload, design, size]);
  const cachedBitmap = thumbCache.get(key) ?? null;
  const [asyncSlot, setAsyncSlot] = useState<{
    key: string;
    bitmap: { width: number; rgba: Uint8ClampedArray } | null;
  } | null>(null);
  const bitmap =
    cachedBitmap ?? (asyncSlot?.key === key ? asyncSlot.bitmap : null);
  useEffect(() => {
    if (thumbCache.has(key)) return;
    let cancelled = false;
    void renderQr({
      payload,
      design: { ...defaultDesign(), ...design, size, margin: 2 },
      artifacts: { preview: size },
    })
      .then((out) => {
        if (!out.preview) return;
        const entry = {
          width: out.preview.width,
          rgba: out.preview.rgba,
        };
        if (thumbCache.size < 200) thumbCache.set(key, entry);
        if (!cancelled) setAsyncSlot({ key, bitmap: entry });
      })
      .catch(() => {
        if (!cancelled) setAsyncSlot({ key, bitmap: null });
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
