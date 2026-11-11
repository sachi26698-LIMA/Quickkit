"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleStop,
  CopyPlus,
  Download,
  Eye,
  FileImage,
  FileText,
  Files,
  ImageDown,
  Layers,
  Loader2,
  RefreshCw,
  RotateCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { downloadBlob, formatBytes } from "@/lib/tools/download";
import {
  CONVERT_LIMITS,
  INPUT_ACCEPT,
  PAGE_SIZES,
  defaultSettings,
  formatById,
  inputFormatFromName,
  type ConvertFormat,
  type ConvertSettings,
} from "@/lib/tools/image-convert";
import { imagesToPdf, inspectInput } from "@/lib/tools/image-convert-runner";
import ImagesToPdfSettings from "./images-to-pdf/settings";
import {
  PdfGallery,
  PdfLayoutPreview,
  errorMessage,
  type CompareView,
} from "./convert-shared/preview";
import { nextId, statusLabel } from "./convert-shared/report";
import {
  formatDimensions,
  formatPages,
  type ConversionResult,
  type Message,
  type QueueItem,
} from "./convert-shared/types";

const IMAGE_ACCEPT = INPUT_ACCEPT;

export default function ImagesToPdf() {
  /** One job: pictures in, one PDF out. There is no mode switcher. */
  const mode = "images-to-pdf" as const;
  const [settings, setSettings] = useState<ConvertSettings>(() =>
    defaultSettings("images-to-pdf"),
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
  const [pdfPage, setPdfPage] = useState(1);
  // Small screens get an explicit Files/Preview switch instead of one very
  // long column; both panels stay mounted so previews keep their state.
  const [mobilePanel, setMobilePanel] = useState<"files" | "preview">("files");

  const itemsRef = useRef<QueueItem[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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
            `"${file.name}" is a PDF. Use PDF Studio or PDF to Image Converter for PDFs.`,
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

  /**
   * Duplicate a page, inserting the copy directly after the original.
   *
   * The copy gets its own object URL rather than sharing the source's:
   * removeItem revokes the URL of whatever row it is given, so two rows
   * sharing one URL would lose their preview when either was removed.
   * Per-page rotation carries over, since duplicating a page you have already
   * turned is the point of the action.
   */
  const duplicateItem = useCallback(
    (id: string) => {
      if (busy) return;
      const current = itemsRef.current;
      const index = current.findIndex((entry) => entry.id === id);
      const source = current[index];
      if (!source) return;

      if (current.length >= CONVERT_LIMITS.maxFiles) {
        setMessage({
          tone: "error",
          text: `The queue holds ${CONVERT_LIMITS.maxFiles} files. Remove one before duplicating.`,
        });
        return;
      }
      const totalBytes = current.reduce((sum, entry) => sum + entry.bytes, 0);
      if (totalBytes + source.bytes > CONVERT_LIMITS.maxBatchBytes) {
        setMessage({
          tone: "error",
          text: `Duplicating would exceed the ${formatBytes(
            CONVERT_LIMITS.maxBatchBytes,
          )} batch limit.`,
        });
        return;
      }

      const copy: QueueItem = {
        ...source,
        id: nextId("file"),
        url: trackUrl(source.file),
        // The source was already inspected, so the copy is ready immediately
        // rather than being sent back through "inspecting".
        status: "ready",
        error: undefined,
      };
      const next = [...current];
      next.splice(index + 1, 0, copy);
      commitItems(next);
      setMessage(null);
    },
    [busy, commitItems, trackUrl],
  );

  /**
   * Turn one page a quarter turn clockwise. 360 wraps back to 0 so the row
   * label and the engine always agree on a 0/90/180/270 angle.
   */
  const rotateItem = useCallback(
    (id: string) => {
      if (busy) return;
      commitItems(
        itemsRef.current.map((entry) =>
          entry.id === id
            ? { ...entry, rotation: ((entry.rotation ?? 0) + 90) % 360 }
            : entry,
        ),
      );
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
    if (filesInputRef.current) filesInputRef.current.value = "";
  }, [busy, commitItems]);

  /* ----------------------------- conversion ------------------------------ */

  const convertToPdfFile = async () => {
    const targets = readyImages;
    if (!targets.length) {
      setMessage({
        tone: "error",
        text: "Add at least one image to create a PDF.",
      });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setMessage(null);
    setCompare("result");
    for (const result of results) releaseUrl(result.url);
    setResults([]);
    for (const target of targets)
      updateItem(target.id, {
        status: "converting",
        error: undefined,
        progress: 0,
      });
    setProgress({
      done: 0,
      total: targets.length,
      label: "Building the first page…",
    });
    try {
      const output = await imagesToPdf(
        targets.map((target) => target.file),
        settings,
        {
          signal: controller.signal,
          rotations: targets.map((target) => target.rotation ?? 0),
          onPage: (done, total) => {
            setProgress({
              done,
              total,
              label: `Placing page ${done} of ${total}…`,
            });
            for (const target of targets)
              updateItem(target.id, { progress: done / total });
          },
        },
      );
      const url = trackUrl(output.blob);
      const result: ConversionResult = {
        id: nextId("pdf"),
        itemId: targets[0].id,
        name: output.name,
        blob: output.blob,
        url,
        format: "pdf",
        pages: output.pages,
        sourceBytes: targets.reduce((sum, target) => sum + target.bytes, 0),
        note: output.note,
      };
      setResults([result]);
      setMobilePanel("preview");
      for (const target of targets)
        updateItem(target.id, { status: "done", error: undefined });
      setSelectedId(targets[0].id);
      setPdfPage(1);
      setMessage({
        tone: "success",
        text: `${output.pages} page PDF created with ${targets.length} image${targets.length === 1 ? "" : "s"}. Previews below are rendered from the real PDF.`,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        for (const target of targets)
          updateItem(target.id, { status: "cancelled", error: undefined });
        setMessage({ tone: "info", text: "PDF creation cancelled." });
      } else {
        for (const target of targets)
          updateItem(target.id, {
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

  const startConversion = async () => {
    if (busy) return;
    await convertToPdfFile();
  };

  const cancel = () => {
    abortRef.current?.abort();
    setMessage({ tone: "info", text: "Cancelling after the current step…" });
  };

  const retryItem = (id: string) => {
    if (busy) return;
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    updateItem(id, { status: "ready", error: undefined });
    void convertToPdfFile();
  };

  const downloadOne = (result: ConversionResult) => {
    downloadBlob(result.blob, result.name);
  };

  const totalDone = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;
  const pct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  const conversionLabel = `Create PDF · ${readyImages.length} page${
    readyImages.length === 1 ? "" : "s"
  }`;

  const previewTitle =
    compare === "result" ? "Converted output" : "Source preview";

  return (
    <div className="converter-workspace">
      <div className="workspace-heading">
        <div>
          <h2>Arrange images and set PDF page options</h2>
          <p>
            Put your pictures into one PDF, one image per page, with real page
            sizes, margins and ordering.
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
        <p>Drop images here — each one becomes a PDF page.</p>
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
          id="images-to-pdf-input"
          data-testid="images-to-pdf-input"
          type="file"
          className="converter-file-input"
          accept={IMAGE_ACCEPT}
          multiple
          disabled={busy}
          onChange={(event) => onPick(event.target.files)}
          aria-label="Choose images to turn into a PDF"
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
            "Up to 20 pages",
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
                      {`${formatById(item.format as ConvertFormat).label} · ${
                        item.width
                          ? formatDimensions(item.width, item.height)
                          : "reading size…"
                      }${
                        item.rotation ? ` · turned ${item.rotation}°` : ""
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
                {mode === "images-to-pdf" ? (
                  <>
                    <button
                      type="button"
                      className="converter-icon-button"
                      onClick={() => rotateItem(item.id)}
                      disabled={busy}
                      aria-label={`Rotate ${item.name} 90 degrees clockwise`}
                      title={
                        item.rotation
                          ? `Turned ${item.rotation}°, rotate again`
                          : "Rotate 90 degrees clockwise"
                      }
                    >
                      <RotateCw size={15} aria-hidden="true" />
                    </button>
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
                <button
                  type="button"
                  className="converter-icon-button"
                  onClick={() => duplicateItem(item.id)}
                  disabled={busy}
                  aria-label={`Duplicate ${item.name}`}
                  title="Duplicate page"
                >
                  <CopyPlus size={16} aria-hidden="true" />
                </button>
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
            <span className="chip converter-chip">Images → PDF</span>
          </div>
          <ImagesToPdfSettings
            settings={settings}
            onChange={setSettings}
            disabled={busy}
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
            <button
              type="button"
              className="secondary"
              data-testid="converter-clear"
              onClick={clearAll}
              disabled={busy || !items.length}
            >
              <Trash2 size={15} aria-hidden="true" /> Clear
            </button>
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
                  PDF
                </button>
              </div>
            ) : null}
          </div>

          {!selected ? (
            <div className="converter-empty">
              <ImageDown size={30} aria-hidden="true" />
              <strong>Nothing to preview yet</strong>
              <p>
                Add images to see a real page-layout preview here. Previews are
                built from your file, never stock images.
              </p>
            </div>
          ) : compare === "result" && results[0]?.format === "pdf" ? (
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
                  <span className="converter-pdf-thumb">
                    <FileText size={28} aria-hidden="true" />
                    <small>{formatPages(result.pages)}</small>
                  </span>
                </button>
                <div className="converter-result-copy">
                  <strong title={result.name}>{result.name}</strong>
                  <small>{`PDF · ${formatPages(result.pages)}`}</small>
                  <small className="converter-size-compare">
                    {formatBytes(result.sourceBytes)} of images →{" "}
                    {formatBytes(result.blob.size)}
                  </small>
                  <small>Raster PDF · no text layer</small>
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
            Page count and file size above are read from the actual PDF that was
            written, not from an estimate.
          </p>
        </section>
      ) : null}

      <div className="workspace-foot">
        <p>
          Files are decoded and encoded on this device. Closing the tab clears
          the queue and results. Originals are never modified.
        </p>
        <span className="chip converter-chip">
          <Layers size={13} aria-hidden="true" /> {PAGE_SIZES.length} paper
          sizes
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */
