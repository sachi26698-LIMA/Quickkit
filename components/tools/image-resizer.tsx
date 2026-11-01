"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Columns2,
  Crop,
  Download,
  Droplet,
  Eraser,
  FileArchive,
  FlipHorizontal2,
  FlipVertical2,
  Gauge,
  ImagePlus,
  Info,
  Lock,
  LockOpen,
  Maximize,
  Redo2,
  RefreshCw,
  Replace,
  RotateCcw,
  RotateCw,
  Ruler,
  Scaling,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { formatBytes } from "@/lib/tools/image";
import {
  CROP_ASPECTS,
  DEFAULT_EDITS,
  DEFAULT_QUALITY,
  buildOutputName,
  centredCrop,
  clampCrop,
  cmFromPx,
  describeEdits,
  estimateOutputBytes,
  filterCss,
  fullCrop,
  hasEdits,
  normalizeAngle,
  printLabel,
  previewTransform,
  printPixelSize,
  ratioLabel,
  resizeCropByHandle,
  rotatedSize,
  validateDpi,
  type CropHandle,
  type ImageEdits,
  type QuickFilter,
} from "@/lib/tools/image-edits";
import {
  ALL_PRESETS,
  MAX_BATCH_FILES,
  PERCENTAGE_STEPS,
  PRESET_SIZES,
  SOCIAL_PLATFORMS,
  formatLabel,
  formatPixels,
  linkedHeight,
  linkedWidth,
  megapixels,
  planResize,
  presetsByPlatform,
  scalePercent,
  sizeDeltaLabel,
  uniqueName,
  type CropRect,
  type FitMode,
  type OutputFormat,
  type PresetSize,
  type ResizeMode,
  type ResizePlan,
  type ResizeSettings,
} from "@/lib/tools/image-resize";
import {
  canEncode,
  inspectFile,
  resizeImageFile,
  supportsCanvasFilter,
} from "@/lib/tools/image-resize-runner";
import { scanMetadata, type MetadataReport } from "@/lib/tools/exif";
import { createZip } from "@/lib/tools/zip";

type QueueStatus = "ready" | "working" | "done" | "error";

type ItemOverride = {
  enabled: boolean;
  width: number;
  height: number;
  lockAspect: boolean;
  format: OutputFormat | "auto";
  quality: number;
  name: string;
  suffix: string;
};

type QueueItem = {
  id: string;
  file: File;
  originalUrl: string;
  width: number;
  height: number;
  status: QueueStatus;
  error?: string;
  edits: ImageEdits;
  override: ItemOverride;
  metadata: MetadataReport;
  result?: {
    blob: Blob;
    url: string;
    width: number;
    height: number;
    filename: string;
  };
};

type HistoryEntry = { past: ImageEdits[]; future: ImageEdits[] };

const MODES: { id: ResizeMode; label: string; hint: string }[] = [
  { id: "dimensions", label: "Dimensions", hint: "Exact pixels" },
  { id: "percentage", label: "Percentage", hint: "Scale up or down" },
  { id: "preset", label: "Presets", hint: "Web & social" },
  { id: "longest", label: "Longest side", hint: "Keep the ratio" },
  { id: "shortest", label: "Shortest side", hint: "Keep the ratio" },
];

const FITS: { id: FitMode; label: string; hint: string }[] = [
  { id: "cover", label: "Fill", hint: "Exact preset, centred crop (cover)" },
  { id: "contain", label: "Fit inside", hint: "Whole image inside the box" },
  { id: "stretch", label: "Stretch", hint: "Force the exact dimensions" },
];

const FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "none", label: "None" },
  { id: "grayscale", label: "Grayscale" },
  { id: "sepia", label: "Sepia" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "invert", label: "Invert" },
];

const ROTATIONS = [0, 90, 180, 270] as const;
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;
const ZOOM_STEP = 25;
const MAX_BATCH_PIXELS = 200_000_000;

const FORMAT_NOTES: Record<OutputFormat, string> = {
  "image/jpeg": "Most compatible · no transparency",
  "image/png": "Lossless · transparency kept",
  "image/webp": "Small files · transparency kept",
  "image/avif": "Smallest files · newer browsers",
};

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

const defaultOverride: ItemOverride = {
  enabled: false,
  width: 0,
  height: 0,
  lockAspect: true,
  format: "auto",
  quality: DEFAULT_QUALITY,
  name: "",
  suffix: "",
};

/* ------------------------------- crop overlay ------------------------------ */

function CropOverlay({
  rect,
  crop,
  imageWidth,
  imageHeight,
  ratio,
  onChange,
  onStart,
}: {
  rect: { left: number; top: number; width: number; height: number };
  crop: CropRect;
  imageWidth: number;
  imageHeight: number;
  ratio: number | null;
  onChange: (next: CropRect) => void;
  onStart?: () => void;
}) {
  const dragRef = useRef<{
    handle: CropHandle;
    x: number;
    y: number;
    crop: CropRect;
  } | null>(null);
  if (!rect.width || !rect.height) return null;
  const scaleX = imageWidth / rect.width;
  const scaleY = imageHeight / rect.height;
  const box = {
    left: (crop.x / imageWidth) * rect.width,
    top: (crop.y / imageHeight) * rect.height,
    width: (crop.width / imageWidth) * rect.width,
    height: (crop.height / imageHeight) * rect.height,
  };

  function startDrag(event: React.PointerEvent, handle: CropHandle) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    onStart?.();
    dragRef.current = {
      handle,
      x: event.clientX,
      y: event.clientY,
      crop,
    };
  }

  function onBoxPointerDown(event: React.PointerEvent) {
    startDrag(event, "move");
  }

  function onCornerPointerDown(event: React.PointerEvent) {
    const handle = (event.currentTarget as HTMLElement).dataset
      .handle as CropHandle | undefined;
    if (handle) startDrag(event, handle);
  }

  const move = (event: React.PointerEvent) => {
    const start = dragRef.current;
    if (!start) return;
    const dx = (event.clientX - start.x) * scaleX;
    const dy = (event.clientY - start.y) * scaleY;
    if (!dx && !dy) return;
    onChange(
      resizeCropByHandle(
        start.crop,
        start.handle,
        dx,
        dy,
        imageWidth,
        imageHeight,
        ratio,
      ),
    );
  };

  const end = (event: React.PointerEvent) => {
    dragRef.current = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  };

  const nudge = (handle: CropHandle, dx: number, dy: number) =>
    onChange(
      resizeCropByHandle(crop, handle, dx, dy, imageWidth, imageHeight, ratio),
    );

  return (
    <div
      className="resizer-crop-layer"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      <div
        className="resizer-crop-box"
        style={box}
        tabIndex={0}
        role="group"
        aria-label="Crop area — use arrow keys to move, or edit the crop fields"
        onPointerDown={onBoxPointerDown}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 16 : 2;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const delta = moves[event.key];
          if (!delta) return;
          event.preventDefault();
          nudge("move", delta[0], delta[1]);
        }}
      >
        <span className="resizer-crop-third" aria-hidden="true" />
        {(["nw", "ne", "sw", "se"] as CropHandle[]).map((corner) => (
          <button
            key={corner}
            type="button"
            className={`resizer-crop-handle resizer-crop-${corner}`}
            aria-label={`Resize crop from the ${corner} corner`}
            data-handle={corner}
            onPointerDown={onCornerPointerDown}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 16 : 4;
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const delta = moves[event.key];
              if (!delta) return;
              event.preventDefault();
              nudge(corner, delta[0], delta[1]);
            }}
          />
        ))}
        <span className="resizer-crop-size" aria-hidden="true">
          {Math.round(crop.width)} × {Math.round(crop.height)}
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------- main ---------------------------------- */

