"use client";
import { useEffect, useRef, useState } from "react";
import {
  openPdfPreview,
  type PdfPreviewHandle,
} from "@/lib/tools/pdf-to-word/preview-pdf";
import { PdfToWordError } from "@/lib/tools/pdf-to-word/types";

export type ZoomSpec =
  | { kind: "fit-width" }
  | { kind: "fit-page" }
  | { kind: "percent"; value: number };

export const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

export function zoomLabel(spec: ZoomSpec): string {
  if (spec.kind === "fit-width") return "Fit width";
  if (spec.kind === "fit-page") return "Fit page";
  return `${spec.value}%`;
}

export function stepZoom(
  spec: ZoomSpec,
  direction: 1 | -1,
  effectivePercent?: number,
): ZoomSpec {
  // From a fit mode, step relative to the zoom actually on screen so "+"
  // never visually shrinks the page on wide screens.
  const current =
    spec.kind === "percent" ? spec.value : (effectivePercent ?? 100);
  const next =
    direction === 1
      ? ZOOM_STEPS.find((s) => s > current + 0.5)
      : [...ZOOM_STEPS].reverse().find((s) => s < current - 0.5);
  return {
    kind: "percent",
    value: next ?? (direction === 1 ? 200 : 50),
  };
}

const PT_TO_CSS_PX = 96 / 72;
const STAGE_PADDING = 36;

interface ThumbProps {
  handle: PdfPreviewHandle;
  pageNo: number;
  active: boolean;
  onSelect: (page: number) => void;
}

function Thumb({ handle, pageNo, active, onSelect }: ThumbProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        void handle.renderThumbnail(pageNo).then((generated) => {
          if (cancelled) {
            if (generated) URL.revokeObjectURL(generated);
            return;
          }
          objectUrl = generated;
          setUrl(generated);
        });
      },
      { rootMargin: "160px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [handle, pageNo]);

  return (
    <button
      ref={ref}
      type="button"
      className={`p2wv-thumb${active ? " active" : ""}`}
      aria-label={`Go to page ${pageNo}`}
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(pageNo)}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL from the user's own file
        <img src={url} alt="" draggable={false} />
      ) : (
        <span className="p2wv-thumb-skeleton" aria-hidden="true" />
      )}
      <span className="p2wv-thumb-no">{pageNo}</span>
    </button>
  );
}

export interface PdfPaneProps {
  file: File;
  page: number;
  zoom: ZoomSpec;
  rotation: number;
  showThumbnails: boolean;
  onPageChange: (page: number) => void;
  onPageCount: (count: number) => void;
  /** Reports the zoom percentage actually on screen after each render. */
  onEffectiveZoom?: (percent: number) => void;
}

export default function PdfPane({
  file,
  page,
  zoom,
  rotation,
  showThumbnails,
  onPageChange,
  onPageCount,
  onEffectiveZoom,
}: PdfPaneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handle, setHandle] = useState<PdfPreviewHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Reset when a different file is shown (derived-state-during-render).
  const [prevFile, setPrevFile] = useState(file);
  if (file !== prevFile) {
    setPrevFile(file);
    setHandle(null);
    setError(null);
    setRendered(false);
  }

  // Open the document once per file; destroy on switch/unmount.
  useEffect(() => {
    let cancelled = false;
    let opened: PdfPreviewHandle | null = null;
    void (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        opened = await openPdfPreview(bytes);
        if (cancelled) {
          await opened.destroy();
          return;
        }
        setHandle(opened);
        onPageCount(opened.pageCount);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof PdfToWordError
              ? err.message
              : "This PDF could not be opened for preview.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      void opened?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per file identity
  }, [file]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setStageSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render the current page whenever inputs change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!handle || !canvas || stageSize.width === 0) return;
    let cancelled = false;
    void (async () => {
      const size = await handle.pageSize(page, rotation);
      if (cancelled) return;
      const availW = Math.max(80, stageSize.width - STAGE_PADDING);
      const availH = Math.max(80, stageSize.height - STAGE_PADDING);
      let cssWidth: number;
      if (zoom.kind === "fit-width") cssWidth = availW;
      else if (zoom.kind === "fit-page")
        cssWidth = Math.min(availW, availH * (size.widthPt / size.heightPt));
      else cssWidth = size.widthPt * PT_TO_CSS_PX * (zoom.value / 100);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${Math.round(cssWidth)}px`;
      canvas.style.height = `${Math.round(cssWidth * (size.heightPt / size.widthPt))}px`;
      const result = await handle.renderPage(
        page,
        canvas,
        cssWidth * dpr,
        rotation,
      );
      if (!cancelled && result) {
        setRendered(true);
        onEffectiveZoom?.((cssWidth / (size.widthPt * PT_TO_CSS_PX)) * 100);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, page, zoom, rotation, stageSize, onEffectiveZoom]);

  if (error) {
    return (
      <div className="p2wv-pane">
        <p className="p2wv-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="p2wv-pane">
      {showThumbnails && handle && (
        <div className="p2wv-thumbs" aria-label="Page thumbnails" tabIndex={0}>
          {Array.from({ length: handle.pageCount }, (_, i) => i + 1).map(
            (pageNo) => (
              <Thumb
                key={pageNo}
                handle={handle}
                pageNo={pageNo}
                active={pageNo === page}
                onSelect={onPageChange}
              />
            ),
          )}
        </div>
      )}
      <div
        className="p2wv-stage"
        ref={stageRef}
        tabIndex={0}
        aria-label="PDF page view"
      >
        {!rendered && (
          <div className="p2wv-skeleton" aria-hidden="true">
            <span />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="p2wv-canvas"
          role="img"
          aria-label={`PDF page ${page}`}
          style={rendered ? undefined : { visibility: "hidden" }}
        />
      </div>
    </div>
  );
}
