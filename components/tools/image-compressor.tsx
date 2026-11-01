"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  CircleStop,
  Columns2,
  Download,
  FileArchive,
  Gauge,
  ImageDown,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { formatBytes } from "@/lib/tools/image";
import { scanMetadata, type MetadataReport } from "@/lib/tools/exif";
import { createZip } from "@/lib/tools/zip";
import {
  COMPRESS_FORMATS,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
  DEFAULT_TARGET_VALUE,
  FORMAT_NOTES,
  MAX_BATCH_FILES,
  MAX_BATCH_PIXELS,
  MAX_QUALITY,
  MIN_QUALITY,
  buildCompressName,
  compactSavings,
  formatLabel,
  keepsTransparency,
  savingsLabel,
  savingsPercent,
  targetBytes,
  targetLabel,
  uniqueName,
  usesQuality,
  type CompressFormat,
  type CompressMode,
  type SizeUnit,
} from "@/lib/tools/image-compress";
import {
  CompressCancelled,
  compressImageFile,
  formatSupport,
  inspectCompressFile,
  type CompressSettings,
} from "@/lib/tools/image-compress-runner";

type Status = "ready" | "working" | "done" | "error";

type Override = {
  enabled: boolean;
  format: CompressFormat | "auto";
  quality: number;
  targetValue: string;
  targetUnit: SizeUnit;
  name: string;
  suffix: string;
};

type Result = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  quality: number;
  targetMet: boolean;
  scaled: boolean;
  attempts: number;
  filename: string;
};

type Item = {
  id: string;
  file: File;
  originalUrl: string;
  width: number;
  height: number;
  status: Status;
  error?: string;
  override: Override;
  metadata: MetadataReport;
  result?: Result;
};

const defaultOverride: Override = {
  enabled: false,
  format: "auto",
  quality: DEFAULT_QUALITY,
  targetValue: "",
  targetUnit: "KB",
  name: "",
  suffix: "",
};

let sequence = 0;
const nextId = () => `compressor-${Date.now()}-${sequence++}`;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";

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

const MODES: { id: CompressMode; label: string; hint: string }[] = [
  { id: "quality", label: "Quality", hint: "Pick a level" },
  { id: "target", label: "Target size", hint: "Fit a limit" },
];

const QUALITY_STEPS = [40, 60, 80, 100] as const;

