"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  CircleStop,
  Columns2,
  Crop,
  Download,
  FileArchive,
  FlipHorizontal2,
  FlipVertical2,
  ImageIcon,
  Info,
  Maximize,
  Redo2,
  RotateCcw,
  RotateCw,
  Scan,
  Settings2,
  ShieldCheck,
  Square,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { formatBytes } from "@/lib/tools/image";
import type { MetadataReport } from "@/lib/tools/exif";
import { createZip } from "@/lib/tools/zip";
import {
  CROP_FORMATS,
  CROP_RATIOS,
  CROP_SHAPES,
  MAX_BATCH_FILES,
  MAX_BATCH_PIXELS,
  MIN_CUSTOM_SIDE,
  ZOOM_MAX,
  ZOOM_MIN,
  applyCustomSize,
  applyPreset,
  applyRatio,
  applyShape,
  buildOutputName,
  canRedo,
  canUndo,
  clampSettings,
  clampZoom,
  commitHistory,
  createHistory,
  cropOutputName,
  defaultSettings,
  describeSettings,
  estimatedCropBytes,
  flipSettings,
  formatLabel,
  groupedPresets,
  keepsTransparency,
  orientedSize,
  outputPlan,
  presetFor,
  ratioOption,
  redoHistory,
  resetGeometry,
  resizeCropByHandle,
  resolutionNote,
  rotateSettings,
  stepZoom,
  undoHistory,
  uniqueName,
  validateCropSettings,
  validateOutputSize,
  visibleCrop,
  type CropFormat,
  type CropHandle,
  type CropRect,
  type CropSettings,
  type CropShape,
  type History,
} from "@/lib/tools/image-crop";
import {
  cropFormatSupport,
  cropImageFile,
  decodeCropSource,
  inspectCropFile,
  renderCropPreview,
} from "@/lib/tools/image-crop-runner";

type Status = "ready" | "working" | "done" | "error";

type Result = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  filename: string;
};

type Item = {
  id: string;
  file: File;
  originalUrl: string;
  /** Displayed (EXIF-oriented) dimensions. */
  width: number;
  height: number;
  headerWidth: number;
  headerHeight: number;
  orientation: number | null;
  metadata: MetadataReport;
  status: Status;
  error?: string;
  history: History<CropSettings>;
  zoom: number;
  result?: Result;
};

type ViewMode = "crop" | "original" | "cropped" | "compare";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "crop", label: "Crop" },
  { id: "original", label: "Original" },
  { id: "cropped", label: "Cropped" },
  { id: "compare", label: "Compare" },
];

const SIZE_MODES: { id: CropSettings["sizeMode"]; label: string }[] = [
  { id: "natural", label: "Crop pixels" },
  { id: "scale", label: "Scale %" },
  { id: "custom", label: "Custom px" },
  { id: "preset", label: "Preset" },
];

const QUALITY_STEPS = [60, 80, 90, 100] as const;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";

let sequence = 0;
const nextId = () => `cropper-${Date.now()}-${sequence++}`;

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

function orientationNote(orientation: number | null) {
  if (!orientation || orientation === 1) return "";
  const turns: Record<number, string> = {
    2: "mirrored horizontally",
    3: "rotated 180°",
    4: "mirrored vertically",
    5: "transposed",
    6: "rotated 90° clockwise",
    7: "transversed",
    8: "rotated 90° counter-clockwise",
  };
  return `EXIF orientation ${orientation} — ${turns[orientation] ?? "adjusted"} and auto-corrected on decode.`;
}

function resolutionNoteSummary(settings: CropSettings, item: Item | null) {
  if (!item) return "";
  try {
    const plan = outputPlan(settings, item.width, item.height);
    const frame = orientedSize(item.width, item.height, settings.rotation);
    if (
      plan.width === settings.rect.width &&
      plan.height === settings.rect.height
    )
      return `1:1 · no resampling`;
    if (plan.width * plan.height < settings.rect.width * settings.rect.height)
      return "Downscaled";
    return `Upscaled from ${frame.width} × ${frame.height}`;
  } catch {
    return "";
  }
}

function metadataLines(metadata: MetadataReport) {
  const lines = [
    metadata.hasExif
      ? "EXIF present — removed from every export"
      : "No EXIF block found",
    metadata.hasGps
      ? "GPS location present — stripped from exports"
      : "No GPS location found",
    metadata.hasIcc
      ? "ICC colour profile found — not copied"
      : "No ICC profile",
    metadata.hasXmp ? "XMP metadata found — stripped" : "No XMP metadata",
  ];
  if (metadata.camera) lines.push(`Camera: ${metadata.camera}`);
  if (metadata.captured) lines.push(`Captured: ${metadata.captured}`);
  return lines;
}

