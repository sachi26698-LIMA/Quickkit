"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Crop, RotateCw, X } from "lucide-react";

export type CropRect = { x: number; y: number; width: number; height: number };

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];

const MIN_SIZE = 0.04;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Keep a crop rect inside the unit square and above the minimum size. */
export function clampCrop(rect: CropRect): CropRect {
  const width = Math.min(1, Math.max(MIN_SIZE, rect.width));
  const height = Math.min(1, Math.max(MIN_SIZE, rect.height));
  return {
    width,
    height,
    x: clamp01(Math.min(rect.x, 1 - width)),
    y: clamp01(Math.min(rect.y, 1 - height)),
  };
}

export function moveCrop(
  rect: CropRect,
  handle: Handle,
  dx: number,
  dy: number,
): CropRect {
  const next = { ...rect };
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  if (handle.includes("w")) {
    const x = clamp01(Math.min(right - MIN_SIZE, rect.x + dx));
    next.width = right - x;
    next.x = x;
  }
  if (handle.includes("e")) {
    next.width = Math.max(MIN_SIZE, Math.min(1 - rect.x, rect.width + dx));
  }
  if (handle.includes("n")) {
    const y = clamp01(Math.min(bottom - MIN_SIZE, rect.y + dy));
    next.height = bottom - y;
    next.y = y;
  }
  if (handle.includes("s")) {
    next.height = Math.max(MIN_SIZE, Math.min(1 - rect.y, rect.height + dy));
  }
  return clampCrop(next);
}

/**
 * Crop/rotate a single image before OCR. The rect is normalised (0..1) so the
 * same value applies to the full-resolution pixels used by the engine and to
 * the small on-screen preview.
 */
export default function CropDialog({
  name,
  previewUrl,
  initial,
  onCancel,
  onApply,
}: {
  name: string;
  previewUrl: string;
  initial?: CropRect;
  onCancel: () => void;
  onApply: (crop: CropRect | undefined) => void;
}) {
  const [rect, setRect] = useState<CropRect>(
    initial ?? { x: 0, y: 0, width: 1, height: 1 },
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: Handle | "move";
    startX: number;
    startY: number;
    rect: CropRect;
  } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const start = (event: React.PointerEvent, handle: Handle | "move") => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      rect,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const bounds = stage.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) / Math.max(1, bounds.width);
    const dy = (event.clientY - drag.startY) / Math.max(1, bounds.height);
    if (drag.handle === "move") {
      setRect(
        clampCrop({
          ...drag.rect,
          x: clamp01(Math.min(1 - drag.rect.width, drag.rect.x + dx)),
          y: clamp01(Math.min(1 - drag.rect.height, drag.rect.y + dy)),
        }),
      );
      return;
    }
    setRect(moveCrop(drag.rect, drag.handle, dx, dy));
  };

  const end = () => {
    dragRef.current = null;
  };

  const whole =
    rect.width > 0.995 &&
    rect.height > 0.995 &&
    rect.x < 0.005 &&
    rect.y < 0.005;

  return (
    <div className="i2t-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="i2t-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="i2t-crop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="i2t-crop-title">Crop “{name}”</h2>
            <p>Choose the area to read. Only this region is sent to OCR.</p>
          </div>
          <button
            type="button"
            className="i2t-icon"
            onClick={onCancel}
            aria-label="Close crop dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div
          ref={stageRef}
          className="i2t-crop-stage"
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <img
            src={previewUrl}
            alt={`Crop source: ${name}`}
            draggable={false}
          />
          <div
            className="i2t-crop-rect"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
            }}
            onPointerDown={(event) => start(event, "move")}
            role="presentation"
          >
            {HANDLES.map((handle) => (
              <span
                key={handle}
                className={`i2t-crop-handle ${handle}`}
                onPointerDown={(event) => start(event, handle)}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <footer>
          <div className="i2t-crop-actions">
            <button
              type="button"
              className="i2t-mini"
              onClick={() => setRect({ x: 0, y: 0, width: 1, height: 1 })}
            >
              <RotateCw size={13} aria-hidden="true" /> Reset area
            </button>
            <button
              type="button"
              className="i2t-mini"
              onClick={() =>
                setRect({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 })
              }
            >
              Trim edges
            </button>
            <span className="i2t-crop-size">
              {Math.round(rect.width * 100)}% × {Math.round(rect.height * 100)}%
            </span>
          </div>
          <div className="i2t-crop-actions">
            <button type="button" className="i2t-btn ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="i2t-btn primary"
              onClick={() => onApply(whole ? undefined : rect)}
            >
              <Crop size={14} aria-hidden="true" /> Apply crop
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
