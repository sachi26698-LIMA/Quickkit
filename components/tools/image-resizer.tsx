"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileArchive,
  ImagePlus,
  Lock,
  LockOpen,
  RefreshCw,
  Scaling,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { formatBytes } from "@/lib/tools/image";
import {
  ALL_PRESETS,
  MAX_BATCH_FILES,
  PERCENTAGE_STEPS,
  PRESET_SIZES,
  SOCIAL_PRESETS,
  formatLabel,
  formatPixels,
  linkedHeight,
  linkedWidth,
  megapixels,
  outputFileName,
  planResize,
  scalePercent,
  sizeDeltaLabel,
  uniqueName,
  type FitMode,
  type OutputFormat,
  type PresetSize,
  type ResizeMode,
  type ResizePlan,
  type ResizeSettings,
} from "@/lib/tools/image-resize";
import {
  inspectFile,
  resizeImageFile,
  type OutputSettings,
} from "@/lib/tools/image-resize-runner";
import { createZip } from "@/lib/tools/zip";

type QueueStatus = "ready" | "working" | "done" | "error";

type QueueItem = {
  id: string;
  file: File;
  originalUrl: string;
  width: number;
  height: number;
  status: QueueStatus;
  error?: string;
  result?: {
    blob: Blob;
    url: string;
    width: number;
    height: number;
    filename: string;
  };
};

const MODES: { id: ResizeMode; label: string; hint: string }[] = [
  { id: "dimensions", label: "Dimensions", hint: "Exact pixels" },
  { id: "percentage", label: "Percentage", hint: "Scale up or down" },
  { id: "preset", label: "Presets", hint: "Common & social" },
];

const FITS: { id: FitMode; label: string; hint: string }[] = [
  {
    id: "cover",
    label: "Fill & crop",
    hint: "Exact preset size, centred crop",
  },
  { id: "contain", label: "Fit inside", hint: "Keep the whole image" },
  { id: "stretch", label: "Stretch", hint: "Force the exact dimensions" },
];

const FORMATS: { id: OutputFormat; label: string; note: string }[] = [
  { id: "image/webp", label: "WebP", note: "Small files · transparency" },
  { id: "image/jpeg", label: "JPEG", note: "Universal · flattened" },
  { id: "image/png", label: "PNG", note: "Lossless · transparency" },
];

