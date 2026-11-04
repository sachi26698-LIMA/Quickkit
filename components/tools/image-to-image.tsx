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
  History,
  ImageDown,
  Layers,
  Loader2,
  Pause,
  Play,
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
  CONVERT_FORMATS,
  CONVERT_LIMITS,
  INPUT_ACCEPT,
  defaultSettings,
  formatById,
  inputFormatFromName,
  type ConvertFormat,
  type ConvertSettings,
  type InputFormat,
} from "@/lib/tools/image-convert";
import {
  canvasEncodeSupport,
  convertImageFile,
  inspectInput,
  resetImageEncoder,
  zipOutputs,
  type CanvasSupport,
  type InputDetails,
} from "@/lib/tools/image-convert-runner";
import ImageToImageSettings from "./image-to-image/settings";
import {
  ImagePreview,
  errorMessage,
  type CompareView,
} from "./convert-shared/preview";
import {
  nextId,
  reportTotals,
  statusLabel,
  type BatchReport,
  type BatchRow,
} from "./convert-shared/report";
import {
  OVERRIDE_OPTIONS,
  formatDimensions,
  savingsLabel,
  type ConversionResult,
  type Message,
  type QueueItem,
} from "./convert-shared/types";
import {
  addImageHistoryItem,
  clearImageHistory,
  imageHistorySummary,
  loadImageHistory,
  loadImageHistoryRetention,
  MAX_IMAGE_HISTORY_ITEMS,
  removeImageHistoryItem,
  saveImageHistoryRetention,
  type ConvertHistoryItem,
  type ImageHistoryRetention,
} from "@/lib/tools/image-history";

const IMAGE_ACCEPT = INPUT_ACCEPT;