export default function ImageCompressor() {
  const ready = useHydrated();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<CompressMode>("quality");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [targetValue, setTargetValue] = useState(DEFAULT_TARGET_VALUE);
  const [targetUnit, setTargetUnit] = useState<SizeUnit>("KB");
  const [allowDownscale, setAllowDownscale] = useState(true);
  const [format, setFormat] = useState<CompressFormat>(DEFAULT_FORMAT);
  const [background, setBackground] = useState("#ffffff");
  const [baseName, setBaseName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [previewMode, setPreviewMode] = useState<"original" | "result">(
    "original",
  );
  const [compare, setCompare] = useState<"single" | "split" | "side">("single");
  const [split, setSplit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [issues, setIssues] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const support = useMemo<Record<CompressFormat, boolean>>(
    () =>
      ready
        ? formatSupport()
        : {
            "image/jpeg": true,
            "image/png": true,
            "image/webp": true,
            "image/avif": true,
          },
    [ready],
  );

  const itemsRef = useRef<Item[]>([]);
  const urlsRef = useRef<Map<string, string>>(new Map());
  const runRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  const commitItems = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<Item>) => {
      commitItems(
        itemsRef.current.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      );
    },
    [commitItems],
  );

  const registerUrl = (key: string, url: string) => {
    const previous = urlsRef.current.get(key);
    if (previous) URL.revokeObjectURL(previous);
    urlsRef.current.set(key, url);
  };

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const activeItem =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const doneItems = items.filter((item) => item.result);
  const failedItems = items.filter((item) => item.status === "error");

  const formatFor = (item: Item): CompressFormat =>
    item.override.enabled && item.override.format !== "auto"
      ? item.override.format
      : format;

  const qualityFor = (item: Item) =>
    item.override.enabled ? item.override.quality : quality;

  const targetFor = (item: Item) => {
    const value =
      item.override.enabled && item.override.targetValue.trim()
        ? item.override.targetValue
        : targetValue;
    const unit =
      item.override.enabled && item.override.targetValue.trim()
        ? item.override.targetUnit
        : targetUnit;
    return { value: Number(value), unit, raw: value };
  };

  function settingsFor(item: Item): CompressSettings {
    const target = targetFor(item);
    return {
      format: formatFor(item),
      mode,
      quality: qualityFor(item),
      targetBytes:
        mode === "target" ? targetBytes(target.value, target.unit) : 0,
      allowDownscale,
      background,
    };
  }

  function outputNameFor(item: Item, size?: { width: number; height: number }) {
    return buildCompressName(item.file.name, {
      baseName: item.override.enabled ? item.override.name : baseName,
      suffix: item.override.enabled ? item.override.suffix : suffix,
      format: formatFor(item),
      qualifier: "compressed",
      size,
    });
  }

  const inputLabel = (type: string) => {
    if (type === "image/jpeg") return "JPG";
    if (type === "image/png") return "PNG";
    if (type === "image/webp") return "WEBP";
    if (type === "image/avif") return "AVIF";
    return type.replace("image/", "").toUpperCase();
  };

  const clearResults = useCallback(() => {
    urlsRef.current.forEach((url, key) => {
      if (key.endsWith(":result")) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(key);
      }
    });
    commitItems(
      itemsRef.current.map((item) =>
        item.result || item.status === "done" || item.status === "error"
          ? { ...item, result: undefined, status: "ready", error: undefined }
          : item,
      ),
    );
  }, [commitItems]);

  const invalidate = (update: () => void) => {
    clearResults();
    setIssues([]);
    update();
  };

  /* --------------------------------- upload -------------------------------- */

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    setNotice("");
    const problems: string[] = [];
    const fresh: Item[] = [];
    const room = MAX_BATCH_FILES - itemsRef.current.length;
    if (room <= 0) {
      setIssues([
        `You can compress up to ${MAX_BATCH_FILES} images at once. Remove one to add another.`,
      ]);
      return;
    }
    if (files.length > room)
      problems.push(
        `Only ${room} more image${room === 1 ? "" : "s"} could be added — the batch limit is ${MAX_BATCH_FILES}.`,
      );

    for (const file of files.slice(0, room)) {
      try {
        const dimensions = await inspectCompressFile(file);
        const pixels =
          itemsRef.current.reduce(
            (sum, item) => sum + item.width * item.height,
            0,
          ) +
          fresh.reduce((sum, item) => sum + item.width * item.height, 0) +
          dimensions.width * dimensions.height;
        if (pixels > MAX_BATCH_PIXELS)
          throw new Error(
            "This batch would exceed the 200 megapixel workspace budget. Remove an image first or add smaller ones.",
          );
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
          override: { ...defaultOverride, quality },
          metadata: scanMetadata(
            new Uint8Array(await file.slice(0, 262_144).arrayBuffer()),
            file.type,
          ),
        });
      } catch (error) {
        problems.push(`${file.name}: ${errorMessage(error)}`);
      }
    }

    if (fresh.length) {
      commitItems([...itemsRef.current, ...fresh]);
      if (itemsRef.current.length === fresh.length) setSelectedId(fresh[0].id);
      setNotice(
        `${fresh.length} image${fresh.length === 1 ? "" : "s"} added. Choose a strategy, then compress.`,
      );
    }
    setIssues(problems);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function replaceFile(id: string, file: File) {
    try {
      const dimensions = await inspectCompressFile(file);
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item) return;
      const url = URL.createObjectURL(file);
      registerUrl(`${id}:original`, url);
      const resultKey = `${id}:result`;
      const resultUrl = urlsRef.current.get(resultKey);
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
        urlsRef.current.delete(resultKey);
      }
      updateItem(id, {
        file,
        originalUrl: url,
        width: dimensions.width,
        height: dimensions.height,
        status: "ready",
        error: undefined,
        result: undefined,
        metadata: scanMetadata(
          new Uint8Array(await file.slice(0, 262_144).arrayBuffer()),
          file.type,
        ),
      });
      setNotice(`${item.file.name} replaced with ${file.name}.`);
      setIssues([]);
    } catch (error) {
      setIssues([`${file.name}: ${errorMessage(error)}`]);
    }
  }

  /* ------------------------------- compress -------------------------------- */

  async function compressAll(onlyFailed = false) {
    const all = itemsRef.current;
    const queue = onlyFailed
      ? all.filter((item) => item.status === "error")
      : all;
    if (!queue.length) {
      setIssues([
        onlyFailed
          ? "There are no failed images to retry."
          : "Add at least one image before compressing.",
      ]);
      setNotice("");
      return;
    }

    if (mode === "target") {
      for (const item of queue) {
        try {
          const target = targetFor(item);
          targetBytes(target.value, target.unit);
        } catch (error) {
          setIssues([errorMessage(error)]);
          setNotice("");
          return;
        }
      }
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
      if (run !== runRef.current) return;
      const current = itemsRef.current.find(
        (item) => item.id === queue[index].id,
      );
      if (!current) continue;
      updateItem(current.id, { status: "working", error: undefined });
      try {
        const output = await compressImageFile(
          current.file,
          settingsFor(current),
          () => run !== runRef.current,
        );
        if (run !== runRef.current) return;
        const url = URL.createObjectURL(output.blob);
        registerUrl(`${current.id}:result`, url);
        setPreviewMode("result");
        updateItem(current.id, {
          status: "done",
          error: undefined,
          result: {
            blob: output.blob,
            url,
            width: output.width,
            height: output.height,
            quality: output.quality,
            targetMet: output.targetMet,
            scaled: output.scaled,
            attempts: output.attempts,
            filename: outputNameFor(current, {
              width: output.width,
              height: output.height,
            }),
          },
        });
        completed += 1;
      } catch (error) {
        if (error instanceof CompressCancelled || run !== runRef.current)
          return;
        failures += 1;
        updateItem(current.id, {
          status: "error",
          error: errorMessage(error),
          result: undefined,
        });
      }
      setProgress({ done: index + 1, total: queue.length });
    }

    if (run !== runRef.current) return;
    setBusy(false);
    if (completed && !failures)
      setNotice(
        `${completed} image${completed === 1 ? "" : "s"} compressed locally. Compare the sizes, then download individually or grab the ZIP.`,
      );
    else if (completed && failures)
      setNotice(
        `${completed} compressed successfully. ${failures} could not be processed — review the messages below.`,
      );
    else if (failures)
      setIssues([
        "None of the images could be compressed. Check the messages in the queue.",
      ]);
  }

  function cancelRun() {
    if (!busy) return;
    runRef.current += 1;
    setBusy(false);
    setProgress({ done: 0, total: 0 });
    commitItems(
      itemsRef.current.map((item) =>
        item.status === "working" ? { ...item, status: "ready" } : item,
      ),
    );
    const finished = itemsRef.current.filter((item) => item.result).length;
    setNotice(
      finished
        ? `Compression stopped. ${finished} finished image${finished === 1 ? "" : "s"} kept — download ${finished === 1 ? "it" : "them"} or start again.`
        : "Compression stopped before any image finished. Your queue and settings are unchanged.",
    );
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
    const finished = itemsRef.current.filter((item) => item.result);
    if (!finished.length) {
      setIssues([
        "Compress at least one image before downloading a ZIP archive.",
      ]);
      return;
    }
    setZipBusy(true);
    setIssues([]);
    try {
      const payloads = await Promise.all(
        finished.map(async (item) => ({
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
        "quickkit-compressed-images.zip",
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

  function resetAll() {
    runRef.current += 1;
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    commitItems([]);
    setSelectedId(null);
    setMode("quality");
    setQuality(DEFAULT_QUALITY);
    setTargetValue(DEFAULT_TARGET_VALUE);
    setTargetUnit("KB");
    setAllowDownscale(true);
    setFormat(DEFAULT_FORMAT);
    setBackground("#ffffff");
    setBaseName("");
    setSuffix("");
    setPreviewMode("original");
    setCompare("single");
    setSplit(50);
    setExpandedId(null);
    setIssues([]);
    setNotice("");
    setBusy(false);
    setZipBusy(false);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  /* -------------------------------- derived -------------------------------- */

  const targetPreview = useMemo(() => {
    if (mode !== "target") return null;
    try {
      return targetBytes(Number(targetValue), targetUnit);
    } catch {
      return null;
    }
  }, [mode, targetValue, targetUnit]);

  const targetError = useMemo(() => {
    if (mode !== "target") return "";
    try {
      targetBytes(Number(targetValue), targetUnit);
      return "";
    } catch (error) {
      return errorMessage(error);
    }
  }, [mode, targetValue, targetUnit]);

  const activeResult = activeItem?.result;
  const showResult = Boolean(activeResult) && previewMode === "result";
  const totals = useMemo(() => {
    const original = doneItems.reduce((sum, item) => sum + item.file.size, 0);
    const compressed = doneItems.reduce(
      (sum, item) => sum + (item.result?.blob.size ?? 0),
      0,
    );
    return {
      original,
      compressed,
      percent: original ? savingsPercent(original, compressed) : 0,
    };
  }, [doneItems]);

  /* --------------------------------- render -------------------------------- */

  return (
    <fieldset
      className="workspace compressor-workspace"
      disabled={!ready}
      aria-label="Image compressor workspace"
    >
      <div className="workspace-heading">
        <div>
          <h2>Shrink the file. Keep the detail.</h2>
          <p>
            Compress, convert and hit an exact file size — one image or a whole
            batch, entirely on your device.
          </p>
        </div>
        <span className="local-badge">100% local</span>
      </div>

      <label
        className={
          dragging
            ? "compressor-drop compressor-drop-active"
            : "compressor-drop"
        }
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) void addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          aria-label="Add images"
          onChange={(event) => {
            const files = event.currentTarget.files;
            if (files?.length) void addFiles(files);
          }}
        />
        <span className="compressor-drop-icon" aria-hidden="true">
          <Upload size={21} />
        </span>
        <span className="compressor-drop-copy">
          <strong>Drop images here or browse</strong>
          <span>
            JPEG, PNG, WebP or AVIF · up to 15 MB each · nothing is uploaded
          </span>
        </span>
        <span className="compressor-drop-action" aria-hidden="true">
          Choose files
        </span>
      </label>
      <p className="help compressor-help">
        Up to {MAX_BATCH_FILES} images per batch · 24 megapixels and 8,192 px
        per side · processed one at a time to keep memory flat.
      </p>

      <div className="compressor-grid">
        <section
          className="compressor-panel"
          aria-labelledby="compress-settings"
        >
          <div className="compressor-panel-head">
            <h3 id="compress-settings">Compression settings</h3>
            <span className="compressor-summary">
              {mode === "target"
                ? targetPreview
                  ? `Target ${targetLabel(targetPreview)}`
                  : "Target size"
                : `${usesQuality(format) ? `${quality}% quality` : "Lossless PNG"}`}
            </span>
          </div>

          <fieldset className="compressor-settings" disabled={busy || zipBusy}>
            <fieldset
              className="compressor-modes"
              aria-label="Compression method"
            >
              <legend className="sr-only">Compression method</legend>
              {MODES.map((option) => (
                <label
                  key={option.id}
                  className={
                    mode === option.id
                      ? "compressor-mode compressor-mode-active"
                      : "compressor-mode"
                  }
                >
                  <input
                    className="compressor-radio"
                    type="radio"
                    name="compress-mode"
                    value={option.id}
                    checked={mode === option.id}
                    onChange={() => invalidate(() => setMode(option.id))}
                  />
                  {option.id === "quality" ? (
                    <Gauge size={14} aria-hidden="true" />
                  ) : (
                    <Target size={14} aria-hidden="true" />
                  )}
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </label>
              ))}
            </fieldset>

            {mode === "quality" ? (
              <div className="compressor-section">
                <div className="compressor-slider-head">
                  <label htmlFor="compressor-quality">
                    Quality{" "}
                    {!usesQuality(format) ? (
                      <span className="compressor-muted">
                        (PNG is lossless — quality is ignored)
                      </span>
                    ) : null}
                  </label>
                  <output htmlFor="compressor-quality">
                    {usesQuality(format) ? `${quality}%` : "—"}
                  </output>
                </div>
                <input
                  id="compressor-quality"
                  type="range"
                  min={MIN_QUALITY}
                  max={MAX_QUALITY}
                  step={1}
                  value={quality}
                  disabled={!usesQuality(format)}
                  onChange={(event) =>
                    invalidate(() => setQuality(Number(event.target.value)))
                  }
                />
                <div className="compressor-chips">
                  {QUALITY_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      className={
                        quality === step
                          ? "compressor-chip compressor-chip-active"
                          : "compressor-chip"
                      }
                      aria-pressed={quality === step}
                      disabled={!usesQuality(format)}
                      onClick={() => invalidate(() => setQuality(step))}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
                <p className="help compressor-hint">
                  Lower quality means a smaller file. 80% is a good balance for
                  photos; 100% keeps the most detail.
                </p>
              </div>
            ) : (
              <div className="compressor-section">
                <div className="compressor-target-row">
                  <div className="compressor-field">
                    <label htmlFor="compressor-target">Target file size</label>
                    <input
                      id="compressor-target"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={targetValue}
                      aria-invalid={Boolean(targetError)}
                      aria-describedby="compressor-target-help"
                      onChange={(event) =>
                        invalidate(() => setTargetValue(event.target.value))
                      }
                    />
                  </div>
                  <div className="compressor-field compressor-unit">
                    <label htmlFor="compressor-unit">Unit</label>
                    <select
                      id="compressor-unit"
                      value={targetUnit}
                      onChange={(event) =>
                        invalidate(() =>
                          setTargetUnit(event.target.value as SizeUnit),
                        )
                      }
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>
                <p id="compressor-target-help" className="help compressor-hint">
                  {targetError
                    ? targetError
                    : "The app searches quality automatically to land at or just under the target, and reports the quality it used."}
                </p>
                <label className="check-label compressor-check">
                  <input
                    type="checkbox"
                    checked={allowDownscale}
                    onChange={(event) =>
                      invalidate(() => setAllowDownscale(event.target.checked))
                    }
                  />
                  Allow downscaling if quality alone cannot reach the target
                </label>
                <p className="help compressor-hint">
                  {allowDownscale
                    ? "Dimensions may shrink for very small targets; the exact output size is shown after compressing."
                    : "Dimensions stay identical. If the target is unreachable, the smallest possible file is returned and flagged."}
                </p>
              </div>
            )}

            <div className="compressor-section">
              <div className="compressor-output-grid">
                <div className="compressor-field">
                  <label htmlFor="compressor-format">Output format</label>
                  <select
                    id="compressor-format"
                    value={format}
                    onChange={(event) =>
                      invalidate(() =>
                        setFormat(event.target.value as CompressFormat),
                      )
                    }
                  >
                    {COMPRESS_FORMATS.map((value) => (
                      <option
                        key={value}
                        value={value}
                        disabled={!support[value]}
                      >
                        {formatLabel(value)} · {FORMAT_NOTES[value]}
                        {support[value] ? "" : " (unsupported here)"}
                      </option>
                    ))}
                  </select>
                </div>
                {format === "image/jpeg" ? (
                  <div className="compressor-field">
                    <label htmlFor="compressor-background">Background</label>
                    <div className="compressor-color-row">
                      <input
                        id="compressor-background"
                        type="color"
                        value={background}
                        onChange={(event) => {
                          invalidate(() => setBackground(event.target.value));
                        }}
                      />
                      <code>{background}</code>
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="help compressor-hint">
                {support["image/avif"]
                  ? "AVIF packs the smallest files where your browser can encode it."
                  : "AVIF encoding is unavailable in this browser, so that option is disabled."}{" "}
                {keepsTransparency(format)
                  ? "Transparency is preserved in this format."
                  : "JPEG cannot store transparency, so transparent areas are filled with the background colour."}
              </p>
            </div>

            <div className="compressor-section">
              <div className="compressor-output-grid">
                <div className="compressor-field">
                  <label htmlFor="compressor-name">
                    Rename outputs (optional)
                  </label>
                  <input
                    id="compressor-name"
                    type="text"
                    placeholder="Keep original names"
                    value={baseName}
                    onChange={(event) =>
                      invalidate(() => setBaseName(event.target.value))
                    }
                  />
                </div>
                <div className="compressor-field">
                  <label htmlFor="compressor-suffix">
                    Filename suffix (optional)
                  </label>
                  <input
                    id="compressor-suffix"
                    type="text"
                    placeholder="e.g. web"
                    value={suffix}
                    onChange={(event) =>
                      invalidate(() => setSuffix(event.target.value))
                    }
                  />
                </div>
              </div>
              <p className="help compressor-hint compressor-name-preview">
                Output name:{" "}
                <code>
                  {activeItem
                    ? outputNameFor(activeItem, {
                        width: activeItem.width,
                        height: activeItem.height,
                      })
                    : buildCompressName("photo.jpg", {
                        baseName,
                        suffix,
                        format,
                      })}
                </code>
              </p>
            </div>

            <details className="compressor-details">
              <summary>
                <ShieldCheck size={13} aria-hidden="true" /> Metadata &amp;
                privacy
              </summary>
              <div className="compressor-details-body">
                {activeItem ? (
                  <ul>
                    <li>
                      <strong>{activeItem.metadata.format}</strong> ·{" "}
                      {activeItem.metadata.hasExif
                        ? "EXIF metadata present"
                        : "No EXIF metadata found"}
                    </li>
                    <li>
                      GPS location:{" "}
                      <strong>
                        {activeItem.metadata.hasGps
                          ? "present — removed"
                          : "none"}
                      </strong>
                    </li>
                    <li>
                      Camera:{" "}
                      <strong>
                        {activeItem.metadata.camera ?? "not recorded"}
                      </strong>
                    </li>
                    <li>
                      Colour profile / XMP:{" "}
                      <strong>
                        {[
                          activeItem.metadata.hasIcc ? "ICC" : "",
                          activeItem.metadata.hasXmp ? "XMP" : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "none"}
                      </strong>
                    </li>
                  </ul>
                ) : (
                  <p className="help">
                    Add an image to inspect its embedded metadata.
                  </p>
                )}
                <p className="help">
                  Re-encoding strips EXIF, GPS, XMP and colour profiles — the
                  privacy-safe default. The original file on your device is
                  never modified.
                </p>
              </div>
            </details>
          </fieldset>
        </section>

        <section className="compressor-panel" aria-labelledby="compress-output">
          <div className="compressor-panel-head">
            <h3 id="compress-output">Preview &amp; result</h3>
            {activeResult ? (
              <div
                className="compressor-toggle"
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
                  aria-pressed={previewMode === "result"}
                  onClick={() => setPreviewMode("result")}
                >
                  Result
                </button>
              </div>
            ) : null}
          </div>

          {activeItem ? (
            <div className="compressor-preview">
              <div className="compressor-preview-toolbar">
                <div
                  className="compressor-viewswitch"
                  role="group"
                  aria-label="Comparison view"
                >
                  <button
                    type="button"
                    aria-pressed={compare === "single"}
                    title="Single preview"
                    onClick={() => setCompare("single")}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    aria-pressed={compare === "split"}
                    title="Split slider comparison"
                    disabled={!activeResult}
                    onClick={() => setCompare("split")}
                  >
                    <ArrowLeftRight size={12} aria-hidden="true" /> Split
                  </button>
                  <button
                    type="button"
                    aria-pressed={compare === "side"}
                    title="Side-by-side comparison"
                    disabled={!activeResult}
                    onClick={() => setCompare("side")}
                  >
                    <Columns2 size={12} aria-hidden="true" /> Side by side
                  </button>
                </div>
                <span className="compressor-dimensions">
                  {showResult && activeResult
                    ? `${activeResult.width} × ${activeResult.height} px`
                    : `${activeItem.width} × ${activeItem.height} px`}
                </span>
              </div>

              {compare === "side" && activeResult ? (
                <div className="compressor-compare">
                  <figure>
                    <img
                      src={activeItem.originalUrl}
                      alt={`Original preview of ${activeItem.file.name}`}
                    />
                    <figcaption>
                      Original · {formatBytes(activeItem.file.size)}
                    </figcaption>
                  </figure>
                  <figure>
                    <img
                      src={activeResult.url}
                      alt={`Compressed preview of ${activeItem.file.name}`}
                    />
                    <figcaption>
                      Compressed · {formatBytes(activeResult.blob.size)}
                    </figcaption>
                  </figure>
                </div>
              ) : (
                <div
                  className={
                    compare === "split" && activeResult
                      ? "compressor-stage compressor-split-stage"
                      : "compressor-stage"
                  }
                >
                  {compare === "split" && activeResult ? (
                    <>
                      <img
                        className="compressor-split-base"
                        src={activeItem.originalUrl}
                        alt={`Original preview of ${activeItem.file.name}`}
                      />
                      <img
                        className="compressor-split-top"
                        src={activeResult.url}
                        alt={`Compressed preview of ${activeItem.file.name}`}
                        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
                      />
                      <span
                        className="compressor-split-line"
                        style={{ left: `${split}%` }}
                        aria-hidden="true"
                      />
                      <span className="compressor-split-label compressor-split-left">
                        Before
                      </span>
                      <span className="compressor-split-label compressor-split-right">
                        After
                      </span>
                    </>
                  ) : (
                    <img
                      className="compressor-main-image"
                      src={
                        showResult && activeResult
                          ? activeResult.url
                          : activeItem.originalUrl
                      }
                      alt={
                        showResult && activeResult
                          ? `Compressed preview of ${activeItem.file.name}`
                          : `Original preview of ${activeItem.file.name}`
                      }
                    />
                  )}
                  <span className="compressor-preview-tag">
                    {showResult && activeResult
                      ? formatBytes(activeResult.blob.size)
                      : formatBytes(activeItem.file.size)}
                  </span>
                </div>
              )}

              {compare === "split" && activeResult ? (
                <div className="compressor-slider-row">
                  <label htmlFor="compressor-split">Comparison position</label>
                  <div className="range-row">
                    <input
                      id="compressor-split"
                      type="range"
                      min={0}
                      max={100}
                      value={split}
                      onChange={(event) => setSplit(Number(event.target.value))}
                    />
                    <output htmlFor="compressor-split">{split}%</output>
                  </div>
                </div>
              ) : null}

              <dl className="compressor-stats">
                <div>
                  <dt>Original</dt>
                  <dd>
                    {formatBytes(activeItem.file.size)} ·{" "}
                    {inputLabel(activeItem.file.type)}
                  </dd>
                </div>
                <div>
                  <dt>Compressed</dt>
                  <dd>
                    {activeResult
                      ? `${formatBytes(activeResult.blob.size)} · ${formatLabel(
                          activeResult.blob.type as CompressFormat,
                        )}`
                      : "not processed yet"}
                  </dd>
                </div>
                <div>
                  <dt>Savings</dt>
                  <dd
                    className={
                      activeResult &&
                      savingsPercent(
                        activeItem.file.size,
                        activeResult.blob.size,
                      ) < 0
                        ? "compressor-worse"
                        : undefined
                    }
                  >
                    {activeResult
                      ? savingsLabel(
                          activeItem.file.size,
                          activeResult.blob.size,
                        )
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Dimensions</dt>
                  <dd>
                    {activeResult
                      ? `${activeResult.width} × ${activeResult.height} px${activeResult.scaled ? " (scaled)" : " · unchanged"}`
                      : `${activeItem.width} × ${activeItem.height} px`}
                  </dd>
                </div>
                <div>
                  <dt>{mode === "target" ? "Target" : "Quality"}</dt>
                  <dd>
                    {mode === "target"
                      ? targetPreview
                        ? `${targetLabel(targetPreview)} · ${
                            activeResult
                              ? activeResult.targetMet
                                ? `met at q${activeResult.quality}`
                                : "not reachable"
                              : "search on compress"
                          }`
                        : "check the target"
                      : usesQuality(formatFor(activeItem))
                        ? `${activeResult ? activeResult.quality : quality}%`
                        : "lossless"}
                  </dd>
                </div>
              </dl>

              {activeResult ? (
                <div className="compressor-result-actions">
                  <a
                    className="primary compressor-download"
                    href={activeResult.url}
                    download={activeResult.filename}
                    aria-label={`Download ${activeResult.filename}`}
                  >
                    <Download size={16} aria-hidden="true" /> Download image
                  </a>
                  <code className="compressor-filename">
                    {activeResult.filename}
                  </code>
                </div>
              ) : (
                <p className="help compressor-hint">
                  {activeItem.status === "working"
                    ? "Compressing on your device…"
                    : "Compress to see the result, its exact size and the savings."}
                </p>
              )}
            </div>
          ) : (
            <div className="compressor-empty">
              <span className="compressor-empty-icon" aria-hidden="true">
                <ImageDown size={26} />
              </span>
              <strong>No image yet</strong>
              <p>
                Add a JPEG, PNG, WebP or AVIF file to see before/after sizes and
                dimensions here.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="action-row compressor-actions">
        <button
          className="primary"
          type="button"
          onClick={() => void compressAll()}
          disabled={busy || zipBusy || !items.length || Boolean(targetError)}
        >
          <Sparkles size={16} aria-hidden="true" />
          {busy
            ? `Compressing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
            : `Compress ${items.length ? `${items.length} ` : ""}image${items.length === 1 ? "" : "s"}`}
        </button>
        {busy ? (
          <button
            className="secondary compressor-cancel"
            type="button"
            onClick={cancelRun}
            title="Stop the queue after the current image"
          >
            <CircleStop size={16} aria-hidden="true" />
            Stop
          </button>
        ) : null}
        {!busy && failedItems.length ? (
          <button
            className="secondary compressor-retry"
            type="button"
            onClick={() => void compressAll(true)}
            disabled={zipBusy}
            title="Run the queue again for failed images only"
          >
            <RotateCcw size={16} aria-hidden="true" /> Retry failed (
            {failedItems.length})
          </button>
        ) : null}
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
          className="secondary compressor-reset"
          type="button"
          onClick={resetAll}
          disabled={zipBusy}
        >
          <Trash2 size={16} aria-hidden="true" /> Reset
        </button>
        <span className="compressor-format-note">
          <ShieldCheck size={15} aria-hidden="true" /> {formatLabel(format)} ·{" "}
          {format === "image/png" ? "lossless" : `${quality}% quality`}
        </span>
      </div>

      {busy ? (
        <div
          className="compressor-progress"
          role="group"
          aria-label="Batch progress"
        >
          <progress
            value={progress.done}
            max={progress.total || 1}
            aria-label={`${progress.done} of ${progress.total} images compressed`}
          />
          <span>
            {progress.done} / {progress.total} finished ·{" "}
            {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
          </span>
        </div>
      ) : null}

      {issues.length ? (
        <div className="status error compressor-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {notice ? (
        <p className="status success compressor-notice" role="status">
          <CheckCircle2 size={16} aria-hidden="true" /> {notice}
        </p>
      ) : null}

      {items.length ? (
        <section
          className="compressor-queue"
          aria-labelledby="compressor-queue-title"
        >
          <div className="compressor-queue-head">
            <h3 id="compressor-queue-title">
              Batch queue <span>{items.length}</span>
            </h3>
            <p>
              {doneItems.length
                ? `${doneItems.length} of ${items.length} compressed · ${formatBytes(
                    totals.compressed,
                  )} from ${formatBytes(totals.original)}${
                    totals.original
                      ? ` (${totals.percent >= 0 ? "−" : "+"}${Math.abs(
                          Math.round(totals.percent),
                        )}%)`
                      : ""
                  }`
                : "Settings apply to every image in this batch."}
            </p>
          </div>
          <ul className="compressor-list">
            {items.map((item) => {
              const isActive = activeItem?.id === item.id;
              const expanded = expandedId === item.id;
              const itemFormat = formatFor(item);
              const target = mode === "target" ? targetFor(item) : null;
              return (
                <li
                  key={item.id}
                  className={
                    isActive
                      ? "compressor-item compressor-item-active"
                      : "compressor-item"
                  }
                >
                  <div className="compressor-item-main">
                    <button
                      type="button"
                      className="compressor-thumb"
                      aria-pressed={isActive}
                      aria-label={`Preview ${item.file.name}`}
                      onClick={() => {
                        setSelectedId(item.id);
                        setPreviewMode(item.result ? "result" : "original");
                      }}
                    >
                      <img src={item.originalUrl} alt="" />
                    </button>
                    <div className="compressor-item-body">
                      <strong title={item.file.name}>{item.file.name}</strong>
                      <span>
                        {formatBytes(item.file.size)}
                        {item.result
                          ? ` → ${formatBytes(item.result.blob.size)}`
                          : ""}{" "}
                        · {formatLabel(itemFormat)}
                        {item.override.enabled ? " · custom" : ""}
                        {item.result
                          ? ` · ${compactSavings(item.file.size, item.result.blob.size)}`
                          : ""}
                      </span>
                      {item.error ? (
                        <span className="compressor-item-error">
                          {item.error}
                        </span>
                      ) : item.result ? (
                        <span className="compressor-item-size">
                          {item.result.width} × {item.result.height} px ·{" "}
                          {item.result.scaled
                            ? "downscaled to hit the target"
                            : "dimensions unchanged"}
                          {mode === "target" && !item.result.targetMet
                            ? " · target not reachable at this size"
                            : ""}
                        </span>
                      ) : (
                        <span className="compressor-item-size">
                          {item.width} × {item.height} px ·{" "}
                          {mode === "target" && target
                            ? `target ${target.raw} ${target.unit}`
                            : usesQuality(itemFormat)
                              ? `${qualityFor(item)}% quality`
                              : "lossless PNG"}
                        </span>
                      )}
                    </div>
                    <span
                      className={`compressor-status compressor-status-${item.status}`}
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
                    <button
                      type="button"
                      className="compressor-icon-button"
                      aria-expanded={expanded}
                      aria-controls={`compressor-extra-${item.id}`}
                      aria-label={`Custom settings for ${item.file.name}`}
                      title="Per-image settings"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                    >
                      <Settings2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="compressor-icon-button"
                      aria-label={`Replace ${item.file.name}`}
                      title="Replace this file"
                      disabled={busy}
                      onClick={() => {
                        replaceTarget.current = item.id;
                        replaceRef.current?.click();
                      }}
                    >
                      <Upload size={15} />
                    </button>
                    {item.result ? (
                      <a
                        className="compressor-icon-button"
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
                      className="compressor-icon-button"
                      aria-label={`Remove ${item.file.name}`}
                      title="Remove from batch"
                      onClick={() => removeItem(item.id)}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div
                    id={`compressor-extra-${item.id}`}
                    className="compressor-item-extra"
                    hidden={!expanded}
                  >
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={item.override.enabled}
                        onChange={(event) => {
                          clearResults();
                          updateItem(item.id, {
                            override: {
                              ...item.override,
                              enabled: event.target.checked,
                              quality: item.override.quality || quality,
                            },
                          });
                        }}
                      />
                      Custom settings for this image
                    </label>
                    {item.override.enabled ? (
                      <>
                        <div className="compressor-extra-grid">
                          <div className="compressor-field">
                            <label htmlFor={`ov-format-${item.id}`}>
                              Custom format
                            </label>
                            <select
                              id={`ov-format-${item.id}`}
                              value={item.override.format}
                              onChange={(event) => {
                                clearResults();
                                updateItem(item.id, {
                                  override: {
                                    ...item.override,
                                    format: event.target.value as
                                      CompressFormat | "auto",
                                  },
                                });
                              }}
                            >
                              <option value="auto">
                                Same as batch ({formatLabel(format)})
                              </option>
                              {COMPRESS_FORMATS.map((value) => (
                                <option
                                  key={value}
                                  value={value}
                                  disabled={!support[value]}
                                >
                                  {formatLabel(value)}
                                </option>
                              ))}
                            </select>
                          </div>
                          {mode === "target" ? (
                            <>
                              <div className="compressor-field">
                                <label htmlFor={`ov-target-${item.id}`}>
                                  Custom target size
                                </label>
                                <input
                                  id={`ov-target-${item.id}`}
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  placeholder={targetValue}
                                  value={item.override.targetValue}
                                  onChange={(event) => {
                                    clearResults();
                                    updateItem(item.id, {
                                      override: {
                                        ...item.override,
                                        targetValue: event.target.value,
                                      },
                                    });
                                  }}
                                />
                              </div>
                              <div className="compressor-field">
                                <label htmlFor={`ov-unit-${item.id}`}>
                                  Custom target unit
                                </label>
                                <select
                                  id={`ov-unit-${item.id}`}
                                  value={item.override.targetUnit}
                                  onChange={(event) => {
                                    clearResults();
                                    updateItem(item.id, {
                                      override: {
                                        ...item.override,
                                        targetUnit: event.target
                                          .value as SizeUnit,
                                      },
                                    });
                                  }}
                                >
                                  <option value="KB">KB</option>
                                  <option value="MB">MB</option>
                                </select>
                              </div>
                            </>
                          ) : (
                            <div className="compressor-field">
                              <label htmlFor={`ov-quality-${item.id}`}>
                                Custom quality
                              </label>
                              <div className="range-row">
                                <input
                                  id={`ov-quality-${item.id}`}
                                  type="range"
                                  min={MIN_QUALITY}
                                  max={MAX_QUALITY}
                                  value={item.override.quality}
                                  disabled={!usesQuality(itemFormat)}
                                  onChange={(event) => {
                                    clearResults();
                                    updateItem(item.id, {
                                      override: {
                                        ...item.override,
                                        quality: Number(event.target.value),
                                      },
                                    });
                                  }}
                                />
                                <output htmlFor={`ov-quality-${item.id}`}>
                                  {usesQuality(itemFormat)
                                    ? `${item.override.quality}%`
                                    : "—"}
                                </output>
                              </div>
                            </div>
                          )}
                          <div className="compressor-field">
                            <label htmlFor={`ov-name-${item.id}`}>
                              Custom output name
                            </label>
                            <input
                              id={`ov-name-${item.id}`}
                              type="text"
                              placeholder={item.file.name.replace(
                                /\.[^.]+$/,
                                "",
                              )}
                              value={item.override.name}
                              onChange={(event) => {
                                clearResults();
                                updateItem(item.id, {
                                  override: {
                                    ...item.override,
                                    name: event.target.value,
                                  },
                                });
                              }}
                            />
                          </div>
                          <div className="compressor-field">
                            <label htmlFor={`ov-suffix-${item.id}`}>
                              Suffix for this image
                            </label>
                            <input
                              id={`ov-suffix-${item.id}`}
                              type="text"
                              placeholder="e.g. small"
                              value={item.override.suffix}
                              onChange={(event) => {
                                clearResults();
                                updateItem(item.id, {
                                  override: {
                                    ...item.override,
                                    suffix: event.target.value,
                                  },
                                });
                              }}
                            />
                          </div>
                        </div>
                        <p className="compressor-extra-foot">
                          <code>
                            {outputNameFor(item, {
                              width: item.width,
                              height: item.height,
                            })}
                          </code>
                          <button
                            type="button"
                            className="compressor-chip"
                            onClick={() => {
                              clearResults();
                              updateItem(item.id, {
                                override: {
                                  ...defaultOverride,
                                  quality,
                                },
                              });
                            }}
                          >
                            Reset this image&apos;s settings
                          </button>
                        </p>
                      </>
                    ) : (
                      <p className="help compressor-hint">
                        Batch settings apply. Enable this to set a different
                        format, quality, target, name or suffix for this image.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <ul className="compressor-tips">
        <li>
          Files never leave this tab: decode, encode and ZIP all run locally.
        </li>
        <li>
          Re-encoding removes EXIF/GPS metadata; the original on your device is
          never modified.
        </li>
        <li>
          PNG is lossless and can be larger than the source — compare before
          downloading.
        </li>
      </ul>

      <input
        ref={replaceRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label="Replace image file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          const target = replaceTarget.current;
          event.currentTarget.value = "";
          replaceTarget.current = null;
          if (file && target) void replaceFile(target, file);
        }}
      />

      <p className="sr-only" role="status">
        {busy
          ? `Compressing image ${Math.min(progress.done + 1, progress.total)} of ${progress.total}.`
          : notice}
      </p>
    </fieldset>
  );
}