let idCounter = 0;
function nextId() {
  idCounter += 1;
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${idCounter}`;
  return `${random}-${idCounter}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong while processing this image.";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function ImageResizer() {
  const ready = useHydrated();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ResizeMode>("dimensions");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [lock, setLock] = useState(true);
  const [percentage, setPercentage] = useState(50);
  const [presetId, setPresetId] = useState(PRESET_SIZES[0].id);
  const [fit, setFit] = useState<FitMode>("cover");
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(85);
  const [background, setBackground] = useState("#ffffff");
  const [previewMode, setPreviewMode] = useState<"original" | "resized">(
    "original",
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  const urlsRef = useRef<Map<string, string>>(new Map());
  const runRef = useRef(0);

  const registerUrl = useCallback((key: string, url: string) => {
    const previous = urlsRef.current.get(key);
    if (previous) URL.revokeObjectURL(previous);
    urlsRef.current.set(key, url);
  }, []);

  const commitItems = useCallback((next: QueueItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const selectedPreset = useMemo<PresetSize | null>(
    () => ALL_PRESETS.find((preset) => preset.id === presetId) ?? null,
    [presetId],
  );

  const activeItem =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const doneItems = items.filter((item) => item.result);

  /**
   * Clear finished output when settings change so a download can never
   * silently use stale dimensions or format.
   */
  const clearResults = useCallback(() => {
    setNotice("");
    setPreviewMode("original");
    const current = itemsRef.current;
    if (!current.some((item) => item.result)) return;
    current.forEach((item) => {
      if (!item.result) return;
      const key = `${item.id}:result`;
      const url = urlsRef.current.get(key);
      if (url) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(key);
      }
    });
    commitItems(
      current.map((item) =>
        item.result
          ? { ...item, result: undefined, status: "ready" as const }
          : item,
      ),
    );
  }, [commitItems]);

  const sourceWidth = activeItem?.width ?? (Number(width) || 16);
  const sourceHeight = activeItem?.height ?? (Number(height) || 9);

  const settings = useMemo<ResizeSettings>(
    () => ({
      mode,
      width: Number(width),
      height: Number(height),
      lockAspect: lock,
      percentage: Number(percentage),
      fit,
      preset: selectedPreset
        ? { width: selectedPreset.width, height: selectedPreset.height }
        : null,
    }),
    [mode, width, height, lock, percentage, fit, selectedPreset],
  );

  const outputSettings = useMemo<OutputSettings>(
    () => ({
      ...settings,
      format,
      quality: quality / 100,
      background,
    }),
    [settings, format, quality, background],
  );

  const planFor = useCallback(
    (item: Pick<QueueItem, "width" | "height">) => {
      try {
        return planResize(item.width, item.height, settings);
      } catch {
        return null;
      }
    },
    [settings],
  );

  const activePlan: ResizePlan | null = activeItem ? planFor(activeItem) : null;
  const planError = (() => {
    if (!activeItem) return "";
    try {
      planResize(activeItem.width, activeItem.height, settings);
      return "";
    } catch (error) {
      return errorMessage(error);
    }
  })();

  function invalidate(update: () => void) {
    clearResults();
    setIssues([]);
    update();
  }

  function handleWidth(value: string) {
    invalidate(() => {
      setWidth(value);
      if (lock) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0)
          setHeight(String(linkedHeight(parsed, sourceWidth, sourceHeight)));
      }
    });
  }

  function handleHeight(value: string) {
    invalidate(() => {
      setHeight(value);
      if (lock) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0)
          setWidth(String(linkedWidth(parsed, sourceWidth, sourceHeight)));
      }
    });
  }

  function matchOriginal() {
    if (!activeItem) return;
    invalidate(() => {
      setMode("dimensions");
      setWidth(String(activeItem.width));
      setHeight(String(activeItem.height));
      setLock(true);
    });
  }

  function swapDimensions() {
    invalidate(() => {
      setWidth(height);
      setHeight(width);
    });
  }

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    setNotice("");
    const problems: string[] = [];
    const fresh: QueueItem[] = [];
    const room = MAX_BATCH_FILES - itemsRef.current.length;
    if (room <= 0) {
      setIssues([
        `You can resize up to ${MAX_BATCH_FILES} images in one batch. Remove one to add another.`,
      ]);
      return;
    }
    if (files.length > room)
      problems.push(
        `Only ${room} more image${room === 1 ? "" : "s"} could be added — the batch limit is ${MAX_BATCH_FILES}.`,
      );

    for (const file of files.slice(0, room)) {
      try {
        const dimensions = await inspectFile(file);
        const id = nextId();
        const originalUrl = URL.createObjectURL(file);
        registerUrl(`${id}:original`, originalUrl);
        fresh.push({
          id,
          file,
          originalUrl,
          width: dimensions.width,
          height: dimensions.height,
          status: "ready",
        });
      } catch (error) {
        problems.push(`${file.name}: ${errorMessage(error)}`);
      }
    }

    if (fresh.length) {
      const first = itemsRef.current.length === 0;
      commitItems([...itemsRef.current, ...fresh]);
      if (first) {
        setSelectedId(fresh[0].id);
        setWidth(String(fresh[0].width));
        setHeight(String(fresh[0].height));
      }
      setNotice(
        `${fresh.length} image${fresh.length === 1 ? "" : "s"} added. Choose a size, then resize.`,
      );
    }
    setIssues(problems);
    if (problems.length && !fresh.length && inputRef.current)
      inputRef.current.value = "";
  }

  async function resizeAll() {
    const queue = itemsRef.current;
    if (!queue.length) {
      setIssues(["Add at least one image before resizing."]);
      setNotice("");
      return;
    }
    try {
      planResize(queue[0].width, queue[0].height, settings);
    } catch (error) {
      setIssues([errorMessage(error)]);
      setNotice("");
      return;
    }

    const run = runRef.current + 1;
    runRef.current = run;
    setIssues([]);
    setNotice("");
    setBusy(true);
    setProgress({ done: 0, total: queue.length });
    let failures = 0;
    let completed = 0;

    for (let index = 0; index < queue.length; index += 1) {
      if (run !== runRef.current) break;
      const current = itemsRef.current.find(
        (item) => item.id === queue[index].id,
      );
      if (!current) continue;
      commitItems(
        itemsRef.current.map((item) =>
          item.id === current.id
            ? { ...item, status: "working" as const, error: undefined }
            : item,
        ),
      );
      try {
        const result = await resizeImageFile(current.file, outputSettings);
        if (run !== runRef.current) return;
        const url = URL.createObjectURL(result.blob);
        registerUrl(`${current.id}:result`, url);
        const filename = outputFileName(
          current.file.name,
          result.width,
          result.height,
          format,
        );
        setPreviewMode("resized");
        commitItems(
          itemsRef.current.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  status: "done" as const,
                  error: undefined,
                  result: {
                    blob: result.blob,
                    url,
                    width: result.width,
                    height: result.height,
                    filename,
                  },
                }
              : item,
          ),
        );
        completed += 1;
      } catch (error) {
        failures += 1;
        commitItems(
          itemsRef.current.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  status: "error" as const,
                  error: errorMessage(error),
                  result: undefined,
                }
              : item,
          ),
        );
      }
      setProgress({ done: index + 1, total: queue.length });
    }

    setBusy(false);
    if (completed && !failures)
      setNotice(
        `${completed} image${completed === 1 ? "" : "s"} resized locally. Preview, download individually, or grab the ZIP.`,
      );
    else if (completed && failures)
      setNotice(
        `${completed} resized successfully. ${failures} could not be processed — review the messages below.`,
      );
    else if (failures)
      setIssues([
        "None of the images could be resized. Check the messages in the queue.",
      ]);
  }

  function removeItem(id: string) {
    for (const key of [`${id}:original`, `${id}:result`]) {
      const url = urlsRef.current.get(key);
      if (url) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(key);
      }
    }
    const next = itemsRef.current.filter((item) => item.id !== id);
    commitItems(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    setIssues([]);
    if (!next.length) setNotice("");
  }

  async function downloadZip() {
    const ready = itemsRef.current.filter((item) => item.result);
    if (!ready.length) {
      setIssues([
        "Resize at least one image before downloading a ZIP archive.",
      ]);
      return;
    }
    setZipBusy(true);
    setIssues([]);
    try {
      const payloads = await Promise.all(
        ready.map(async (item) => ({
          name: item.result!.filename,
          data: new Uint8Array(await item.result!.blob.arrayBuffer()),
        })),
      );
      const used = new Set<string>();
      const entries = payloads.map((payload) => ({
        name: uniqueName(payload.name, used),
        data: payload.data,
      }));
      const bytes = createZip(entries);
      downloadBlob(
        new Blob([bytes], { type: "application/zip" }),
        "quickkit-resized-images.zip",
      );
      setNotice(
        `${entries.length} image${entries.length === 1 ? "" : "s"} downloaded as a ZIP archive.`,
      );
    } catch (error) {
      setIssues([errorMessage(error)]);
    } finally {
      setZipBusy(false);
    }
  }

  function reset() {
    runRef.current += 1;
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    commitItems([]);
    setSelectedId(null);
    setMode("dimensions");
    setWidth("1920");
    setHeight("1080");
    setLock(true);
    setPercentage(50);
    setPresetId(PRESET_SIZES[0].id);
    setFit("cover");
    setFormat("image/webp");
    setQuality(85);
    setBackground("#ffffff");
    setPreviewMode("original");
    setIssues([]);
    setNotice("");
    setBusy(false);
    setZipBusy(false);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  const targetLabel = activePlan
    ? `${formatPixels(activePlan.width)} × ${formatPixels(activePlan.height)} px`
    : "—";
  const outputMegapixels = activePlan
    ? megapixels(activePlan.width, activePlan.height)
    : 0;
  const scale = activePlan
    ? scalePercent(activePlan.width, activeItem?.width ?? activePlan.width)
    : 0;

  return (
    <fieldset
      className="workspace resizer-workspace"
      disabled={!ready}
      aria-label="Image resizer workspace"
    >
      <div className="workspace-heading">
        <div>
          <h2>Resize anything. Keep the detail.</h2>
          <p>
            Exact dimensions, percentage scaling, presets and social sizes —
            processed on your device.
          </p>
        </div>
        <span className="local-badge">100% local</span>
      </div>

      <label
        className={
          dragging ? "resizer-drop resizer-drop-active" : "resizer-drop"
        }
        htmlFor="resizer-files"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id="resizer-files"
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Add images"
          aria-describedby="resizer-help"
          disabled={busy}
          onChange={(event) => {
            const picker = event.currentTarget;
            if (picker.files) void addFiles(picker.files);
          }}
        />
        <span className="resizer-drop-icon" aria-hidden="true">
          <ImagePlus size={26} strokeWidth={1.7} />
        </span>
        <span className="resizer-drop-copy">
          <strong>Drop images here or browse</strong>
          <span>JPEG, PNG or WebP · up to 15 MB each</span>
        </span>
        <span className="resizer-drop-action">Choose files</span>
      </label>
      <p id="resizer-help" className="help resizer-help">
        Up to {MAX_BATCH_FILES} images per batch · 24 megapixels and 8,192 px
        per side · nothing is uploaded. Animated images become one frame.
      </p>

      <div className="resizer-grid">
        <section className="resizer-panel" aria-labelledby="resize-settings">
          <div className="resizer-panel-head">
            <h3 id="resize-settings">Resize settings</h3>
            <span className="resizer-summary">{targetLabel}</span>
          </div>

          <fieldset className="resizer-settings" disabled={busy || zipBusy}>
            <legend className="sr-only">Resize settings</legend>
            <div
              className="resizer-modes"
              role="group"
              aria-label="Resize method"
            >
              {MODES.map((option) => (
                <label
                  key={option.id}
                  className={
                    mode === option.id
                      ? "resizer-mode resizer-mode-active"
                      : "resizer-mode"
                  }
                >
                  <input
                    className="resizer-radio"
                    type="radio"
                    name="resize-mode"
                    value={option.id}
                    checked={mode === option.id}
                    onChange={() => invalidate(() => setMode(option.id))}
                  />
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </label>
              ))}
            </div>

            {mode === "dimensions" ? (
              <>
                <div className="resizer-fields">
                  <div className="resizer-field resizer-field-width">
                    <label htmlFor="resizer-width">Width (px)</label>
                    <input
                      id="resizer-width"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={8192}
                      step={1}
                      value={width}
                      aria-invalid={Boolean(planError)}
                      aria-describedby={
                        planError
                          ? "resizer-plan-error"
                          : "resizer-dimension-hint"
                      }
                      onChange={(event) => handleWidth(event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="resizer-lock"
                    aria-pressed={lock}
                    aria-label={
                      lock ? "Unlock aspect ratio" : "Lock aspect ratio"
                    }
                    title={lock ? "Unlock aspect ratio" : "Lock aspect ratio"}
                    onClick={() => invalidate(() => setLock(!lock))}
                  >
                    {lock ? <Lock size={17} /> : <LockOpen size={17} />}
                  </button>
                  <div className="resizer-field resizer-field-height">
                    <label htmlFor="resizer-height">Height (px)</label>
                    <input
                      id="resizer-height"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={8192}
                      step={1}
                      value={height}
                      aria-invalid={Boolean(planError)}
                      aria-describedby={
                        planError
                          ? "resizer-plan-error"
                          : "resizer-dimension-hint"
                      }
                      onChange={(event) => handleHeight(event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="resizer-lock resizer-swap"
                    aria-label="Swap width and height"
                    title="Swap width and height"
                    onClick={swapDimensions}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="resizer-inline-row">
                  <p id="resizer-dimension-hint" className="help resizer-hint">
                    {lock
                      ? "Aspect ratio is locked, so the second side follows automatically."
                      : "Aspect ratio is unlocked — the image will stretch to fit both values."}
                    {activeItem
                      ? ` Source: ${formatPixels(activeItem.width)} × ${formatPixels(activeItem.height)} px.`
                      : ""}
                  </p>
                  <button
                    type="button"
                    className="resizer-text-button"
                    onClick={matchOriginal}
                    disabled={!activeItem}
                  >
                    Match original
                  </button>
                </div>
              </>
            ) : null}

            {mode === "percentage" ? (
              <>
                <div className="resizer-percentage">
                  <label htmlFor="resizer-percentage">Scale</label>
                  <div className="range-row">
                    <input
                      id="resizer-percentage"
                      type="range"
                      min={5}
                      max={400}
                      step={1}
                      value={percentage}
                      onChange={(event) =>
                        invalidate(() =>
                          setPercentage(Number(event.target.value) || 0),
                        )
                      }
                    />
                    <input
                      className="resizer-percent-input"
                      type="number"
                      inputMode="numeric"
                      min={5}
                      max={400}
                      step={1}
                      value={Number.isFinite(percentage) ? percentage : ""}
                      aria-label="Scale percentage"
                      onChange={(event) =>
                        invalidate(() =>
                          setPercentage(
                            event.target.value === ""
                              ? 0
                              : Number(event.target.value),
                          ),
                        )
                      }
                    />
                    <span aria-hidden="true">%</span>
                  </div>
                </div>
                <div
                  className="resizer-chips"
                  role="group"
                  aria-label="Quick percentages"
                >
                  {PERCENTAGE_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      className={
                        percentage === step
                          ? "resizer-chip resizer-chip-active"
                          : "resizer-chip"
                      }
                      aria-pressed={percentage === step}
                      onClick={() => invalidate(() => setPercentage(step))}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
                <p className="help resizer-hint">
                  {activeItem && activePlan
                    ? `${formatPixels(activeItem.width)} × ${formatPixels(activeItem.height)} px becomes ${formatPixels(activePlan.width)} × ${formatPixels(activePlan.height)} px.`
                    : "Choose an image to see the scaled dimensions."}
                </p>
              </>
            ) : null}

            {mode === "preset" ? (
              <>
                <fieldset className="resizer-preset-group">
                  <legend>Everyday sizes</legend>
                  <div className="resizer-presets">
                    {PRESET_SIZES.map((preset) => (
                      <label
                        key={preset.id}
                        className={
                          presetId === preset.id
                            ? "resizer-preset resizer-preset-active"
                            : "resizer-preset"
                        }
                      >
                        <input
                          className="resizer-radio"
                          type="radio"
                          name="resize-preset"
                          value={preset.id}
                          checked={presetId === preset.id}
                          onChange={() =>
                            invalidate(() => setPresetId(preset.id))
                          }
                        />
                        <strong>{preset.label}</strong>
                        <span>
                          {preset.width} × {preset.height}
                        </span>
                        <small>{preset.note}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="resizer-preset-group">
                  <legend>Social media</legend>
                  <div className="resizer-presets">
                    {SOCIAL_PRESETS.map((preset) => (
                      <label
                        key={preset.id}
                        className={
                          presetId === preset.id
                            ? "resizer-preset resizer-preset-active"
                            : "resizer-preset"
                        }
                      >
                        <input
                          className="resizer-radio"
                          type="radio"
                          name="resize-preset"
                          value={preset.id}
                          checked={presetId === preset.id}
                          onChange={() =>
                            invalidate(() => setPresetId(preset.id))
                          }
                        />
                        <strong>{preset.label}</strong>
                        <span>
                          {preset.width} × {preset.height}
                        </span>
                        <small>{preset.note}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="resizer-fit">
                  <legend className="sr-only">
                    How preset sizes should fit
                  </legend>
                  {FITS.map((option) => (
                    <label
                      key={option.id}
                      className={
                        fit === option.id
                          ? "resizer-fit-option resizer-fit-active"
                          : "resizer-fit-option"
                      }
                      title={option.hint}
                    >
                      <input
                        className="resizer-radio"
                        type="radio"
                        name="resize-fit"
                        value={option.id}
                        checked={fit === option.id}
                        onChange={() => invalidate(() => setFit(option.id))}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </fieldset>
                <p className="help resizer-hint">
                  {activePlan
                    ? `Output: ${formatPixels(activePlan.width)} × ${formatPixels(activePlan.height)} px${activePlan.cropped ? ` · centred crop of ${formatPixels(activePlan.crop!.width)} × ${formatPixels(activePlan.crop!.height)} px` : ""}.`
                    : "Choose an image to preview the preset."}
                </p>
              </>
            ) : null}
          </fieldset>
        </section>

        <section className="resizer-panel" aria-labelledby="resize-output">
          <div className="resizer-panel-head">
            <h3 id="resize-output">Preview &amp; output</h3>
            {activeItem?.result ? (
              <div
                className="resizer-toggle"
                role="group"
                aria-label="Preview version"
              >
                <button
                  type="button"
                  aria-pressed={previewMode === "original"}
                  onClick={() => setPreviewMode("original")}
                >
                  Original
                </button>
                <button
                  type="button"
                  aria-pressed={previewMode === "resized"}
                  onClick={() => setPreviewMode("resized")}
                >
                  Resized
                </button>
              </div>
            ) : null}
          </div>

          {activeItem ? (
            <div className="resizer-preview">
              <div className="resizer-preview-stage">
                <img
                  src={
                    previewMode === "resized" && activeItem.result
                      ? activeItem.result.url
                      : activeItem.originalUrl
                  }
                  alt={
                    previewMode === "resized" && activeItem.result
                      ? `Resized preview of ${activeItem.file.name}`
                      : `Original preview of ${activeItem.file.name}`
                  }
                />
                <span className="resizer-preview-tag">
                  {previewMode === "resized" && activeItem.result
                    ? `${formatPixels(activeItem.result.width)} × ${formatPixels(activeItem.result.height)} px`
                    : `${formatPixels(activeItem.width)} × ${formatPixels(activeItem.height)} px`}
                </span>
              </div>
              <dl className="resizer-stats">
                <div>
                  <dt>Original</dt>
                  <dd>
                    {formatBytes(activeItem.file.size)} ·{" "}
                    {activeItem.file.type.replace("image/", "").toUpperCase()}
                  </dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>
                    {targetLabel} · {formatLabel(format)} ·{" "}
                    {format === "image/png"
                      ? "lossless"
                      : `${quality}% quality`}
                  </dd>
                </div>
                {activeItem.result ? (
                  <div>
                    <dt>Output size</dt>
                    <dd>
                      {formatBytes(activeItem.result.blob.size)} ·{" "}
                      {sizeDeltaLabel(
                        activeItem.result.blob.size,
                        activeItem.file.size,
                      )}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Scale</dt>
                  <dd>
                    {scale}% of the original width · {outputMegapixels} MP
                    {activePlan?.cropped ? " · centre crop" : ""}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="resizer-preview resizer-preview-empty">
              <span className="resizer-empty-icon" aria-hidden="true">
                <Scaling size={30} strokeWidth={1.6} />
              </span>
              <p>Add an image to see a live preview and exact output size.</p>
              <span className="resizer-empty-hint">
                Your files never leave this browser tab.
              </span>
            </div>
          )}

          <div className="resizer-output-grid">
            <div className="resizer-field">
              <label htmlFor="resizer-format">Output format</label>
              <select
                id="resizer-format"
                value={format}
                disabled={busy}
                onChange={(event) =>
                  invalidate(() =>
                    setFormat(event.target.value as OutputFormat),
                  )
                }
              >
                {FORMATS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.note}
                  </option>
                ))}
              </select>
            </div>
            <div className="resizer-field">
              <label htmlFor="resizer-quality">
                Quality{" "}
                {format === "image/png" ? (
                  <span className="resizer-muted">(PNG is lossless)</span>
                ) : null}
              </label>
              <div className="range-row">
                <input
                  id="resizer-quality"
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={quality}
                  disabled={busy || format === "image/png"}
                  aria-describedby="resizer-quality-hint"
                  onChange={(event) =>
                    invalidate(() => setQuality(Number(event.target.value)))
                  }
                />
                <output htmlFor="resizer-quality">
                  {format === "image/png" ? "—" : `${quality}%`}
                </output>
              </div>
            </div>
            {format === "image/jpeg" ? (
              <div className="resizer-field resizer-bg-field">
                <label htmlFor="resizer-background">Background</label>
                <div className="resizer-color-row">
                  <input
                    id="resizer-background"
                    type="color"
                    value={background}
                    disabled={busy}
                    onChange={(event) =>
                      invalidate(() => setBackground(event.target.value))
                    }
                  />
                  <span>{background.toUpperCase()}</span>
                  <span className="resizer-muted">fills transparent areas</span>
                </div>
              </div>
            ) : null}
          </div>
          <p id="resizer-quality-hint" className="help resizer-hint">
            WebP balances size and detail; JPEG is the most compatible; PNG is
            lossless. Re-encoding removes metadata such as EXIF and GPS.
          </p>
          <ul className="resizer-tips">
            <li>
              JPEG output always gets a solid background behind transparency.
            </li>
            <li>
              Scaling up adds pixels, not detail — start from the largest
              source.
            </li>
            <li>
              Batch settings apply to every queued image; remove any you want to
              keep as-is.
            </li>
          </ul>
        </section>
      </div>

      <div className="action-row resizer-actions">
        <button
          className="primary"
          type="button"
          onClick={() => void resizeAll()}
          disabled={busy || zipBusy || !items.length}
        >
          <Scaling size={16} aria-hidden="true" />
          {busy
            ? `Resizing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
            : `Resize ${items.length ? `${items.length} ` : ""}image${items.length === 1 ? "" : "s"}`}
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => void downloadZip()}
          disabled={!doneItems.length || busy || zipBusy}
        >
          <FileArchive size={16} aria-hidden="true" />
          {zipBusy
            ? "Building ZIP…"
            : `Download ZIP${doneItems.length ? ` (${doneItems.length})` : ""}`}
        </button>
        <button
          className="secondary resizer-reset"
          type="button"
          onClick={reset}
          disabled={zipBusy}
        >
          <Trash2 size={16} aria-hidden="true" />
          Reset
        </button>
        <span className="resizer-format-note">
          <ShieldCheck size={15} aria-hidden="true" /> {formatLabel(format)} ·{" "}
          {format === "image/png" ? "lossless" : `${quality}% quality`}
        </span>
      </div>

      {issues.length ? (
        <div className="status error resizer-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {planError && activeItem ? (
        <p id="resizer-plan-error" className="status error resizer-plan-error">
          {planError}
        </p>
      ) : null}

      {notice ? (
        <p className="status success resizer-notice" role="status">
          <CheckCircle2 size={16} aria-hidden="true" /> {notice}
        </p>
      ) : null}

      {items.length ? (
        <section
          className="resizer-queue"
          aria-labelledby="resizer-queue-title"
        >
          <div className="resizer-queue-head">
            <h3 id="resizer-queue-title">
              Batch queue <span>{items.length}</span>
            </h3>
            <p>
              {doneItems.length
                ? `${doneItems.length} of ${items.length} ready`
                : "Settings apply to every image in this batch."}
            </p>
          </div>
          <ul className="resizer-list">
            {items.map((item) => {
              const plan = planFor(item);
              const isActive = activeItem?.id === item.id;
              return (
                <li
                  key={item.id}
                  className={
                    isActive
                      ? "resizer-item resizer-item-active"
                      : "resizer-item"
                  }
                >
                  <button
                    type="button"
                    className="resizer-thumb"
                    aria-pressed={isActive}
                    aria-label={`Preview ${item.file.name}`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setPreviewMode(item.result ? "resized" : "original");
                      if (lock && mode === "dimensions") {
                        const parsed = Number(width);
                        if (Number.isFinite(parsed) && parsed > 0)
                          setHeight(
                            String(
                              linkedHeight(parsed, item.width, item.height),
                            ),
                          );
                      }
                    }}
                  >
                    <img src={item.originalUrl} alt="" />
                  </button>
                  <div className="resizer-item-body">
                    <strong title={item.file.name}>{item.file.name}</strong>
                    <span>
                      {formatPixels(item.width)} × {formatPixels(item.height)}{" "}
                      px
                      {" → "}
                      {plan
                        ? `${formatPixels(plan.width)} × ${formatPixels(plan.height)} px`
                        : "check settings"}
                      {" · "}
                      {formatLabel(format)}
                    </span>
                    {item.error ? (
                      <span className="resizer-item-error">{item.error}</span>
                    ) : item.result ? (
                      <span className="resizer-item-size">
                        {formatBytes(item.result.blob.size)} ·{" "}
                        {sizeDeltaLabel(item.result.blob.size, item.file.size)}
                      </span>
                    ) : (
                      <span className="resizer-item-size">
                        {formatBytes(item.file.size)} source
                      </span>
                    )}
                  </div>
                  <span
                    className={`resizer-status resizer-status-${item.status}`}
                  >
                    {item.status === "ready" ? (
                      "Ready"
                    ) : item.status === "working" ? (
                      "Working…"
                    ) : item.status === "done" ? (
                      <>
                        <Check size={12} aria-hidden="true" /> Done
                      </>
                    ) : (
                      "Failed"
                    )}
                  </span>
                  {item.result ? (
                    <a
                      className="resizer-icon-button"
                      href={item.result.url}
                      download={item.result.filename}
                      aria-label={`Download ${item.result.filename}`}
                      title="Download this image"
                    >
                      <Download size={16} />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="resizer-icon-button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    title="Remove from batch"
                    disabled={busy}
                  >
                    <X size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="sr-only" role="status">
        {busy
          ? `Resizing image ${Math.min(progress.done + 1, progress.total)} of ${progress.total}.`
          : notice}
      </p>
    </fieldset>
  );
}