export default function ImageResizer() {
  const ready = useHydrated();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"resize" | "edit">("resize");
  const [mode, setMode] = useState<ResizeMode>("dimensions");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [lock, setLock] = useState(true);
  const [percentage, setPercentage] = useState(50);
  const [presetId, setPresetId] = useState(PRESET_SIZES[0].id);
  const [fit, setFit] = useState<FitMode>("cover");
  const [sideLength, setSideLength] = useState("1280");
  const [customPresets, setCustomPresets] = useState<PresetSize[]>([]);
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [background, setBackground] = useState("#ffffff");
  const [baseName, setBaseName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [dpi, setDpi] = useState("300");
  const [printWidth, setPrintWidth] = useState("10");
  const [printHeight, setPrintHeight] = useState("15");
  const [previewMode, setPreviewMode] = useState<"original" | "resized">(
    "original",
  );
  const [compare, setCompare] = useState<"single" | "split" | "side">("single");
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [cropTool, setCropTool] = useState(false);
  const [cropAspect, setCropAspect] = useState("free");
  const [history, setHistory] = useState<Record<string, HistoryEntry>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [support, setSupport] = useState<Record<OutputFormat, boolean>>({
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true,
    "image/avif": false,
  });
  const [issues, setIssues] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [imgRect, setImgRect] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  const urlsRef = useRef<Map<string, string>>(new Map());
  const runRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const formats: OutputFormat[] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ];
      const next = {} as Record<OutputFormat, boolean>;
      for (const value of formats) next[value] = canEncode(value);
      setSupport(next);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectedPreset = useMemo<PresetSize | null>(
    () => [...ALL_PRESETS, ...customPresets].find((preset) => preset.id === presetId) ?? null,
    [presetId, customPresets],
  );

  const activeItem =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const doneItems = items.filter((item) => item.result);

  /* ------------------------------- geometry ------------------------------- */

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
      sideLength: Number(sideLength),
    }),
    [mode, width, height, lock, percentage, fit, selectedPreset, sideLength],
  );

  const settingsFor = useCallback(
    (item: QueueItem): ResizeSettings => {
      if (!item.override.enabled) return settings;
      return {
        mode: "dimensions",
        width: item.override.width,
        height: item.override.height,
        lockAspect: item.override.lockAspect,
        percentage: 100,
        fit: "stretch",
        preset: null,
      };
    },
    [settings],
  );

  const editedSizeFor = useCallback((item: QueueItem) => {
    const crop = clampCrop(item.edits.crop, item.width, item.height);
    return rotatedSize(crop.width, crop.height, item.edits.rotation);
  }, []);

  const planFor = useCallback(
    (item: QueueItem): ResizePlan | null => {
      const size = editedSizeFor(item);
      try {
        return planResize(size.width, size.height, settingsFor(item));
      } catch {
        return null;
      }
    },
    [editedSizeFor, settingsFor],
  );

  const planError = useMemo(() => {
    if (!activeItem) return "";
    try {
      const size = editedSizeFor(activeItem);
      const plan = planResize(size.width, size.height, settingsFor(activeItem));
      if (plan.width * plan.height > 24_000_000)
        return "That output is over 24 megapixels. Choose smaller dimensions.";
      return "";
    } catch (error) {
      return errorMessage(error);
    }
  }, [activeItem, editedSizeFor, settingsFor]);

  const activePlan = activeItem ? planFor(activeItem) : null;
  const activeCrop = activeItem
    ? clampCrop(activeItem.edits.crop, activeItem.width, activeItem.height)
    : null;
  const activeEdits = activeItem?.edits ?? DEFAULT_EDITS;

  const outputFormatFor = (item: QueueItem): OutputFormat =>
    item.override.enabled && item.override.format !== "auto"
      ? item.override.format
      : format;
  const outputQualityFor = (item: QueueItem) =>
    item.override.enabled ? item.override.quality : quality;
  const outputNameFor = (item: QueueItem, plan: ResizePlan) =>
    buildOutputName(item.file.name, {
      baseName: item.override.enabled ? item.override.name : baseName,
      suffix: item.override.enabled ? item.override.suffix : suffix,
      width: plan.width,
      height: plan.height,
      format: outputFormatFor(item),
    });

  const estimate = activePlan
    ? estimateOutputBytes(
        activePlan.width,
        activePlan.height,
        outputFormatFor(activeItem!),
        outputQualityFor(activeItem!),
      )
    : 0;

  const targetLabel = activePlan
    ? `${formatPixels(activePlan.width)} × ${formatPixels(activePlan.height)} px`
    : "—";
  const scale = activePlan && activeItem
    ? scalePercent(activePlan.width, editedSizeFor(activeItem).width)
    : 0;

  /* ------------------------------ invalidation ---------------------------- */

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

  const invalidate = (update: () => void) => {
    clearResults();
    setIssues([]);
    update();
  };

  /* -------------------------------- history ------------------------------- */

  const commitEdits = useCallback(
    (next: ImageEdits, record = true) => {
      const current = itemsRef.current.find((item) => item.id === selectedId) ??
        itemsRef.current[0];
      if (!current) return;
      clearResults();
      setIssues([]);
      if (record) {
        setHistory((previous) => {
          const entry = previous[current.id] ?? { past: [], future: [] };
          return {
            ...previous,
            [current.id]: {
              past: [...entry.past, current.edits].slice(-40),
              future: [],
            },
          };
        });
      }
      updateItem(current.id, { edits: next });
    },
    [clearResults, selectedId, updateItem],
  );

  const activeHistory = activeItem ? history[activeItem.id] : undefined;

  const pushHistory = useCallback(() => {
    const current = itemsRef.current.find((item) => item.id === selectedId) ??
      itemsRef.current[0];
    if (!current) return;
    setHistory((previous) => {
      const entry = previous[current.id] ?? { past: [], future: [] };
      return {
        ...previous,
        [current.id]: {
          past: [...entry.past, current.edits].slice(-40),
          future: [],
        },
      };
    });
  }, [selectedId]);

  const undo = useCallback(() => {
    const current = itemsRef.current.find((item) => item.id === selectedId) ??
      itemsRef.current[0];
    if (!current) return;
    const entry = history[current.id];
    if (!entry?.past.length) return;
    clearResults();
    const previous = entry.past[entry.past.length - 1];
    setHistory((state) => ({
      ...state,
      [current.id]: {
        past: entry.past.slice(0, -1),
        future: [current.edits, ...entry.future].slice(0, 40),
      },
    }));
    updateItem(current.id, { edits: previous });
  }, [clearResults, history, selectedId, updateItem]);

  const redo = useCallback(() => {
    const current = itemsRef.current.find((item) => item.id === selectedId) ??
      itemsRef.current[0];
    if (!current) return;
    const entry = history[current.id];
    if (!entry?.future.length) return;
    clearResults();
    const next = entry.future[0];
    setHistory((state) => ({
      ...state,
      [current.id]: {
        past: [...entry.past, current.edits].slice(-40),
        future: entry.future.slice(1),
      },
    }));
    updateItem(current.id, { edits: next });
  }, [clearResults, history, selectedId, updateItem]);

  /* --------------------------------- upload -------------------------------- */

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
        const pixels =
          itemsRef.current.reduce((sum, item) => sum + item.width * item.height, 0) +
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
          edits: {
            ...DEFAULT_EDITS,
            crop: fullCrop(dimensions.width, dimensions.height),
          },
          override: {
            ...defaultOverride,
            width: dimensions.width,
            height: dimensions.height,
            format: "auto",
            quality,
          },
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
      const first = itemsRef.current.length === 0;
      commitItems([...itemsRef.current, ...fresh]);
      if (first) {
        setSelectedId(fresh[0].id);
        setWidth(String(fresh[0].width));
        setHeight(String(fresh[0].height));
        setSideLength(String(Math.max(fresh[0].width, fresh[0].height)));
      }
      setNotice(
        `${fresh.length} image${fresh.length === 1 ? "" : "s"} added. Choose a size, then resize.`,
      );
    }
    setIssues(problems);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function replaceFile(id: string, file: File) {
    try {
      const dimensions = await inspectFile(file);
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
        edits: {
          ...item.edits,
          crop: fullCrop(dimensions.width, dimensions.height),
        },
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

  /* -------------------------------- resizing ------------------------------- */

  async function resizeAll() {
    const queue = itemsRef.current;
    if (!queue.length) {
      setIssues(["Add at least one image before resizing."]);
      setNotice("");
      return;
    }
    for (const item of queue) {
      try {
        const size = editedSizeFor(item);
        planResize(size.width, size.height, settingsFor(item));
      } catch (error) {
        setIssues([errorMessage(error)]);
        setNotice("");
        return;
      }
    }

    const run = runRef.current + 1;
    runRef.current = run;
    setIssues([]);
    setNotice("");
    setBusy(true);
    setCropTool(false);
    setProgress({ done: 0, total: queue.length });
    let failures = 0;
    let completed = 0;

    for (let index = 0; index < queue.length; index += 1) {
      if (run !== runRef.current) break;
      const current = itemsRef.current.find(
        (item) => item.id === queue[index].id,
      );
      if (!current) continue;
      updateItem(current.id, { status: "working", error: undefined });
      try {
        const itemSettings = settingsFor(current);
        const itemFormat = outputFormatFor(current);
        const itemQuality = outputQualityFor(current);
        const result = await resizeImageFile(current.file, {
          ...itemSettings,
          format: itemFormat,
          quality: itemQuality / 100,
          background,
          edits: current.edits,
        });
        if (run !== runRef.current) return;
        const url = URL.createObjectURL(result.blob);
        registerUrl(`${current.id}:result`, url);
        const filename = outputNameFor(current, {
          width: result.width,
          height: result.height,
          crop: null,
          cropped: false,
          fit: "stretch",
        });
        setPreviewMode("resized");
        updateItem(current.id, {
          status: "done",
          error: undefined,
          result: {
            blob: result.blob,
            url,
            width: result.width,
            height: result.height,
            filename,
          },
        });
        completed += 1;
      } catch (error) {
        failures += 1;
        updateItem(current.id, {
          status: "error",
          error: errorMessage(error),
          result: undefined,
        });
      }
      setProgress({ done: index + 1, total: queue.length });
    }

    setBusy(false);
    if (completed && !failures)
      setNotice(
        `${completed} image${completed === 1 ? "" : "s"} processed locally. Preview, download individually, or grab the ZIP.`,
      );
    else if (completed && failures)
      setNotice(
        `${completed} processed successfully. ${failures} could not be processed — review the messages below.`,
      );
    else if (failures)
      setIssues([
        "None of the images could be processed. Check the messages in the queue.",
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
    const finished = itemsRef.current.filter((item) => item.result);
    if (!finished.length) {
      setIssues(["Process at least one image before downloading a ZIP archive."]);
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

  function resetAll() {
    runRef.current += 1;
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    commitItems([]);
    setSelectedId(null);
    setTab("resize");
    setMode("dimensions");
    setWidth("1920");
    setHeight("1080");
    setLock(true);
    setPercentage(50);
    setPresetId(PRESET_SIZES[0].id);
    setFit("cover");
    setSideLength("1280");
    setFormat("image/webp");
    setQuality(DEFAULT_QUALITY);
    setBackground("#ffffff");
    setBaseName("");
    setSuffix("");
    setPreviewMode("original");
    setCompare("single");
    setSplit(50);
    setZoom(100);
    setCropTool(false);
    setCropAspect("free");
    setHistory({});
    setExpandedId(null);
    setIssues([]);
    setNotice("");
    setBusy(false);
    setZipBusy(false);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  function resetEdits(id: string) {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    commitEdits(
      { ...DEFAULT_EDITS, crop: fullCrop(item.width, item.height) },
      true,
    );
  }

  function applyEditsPatch(patch: Partial<ImageEdits>) {
    if (!activeItem) return;
    commitEdits({ ...activeItem.edits, ...patch });
  }

  function handleCropChange(next: CropRect, record = true) {
    if (!activeItem) return;
    commitEdits(
      {
        ...activeItem.edits,
        crop: clampCrop(next, activeItem.width, activeItem.height),
      },
      record,
    );
  }

  function selectCropAspect(value: string) {
    setCropAspect(value);
    if (!activeItem) return;
    const option = CROP_ASPECTS.find((entry) => entry.id === value);
    if (!option) return;
    if (option.ratio === null) return;
    commitEdits({
      ...activeItem.edits,
      crop: centredCrop(activeItem.width, activeItem.height, option.ratio),
    });
  }

  /* -------------------------------- preview -------------------------------- */

  const measure = useCallback(() => {
    const image = imageRef.current;
    const stage = stageRef.current;
    if (!image || !stage) return;
    const imageBox = image.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    setImgRect({
      left: imageBox.left - stageBox.left + stage.scrollLeft,
      top: imageBox.top - stageBox.top + stage.scrollTop,
      width: imageBox.width,
      height: imageBox.height,
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measure);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => measure());
    if (imageRef.current) observer?.observe(imageRef.current);
    if (stageRef.current) observer?.observe(stageRef.current);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, zoom, previewMode, compare, activeItem?.id, activeItem?.result?.url]);

  const cropsEnabled = Boolean(activeItem) && cropTool;
  const showResult =
    Boolean(activeItem?.result) && previewMode === "resized" && compare === "single";
  const stageSrc = showResult && activeItem?.result
    ? activeItem.result.url
    : activeItem?.originalUrl ?? "";
  const stageAlt = showResult && activeItem?.result
    ? `Resized preview of ${activeItem.file.name}`
    : `Original preview of ${activeItem?.file.name ?? "image"}`;
  const liveFilter =
    !showResult && activeItem ? filterCss(activeItem.edits) : "";
  const liveTransform =
    !showResult && activeItem && !cropsEnabled
      ? previewTransform(activeItem.edits)
      : undefined;

  const zoomBy = (delta: number) =>
    setZoom((value) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value + delta))),
    );

  const tabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab === "resize" ? "edit" : "resize";
    setTab(next);
    const target = document.getElementById(`resizer-tab-${next}`);
    target?.focus();
  };

  const shortcuts = (event: React.KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (key === "y") {
      event.preventDefault();
      redo();
    }
  };

  const ratio = CROP_ASPECTS.find((entry) => entry.id === cropAspect)?.ratio ?? null;
  const metadata = activeItem?.metadata;
  const missingFormats = (Object.keys(support) as OutputFormat[]).filter(
    (value) => !support[value],
  );

  return (
    <fieldset
      className="workspace resizer-workspace"
      disabled={!ready}
      aria-label="Image resizer workspace"
      onKeyDown={shortcuts}
    >
      <div className="workspace-heading">
        <div>
          <h2>Resize anything. Keep the detail.</h2>
          <p>
            Crop, rotate, colour-grade and resize in the browser — then export
            one image or a whole batch.
          </p>
        </div>
        <span className="local-badge">100% local</span>
      </div>

      <label
        className={dragging ? "resizer-drop resizer-drop-active" : "resizer-drop"}
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
          accept="image/jpeg,image/png,image/webp,image/avif"
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
          <span>JPEG, PNG, WebP{activeItem || support["image/avif"] ? " or AVIF" : ""} · up to 15 MB each</span>
        </span>
        <span className="resizer-drop-action">Choose files</span>
      </label>
      <p id="resizer-help" className="help resizer-help">
        Up to {MAX_BATCH_FILES} images per batch · 24 megapixels and 8,192 px per
        side · processed one at a time to keep memory flat · nothing is uploaded.
      </p>

      <div className="resizer-grid">
        <section className="resizer-panel" aria-labelledby="resize-settings">
          <div className="resizer-panel-head">
            <h3 id="resize-settings">Resize &amp; edit</h3>
            <span className="resizer-summary">{targetLabel}</span>
          </div>

          <div
            className="resizer-tabs"
            role="tablist"
            aria-label="Resize and edit panels"
            onKeyDown={tabKeyDown}
          >
            <button
              type="button"
              role="tab"
              id="resizer-tab-resize"
              aria-selected={tab === "resize"}
              aria-controls="resizer-panel-resize"
              tabIndex={tab === "resize" ? 0 : -1}
              className={tab === "resize" ? "resizer-tab active" : "resizer-tab"}
              onClick={() => setTab("resize")}
            >
              <Scaling size={14} aria-hidden="true" /> Resize
            </button>
            <button
              type="button"
              role="tab"
              id="resizer-tab-edit"
              aria-selected={tab === "edit"}
              aria-controls="resizer-panel-edit"
              tabIndex={tab === "edit" ? 0 : -1}
              className={tab === "edit" ? "resizer-tab active" : "resizer-tab"}
              onClick={() => setTab("edit")}
            >
              <SlidersHorizontal size={14} aria-hidden="true" /> Edit
              {hasEdits(activeEdits, activeItem?.width, activeItem?.height) ? (
                <span className="resizer-dot" aria-label="edited" />
              ) : null}
            </button>
          </div>

          <fieldset className="resizer-settings" disabled={busy || zipBusy}>
            <legend className="sr-only">Resize settings</legend>

            <div
              role="tabpanel"
              id="resizer-panel-resize"
              aria-labelledby="resizer-tab-resize"
              hidden={tab !== "resize"}
            >
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
                        onChange={(event) => {
                          const value = event.target.value;
                          invalidate(() => {
                            setWidth(value);
                            if (lock) {
                              const parsed = Number(value);
                              if (Number.isFinite(parsed) && parsed > 0) {
                                const size = activeItem
                                  ? editedSizeFor(activeItem)
                                  : { width: 16, height: 9 };
                                setHeight(
                                  String(
                                    linkedHeight(parsed, size.width, size.height),
                                  ),
                                );
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="resizer-lock"
                      aria-pressed={lock}
                      aria-label={
                        lock ? "Unlock aspect ratio" : "Lock aspect ratio"
                      }
                      title={
                        lock
                          ? "Aspect ratio locked — unlock to stretch"
                          : "Aspect ratio unlocked — lock to keep proportions"
                      }
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
                        onChange={(event) => {
                          const value = event.target.value;
                          invalidate(() => {
                            setHeight(value);
                            if (lock) {
                              const parsed = Number(value);
                              if (Number.isFinite(parsed) && parsed > 0) {
                                const size = activeItem
                                  ? editedSizeFor(activeItem)
                                  : { width: 16, height: 9 };
                                setWidth(
                                  String(
                                    linkedWidth(parsed, size.width, size.height),
                                  ),
                                );
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="resizer-lock resizer-swap"
                      aria-label="Swap width and height"
                      title="Swap width and height"
                      onClick={() =>
                        invalidate(() => {
                          setWidth(height);
                          setHeight(width);
                        })
                      }
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
                        ? ` Edited source: ${formatPixels(
                            editedSizeFor(activeItem).width,
                          )} × ${formatPixels(editedSizeFor(activeItem).height)} px.`
                        : ""}
                    </p>
                    <button
                      type="button"
                      className="resizer-text-button"
                      onClick={() => {
                        if (!activeItem) return;
                        const size = editedSizeFor(activeItem);
                        invalidate(() => {
                          setMode("dimensions");
                          setWidth(String(size.width));
                          setHeight(String(size.height));
                          setLock(true);
                        });
                      }}
                      disabled={!activeItem}
                    >
                      Match edited size
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
                      ? `${formatPixels(editedSizeFor(activeItem).width)} × ${formatPixels(
                          editedSizeFor(activeItem).height,
                        )} px becomes ${formatPixels(activePlan.width)} × ${formatPixels(activePlan.height)} px.`
                      : "Choose an image to see the scaled dimensions."}
                  </p>
                </>
              ) : null}

              {mode === "longest" || mode === "shortest" ? (
                <>
                  <div className="resizer-field resizer-side-field">
                    <label htmlFor="resizer-side">
                      {mode === "longest" ? "Longest side (px)" : "Shortest side (px)"}
                    </label>
                    <input
                      id="resizer-side"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={8192}
                      value={sideLength}
                      onChange={(event) =>
                        invalidate(() => setSideLength(event.target.value))
                      }
                    />
                  </div>
                  <p className="help resizer-hint">
                    The other side keeps the edited image proportions.{" "}
                    {activePlan
                      ? `Result: ${formatPixels(activePlan.width)} × ${formatPixels(activePlan.height)} px.`
                      : ""}
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
                            onChange={() => invalidate(() => setPresetId(preset.id))}
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

                  {SOCIAL_PLATFORMS.map((platform) => (
                    <fieldset className="resizer-preset-group" key={platform}>
                      <legend>{platform}</legend>
                      <div className="resizer-presets">
                        {presetsByPlatform(platform).map((preset) => (
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
                  ))}

                  <fieldset className="resizer-preset-group">
                    <legend>Custom presets</legend>
                    {customPresets.length ? (
                      <div className="resizer-presets">
                        {customPresets.map((preset) => (
                          <div className="resizer-preset resizer-preset-custom" key={preset.id}>
                            <label>
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
                            </label>
                            <button
                              type="button"
                              className="resizer-preset-remove"
                              aria-label={`Delete preset ${preset.label}`}
                              title="Delete preset"
                              onClick={() => {
                                setCustomPresets((list) =>
                                  list.filter((entry) => entry.id !== preset.id),
                                );
                                if (presetId === preset.id)
                                  setPresetId(PRESET_SIZES[0].id);
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="help resizer-hint">
                        Save the current width and height as a reusable preset.
                      </p>
                    )}
                    <button
                      type="button"
                      className="resizer-chip resizer-save-preset"
                      onClick={() => {
                        const parsedWidth = Math.round(Number(width));
                        const parsedHeight = Math.round(Number(height));
                        if (
                          !Number.isFinite(parsedWidth) ||
                          !Number.isFinite(parsedHeight) ||
                          parsedWidth < 1 ||
                          parsedHeight < 1
                        ) {
                          setIssues([
                            "Enter a valid width and height before saving a preset.",
                          ]);
                          return;
                        }
                        const id = `custom-${Date.now()}`;
                        const preset: PresetSize = {
                          id,
                          label: `${parsedWidth} × ${parsedHeight}`,
                          width: parsedWidth,
                          height: parsedHeight,
                          note: "Saved preset",
                        };
                        setCustomPresets((list) => [...list, preset].slice(-8));
                        setPresetId(id);
                        setIssues([]);
                        setNotice(
                          `Preset ${preset.label} saved for this session.`,
                        );
                      }}
                    >
                      + Save current size
                    </button>
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
                      ? `Output: ${formatPixels(activePlan.width)} × ${formatPixels(
                          activePlan.height,
                        )} px${
                          activePlan.cropped
                            ? ` · centred crop of ${formatPixels(
                                activePlan.crop!.width,
                              )} × ${formatPixels(activePlan.crop!.height)} px`
                            : ""
                        }.`
                      : "Choose an image to preview the preset."}
                  </p>
                </>
              ) : null}

              <details className="resizer-details resizer-print">
                <summary>
                  <Ruler size={13} aria-hidden="true" /> DPI &amp; print size
                </summary>
                <div className="resizer-print-body">
                  <div className="resizer-field">
                    <label htmlFor="resizer-dpi">DPI (print resolution)</label>
                    <input
                      id="resizer-dpi"
                      type="number"
                      inputMode="numeric"
                      min={36}
                      max={1200}
                      step={1}
                      value={dpi}
                      onChange={(event) => setDpi(event.target.value)}
                    />
                  </div>
                  <div className="resizer-print-row">
                    <div className="resizer-field">
                      <label htmlFor="resizer-print-width">Print width (cm)</label>
                      <input
                        id="resizer-print-width"
                        type="number"
                        inputMode="decimal"
                        min={0.1}
                        step={0.1}
                        value={printWidth}
                        onChange={(event) => setPrintWidth(event.target.value)}
                      />
                    </div>
                    <div className="resizer-field">
                      <label htmlFor="resizer-print-height">Print height (cm)</label>
                      <input
                        id="resizer-print-height"
                        type="number"
                        inputMode="decimal"
                        min={0.1}
                        step={0.1}
                        value={printHeight}
                        onChange={(event) => setPrintHeight(event.target.value)}
                      />
                    </div>
                  </div>
                  <p className="help resizer-hint">
                    {activePlan
                      ? `At ${dpi || "—"} DPI this output prints at ${printLabel(
                          activePlan.width,
                          Number(dpi),
                        )} wide.`
                      : "Choose an image to see its print size."}
                  </p>
                  <p className="help resizer-hint">
                    Pixels needed for {printWidth || "—"} × {printHeight || "—"} cm:{" "}
                    {(() => {
                      try {
                        const value = validateDpi(Number(dpi));
                        const size = printPixelSize(
                          Number(printWidth) || 0,
                          Number(printHeight) || 0,
                          value,
                        );
                        return `${size.width} × ${size.height} px`;
                      } catch {
                        return "enter a DPI between 36 and 1,200";
                      }
                    })()}
                  </p>
                  <button
                    type="button"
                    className="secondary resizer-print-apply"
                    onClick={() => {
                      try {
                        const value = validateDpi(Number(dpi));
                        const size = printPixelSize(
                          Number(printWidth),
                          Number(printHeight),
                          value,
                        );
                        if (!size.width || !size.height)
                          throw new Error("Enter a print size in centimetres.");
                        invalidate(() => {
                          setMode("dimensions");
                          setLock(false);
                          setWidth(String(Math.min(8192, size.width)));
                          setHeight(String(Math.min(8192, size.height)));
                        });
                        setNotice(
                          `Targets ${size.width} × ${size.height} px for a ${printWidth} × ${printHeight} cm print at ${value} DPI.`,
                        );
                      } catch (error) {
                        setIssues([errorMessage(error)]);
                      }
                    }}
                  >
                    Use print size as pixels
                  </button>
                  <p className="help resizer-hint">
                    Canvas output does not embed a DPI tag; printers read the
                    pixel size. Use these controls to work out the right pixels.
                    {activePlan
                      ? ` Current output: ${cmFromPx(activePlan.width, Number(dpi) || 96).toFixed(1)} cm wide at ${dpi || 96} DPI.`
                      : ""}
                  </p>
                </div>
              </details>
            </div>

            <div
              role="tabpanel"
              id="resizer-panel-edit"
              aria-labelledby="resizer-tab-edit"
              hidden={tab !== "edit"}
            >
              <div className="resizer-edit-toolbar">
                <div className="resizer-chip-row">
                  <button
                    type="button"
                    className="resizer-chip"
                    aria-keyshortcuts="Control+Z Meta+Z"
                    onClick={undo}
                    disabled={!activeHistory?.past.length}
                    title="Undo the last edit"
                  >
                    <Undo2 size={13} aria-hidden="true" /> Undo
                  </button>
                  <button
                    type="button"
                    className="resizer-chip"
                    aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
                    onClick={redo}
                    disabled={!activeHistory?.future.length}
                    title="Redo the next edit"
                  >
                    <Redo2 size={13} aria-hidden="true" /> Redo
                  </button>
                  <button
                    type="button"
                    className="resizer-chip"
                    onClick={() => {
                      if (activeItem) resetEdits(activeItem.id);
                    }}
                    disabled={
                      !activeItem ||
                      !hasEdits(activeEdits, activeItem.width, activeItem.height)
                    }
                    title="Clear crop, rotation, flips and colour changes"
                  >
                    <Eraser size={13} aria-hidden="true" /> Reset edits
                  </button>
                </div>
              </div>

              {activeItem ? (
                <>
                  <section className="resizer-section" aria-labelledby="edit-crop">
                    <div className="resizer-section-head">
                      <h4 id="edit-crop">
                        <Crop size={13} aria-hidden="true" /> Crop
                      </h4>
                      <button
                        type="button"
                        className={
                          cropTool ? "resizer-chip resizer-chip-active" : "resizer-chip"
                        }
                        aria-pressed={cropTool}
                        onClick={() => {
                          setCropTool(!cropTool);
                          setPreviewMode("original");
                          setZoom(100);
                        }}
                      >
                        {cropTool ? "Close crop tool" : "Crop on preview"}
                      </button>
                    </div>
                    <div className="resizer-field">
                      <label htmlFor="resizer-crop-aspect">Crop aspect ratio</label>
                      <select
                        id="resizer-crop-aspect"
                        value={cropAspect}
                        onChange={(event) => selectCropAspect(event.target.value)}
                      >
                        {CROP_ASPECTS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="resizer-crop-fields">
                      {(
                        [
                          ["x", "Crop X"],
                          ["y", "Crop Y"],
                          ["width", "Crop width"],
                          ["height", "Crop height"],
                        ] as const
                      ).map(([key, label]) => (
                        <div className="resizer-field" key={key}>
                          <label htmlFor={`resizer-crop-${key}`}>{label}</label>
                          <input
                            id={`resizer-crop-${key}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={activeCrop ? activeCrop[key] : 0}
                            onChange={(event) => {
                              if (!activeCrop) return;
                              const parsed = Math.round(Number(event.target.value) || 0);
                              handleCropChange({ ...activeCrop, [key]: parsed });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="resizer-inline-row">
                      <p className="help resizer-hint">
                        Crop area {formatPixels(activeCrop?.width ?? 0)} ×{" "}
                        {formatPixels(activeCrop?.height ?? 0)} px · ratio{" "}
                        {activeCrop ? ratioLabel(activeCrop) : "—"}
                      </p>
                      <button
                        type="button"
                        className="resizer-text-button"
                        onClick={() => handleCropChange(fullCrop(activeItem.width, activeItem.height))}
                      >
                        Reset crop
                      </button>
                    </div>
                  </section>

                  <section className="resizer-section" aria-labelledby="edit-rotate">
                    <h4 id="edit-rotate">
                      <RotateCw size={13} aria-hidden="true" /> Rotate &amp; flip
                    </h4>
                    <div className="resizer-chip-row">
                      {ROTATIONS.map((angle) => (
                        <button
                          key={angle}
                          type="button"
                          className={
                            normalizeAngle(activeEdits.rotation) === angle
                              ? "resizer-chip resizer-chip-active"
                              : "resizer-chip"
                          }
                          aria-pressed={normalizeAngle(activeEdits.rotation) === angle}
                          onClick={() => applyEditsPatch({ rotation: angle })}
                        >
                          {angle === 0 ? "0°" : `${angle}°`}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="resizer-chip resizer-icon-chip"
                        aria-pressed={activeEdits.flipH}
                        aria-label="Flip horizontally"
                        title="Flip horizontally"
                        onClick={() => applyEditsPatch({ flipH: !activeEdits.flipH })}
                      >
                        <FlipHorizontal2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="resizer-chip resizer-icon-chip"
                        aria-pressed={activeEdits.flipV}
                        aria-label="Flip vertically"
                        title="Flip vertically"
                        onClick={() => applyEditsPatch({ flipV: !activeEdits.flipV })}
                      >
                        <FlipVertical2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="resizer-chip resizer-icon-chip"
                        aria-label="Rotate 90 degrees clockwise"
                        title="Rotate 90° clockwise"
                        onClick={() =>
                          applyEditsPatch({
                            rotation: normalizeAngle(activeEdits.rotation + 90),
                          })
                        }
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                    <div className="resizer-slider-row">
                      <label htmlFor="resizer-angle">Custom angle</label>
                      <div className="range-row">
                        <input
                          id="resizer-angle"
                          type="range"
                          min={0}
                          max={359}
                          step={1}
                          value={normalizeAngle(activeEdits.rotation)}
                          onChange={(event) =>
                            applyEditsPatch({ rotation: Number(event.target.value) })
                          }
                        />
                        <output htmlFor="resizer-angle">
                          {normalizeAngle(activeEdits.rotation)}°
                        </output>
                      </div>
                    </div>
                  </section>

                  <section className="resizer-section" aria-labelledby="edit-colour">
                    <h4 id="edit-colour">
                      <Sun size={13} aria-hidden="true" /> Light &amp; colour
                    </h4>
                    {(
                      [
                        ["brightness", "Brightness", Sun],
                        ["contrast", "Contrast", Gauge],
                        ["saturation", "Saturation", Droplet],
                      ] as const
                    ).map(([key, label, Icon]) => (
                      <div className="resizer-slider-row" key={key}>
                        <label htmlFor={`resizer-${key}`}>
                          {label}
                          <Icon size={12} aria-hidden="true" />
                        </label>
                        <div className="range-row">
                          <input
                            id={`resizer-${key}`}
                            type="range"
                            min={0}
                            max={200}
                            step={1}
                            value={activeEdits[key]}
                            onChange={(event) =>
                              applyEditsPatch({ [key]: Number(event.target.value) })
                            }
                          />
                          <output htmlFor={`resizer-${key}`}>{activeEdits[key]}%</output>
                        </div>
                      </div>
                    ))}
                    <div className="resizer-filter-row" role="group" aria-label="Quick filters">
                      {FILTERS.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className={
                            activeEdits.filter === entry.id
                              ? "resizer-chip resizer-chip-active"
                              : "resizer-chip"
                          }
                          aria-pressed={activeEdits.filter === entry.id}
                          onClick={() => applyEditsPatch({ filter: entry.id })}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                    <p className="help resizer-hint">
                      {supportsCanvasFilter()
                        ? "Filters are baked into the output image."
                        : "Your browser applies these filters with a slower pixel fallback, but the result is the same."}
                    </p>
                  </section>
                </>
              ) : (
                <p className="help resizer-hint">
                  Add an image to unlock cropping, rotation, flips and colour
                  adjustments.
                </p>
              )}
            </div>
          </fieldset>
        </section>

        <section className="resizer-panel" aria-labelledby="resize-output">
          <div className="resizer-panel-head">
            <h3 id="resize-output">Preview &amp; output</h3>
            {activeItem?.result ? (
              <div className="resizer-toggle" role="group" aria-label="Preview version">
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
                  Result
                </button>
              </div>
            ) : null}
          </div>

          {activeItem ? (
            <div className="resizer-preview">
              <div className="resizer-preview-toolbar">
                <div className="resizer-zoom" role="group" aria-label="Zoom">
                  <button
                    type="button"
                    className="resizer-icon-button"
                    aria-label="Zoom out"
                    title="Zoom out"
                    onClick={() => zoomBy(-ZOOM_STEP)}
                  >
                    <ZoomOut size={15} />
                  </button>
                  <span className="resizer-zoom-value">{zoom}%</span>
                  <button
                    type="button"
                    className="resizer-icon-button"
                    aria-label="Zoom in"
                    title="Zoom in"
                    onClick={() => zoomBy(ZOOM_STEP)}
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    type="button"
                    className="resizer-icon-button"
                    aria-label="Fit to screen"
                    title="Fit to screen"
                    onClick={() => setZoom(100)}
                  >
                    <Maximize size={15} />
                  </button>
                </div>
                <div className="resizer-viewswitch" role="group" aria-label="Comparison view">
                  <button
                    type="button"
                    aria-pressed={compare === "single"}
                    onClick={() => setCompare("single")}
                    title="Single preview"
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    aria-pressed={compare === "split"}
                    onClick={() => setCompare("split")}
                    disabled={!activeItem.result}
                    title="Split slider comparison"
                  >
                    <ArrowLeftRight size={12} aria-hidden="true" /> Split
                  </button>
                  <button
                    type="button"
                    aria-pressed={compare === "side"}
                    onClick={() => setCompare("side")}
                    disabled={!activeItem.result}
                    title="Side-by-side comparison"
                  >
                    <Columns2 size={12} aria-hidden="true" /> Side by side
                  </button>
                </div>
              </div>

              {compare === "side" && activeItem.result ? (
                <div className="resizer-compare">
                  <figure>
                    <img
                      src={activeItem.originalUrl}
                      alt={`Original preview of ${activeItem.file.name}`}
                      style={{ filter: filterCss(activeItem.edits) }}
                    />
                    <figcaption>
                      Original · {formatPixels(activeItem.width)} ×{" "}
                      {formatPixels(activeItem.height)} px ·{" "}
                      {formatBytes(activeItem.file.size)}
                    </figcaption>
                  </figure>
                  <figure>
                    <img
                      src={activeItem.result.url}
                      alt={`Resized preview of ${activeItem.file.name}`}
                    />
                    <figcaption>
                      Result · {formatPixels(activeItem.result.width)} ×{" "}
                      {formatPixels(activeItem.result.height)} px ·{" "}
                      {formatBytes(activeItem.result.blob.size)}
                    </figcaption>
                  </figure>
                </div>
              ) : (
                <div
                  className={
                    compare === "split"
                      ? "resizer-preview-stage resizer-split-stage"
                      : "resizer-preview-stage"
                  }
                  ref={stageRef}
                >
                  {compare === "split" && activeItem.result ? (
                    <>
                      <img
                        className="resizer-split-base"
                        src={activeItem.originalUrl}
                        alt={`Original preview of ${activeItem.file.name}`}
                        style={{ filter: filterCss(activeItem.edits) }}
                      />
                      <img
                        className="resizer-split-top"
                        src={activeItem.result.url}
                        alt={`Resized preview of ${activeItem.file.name}`}
                        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
                      />
                      <span
                        className="resizer-split-line"
                        style={{ left: `${split}%` }}
                        aria-hidden="true"
                      />
                      <span className="resizer-split-label resizer-split-label-left">
                        Before
                      </span>
                      <span className="resizer-split-label resizer-split-label-right">
                        After
                      </span>
                    </>
                  ) : (
                    <>
                  <img
                    ref={imageRef}
                    className="resizer-main-image"
                    src={stageSrc}
                    alt={stageAlt}
                    style={{
                      width: `${zoom}%`,
                      filter: liveFilter || undefined,
                      transform: liveTransform,
                    }}
                    draggable={false}
                  />

                  {cropsEnabled && activeCrop ? (
                    <CropOverlay
                      rect={imgRect}
                      crop={activeCrop}
                      imageWidth={activeItem.width}
                      imageHeight={activeItem.height}
                      ratio={ratio}
                      onChange={(next) => handleCropChange(next, false)}
                      onStart={pushHistory}
                    />
                  ) : null}
                  <span className="resizer-preview-tag">
                    {showResult && activeItem.result
                      ? `${formatPixels(activeItem.result.width)} × ${formatPixels(activeItem.result.height)} px`
                      : `${formatPixels(activeItem.width)} × ${formatPixels(activeItem.height)} px · edits preview`}
                  </span>
                    </>
                  )}
                </div>
              )}

              {compare === "split" && activeItem.result ? (
                <div className="resizer-slider-row resizer-split-control">
                  <label htmlFor="resizer-split">Comparison position</label>
                  <div className="range-row">
                    <input
                      id="resizer-split"
                      type="range"
                      min={0}
                      max={100}
                      value={split}
                      onChange={(event) => setSplit(Number(event.target.value))}
                    />
                    <output htmlFor="resizer-split">{split}%</output>
                  </div>
                </div>
              ) : null}

              <dl className="resizer-stats">
                <div>
                  <dt>Original</dt>
                  <dd>
                    {formatBytes(activeItem.file.size)} ·{" "}
                    {activeItem.file.type.replace("image/", "").toUpperCase()}
                  </dd>
                </div>
                <div>
                  <dt>Edited source</dt>
                  <dd>
                    {formatPixels(editedSizeFor(activeItem).width)} ×{" "}
                    {formatPixels(editedSizeFor(activeItem).height)} px
                    {hasEdits(activeItem.edits, activeItem.width, activeItem.height)
                      ? ` · ${describeEdits(activeItem.edits, activeItem.width, activeItem.height).join(", ")}`
                      : " · untouched"}
                  </dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>
                    {targetLabel} · {formatLabel(outputFormatFor(activeItem))} ·{" "}
                    {outputFormatFor(activeItem) === "image/png"
                      ? "lossless"
                      : `${outputQualityFor(activeItem)}% quality`}
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
                ) : (
                  <div>
                    <dt>Estimated size</dt>
                    <dd>≈ {formatBytes(estimate)} (estimate)</dd>
                  </div>
                )}
                <div>
                  <dt>Scale</dt>
                  <dd>
                    {scale}% of the edited width · {activePlan ? megapixels(activePlan.width, activePlan.height) : 0} MP
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
                  invalidate(() => setFormat(event.target.value as OutputFormat))
                }
              >
                {(Object.keys(FORMAT_NOTES) as OutputFormat[]).map((value) => (
                  <option key={value} value={value} disabled={!support[value]}>
                    {formatLabel(value)} · {FORMAT_NOTES[value]}
                    {support[value] ? "" : " (unsupported here)"}
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
            <div className="resizer-field">
              <label htmlFor="resizer-base-name">Rename outputs (optional)</label>
              <input
                id="resizer-base-name"
                type="text"
                placeholder="Keep original names"
                value={baseName}
                maxLength={60}
                onChange={(event) => invalidate(() => setBaseName(event.target.value))}
              />
            </div>
            <div className="resizer-field">
              <label htmlFor="resizer-suffix">Filename suffix (optional)</label>
              <input
                id="resizer-suffix"
                type="text"
                placeholder="e.g. web"
                value={suffix}
                maxLength={30}
                onChange={(event) => invalidate(() => setSuffix(event.target.value))}
              />
            </div>
          </div>
          <p id="resizer-quality-hint" className="help resizer-hint">
            {missingFormats.length
              ? `${missingFormats.map(formatLabel).join(", ")} encoding is unavailable in this browser, so those options are disabled. `
              : ""}
            WebP balances size and detail; JPEG is the most compatible; PNG is
            lossless; AVIF is smallest where supported. Estimated size ≈{" "}
            {formatBytes(estimate)} before processing.
          </p>

          <div className="resizer-warnings" role="note">
            {(activeItem ? outputFormatFor(activeItem) : format) === "image/jpeg" ? (
              <p>
                <AlertCircle size={13} aria-hidden="true" /> JPEG has no alpha
                channel — transparent pixels become {background.toUpperCase()}.
              </p>
            ) : null}
            {activeItem &&
            activeItem.file.type !== "image/png" &&
            outputFormatFor(activeItem) === "image/png" ? (
              <p>
                <Info size={13} aria-hidden="true" /> Converting a photo to PNG
                usually makes the file much larger.
              </p>
            ) : null}
            {activeItem && activePlan
              ? activePlan.width > editedSizeFor(activeItem).width ||
                activePlan.height > editedSizeFor(activeItem).height
                ? (
                  <p>
                    <AlertCircle size={13} aria-hidden="true" /> This output is
                    larger than the source, so it cannot add real detail.
                  </p>
                )
                : null
              : null}
          </div>

          <details className="resizer-details resizer-metadata">
            <summary>
              <ShieldCheck size={13} aria-hidden="true" /> Metadata &amp; privacy
            </summary>
            <div className="resizer-metadata-body">
              {metadata ? (
                <ul>
                  <li>
                    <strong>{metadata.format}</strong> ·{" "}
                    {metadata.hasExif
                      ? "EXIF metadata present"
                      : "No EXIF metadata found"}
                  </li>
                  <li>
                    GPS location:{" "}
                    <strong>{metadata.hasGps ? "present — removed" : "none"}</strong>
                  </li>
                  <li>
                    Camera: <strong>{metadata.camera ?? "not recorded"}</strong>
                  </li>
                  <li>
                    Captured: <strong>{metadata.captured ?? "not recorded"}</strong>
                  </li>
                  <li>
                    Colour profile / XMP:{" "}
                    <strong>
                      {[metadata.hasIcc ? "ICC" : "", metadata.hasXmp ? "XMP" : ""]
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
                Every download is re-encoded from pixels, so EXIF, GPS, XMP and
                colour profiles are stripped automatically. The original file on
                your device is never modified.
              </p>
              {activeItem ? (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={activeItem.edits.autoOrient}
                    onChange={(event) =>
                      applyEditsPatch({ autoOrient: event.target.checked })
                    }
                  />
                  Auto-rotate using EXIF orientation
                </label>
              ) : null}
            </div>
          </details>

          <ul className="resizer-tips">
            <li>JPEG output always gets a solid background behind transparency.</li>
            <li>Scaling up adds pixels, not detail — start from the largest source.</li>
            <li>Batch settings apply to every queued image; open an image row for per-image overrides.</li>
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
            ? `Processing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
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
          onClick={resetAll}
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
        <section className="resizer-queue" aria-labelledby="resizer-queue-title">
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
              const itemFormat = outputFormatFor(item);
              const expanded = expandedId === item.id;
              return (
                <li
                  key={item.id}
                  className={
                    isActive ? "resizer-item resizer-item-active" : "resizer-item"
                  }
                >
                  <div className="resizer-item-main">
                    <button
                      type="button"
                      className="resizer-thumb"
                      aria-pressed={isActive}
                      aria-label={`Preview ${item.file.name}`}
                      onClick={() => {
                        setSelectedId(item.id);
                        setPreviewMode(item.result ? "resized" : "original");
                        setCropTool(false);
                        if (lock && mode === "dimensions") {
                          const parsed = Number(width);
                          if (Number.isFinite(parsed) && parsed > 0) {
                            const size = editedSizeFor(item);
                            setHeight(
                              String(linkedHeight(parsed, size.width, size.height)),
                            );
                          }
                        }
                      }}
                    >
                      <img
                        src={item.originalUrl}
                        alt=""
                        style={{ filter: filterCss(item.edits) }}
                      />
                    </button>
                    <div className="resizer-item-body">
                      <strong title={item.file.name}>{item.file.name}</strong>
                      <span>
                        {formatPixels(item.width)} × {formatPixels(item.height)} px
                        {" → "}
                        {plan
                          ? `${formatPixels(plan.width)} × ${formatPixels(plan.height)} px`
                          : "check settings"}
                        {" · "}
                        {formatLabel(itemFormat)}
                        {item.override.enabled ? " · custom" : ""}
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
                          {hasEdits(item.edits, item.width, item.height)
                            ? " · edited"
                            : ""}
                        </span>
                      )}
                    </div>
                    <span className={`resizer-status resizer-status-${item.status}`}>
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
                      className="resizer-icon-button"
                      aria-expanded={expanded}
                      aria-controls={`resizer-extra-${item.id}`}
                      aria-label={`Custom settings for ${item.file.name}`}
                      title="Per-image settings"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                    >
                      <Settings2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="resizer-icon-button"
                      aria-label={`Replace ${item.file.name}`}
                      title="Replace this file"
                      disabled={busy}
                      onClick={() => {
                        replaceTarget.current = item.id;
                        replaceRef.current?.click();
                      }}
                    >
                      <Replace size={15} />
                    </button>
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
                  </div>

                  <div
                    id={`resizer-extra-${item.id}`}
                    className="resizer-item-extra"
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
                              width: item.override.width || item.width,
                              height: item.override.height || item.height,
                              quality: outputQualityFor(item),
                            },
                          });
                        }}
                      />
                      Custom size and format for this image
                    </label>
                    {item.override.enabled ? (
                      <div className="resizer-extra-grid">
                        <div className="resizer-field">
                          <label htmlFor={`ov-width-${item.id}`}>Custom width (px)</label>
                          <input
                            id={`ov-width-${item.id}`}
                            type="number"
                            min={1}
                            max={8192}
                            value={item.override.width}
                            onChange={(event) => {
                              const value = Math.round(Number(event.target.value) || 0);
                              clearResults();
                              updateItem(item.id, {
                                override: {
                                  ...item.override,
                                  width: value,
                                  height:
                                    item.override.lockAspect && value > 0
                                      ? linkedHeight(
                                          value,
                                          editedSizeFor(item).width,
                                          editedSizeFor(item).height,
                                        )
                                      : item.override.height,
                                },
                              });
                            }}
                          />
                        </div>
                        <div className="resizer-field">
                          <label htmlFor={`ov-height-${item.id}`}>Custom height (px)</label>
                          <input
                            id={`ov-height-${item.id}`}
                            type="number"
                            min={1}
                            max={8192}
                            value={item.override.height}
                            onChange={(event) => {
                              const value = Math.round(Number(event.target.value) || 0);
                              clearResults();
                              updateItem(item.id, {
                                override: {
                                  ...item.override,
                                  height: value,
                                  width:
                                    item.override.lockAspect && value > 0
                                      ? linkedWidth(
                                          value,
                                          editedSizeFor(item).width,
                                          editedSizeFor(item).height,
                                        )
                                      : item.override.width,
                                },
                              });
                            }}
                          />
                        </div>
                        <div className="resizer-field">
                          <label htmlFor={`ov-format-${item.id}`}>Format</label>
                          <select
                            id={`ov-format-${item.id}`}
                            value={item.override.format}
                            onChange={(event) => {
                              clearResults();
                              updateItem(item.id, {
                                override: {
                                  ...item.override,
                                  format: event.target.value as
                                    | OutputFormat
                                    | "auto",
                                },
                              });
                            }}
                          >
                            <option value="auto">
                              Same as batch ({formatLabel(format)})
                            </option>
                            {(Object.keys(FORMAT_NOTES) as OutputFormat[]).map(
                              (value) => (
                                <option key={value} value={value} disabled={!support[value]}>
                                  {formatLabel(value)}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                        <div className="resizer-field">
                          <label htmlFor={`ov-quality-${item.id}`}>Quality</label>
                          <div className="range-row">
                            <input
                              id={`ov-quality-${item.id}`}
                              type="range"
                              min={10}
                              max={100}
                              value={item.override.quality}
                              disabled={outputFormatFor(item) === "image/png"}
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
                              {item.override.quality}%
                            </output>
                          </div>
                        </div>
                        <div className="resizer-field">
                          <label htmlFor={`ov-name-${item.id}`}>Output name</label>
                          <input
                            id={`ov-name-${item.id}`}
                            type="text"
                            placeholder={item.file.name.replace(/\.[^.]+$/, "")}
                            value={item.override.name}
                            maxLength={60}
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
                        <div className="resizer-field">
                          <label htmlFor={`ov-suffix-${item.id}`}>Suffix for this image</label>
                          <input
                            id={`ov-suffix-${item.id}`}
                            type="text"
                            placeholder="e.g. small"
                            value={item.override.suffix}
                            maxLength={30}
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
                        <label className="check-label resizer-extra-lock">
                          <input
                            type="checkbox"
                            checked={item.override.lockAspect}
                            onChange={(event) =>
                              updateItem(item.id, {
                                override: {
                                  ...item.override,
                                  lockAspect: event.target.checked,
                                },
                              })
                            }
                          />
                          Keep this image&apos;s aspect ratio
                        </label>
                        <button
                          type="button"
                          className="resizer-chip"
                          onClick={() => {
                            const size = editedSizeFor(item);
                            clearResults();
                            updateItem(item.id, {
                              override: {
                                ...item.override,
                                width: size.width,
                                height: size.height,
                              },
                            });
                          }}
                        >
                          Match edited size
                        </button>
                      </div>
                    ) : null}
                    <div className="resizer-extra-foot">
                      <button
                        type="button"
                        className="resizer-chip"
                        onClick={() => {
                          const size = editedSizeFor(item);
                          clearResults();
                          updateItem(item.id, {
                            override: {
                              ...item.override,
                              width: item.width,
                              height: item.height,
                              name: "",
                              suffix: "",
                              format: "auto",
                              quality,
                            },
                          });
                          setNotice(
                            `Custom settings reset for ${item.file.name} (${size.width} × ${size.height} px).`,
                          );
                        }}
                      >
                        Reset this image&apos;s settings
                      </button>
                      <span className="resizer-muted">
                        Output name:{" "}
                        {plan
                          ? outputNameFor(item, plan)
                          : "choose a valid target size"}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
          ? `Processing image ${Math.min(progress.done + 1, progress.total)} of ${progress.total}.`
          : notice}
      </p>
    </fieldset>
  );
}
