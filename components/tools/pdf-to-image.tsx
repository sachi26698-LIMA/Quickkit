"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CircleStop,
  Download,
  Eye,
  FileArchive,
  FileImage,
  Files,
  FileText,
  ImageDown,
  Layers,
  Loader2,
  RefreshCw,
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
  CONVERT_LIMITS,
  INPUT_ACCEPT_PDF,
  defaultSettings,
  formatById,
  inputFormatFromName,
  parsePageRange,
  type ConvertFormat,
  type ConvertSettings,
} from "@/lib/tools/image-convert";
import {
  canvasEncodeSupport,
  inspectInput,
  pdfToImages,
  readPdfDocInfo,
  zipOutputs,
  type CanvasSupport,
} from "@/lib/tools/image-convert-runner";
import PdfToImageSettings from "./pdf-to-image/settings";
import {
  ExportedPageNav,
  PdfGallery,
  errorMessage,
  type CompareView,
} from "./convert-shared/preview";
import { nextId, statusLabel } from "./convert-shared/report";
import {
  formatDimensions,
  formatPages,
  savingsLabel,
  type ConversionResult,
  type Message,
  type QueueItem,
} from "./convert-shared/types";

const PDF_ACCEPT = INPUT_ACCEPT_PDF;

export default function PdfToImage() {
  /** One job: a PDF in, rendered page images out. There is no mode switcher. */
  const mode = "pdf-to-image" as const;
  const hydrated = useHydrated();
  const [settings, setSettings] = useState<ConvertSettings>(() =>
    defaultSettings("pdf-to-image"),
  );
  const [items, setItems] = useState<QueueItem[]>([]);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compare, setCompare] = useState<CompareView>("source");
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
  // Small screens get an explicit Files/Preview switch instead of one very
  // long column; both panels stay mounted so previews keep their state.
  const [mobilePanel, setMobilePanel] = useState<"files" | "preview">("files");

  const itemsRef = useRef<QueueItem[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());
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
  const pdfItem = selected?.format === "pdf" ? selected : null;
  const selectedResult =
    results.find(
      (result) => result.itemId === activeItemId && result.page === pdfPage,
    ) ??
    results.find((result) => result.itemId === activeItemId) ??
    results[0] ??
    null;
  const canCompare = Boolean(pdfItem);

  /** The queued PDF once it is usable — not while it is still being read. */
  const readyPdf = useMemo(
    () =>
      items.find(
        (item) =>
          item.format === "pdf" &&
          (item.status === "ready" ||
            item.status === "done" ||
            item.status === "cancelled"),
      ) ?? null,
    [items],
  );

  /** The pages the current range selects, resolved against the real count. */
  const parsedRange = useMemo(() => {
    if (!pdfItem?.pageCount)
      return { pages: null as number[] | null, error: "" };
    try {
      return {
        pages: parsePageRange(settings.pdfRender.range, pdfItem.pageCount),
        error: "",
      };
    } catch (error) {
      return { pages: null as number[] | null, error: errorMessage(error) };
    }
  }, [pdfItem, settings.pdfRender.range]);

  /* ------------------------------ file input ----------------------------- */

  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (busy) return;
      if (!incoming.length) return;
      const accepted: QueueItem[] = [];
      const problems: string[] = [];
      const current = itemsRef.current;
      // This tool renders one document at a time, so a second PDF has to
      // replace the first rather than queue behind it.
      if (current.length > 0) {
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
        if (format !== "pdf") {
          problems.push(
            `"${file.name}" is an image. Use Image to Image or Images to PDF for images.`,
          );
          continue;
        }
        if (file.size > CONVERT_LIMITS.maxPdfBytes) {
          problems.push(`"${file.name}" is larger than 25 MB.`);
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
            const info = await readPdfDocInfo(item.file);
            updateItem(item.id, {
              status: "ready",
              pageCount: info.pageCount,
              pageWidthPt: info.widthPt,
              pageHeightPt: info.heightPt,
              format: "pdf",
              kind: "pdf",
            });
            setPdfPage(1);
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
    [busy, commitItems, selectedId, trackUrl, updateItem],
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
    if (filesInputRef.current) filesInputRef.current.value = "";
  }, [busy, commitItems]);

  /* ----------------------------- conversion ------------------------------ */

  const convertPdfPages = async (item: QueueItem) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setCompare("result");
    setMessage(null);
    let pages: number[] = [];
    try {
      pages = parsePageRange(settings.pdfRender.range, item.pageCount ?? 0);
    } catch (error) {
      setBusy(false);
      abortRef.current = null;
      setMessage({ tone: "error", text: errorMessage(error) });
      return;
    }
    for (const result of results) releaseUrl(result.url);
    setResults([]);
    updateItem(item.id, {
      status: "converting",
      error: undefined,
      progress: 0,
    });
    setProgress({ done: 0, total: pages.length, label: "Rendering page 1…" });
    try {
      const output = await pdfToImages(item.file, settings, {
        signal: controller.signal,
        onPage: (done, total) => {
          setProgress({
            done,
            total,
            label: `Rendering page ${done} of ${total}…`,
          });
          updateItem(item.id, { progress: done / total });
        },
      });
      const created = output.outputs.map<ConversionResult>((page) => ({
        id: nextId("page"),
        itemId: item.id,
        name: page.name,
        blob: page.blob,
        url: trackUrl(page.blob),
        format: settings.pdfRender.format,
        width: page.width,
        height: page.height,
        page: page.page,
        pages: output.pageCount,
        sourceBytes: item.bytes / Math.max(1, output.pageCount),
        note: `Page ${page.page} of ${output.pageCount}`,
      }));
      setResults(created);
      setMobilePanel("preview");
      updateItem(item.id, { status: "done", error: undefined });
      setPdfPage(created[0]?.page ?? 1);
      const capped = created.some(
        (page) =>
          (page.width ?? 0) * (page.height ?? 0) >
          CONVERT_LIMITS.maxPagePixels * 0.999,
      );
      setMessage({
        tone: "success",
        text: `${created.length} page${created.length === 1 ? "" : "s"} exported at ${settings.pdfRender.dpi} DPI${
          capped ? " (capped at 36 megapixels per page)" : ""
        }. Download single pages or the whole ZIP.`,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        updateItem(item.id, { status: "cancelled", error: undefined });
        setMessage({
          tone: "info",
          text: "Export cancelled. Finished pages were kept in memory only while the run lasted.",
        });
      } else {
        updateItem(item.id, {
          status: "error",
          error: errorMessage(error),
        });
        setMessage({ tone: "error", text: errorMessage(error) });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const convertPdfToPages = async () => {
    if (!readyPdf) {
      setMessage({ tone: "error", text: "Add a PDF first." });
      return;
    }
    if (readyPdf.status === "inspecting") {
      setMessage({
        tone: "info",
        text: "Still reading this PDF. Try again in a moment.",
      });
      return;
    }
    if (!readyPdf.pageCount) {
      setMessage({
        tone: "error",
        text: "This PDF has not finished loading its page count. Try again.",
      });
      return;
    }
    await convertPdfPages(readyPdf);
  };

  const startConversion = async () => {
    if (busy) return;
    await convertPdfToPages();
  };

  const cancel = () => {
    abortRef.current?.abort();
    setMessage({ tone: "info", text: "Cancelling after the current page…" });
  };

  const retryItem = (id: string) => {
    if (busy) return;
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    const fresh: QueueItem = { ...item, status: "ready", error: undefined };
    updateItem(id, { status: "ready", error: undefined });
    void convertPdfPages(fresh);
  };

  const downloadAllZip = async () => {
    if (!results.length) return;
    try {
      const blob = await zipOutputs(
        results.map((result) => ({ name: result.name, blob: result.blob })),
      );
      const base = settings.baseName.trim() || "quickkit-pages";
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

  const exportCount = parsedRange.pages?.length ?? 0;
  const conversionLabel = `Export ${exportCount} page${
    exportCount === 1 ? "" : "s"
  }`;

  const previewTitle =
    compare === "result" ? "Converted output" : "Source preview";

  return (
    <div className="converter-workspace">
      <div className="workspace-heading">
        <div>
          <h2>Choose PDF pages and image export settings</h2>
          <p>
            Render the pages of a PDF to JPG, PNG or WEBP. Pick a page range,
            choose the resolution, then download single pages or the whole ZIP.
            Everything runs in this tab.
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
          Choose a PDF
        </button>
        <input
          ref={filesInputRef}
          id="pdf-to-image-input"
          data-testid="pdf-to-image-input"
          type="file"
          className="converter-file-input"
          accept={PDF_ACCEPT}
          disabled={busy}
          onChange={(event) => onPick(event.target.files)}
          aria-label="Choose a PDF to convert"
        />
        <div
          className="converter-supported"
          aria-label="Supported formats and limits"
        >
          {[
            "PDF up to 25 MB",
            "Up to 100 pages",
            "JPG · PNG · WEBP output",
            "72–600 DPI",
          ].map((label) => (
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
                className={
                  item.id === activeItemId
                    ? "converter-file selected"
                    : "converter-file"
                }
                data-testid="converter-item"
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
                      {`PDF · ${
                        item.pageCount
                          ? formatPages(item.pageCount)
                          : "reading pages…"
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
            <span className="chip converter-chip">PDF → image</span>
          </div>
          <PdfToImageSettings
            settings={settings}
            onChange={setSettings}
            support={support}
            disabled={busy}
            pageCount={pdfItem?.pageCount}
            pageWidthPt={pdfItem?.pageWidthPt}
            pageHeightPt={pdfItem?.pageHeightPt}
          />

          <div className="converter-actions">
            <button
              type="button"
              className="primary"
              data-testid="converter-run"
              onClick={() => void startConversion()}
              disabled={busy || !readyPdf}
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

          {!selected || !pdfItem ? (
            <div className="converter-empty">
              <ImageDown size={30} aria-hidden="true" />
              <strong>Nothing to preview yet</strong>
              <p>
                Add a PDF to see its real rendered pages here. Previews are
                built from your file, never stock images. from your file, never
                stock images.
              </p>
            </div>
          ) : compare === "result" && selectedResult ? (
            compare === "result" && selectedResult ? (
              <div className="converter-image-result">
                <div className="converter-stage">
                  <img
                    src={selectedResult.url}
                    alt={`Converted page ${selectedResult.page ?? ""} preview`}
                    className="converter-output-image"
                    data-testid="converter-result-image"
                  />
                </div>
                <div className="converter-detail-grid">
                  <span>Page</span>
                  <strong>{selectedResult.page ?? "—"}</strong>
                  <span>Format</span>
                  <strong>
                    {formatById(selectedResult.format as ConvertFormat).label}
                  </strong>
                  <span>Dimensions</span>
                  <strong>
                    {formatDimensions(
                      selectedResult.width,
                      selectedResult.height,
                    )}
                  </strong>
                  <span>File size</span>
                  <strong>{formatBytes(selectedResult.blob.size)}</strong>
                </div>
                <div className="converter-preview-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => downloadOne(selectedResult)}
                  >
                    <Download size={15} aria-hidden="true" /> Download page
                  </button>
                  <ExportedPageNav
                    results={results.filter(
                      (entry) => entry.itemId === selectedResult.itemId,
                    )}
                    current={selectedResult}
                    onSelect={(page) => setPdfPage(page)}
                  />
                </div>
              </div>
            ) : (
              <PdfGallery
                key={`source-${pdfItem.id}`}
                blob={pdfItem.file}
                pageCount={pdfItem.pageCount ?? 0}
                page={pdfPage}
                onPage={setPdfPage}
                selectedPages={parsedRange.pages}
                title={`Preview of ${pdfItem.name}`}
              />
            )
          ) : (
            <PdfGallery
              key={`source-${pdfItem.id}`}
              blob={pdfItem.file}
              pageCount={pdfItem.pageCount ?? 0}
              page={pdfPage}
              onPage={setPdfPage}
              selectedPages={parsedRange.pages}
              title={`Preview of ${pdfItem.name}`}
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
                  <small className="converter-size-compare">
                    {formatBytes(result.sourceBytes)} →{" "}
                    {formatBytes(result.blob.size)}
                    <span className="converter-saving">
                      {savingsLabel(result.sourceBytes, result.blob.size)}
                    </span>
                  </small>
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
          <Layers size={13} aria-hidden="true" /> JPG · PNG · WEBP output
        </span>
      </div>
    </div>
  );
}