export default function ImageToImage() {
  const hydrated = useHydrated();
  /** This tool has exactly one job; there is no mode switcher to drift. */
  const mode = "image" as const;
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
  // Small screens get an explicit Files/Preview switch instead of one very
  // long column; both panels stay mounted so previews keep their state.
  const [mobilePanel, setMobilePanel] = useState<"files" | "preview">("files");

  const itemsRef = useRef<QueueItem[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());
  // Batch control: a batch can be paused between files and resumed, and every
  // run leaves a report so nothing that failed is quietly forgotten.
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const resumeRef = useRef<(() => void) | null>(null);
  const [batchReport, setBatchReport] = useState<BatchReport | null>(null);
  const [historyRetention, setHistoryRetention] =
    useState<ImageHistoryRetention>("session");
  const [history, setHistory] = useState<ConvertHistoryItem[]>([]);
  const batchRowsRef = useRef<BatchRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // History is opt-in and device-local. Reading the preference is sync; the
  // stored results are loaded only once a persisting retention is chosen.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const retention = loadImageHistoryRetention();
      const items = await loadImageHistory(retention);
      if (!cancelled) {
        setHistoryRetention(retention);
        setHistory(items);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const changeHistoryRetention = useCallback(
    (retention: ImageHistoryRetention) => {
      setHistoryRetention(retention);
      saveImageHistoryRetention(retention);
      void loadImageHistory(retention).then(setHistory);
    },
    [],
  );

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

  const readyImages = useMemo(
    () =>
      items.filter(
        (item) =>
          item.format !== "pdf" &&
          (item.status === "ready" ||
            item.status === "done" ||
            item.status === "error" ||
            item.status === "cancelled"),
      ),
    [items],
  );
  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (busy) return;
      if (!incoming.length) return;
      const accepted: QueueItem[] = [];
      const problems: string[] = [];
      const current = itemsRef.current;

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
        if (format === "pdf") {
          problems.push(
            `"${file.name}" is a PDF. Use PDF to Image Converter for PDFs.`,
          );
          continue;
        }
        if (file.size > CONVERT_LIMITS.maxImageBytes) {
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
          url: trackUrl(file),
          name: file.name,
          bytes: file.size,
          kind: "image",
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
    if (filesInputRef.current) filesInputRef.current.value = "";
  }, [busy, commitItems]);

  /* ----------------------------- conversion ------------------------------ */

  const convertImageBatch = async (targets: QueueItem[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setCompare("result");
    setMessage(null);
    setProgress({ done: 0, total: targets.length, label: "Preparing…" });
    for (const target of targets) {
      const stale = results.filter((result) => result.itemId === target.id);
      for (const result of stale) releaseUrl(result.url);
    }
    setResults((previous) =>
      previous.filter(
        (result) => !targets.some((target) => target.id === result.itemId),
      ),
    );

    let ok = 0;
    let failed = 0;
    batchRowsRef.current = [];
    const recordRow = (row: BatchRow) => {
      const rows = [...batchRowsRef.current, row];
      batchRowsRef.current = rows;
      setBatchReport({
        startedAt: reportStamp,
        rows,
      });
    };
    const reportStamp = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setBatchReport({ startedAt: reportStamp, rows: [] });
    for (let index = 0; index < targets.length; index += 1) {
      const item = targets[index];
      // Pausing takes effect between files, never in the middle of an encode.
      await waitWhilePaused();
      if (controller.signal.aborted) {
        updateItem(item.id, { status: "cancelled", error: undefined });
        recordRow({
          name: item.name,
          status: "cancelled",
          sourceBytes: item.bytes,
          outputBytes: 0,
          format: "—",
        });
        continue;
      }
      updateItem(item.id, {
        status: "converting",
        error: undefined,
        progress: undefined,
      });
      setProgress({
        done: index,
        total: targets.length,
        label: `Converting ${item.name}`,
      });
      try {
        const format =
          item.override === "auto" ? settings.image.format : item.override;
        const def = formatById(format);
        if (def.canvas && support && !support[format as keyof CanvasSupport]) {
          throw new Error(
            `This browser cannot encode ${def.label}. Choose another format.`,
          );
        }
        const details: InputDetails = {
          format: item.format as Exclude<InputFormat, "pdf">,
          kind: "image",
          width: item.width,
          height: item.height,
          dpi: item.dpi,
        };
        const output = await convertImageFile(item.file, {
          format,
          settings,
          details,
          signal: controller.signal,
          index: index + 1,
        });
        const url = trackUrl(output.blob);
        const result: ConversionResult = {
          id: nextId("result"),
          itemId: item.id,
          name: output.name,
          blob: output.blob,
          url,
          format: output.format,
          width: output.width,
          height: output.height,
          sourceBytes: item.bytes,
          sourceWidth: item.width,
          sourceHeight: item.height,
          note: output.note,
          size: output.size,
        };
        setResults((previous) => [
          ...previous.filter((entry) => entry.itemId !== item.id),
          result,
        ]);
        updateItem(item.id, { status: "done", error: undefined });
        const formatLabel = formatById(output.format as ConvertFormat).label;
        recordRow({
          name: output.name,
          status: "converted",
          sourceBytes: item.bytes,
          outputBytes: output.blob.size,
          format: formatLabel,
        });
        // Device-local history is opt-in; a skipped write never affects the
        // conversion, so this is fire-and-forget by design.
        void addImageHistoryItem(historyRetention, {
          sourceName: item.name,
          resultName: output.name,
          mime:
            output.blob.type || formatById(output.format as ConvertFormat).mime,
          summary: imageHistorySummary({
            width: output.width,
            height: output.height,
            formatLabel,
            quality: output.size?.lossless ? undefined : settings.image.quality,
            lossless: output.size?.lossless,
          }),
          warning: output.size?.warning,
          blob: output.blob,
        }).then((stored) => {
          if (stored)
            setHistory((previous) =>
              [stored, ...previous].slice(0, MAX_IMAGE_HISTORY_ITEMS),
            );
        });
        if (ok === 0) setSelectedId(item.id);
        ok += 1;
      } catch (error) {
        if (controller.signal.aborted) {
          updateItem(item.id, { status: "cancelled", error: undefined });
          recordRow({
            name: item.name,
            status: "cancelled",
            sourceBytes: item.bytes,
            outputBytes: 0,
            format: "—",
          });
        } else {
          failed += 1;
          const text = errorMessage(error);
          updateItem(item.id, { status: "error", error: text });
          // A failed file is listed in the report, never silently dropped.
          recordRow({
            name: item.name,
            status: "failed",
            sourceBytes: item.bytes,
            outputBytes: 0,
            format: formatById(
              (item.override === "auto"
                ? settings.image.format
                : item.override) as ConvertFormat,
            ).label,
            error: text,
          });
        }
      }

      setProgress({
        done: index + 1,
        total: targets.length,
        label: `Finished ${item.name}`,
      });
    }

    abortRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    resumeRef.current = null;
    if (ok > 0) setMobilePanel("preview");
    resetImageEncoder();
    setBusy(false);
    setBatchReport({
      startedAt: reportStamp,
      rows: batchRowsRef.current,
      paused: false,
    });
    setMessage(
      failed
        ? {
            tone: "error",
            text: `${ok} converted, ${failed} failed. Fix the file or try another format, then convert again.`,
          }
        : {
            tone: "success",
            text:
              ok === 1
                ? "Conversion finished. Compare the result and download it."
                : `${ok} images converted. Download them individually or as one ZIP.`,
          },
    );
  };

  const startConversion = async () => {
    if (busy) return;
    if (!readyImages.length) {
      setMessage({ tone: "error", text: "Add at least one image first." });
      return;
    }
    await convertImageBatch(readyImages);
  };

  const cancel = () => {
    abortRef.current?.abort();
    // A paused batch must not stay parked once the user cancels it.
    if (pausedRef.current) resume();
    setMessage({ tone: "info", text: "Cancelling after the current step…" });
  };

  /** Wait between files while the batch is paused. */
  const waitWhilePaused = () =>
    new Promise<void>((resolve) => {
      if (!pausedRef.current) {
        resolve();
        return;
      }
      resumeRef.current = resolve;
    });

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
    const fresh: QueueItem = { ...item, status: "ready", error: undefined };
    updateItem(id, { status: "ready", error: undefined });
    void convertImageBatch([fresh]);
  };

  const downloadAllZip = async () => {
    if (!results.length) return;
    try {
      const blob = await zipOutputs(
        results.map((result) => ({ name: result.name, blob: result.blob })),
      );
      const base = settings.baseName.trim() || "quickkit-converted";
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

  const conversionLabel = `Convert ${readyImages.length || 0} image${
    readyImages.length === 1 ? "" : "s"
  }`;

  const previewTitle =
    compare === "result" ? "Converted output" : "Source preview";

  return (
    <div className="converter-workspace">
      <div className="workspace-heading">
        <div>
          <h2>Image to Image Converter</h2>
          <p>
            Convert between JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF with real
            quality controls — all inside this tab.
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
          Drop images here to convert between JPG, PNG, WEBP, AVIF, GIF, BMP and
          TIFF.
        </p>
        <button
          type="button"
          className="primary converter-upload"
          onClick={() => filesInputRef.current?.click()}
          disabled={busy}
        >
          <Upload size={16} aria-hidden="true" />
          Choose images
        </button>
        <input
          ref={filesInputRef}
          id="image-to-image-input"
          data-testid="image-to-image-input"
          type="file"
          className="converter-file-input"
          accept={IMAGE_ACCEPT}
          multiple
          disabled={busy}
          onChange={(event) => onPick(event.target.files)}
          aria-label="Choose images to convert"
        />
        <div
          className="converter-supported"
          aria-label="Supported formats and limits"
        >
          {[
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
                  }}
                  aria-pressed={item.id === activeItemId}
                  aria-label={`Preview ${item.name}`}
                >
                  <span className="converter-thumb">
                    {item.url ? (
                      <img src={item.url} alt="" />
                    ) : (
                      <FileImage size={20} aria-hidden="true" />
                    )}
                  </span>
                  <span className="converter-file-copy">
                    <strong>{item.name}</strong>
                    <small>
                      {`${formatById(item.format as ConvertFormat).label} · ${
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
                {(() => {
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
                })()}
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
            <span className="chip converter-chip">Image → image</span>
          </div>
          <ImageToImageSettings
            settings={settings}
            onChange={setSettings}
            support={support}
            disabled={busy}
            selectedSize={
              selected && selected.format !== "pdf"
                ? { width: selected.width, height: selected.height }
                : undefined
            }
            sourceKind={
              selected &&
              selected.format !== "pdf" &&
              selected.format !== "heic"
                ? formatById(selected.format).kind
                : undefined
            }
            sourceBytes={
              selected && selected.format !== "pdf" ? selected.bytes : undefined
            }
          />

          <div className="converter-actions">
            <button
              type="button"
              className="primary"
              data-testid="converter-run"
              onClick={() => void startConversion()}
              disabled={busy || !readyImages.length}
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

        <aside
          id="converter-preview-panel"
          className="converter-panel converter-preview"
          aria-labelledby="preview-heading"
        >
          <div className="converter-panel-head">
            <h3 id="preview-heading">
              <Eye size={16} aria-hidden="true" /> {previewTitle}
            </h3>
            {canCompare ? (
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
                  disabled={!results.length}
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
                Add an image to see a real preview and file details here.
                Previews are built from your file, never stock images.
              </p>
            </div>
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
                  }}
                  aria-label={`Preview ${result.name}`}
                >
                  <img src={result.url} alt="" />
                </button>
                <div className="converter-result-copy">
                  <strong title={result.name}>{result.name}</strong>
                  <small>
                    {`${formatById(result.format as ConvertFormat).label} · ${formatDimensions(
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
          </p>
        </section>
      ) : null}

      <section className="converter-history" aria-label="Conversion history">
        <div className="converter-queue-head">
          <h3>
            <History size={16} aria-hidden="true" /> Conversion history
          </h3>
          <label className="converter-history-retention">
            Keep on this device for
            <select
              aria-label="How long to keep conversion history on this device"
              value={historyRetention}
              onChange={(event) =>
                changeHistoryRetention(
                  event.target.value as ImageHistoryRetention,
                )
              }
            >
              <option value="session">This session only</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
            </select>
          </label>
        </div>
        {historyRetention === "session" ? (
          <p className="converter-hint">
            Nothing is stored. Choose 24 hours or 7 days to keep converted files
            on this device so you can download them again later.
          </p>
        ) : history.length ? (
          <>
            <ul className="converter-history-list">
              {history.map((entry) => (
                <li key={entry.id} data-testid="converter-history-item">
                  <div className="converter-history-copy">
                    <strong title={entry.resultName}>{entry.resultName}</strong>
                    <small>{entry.summary}</small>
                    <small className="converter-size-compare">
                      {`${formatBytes(entry.size)} · from ${entry.sourceName}`}
                    </small>
                    {entry.warning ? (
                      <small className="converter-result-note">
                        {entry.warning}
                      </small>
                    ) : null}
                  </div>
                  <div className="converter-result-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => downloadBlob(entry.blob, entry.resultName)}
                      aria-label={`Download ${entry.resultName} from history`}
                    >
                      <Download size={15} aria-hidden="true" /> Download
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setHistory((previous) =>
                          previous.filter((row) => row.id !== entry.id),
                        );
                        void removeImageHistoryItem(entry.id);
                      }}
                      aria-label={`Remove ${entry.resultName} from history`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setHistory([]);
                void clearImageHistory();
              }}
              aria-label="Clear all conversion history"
            >
              <Trash2 size={14} aria-hidden="true" /> Clear history
            </button>
          </>
        ) : (
          <p className="converter-hint">
            No stored conversions yet. Converted files will appear here and
            survive a page reload.
          </p>
        )}
      </section>

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
