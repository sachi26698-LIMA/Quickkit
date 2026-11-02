"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleStop,
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  Files,
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
  CONVERT_FORMATS,
  INPUT_ACCEPT,
  CONVERT_LIMITS,
  INPUT_ACCEPT_PDF,
  describePageRange,
  defaultSettings,
  formatById,
  inputFormatFromName,
  keepsAlpha,
  mmToPt,
  parsePageRange,
  placeImage,
  resolvePage,
  type ConvertFormat,
  type ConvertMode,
  type ConvertSettings,
  type InputFormat,
} from "@/lib/tools/image-convert";
import {
  canvasEncodeSupport,
  convertImageFile,
  imagesToPdf,
  inspectInput,
  pdfToImages,
  readPdfPageCount,
  renderPdfThumbnails,
  resetImageEncoder,
  zipOutputs,
  type CanvasSupport,
  type InputDetails,
} from "@/lib/tools/image-convert-runner";
import ConverterSettings from "./image-converter/settings-panel";
import {
  MODE_META,
  OVERRIDE_OPTIONS,
  formatDimensions,
  formatPages,
  savingsLabel,
  type ConversionResult,
  type Message,
  type QueueItem,
  type QueueStatus,
} from "./image-converter/types";

const IMAGE_ACCEPT = INPUT_ACCEPT;
const PDF_ACCEPT = INPUT_ACCEPT_PDF;
let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";

const statusLabel: Record<QueueStatus, string> = {
  inspecting: "Reading…",
  ready: "Ready",
  converting: "Converting…",
  done: "Converted",
  error: "Needs attention",
  cancelled: "Cancelled",
};

