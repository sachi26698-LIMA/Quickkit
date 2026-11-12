"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleStop,
  CopyPlus,
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  Files,
  ImageDown,
  Layers,
  Loader2,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { downloadBlob, formatBytes } from "@/lib/tools/download";
import {
  CONVERT_FORMATS,
  CONVERT_LIMITS,
  INPUT_ACCEPT_PDF,
  describePageRange,
  defaultSettings,
  formatById,
  inputFormatFromName,
  keepsAlpha,
  mmToPt,
  placeImage,
  resolvePage,
  type ConvertFormat,
  type ConvertMode,
  type ConvertSettings,
} from "@/lib/tools/image-convert";
import {
  canvasEncodeSupport,
  inspectInput,
  readPdfPageCount,
  renderPdfThumbnails,
  zipOutputs,
  type CanvasSupport,
} from "@/lib/tools/image-convert-runner";
import { sizeReportSummary } from "@/lib/tools/image-size";
import {
  buildPageList,
  describePlan,
  dropPage,
  duplicatePage,
  dropRanges,
  keepOnlyRanges,
  movePage,
  planProblem,
  rotatePage,
  summarisePlan,
  toggleRemoved,
  type PdfPageOp,
} from "@/lib/tools/pdf-studio";
import { runPdfStudio } from "@/lib/tools/image-convert-runner";
import PdfStudioSettings from "./pdf-studio/settings";
import {
  OVERRIDE_OPTIONS,
  formatDimensions,
  formatPages,
  savingsLabel,
  type ConversionResult,
  type Message,
  type QueueItem,
  type QueueStatus,
} from "./convert-shared/types";

const PDF_ACCEPT = INPUT_ACCEPT_PDF;
let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";

/** How the preview shows the work: one side, or a draggable before/after. */
type CompareView = "source" | "result" | "slider";

type BatchRow = {
  name: string;
  status: "converted" | "failed" | "cancelled";
  sourceBytes: number;
  outputBytes: number;
  format: string;
  error?: string;
};

type BatchReport = {
  startedAt: string;
  rows: BatchRow[];
  paused?: boolean;
};

function reportTotals(report: BatchReport) {
  const converted = report.rows.filter((row) => row.status === "converted");
  const failed = report.rows.filter((row) => row.status === "failed");
  const cancelled = report.rows.filter((row) => row.status === "cancelled");
  const input = converted.reduce((sum, row) => sum + row.sourceBytes, 0);
  const output = converted.reduce((sum, row) => sum + row.outputBytes, 0);
  return { converted, failed, cancelled, input, output };
}

const statusLabel: Record<QueueStatus, string> = {
  inspecting: "Reading…",
  ready: "Ready",
  converting: "Converting…",
  done: "Converted",
  error: "Needs attention",
  cancelled: "Cancelled",
};

export default function PdfStudio() {
  const hydrated = useHydrated();
  const [mode] = useState<ConvertMode>("pdf-studio");
  const [settings, setSettings] = useState<ConvertSettings>(() =>
    defaultSettings("image"),
  );
  const [items, setItems] = useState<QueueItem[]>([]);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compare, setCompare] = useState<CompareView>("source");
  /** 0–100 position of the before/after divider. */
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(100);
  // "Fit" is the default so a tall page is shown whole; moving the zoom
  // slider opts into free zoom (with scrolling) for close inspection.
  const [fit, setFit] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    label: "",
  });
  const [message, setMessage] = useState<Message>(null);
  const [dragging, setDragging] = useState(false);
  const [support, setSupport] = useState<CanvasSupport | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  // PDF Studio: the explicit page plan the user has built.
  const [studioPages, setStudioPages] = useState<PdfPageOp[]>([]);
  // Small screens get an explicit Files/Preview switch instead of one very
  // long column; both panels stay mounted so previews keep their state.
  const [mobilePanel, setMobilePanel] = useState<"files" | "preview">("files");

  const itemsRef = useRef<QueueItem[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const studioDragIdRef = useRef<string | null>(null);
  const [studioDragOverId, setStudioDragOverId] = useState<string | null>(null);
  // Batch control: a batch can be paused between files and resumed, and every
  // run leaves a report so nothing that failed is quietly forgotten.
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const resumeRef = useRef<(() => void) | null>(null);
  const [batchReport] = useState<BatchReport | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const commitItems = useCallback((next: QueueItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<QueueItem>) => {
      commitItems(
        itemsRef.current.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      );
    },
    [commitItems],
  );

  const trackUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  const releaseUrl = useCallback((url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    canvasEncodeSupport()
      .then((value) => {
        if (!cancelled) setSupport(value);
      })
      .catch(() => {
        if (!cancelled)
          setSupport({ jpeg: true, png: true, webp: false, avif: false });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );
  const activeItemId = selected?.id ?? null;
  const canCompare = Boolean(selected);

  const studioSources = useMemo(
    () =>
      items
        .filter((item) => item.format === "pdf")
        .map((item) => ({ name: item.name, pages: item.pageCount ?? 0 })),
    [items],
  );

  const studioPlan = useMemo(
    () =>
      summarisePlan(
        studioPages,
        settings.studio.action,
        settings.studio.ranges,
        studioSources,
      ),
    [
      studioPages,
      settings.studio.action,
      settings.studio.ranges,
      studioSources,
    ],
  );
  const studioProblem =
    planProblem(
      studioPages,
      settings.studio.action,
      settings.studio.ranges,
      studioSources,
    ) ?? null;

  /* ------------------------------ file input ----------------------------- */

  /** Rebuild the studio plan whenever the set of queued PDFs changes. */
  const syncStudioPlan = useCallback((next: QueueItem[]) => {
    const pdfs = next.filter((item) => item.format === "pdf");
    setStudioPages(
      buildPageList(
        pdfs.map((item) => ({
          name: item.name,
          pages: item.pageCount ?? 0,
        })),
      ),
    );
  }, []);

  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (busy) return;
      if (!incoming.length) return;
      const accepted: QueueItem[] = [];
      const problems: string[] = [];
      const current = itemsRef.current;
      const wantsPdf = mode === "pdf-to-image";
      const wantsStudio = mode === "pdf-studio";

      // PDF to image renders one document; the studio merges many.
      if (wantsPdf && current.length > 0) {
        setMessage({
          tone: "error",
          text: "PDF to image works on one PDF at a time. Remove the current PDF before adding another.",
        });
        return;
      }

      let totalBytes = current.reduce((sum, item) => sum + item.bytes, 0);
      const known = new Set(
        current.map((item) => `${item.name}:${item.bytes}`),
      );

      for (const file of incoming) {
        const format = inputFormatFromName(file.name, file.type);
        if (!format) {
          problems.push(`"${file.name}" is not a supported file type.`);
          continue;
        }
        if ((wantsPdf || wantsStudio) && format !== "pdf") {
          problems.push(
            `"${file.name}" is an image. Switch to Image to image or Images to PDF.`,
          );
          continue;
        }
        if (!wantsPdf && !wantsStudio && format === "pdf") {
          problems.push(`"${file.name}" is a PDF. Use PDF to image for PDFs.`);
          continue;
        }
        if (format === "pdf" && file.size > CONVERT_LIMITS.maxPdfBytes) {
          problems.push(`"${file.name}" is larger than 25 MB.`);
          continue;
        }
        if (format !== "pdf" && file.size > CONVERT_LIMITS.maxImageBytes) {
          problems.push(`"${file.name}" is larger than 15 MB.`);
          continue;
        }
        if (file.size === 0) {
          problems.push(`"${file.name}" is empty.`);
          continue;
        }
        if (known.has(`${file.name}:${file.size}`)) {
          problems.push(`"${file.name}" is already in the queue.`);
          continue;
        }
        if (accepted.length + current.length >= CONVERT_LIMITS.maxFiles) {
          problems.push(
            `The queue holds ${CONVERT_LIMITS.maxFiles} files. Remove one to add another.`,
          );
          continue;
        }
        totalBytes += file.size;
        if (totalBytes > CONVERT_LIMITS.maxBatchBytes) {
          problems.push(
            `The batch exceeds ${formatBytes(CONVERT_LIMITS.maxBatchBytes)}. Remove some files first.`,
          );
          break;
        }
        known.add(`${file.name}:${file.size}`);
        accepted.push({
          id: nextId("file"),
          file,
          url: format === "pdf" ? "" : trackUrl(file),
          name: file.name,
          bytes: file.size,
          kind: format === "pdf" ? "pdf" : "image",
          format,
          status: "inspecting",
          override: "auto",
        });
      }

      if (!accepted.length) {
        setMessage({
          tone: "error",
          text: problems[0] ?? "No files were added.",
        });
        return;
      }

      commitItems([...current, ...accepted]);
      if (!selectedId) setSelectedId(accepted[0].id);
      setCompare("source");
      setMessage(
        problems.length
          ? { tone: "error", text: problems[0] }
          : {
              tone: "success",
              text:
                accepted.length === 1
                  ? "File added. Review the settings, then convert."
                  : `${accepted.length} files added. Review the settings, then convert.`,
            },
      );

      for (const item of accepted) {
        try {
          const details = await inspectInput(item.file);
          if (details.kind === "pdf") {
            const pages = await readPdfPageCount(item.file);
            if (pages < 1) {
              throw new Error(
                "No readable pages were found. The PDF may be password-protected or damaged; remove its password or choose a valid PDF.",
              );
            }
            updateItem(item.id, {
              status: "ready",
              pageCount: pages,
              format: "pdf",
              kind: "pdf",
            });
            setPdfPage(1);
            if (itemsRef.current.some((entry) => entry.format === "pdf"))
              syncStudioPlan(itemsRef.current);
          } else {
            updateItem(item.id, {
              status: "ready",
              format: details.format,
              kind: "image",
              width: details.width,
              height: details.height,
              dpi: details.dpi,
              frames: details.frames,
              animated: details.animated,
            });
          }
        } catch (error) {
          updateItem(item.id, {
            status: "error",
            error: errorMessage(error),
          });
        }
      }
    },
    [busy, commitItems, mode, selectedId, syncStudioPlan, trackUrl, updateItem],
  );

  const onPick = (list: FileList | null) => {
    if (!list) return;
    void addFiles(Array.from(list));
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  /* ------------------------------- queue ops ------------------------------ */

  const removeItem = useCallback(
    (id: string) => {
      if (busy) return;
      const item = itemsRef.current.find((entry) => entry.id === id);
      releaseUrl(item?.url);
      const next = itemsRef.current.filter((entry) => entry.id !== id);
      commitItems(next);
      setResults((previous) => {
        const removed = previous.filter((result) => result.itemId === id);
        for (const result of removed) releaseUrl(result.url);
        return previous.filter((result) => result.itemId !== id);
      });
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      setCompare("source");
    },
    [busy, commitItems, releaseUrl, selectedId],
  );

  const moveItem = useCallback(
    (id: string, delta: number) => {
      if (busy) return;
      const current = itemsRef.current;
      const index = current.findIndex((entry) => entry.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      commitItems(next);
      setMessage(null);
    },
    [busy, commitItems],
  );

  /** Drop item `fromId` into the position held by `toId` (drag-and-drop). */
  const reorderItem = useCallback(
    (fromId: string, toId: string) => {
      if (busy || fromId === toId) return;
      const current = itemsRef.current;
      const from = current.findIndex((entry) => entry.id === fromId);
      const to = current.findIndex((entry) => entry.id === toId);
      if (from < 0 || to < 0) return;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      commitItems(next);
      setMessage({
        tone: "info",
        text: `Moved ${moved.name} to position ${to + 1}.`,
      });
    },
    [busy, commitItems],
  );

  const clearAll = useCallback(() => {
    if (busy) return;
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current.clear();
    commitItems([]);
    setResults([]);
    setSelectedId(null);
    setCompare("source");
    setProgress({ done: 0, total: 0, label: "" });
    setMessage({
      tone: "info",
      text: "Queue cleared. Your original files are untouched.",
    });
    setPdfPage(1);
    setStudioPages([]);
    if (filesInputRef.current) filesInputRef.current.value = "";
  }, [busy, commitItems]);

  /* ----------------------------- conversion ------------------------------ */

  /** Reorder / rotate / remove / extract / split / compress the queued PDFs. */
  const runStudio = async () => {
    const pdfItems = itemsRef.current.filter((item) => item.format === "pdf");
    if (!pdfItems.length) {
      setMessage({ tone: "error", text: "Add a PDF first." });
      return;
    }
    if (studioProblem) {
      setMessage({ tone: "error", text: studioProblem });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setCompare("result");
    setMessage(null);
    setProgress({ done: 0, total: 1, label: "Reading documents…" });
    for (const result of results) releaseUrl(result.url);
    setResults([]);
    try {
      const outputs = await runPdfStudio({
        files: pdfItems.map((item) => item.file),
        pages: studioPages,
        action: settings.studio.action,
        settings: settings.studio,
        sources: studioSources,
        signal: controller.signal,
        onProgress: (done, total) =>
          setProgress({
            done,
            total,
            label: `Writing page ${done} of ${total}…`,
          }),
      });
      const created = outputs.map<ConversionResult>((output) => ({
        id: nextId("studio"),
        itemId: pdfItems[0].id,
        name: output.name,
        blob: output.blob,
        url: trackUrl(output.blob),
        format: "pdf",
        pages: output.pages,
        sourceBytes: output.sourceBytes,
        note: output.notices.length ? output.notices.join(" ") : undefined,
      }));
      setResults(created);
      setMobilePanel("preview");
      for (const item of pdfItems)
        updateItem(item.id, { status: "done", error: undefined });
      setMessage({
        tone: "success",
        text:
          created.length === 1
            ? `${created[0].name} written with ${created[0].pages} page${created[0].pages === 1 ? "" : "s"}. Your originals are untouched.`
            : `${created.length} PDFs written. Download them individually or as one ZIP.`,
      });
    } catch (error) {
      if (controller.signal.aborted)
        setMessage({ tone: "info", text: "Cancelled. Nothing was written." });
      else setMessage({ tone: "error", text: errorMessage(error) });
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress({ done: 0, total: 0, label: "" });
    }
  };

  const startConversion = async () => {
    if (busy) return;
    await runStudio();
  };

  const cancel = () => {
    abortRef.current?.abort();
    // A paused batch must not stay parked once the user cancels it.
    if (pausedRef.current) resume();
    setMessage({ tone: "info", text: "Cancelling after the current step…" });
  };

  /** Wait between files while the batch is paused. */

  const pause = () => {
    if (!busy || pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    setMessage({
      tone: "info",
      text: "Paused. The current file finishes, then the batch waits for you.",
    });
  };

  const resume = () => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    resumeRef.current?.();
    resumeRef.current = null;
  };

  const retryItem = (id: string) => {
    if (busy) return;
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    updateItem(id, { status: "ready", error: undefined });
    void runStudio();
  };

  const downloadAllZip = async () => {
    if (!results.length) return;
    try {
      const blob = await zipOutputs(
        results.map((result) => ({ name: result.name, blob: result.blob })),
      );
      const base =
        settings.baseName.trim() ||
        settings.studio.filename.trim() ||
        "quickkit-studio";
      downloadBlob(
        blob,
        `${base.replace(/[^\w-]+/g, "-") || "quickkit"}-results.zip`,
      );
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  };

  const downloadOne = (result: ConversionResult) => {
    downloadBlob(result.blob, result.name);
  };

  const totalDone = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;
  const zipReady = results.length > 1;
  const pct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  const conversionLabel =
    studioPlan.outputs > 1
      ? `Write ${studioPlan.outputs} PDFs`
      : `Write PDF · ${studioPlan.kept} page${studioPlan.kept === 1 ? "" : "s"}`;

  const previewTitle =
    compare === "result" ? "Converted output" : "Source preview";

  return (
    <div className="converter-workspace">
      <div className="workspace-heading">
        <div>
          <h2>Choose PDF actions and arrange pages</h2>
          <p>
            Merge, extract, split, rotate, reorder and compress the pages of
            your PDFs — every file stays on your device.
          </p>
        </div>
        <span className="local-badge">
          <ShieldCheck size={13} aria-hidden="true" /> Local processing
        </span>
      </div>

      <div
        className={
          dragging
            ? "dropzone converter-drop dragging"
            : "dropzone converter-drop"
        }
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (busy) return;
          void addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <Upload size={26} aria-hidden="true" />
        <p>
          {mode === "pdf-to-image"
            ? "Drop one PDF here to export its pages, or choose a file."
            : mode === "images-to-pdf"
              ? "Drop images here — each one becomes a PDF page."
              : "Drop images here to convert between JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF."}
        </p>
        <button
          type="button"
          className="primary converter-upload"
          onClick={() => filesInputRef.current?.click()}
          disabled={busy}
        >
          <Upload size={16} aria-hidden="true" />
          Choose PDFs
        </button>
        <input
          ref={filesInputRef}
          id="pdf-studio-input"
          data-testid="pdf-studio-input"
          type="file"
          className="converter-file-input"
          accept={PDF_ACCEPT}
          multiple
          disabled={busy}
          onChange={(event) => onPick(event.target.files)}
          aria-label="Choose PDFs to work on"
        />
        <div
          className="converter-supported"
          aria-label="Supported formats and limits"
        >
          {(mode === "pdf-to-image"
            ? ["PDF up to 25 MB", "100 pages", "JPG · PNG · WEBP output"]
            : [
                "JPG",
                "PNG",
                "WEBP",
                "AVIF",
                "GIF",
                "BMP",
                "TIFF",
                "Up to 20 files",
                "15 MB each",
                "150 MB per batch",
              ]
          ).map((label) => (
            <span key={label} className="chip converter-chip">
              {label}
            </span>
          ))}
        </div>
        <details className="converter-notes">
          <summary>Format &amp; limitation notes</summary>
          <ul>
            <li>
              Image inputs: JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF. Outputs add
              every format the browser can actually encode; AVIF and WEBP are
              probed and disabled instead of writing a broken file.
            </li>
            <li>
              GIF is exported as a single still frame — animation is not
              preserved. TIFF is read and written locally by QUICKKIT because
              browsers cannot open it.
            </li>
            <li>
              PDF → image exports JPG, PNG or WEBP only. PDFs built from images
              contain raster pages with no editable or selectable text layer.
            </li>
            <li>
              Everything runs in this tab. Files are never uploaded, and
              originals on your device are never modified.
            </li>
          </ul>
        </details>
      </div>

      {items.length > 0 ? (
        <section className="converter-queue" aria-labelledby="queue-heading">
          <div className="converter-queue-head">
            <h3 id="queue-heading">
              <Files size={16} aria-hidden="true" /> File queue
            </h3>
            <p>
              {items.length} file{items.length === 1 ? "" : "s"} ·{" "}
              {formatBytes(items.reduce((sum, item) => sum + item.bytes, 0))}
              {failed ? ` · ${failed} need attention` : ""}
            </p>
          </div>
          <ul className="converter-files">
            {items.map((item) => (
              <li
                key={item.id}
                className={[
                  "converter-file",
                  item.id === activeItemId ? "selected" : "",
                  mode === "images-to-pdf" ? "draggable" : "",
                  dragOverId === item.id ? "drag-over" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-testid="converter-item"
                draggable={mode === "images-to-pdf" && !busy}
                onDragStart={(event) => {
                  if (mode !== "images-to-pdf" || busy) return;
                  dragIdRef.current = item.id;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.name);
                }}
                onDragOver={(event) => {
                  if (mode !== "images-to-pdf" || busy) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverId !== item.id) setDragOverId(item.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === item.id) setDragOverId(null);
                }}
                onDrop={(event) => {
                  if (mode !== "images-to-pdf" || busy) return;
                  event.preventDefault();
                  const fromId = dragIdRef.current;
                  dragIdRef.current = null;
                  setDragOverId(null);
                  if (fromId) reorderItem(fromId, item.id);
                }}
                onDragEnd={() => {
                  dragIdRef.current = null;
                  setDragOverId(null);
                }}
              >
                <button
                  type="button"
                  className="converter-file-main"
                  onClick={() => {
                    setSelectedId(item.id);
                    setCompare("source");
                    if (item.format === "pdf") setPdfPage(1);
                  }}
                  aria-pressed={item.id === activeItemId}
                  aria-label={`Preview ${item.name}`}
                >
                  <span className="converter-thumb">
                    {item.format === "pdf" ? (
                      <FileText size={20} aria-hidden="true" />
                    ) : item.url ? (
                      <img src={item.url} alt="" />
                    ) : (
                      <FileImage size={20} aria-hidden="true" />
                    )}
                  </span>
                  <span className="converter-file-copy">
                    <strong>{item.name}</strong>
                    <small>
                      {item.format === "pdf"
                        ? `PDF · ${item.pageCount ? formatPages(item.pageCount) : "reading pages…"}`
                        : `${formatById(item.format as ConvertFormat).label} · ${
                            item.width
                              ? formatDimensions(item.width, item.height)
                              : "reading size…"
                          }`}{" "}
                      · {formatBytes(item.bytes)}
                    </small>
                    {item.error ? (
                      <small className="converter-file-error">
                        {item.error}
                      </small>
                    ) : null}
                    {item.status === "converting" &&
                    typeof item.progress === "number" &&
                    item.progress > 0 ? (
                      <span
                        className="converter-file-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(item.progress * 100)}
                        aria-label={`Progress for ${item.name}`}
                      >
                        <span
                          style={{
                            width: `${Math.round(item.progress * 100)}%`,
                          }}
                        />
                      </span>
                    ) : null}
                  </span>
                </button>
                {mode === "image" && item.format !== "pdf" ? (
                  <label className="converter-override">
                    <span>Output</span>
                    <select
                      value={item.override}
                      disabled={busy || item.status === "inspecting"}
                      aria-label={`Output format for ${item.name}`}
                      onChange={(event) =>
                        updateItem(item.id, {
                          override: event.target.value as
                            ConvertFormat | "auto",
                        })
                      }
                    >
                      {OVERRIDE_OPTIONS.map((option) => {
                        const def =
                          option.id === "auto" ? null : formatById(option.id);
                        const unavailable =
                          def?.canvas && support
                            ? !support[def.id as keyof CanvasSupport]
                            : false;
                        return (
                          <option
                            key={option.id}
                            value={option.id}
                            disabled={unavailable}
                          >
                            {option.label}
                            {unavailable ? " — unavailable" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                ) : null}
                <span className={`converter-status ${item.status}`}>
                  {item.status === "converting" ? (
                    <Loader2
                      size={13}
                      className="converter-spin"
                      aria-hidden="true"
                    />
                  ) : item.status === "done" ? (
                    <Check size={13} aria-hidden="true" />
                  ) : item.status === "error" ? (
                    <AlertCircle size={13} aria-hidden="true" />
                  ) : null}
                  {statusLabel[item.status]}
                </span>
                {item.status === "error" ? (
                  <button
                    type="button"
                    className="converter-icon-button"
                    onClick={() => retryItem(item.id)}
                    disabled={busy}
                    aria-label={`Retry ${item.name}`}
                    title="Retry"
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                  </button>
                ) : null}
                {mode === "images-to-pdf" ? (
                  <>
                    <button
                      type="button"
                      className="converter-icon-button"
                      onClick={() => moveItem(item.id, -1)}
                      disabled={
                        busy ||
                        items.findIndex((entry) => entry.id === item.id) === 0
                      }
                      aria-label={`Move ${item.name} earlier`}
                      title="Move earlier"
                    >
                      <ChevronUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="converter-icon-button"
                      onClick={() => moveItem(item.id, 1)}
                      disabled={
                        busy ||
                        items.findIndex((entry) => entry.id === item.id) ===
                          items.length - 1
                      }
                      aria-label={`Move ${item.name} later`}
                      title="Move later"
                    >
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                {mode === "image"
                  ? (() => {
                      const result = results.find(
                        (entry) => entry.itemId === item.id,
                      );
                      return result ? (
                        <button
                          type="button"
                          className="converter-icon-button"
                          onClick={() => downloadOne(result)}
                          aria-label={`Download ${result.name}`}
                          title="Download"
                        >
                          <Download size={16} aria-hidden="true" />
                        </button>
                      ) : null;
                    })()
                  : null}
                <button
                  type="button"
                  className="converter-icon-button"
                  onClick={() => removeItem(item.id)}
                  disabled={busy}
                  aria-label={`Remove ${item.name}`}
                  title="Remove"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div
        className="converter-mobile-tabs"
        role="group"
        aria-label="Mobile workspace panel"
      >
        <button
          type="button"
          aria-pressed={mobilePanel === "files"}
          aria-controls="converter-files-panel"
          className={mobilePanel === "files" ? "active" : ""}
          onClick={() => setMobilePanel("files")}
        >
          <Files size={15} aria-hidden="true" /> Files &amp; settings
        </button>
        <button
          type="button"
          aria-pressed={mobilePanel === "preview"}
          aria-controls="converter-preview-panel"
          className={mobilePanel === "preview" ? "active" : ""}
          onClick={() => setMobilePanel("preview")}
        >
          <Eye size={15} aria-hidden="true" /> Preview
        </button>
      </div>

      <div className={`converter-layout mobile-${mobilePanel}`}>
        <section
          id="converter-files-panel"
          className="converter-panel"
          aria-labelledby="settings-heading"
        >
          <div className="converter-panel-head">
            <h3 id="settings-heading">
              <Settings2 size={16} aria-hidden="true" /> Conversion settings
            </h3>
            <span className="chip converter-chip">
              {mode === "image"
                ? "Image → image"
                : mode === "images-to-pdf"
                  ? "Images → PDF"
                  : "PDF → image"}
            </span>
          </div>
          <PdfStudioSettings
            settings={settings}
            onChange={setSettings}
            disabled={busy}
            studioSummary={describePlan(studioPlan)}
            studioProblem={studioProblem}
          />

          <div className="converter-actions">
            <button
              type="button"
              className="primary"
              data-testid="converter-run"
              onClick={() => void startConversion()}
              disabled={busy || Boolean(studioProblem)}
            >
              {busy ? (
                <Loader2
                  size={16}
                  className="converter-spin"
                  aria-hidden="true"
                />
              ) : (
                <Sparkles size={16} aria-hidden="true" />
              )}
              {busy ? "Working…" : conversionLabel}
            </button>
            {busy ? (
              <button
                type="button"
                className="secondary"
                data-testid="converter-cancel"
                onClick={cancel}
              >
                <CircleStop size={16} aria-hidden="true" /> Cancel
              </button>
            ) : null}
            {busy && mode === "image" ? (
              <button
                type="button"
                className="secondary"
                data-testid="converter-pause"
                aria-pressed={paused}
                onClick={() => (paused ? resume() : pause())}
              >
                {paused ? (
                  <Play size={16} aria-hidden="true" />
                ) : (
                  <Pause size={16} aria-hidden="true" />
                )}
                {paused ? "Resume" : "Pause"}
              </button>
            ) : null}
            <button
              type="button"
              className="secondary"
              data-testid="converter-clear"
              onClick={clearAll}
              disabled={busy || !items.length}
            >
              <Trash2 size={15} aria-hidden="true" /> Clear
            </button>
            {zipReady ? (
              <button
                type="button"
                className="secondary"
                data-testid="converter-zip"
                onClick={() => void downloadAllZip()}
                disabled={busy}
              >
                <FileArchive size={15} aria-hidden="true" /> Download ZIP
              </button>
            ) : null}
          </div>

          {busy || progress.total ? (
            <div className="converter-progress">
              <div className="converter-progress-head">
                <span>{progress.label || "Preparing…"}</span>
                <strong>
                  {progress.done}/{progress.total}
                </strong>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label="Conversion progress"
              >
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="converter-hint">
                {totalDone} converted · {failed} failed · files never leave this
                browser
              </p>
            </div>
          ) : null}

          {message ? (
            <p
              className={`status ${message.tone === "info" ? "" : message.tone}`}
              data-testid="converter-status"
              role={message.tone === "error" ? "alert" : "status"}
            >
              {message.tone === "error" ? (
                <AlertCircle size={14} aria-hidden="true" />
              ) : message.tone === "success" ? (
                <CheckCircle2 size={14} aria-hidden="true" />
              ) : null}{" "}
              {message.text}
            </p>
          ) : null}
        </section>

        {batchReport && batchReport.rows.length ? (
          <section
            className="converter-panel converter-report"
            aria-labelledby="batch-report-heading"
          >
            <div className="converter-panel-head">
              <h3 id="batch-report-heading">
                <Files size={16} aria-hidden="true" /> Batch report
              </h3>
              <span className="chip converter-chip">
                started {batchReport.startedAt}
              </span>
            </div>
            {(() => {
              const totals = reportTotals(batchReport);
              return (
                <>
                  <p
                    className="converter-hint"
                    data-testid="converter-report-summary"
                  >
                    {totals.converted.length} converted · {totals.failed.length}{" "}
                    failed · {totals.cancelled.length} cancelled ·{" "}
                    {formatBytes(totals.input)} in, {formatBytes(totals.output)}{" "}
                    out (
                    {totals.input
                      ? `${Math.round(((totals.input - totals.output) / totals.input) * 100)}% smaller`
                      : "—"}
                    )
                  </p>
                  <ul className="converter-report-list">
                    {batchReport.rows.map((row, index) => (
                      <li
                        key={`${row.name}-${index}`}
                        className={`converter-report-row ${row.status}`}
                        data-testid="converter-report-row"
                      >
                        <strong title={row.name}>{row.name}</strong>
                        <small>
                          {row.status === "converted"
                            ? `${row.format} · ${formatBytes(row.sourceBytes)} → ${formatBytes(row.outputBytes)}`
                            : row.status === "cancelled"
                              ? "Cancelled before it was written"
                              : `Failed — ${row.error ?? "unknown error"}`}
                        </small>
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </section>
        ) : null}

        {mode === "pdf-studio" ? (
          <section
            className="converter-panel converter-studio"
            aria-labelledby="studio-grid-heading"
          >
            <div className="converter-panel-head">
              <h3 id="studio-grid-heading">
                <Layers size={16} aria-hidden="true" /> Page order
              </h3>
              <span className="chip converter-chip">
                {studioPlan.kept} of {studioPlan.total} kept
              </span>
            </div>
            {studioPages.length ? (
              <ol className="converter-page-grid">
                {studioPages.map((page, index) => {
                  const source = studioSources[page.sourceIndex];
                  return (
                    <li
                      key={page.id}
                      className={[
                        "converter-page",
                        page.removed ? "removed" : "",
                        studioDragOverId === page.id ? "drag-over" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-testid="converter-studio-page"
                      draggable={!busy}
                      onDragStart={() => {
                        studioDragIdRef.current = page.id;
                      }}
                      onDragOver={(event) => {
                        if (busy) return;
                        event.preventDefault();
                        if (studioDragOverId !== page.id)
                          setStudioDragOverId(page.id);
                      }}
                      onDragLeave={() => {
                        if (studioDragOverId === page.id)
                          setStudioDragOverId(null);
                      }}
                      onDrop={(event) => {
                        if (busy) return;
                        event.preventDefault();
                        const fromId = studioDragIdRef.current;
                        studioDragIdRef.current = null;
                        setStudioDragOverId(null);
                        if (fromId)
                          setStudioPages((current) =>
                            dropPage(current, fromId, page.id),
                          );
                      }}
                      onDragEnd={() => {
                        studioDragIdRef.current = null;
                        setStudioDragOverId(null);
                      }}
                    >
                      <strong>
                        {index + 1}. {source?.name ?? "PDF"} · p{page.page}
                      </strong>
                      {page.rotation ? (
                        <span className="chip converter-chip">
                          {page.rotation}°
                        </span>
                      ) : null}
                      {page.removed ? (
                        <span className="chip converter-chip">removed</span>
                      ) : null}
                      <span className="converter-page-actions">
                        <button
                          type="button"
                          className="converter-icon-button"
                          aria-label={`Move page ${page.page} earlier`}
                          disabled={busy || index === 0}
                          onClick={() =>
                            setStudioPages((current) =>
                              movePage(current, page.id, -1),
                            )
                          }
                        >
                          <ChevronLeft size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="converter-icon-button"
                          aria-label={`Move page ${page.page} later`}
                          disabled={busy || index === studioPages.length - 1}
                          onClick={() =>
                            setStudioPages((current) =>
                              movePage(current, page.id, 1),
                            )
                          }
                        >
                          <ChevronRight size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="converter-icon-button"
                          aria-label={`Rotate page ${page.page} left`}
                          disabled={busy}
                          onClick={() =>
                            setStudioPages((current) =>
                              rotatePage(current, page.id, -90),
                            )
                          }
                        >
                          <RotateCcw size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="converter-icon-button"
                          aria-label={`Rotate page ${page.page} right`}
                          disabled={busy}
                          onClick={() =>
                            setStudioPages((current) =>
                              rotatePage(current, page.id, 90),
                            )
                          }
                        >
                          <RotateCw size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="converter-icon-button"
                          aria-label={`Duplicate page ${page.page}`}
                          disabled={busy}
                          onClick={() =>
                            setStudioPages((current) =>
                              duplicatePage(current, page.id),
                            )
                          }
                        >
                          <CopyPlus size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="converter-icon-button"
                          aria-label={
                            page.removed
                              ? `Keep page ${page.page}`
                              : `Remove page ${page.page}`
                          }
                          aria-pressed={page.removed}
                          disabled={busy}
                          onClick={() =>
                            setStudioPages((current) =>
                              toggleRemoved(current, page.id),
                            )
                          }
                        >
                          {page.removed ? (
                            <RefreshCw size={14} aria-hidden="true" />
                          ) : (
                            <Trash2 size={14} aria-hidden="true" />
                          )}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="converter-hint">
                Add one or more PDFs and every page appears here. Drag to
                reorder, or use the arrows on a phone.
              </p>
            )}
            <div className="converter-studio-bulk">
              <button
                type="button"
                className="secondary"
                disabled={busy || !settings.studio.ranges.trim()}
                onClick={() =>
                  setStudioPages((current) =>
                    keepOnlyRanges(
                      current,
                      settings.studio.ranges,
                      studioSources,
                    ),
                  )
                }
              >
                Keep only the range
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy || !settings.studio.ranges.trim()}
                onClick={() =>
                  setStudioPages((current) =>
                    dropRanges(current, settings.studio.ranges, studioSources),
                  )
                }
              >
                Remove the range
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy || !studioPages.length}
                onClick={() => syncStudioPlan(itemsRef.current)}
              >
                Reset page list
              </button>
            </div>
          </section>
        ) : null}

        <aside
          id="converter-preview-panel"
          className="converter-panel converter-preview"
          aria-labelledby="preview-heading"
        >
          <div className="converter-panel-head">
            <h3 id="preview-heading">
              <Eye size={16} aria-hidden="true" /> {previewTitle}
            </h3>
            {canCompare && (mode !== "pdf-to-image" || results.length > 0) ? (
              <div
                className="converter-tabs"
                role="group"
                aria-label="Preview source or result"
              >
                <button
                  type="button"
                  aria-pressed={compare === "source"}
                  className={compare === "source" ? "active" : ""}
                  onClick={() => setCompare("source")}
                >
                  Original
                </button>
                <button
                  type="button"
                  aria-pressed={compare === "result"}
                  className={compare === "result" ? "active" : ""}
                  onClick={() => setCompare("result")}
                  disabled={!results.length}
                >
                  Converted
                </button>
                <button
                  type="button"
                  aria-pressed={compare === "slider"}
                  className={compare === "slider" ? "active" : ""}
                  onClick={() => setCompare("slider")}
                  disabled={!results.length || mode === "pdf-to-image"}
                  title="Drag to compare the original with the output"
                >
                  Slider
                </button>
              </div>
            ) : null}
          </div>

          {!selected ? (
            <div className="converter-empty">
              <ImageDown size={30} aria-hidden="true" />
              <strong>Nothing to preview yet</strong>
              <p>
                Add{" "}
                {mode === "pdf-to-image"
                  ? "a PDF"
                  : mode === "images-to-pdf"
                    ? "images"
                    : "an image"}{" "}
                to see a real preview and file details here. Previews are built
                from your file, never stock images.
              </p>
            </div>
          ) : mode === "images-to-pdf" ? (
            compare === "result" && results[0]?.format === "pdf" ? (
              <PdfGallery
                key={`generated-${results[0].id}`}
                blob={results[0].blob}
                pageCount={results[0].pages ?? 1}
                page={pdfPage}
                onPage={setPdfPage}
                title={`Preview of ${results[0].name}`}
              />
            ) : (
              <PdfLayoutPreview item={selected} settings={settings} />
            )
          ) : selected.format === "pdf" ? (
            <PdfGallery
              key={`source-${selected.id}`}
              blob={selected.file}
              pageCount={selected.pageCount ?? 0}
              page={pdfPage}
              onPage={setPdfPage}
              title={`Preview of ${selected.name}`}
            />
          ) : (
            <ImagePreview
              item={selected}
              result={results.find((entry) => entry.itemId === selected.id)}
              compare={
                compare === "slider" && results.length
                  ? "slider"
                  : compare === "result" && results.length
                    ? "result"
                    : "source"
              }
              split={split}
              onSplit={setSplit}
              zoom={zoom}
              fit={fit}
              onZoom={(value) => {
                setZoom(value);
                setFit(false);
              }}
              onFit={setFit}
            />
          )}
        </aside>
      </div>

      {results.length ? (
        <section
          className="converter-results"
          aria-labelledby="results-heading"
        >
          <div className="converter-queue-head">
            <h3 id="results-heading">
              <CheckCircle2 size={16} aria-hidden="true" /> Results
            </h3>
            {results.length > 1 ? (
              <button
                type="button"
                className="secondary converter-zip-inline"
                onClick={() => void downloadAllZip()}
                disabled={busy}
                data-testid="converter-zip-results"
              >
                <FileArchive size={15} aria-hidden="true" /> Download all as ZIP
              </button>
            ) : null}
          </div>
          <ul className="converter-result-grid">
            {results.map((result) => (
              <li
                key={result.id}
                className="converter-result"
                data-testid="converter-result"
              >
                <button
                  type="button"
                  className="converter-result-thumb"
                  onClick={() => {
                    setSelectedId(result.itemId);
                    setCompare("result");
                    if (result.page) setPdfPage(result.page);
                  }}
                  aria-label={`Preview ${result.name}`}
                >
                  {result.format === "pdf" ? (
                    <span className="converter-pdf-thumb">
                      <FileText size={28} aria-hidden="true" />
                      <small>{formatPages(result.pages)}</small>
                    </span>
                  ) : (
                    <img src={result.url} alt="" />
                  )}
                </button>
                <div className="converter-result-copy">
                  <strong title={result.name}>{result.name}</strong>
                  <small>
                    {result.format === "pdf"
                      ? `PDF · ${formatPages(result.pages)}`
                      : `${formatById(result.format as ConvertFormat).label} · ${formatDimensions(
                          result.width,
                          result.height,
                        )}`}
                  </small>
                  {result.format !== "pdf" ? (
                    <small className="converter-size-compare">
                      {formatBytes(result.sourceBytes)} →{" "}
                      {formatBytes(result.blob.size)}
                      <span className="converter-saving">
                        {savingsLabel(result.sourceBytes, result.blob.size)}
                      </span>
                    </small>
                  ) : (
                    <small>Raster PDF · no text layer</small>
                  )}
                  {result.note ? (
                    <small className="converter-result-note">
                      {result.note}
                    </small>
                  ) : null}
                </div>
                <div className="converter-result-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => downloadOne(result)}
                    aria-label={`Download ${result.name}`}
                  >
                    <Download size={15} aria-hidden="true" /> Download
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="converter-hint">
            Sizes and dimensions above are read from the actual encoded files.
            {mode === "pdf-to-image"
              ? " Savings compare each page with an even share of the source PDF, so they are not shown as a percentage."
              : ""}
          </p>
        </section>
      ) : null}

      <div className="workspace-foot">
        <p>
          Files are decoded and encoded on this device. Closing the tab clears
          the queue and results. Originals are never modified.
        </p>
        <span className="chip converter-chip">
          <Layers size={13} aria-hidden="true" /> {CONVERT_FORMATS.length}{" "}
          output formats
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function ImagePreview({
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

function PageNav({
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

function PdfGallery({
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

function PdfLayoutPreview({
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
  const placement = placeImage(
    item.width,
    item.height,
    page.widthPt,
    page.heightPt,
    marginPt,
    settings.pdfMake.fit,
  );
  const top =
    ((page.heightPt - placement.y - placement.height) / page.heightPt) * 100;
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
            left: `${(placement.x / page.widthPt) * 100}%`,
            top: `${top}%`,
            width: `${(placement.width / page.widthPt) * 100}%`,
            height: `${(placement.height / page.heightPt) * 100}%`,
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
      </p>
    </div>
  );
}
