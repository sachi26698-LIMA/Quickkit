"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  PanelLeft,
  RefreshCw,
  RotateCw,
  Search,
  FileText,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  openPdfPreview,
  type PdfPreviewHandle,
} from "@/lib/tools/pdf-to-word/preview-pdf";
import { searchPdf } from "@/lib/tools/word-to-pdf/search-pdf";
import { orderedPages, type Settings } from "@/lib/tools/word-to-pdf/settings";
import OriginalPane from "./original-pane";
import styles from "./word-to-pdf.module.css";

type Loaded = { bytes: Uint8Array; handle: PdfPreviewHandle };
function usePdf(bytes?: Uint8Array) {
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [failure, setFailure] = useState<{
      bytes: Uint8Array;
      message: string;
    } | null>(null);
  useEffect(() => {
    if (!bytes) return;
    let disposed = false,
      handle: PdfPreviewHandle | undefined;
    void openPdfPreview(bytes, true)
      .then((value) => {
        handle = value;
        if (disposed) void value.destroy();
        else setLoaded({ bytes, handle: value });
      })
      .catch(() => {
        if (!disposed)
          setFailure({
            bytes,
            message:
              "This PDF could not be opened. Retry conversion or inspect an individual download.",
          });
      });
    return () => {
      disposed = true;
      void handle?.destroy();
    };
  }, [bytes]);
  return {
    handle: loaded && loaded.bytes === bytes ? loaded.handle : undefined,
    error: failure && failure.bytes === bytes ? failure.message : "",
  };
}
function Thumb({
  handle,
  page,
  selected,
  onSelect,
}: {
  handle: PdfPreviewHandle;
  page: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    let dead = false,
      current = "";
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void handle.renderThumbnail(page, 90).then((value) => {
        if (!value) return;
        if (dead) URL.revokeObjectURL(value);
        else {
          current = value;
          setUrl(value);
        }
      });
    });
    if (ref.current) observer.observe(ref.current);
    return () => {
      dead = true;
      observer.disconnect();
      if (current) URL.revokeObjectURL(current);
    };
  }, [handle, page]);
  return (
    <button
      ref={ref}
      className={`${styles.thumb} ${selected ? styles.selectedThumb : ""}`}
      aria-label={`Go to page ${page}`}
      aria-current={selected ? "page" : undefined}
      onClick={onSelect}
    >
      {url ? (
        <Image
          unoptimized
          src={url}
          alt={`Page ${page} thumbnail`}
          width={90}
          height={125}
        />
      ) : (
        <span className={styles.thumbPending}>Rendering…</span>
      )}
      <span>{page}</span>
    </button>
  );
}
function PdfCanvas({
  handle,
  page,
  zoom,
  label,
}: {
  handle?: PdfPreviewHandle;
  page: number;
  zoom: string;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState<{
    handle: PdfPreviewHandle;
    page: number;
    zoom: string;
    width: number;
    target: number;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!handle || !canvas.current || !size.width) return;
    let cancelled = false;
    void (async () => {
      try {
        const pageSize = await handle.pageSize(page);
        const target =
          zoom === "fit-width"
            ? Math.max(80, size.width - 52)
            : zoom === "fit-page"
              ? Math.max(
                  80,
                  Math.min(
                    size.width - 52,
                    ((size.height - 44) * pageSize.widthPt) / pageSize.heightPt,
                  ),
                )
              : (((pageSize.widthPt * 96) / 72) * Number(zoom)) / 100;
        if (cancelled || !canvas.current) return;
        const result = await handle.renderPage(
          page,
          canvas.current,
          target * Math.min(2, window.devicePixelRatio || 1),
        );
        if (!cancelled)
          setRendered({
            handle,
            page,
            zoom,
            width: size.width,
            target,
            ...(!result
              ? { error: "Page rendering failed. Try refreshing this preview." }
              : {}),
          });
      } catch {
        if (!cancelled)
          setRendered({
            handle,
            page,
            zoom,
            width: size.width,
            target: 0,
            error: "Page rendering failed. Try refreshing this preview.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, page, zoom, size.width, size.height]);
  const matches =
    rendered?.handle === handle &&
    rendered?.page === page &&
    rendered?.zoom === zoom &&
    rendered?.width === size.width;
  return (
    <div className={styles.canvasStage} ref={container}>
      {(!matches || !handle) && (
        <div className={styles.skeleton} role="status">
          <span />
          Rendering page…
        </div>
      )}
      {matches && rendered?.error && (
        <p role="alert" className={styles.error}>
          {rendered.error}
        </p>
      )}
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        style={{
          visibility: matches && !rendered?.error ? "visible" : "hidden",
          width: rendered?.target || 1,
        }}
      />
    </div>
  );
}
export default function StudioPreview({
  bytes,
  base,
  file,
  sourcePages,
  settings,
  stale,
  loading,
  onRotate,
  onRefresh,
  canRefresh,
}: {
  bytes?: Uint8Array;
  base?: Uint8Array;
  file?: File;
  sourcePages?: number;
  settings: Settings;
  stale: boolean;
  loading: boolean;
  onRotate: () => void;
  onRefresh: () => void;
  canRefresh: boolean;
}) {
  const { handle, error } = usePdf(bytes);
  const [comparison, setComparison] = useState("pdf");
  const before = usePdf(comparison === "before" ? base : undefined);
  const [page, setPage] = useState(1),
    [zoom, setZoom] = useState("fit-page"),
    [thumbs, setThumbs] = useState(false);
  const [expanded, setExpanded] = useState(false),
    [query, setQuery] = useState(""),
    [searchState, setSearchState] = useState(""),
    [hits, setHits] = useState<number[]>([]);
  const [searchSource, setSearchSource] = useState<Uint8Array | undefined>();
  const searchControl = useRef<AbortController | null>(null),
    root = useRef<HTMLDivElement>(null),
    fullButton = useRef<HTMLButtonElement>(null);
  const currentPage = Math.min(page, handle?.pageCount || 1);
  useEffect(() => {
    searchControl.current?.abort();
    return () => searchControl.current?.abort();
  }, [bytes]);
  useEffect(() => {
    if (!expanded) return;
    const opener = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fullButton.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      opener?.focus();
    };
  }, [expanded]);
  // Full-viewport workspace mode works in embedded previews and mobile browsers
  // without browser Fullscreen API permission or asynchronous enter/exit races.
  function fullscreen() {
    setExpanded((value) => !value);
  }
  async function search() {
    if (!bytes || !query.trim()) return;
    searchControl.current?.abort();
    const control = new AbortController();
    searchControl.current = control;
    setSearchSource(bytes);
    setSearchState("Searching text…");
    setHits([]);
    try {
      const result = await searchPdf(bytes, query, control.signal);
      if (control.signal.aborted) return;
      setHits(result);
      setSearchState(
        result.length
          ? `${result.length} matching pages`
          : "No matching text. Scanned images are not searched (no OCR).",
      );
      if (result[0]) setPage(result[0]);
    } catch {
      if (!control.signal.aborted)
        setSearchState(
          "Search failed. This PDF may not have a readable text layer.",
        );
    }
  }
  let sourcePage = currentPage;
  try {
    if (sourcePages)
      sourcePage =
        (orderedPages(settings, sourcePages)[currentPage - 1] ??
          currentPage - 1) + 1;
  } catch {
    /* retain previous visible page while settings are invalid */
  }
  return (
    <div
      ref={root}
      className={`${styles.previewWorkspace} ${expanded ? styles.expanded : ""}`}
      role={expanded ? "dialog" : "region"}
      aria-modal={expanded || undefined}
      aria-label="PDF page preview"
      onKeyDown={(e) => {
        if (!expanded || e.key !== "Tab") return;
        const items = e.currentTarget.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled)",
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={styles.previewTop}>
        <div>
          <span className={styles.eyebrow}>DOCUMENT PREVIEW</span>
          <strong>{file?.name || "Your document, in focus"}</strong>
        </div>
        <span className={styles.statusPill}>
          {loading
            ? "Updating…"
            : stale
              ? "Update required"
              : bytes
                ? "Export synchronized"
                : "Awaiting conversion"}
        </span>
      </div>
      <div className={styles.viewerToolbar}>
        <button
          aria-label="Toggle page thumbnails"
          aria-pressed={thumbs}
          onClick={() => setThumbs((v) => !v)}
          disabled={!handle}
        >
          <PanelLeft size={16} />
        </button>
        <button
          aria-label="Previous page"
          disabled={!handle || currentPage <= 1}
          onClick={() => setPage(currentPage - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <label className={styles.pageInput}>
          Page
          <input
            aria-label="Preview page number"
            type="number"
            min={1}
            max={handle?.pageCount || 1}
            value={currentPage}
            disabled={!handle}
            onChange={(e) =>
              setPage(
                Math.max(
                  1,
                  Math.min(handle?.pageCount || 1, Number(e.target.value) || 1),
                ),
              )
            }
          />
          <span>of {handle?.pageCount || "—"}</span>
        </label>
        <button
          aria-label="Next page"
          disabled={!handle || currentPage >= handle.pageCount}
          onClick={() => setPage(currentPage + 1)}
        >
          <ChevronRight size={16} />
        </button>
        <span className={styles.toolDivider} />
        <button
          aria-label="Zoom out"
          disabled={!handle}
          onClick={() =>
            setZoom(String(Math.max(25, (Number(zoom) || 100) - 25)))
          }
        >
          <ZoomOut size={16} />
        </button>
        <select
          aria-label="Preview zoom"
          value={zoom}
          disabled={!handle}
          onChange={(e) => setZoom(e.target.value)}
        >
          <option value="fit-page">Fit page</option>
          <option value="fit-width">Fit width</option>
          {[25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300].map(
            (v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ),
          )}
        </select>
        <button
          aria-label="Zoom in"
          disabled={!handle}
          onClick={() =>
            setZoom(String(Math.min(300, (Number(zoom) || 100) + 25)))
          }
        >
          <ZoomIn size={16} />
        </button>
        <button
          aria-label="Rotate output pages clockwise"
          disabled={!bytes || loading}
          onClick={onRotate}
        >
          <RotateCw size={16} />
        </button>
        <button
          aria-label="Refresh preview"
          disabled={!canRefresh || loading}
          onClick={onRefresh}
        >
          <RefreshCw size={16} />
        </button>
        <button
          ref={fullButton}
          aria-label={expanded ? "Exit fullscreen" : "Fullscreen preview"}
          onClick={() => void fullscreen()}
        >
          {expanded ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
      <div className={styles.compareBar}>
        <select
          aria-label="Comparison view"
          value={comparison}
          onChange={(e) => setComparison(e.target.value)}
        >
          <option value="pdf">Converted PDF</option>
          <option value="docx" disabled={!file}>
            Original DOCX / PDF
          </option>
          <option value="before" disabled={!base}>
            Before / after PDF
          </option>
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input
            aria-label="Search PDF text"
            placeholder="Search PDF text…"
            maxLength={120}
            value={query}
            disabled={!bytes}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button aria-label="Search text" disabled={!bytes || !query.trim()}>
            <Search size={15} />
          </button>
        </form>
      </div>
      {searchSource === bytes && searchState && (
        <div className={styles.searchResults} role="status">
          {searchState}
          {hits.map((hit) => (
            <button key={hit} onClick={() => setPage(hit)}>
              Page {hit}
            </button>
          ))}
        </div>
      )}
      {stale && bytes && (
        <p className={styles.staleNote}>
          Showing the last PDF. Apply valid settings and refresh native layout
          if needed before export. No automatic uploads unless enabled.
        </p>
      )}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : bytes ? (
        <div className={styles.viewerBody}>
          {thumbs && handle && (
            <aside className={styles.thumbRail} aria-label="Page thumbnails">
              {Array.from({ length: handle.pageCount }, (_, i) => (
                <Thumb
                  key={i}
                  handle={handle}
                  page={i + 1}
                  selected={i + 1 === currentPage}
                  onSelect={() => setPage(i + 1)}
                />
              ))}
            </aside>
          )}
          <div
            className={`${styles.comparison} ${comparison !== "pdf" ? styles.splitView : ""}`}
          >
            {comparison === "docx" && file && <OriginalPane file={file} />}
            {comparison === "before" && (
              <div className={styles.pdfPanel}>
                <div className={styles.compareLabel}>
                  BEFORE <span>Native PDF · source page {sourcePage}</span>
                </div>
                {before.error ? (
                  <p role="alert">{before.error}</p>
                ) : (
                  <PdfCanvas
                    handle={before.handle}
                    page={sourcePage}
                    zoom={zoom}
                    label={`Before PDF page ${sourcePage}`}
                  />
                )}
              </div>
            )}
            <div className={styles.pdfPanel}>
              {comparison !== "pdf" && (
                <div className={styles.compareLabel}>
                  AFTER <span>Exact export bytes</span>
                </div>
              )}
              <PdfCanvas
                handle={handle}
                page={currentPage}
                zoom={zoom}
                label={`Converted PDF page ${currentPage}`}
              />
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className={styles.skeleton} role="status">
          <span />
          Waiting for the conversion engine…
        </div>
      ) : (
        <div className={styles.previewEmpty}>
          <div className={styles.emptyIcon}>
            <FileText size={36} strokeWidth={1.25} />
          </div>
          <h2>A clear view of your next PDF.</h2>
          <p>
            Add a Word document, choose your settings,
            <br />
            then convert to see the actual rendered pages.
          </p>
          <span>No simulated pages. No silent uploads.</span>
        </div>
      )}
      <div className={styles.previewFoot}>
        <span>
          {bytes
            ? "PDF.js · actual PDF rendering"
            : "Preview appears after successful conversion"}
        </span>
        <span>Native cap: 100 pages · not 1,000-page tested</span>
      </div>
    </div>
  );
}