export default function ImageCropper() {
  const ready = useHydrated();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("crop");
  const [compareMode, setCompareMode] = useState<"split" | "side">("split");
  const [split, setSplit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [issues, setIssues] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileDragging, setFileDragging] = useState(false);
  const [stageBox, setStageBox] = useState({ width: 760, height: 380 });
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(
    null,
  );
  const [sourceReady, setSourceReady] = useState("");
  const [customWidth, setCustomWidth] = useState("1080");
  const [customHeight, setCustomHeight] = useState("1080");
  const [customError, setCustomError] = useState("");
  const [thirds, setThirds] = useState(true);

  const itemsRef = useRef<Item[]>([]);
  const urlsRef = useRef<Map<string, string>>(new Map());
  const runRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    handle: CropHandle;
    startX: number;
    startY: number;
    crop: CropRect;
    history: History<CropSettings>;
    settings: CropSettings;
    moved: boolean;
  } | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const sourceRef = useRef<{
    id: string;
    source: CanvasImageSource;
    width: number;
    height: number;
    release: () => void;
  } | null>(null);

  const commitItems = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const activeItem =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const settings = activeItem?.history.present ?? null;
  const oriented = activeItem
    ? orientedSize(activeItem.width, activeItem.height, settings?.rotation ?? 0)
    : { width: 1, height: 1 };
  const doneItems = items.filter((item) => item.result);
  const failedItems = items.filter((item) => item.status === "error");

  const support = useMemo<Record<CropFormat, boolean>>(
    () =>
      ready
        ? cropFormatSupport()
        : { "image/jpeg": true, "image/png": true, "image/webp": true },
    [ready],
  );

  const allDoneBytes = doneItems.reduce(
    (sum, item) => sum + (item.result?.blob.size ?? 0),
    0,
  );

  const plan = useMemo(() => {
    if (!activeItem || !settings) return null;
    try {
      return outputPlan(settings, activeItem.width, activeItem.height);
    } catch {
      return null;
    }
  }, [activeItem, settings]);

  const planError = useMemo(() => {
    if (!activeItem || !settings) return "";
    try {
      validateCropSettings(settings, activeItem.width, activeItem.height);
      return "";
    } catch (error) {
      return errorMessage(error);
    }
  }, [activeItem, settings]);

  const activeName =
    activeItem && settings && plan
      ? cropOutputName(activeItem.file.name, settings, plan)
      : "";

  const estimate = useMemo(() => {
    if (!activeItem || !settings) return 0;
    try {
      return estimatedCropBytes(settings, activeItem.width, activeItem.height);
    } catch {
      return 0;
    }
  }, [activeItem, settings]);

  /* -------------------------------- history -------------------------------- */

  /**
   * Any edit invalidates an earlier export: its pixels no longer match the
   * frame, so the stale download is revoked instead of being offered.
   */
  const withoutResult = useCallback((item: Item): Item => {
    if (!item.result) return item;
    const url = urlsRef.current.get(`${item.id}:result`);
    if (url) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(`${item.id}:result`);
    }
    return { ...item, result: undefined, status: "ready", error: undefined };
  }, []);

  const setSettings = useCallback(
    (id: string, next: CropSettings, record: boolean) => {
      commitItems(
        itemsRef.current.map((item) => {
          if (item.id !== id) return item;
          const updated = record
            ? { ...item, history: commitHistory(item.history, next) }
            : { ...item, history: { ...item.history, present: next } };
          return withoutResult(updated);
        }),
      );
    },
    [commitItems, withoutResult],
  );

  const updateActive = (next: CropSettings, record = true) => {
    if (!activeItem) return;
    setSettings(activeItem.id, next, record);
    setNotice("");
  };

  const undo = () => {
    if (!activeItem) return;
    if (!canUndo(activeItem.history)) return;
    commitItems(
      itemsRef.current.map((item) =>
        item.id === activeItem.id
          ? withoutResult({ ...item, history: undoHistory(item.history) })
          : item,
      ),
    );
    setNotice("Undone.");
  };

  const redo = () => {
    if (!activeItem) return;
    if (!canRedo(activeItem.history)) return;
    commitItems(
      itemsRef.current.map((item) =>
        item.id === activeItem.id
          ? withoutResult({ ...item, history: redoHistory(item.history) })
          : item,
      ),
    );
    setNotice("Redone.");
  };

  const resetCrop = () => {
    if (!activeItem) return;
    updateActive(resetGeometry(settings!, activeItem.width, activeItem.height));
    setNotice(
      "Crop, rotation and flips reset. Format, quality and names were kept.",
    );
  };

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      sourceRef.current?.release();
      sourceRef.current = null;
    };
  }, []);

  /* --------------------------------- upload -------------------------------- */

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    setNotice("");
    setIssues([]);
    const problems: string[] = [];
    const fresh: Item[] = [];
    const room = MAX_BATCH_FILES - itemsRef.current.length;
    if (room <= 0) {
      setIssues([
        `You can crop up to ${MAX_BATCH_FILES} images at once. Remove one to add another.`,
      ]);
      return;
    }
    if (files.length > room)
      problems.push(
        `Only ${room} more image${room === 1 ? "" : "s"} could be added — the batch limit is ${MAX_BATCH_FILES}.`,
      );

    const seed = activeItem?.history.present;
    for (const file of files.slice(0, room)) {
      try {
        const info = await inspectCropFile(file);
        const pixels =
          itemsRef.current.reduce(
            (sum, item) => sum + item.width * item.height,
            0,
          ) +
          fresh.reduce((sum, item) => sum + item.width * item.height, 0) +
          info.width * info.height;
        if (pixels > MAX_BATCH_PIXELS)
          throw new Error(
            "This batch would exceed the 200 megapixel workspace budget. Remove an image or add smaller ones.",
          );
        const id = nextId();
        const originalUrl = URL.createObjectURL(file);
        urlsRef.current.set(`${id}:original`, originalUrl);
        const base = defaultSettings(info.width, info.height);
        const settingsForFile: CropSettings = seed
          ? {
              ...base,
              format: seed.format,
              quality: seed.quality,
              background: seed.background,
              suffix: seed.suffix,
              baseName: "",
              sizeMode:
                seed.sizeMode === "custom" || seed.sizeMode === "preset"
                  ? "natural"
                  : seed.sizeMode,
              scale: seed.scale,
            }
          : base;
        fresh.push({
          id,
          file,
          originalUrl,
          width: info.width,
          height: info.height,
          headerWidth: info.headerWidth,
          headerHeight: info.headerHeight,
          orientation: info.orientation,
          metadata: info.metadata,
          status: "ready",
          history: createHistory(settingsForFile),
          zoom: 100,
        });
      } catch (error) {
        problems.push(`${file.name}: ${errorMessage(error)}`);
      }
    }

    if (fresh.length) {
      commitItems([...itemsRef.current, ...fresh]);
      if (!itemsRef.current.length) setSelectedId(fresh[0].id);
      setNotice(
        `${fresh.length} image${fresh.length === 1 ? "" : "s"} added and decoded on this device. Drag the crop, then choose an output size.`,
      );
    }
    setIssues(problems);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(id: string) {
    for (const key of [`${id}:original`, `${id}:result`]) {
      const url = urlsRef.current.get(key);
      if (url) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(key);
      }
    }
    if (sourceRef.current?.id === id) {
      sourceRef.current.release();
      sourceRef.current = null;
      setSourceReady("");
    }
    const next = itemsRef.current.filter((item) => item.id !== id);
    commitItems(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    setIssues([]);
    if (!next.length) {
      setNotice("");
      setPreview(null);
    }
  }

  /* -------------------------------- preview -------------------------------- */

  useEffect(() => {
    if (!activeItem) return;
    if (sourceRef.current?.id === activeItem.id) return;
    let cancelled = false;
    const previous = sourceRef.current;
    previous?.release();
    sourceRef.current = null;
    setPreview(null);
    decodeCropSource(activeItem.file, true)
      .then((decoded) => {
        if (cancelled) {
          decoded.release();
          return;
        }
        sourceRef.current = { id: activeItem.id, ...decoded };
        setSourceReady(activeItem.id);
      })
      .catch(() => setSourceReady(""));
    return () => {
      cancelled = true;
    };
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem || !settings) return;
    const source = sourceRef.current;
    if (!source || source.id !== activeItem.id) return;
    const handle = window.setTimeout(() => {
      try {
        const canvas = renderCropPreview(
          source.source,
          source.width,
          source.height,
          settings,
          900,
        );
        const url = canvas.toDataURL("image/webp", 0.9);
        canvas.width = 0;
        canvas.height = 0;
        setPreview({ id: activeItem.id, url });
      } catch {
        setPreview(null);
      }
    }, 110);
    return () => window.clearTimeout(handle);
  }, [activeItem, settings, sourceReady]);

  /* --------------------------------- stage --------------------------------- */

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () =>
      setStageBox((previous) => {
        const next = {
          width: stage.clientWidth || previous.width,
          height: stage.clientHeight || previous.height,
        };
        return Math.abs(previous.width - next.width) < 1 &&
          Math.abs(previous.height - next.height) < 1
          ? previous
          : next;
      });
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeItem?.id, view]);

  const display = useMemo(() => {
    if (!activeItem)
      return { width: 0, height: 0, scale: 1, imageWidth: 0, imageHeight: 0 };
    const pad = 22;
    const fit = Math.min(
      (stageBox.width - pad) / oriented.width,
      (stageBox.height - pad) / oriented.height,
    );
    const safeFit = Number.isFinite(fit) && fit > 0 ? fit : 1;
    const zoom = (activeItem.zoom || 100) / 100;
    const width = Math.max(24, oriented.width * safeFit * zoom);
    const height = Math.max(24, oriented.height * safeFit * zoom);
    return {
      width,
      height,
      scale: width / oriented.width,
      imageWidth: width * (activeItem.width / oriented.width),
      imageHeight: height * (activeItem.height / oriented.height),
    };
  }, [activeItem, oriented.width, oriented.height, stageBox]);

  const stagePad = {
    width: Math.max(stageBox.width, display.width + 24),
    height: Math.max(stageBox.height, display.height + 24),
  };
  const originX = (stagePad.width - display.width) / 2;
  const originY = (stagePad.height - display.height) / 2;

  const cropBox = settings
    ? {
        left: (settings.rect.x / oriented.width) * display.width,
        top: (settings.rect.y / oriented.height) * display.height,
        width: (settings.rect.width / oriented.width) * display.width,
        height: (settings.rect.height / oriented.height) * display.height,
      }
    : { left: 0, top: 0, width: 0, height: 0 };

  const ratio =
    settings?.shape === "circle" || settings?.shape === "square"
      ? 1
      : (ratioOption(settings?.ratioId ?? "free")?.ratio ?? null);

  function changeZoom(next: number) {
    if (!activeItem) return;
    commitItems(
      itemsRef.current.map((item) =>
        item.id === activeItem.id ? { ...item, zoom: clampZoom(next) } : item,
      ),
    );
  }

  function fitStage() {
    changeZoom(100);
    const stage = stageRef.current;
    if (stage)
      window.requestAnimationFrame(() => {
        stage.scrollLeft = 0;
        stage.scrollTop = 0;
      });
    setNotice("Stage reset to fit.");
  }

  function cropToVisible() {
    if (!activeItem || !settings) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = visibleCrop(
      {
        scrollLeft: stage.scrollLeft - originX,
        scrollTop: stage.scrollTop - originY,
        clientWidth: stage.clientWidth,
        clientHeight: stage.clientHeight,
      },
      display.scale,
      oriented.width,
      oriented.height,
    );
    const next: CropSettings = {
      ...settings,
      rect,
      ratioId: "free",
      shape: settings.shape === "circle" ? "rect" : settings.shape,
    };
    updateActive(clampSettings(next, activeItem.width, activeItem.height));
    setNotice(
      `Crop set to the visible area: ${rect.width} × ${rect.height} px at ${activeItem.zoom}% zoom.`,
    );
  }

  /* ---------------------------------- drag --------------------------------- */

  function startDrag(
    event: React.PointerEvent,
    handle: CropHandle,
    item: Item,
  ) {
    if (event.button !== 0) return;
    const current = item.history.present;
    cleanupDrag();
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = {
      id: item.id,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      crop: current.rect,
      history: item.history,
      settings: current,
      moved: false,
    };
    setDragging(true);
  }

  function cleanupDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved) return;
    const item = itemsRef.current.find((entry) => entry.id === drag.id);
    if (!item) return;
    const present = item.history.present;
    if (JSON.stringify(present) === JSON.stringify(drag.history.present))
      return;
    commitItems(
      itemsRef.current.map((entry) =>
        entry.id === drag.id
          ? {
              ...entry,
              history: {
                past: [...drag.history.past, drag.history.present].slice(-50),
                present,
                future: [],
              },
            }
          : entry,
      ),
    );
  }

  function moveDrag(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    if (!event.buttons) {
      cleanupDrag();
      return;
    }
    const item = itemsRef.current.find((entry) => entry.id === drag.id);
    if (!item) return;
    const frame = orientedSize(item.width, item.height, drag.settings.rotation);
    const dx = (event.clientX - drag.startX) / display.scale;
    const dy = (event.clientY - drag.startY) / display.scale;
    if (!dx && !dy) return;
    const rect = resizeCropByHandle(
      drag.crop,
      drag.handle,
      dx,
      dy,
      frame.width,
      frame.height,
      drag.settings.shape === "circle" || drag.settings.shape === "square"
        ? 1
        : (ratioOption(drag.settings.ratioId)?.ratio ?? null),
    );
    drag.moved = true;
    setSettings(drag.id, { ...item.history.present, rect }, false);
  }

  function nudge(handle: CropHandle, dx: number, dy: number) {
    if (!activeItem || !settings) return;
    const rect = resizeCropByHandle(
      settings.rect,
      handle,
      dx,
      dy,
      oriented.width,
      oriented.height,
      ratio,
    );
    updateActive({ ...settings, rect });
  }

  function startPan(event: React.PointerEvent) {
    if (event.button !== 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    if ((event.target as HTMLElement).closest(".cropper-crop-box")) return;
    if (
      display.width <= stage.clientWidth &&
      display.height <= stage.clientHeight
    )
      return;
    event.preventDefault();
    stage.setPointerCapture?.(event.pointerId);
    panRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: stage.scrollLeft,
      top: stage.scrollTop,
    };
    setDragging(true);
  }

  function movePan(event: React.PointerEvent) {
    const pan = panRef.current;
    const stage = stageRef.current;
    if (!pan || !stage) return;
    stage.scrollLeft = pan.left - (event.clientX - pan.x);
    stage.scrollTop = pan.top - (event.clientY - pan.y);
  }

  function endPan(event: React.PointerEvent) {
    const stage = stageRef.current;
    panRef.current = null;
    stage?.releasePointerCapture?.(event.pointerId);
    setDragging(false);
  }

  /* -------------------------------- actions -------------------------------- */

  function selectRatio(id: string) {
    if (!activeItem || !settings) return;
    const preset = presetFor(id);
    const next = preset
      ? applyPreset(settings, activeItem.width, activeItem.height, id)
      : applyRatio(settings, activeItem.width, activeItem.height, id);
    updateActive(next);
    setCustomError("");
    if (preset)
      setNotice(
        `${preset.label}: ${preset.width} × ${preset.height} export. Move the crop to choose the framing.`,
      );
  }

  function selectShape(shape: CropShape) {
    if (!activeItem || !settings) return;
    updateActive(
      applyShape(settings, activeItem.width, activeItem.height, shape),
    );
    setNotice(
      shape === "circle"
        ? "Circle crop: PNG and WebP keep transparent corners; JPEG fills them with the background colour."
        : shape === "square"
          ? "Square crop: 1:1 with sharp corners."
          : "Rectangle crop: any aspect ratio.",
    );
  }

  function rotate(delta: 90 | -90 | 180) {
    if (!activeItem || !settings) return;
    updateActive(
      rotateSettings(settings, activeItem.width, activeItem.height, delta),
    );
    setNotice(
      `Rotated ${delta === 180 ? "180°" : delta === 90 ? "90° right" : "90° left"}.`,
    );
  }

  function flip(axis: "h" | "v") {
    if (!activeItem || !settings) return;
    updateActive(
      flipSettings(settings, activeItem.width, activeItem.height, axis),
    );
    setNotice(`Flipped ${axis === "h" ? "horizontally" : "vertically"}.`);
  }

  function changeFormat(format: CropFormat) {
    if (!settings || !support[format]) return;
    updateActive({ ...settings, format });
  }

  function changeQuality(value: number) {
    if (!settings) return;
    const quality = Math.min(100, Math.max(10, Math.round(value) || 10));
    updateActive({ ...settings, quality }, false);
  }

  function changeSizeMode(mode: CropSettings["sizeMode"]) {
    if (!activeItem || !settings) return;
    if (mode === "preset" && !presetFor(settings.ratioId)) {
      setIssues([
        "Choose a social preset first — then Preset size becomes available.",
      ]);
      return;
    }
    const next: CropSettings = { ...settings, sizeMode: mode };
    if (mode === "custom") {
      const currentPlan = outputPlan(
        settings,
        activeItem.width,
        activeItem.height,
      );
      next.width =
        settings.sizeMode === "custom" ? settings.width : currentPlan.width;
      next.height =
        settings.sizeMode === "custom" ? settings.height : currentPlan.height;
      setCustomWidth(String(next.width));
      setCustomHeight(String(next.height));
    }
    updateActive(next);
  }

  function applyCustom() {
    if (!activeItem || !settings) return;
    try {
      const width = Number(customWidth);
      const height = Number(customHeight);
      const size = validateOutputSize(width, height);
      updateActive(
        applyCustomSize(
          settings,
          activeItem.width,
          activeItem.height,
          size.width,
          size.height,
        ),
      );
      setCustomError("");
      setNotice(
        `Custom output: ${size.width} × ${size.height} px with a matching crop ratio.`,
      );
    } catch (error) {
      setCustomError(errorMessage(error));
    }
  }

  function applyRatioToAll() {
    if (!activeItem || !settings) return;
    commitItems(
      itemsRef.current.map((item) => {
        if (item.id === activeItem.id) return item;
        let next = applyRatio(
          item.history.present,
          item.width,
          item.height,
          settings.ratioId,
        );
        if (settings.shape !== "rect")
          next = applyShape(next, item.width, item.height, settings.shape);
        return withoutResult({
          ...item,
          history: commitHistory(item.history, next),
        });
      }),
    );
    setNotice(
      `Applied ${ratioOption(settings.ratioId)?.label ?? "custom"} framing${settings.shape !== "rect" ? ` and ${settings.shape} shape` : ""} to all ${items.length} images.`,
    );
  }

  function applyExportToAll() {
    if (!settings) return;
    commitItems(
      itemsRef.current.map((item) => {
        const current = item.history.present;
        const next: CropSettings = {
          ...current,
          format: settings.format,
          quality: settings.quality,
          background: settings.background,
          sizeMode:
            settings.sizeMode === "preset"
              ? "preset"
              : current.sizeMode === "preset"
                ? "natural"
                : settings.sizeMode,
          scale: settings.scale,
          width: settings.width,
          height: settings.height,
          ratioId:
            settings.sizeMode === "preset" ? settings.ratioId : current.ratioId,
        };
        return withoutResult({
          ...item,
          history: commitHistory(item.history, next),
        });
      }),
    );
    setNotice(
      `Applied ${formatLabel(settings.format)} · quality ${settings.quality}% · ${SIZE_MODES.find((mode) => mode.id === settings.sizeMode)?.label} to all images.`,
    );
  }

  /* -------------------------------- cropping ------------------------------- */

  async function cropAll(onlyFailed = false) {
    const queue = onlyFailed
      ? itemsRef.current.filter((item) => item.status === "error")
      : itemsRef.current;
    if (!queue.length) {
      setIssues([
        onlyFailed
          ? "There are no failed images to retry."
          : "Add at least one image before cropping.",
      ]);
      setNotice("");
      return;
    }
    for (const item of queue) {
      try {
        validateCropSettings(item.history.present, item.width, item.height);
      } catch (error) {
        setIssues([`${item.file.name}: ${errorMessage(error)}`]);
        setNotice("");
        return;
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
      commitItems(
        itemsRef.current.map((item) =>
          item.id === current.id
            ? { ...item, status: "working", error: undefined }
            : item,
        ),
      );
      try {
        const settingsForItem = current.history.present;
        const output = await cropImageFile(
          current.file,
          settingsForItem,
          () => run !== runRef.current,
        );
        if (run !== runRef.current) return;
        const url = URL.createObjectURL(output.blob);
        const previous = urlsRef.current.get(`${current.id}:result`);
        if (previous) URL.revokeObjectURL(previous);
        urlsRef.current.set(`${current.id}:result`, url);
        const filename = cropOutputName(current.file.name, settingsForItem, {
          width: output.width,
          height: output.height,
        });
        commitItems(
          itemsRef.current.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  status: "done",
                  error: undefined,
                  result: {
                    blob: output.blob,
                    url,
                    width: output.width,
                    height: output.height,
                    filename,
                  },
                }
              : item,
          ),
        );
        completed += 1;
      } catch (error) {
        if (run !== runRef.current) return;
        failures += 1;
        commitItems(
          itemsRef.current.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  status: "error",
                  error: errorMessage(error),
                  result: undefined,
                }
              : item,
          ),
        );
      }
      setProgress({ done: index + 1, total: queue.length });
    }

    if (run !== runRef.current) return;
    setBusy(false);
    if (completed && !failures)
      setNotice(
        `${completed} image${completed === 1 ? "" : "s"} cropped locally. Download ${completed === 1 ? "it" : "them"} individually or as a ZIP.`,
      );
    else if (completed && failures)
      setNotice(
        `${completed} cropped successfully. ${failures} failed — check the message in the queue.`,
      );
    else if (failures)
      setIssues([
        "None of the images could be cropped. Review the queue messages.",
      ]);
  }

  function stopRun() {
    if (!busy) return;
    runRef.current += 1;
    setBusy(false);
    setProgress({ done: 0, total: 0 });
    commitItems(
      itemsRef.current.map((item) =>
        item.status === "working"
          ? { ...item, status: item.result ? "done" : "ready" }
          : item,
      ),
    );
    const finished = itemsRef.current.filter((item) => item.result).length;
    setNotice(
      finished
        ? `Stopped. ${finished} finished image${finished === 1 ? "" : "s"} kept — download ${finished === 1 ? "it" : "them"} or start again.`
        : "Stopped before any image finished. Your queue and crops are unchanged.",
    );
  }

  function downloadItem(item: Item) {
    if (!item.result) return;
    downloadBlob(item.result.blob, item.result.filename);
    setNotice(`${item.result.filename} downloaded.`);
  }

  async function downloadZip() {
    const finished = itemsRef.current.filter((item) => item.result);
    if (!finished.length) {
      setIssues(["Crop at least one image before downloading a ZIP archive."]);
      return;
    }
    setZipBusy(true);
    setIssues([]);
    try {
      const used = new Set<string>();
      const payloads = await Promise.all(
        finished.map(async (item) => ({
          name: uniqueName(item.result!.filename, used),
          data: new Uint8Array(await item.result!.blob.arrayBuffer()),
        })),
      );
      const bytes = createZip(payloads);
      downloadBlob(
        new Blob([bytes], { type: "application/zip" }),
        "quickkit-cropped-images.zip",
      );
      setNotice(
        `${payloads.length} cropped image${payloads.length === 1 ? "" : "s"} downloaded as a ZIP archive.`,
      );
    } catch (error) {
      setIssues([errorMessage(error)]);
    } finally {
      setZipBusy(false);
    }
  }

  function clearAll() {
    runRef.current += 1;
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    sourceRef.current?.release();
    sourceRef.current = null;
    setSourceReady("");
    commitItems([]);
    setSelectedId(null);
    setView("crop");
    setCompareMode("split");
    setSplit(50);
    setIssues([]);
    setNotice("");
    setBusy(false);
    setZipBusy(false);
    setProgress({ done: 0, total: 0 });
    setPreview(null);
    setCustomError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  /* --------------------------------- output -------------------------------- */

  const cropShapeBox = settings?.shape === "circle" ? "50%" : "0";
  const displayedPreview =
    preview && activeItem && preview.id === activeItem.id ? preview.url : "";
  const firstSource = activeItem?.originalUrl ?? "";
  const orientationLabel = orientationNote(activeItem?.orientation ?? null);

  if (!ready)
    return (
      <div className="cropper-workspace">
        <div className="cropper-loading" aria-hidden="true">
          Preparing the cropper…
        </div>
      </div>
    );

  return (
    <div className="cropper-workspace">
      <label
        className={`cropper-drop${fileDragging ? " cropper-drop-active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setFileDragging(true);
        }}
        onDragLeave={() => setFileDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setFileDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
      >
        <span className="cropper-drop-icon">
          <Upload size={24} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="cropper-drop-copy">
          <strong>Drop images to crop, or choose them</strong>
          <span>
            JPEG, PNG or WebP · up to {MAX_BATCH_FILES} images · 15 MB and 24 MP
            each · decoded and cropped on this device only
          </span>
        </span>
        <span className="cropper-drop-action">Choose images</span>
        <input
          ref={inputRef}
          className="cropper-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Add images"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
          }}
        />
      </label>

      {issues.length > 0 && (
        <div className="cropper-alert" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      {notice && (
        <p className="cropper-notice" role="status">
          <CheckCircle2 size={15} aria-hidden="true" /> {notice}
        </p>
      )}

      {!items.length ? (
        <div className="cropper-empty">
          <div className="cropper-empty-icon">
            <Crop size={26} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h2>Nothing to crop yet</h2>
          <p>
            Add a photo and the workspace appears: drag the frame, pick a social
            preset, zoom in for precision, rotate or flip, then export JPEG, PNG
            or WebP at the exact size you need. Batch several images and each
            one keeps its own crop.
          </p>
          <ul className="cropper-empty-list">
            <li>
              <Check size={14} aria-hidden="true" /> Freeform or locked aspect
              ratios
            </li>
            <li>
              <Check size={14} aria-hidden="true" /> Circle and square crops
              with real transparency
            </li>
            <li>
              <Check size={14} aria-hidden="true" /> EXIF orientation handled
              automatically
            </li>
            <li>
              <Check size={14} aria-hidden="true" /> Undo, redo and per-image
              reset
            </li>
          </ul>
        </div>
      ) : (
        <>
          <div className="cropper-grid">
            <section
              className="cropper-panel"
              aria-labelledby="cropper-settings-title"
            >
              <header className="cropper-panel-head">
                <h3 id="cropper-settings-title">
                  <Settings2 size={16} aria-hidden="true" /> Crop settings
                </h3>
                <span className="cropper-summary" title={activeItem?.file.name}>
                  {activeItem?.width} × {activeItem?.height} px source
                </span>
              </header>

              <div className="cropper-history">
                <button
                  type="button"
                  className="cropper-chip cropper-icon-chip"
                  onClick={undo}
                  disabled={!activeItem || !canUndo(activeItem.history)}
                  aria-label="Undo last crop change"
                >
                  <Undo2 size={14} aria-hidden="true" /> Undo
                </button>
                <button
                  type="button"
                  className="cropper-chip cropper-icon-chip"
                  onClick={redo}
                  disabled={!activeItem || !canRedo(activeItem.history)}
                  aria-label="Redo crop change"
                >
                  <Redo2 size={14} aria-hidden="true" /> Redo
                </button>
                <button
                  type="button"
                  className="cropper-chip cropper-icon-chip"
                  onClick={resetCrop}
                  aria-label="Reset crop, rotation and flips"
                >
                  <RotateCcw size={14} aria-hidden="true" /> Reset
                </button>
                <span className="cropper-history-count">
                  {activeItem
                    ? `${activeItem.history.past.length} edit${activeItem.history.past.length === 1 ? "" : "s"} · ${activeItem.history.future.length} to redo`
                    : ""}
                </span>
              </div>

              <div className="cropper-section">
                <h4>
                  <Crop size={14} aria-hidden="true" /> Aspect ratio
                </h4>
                <div
                  className="cropper-chips"
                  role="group"
                  aria-label="Aspect ratio"
                >
                  {CROP_RATIOS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`cropper-chip${
                        settings?.ratioId === option.id
                          ? " cropper-chip-active"
                          : ""
                      }`}
                      aria-pressed={settings?.ratioId === option.id}
                      title={option.note}
                      onClick={() => selectRatio(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="cropper-field">
                  <label htmlFor="cropper-preset">Social preset</label>
                  <select
                    id="cropper-preset"
                    value={
                      presetFor(settings?.ratioId ?? "")
                        ? settings!.ratioId
                        : ""
                    }
                    onChange={(event) => {
                      if (event.target.value) selectRatio(event.target.value);
                    }}
                  >
                    <option value="">Choose a platform size…</option>
                    {groupedPresets().map((group) => (
                      <optgroup key={group.platform} label={group.platform}>
                        {group.presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label} — {preset.presetWidth} ×{" "}
                            {preset.presetHeight}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="cropper-inline-fields">
                  <div className="cropper-field">
                    <label htmlFor="cropper-custom-width">Width px</label>
                    <input
                      id="cropper-custom-width"
                      type="number"
                      min={MIN_CUSTOM_SIDE}
                      max={8192}
                      inputMode="numeric"
                      value={customWidth}
                      onChange={(event) => setCustomWidth(event.target.value)}
                    />
                  </div>
                  <div className="cropper-field">
                    <label htmlFor="cropper-custom-height">Height px</label>
                    <input
                      id="cropper-custom-height"
                      type="number"
                      min={MIN_CUSTOM_SIDE}
                      max={8192}
                      inputMode="numeric"
                      value={customHeight}
                      onChange={(event) => setCustomHeight(event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="cropper-chip cropper-apply-size"
                    onClick={applyCustom}
                  >
                    Set custom size
                  </button>
                </div>
                {customError && (
                  <p className="cropper-field-error" role="alert">
                    {customError}
                  </p>
                )}
              </div>

              <div className="cropper-section">
                <h4>
                  <Circle size={14} aria-hidden="true" /> Shape
                </h4>
                <div
                  className="cropper-chips"
                  role="group"
                  aria-label="Crop shape"
                >
                  {CROP_SHAPES.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      className={`cropper-chip${
                        settings?.shape === shape.id
                          ? " cropper-chip-active"
                          : ""
                      }`}
                      aria-pressed={settings?.shape === shape.id}
                      title={shape.hint}
                      onClick={() => selectShape(shape.id)}
                    >
                      {shape.id === "square" ? (
                        <Square size={13} aria-hidden="true" />
                      ) : shape.id === "circle" ? (
                        <Circle size={13} aria-hidden="true" />
                      ) : null}
                      {shape.label}
                    </button>
                  ))}
                </div>
                <p className="cropper-hint">
                  {settings?.shape === "circle"
                    ? `PNG and WebP keep transparent corners; JPEG fills them with ${settings.background}.`
                    : settings?.shape === "square"
                      ? "Square crops are forced to 1:1 and export with sharp corners."
                      : "Rectangle crops follow the ratio you choose, free by default."}
                </p>
              </div>

              <div className="cropper-section">
                <h4>
                  <RotateCw size={14} aria-hidden="true" /> Rotate & flip
                </h4>
                <div className="cropper-chips">
                  <button
                    type="button"
                    className="cropper-chip"
                    onClick={() => rotate(-90)}
                  >
                    <RotateCcw size={13} aria-hidden="true" /> 90° left
                  </button>
                  <button
                    type="button"
                    className="cropper-chip"
                    onClick={() => rotate(90)}
                  >
                    <RotateCw size={13} aria-hidden="true" /> 90° right
                  </button>
                  <button
                    type="button"
                    className="cropper-chip"
                    onClick={() => rotate(180)}
                  >
                    <RotateCw size={13} aria-hidden="true" /> 180°
                  </button>
                  <button
                    type="button"
                    className="cropper-chip"
                    aria-pressed={settings?.flipH}
                    onClick={() => flip("h")}
                  >
                    <FlipHorizontal2 size={13} aria-hidden="true" /> Flip H
                  </button>
                  <button
                    type="button"
                    className="cropper-chip"
                    aria-pressed={settings?.flipV}
                    onClick={() => flip("v")}
                  >
                    <FlipVertical2 size={13} aria-hidden="true" /> Flip V
                  </button>
                </div>
                <p className="cropper-hint">
                  Crop frame: {settings?.rect.width} × {settings?.rect.height}{" "}
                  px at x {settings?.rect.x}, y {settings?.rect.y}. Rotation is
                  applied before the crop is written.
                </p>
              </div>

              <div className="cropper-section">
                <h4>
                  <ImageIcon size={14} aria-hidden="true" /> Export
                </h4>
                <div
                  className="cropper-chips"
                  role="group"
                  aria-label="Output format"
                >
                  {CROP_FORMATS.map((format) => (
                    <button
                      key={format}
                      type="button"
                      className={`cropper-chip${
                        settings?.format === format
                          ? " cropper-chip-active"
                          : ""
                      }`}
                      aria-pressed={settings?.format === format}
                      disabled={!support[format]}
                      title={
                        support[format]
                          ? `${formatLabel(format)} output`
                          : "This browser cannot encode this format"
                      }
                      onClick={() => changeFormat(format)}
                    >
                      {formatLabel(format)}
                    </button>
                  ))}
                </div>
                <div className="cropper-slider">
                  <div className="cropper-slider-head">
                    <label htmlFor="cropper-quality">Quality</label>
                    <output htmlFor="cropper-quality">
                      {settings?.format === "image/png"
                        ? "Lossless"
                        : `${settings?.quality}%`}
                    </output>
                  </div>
                  <input
                    id="cropper-quality"
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={settings?.quality ?? 90}
                    disabled={settings?.format === "image/png"}
                    onChange={(event) =>
                      changeQuality(Number(event.target.value))
                    }
                  />
                  <div className="cropper-chip-row">
                    {QUALITY_STEPS.map((step) => (
                      <button
                        key={step}
                        type="button"
                        className="cropper-chip cropper-chip-tiny"
                        disabled={settings?.format === "image/png"}
                        aria-pressed={settings?.quality === step}
                        onClick={() => changeQuality(step)}
                      >
                        {step}%
                      </button>
                    ))}
                  </div>
                  {settings?.format === "image/png" && (
                    <p className="cropper-hint">
                      PNG is lossless — every pixel is kept and the quality
                      slider does not apply.
                    </p>
                  )}
                </div>

                <div
                  className="cropper-size-modes"
                  role="group"
                  aria-label="Output size"
                >
                  {SIZE_MODES.map((mode) => {
                    const disabled =
                      mode.id === "preset" &&
                      !presetFor(settings?.ratioId ?? "");
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`cropper-chip${
                          settings?.sizeMode === mode.id
                            ? " cropper-chip-active"
                            : ""
                        }`}
                        aria-pressed={settings?.sizeMode === mode.id}
                        disabled={disabled}
                        onClick={() => changeSizeMode(mode.id)}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                {settings?.sizeMode === "scale" && (
                  <div className="cropper-slider">
                    <div className="cropper-slider-head">
                      <label htmlFor="cropper-scale">Scale</label>
                      <output htmlFor="cropper-scale">{settings.scale}%</output>
                    </div>
                    <input
                      id="cropper-scale"
                      type="range"
                      min={10}
                      max={400}
                      step={5}
                      value={settings.scale}
                      onChange={(event) =>
                        updateActive(
                          { ...settings, scale: Number(event.target.value) },
                          false,
                        )
                      }
                    />
                  </div>
                )}

                {settings?.sizeMode === "custom" && (
                  <div className="cropper-inline-fields">
                    <div className="cropper-field">
                      <label htmlFor="cropper-out-width">Output width</label>
                      <input
                        id="cropper-out-width"
                        type="number"
                        min={MIN_CUSTOM_SIDE}
                        max={8192}
                        value={settings.width}
                        onChange={(event) =>
                          updateActive(
                            {
                              ...settings,
                              width: Number(event.target.value) || 0,
                            },
                            false,
                          )
                        }
                      />
                    </div>
                    <div className="cropper-field">
                      <label htmlFor="cropper-out-height">Output height</label>
                      <input
                        id="cropper-out-height"
                        type="number"
                        min={MIN_CUSTOM_SIDE}
                        max={8192}
                        value={settings.height}
                        onChange={(event) =>
                          updateActive(
                            {
                              ...settings,
                              height: Number(event.target.value) || 0,
                            },
                            false,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                {(settings?.format === "image/jpeg" ||
                  settings?.shape === "circle") && (
                  <div className="cropper-field cropper-color-field">
                    <label htmlFor="cropper-background">
                      {settings?.shape === "circle"
                        ? "Circle background (JPEG / preview)"
                        : "JPEG background (transparency fill)"}
                    </label>
                    <div>
                      <input
                        id="cropper-background"
                        type="color"
                        value={settings?.background ?? "#ffffff"}
                        onChange={(event) =>
                          updateActive(
                            { ...settings!, background: event.target.value },
                            false,
                          )
                        }
                      />
                      <code>{settings?.background}</code>
                    </div>
                  </div>
                )}

                <p className="cropper-hint">
                  {activeItem && settings
                    ? resolutionNote(
                        settings,
                        activeItem.width,
                        activeItem.height,
                      )
                    : ""}
                </p>
                {planError && (
                  <p className="cropper-field-error" role="alert">
                    {planError}
                  </p>
                )}
              </div>

              <div className="cropper-section">
                <h4>
                  <Download size={14} aria-hidden="true" /> File name
                </h4>
                <div className="cropper-inline-fields">
                  <div className="cropper-field cropper-field-wide">
                    <label htmlFor="cropper-base-name">Base name</label>
                    <input
                      id="cropper-base-name"
                      type="text"
                      maxLength={60}
                      placeholder="From the original file"
                      value={settings?.baseName ?? ""}
                      onChange={(event) =>
                        updateActive(
                          { ...settings!, baseName: event.target.value },
                          false,
                        )
                      }
                    />
                  </div>
                  <div className="cropper-field">
                    <label htmlFor="cropper-suffix">Suffix</label>
                    <input
                      id="cropper-suffix"
                      type="text"
                      maxLength={30}
                      placeholder="cropped"
                      value={settings?.suffix ?? ""}
                      onChange={(event) =>
                        updateActive(
                          { ...settings!, suffix: event.target.value },
                          false,
                        )
                      }
                    />
                  </div>
                </div>
                <p className="cropper-name-preview">
                  Output: <code>{activeName || "—"}</code>
                </p>
                {settings?.format === "image/jpeg" && (
                  <p className="cropper-hint">
                    JPEG has no alpha channel — transparent pixels are filled
                    with {settings.background}.
                  </p>
                )}
                {!keepsTransparency(settings?.format ?? "image/webp") && (
                  <p className="cropper-hint">
                    WebP and PNG keep transparency; JPEG flattens it.
                  </p>
                )}
              </div>

              <div className="cropper-batch-tools">
                <button
                  type="button"
                  className="cropper-chip"
                  onClick={applyRatioToAll}
                >
                  <Scan size={13} aria-hidden="true" /> Apply ratio & shape to
                  all
                </button>
                <button
                  type="button"
                  className="cropper-chip"
                  onClick={applyExportToAll}
                >
                  <Settings2 size={13} aria-hidden="true" /> Apply export to all
                </button>
              </div>
            </section>

            <section
              className="cropper-panel cropper-preview-panel"
              aria-labelledby="cropper-preview-title"
            >
              <header className="cropper-panel-head">
                <h3 id="cropper-preview-title">Preview</h3>
                <div
                  className="cropper-viewswitch"
                  role="group"
                  aria-label="Preview view"
                >
                  {VIEW_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={view === mode.id}
                      onClick={() => setView(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </header>

              {view === "crop" && (
                <>
                  <div className="cropper-toolbar">
                    <div className="cropper-zoom">
                      <button
                        type="button"
                        className="cropper-icon-button"
                        aria-label="Zoom out"
                        onClick={() =>
                          changeZoom(stepZoom(activeItem?.zoom ?? 100, -1))
                        }
                        disabled={(activeItem?.zoom ?? 100) <= ZOOM_MIN}
                      >
                        <ZoomOut size={15} aria-hidden="true" />
                      </button>
                      <span className="cropper-zoom-value">
                        {activeItem?.zoom ?? 100}%
                      </span>
                      <button
                        type="button"
                        className="cropper-icon-button"
                        aria-label="Zoom in"
                        onClick={() =>
                          changeZoom(stepZoom(activeItem?.zoom ?? 100, 1))
                        }
                        disabled={(activeItem?.zoom ?? 100) >= ZOOM_MAX}
                      >
                        <ZoomIn size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="cropper-chip cropper-chip-tiny"
                        onClick={fitStage}
                      >
                        <Maximize size={12} aria-hidden="true" /> Fit
                      </button>
                    </div>
                    <div className="cropper-toolbar-right">
                      <button
                        type="button"
                        className="cropper-chip cropper-chip-tiny"
                        onClick={cropToVisible}
                      >
                        <Scan size={12} aria-hidden="true" /> Crop to visible
                        area
                      </button>
                      <button
                        type="button"
                        className="cropper-chip cropper-chip-tiny"
                        aria-pressed={thirds}
                        onClick={() => setThirds((value) => !value)}
                      >
                        Grid
                      </button>
                    </div>
                  </div>

                  <div
                    ref={stageRef}
                    className={`cropper-stage${dragging ? " cropper-stage-dragging" : ""}`}
                    onPointerDown={startPan}
                    onPointerMove={movePan}
                    onPointerUp={endPan}
                    onPointerCancel={endPan}
                  >
                    <div
                      className="cropper-stage-pad"
                      style={{ width: stagePad.width, height: stagePad.height }}
                    >
                      <div
                        className="cropper-canvas"
                        style={{
                          width: Math.max(1, display.width),
                          height: Math.max(1, display.height),
                        }}
                      >
                        <img
                          className="cropper-image"
                          src={firstSource}
                          alt={`Crop preview of ${activeItem?.file.name ?? "image"}`}
                          draggable={false}
                          style={{
                            width: Math.max(1, display.imageWidth),
                            height: Math.max(1, display.imageHeight),
                            transform: `translate(-50%, -50%) scaleX(${settings?.flipH ? -1 : 1}) scaleY(${settings?.flipV ? -1 : 1}) rotate(${settings?.rotation ?? 0}deg)`,
                          }}
                        />
                        <div className="cropper-shade" aria-hidden="true">
                          <div
                            className="cropper-shade-hole"
                            style={{
                              left: cropBox.left,
                              top: cropBox.top,
                              width: cropBox.width,
                              height: cropBox.height,
                              borderRadius: cropShapeBox,
                            }}
                          />
                        </div>
                        <div
                          className={`cropper-crop-box${settings?.shape === "circle" ? " cropper-crop-circle" : ""}`}
                          style={{
                            left: cropBox.left,
                            top: cropBox.top,
                            width: cropBox.width,
                            height: cropBox.height,
                            borderRadius: cropShapeBox,
                          }}
                          tabIndex={0}
                          role="group"
                          aria-label="Crop area — drag to move, use the corner handles to resize, arrow keys to nudge"
                          onPointerDown={(event) => {
                            if (!activeItem) return;
                            startDrag(event, "move", activeItem);
                          }}
                          onPointerMove={moveDrag}
                          onPointerUp={cleanupDrag}
                          onPointerCancel={cleanupDrag}
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
                          {thirds && settings?.shape !== "circle" && (
                            <span
                              className="cropper-thirds"
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className="cropper-crop-size"
                            aria-hidden="true"
                          >
                            {settings?.rect.width} × {settings?.rect.height}
                          </span>
                          {(["nw", "ne", "sw", "se"] as CropHandle[]).map(
                            (corner) => (
                              <button
                                key={corner}
                                type="button"
                                className={`cropper-crop-handle cropper-crop-${corner}`}
                                aria-label={`Resize crop from the ${corner} corner`}
                                data-handle={corner}
                                onPointerDown={(event) => {
                                  if (!activeItem) return;
                                  startDrag(event, corner, activeItem);
                                }}
                                onPointerMove={moveDrag}
                                onPointerUp={cleanupDrag}
                                onPointerCancel={cleanupDrag}
                                onKeyDown={(event) => {
                                  const step = event.shiftKey ? 16 : 4;
                                  const moves: Record<
                                    string,
                                    [number, number]
                                  > = {
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
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="cropper-stage-foot">
                    <span>
                      <Info size={12} aria-hidden="true" />{" "}
                      {(activeItem?.zoom ?? 100) > 100
                        ? "Drag the dark area or the scrollbars to pan."
                        : "Drag inside the frame to move it, corners to resize."}
                    </span>
                    <span className="cropper-numbers">
                      {oriented.width} × {oriented.height} px
                    </span>
                  </div>
                </>
              )}

              {view === "original" && (
                <div className="cropper-static">
                  <div className="cropper-static-stage">
                    <img
                      src={firstSource}
                      alt={`Original ${activeItem?.file.name ?? "image"}`}
                    />
                  </div>
                  <p className="cropper-static-caption">
                    ORIGINAL · {activeItem?.width} × {activeItem?.height} px ·{" "}
                    {activeItem ? formatBytes(activeItem.file.size) : ""}
                  </p>
                </div>
              )}

              {view === "cropped" && (
                <div className="cropper-static">
                  {displayedPreview ? (
                    <>
                      <div className="cropper-static-stage">
                        <img
                          src={displayedPreview}
                          alt={`Cropped preview of ${activeItem?.file.name ?? "image"}`}
                        />
                      </div>
                      <p className="cropper-static-caption">
                        CROPPED · {plan?.width} × {plan?.height} px · est.{" "}
                        {formatBytes(estimate)}
                      </p>
                    </>
                  ) : (
                    <p className="cropper-preview-wait">
                      Preparing the preview…
                    </p>
                  )}
                </div>
              )}

              {view === "compare" && (
                <div className="cropper-compare">
                  <div
                    className="cropper-viewswitch"
                    role="group"
                    aria-label="Comparison mode"
                  >
                    <button
                      type="button"
                      aria-pressed={compareMode === "split"}
                      onClick={() => setCompareMode("split")}
                    >
                      Split slider
                    </button>
                    <button
                      type="button"
                      aria-pressed={compareMode === "side"}
                      onClick={() => setCompareMode("side")}
                    >
                      Side by side
                    </button>
                    <span className="cropper-compare-icon" aria-hidden="true">
                      <Columns2 size={13} />
                    </span>
                  </div>
                  {compareMode === "split" ? (
                    <>
                      <div
                        className="cropper-split-stage"
                        style={{
                          aspectRatio: `${plan?.width ?? 1} / ${plan?.height ?? 1}`,
                        }}
                      >
                        <img
                          className="cropper-split-base"
                          src={firstSource}
                          alt={`Original ${activeItem?.file.name ?? "image"}`}
                        />
                        {displayedPreview && (
                          <img
                            className="cropper-split-top"
                            src={displayedPreview}
                            alt={`Cropped result of ${activeItem?.file.name ?? "image"}`}
                            style={{
                              clipPath: `inset(0 ${100 - split}% 0 0)`,
                            }}
                          />
                        )}
                        <span
                          className="cropper-split-line"
                          style={{ left: `${split}%` }}
                        />
                        <span className="cropper-split-tag cropper-split-left">
                          CROPPED
                        </span>
                        <span className="cropper-split-tag cropper-split-right">
                          ORIGINAL
                        </span>
                      </div>
                      <label className="cropper-split-range">
                        <span>Split position</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={split}
                          onChange={(event) =>
                            setSplit(Number(event.target.value))
                          }
                          aria-label="Split position"
                        />
                      </label>
                      <p className="cropper-static-caption">
                        ORIGINAL {activeItem?.width} × {activeItem?.height} px ·
                        CROPPED {plan?.width} × {plan?.height} px
                      </p>
                    </>
                  ) : (
                    <div className="cropper-side-by-side">
                      <figure>
                        <div className="cropper-static-stage cropper-static-small">
                          <img
                            src={firstSource}
                            alt={`Original ${activeItem?.file.name ?? "image"}`}
                          />
                        </div>
                        <figcaption>
                          <strong>Original</strong>
                          <span>
                            {activeItem?.width} × {activeItem?.height} px
                          </span>
                        </figcaption>
                      </figure>
                      <figure>
                        <div className="cropper-static-stage cropper-static-small">
                          {displayedPreview ? (
                            <img
                              src={displayedPreview}
                              alt={`Cropped result of ${activeItem?.file.name ?? "image"}`}
                            />
                          ) : (
                            <span className="cropper-preview-wait">
                              Preparing…
                            </span>
                          )}
                        </div>
                        <figcaption>
                          <strong>Cropped</strong>
                          <span>
                            {plan?.width} × {plan?.height} px
                          </span>
                        </figcaption>
                      </figure>
                    </div>
                  )}
                </div>
              )}

              {plan && settings && (
                <div className="cropper-output-bar">
                  <span className="cropper-output-format">
                    {formatLabel(settings.format)}
                  </span>
                  <span>
                    {plan.width} × {plan.height} px
                  </span>
                  <span>~{formatBytes(estimate)}</span>
                  <span>
                    {settings.shape === "circle"
                      ? "Circle mask"
                      : settings.shape === "square"
                        ? "Square corners"
                        : "Rectangle"}
                  </span>
                  {settings.format !== "image/png" && (
                    <span>Quality {settings.quality}%</span>
                  )}
                  <span>{resolutionNoteSummary(settings, activeItem)}</span>
                </div>
              )}

              <details className="cropper-details">
                <summary>
                  <ShieldCheck size={14} aria-hidden="true" /> Source & privacy
                  details
                </summary>
                <div className="cropper-details-body">
                  <ul>
                    <li>
                      <strong>{activeItem?.file.name}</strong> ·{" "}
                      {activeItem?.width} × {activeItem?.height} px ·{" "}
                      {activeItem ? formatBytes(activeItem.file.size) : ""}
                    </li>
                    {activeItem &&
                      activeItem.headerWidth !== activeItem.width && (
                        <li>
                          Header says {activeItem.headerWidth} ×{" "}
                          {activeItem.headerHeight} px — EXIF rotation is
                          applied on decode, so the canvas sees the displayed
                          size.
                        </li>
                      )}
                    {orientationLabel && <li>{orientationLabel}</li>}
                    {activeItem &&
                      metadataLines(activeItem.metadata).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    <li>
                      Every export is re-encoded from pixels on your device; the
                      original file is never modified.
                    </li>
                  </ul>
                </div>
              </details>
            </section>
          </div>

          <section
            className="cropper-panel cropper-queue-panel"
            aria-labelledby="cropper-queue-title"
          >
            <header className="cropper-panel-head">
              <h3 id="cropper-queue-title">
                Batch queue{" "}
                <span className="cropper-queue-count">
                  {items.length}/{MAX_BATCH_FILES}
                </span>
              </h3>
              <div className="cropper-batch-actions">
                <button
                  type="button"
                  className="cropper-primary"
                  onClick={() => void cropAll()}
                  disabled={busy || Boolean(planError)}
                >
                  <Crop size={15} aria-hidden="true" /> Crop{" "}
                  {items.length === 1 ? "1 image" : `${items.length} images`}
                </button>
                {busy ? (
                  <button
                    type="button"
                    className="cropper-chip"
                    onClick={stopRun}
                  >
                    <CircleStop size={14} aria-hidden="true" /> Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cropper-chip"
                    onClick={() => void cropAll(true)}
                    disabled={!failedItems.length}
                  >
                    Retry failed ({failedItems.length})
                  </button>
                )}
                <button
                  type="button"
                  className="cropper-chip"
                  onClick={() => void downloadZip()}
                  disabled={!doneItems.length || zipBusy}
                >
                  <FileArchive size={14} aria-hidden="true" />{" "}
                  {zipBusy ? "Zipping…" : `Download ZIP (${doneItems.length})`}
                </button>
                <button
                  type="button"
                  className="cropper-chip"
                  onClick={clearAll}
                >
                  <Trash2 size={14} aria-hidden="true" /> Clear all
                </button>
              </div>
            </header>

            {busy && progress.total > 0 && (
              <div
                className="cropper-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
                aria-label="Cropping progress"
              >
                <span
                  style={{
                    width: `${Math.round((progress.done / progress.total) * 100)}%`,
                  }}
                />
                <em>
                  {progress.done} / {progress.total} cropped
                </em>
              </div>
            )}

            <ul className="cropper-queue">
              {items.map((item) => {
                const current = item.history.present;
                let itemPlan: { width: number; height: number } | null = null;
                try {
                  itemPlan = outputPlan(current, item.width, item.height);
                } catch {
                  itemPlan = null;
                }
                const name = itemPlan
                  ? buildOutputName(item.file.name, {
                      baseName: current.baseName,
                      suffix: current.suffix,
                      width: itemPlan.width,
                      height: itemPlan.height,
                      format: current.format,
                    })
                  : item.file.name;
                return (
                  <li
                    key={item.id}
                    className={`cropper-queue-item${
                      activeItem?.id === item.id ? " cropper-queue-active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="cropper-queue-select"
                      onClick={() => {
                        setSelectedId(item.id);
                        setView("crop");
                      }}
                      aria-label={`Edit ${item.file.name}`}
                      aria-pressed={activeItem?.id === item.id}
                    >
                      <img src={item.originalUrl} alt="" />
                      <span className="cropper-queue-copy">
                        <strong>{item.file.name}</strong>
                        <span>
                          {item.width} × {item.height} →{" "}
                          {describeSettings(
                            current,
                            item.width,
                            item.height,
                          ).join(" · ")}
                        </span>
                        <code>{name}</code>
                      </span>
                    </button>
                    <span
                      className={`cropper-status cropper-status-${item.status}`}
                    >
                      {item.status === "ready" && "Ready"}
                      {item.status === "working" && "Cropping…"}
                      {item.status === "done" && (
                        <>
                          <Check size={12} aria-hidden="true" /> Done
                        </>
                      )}
                      {item.status === "error" && "Failed"}
                    </span>
                    <span className="cropper-queue-size">
                      {item.result
                        ? `${item.result.width} × ${item.result.height} · ${formatBytes(item.result.blob.size)}`
                        : item.status === "error"
                          ? item.error
                          : "Not cropped yet"}
                    </span>
                    <div className="cropper-queue-actions">
                      {item.result && (
                        <button
                          type="button"
                          className="cropper-icon-button"
                          aria-label={`Download ${item.result.filename}`}
                          onClick={() => downloadItem(item)}
                        >
                          <Download size={15} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="cropper-icon-button cropper-danger"
                        aria-label={`Remove ${item.file.name}`}
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {doneItems.length > 0 && (
              <p className="cropper-queue-foot">
                <CheckCircle2 size={14} aria-hidden="true" />
                {doneItems.length} of {items.length} cropped ·{" "}
                {formatBytes(allDoneBytes)} total output ·{" "}
                {plan
                  ? `${plan.width} × ${plan.height} planned for the selected image`
                  : ""}
              </p>
            )}
          </section>
        </>
      )}

      <p className="cropper-footnote">
        <ShieldCheck size={15} aria-hidden="true" /> Local only: decoding,
        cropping, rotation, masks, encoding and ZIP packaging all run in this
        browser tab. Images are never uploaded, stored or analysed.
      </p>
    </div>
  );
}
