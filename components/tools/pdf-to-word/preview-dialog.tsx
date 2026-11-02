"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Download,
  FileText,
  Maximize,
  Minus,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import PdfPane, { stepZoom, zoomLabel, type ZoomSpec } from "./pdf-pane";
import DocxPane from "./docx-pane";

export interface PreviewTarget {
  /** Source PDF file (null for history items — originals are never stored). */
  file: File | null;
  sourceName: string;
  sourceMeta: string;
  resultBlob: Blob | null;
  /** Ready-made object URL for the result when the caller manages one. */
  resultUrl?: string | null;
  resultName: string | null;
  resultMeta: string | null;
}

export type PreviewView = "pdf" | "docx" | "compare";

interface PreviewDialogProps {
  target: PreviewTarget;
  initialView: PreviewView;
  onClose: () => void;
  onRemove?: () => void;
  onReplace?: (file: File) => void;
}

interface ZoomControlsProps {
  label: string;
  spec: ZoomSpec;
  onChange: (z: ZoomSpec) => void;
  getEffective: () => number;
}

function ZoomControls({
  label,
  spec,
  onChange,
  getEffective,
}: ZoomControlsProps) {
  return (
    <span className="p2wv-zoom" role="group" aria-label={`${label} zoom`}>
      <button
        type="button"
        className="p2wv-tbtn"
        aria-label={`${label} zoom out`}
        onClick={() => onChange(stepZoom(spec, -1, getEffective()))}
      >
        <Minus size={14} aria-hidden="true" />
      </button>
      <span className="p2wv-zoom-label" aria-live="polite">
        {zoomLabel(spec)}
      </span>
      <button
        type="button"
        className="p2wv-tbtn"
        aria-label={`${label} zoom in`}
        onClick={() => onChange(stepZoom(spec, 1, getEffective()))}
      >
        <Plus size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`p2wv-tbtn p2wv-tbtn-text${spec.kind === "fit-width" ? " on" : ""}`}
        aria-pressed={spec.kind === "fit-width"}
        onClick={() => onChange({ kind: "fit-width" })}
      >
        Fit W
      </button>
      <button
        type="button"
        className={`p2wv-tbtn p2wv-tbtn-text${spec.kind === "fit-page" ? " on" : ""}`}
        aria-pressed={spec.kind === "fit-page"}
        onClick={() => onChange({ kind: "fit-page" })}
      >
        Fit P
      </button>
    </span>
  );
}

