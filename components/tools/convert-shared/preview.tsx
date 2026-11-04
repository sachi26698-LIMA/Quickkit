"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  Maximize2,
} from "lucide-react";
import { formatBytes } from "@/lib/tools/download";
import {
  describePageRange,
  keepsAlpha,
  mmToPt,
  placeImage,
  resolvePage,
  type ConvertFormat,
  type ConvertSettings,
} from "@/lib/tools/image-convert";
import { renderPdfThumbnails } from "@/lib/tools/image-convert-runner";
import { sizeReportSummary } from "@/lib/tools/image-size";
import {
  formatDimensions,
  savingsLabel,
  type ConversionResult,
  type QueueItem,
} from "./types";

/** How the preview shows the work: one side, or a draggable before/after. */
export type CompareView = "source" | "result" | "slider";

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";

export function ImagePreview({
  item,
  result,
  compare,
  split,
  onSplit,
  zoom,
  fit,
  onZoom,
  onFit,
}: {
  item: QueueItem;
  result?: ConversionResult;
  compare: CompareView;
  split: number;
  onSplit: (value: number) => void;
  zoom: number;
  fit: boolean;
  onZoom: (value: number) => void;
  onFit: (value: boolean) => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const showingResult = compare === "result" && Boolean(result);
  const slider = compare === "slider" && Boolean(result);
  const source = showingResult && result ? result : null;
  const transparency =
    showingResult && result
      ? keepsAlpha(result.format as ConvertFormat)
      : keepsAlpha(item.format as ConvertFormat);

  // The browser leaves full screen on Escape, so follow its state instead of
  // keeping our own idea of it.
  useEffect(() => {
    const onChange = () =>
      setFullScreen(Boolean(document.fullscreenElement === stageRef.current));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullScreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen?.();
  };

  return (
    <div className="converter-image-preview">
      <div
        ref={stageRef}
        className={[
          "converter-stage",
          transparency ? "converter-checkerboard" : "",
          slider ? "converter-stage-slider" : "",
          fullScreen ? "converter-stage-full" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {slider && result ? (
          <>
            {/* Both layers are the real files: the divider only reveals them. */}
            <img
              src={item.url}
              alt={`Original ${item.name}`}
              className="converter-slider-layer converter-preview-fit"
              data-testid="converter-slider-before"
            />
            <img
              src={result.url}
              alt={`Converted ${result.name}`}
              className="converter-slider-layer converter-preview-fit"
              style={{ clipPath: `inset(0 0 0 ${split}%)` }}
              data-testid="converter-slider-after"
            />
            <span
              className="converter-slider-line"
              style={{ left: `${split}%` }}
              aria-hidden="true"
            />
            <span className="converter-slider-tag left">Original</span>
            <span className="converter-slider-tag right">Converted</span>
          </>
        ) : (
          <img
            src={source ? source.url : item.url}
            alt={`${showingResult ? "Converted" : "Original"} preview of ${item.name}`}
            className={fit ? "converter-preview-fit" : undefined}
            style={fit ? undefined : { width: `${zoom}%` }}
            data-testid="converter-preview-image"
          />
        )}
      </div>
      {slider ? (
        <div className="converter-zoom">
          <label htmlFor="converter-split">Before / after</label>
          <input
            id="converter-split"
            type="range"
            min={0}
            max={100}
            step={1}
            value={split}
            data-testid="converter-split"
            onChange={(event) => onSplit(Number(event.target.value))}
          />
          <output>{split}%</output>
          <button
            type="button"
            className="converter-edit-button"
            onClick={toggleFullScreen}
            aria-pressed={fullScreen}
          >
            <Maximize2 size={14} aria-hidden="true" />
            {fullScreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      ) : null}
      <div className="converter-zoom" hidden={slider}>
        <label htmlFor="converter-zoom">Zoom</label>
        <input
          id="converter-zoom"
          type="range"
          min={50}
          max={300}
          step={10}
          value={zoom}
          disabled={fit}
          onChange={(event) => onZoom(Number(event.target.value))}
        />
        <output>{fit ? "Fit" : `${zoom}%`}</output>
        <label className="converter-fit">
          <input
            type="checkbox"
            checked={fit}
            onChange={(event) => onFit(event.target.checked)}
          />
          Fit to panel
        </label>
        <button
          type="button"
          className="converter-edit-button"
          onClick={toggleFullScreen}
          aria-pressed={fullScreen}
        >
          <Maximize2 size={14} aria-hidden="true" />
          {fullScreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
      <div className="converter-detail-grid">
        <span>Original</span>
        <strong>
          {formatDimensions(item.width, item.height)} ·{" "}
          {formatBytes(item.bytes)}
        </strong>
        <span>Converted</span>
        <strong>
          {result
            ? `${formatDimensions(result.width, result.height)} · ${formatBytes(result.blob.size)}`
            : "Not converted yet"}
        </strong>
        {result ? (
          <>
            <span>Change</span>
            <strong>
              {savingsLabel(result.sourceBytes, result.blob.size)}
            </strong>
          </>
        ) : null}
      </div>
      {result?.size ? (
        <div
          className={
            result.size.warning
              ? "converter-size-report warning"
              : "converter-size-report"
          }
          data-testid="converter-size-report"
        >
          <strong>
            {result.size.lossless
              ? "Lossless output — no quality was lost"
              : `Lossy output at quality ${result.size.quality}%`}
          </strong>
          <ul>
            <li>{sizeReportSummary(result.size, result.size.target)}</li>
            {result.size.warning ? <li>{result.size.warning}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ExportedPageNav({
  results,
  current,
  onSelect,
}: {
  results: ConversionResult[];
  current: ConversionResult;
  onSelect: (page: number) => void;
}) {
  const index = results.findIndex((entry) => entry.id === current.id);
  return (
    <div
      className="converter-pagenav"
      role="group"
      aria-label="Exported page navigation"
    >
      <button
        type="button"
        className="converter-icon-button"
        onClick={() => onSelect(results[index - 1].page ?? 1)}
        disabled={index <= 0}
        aria-label="Previous exported page"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span className="converter-pagecount">
        Page {current.page ?? "—"} · {index + 1} of {results.length}
      </span>
      <button
        type="button"
        className="converter-icon-button"
        onClick={() => onSelect(results[index + 1].page ?? 1)}
        disabled={index < 0 || index >= results.length - 1}
        aria-label="Next exported page"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function PageNav({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const max = Math.max(1, pageCount);
  return (
    <div
      className="converter-pagenav"
      role="group"
      aria-label="Page navigation"
    >
      <button
        type="button"
        className="converter-icon-button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <label className="converter-pagefield">
        <span>Page</span>
        <input
          type="number"
          min={1}
          max={max}
          value={page}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next))
              onChange(Math.min(max, Math.max(1, next)));
          }}
          aria-label="Page number"
        />
        <span>of {max}</span>
      </label>
      <button
        type="button"
        className="converter-icon-button"
        onClick={() => onChange(Math.min(max, page + 1))}
        disabled={page >= max}
        aria-label="Next page"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function PdfGallery({
  blob,
  pageCount,
  page,
  onPage,
  selectedPages,
  title,
}: {
  blob: Blob;
  pageCount: number;
  page: number;
  onPage: (page: number) => void;
  selectedPages?: number[] | null;
  title: string;
}) {
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [failure, setFailure] = useState<{ key: string; message: string }>({
    key: "",
    message: "",
  });
  const urlsRef = useRef<string[]>([]);
  const loadedRef = useRef<Set<number>>(new Set());
  // Show a moving window of six thumbnails around the current page so large
  // documents stay navigable without rendering every page at once.
  const windowStart =
    pageCount <= 6 ? 1 : Math.min(Math.max(1, page - 2), pageCount - 5);
  const thumbPages = Array.from(
    { length: Math.min(6, pageCount) },
    (_, index) => windowStart + index,
  );
  const requestKey = `${pageCount}:${windowStart}`;
  const shown = thumbs[page];
  const error = failure.key === requestKey ? failure.message : "";
  const loading = !shown && !error;

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.length = 0;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pages = Array.from(
      { length: Math.min(6, pageCount) },
      (_, index) => windowStart + index,
    ).filter((value) => !loadedRef.current.has(value));
    if (!pages.length) return () => undefined;
    renderPdfThumbnails(blob, pages, { maxWidth: 900 }, (thumb) => {
      if (cancelled) return;
      loadedRef.current.add(thumb.page);
      const url = URL.createObjectURL(thumb.blob);
      urlsRef.current.push(url);
      setThumbs((previous) => ({ ...previous, [thumb.page]: url }));
    }).catch((caught) => {
      if (cancelled) return;
      setFailure({ key: requestKey, message: errorMessage(caught) });
    });
    return () => {
      cancelled = true;
    };
  }, [blob, pageCount, windowStart, requestKey]);

  return (
    <div className="converter-pdfgallery">
      <div className="converter-stage converter-stage-pdf" aria-busy={loading}>
        {shown ? (
          <img
            src={shown}
            alt={`${title}, page ${page}`}
            data-testid="converter-pdf-page"
          />
        ) : (
          <div className="converter-empty compact">
            {loading ? (
              <>
                <Loader2
                  size={24}
                  className="converter-spin"
                  aria-hidden="true"
                />
                <strong>Rendering page {page}…</strong>
              </>
            ) : (
              <>
                <AlertCircle size={24} aria-hidden="true" />
                <strong>Preview unavailable</strong>
                <p>{error || "This page could not be rendered."}</p>
              </>
            )}
          </div>
        )}
      </div>
      <div className="converter-thumbs" aria-label="Page thumbnails">
        {thumbPages.map((value) => {
          const selected = selectedPages?.includes(value);
          return (
            <button
              key={value}
              type="button"
              className={
                value === page
                  ? "converter-thumb-button active"
                  : selected
                    ? "converter-thumb-button in-range"
                    : "converter-thumb-button"
              }
              onClick={() => onPage(value)}
              aria-label={`Show page ${value}${
                selected ? " (in the export range)" : ""
              }`}
              aria-current={value === page ? "page" : undefined}
            >
              {thumbs[value] ? (
                <img src={thumbs[value]} alt="" />
              ) : (
                <span className="converter-thumb-loading" />
              )}
              <small>{value}</small>
              {selected ? (
                <span className="converter-thumb-flag">Selected</span>
              ) : null}
            </button>
          );
        })}
        {pageCount > 6 ? (
          <span className="converter-thumb-more">+{pageCount - 6} more</span>
        ) : null}
      </div>
      <PageNav page={page} pageCount={pageCount} onChange={onPage} />
      <p className="converter-hint">
        {selectedPages
          ? `${selectedPages.length} page${selectedPages.length === 1 ? "" : "s"} in the export range (${describePageRange(selectedPages)}).`
          : "Preview rendered locally from the real PDF with PDF.js."}
      </p>
    </div>
  );
}

/** Snap an angle to the nearest clockwise quarter turn. */
function normalizeQuarter(value: number): 0 | 90 | 180 | 270 {
  if (!Number.isFinite(value)) return 0;
  const steps = Math.round((((value % 360) + 360) % 360) / 90) % 4;
  return ([0, 90, 180, 270] as const)[steps];
}

export function PdfLayoutPreview({
  item,
  settings,
}: {
  item: QueueItem;
  settings: ConvertSettings;
}) {
  if (!item.width || !item.height) {
    return (
      <div className="converter-empty">
        <Layers size={30} aria-hidden="true" />
        <strong>Reading the image…</strong>
        <p>The layout preview appears as soon as the dimensions are known.</p>
      </div>
    );
  }
  const page = resolvePage(
    settings.pdfMake.pageSize,
    settings.pdfMake.orientation,
    settings.pdfMake.customWidthMm,
    settings.pdfMake.customHeightMm,
  );
  const marginPt = mmToPt(settings.pdfMake.marginMm);
  // The engine rotates the pixels before it fits them, so the preview has to
  // plan against the turned aspect ratio or it shows a different layout than
  // the PDF will get.
  const rotation = normalizeQuarter(item.rotation ?? 0);
  const swap = rotation === 90 || rotation === 270;
  const sourceWidth = swap ? item.height : item.width;
  const sourceHeight = swap ? item.width : item.height;
  const placement = placeImage(
    sourceWidth,
    sourceHeight,
    page.widthPt,
    page.heightPt,
    marginPt,
    settings.pdfMake.fit,
  );
  const top =
    ((page.heightPt - placement.y - placement.height) / page.heightPt) * 100;
  const aspect = page.widthPt / page.heightPt;
  const boxWidth = (placement.width / page.widthPt) * 100;
  const boxHeight = (placement.height / page.heightPt) * 100;
  // A turned image is laid out at its own (unturned) size and rotated about
  // the centre of the box it lands in, so the two agree pixel for pixel.
  const imageStyle =
    rotation === 0
      ? {
          left: `${(placement.x / page.widthPt) * 100}%`,
          top: `${top}%`,
          width: `${boxWidth}%`,
          height: `${boxHeight}%`,
        }
      : {
          left: `${((placement.x + placement.width / 2) / page.widthPt) * 100}%`,
          top: `${((page.heightPt - placement.y - placement.height / 2) / page.heightPt) * 100}%`,
          width: `${boxHeight / aspect}%`,
          height: `${boxWidth * aspect}%`,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        };
  return (
    <div className="converter-layout-preview">
      <div
        className="converter-page"
        style={{
          aspectRatio: `${page.widthPt} / ${page.heightPt}`,
          background: settings.pdfMake.background,
        }}
      >
        <img
          src={item.url}
          alt={`Page layout preview for ${item.name}`}
          style={{
            ...imageStyle,
            objectFit: settings.pdfMake.fit === "fill" ? "fill" : "cover",
          }}
        />
        <span
          className="converter-page-margin"
          style={{
            left: `${(marginPt / page.widthPt) * 100}%`,
            right: `${(marginPt / page.widthPt) * 100}%`,
            top: `${(marginPt / page.heightPt) * 100}%`,
            bottom: `${(marginPt / page.heightPt) * 100}%`,
          }}
        />
      </div>
      <p className="converter-hint">
        Live layout preview · {page.label} {settings.pdfMake.orientation} ·{" "}
        {page.widthMm} × {page.heightMm} mm · {settings.pdfMake.marginMm} mm
        margin · {settings.pdfMake.fit} fit
        {rotation === 0 ? "" : ` · turned ${rotation}°`}
      </p>
    </div>
  );
}