export default function ImageConverter() {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<ConvertMode>("image");
  const [settings, setSettings] = useState<ConvertSettings>(() =>
    defaultSettings("image"),
  );
  const [items, setItems] = useState<QueueItem[]>([]);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compare, setCompare] = useState<"source" | "result">("source");
  const [zoom, setZoom] = useState(100);
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
  const isPdfMode = mode === "pdf-to-image";
  const pdfItem = isPdfMode && selected?.format === "pdf" ? selected : null;
  const selectedResult =
    results.find(
      (result) =>
        result.itemId === activeItemId &&
        (!isPdfMode || result.page === pdfPage),
    ) ??
    results.find((result) => result.itemId === activeItemId) ??
    results[0] ??
    null;
  const canCompare =
    Boolean(selected) && (mode !== "pdf-to-image" || Boolean(pdfItem));

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
      const wantsPdf = mode === "pdf-to-image";

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
        if (wantsPdf && format !== "pdf") {
          problems.push(
            `"${file.name}" is an image. Switch to Image to image or Images to PDF.`,
          );
          continue;
        }
        if (!wantsPdf && format === "pdf") {
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
            updateItem(item.id, {
              status: "ready",
              pageCount: pages,
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
    [busy, commitItems, mode, selectedId, trackUrl, updateItem],
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

  const changeMode = (next: ConvertMode) => {
    if (busy || next === mode) return;
    const keeps =
      next === "pdf-to-image"
        ? itemsRef.current.filter((item) => item.format === "pdf").slice(0, 1)
        : itemsRef.current.filter((item) => item.format !== "pdf");
    for (const result of results) releaseUrl(result.url);
    setResults([]);
    setCompare("source");
    setPdfPage(1);
    if (keeps.length !== itemsRef.current.length) {
      for (const item of itemsRef.current)
        if (!keeps.includes(item)) releaseUrl(item.url);
      commitItems(keeps);
      setSelectedId(keeps[0]?.id ?? null);
      setMessage({
        tone: "info",
        text:
          keeps.length > 0
            ? "Kept the files that fit the new mode. Other files were removed from the queue."
            : "Mode changed. Add files for this conversion.",
      });
    } else {
      setMessage(null);
    }
    setMode(next);
    setSettings((previous) => ({ ...previous, mode: next }));
    setProgress({ done: 0, total: 0, label: "" });
  };

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
    for (let index = 0; index < targets.length; index += 1) {
      const item = targets[index];
      if (controller.signal.aborted) {
        updateItem(item.id, { status: "cancelled", error: undefined });
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
        };
        setResults((previous) => [
          ...previous.filter((entry) => entry.itemId !== item.id),
          result,
        ]);
        updateItem(item.id, { status: "done", error: undefined });
        if (ok === 0) setSelectedId(item.id);
        ok += 1;
      } catch (error) {
        if (controller.signal.aborted) {
          updateItem(item.id, { status: "cancelled", error: undefined });
        } else {
          failed += 1;
          updateItem(item.id, {
            status: "error",
            error: errorMessage(error),
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
    if (ok > 0) setMobilePanel("preview");
    resetImageEncoder();
    setBusy(false);
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
    if (mode === "image") {
      if (!readyImages.length) {
        setMessage({ tone: "error", text: "Add at least one image first." });
        return;
      }
      await convertImageBatch(readyImages);
      return;
    }
    if (mode === "images-to-pdf") {
      await convertToPdfFile();
      return;
    }
    await convertPdfToPages();
  };

  const cancel = () => {
    abortRef.current?.abort();
    setMessage({ tone: "info", text: "Cancelling after the current step…" });
  };

  const retryItem = (id: string) => {
    if (busy) return;
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    const fresh: QueueItem = { ...item, status: "ready", error: undefined };
    updateItem(id, { status: "ready", error: undefined });
    if (mode === "image") {
      if (item.format === "pdf") return;
      void convertImageBatch([fresh]);
      return;
    }
    if (mode === "images-to-pdf") {
      void convertToPdfFile();
      return;
    }
    void convertPdfToPages();
  };

  const downloadAllZip = async () => {
    if (!results.length) return;
    try {
      const blob = await zipOutputs(
        results.map((result) => ({ name: result.name, blob: result.blob })),
      );
      const base =
        settings.baseName.trim() ||
        (mode === "images-to-pdf" ? "quickkit-pdf" : "quickkit-converted");
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
    mode === "image"
      ? `Convert ${readyImages.length || 0} image${readyImages.length === 1 ? "" : "s"}`
      : mode === "images-to-pdf"
        ? `Create PDF · ${readyImages.length} page${readyImages.length === 1 ? "" : "s"}`
        : `Export ${parsedRange.pages?.length ?? 0} page${
            (parsedRange.pages?.length ?? 0) === 1 ? "" : "s"
          }`;

  const previewTitle =
    compare === "result" ? "Converted output" : "Source preview";

  return (
    <div className="converter-workspace">
      <div className="workspace-heading">
        <div>
          <h2>Image &amp; PDF Converter</h2>
          <p>
            Convert images, build PDFs from pictures, and export PDF pages — all
            inside this tab.
          </p>
        </div>
        <span className="local-badge">
          <ShieldCheck size={13} aria-hidden="true" /> Local processing
        </span>
      </div>

      <div
        className="converter-modes"
        role="group"
        aria-label="Conversion mode"
      >
        {MODE_META.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={mode === entry.id}
            className={
              mode === entry.id ? "converter-mode active" : "converter-mode"
            }
            disabled={busy}
            onClick={() => changeMode(entry.id)}
          >
            <span className="converter-mode-icon">
              {entry.id === "image" ? (
                <ArrowRightLeft size={18} aria-hidden="true" />
              ) : entry.id === "images-to-pdf" ? (
                <FileText size={18} aria-hidden="true" />
              ) : (
                <FileImage size={18} aria-hidden="true" />
              )}
            </span>
            <span>
              <strong>{entry.label}</strong>
              <small>{entry.short}</small>
            </span>
          </button>
        ))}
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
          {mode === "pdf-to-image" ? "Choose a PDF" : "Choose images"}
        </button>
        <input
          ref={filesInputRef}
          id="image-converter-input"
          data-testid="image-converter-input"
          type="file"
          className="converter-file-input"
          accept={mode === "pdf-to-image" ? PDF_ACCEPT : IMAGE_ACCEPT}
          multiple={mode !== "pdf-to-image"}
          disabled={busy}
          onChange={(event) => onPick(event.target.files)}
          aria-label={
            mode === "pdf-to-image"
              ? "Choose a PDF to convert"
              : "Choose images to convert"
          }
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
          <ConverterSettings
            mode={mode}
            settings={settings}
            onChange={setSettings}
            support={support}
            disabled={busy}
            selectedSize={
              selected && selected.format !== "pdf"
                ? { width: selected.width, height: selected.height }
                : undefined
            }
            pageCount={pdfItem?.pageCount}
          />

          <div className="converter-actions">
            <button
              type="button"
              className="primary"
              data-testid="converter-run"
              onClick={() => void startConversion()}
              disabled={
                busy ||
                (!readyImages.length && mode !== "pdf-to-image") ||
                (mode === "pdf-to-image" && !readyPdf)
              }
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
          ) : mode === "pdf-to-image" && pdfItem ? (
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
                compare === "result" && results.length ? "result" : "source"
              }
              zoom={zoom}
              onZoom={setZoom}
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
  zoom,
  onZoom,
}: {
  item: QueueItem;
  result?: ConversionResult;
  compare: "source" | "result";
  zoom: number;
  onZoom: (value: number) => void;
}) {
  const showingResult = compare === "result" && Boolean(result);
  const source = showingResult && result ? result : null;
  const transparency =
    showingResult && result
      ? keepsAlpha(result.format as ConvertFormat)
      : keepsAlpha(item.format as ConvertFormat);
  return (
    <div className="converter-image-preview">
      <div
        className={
          transparency
            ? "converter-stage converter-checkerboard"
            : "converter-stage"
        }
      >
        <img
          src={source ? source.url : item.url}
          alt={`${showingResult ? "Converted" : "Original"} preview of ${item.name}`}
          style={{ width: `${zoom}%` }}
          data-testid="converter-preview-image"
        />
      </div>
      <div className="converter-zoom">
        <label htmlFor="converter-zoom">Zoom</label>
        <input
          id="converter-zoom"
          type="range"
          min={50}
          max={300}
          step={10}
          value={zoom}
          onChange={(event) => onZoom(Number(event.target.value))}
        />
        <output>{zoom}%</output>
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
    </div>
  );
}

function ExportedPageNav({
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