export default function PreviewDialog({
  target,
  initialView,
  onClose,
  onRemove,
  onReplace,
}: PreviewDialogProps) {
  const hasPdf = target.file !== null;
  const hasDocx = target.resultBlob !== null;
  const [view, setView] = useState<PreviewView>(
    initialView === "pdf" && !hasPdf
      ? "docx"
      : initialView === "docx" && !hasDocx
        ? "pdf"
        : initialView === "compare" && (!hasPdf || !hasDocx)
          ? hasDocx
            ? "docx"
            : "pdf"
          : initialView,
  );
  const [page, setPage] = useState(1);
  const [pdfCount, setPdfCount] = useState(0);
  const [docxCount, setDocxCount] = useState(0);
  const [pdfZoom, setPdfZoom] = useState<ZoomSpec>({ kind: "fit-width" });
  const [docxZoom, setDocxZoom] = useState<ZoomSpec>({ kind: "fit-width" });
  const [rotation, setRotation] = useState(0);
  const [wide, setWide] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const ownDownloadUrl = useMemo(
    () =>
      target.resultBlob && !target.resultUrl
        ? URL.createObjectURL(target.resultBlob)
        : null,
    [target.resultBlob, target.resultUrl],
  );
  useEffect(
    () => () => {
      if (ownDownloadUrl) URL.revokeObjectURL(ownDownloadUrl);
    },
    [ownDownloadUrl],
  );
  const downloadUrl = target.resultUrl ?? ownDownloadUrl;

  const pdfEffectiveRef = useRef(100);
  const docxEffectiveRef = useRef(100);
  const reportPdfZoom = useCallback((pct: number) => {
    pdfEffectiveRef.current = pct;
  }, []);
  const reportDocxZoom = useCallback((pct: number) => {
    docxEffectiveRef.current = pct;
  }, []);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const effectiveView: PreviewView =
    view === "compare" && (!wide || !hasPdf || !hasDocx)
      ? hasDocx
        ? "docx"
        : "pdf"
      : view === "docx" && !hasDocx
        ? "pdf"
        : view === "pdf" && !hasPdf
          ? "docx"
          : view;
  const totalPages = effectiveView === "docx" ? docxCount : pdfCount;
  const clampedPage = Math.min(
    page,
    Math.max(1, effectiveView === "docx" ? docxCount || 1 : pdfCount || page),
  );

  const goToPage = useCallback(
    (next: number) => {
      const max = Math.max(1, pdfCount, docxCount);
      setPage(Math.min(Math.max(1, next), max));
    },
    [pdfCount, docxCount],
  );

  // Reset to page 1 when the underlying file is replaced
  // (derived-state-during-render).
  const [prevFile, setPrevFile] = useState(target.file);
  if (target.file !== prevFile) {
    setPrevFile(target.file);
    setPage(1);
    setRotation(0);
  }

  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Focus management + body scroll lock.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void dialogRef.current?.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToPage(page + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPage(page - 1);
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      if (effectiveView !== "docx")
        setPdfZoom((z) => stepZoom(z, 1, pdfEffectiveRef.current));
      if (effectiveView !== "pdf")
        setDocxZoom((z) => stepZoom(z, 1, docxEffectiveRef.current));
    } else if (e.key === "-") {
      e.preventDefault();
      if (effectiveView !== "docx")
        setPdfZoom((z) => stepZoom(z, -1, pdfEffectiveRef.current));
      if (effectiveView !== "pdf")
        setDocxZoom((z) => stepZoom(z, -1, docxEffectiveRef.current));
    }
  };

  const showPdf = hasPdf && effectiveView !== "docx";
  const showDocx = hasDocx && effectiveView !== "pdf";

  return (
    <div
      className="p2wv-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="p2wv-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${target.sourceName}`}
        onKeyDown={onKeyDown}
      >
        <div className="p2wv-toolbar">
          <div className="p2wv-title">
            <FileText size={18} aria-hidden="true" />
            <span className="p2wv-title-text">
              <strong title={target.sourceName}>{target.sourceName}</strong>
              <small>
                {target.sourceMeta}
                {target.resultMeta ? `  →  ${target.resultMeta}` : ""}
              </small>
            </span>
          </div>

          <div
            className="p2wv-view-switch"
            role="tablist"
            aria-label="Preview view"
          >
            {hasPdf && (
              <button
                type="button"
                role="tab"
                aria-selected={effectiveView === "pdf"}
                className={effectiveView === "pdf" ? "on" : ""}
                onClick={() => setView("pdf")}
              >
                Original PDF
              </button>
            )}
            {hasDocx && (
              <button
                type="button"
                role="tab"
                aria-selected={effectiveView === "docx"}
                className={effectiveView === "docx" ? "on" : ""}
                onClick={() => setView("docx")}
              >
                Word preview
              </button>
            )}
            {hasPdf && hasDocx && wide && (
              <button
                type="button"
                role="tab"
                aria-selected={effectiveView === "compare"}
                className={effectiveView === "compare" ? "on" : ""}
                onClick={() => setView("compare")}
              >
                <Columns2 size={14} aria-hidden="true" /> Compare
              </button>
            )}
          </div>

          <div className="p2wv-actions">
            {hasDocx && downloadUrl && (
              <a
                className="p2wv-tbtn p2wv-tbtn-text"
                href={downloadUrl}
                download={target.resultName ?? "document.docx"}
              >
                <Download size={14} aria-hidden="true" /> DOCX
              </a>
            )}
            <button
              type="button"
              className="p2wv-tbtn"
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              aria-pressed={isFullscreen}
              onClick={toggleFullscreen}
            >
              <Maximize size={15} aria-hidden="true" />
            </button>
            <button
              ref={closeRef}
              type="button"
              className="p2wv-tbtn"
              aria-label="Close preview"
              onClick={onClose}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p2wv-subtoolbar">
          <span className="p2wv-nav" role="group" aria-label="Page navigation">
            <button
              type="button"
              className="p2wv-tbtn"
              aria-label="Previous page"
              disabled={clampedPage <= 1}
              onClick={() => goToPage(clampedPage - 1)}
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <span className="p2wv-page-label" aria-live="polite">
              Page {clampedPage} of {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              className="p2wv-tbtn"
              aria-label="Next page"
              disabled={clampedPage >= Math.max(1, totalPages)}
              onClick={() => goToPage(clampedPage + 1)}
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </span>

          {showPdf && (
            <ZoomControls
              label="PDF"
              spec={pdfZoom}
              onChange={setPdfZoom}
              getEffective={() => pdfEffectiveRef.current}
            />
          )}
          {showPdf && (
            <button
              type="button"
              className="p2wv-tbtn"
              aria-label="Rotate page view 90 degrees"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw size={14} aria-hidden="true" />
            </button>
          )}
          {showDocx && (
            <ZoomControls
              label="Word"
              spec={docxZoom}
              onChange={setDocxZoom}
              getEffective={() => docxEffectiveRef.current}
            />
          )}

          <span className="p2wv-sub-actions">
            {onReplace && hasPdf && (
              <>
                <button
                  type="button"
                  className="p2wv-tbtn p2wv-tbtn-text"
                  onClick={() => replaceInputRef.current?.click()}
                >
                  <RefreshCw size={13} aria-hidden="true" /> Replace file
                </button>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  aria-label="Replace with a different PDF"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (next) onReplace(next);
                    e.target.value = "";
                  }}
                />
              </>
            )}
            {onRemove &&
              (confirmRemove ? (
                <span className="p2wv-confirm">
                  Remove this file?
                  <button
                    type="button"
                    className="p2wv-tbtn p2wv-tbtn-text danger"
                    onClick={onRemove}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="p2wv-tbtn p2wv-tbtn-text"
                    onClick={() => setConfirmRemove(false)}
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="p2wv-tbtn p2wv-tbtn-text"
                  onClick={() => setConfirmRemove(true)}
                >
                  <Trash2 size={13} aria-hidden="true" /> Remove
                </button>
              ))}
          </span>
        </div>

        <div
          className={`p2wv-body${effectiveView === "compare" ? " compare" : ""}`}
        >
          {showPdf && target.file && (
            <div className="p2wv-pane-wrap">
              {effectiveView === "compare" && (
                <span className="p2wv-pane-tag">Original PDF</span>
              )}
              <PdfPane
                file={target.file}
                page={Math.min(clampedPage, pdfCount || clampedPage)}
                zoom={pdfZoom}
                rotation={rotation}
                showThumbnails={effectiveView !== "compare"}
                onPageChange={goToPage}
                onPageCount={setPdfCount}
                onEffectiveZoom={reportPdfZoom}
              />
            </div>
          )}
          {showDocx && target.resultBlob && (
            <div className="p2wv-pane-wrap">
              {effectiveView === "compare" && (
                <span className="p2wv-pane-tag">Converted Word</span>
              )}
              <DocxPane
                blob={target.resultBlob}
                page={Math.min(clampedPage, docxCount || clampedPage)}
                zoom={docxZoom}
                onPageCount={setDocxCount}
                onEffectiveZoom={reportDocxZoom}
                onVisiblePage={(n) => {
                  if (effectiveView === "docx") setPage(n);
                }}
              />
            </div>
          )}
        </div>

        <p className="p2wv-footnote">
          {showDocx
            ? "The Word preview is rendered from the actual DOCX file in your browser. Microsoft Word may paginate flowing documents slightly differently."
            : "This is your original PDF, rendered on your device. Rotation here only changes the view, not the file."}
        </p>
      </div>
    </div>
  );
}
