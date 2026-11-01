"use client";
/* QR previews and user-selected logos are local data URLs, not remote images. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  ImagePlus,
  LoaderCircle,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wifi,
  BookmarkPlus,
  BriefcaseBusiness,
  CalendarDays,
  Contact,
  CreditCard,
  FileSpreadsheet,
  Globe,
  History,
  Maximize2,
  Minimize2,
  Package,
  Palette,
  Redo2,
  Share2,
  Smartphone,
  Undo2,
  X,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import {
  buildQrPayload,
  contrastRatio,
  qrContrast,
  defaultQrFormValues,
  defaultQrOptions,
  MAX_BATCH_ITEMS,
  MAX_QR_BYTES,
  QR_CONTENT_TYPES,
  QR_DESIGN_PRESETS,
  QR_FRAME_STYLES,
  QR_MARGINS,
  QR_SIZES,
  QR_TEMPLATES,
  qrByteLength,
  qrReadabilityGuidance,
  sanitizeQrFilename,
  validateQr,
  validateQrOptions,
  type QrContentType,
  type QrFormValues,
  type QrOptions,
} from "@/lib/tools/qr";
import { generateQrAssets, type GeneratedQr } from "@/lib/tools/qr-browser";
import {
  buildQrCsvItems,
  guessQrCsvMapping,
  parseQrCsv,
  type ParsedQrCsvItem,
  type QrCsvMapping,
  type QrCsvTable,
} from "@/lib/tools/qr-batch";
import { downloadBlob, downloadText } from "@/lib/tools/download";
import { EmptyState, WorkspaceHeading } from "./tool-ui";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const QR_DESIGNS_KEY = "quickkit.qr.saved-designs.v1";
const QR_PALETTES_KEY = "quickkit.qr.saved-palettes.v1";
const QR_HISTORY_KEY = "quickkit.qr.recent-projects.v1";
const QR_HISTORY_OPT_IN_KEY = "quickkit.qr.history-enabled.v1";

type LogoImage = { dataUrl: string; name: string };
type PreviewState = "idle" | "working" | "ready" | "error";
type BatchOutput = {
  id: string;
  rowNumber: number;
  type: QrContentType;
  filename: string;
  payload: string;
  options: QrOptions;
  pngDataUrl: string;
};
type BatchZip = { blob: Blob; count: number; items: BatchOutput[] };
type BatchCandidate = {
  id: string;
  rowNumber: number;
  type: QrContentType;
  filename: string;
  payload: string;
  options: QrOptions;
  error: string;
  duplicateOf?: number;
};
type BatchResult = {
  status: "working" | "ready" | "error" | "duplicate" | "cancelled";
  error?: string;
  output?: BatchOutput;
};
type SavedDesign = { id: string; name: string; options: QrOptions };
type SavedPalette = {
  id: string;
  name: string;
  foreground: string;
  gradientEnd: string;
  background: string;
  eyeColor: string;
};
type RecentProject = {
  id: string;
  type: QrContentType;
  form: QrFormValues;
  options: QrOptions;
  filename: string;
  savedAt: number;
};

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?:
    "text" | "url" | "email" | "tel" | "number" | "datetime-local" | "password";
  inputMode?: "decimal" | "email" | "numeric" | "tel" | "url";
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  maxLength?: number;
};

function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  inputMode,
  required,
  min,
  max,
  step,
  maxLength,
}: TextFieldProps) {
  return (
    <div className="qr-field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="qr-required"> · required</span> : null}
      </label>
      <input
        id={id}
        aria-label={label}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div className="qr-field qr-field-wide">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="qr-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function ContentIcon({ type }: { type: QrContentType }) {
  const size = 16;
  switch (type) {
    case "wifi":
      return <Wifi size={size} />;
    case "url":
    case "location":
    case "social":
      return <Globe size={size} />;
    case "app":
      return <Smartphone size={size} />;
    case "business":
      return <BriefcaseBusiness size={size} />;
    case "product":
      return <Package size={size} />;
    case "vcard":
      return <Contact size={size} />;
    case "event":
      return <CalendarDays size={size} />;
    case "upi":
      return <CreditCard size={size} />;
    case "whatsapp":
      return <Share2 size={size} />;
    default:
      return <QrCode size={size} />;
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The selected image could not be read."));
    reader.onerror = () =>
      reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadLogo(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Choose a valid PNG, JPG or WebP image."));
    image.src = source;
  });
}

function dataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function uniqueBatchFilename(value: string, used: Set<string>) {
  const base = sanitizeQrFilename(value);
  let filename = base;
  let suffix = 2;
  while (used.has(`${filename}.png`.toLowerCase()))
    filename = `${base}-${suffix++}`;
  used.add(`${filename}.png`.toLowerCase());
  return filename;
}

function makeBatchCandidates(
  source: "paste" | "csv",
  input: string,
  table: QrCsvTable | null,
  mapping: QrCsvMapping,
  options: QrOptions,
): BatchCandidate[] {
  let candidates: BatchCandidate[] = [];
  if (source === "csv") {
    if (!table) return [];
    const { items, errors } = buildQrCsvItems(table, mapping, options);
    candidates = [
      ...items.map((item: ParsedQrCsvItem) => ({
        id: `csv-${item.rowNumber}`,
        rowNumber: item.rowNumber,
        type: item.type,
        filename: item.filename,
        payload: item.payload,
        options: item.options,
        error: "",
      })),
      ...errors.map((item) => ({
        id: `csv-${item.rowNumber}-invalid`,
        rowNumber: item.rowNumber,
        type: "text" as const,
        filename: `row-${item.rowNumber}`,
        payload: "",
        options,
        error: item.message,
      })),
    ].sort((a, b) => a.rowNumber - b.rowNumber);
  } else {
    const lines = input.split(/\r?\n/).map((line, index) => ({ line, index }));
    const populated = lines.filter(({ line }) => line.trim());
    const usedNames = new Set<string>();
    candidates = populated
      .slice(0, MAX_BATCH_ITEMS)
      .map(({ line, index }, itemIndex) => {
        const separator = line.indexOf(" | ");
        const rawName = separator >= 0 ? line.slice(0, separator).trim() : "";
        const content = (
          separator >= 0 ? line.slice(separator + 3) : line
        ).trim();
        const rowNumber = index + 1;
        let payload = "";
        let error = "";
        try {
          payload = validateQr(content);
        } catch (reason) {
          error =
            reason instanceof Error ? reason.message : "This row is invalid.";
        }
        return {
          id: `paste-${rowNumber}-${itemIndex}`,
          rowNumber,
          type: "text" as const,
          filename: uniqueBatchFilename(
            rawName || `qr-${String(itemIndex + 1).padStart(2, "0")}`,
            usedNames,
          ),
          payload,
          options,
          error,
        };
      });
    if (populated.length > MAX_BATCH_ITEMS)
      candidates.push({
        id: "paste-limit",
        rowNumber: MAX_BATCH_ITEMS + 1,
        type: "text",
        filename: "row-limit",
        payload: "",
        options,
        error: `A batch can contain up to ${MAX_BATCH_ITEMS} codes.`,
      });
  }

  const usedNames = new Set<string>();
  const firstRowByPayload = new Map<string, number>();
  return candidates.map((candidate) => {
    const filename = uniqueBatchFilename(candidate.filename, usedNames);
    if (!candidate.payload || candidate.error)
      return { ...candidate, filename };
    const firstRow = firstRowByPayload.get(candidate.payload);
    if (firstRow !== undefined)
      return { ...candidate, filename, duplicateOf: firstRow };
    firstRowByPayload.set(candidate.payload, candidate.rowNumber);
    return { ...candidate, filename };
  });
}

export default function QrGenerator() {
  const ready = useHydrated();
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [contentType, setContentType] = useState<QrContentType>("text");
  const [form, setForm] = useState<QrFormValues>(defaultQrFormValues);
  const [options, setOptions] = useState<QrOptions>(defaultQrOptions);
  const [filename, setFilename] = useState("quickkit-qr-code");
  const [batchInput, setBatchInput] = useState("");
  const [batchSource, setBatchSource] = useState<"paste" | "csv">("paste");
  const [csvTable, setCsvTable] = useState<QrCsvTable | null>(null);
  const [csvMapping, setCsvMapping] = useState<QrCsvMapping>({
    typeColumn: "",
    contentColumn: "",
    filenameColumn: "",
  });
  const [batchResults, setBatchResults] = useState<Record<string, BatchResult>>(
    {},
  );
  const [selectedBatchRows, setSelectedBatchRows] = useState<
    Record<string, boolean>
  >({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [sheetPaper, setSheetPaper] = useState<"A4" | "Letter">("A4");
  const [sheetColumns, setSheetColumns] = useState(3);
  const [sheetMargin, setSheetMargin] = useState(12);
  const [sheetSpacing, setSheetSpacing] = useState(6);
  const [customDimensions, setCustomDimensions] = useState(false);
  const [widthDraft, setWidthDraft] = useState(String(defaultQrOptions.width));
  const [heightDraft, setHeightDraft] = useState(
    String(defaultQrOptions.height),
  );
  const [previewZoom, setPreviewZoom] = useState(false);
  const [showPresetCompare, setShowPresetCompare] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("classic");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [savedDesignName, setSavedDesignName] = useState("");
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [paletteName, setPaletteName] = useState("");
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [undoStack, setUndoStack] = useState<QrOptions[]>([]);
  const [redoStack, setRedoStack] = useState<QrOptions[]>([]);
  const [wifiPasswordVisible, setWifiPasswordVisible] = useState(false);
  const [logo, setLogo] = useState<LogoImage | null>(null);
  const [preview, setPreview] = useState<GeneratedQr | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchZip, setBatchZip] = useState<BatchZip | null>(null);
  const [exportBusy, setExportBusy] = useState<
    "pdf" | "jpg" | "sheet" | "copy" | null
  >(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const csvFileInput = useRef<HTMLInputElement>(null);
  const batchCancelRef = useRef(false);
  const renderToken = useRef(0);

  const payloadState = useMemo(() => {
    if (mode !== "single") return null;
    try {
      return { payload: buildQrPayload(contentType, form), error: "" };
    } catch (reason) {
      return {
        payload: "",
        error:
          reason instanceof Error
            ? reason.message
            : "Review the fields and try again.",
      };
    }
  }, [mode, contentType, form]);
  const payload = payloadState?.payload ?? "";
  const payloadBytes = payload ? qrByteLength(payload) : 0;
  const rawTextBytes = qrByteLength(form.text);
  const adjustedFilename = sanitizeQrFilename(filename);
  const contrastValue = useMemo(() => qrContrast(options), [options]);
  const batchCandidates = useMemo(
    () =>
      makeBatchCandidates(
        batchSource,
        batchInput,
        csvTable,
        csvMapping,
        options,
      ),
    [batchSource, batchInput, csvTable, csvMapping, options],
  );
  const validBatchCount = batchCandidates.filter(
    (item) => !item.error && (!skipDuplicates || !item.duplicateOf),
  ).length;
  const selectedBatchCount = batchCandidates.filter(
    (item) =>
      selectedBatchRows[item.id] !== false &&
      !item.error &&
      (!skipDuplicates || !item.duplicateOf),
  ).length;

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      try {
        const designs = JSON.parse(
          localStorage.getItem(QR_DESIGNS_KEY) ?? "[]",
        ) as SavedDesign[];
        const palettes = JSON.parse(
          localStorage.getItem(QR_PALETTES_KEY) ?? "[]",
        ) as SavedPalette[];
        const optedIn = localStorage.getItem(QR_HISTORY_OPT_IN_KEY) === "true";
        setSavedDesigns(Array.isArray(designs) ? designs : []);
        setSavedPalettes(Array.isArray(palettes) ? palettes : []);
        setHistoryEnabled(optedIn);
        if (optedIn) {
          const history = JSON.parse(
            localStorage.getItem(QR_HISTORY_KEY) ?? "[]",
          ) as RecentProject[];
          setRecentProjects(Array.isArray(history) ? history : []);
        }
      } catch {
        setSavedDesigns([]);
        setSavedPalettes([]);
        setRecentProjects([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (!ready || !historyEnabled) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(QR_HISTORY_KEY, JSON.stringify(recentProjects));
      } catch {
        setError(
          "This browser could not save local history. Existing saved projects remain available in this session.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, historyEnabled, recentProjects]);

  useEffect(() => {
    if (!previewZoom) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewZoom(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewZoom]);

  const renderPreview = useCallback(
    async (text: string) => {
      const token = ++renderToken.current;
      setPreviewState("working");
      setError("");
      setNote("");
      try {
        validateQrOptions(options);
        const result = await generateQrAssets(text, options, logo?.dataUrl);
        if (token !== renderToken.current) return;
        setPreview(result);
        setPreviewState("ready");
        if (historyEnabled) {
          const project: RecentProject = {
            id: `${contentType}:${text}`,
            type: contentType,
            form,
            options,
            filename,
            savedAt: Date.now(),
          };
          setRecentProjects((current) =>
            current.some((item) => item.id === project.id)
              ? current
              : [project, ...current].slice(0, 8),
          );
        }
      } catch (reason) {
        if (token !== renderToken.current) return;
        setPreview(null);
        setPreviewState("error");
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to generate this QR code. Try shorter content.",
        );
      }
    },
    [options, logo, historyEnabled, contentType, form, filename],
  );

  useEffect(() => {
    if (!ready || mode !== "single" || !payload) {
      renderToken.current++;
      return;
    }
    const timeout = window.setTimeout(() => void renderPreview(payload), 320);
    return () => window.clearTimeout(timeout);
  }, [ready, mode, payload, renderPreview]);

  const updateForm = useCallback(
    <K extends keyof QrFormValues>(key: K, value: QrFormValues[K]) => {
      renderToken.current++;
      setForm((previous) => ({ ...previous, [key]: value }));
      setPreview(null);
      setPreviewState("idle");
      setError("");
      setNote("");
      setBatchZip(null);
    },
    [],
  );

  function applyOptions(next: QrOptions) {
    renderToken.current++;
    setOptions(next);
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
    setBatchZip(null);
  }

  function changeOptions(next: QrOptions) {
    if (JSON.stringify(next) === JSON.stringify(options)) return;
    setUndoStack((history) => [...history.slice(-29), options]);
    setRedoStack([]);
    applyOptions(next);
  }

  function undoDesign() {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack((history) => history.slice(0, -1));
    setRedoStack((history) => [options, ...history].slice(0, 30));
    applyOptions(previous);
  }

  function redoDesign() {
    const next = redoStack[0];
    if (!next) return;
    setRedoStack((history) => history.slice(1));
    setUndoStack((history) => [...history, options].slice(-30));
    applyOptions(next);
  }

  function changeMode(next: "single" | "batch") {
    if (next === mode) return;
    renderToken.current++;
    setMode(next);
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
    setBatchZip(null);
  }

  function changeType(next: QrContentType) {
    setContentType(next);
    renderToken.current++;
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
  }

  function applyDesignPreset(presetId: string) {
    const preset = QR_DESIGN_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedPreset(preset.id);
    changeOptions({ ...options, ...preset.options });
  }

  function applyTemplate(templateId: string) {
    const template = QR_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplate(template.id);
    setContentType(template.contentType);
    const preset = QR_DESIGN_PRESETS.find(
      (item) => item.id === template.presetId,
    );
    changeOptions({
      ...options,
      ...preset?.options,
      frameStyle: "caption",
      frameCaption: template.frameCaption,
    });
    renderToken.current++;
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote(
      `${template.label} template loaded. Add your own content and edit the design.`,
    );
  }

  function saveDesign() {
    const design: SavedDesign = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: (
        savedDesignName.trim() || `My design ${savedDesigns.length + 1}`
      ).slice(0, 40),
      options,
    };
    const next = [design, ...savedDesigns].slice(0, 12);
    try {
      localStorage.setItem(QR_DESIGNS_KEY, JSON.stringify(next));
      setSavedDesigns(next);
      setSavedDesignName("");
      setNote(
        "Saved on this device. Style only — content and logos are not stored.",
      );
      setError("");
    } catch {
      setError("This browser could not save the design locally.");
    }
  }

  function restoreDesign(design: SavedDesign) {
    try {
      validateQrOptions(design.options);
      changeOptions(design.options);
      setNote(`${design.name} design restored from this device.`);
    } catch {
      setError(
        "This saved design is no longer valid. Remove it and save a fresh one.",
      );
    }
  }

  function deleteDesign(id: string) {
    const next = savedDesigns.filter((design) => design.id !== id);
    setSavedDesigns(next);
    try {
      localStorage.setItem(QR_DESIGNS_KEY, JSON.stringify(next));
    } catch {
      setError("This browser could not update saved designs.");
    }
  }

  function savePalette() {
    const palette: SavedPalette = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: (paletteName.trim() || `Palette ${savedPalettes.length + 1}`).slice(
        0,
        32,
      ),
      foreground: options.foreground,
      gradientEnd: options.gradientEnd,
      background: options.background,
      eyeColor: options.eyeColor,
    };
    const next = [palette, ...savedPalettes].slice(0, 12);
    try {
      localStorage.setItem(QR_PALETTES_KEY, JSON.stringify(next));
      setSavedPalettes(next);
      setPaletteName("");
      setNote("Custom color palette saved locally.");
      setError("");
    } catch {
      setError("This browser could not save the color palette locally.");
    }
  }

  function applyPalette(palette: SavedPalette) {
    try {
      validateQrOptions({ ...options, ...palette });
      changeOptions({
        ...options,
        foreground: palette.foreground,
        gradientEnd: palette.gradientEnd,
        background: palette.background,
        eyeColor: palette.eyeColor,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "This palette is no longer valid.",
      );
    }
  }

  function deletePalette(id: string) {
    const next = savedPalettes.filter((palette) => palette.id !== id);
    setSavedPalettes(next);
    try {
      localStorage.setItem(QR_PALETTES_KEY, JSON.stringify(next));
    } catch {
      setError("This browser could not update saved palettes.");
    }
  }

  function setLocalHistoryEnabled(enabled: boolean) {
    try {
      if (enabled) {
        const history = JSON.parse(
          localStorage.getItem(QR_HISTORY_KEY) ?? "[]",
        ) as RecentProject[];
        setRecentProjects(Array.isArray(history) ? history : []);
        localStorage.setItem(QR_HISTORY_OPT_IN_KEY, "true");
        setHistoryEnabled(true);
        setNote(
          "Local recent history enabled. QR content is stored only on this device.",
        );
      } else {
        localStorage.removeItem(QR_HISTORY_OPT_IN_KEY);
        setHistoryEnabled(false);
        setNote(
          "Local history is paused. Saved projects remain on this device until you clear them.",
        );
      }
    } catch {
      setError("This browser could not update the local history setting.");
      setHistoryEnabled(false);
    }
  }

  function restoreRecentProject(project: RecentProject) {
    setMode("single");
    setContentType(project.type);
    setForm(project.form);
    setFilename(project.filename);
    setLogo(null);
    changeOptions(project.options);
    setNote(
      "Recent project restored. Re-add its logo if needed; logo files are never saved in history.",
    );
  }

  function clearRecentProjects() {
    if (
      !window.confirm(
        "Clear saved QR history from this device? This does not affect your saved designs or palettes.",
      )
    )
      return;
    try {
      localStorage.removeItem(QR_HISTORY_KEY);
      setRecentProjects([]);
      setNote(
        "Recent QR history cleared from this device. History remains enabled for future generations.",
      );
    } catch {
      setError("This browser could not clear local history.");
    }
  }

  function commitDimension(axis: "width" | "height", draft: string) {
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 128 || value > 4096) {
      setError(
        "Custom canvas dimensions must be whole pixels from 128 to 4,096.",
      );
      if (axis === "width") setWidthDraft(String(options.width));
      else setHeightDraft(String(options.height));
      return;
    }
    const width = axis === "width" ? value : options.width;
    const height = axis === "height" ? value : options.height;
    changeOptions({ ...options, width, height });
    setError("");
  }

  function generateSingle() {
    if (!payload) {
      setError(payloadState?.error || "Enter content to generate a QR code.");
      return;
    }
    void renderPreview(payload);
  }

  async function chooseLogo(file?: File) {
    setError("");
    setNote("");
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPG or WebP logo image.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError("Keep logo images under 2 MB so QR generation stays quick.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadLogo(dataUrl);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        throw new Error(
          "Logo dimensions must be 4,096 × 4,096 pixels or smaller.",
        );
      }
      renderToken.current++;
      setLogo({ dataUrl, name: file.name });
      setPreview(null);
      setPreviewState("idle");
      setBatchZip(null);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Choose a valid PNG, JPG or WebP image.",
      );
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeLogo() {
    renderToken.current++;
    setLogo(null);
    setPreview(null);
    setPreviewState("idle");
    setBatchZip(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function importCsv(file?: File) {
    if (!file) return;
    setError("");
    setNote("");
    if (file.size > 2 * 1024 * 1024) {
      setError("Keep CSV files under 2 MB.");
      return;
    }
    try {
      const table = parseQrCsv(await file.text());
      setCsvTable(table);
      setCsvMapping(guessQrCsvMapping(table.headers));
      setBatchSource("csv");
      setBatchResults({});
      setSelectedBatchRows({});
      setBatchZip(null);
      setNote(
        `Imported ${table.rows.length} spreadsheet rows locally. Map columns and review each row before generating.`,
      );
    } catch (reason) {
      setCsvTable(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "This CSV could not be read.",
      );
    } finally {
      if (csvFileInput.current) csvFileInput.current.value = "";
    }
  }

  async function generateBatch(retryOnly = false) {
    setError("");
    setNote("");
    batchCancelRef.current = false;
    try {
      validateQrOptions(options);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Review the design settings.",
      );
      return;
    }
    const candidates = batchCandidates.filter((item) => {
      if (selectedBatchRows[item.id] === false || item.error) return false;
      if (skipDuplicates && item.duplicateOf) return false;
      if (retryOnly) return batchResults[item.id]?.status === "error";
      return true;
    });
    if (!candidates.length) {
      setError(
        retryOnly
          ? "There are no failed QR images to retry."
          : "Select at least one valid, non-duplicate row.",
      );
      return;
    }

    setBatchBusy(true);
    setBatchProgress(0);
    setBatchTotal(candidates.length);
    setBatchZip(null);
    let completed = 0;
    const nextResults: Record<string, BatchResult> = { ...batchResults };
    for (const candidate of batchCandidates) {
      if (candidate.error)
        nextResults[candidate.id] = { status: "error", error: candidate.error };
      else if (skipDuplicates && candidate.duplicateOf)
        nextResults[candidate.id] = {
          status: "duplicate",
          error: `Duplicate of row ${candidate.duplicateOf}; skipped.`,
        };
    }
    setBatchResults(nextResults);

    try {
      for (const candidate of candidates) {
        if (batchCancelRef.current) break;
        setBatchResults((current) => ({
          ...current,
          [candidate.id]: { status: "working" },
        }));
        try {
          const result = await generateQrAssets(
            candidate.payload,
            candidate.options,
            logo?.dataUrl,
          );
          if (!result.decodeVerified)
            throw new Error(
              "The local decoder could not verify this row. Try stronger contrast, a larger size or a smaller logo.",
            );
          const output: BatchOutput = {
            id: candidate.id,
            rowNumber: candidate.rowNumber,
            type: candidate.type,
            filename: candidate.filename,
            payload: candidate.payload,
            options: candidate.options,
            pngDataUrl: result.pngDataUrl,
          };
          nextResults[candidate.id] = { status: "ready", output };
        } catch (reason) {
          nextResults[candidate.id] = {
            status: "error",
            error:
              reason instanceof Error
                ? reason.message
                : "QR generation failed.",
          };
        }
        completed++;
        setBatchProgress(completed);
        setBatchResults({ ...nextResults });
      }

      const readyItems = Object.values(nextResults)
        .filter((result) => result.status === "ready" && result.output)
        .map((result) => result.output!);
      if (readyItems.length) {
        const files: Record<string, Uint8Array> = {};
        for (const output of readyItems)
          files[`${output.filename}.png`] = dataUrlBytes(output.pngDataUrl);
        const { zipSync } = await import("fflate");
        const zipped = zipSync(files, { level: 6 });
        const blob = new Blob([zipped as BlobPart], {
          type: "application/zip",
        });
        setBatchZip({ blob, count: readyItems.length, items: readyItems });
      } else {
        setBatchZip(null);
      }
      setBatchResults({ ...nextResults });
      const failureCount = Object.values(nextResults).filter(
        (item) => item.status === "error",
      ).length;
      setNote(
        batchCancelRef.current
          ? `Generation cancelled after ${completed} rows. Completed images remain available.`
          : `${readyItems.length} QR codes ready and scan-checked locally${failureCount ? `; ${failureCount} rows need attention` : ""}.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The batch could not be generated.",
      );
    } finally {
      setBatchBusy(false);
      batchCancelRef.current = false;
    }
  }

  async function downloadPdf() {
    if (!preview) return;
    setExportBusy("pdf");
    setError("");
    setNote("");
    try {
      const { PDFDocument } = await import("@cantoo/pdf-lib");
      const document = await PDFDocument.create({ updateMetadata: false });
      const page = document.addPage([595.28, 841.89]);
      const qrImage = await document.embedPng(dataUrlBytes(preview.pngDataUrl));
      const boxWidth = 430;
      const boxHeight = 560;
      const imageScale = Math.min(
        boxWidth / qrImage.width,
        boxHeight / qrImage.height,
      );
      const imageWidth = qrImage.width * imageScale;
      const imageHeight = qrImage.height * imageScale;
      page.drawImage(qrImage, {
        x: (595.28 - imageWidth) / 2,
        y: (841.89 - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight,
      });
      const bytes = await document.save();
      downloadBlob(
        new Blob([bytes as BlobPart], { type: "application/pdf" }),
        `${adjustedFilename}.pdf`,
      );
      setNote("Print-ready PDF created on your device.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `PDF export failed: ${reason.message}`
          : "PDF export failed. Download the PNG instead.",
      );
    } finally {
      setExportBusy(null);
    }
  }

  async function downloadBatchSheet() {
    const items = batchZip?.items ?? [];
    if (!items.length) {
      setError(
        "Generate at least one scan-checked QR before creating a print sheet.",
      );
      return;
    }
    setExportBusy("sheet");
    setError("");
    setNote("");
    try {
      const { PDFDocument, StandardFonts, rgb } =
        await import("@cantoo/pdf-lib");
      const document = await PDFDocument.create({ updateMetadata: false });
      const pageWidth = sheetPaper === "A4" ? 595.28 : 612;
      const pageHeight = sheetPaper === "A4" ? 841.89 : 792;
      const pointsPerMm = 72 / 25.4;
      const margin = sheetMargin * pointsPerMm;
      const gap = sheetSpacing * pointsPerMm;
      const columns = Math.min(6, Math.max(1, sheetColumns));
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const cellSize = Math.min(
        (usableWidth - gap * (columns - 1)) / columns,
        240,
      );
      const labelHeight = 14;
      const rowPitch = cellSize + labelHeight + gap;
      const rowsPerPage = Math.max(
        1,
        Math.floor((usableHeight + gap) / rowPitch),
      );
      const capacity = columns * rowsPerPage;
      const font = await document.embedFont(StandardFonts.Helvetica);
      const embedded = await Promise.all(
        items.map(async (item) => ({
          item,
          image: await document.embedPng(dataUrlBytes(item.pngDataUrl)),
        })),
      );
      for (let index = 0; index < embedded.length; index++) {
        const pageIndex = Math.floor(index / capacity);
        const pageItemIndex = index % capacity;
        const row = Math.floor(pageItemIndex / columns);
        const column = pageItemIndex % columns;
        const page =
          document.getPages()[pageIndex] ??
          document.addPage([pageWidth, pageHeight]);
        const { item, image } = embedded[index];
        const scale = Math.min(cellSize / image.width, cellSize / image.height);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const x =
          margin + column * (cellSize + gap) + (cellSize - drawWidth) / 2;
        const top = pageHeight - margin - row * rowPitch;
        const y = top - drawHeight;
        page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
        const caption = `${item.filename} · ${item.type}`.slice(0, 54);
        const captionWidth = font.widthOfTextAtSize(caption, 8);
        page.drawText(caption, {
          x:
            margin +
            column * (cellSize + gap) +
            Math.max(0, (cellSize - captionWidth) / 2),
          y: y - 10,
          size: 8,
          font,
          color: rgb(0.25, 0.25, 0.32),
        });
      }
      const bytes = await document.save();
      downloadBlob(
        new Blob([bytes as BlobPart], { type: "application/pdf" }),
        `${adjustedFilename}-${sheetPaper.toLowerCase()}-qr-sheet.pdf`,
      );
      setNote(
        `Print-ready ${sheetPaper} QR sheet created locally with ${items.length} scan-checked codes.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Sheet PDF export failed: ${reason.message}`
          : "Unable to create the batch sheet.",
      );
    } finally {
      setExportBusy(null);
    }
  }

  async function downloadJpg() {
    if (!preview) return;
    setExportBusy("jpg");
    setError("");
    setNote("");
    try {
      const image = await loadLogo(preview.pngDataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = options.width;
      canvas.height = options.height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Your browser could not prepare a JPEG image.");
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value ? resolve(value) : reject(new Error("JPEG encoding failed.")),
          "image/jpeg",
          0.94,
        ),
      );
      downloadBlob(blob, `${adjustedFilename}.jpg`);
      setNote(
        "High-quality JPEG downloaded. Transparent areas use the selected background.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "JPEG export failed.",
      );
    } finally {
      setExportBusy(null);
    }
  }

  async function copyPng() {
    if (!preview) return;
    setExportBusy("copy");
    setError("");
    setNote("");
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined")
        throw new Error("Image copy is not available in this browser.");
      const blob = new Blob([dataUrlBytes(preview.pngDataUrl)], {
        type: "image/png",
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setNote("QR image copied — paste it anywhere.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `${reason.message} Use Download PNG instead.`
          : "Image copy is not available here. Use Download PNG instead.",
      );
    } finally {
      setExportBusy(null);
    }
  }

  async function copyEncodedContent() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setNote("Encoded content copied to your clipboard.");
      setError("");
    } catch {
      setError(
        "Content copy is unavailable here. Select the encoded preview text instead.",
      );
    }
  }

  function resetAll() {
    renderToken.current++;
    setMode("single");
    setContentType("text");
    setForm(defaultQrFormValues);
    setOptions(defaultQrOptions);
    setWidthDraft(String(defaultQrOptions.width));
    setHeightDraft(String(defaultQrOptions.height));
    setSelectedPreset("classic");
    setFilename("quickkit-qr-code");
    setBatchInput("");
    setLogo(null);
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
    setBatchBusy(false);
    setBatchProgress(0);
    setBatchTotal(0);
    setBatchZip(null);
    setBatchResults({});
    setSelectedBatchRows({});
    setCsvTable(null);
    setCsvMapping({ typeColumn: "", contentColumn: "", filenameColumn: "" });
    setBatchSource("paste");
    setCustomDimensions(false);
    setPreviewZoom(false);
    setSelectedTemplate(null);
    setUndoStack([]);
    setRedoStack([]);
    setWifiPasswordVisible(false);
    batchCancelRef.current = false;
    setExportBusy(null);
    if (fileInput.current) fileInput.current.value = "";
    if (csvFileInput.current) csvFileInput.current.value = "";
  }

  const title =
    QR_CONTENT_TYPES.find((item) => item.value === contentType)?.label ??
    "QR code";
  const readability = preview
    ? qrReadabilityGuidance({
        contrast: contrastValue,
        modulePixels: preview.modulePixels,
        quietZone: options.margin,
        errorLevel: options.errorLevel,
        hasLogo: Boolean(logo),
        decodeVerified: preview.decodeVerified,
        logoScale: options.logoScale,
        frameContrast: contrastRatio(
          options.frameColor,
          options.frameTextColor,
        ),
      })
    : "A local decoder checks each preview against its original content.";

  return (
    <fieldset
      className="workspace qr-workspace"
      disabled={!ready}
      aria-label="QR code generator workspace"
    >
      <WorkspaceHeading
        title="Make a QR code that feels like yours"
        description="Create, customize and check scannable codes — all processing stays right here on your device."
      />

      <div className="qr-mode-tabs" role="tablist" aria-label="Generation mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          className={mode === "single" ? "qr-mode-tab active" : "qr-mode-tab"}
          onClick={() => changeMode("single")}
        >
          <QrCode size={16} /> Single QR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "batch"}
          className={mode === "batch" ? "qr-mode-tab active" : "qr-mode-tab"}
          onClick={() => changeMode("batch")}
        >
          <FileArchive size={16} /> Batch ZIP
        </button>
        <span className="qr-local-note">
          <ShieldCheck size={15} /> No uploads
        </span>
      </div>

      {mode === "single" ? (
        <section
          className="qr-template-library"
          aria-label="Editable QR templates"
        >
          <div className="qr-template-heading">
            <div>
              <span className="eyebrow">EDITABLE STARTERS</span>
              <h3>Start with a template</h3>
            </div>
            <small>All templates stay editable</small>
          </div>
          <div className="qr-template-grid">
            {QR_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={
                  selectedTemplate === template.id
                    ? "qr-template-card active"
                    : "qr-template-card"
                }
                aria-pressed={selectedTemplate === template.id}
                onClick={() => applyTemplate(template.id)}
                title={`${template.label}: ${template.description}`}
              >
                <span className="qr-template-icon">
                  <ContentIcon type={template.contentType} />
                </span>
                <span>
                  <strong>{template.label}</strong>
                  <small>{template.description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {mode === "single" ? (
        <div className="qr-content-picker">
          <div className="qr-picker-heading">
            <div>
              <span className="eyebrow">START WITH A PURPOSE</span>
              <h3>What should this QR code do?</h3>
            </div>
            <span className="qr-private-pill">
              <ShieldCheck size={13} /> Private by design
            </span>
          </div>
          <div
            className="qr-type-grid"
            role="group"
            aria-label="QR content type"
          >
            {QR_CONTENT_TYPES.map((item) => {
              const active = contentType === item.value;
              return (
                <button
                  type="button"
                  key={item.value}
                  aria-pressed={active}
                  className={active ? "qr-type-card active" : "qr-type-card"}
                  onClick={() => changeType(item.value)}
                >
                  <span className={`qr-type-icon qr-type-${item.value}`}>
                    <ContentIcon type={item.value} />
                  </span>
                  <span className="qr-type-copy">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                  {active ? (
                    <Check size={15} className="qr-type-check" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="qr-builder-grid">
            <section className="qr-editor" aria-label={`${title} QR details`}>
              <div className="qr-editor-heading">
                <div>
                  <span className="eyebrow">YOUR CONTENT</span>
                  <h3>{title} details</h3>
                </div>
                <span
                  className={
                    payloadBytes > MAX_QR_BYTES * 0.9
                      ? "char-meter near-limit"
                      : "char-meter"
                  }
                >
                  {payloadBytes.toLocaleString()} /{" "}
                  {MAX_QR_BYTES.toLocaleString()} bytes
                </span>
              </div>
              {contentType === "text" ? (
                <div className="qr-field">
                  <label htmlFor="qr-input">Text or URL</label>
                  <textarea
                    id="qr-input"
                    value={form.text}
                    onChange={(event) => updateForm("text", event.target.value)}
                    rows={4}
                    maxLength={MAX_QR_BYTES}
                    placeholder="https://example.com or a little text to share…"
                    aria-describedby="qr-help"
                  />
                  <p id="qr-help" className="help">
                    {rawTextBytes.toLocaleString()} UTF-8 bytes. Links are
                    encoded as text and never opened or fetched.
                  </p>
                </div>
              ) : null}
              {contentType === "url" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="qr-url"
                    label="Website URL"
                    value={form.url}
                    type="url"
                    placeholder="https://example.com"
                    onChange={(value) => updateForm("url", value)}
                    required
                  />
                  <p className="help qr-field-wide">
                    A website scheme is added if you omit it. Only http and
                    https links are accepted.
                  </p>
                </div>
              ) : null}
              {contentType === "wifi" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="wifi-ssid"
                    label="Network name (SSID)"
                    value={form.wifiSsid}
                    placeholder="e.g. Studio Wi-Fi"
                    onChange={(value) => updateForm("wifiSsid", value)}
                    required
                    maxLength={128}
                  />
                  <SelectField
                    id="wifi-security"
                    label="Security"
                    value={form.wifiSecurity}
                    onChange={(value) =>
                      updateForm(
                        "wifiSecurity",
                        value as QrFormValues["wifiSecurity"],
                      )
                    }
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">Open network · no password</option>
                  </SelectField>
                  {form.wifiSecurity !== "nopass" ? (
                    <TextField
                      id="wifi-password"
                      label="Network password"
                      value={form.wifiPassword}
                      type={wifiPasswordVisible ? "text" : "password"}
                      onChange={(value) => updateForm("wifiPassword", value)}
                      required
                      maxLength={128}
                    />
                  ) : null}
                  {form.wifiSecurity !== "nopass" ? (
                    <button
                      type="button"
                      className="qr-text-action qr-field-wide"
                      onClick={() =>
                        setWifiPasswordVisible((visible) => !visible)
                      }
                    >
                      {wifiPasswordVisible ? "Hide password" : "Show password"}
                    </button>
                  ) : null}
                  <label className="check-label qr-field-wide">
                    <input
                      type="checkbox"
                      checked={form.wifiHidden}
                      onChange={(event) =>
                        updateForm("wifiHidden", event.target.checked)
                      }
                    />
                    Hidden network
                  </label>
                  <p className="help qr-field-wide">
                    Wi-Fi credentials are encoded only into this QR image and
                    are never saved or uploaded.
                  </p>
                </div>
              ) : null}
              {contentType === "phone" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="phone-number"
                    label="Phone number"
                    value={form.phone}
                    type="tel"
                    inputMode="tel"
                    placeholder="+1 555 123 4567"
                    onChange={(value) => updateForm("phone", value)}
                    required
                  />
                  <p className="help qr-field-wide">
                    Use an international country code where possible. QUICKKIT
                    does not verify phone numbers.
                  </p>
                </div>
              ) : null}
              {contentType === "email" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="email-address"
                    label="To"
                    value={form.emailAddress}
                    type="email"
                    inputMode="email"
                    placeholder="hello@example.com"
                    onChange={(value) => updateForm("emailAddress", value)}
                    required
                  />
                  <TextField
                    id="email-subject"
                    label="Subject (optional)"
                    value={form.emailSubject}
                    onChange={(value) => updateForm("emailSubject", value)}
                  />
                  <TextAreaField
                    id="email-body"
                    label="Message (optional)"
                    value={form.emailBody}
                    onChange={(value) => updateForm("emailBody", value)}
                  />
                </div>
              ) : null}
              {contentType === "sms" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="sms-number"
                    label="Phone number"
                    value={form.smsNumber}
                    type="tel"
                    inputMode="tel"
                    placeholder="+1 555 123 4567"
                    onChange={(value) => updateForm("smsNumber", value)}
                    required
                  />
                  <TextAreaField
                    id="sms-message"
                    label="Prefilled message (optional)"
                    value={form.smsMessage}
                    onChange={(value) => updateForm("smsMessage", value)}
                  />
                </div>
              ) : null}
              {contentType === "vcard" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="contact-first-name"
                    label="First name"
                    value={form.firstName}
                    onChange={(value) => updateForm("firstName", value)}
                  />
                  <TextField
                    id="contact-last-name"
                    label="Last name"
                    value={form.lastName}
                    onChange={(value) => updateForm("lastName", value)}
                  />
                  <TextField
                    id="contact-organization"
                    label="Organization"
                    value={form.contactOrganization}
                    onChange={(value) =>
                      updateForm("contactOrganization", value)
                    }
                  />
                  <TextField
                    id="contact-title"
                    label="Job title"
                    value={form.contactTitle}
                    onChange={(value) => updateForm("contactTitle", value)}
                  />
                  <TextField
                    id="contact-phone"
                    label="Phone (optional)"
                    value={form.contactPhone}
                    type="tel"
                    onChange={(value) => updateForm("contactPhone", value)}
                  />
                  <TextField
                    id="contact-email"
                    label="Email (optional)"
                    value={form.contactEmail}
                    type="email"
                    onChange={(value) => updateForm("contactEmail", value)}
                  />
                  <TextField
                    id="contact-website"
                    label="Website (optional)"
                    value={form.contactWebsite}
                    type="url"
                    onChange={(value) => updateForm("contactWebsite", value)}
                  />
                  <TextField
                    id="contact-street"
                    label="Street (optional)"
                    value={form.contactStreet}
                    onChange={(value) => updateForm("contactStreet", value)}
                  />
                  <TextField
                    id="contact-city"
                    label="City (optional)"
                    value={form.contactCity}
                    onChange={(value) => updateForm("contactCity", value)}
                  />
                  <TextField
                    id="contact-region"
                    label="State / region (optional)"
                    value={form.contactRegion}
                    onChange={(value) => updateForm("contactRegion", value)}
                  />
                  <TextField
                    id="contact-postal"
                    label="Postal code (optional)"
                    value={form.contactPostalCode}
                    onChange={(value) => updateForm("contactPostalCode", value)}
                  />
                  <TextField
                    id="contact-country"
                    label="Country (optional)"
                    value={form.contactCountry}
                    onChange={(value) => updateForm("contactCountry", value)}
                  />
                  <p className="help qr-field-wide">
                    A vCard 3.0 contact is generated for common phone and
                    contacts apps.
                  </p>
                </div>
              ) : null}
              {contentType === "whatsapp" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="whatsapp-number"
                    label="WhatsApp phone number"
                    value={form.whatsappNumber}
                    type="tel"
                    inputMode="tel"
                    placeholder="+91 98765 43210"
                    onChange={(value) => updateForm("whatsappNumber", value)}
                    required
                  />
                  <TextAreaField
                    id="whatsapp-message"
                    label="Prefilled message (optional)"
                    value={form.whatsappMessage}
                    onChange={(value) => updateForm("whatsappMessage", value)}
                  />
                  <p className="help qr-field-wide">
                    Include the country code. The destination opens in WhatsApp
                    when scanned.
                  </p>
                </div>
              ) : null}
              {contentType === "location" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="location-latitude"
                    label="Latitude"
                    value={form.latitude}
                    type="number"
                    inputMode="decimal"
                    min="-90"
                    max="90"
                    step="any"
                    placeholder="23.0225"
                    onChange={(value) => updateForm("latitude", value)}
                    required
                  />
                  <TextField
                    id="location-longitude"
                    label="Longitude"
                    value={form.longitude}
                    type="number"
                    inputMode="decimal"
                    min="-180"
                    max="180"
                    step="any"
                    placeholder="72.5714"
                    onChange={(value) => updateForm("longitude", value)}
                    required
                  />
                  <TextField
                    id="location-label"
                    label="Place name (optional)"
                    value={form.locationLabel}
                    placeholder="Ahmedabad"
                    onChange={(value) => updateForm("locationLabel", value)}
                  />
                  <TextField
                    id="location-map-url"
                    label="Map URL (optional)"
                    value={form.locationMapUrl}
                    type="url"
                    placeholder="https://maps.google.com/..."
                    onChange={(value) => updateForm("locationMapUrl", value)}
                  />
                  <p className="help qr-field-wide">
                    Coordinates are checked. Add a trusted map URL to open a
                    specific pin; the link is encoded, never visited here.
                  </p>
                </div>
              ) : null}
              {contentType === "event" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="event-title"
                    label="Event name"
                    value={form.eventTitle}
                    onChange={(value) => updateForm("eventTitle", value)}
                    required
                    maxLength={200}
                  />
                  <TextField
                    id="event-start"
                    label="Starts"
                    value={form.eventStart}
                    type="datetime-local"
                    onChange={(value) => updateForm("eventStart", value)}
                    required
                  />
                  <TextField
                    id="event-end"
                    label="Ends"
                    value={form.eventEnd}
                    type="datetime-local"
                    onChange={(value) => updateForm("eventEnd", value)}
                    required
                  />
                  <TextField
                    id="event-timezone"
                    label="Time zone (IANA, optional)"
                    value={form.eventTimezone}
                    placeholder="Local device timezone"
                    onChange={(value) => updateForm("eventTimezone", value)}
                  />
                  <TextField
                    id="event-location"
                    label="Location (optional)"
                    value={form.eventLocation}
                    onChange={(value) => updateForm("eventLocation", value)}
                  />
                  <TextAreaField
                    id="event-description"
                    label="Description (optional)"
                    value={form.eventDescription}
                    onChange={(value) => updateForm("eventDescription", value)}
                  />
                  <p className="help qr-field-wide">
                    Enter a timezone such as Asia/Kolkata or America/New_York.
                    Leave blank to use the device timezone. The calendar stores
                    exact UTC instants and records the timezone used.
                  </p>
                </div>
              ) : null}
              {contentType === "upi" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="upi-id"
                    label="UPI ID (VPA)"
                    value={form.upiId}
                    placeholder="name@bank"
                    onChange={(value) => updateForm("upiId", value)}
                    required
                  />
                  <TextField
                    id="upi-name"
                    label="Payee name (optional)"
                    value={form.upiName}
                    onChange={(value) => updateForm("upiName", value)}
                  />
                  <TextField
                    id="upi-amount"
                    label="Amount in INR (optional)"
                    value={form.upiAmount}
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="100000000"
                    step="0.01"
                    placeholder="250.00"
                    onChange={(value) => updateForm("upiAmount", value)}
                  />
                  <TextField
                    id="upi-note"
                    label="Payment note (optional)"
                    value={form.upiNote}
                    onChange={(value) => updateForm("upiNote", value)}
                  />
                  <p className="help qr-field-wide">
                    Creates a UPI payment intent (INR). It does not process or
                    verify a payment. Only scan payment codes from trusted
                    sources.
                  </p>
                </div>
              ) : null}
              {contentType === "social" ? (
                <div className="qr-form-grid">
                  <SelectField
                    id="social-platform"
                    label="Social platform"
                    value={form.socialPlatform}
                    onChange={(value) =>
                      updateForm(
                        "socialPlatform",
                        value as QrFormValues["socialPlatform"],
                      )
                    }
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X</option>
                    <option value="other">Other profile</option>
                  </SelectField>
                  <TextField
                    id="social-url"
                    label="Profile URL"
                    value={form.socialUrl}
                    type="url"
                    placeholder="https://instagram.com/yourbrand"
                    onChange={(value) => updateForm("socialUrl", value)}
                    required
                  />
                  <p className="help qr-field-wide">
                    YouTube, Instagram, Facebook, LinkedIn, X and other HTTPS
                    profile links are supported. The link is never opened here.
                  </p>
                </div>
              ) : null}
              {contentType === "app" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="app-name"
                    label="App name (optional)"
                    value={form.appName}
                    onChange={(value) => updateForm("appName", value)}
                  />
                  <SelectField
                    id="app-platform"
                    label="Link type"
                    value={form.appPlatform}
                    onChange={(value) =>
                      updateForm(
                        "appPlatform",
                        value as QrFormValues["appPlatform"],
                      )
                    }
                  >
                    <option value="universal">Universal smart link</option>
                    <option value="ios">Apple App Store</option>
                    <option value="android">Google Play</option>
                  </SelectField>
                  <TextField
                    id="app-url"
                    label="App download or smart-link URL"
                    value={form.appUrl}
                    type="url"
                    placeholder="https://example.com/get-the-app"
                    onChange={(value) => updateForm("appUrl", value)}
                    required
                  />
                  <p className="help qr-field-wide">
                    Use a universal app link for device-aware routing, or a
                    direct App Store / Google Play listing.
                  </p>
                </div>
              ) : null}
              {contentType === "business" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="business-name"
                    label="Business name"
                    value={form.businessName}
                    onChange={(value) => updateForm("businessName", value)}
                    required
                  />
                  <TextField
                    id="business-phone"
                    label="Phone (optional)"
                    value={form.businessPhone}
                    type="tel"
                    onChange={(value) => updateForm("businessPhone", value)}
                  />
                  <TextField
                    id="business-email"
                    label="Email (optional)"
                    value={form.businessEmail}
                    type="email"
                    onChange={(value) => updateForm("businessEmail", value)}
                  />
                  <TextField
                    id="business-website"
                    label="Website (optional)"
                    value={form.businessWebsite}
                    type="url"
                    onChange={(value) => updateForm("businessWebsite", value)}
                  />
                  <TextField
                    id="business-street"
                    label="Street address (optional)"
                    value={form.businessStreet}
                    onChange={(value) => updateForm("businessStreet", value)}
                  />
                  <TextField
                    id="business-city"
                    label="City (optional)"
                    value={form.businessCity}
                    onChange={(value) => updateForm("businessCity", value)}
                  />
                  <TextField
                    id="business-region"
                    label="State / region (optional)"
                    value={form.businessRegion}
                    onChange={(value) => updateForm("businessRegion", value)}
                  />
                  <TextField
                    id="business-postal"
                    label="Postal code (optional)"
                    value={form.businessPostalCode}
                    onChange={(value) =>
                      updateForm("businessPostalCode", value)
                    }
                  />
                  <TextField
                    id="business-country"
                    label="Country (optional)"
                    value={form.businessCountry}
                    onChange={(value) => updateForm("businessCountry", value)}
                  />
                  <TextAreaField
                    id="business-description"
                    label="Short description (optional)"
                    value={form.businessDescription}
                    onChange={(value) =>
                      updateForm("businessDescription", value)
                    }
                  />
                  <p className="help qr-field-wide">
                    Creates an editable vCard 3.0 business contact.
                  </p>
                </div>
              ) : null}
              {contentType === "product" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="product-name"
                    label="Product name"
                    value={form.productName}
                    onChange={(value) => updateForm("productName", value)}
                    required
                  />
                  <TextField
                    id="product-sku"
                    label="SKU or product ID (optional)"
                    value={form.productSku}
                    onChange={(value) => updateForm("productSku", value)}
                  />
                  <TextField
                    id="product-price"
                    label="Price label (optional)"
                    value={form.productPrice}
                    placeholder="INR 450"
                    onChange={(value) => updateForm("productPrice", value)}
                  />
                  <TextField
                    id="product-url"
                    label="Product page URL (optional)"
                    value={form.productUrl}
                    type="url"
                    onChange={(value) => updateForm("productUrl", value)}
                  />
                  <TextAreaField
                    id="product-description"
                    label="Product description (optional)"
                    value={form.productDescription}
                    onChange={(value) =>
                      updateForm("productDescription", value)
                    }
                  />
                  <p className="help qr-field-wide">
                    Encodes product facts as plain text plus an optional URL. No
                    tracking is added and links are never opened here.
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="status error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="action-row qr-generate-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={generateSingle}
                  disabled={previewState === "working"}
                >
                  {previewState === "working" ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {previewState === "working"
                    ? "Generating…"
                    : "Generate QR code"}
                </button>
                <button type="button" className="secondary" onClick={resetAll}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
              {payload ? (
                <details className="qr-encoded-preview">
                  <summary>Preview encoded content</summary>
                  <pre>{payload}</pre>
                  <button
                    type="button"
                    className="qr-text-action"
                    onClick={() => void copyEncodedContent()}
                  >
                    <Copy size={14} /> Copy encoded content
                  </button>
                </details>
              ) : null}
            </section>

            <aside
              className="qr-preview-column"
              aria-label="QR code live preview"
            >
              <div className="qr-preview-card">
                <div className="qr-preview-topline">
                  <div>
                    <span className="eyebrow">LIVE PREVIEW</span>
                    <h3>Your QR code</h3>
                  </div>
                  <div className="qr-preview-header-actions">
                    {preview?.decodeVerified ? (
                      <span className="qr-verified-pill">
                        <CheckCircle2 size={14} /> Scan checked
                      </span>
                    ) : null}
                    {preview ? (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Zoom QR preview"
                        title="Zoom preview"
                        onClick={() => setPreviewZoom(true)}
                      >
                        <Maximize2 size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div
                  className={
                    preview ? "qr-image-stage has-image" : "qr-image-stage"
                  }
                >
                  {preview ? (
                    <img
                      src={preview.pngDataUrl}
                      width={options.width}
                      height={options.height}
                      alt="Generated QR code preview"
                      style={{
                        backgroundColor: options.transparentBackground
                          ? "transparent"
                          : options.background,
                      }}
                    />
                  ) : (
                    <EmptyState
                      icon={
                        previewState === "working" ? (
                          <LoaderCircle size={34} className="spin" />
                        ) : (
                          <QrCode size={36} />
                        )
                      }
                    >
                      {previewState === "working"
                        ? "Building and scan-checking your QR code…"
                        : "Your finished code will appear here as you edit."}
                    </EmptyState>
                  )}
                </div>
                {preview ? (
                  <>
                    <div
                      className={
                        preview.decodeVerified
                          ? "qr-scan-check passed"
                          : "qr-scan-check warning"
                      }
                      role="status"
                    >
                      {preview.decodeVerified ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      <span>
                        {preview.decodeVerified
                          ? "Local scan test passed — the code decodes to your exact content."
                          : "The local decoder could not confirm this design. Adjust logo, contrast or content before sharing."}
                      </span>
                    </div>
                    <p className="qr-readability-help">{readability}</p>
                    <div className="qr-preview-stats">
                      <span>
                        <strong>
                          {options.width}×{options.height}px
                        </strong>{" "}
                        output
                      </span>
                      <span>
                        <strong>{preview.modulePixels.toFixed(1)}px</strong> per
                        module
                      </span>
                      <span>
                        <strong>{options.errorLevel}</strong> correction
                      </span>
                    </div>
                    <div className="qr-download-grid">
                      <a
                        href={preview.pngDataUrl}
                        download={`${adjustedFilename}.png`}
                        className="primary"
                      >
                        <Download size={15} /> Download PNG
                      </a>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          downloadText(
                            preview.svg,
                            `${adjustedFilename}.svg`,
                            "image/svg+xml;charset=utf-8",
                          )
                        }
                      >
                        <FileCode2 size={15} /> Download SVG
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void downloadPdf()}
                        disabled={exportBusy === "pdf"}
                      >
                        {exportBusy === "pdf" ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <FileText size={15} />
                        )}{" "}
                        Download PDF
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void downloadJpg()}
                        disabled={exportBusy === "jpg"}
                      >
                        {exportBusy === "jpg" ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <FileImage size={15} />
                        )}{" "}
                        Download JPG
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void copyPng()}
                        disabled={exportBusy === "copy"}
                      >
                        {exportBusy === "copy" ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <Copy size={15} />
                        )}{" "}
                        Copy image
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="qr-batch-workspace">
          <div className="qr-batch-intro">
            <span className="eyebrow">BULK STUDIO · 100% LOCAL</span>
            <h3>Build a batch of scan-checked QR codes</h3>
            <p>
              Paste one item per line or import a CSV. Typed content is
              validated row-by-row, duplicate payloads are flagged, and you can
              selectively generate, retry, download a ZIP or lay codes out on
              print sheets.
            </p>
          </div>
          <div
            className="qr-batch-source-tabs"
            role="tablist"
            aria-label="Batch input source"
          >
            <button
              type="button"
              role="tab"
              aria-selected={batchSource === "paste"}
              className={batchSource === "paste" ? "active" : ""}
              onClick={() => setBatchSource("paste")}
            >
              <Copy size={14} /> Paste rows
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={batchSource === "csv"}
              className={batchSource === "csv" ? "active" : ""}
              onClick={() => {
                setBatchSource("csv");
                if (!csvTable) csvFileInput.current?.click();
              }}
            >
              <FileSpreadsheet size={14} /> Import CSV
            </button>
            <input
              ref={csvFileInput}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Import CSV file"
              onChange={(event) => void importCsv(event.target.files?.[0])}
            />
          </div>

          {batchSource === "paste" ? (
            <div className="qr-batch-paste">
              <label htmlFor="qr-batch-input">
                Batch items · up to {MAX_BATCH_ITEMS}
              </label>
              <textarea
                id="qr-batch-input"
                value={batchInput}
                onChange={(event) => {
                  setBatchInput(event.target.value);
                  setBatchResults({});
                  setSelectedBatchRows({});
                  setBatchZip(null);
                  setError("");
                  setNote("");
                }}
                rows={7}
                placeholder={
                  "menu | https://example.com/menu\ninstagram | https://instagram.com/yourbrand\nA short note to share"
                }
              />
              <p className="help">
                Use <code>filename | content</code> to name a file. Each row is
                checked independently; duplicate filenames get safe numeric
                suffixes.
              </p>
            </div>
          ) : (
            <div className="qr-csv-import">
              {!csvTable ? (
                <div className="qr-csv-empty">
                  <FileSpreadsheet size={24} />
                  <strong>Import a CSV file</strong>
                  <span>
                    Up to {MAX_BATCH_ITEMS} data rows and 2 MB. Use typed QR
                    columns or a Content JSON cell.
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => csvFileInput.current?.click()}
                  >
                    <Upload size={14} /> Choose CSV
                  </button>
                </div>
              ) : (
                <>
                  <div className="qr-csv-file-heading">
                    <div>
                      <strong>
                        {csvTable.rows.length} spreadsheet rows imported
                      </strong>
                      <small>
                        Rows are parsed locally. Map core columns and review the
                        result list below.
                      </small>
                    </div>
                    <button
                      type="button"
                      className="secondary compact"
                      onClick={() => csvFileInput.current?.click()}
                    >
                      <Upload size={14} /> Replace CSV
                    </button>
                  </div>
                  <div className="qr-form-grid qr-csv-mapping">
                    <SelectField
                      id="qr-csv-type"
                      label="QR type column"
                      value={csvMapping.typeColumn}
                      onChange={(value) => {
                        setCsvMapping((current) => ({
                          ...current,
                          typeColumn: value,
                        }));
                        setBatchResults({});
                        setBatchZip(null);
                      }}
                    >
                      <option value="">Text (default)</option>
                      {csvTable.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      id="qr-csv-content"
                      label="Content / JSON column"
                      value={csvMapping.contentColumn}
                      onChange={(value) => {
                        setCsvMapping((current) => ({
                          ...current,
                          contentColumn: value,
                        }));
                        setBatchResults({});
                        setBatchZip(null);
                      }}
                    >
                      <option value="">Use typed columns only</option>
                      {csvTable.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      id="qr-csv-filename"
                      label="Filename column"
                      value={csvMapping.filenameColumn}
                      onChange={(value) => {
                        setCsvMapping((current) => ({
                          ...current,
                          filenameColumn: value,
                        }));
                        setBatchResults({});
                        setBatchZip(null);
                      }}
                    >
                      <option value="">Auto-name</option>
                      {csvTable.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <p className="help">
                    Typed rows can use columns such as{" "}
                    <code>ssid,password,security</code>,{" "}
                    <code>firstName,lastName,email</code>,{" "}
                    <code>eventTitle,eventStart,eventEnd,eventTimezone</code>,{" "}
                    <code>upiId,amount</code>, or a JSON object in the mapped
                    content cell.
                  </p>
                  <details className="qr-csv-preview">
                    <summary>Preview imported columns and first 5 rows</summary>
                    <div className="qr-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {csvTable.headers.map((header) => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvTable.rows.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                              {csvTable.headers.map((header) => (
                                <td key={header}>{row[header]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              )}
            </div>
          )}

          <div className="qr-batch-summary-row">
            <div className="qr-batch-counts">
              <span>
                <strong>{batchCandidates.length}</strong> rows
              </span>
              <span>
                <strong>{validBatchCount}</strong> eligible
              </span>
              <span
                className={
                  batchCandidates.some((item) => item.error) ? "has-issues" : ""
                }
              >
                <strong>
                  {batchCandidates.filter((item) => item.error).length}
                </strong>{" "}
                invalid
              </span>
              <span>
                <strong>
                  {batchCandidates.filter((item) => item.duplicateOf).length}
                </strong>{" "}
                duplicates
              </span>
            </div>
            <label className="check-label qr-skip-duplicates">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(event) => {
                  setSkipDuplicates(event.target.checked);
                  setBatchZip(null);
                }}
              />{" "}
              Skip duplicate payloads
            </label>
          </div>
          {batchCandidates.length ? (
            <div className="qr-batch-review">
              <div className="qr-batch-review-heading">
                <div>
                  <h4>Review & select rows</h4>
                  <small>
                    Invalid items stay out of exports. Duplicate detection
                    compares the exact encoded payload.
                  </small>
                </div>
                <button
                  type="button"
                  className="qr-text-action"
                  onClick={() =>
                    setSelectedBatchRows(
                      Object.fromEntries(
                        batchCandidates.map((item) => [
                          item.id,
                          !item.error && (!skipDuplicates || !item.duplicateOf),
                        ]),
                      ),
                    )
                  }
                >
                  Select valid rows
                </button>
              </div>
              <div className="qr-table-scroll">
                <table className="qr-batch-table">
                  <thead>
                    <tr>
                      <th scope="col">Use</th>
                      <th scope="col">Row / file</th>
                      <th scope="col">Type</th>
                      <th scope="col">Validation / generation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchCandidates.map((item) => {
                      const result = batchResults[item.id];
                      const isSkippedDuplicate =
                        skipDuplicates && Boolean(item.duplicateOf);
                      const statusText =
                        result?.status === "ready"
                          ? "Scan-checked"
                          : result?.status === "working"
                            ? "Generating…"
                            : result?.status === "error"
                              ? "Needs attention"
                              : item.error
                                ? "Invalid row"
                                : item.duplicateOf
                                  ? `Duplicate of row ${item.duplicateOf}`
                                  : "Ready to generate";
                      const message =
                        result?.error ||
                        item.error ||
                        (isSkippedDuplicate
                          ? `Duplicate of row ${item.duplicateOf}; skipped by setting.`
                          : "");
                      return (
                        <tr
                          key={item.id}
                          className={
                            item.error || result?.status === "error"
                              ? "invalid"
                              : result?.status === "ready"
                                ? "ready"
                                : isSkippedDuplicate
                                  ? "duplicate"
                                  : ""
                          }
                        >
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select row ${item.rowNumber}`}
                              checked={selectedBatchRows[item.id] !== false}
                              disabled={
                                Boolean(item.error) ||
                                isSkippedDuplicate ||
                                batchBusy
                              }
                              onChange={(event) =>
                                setSelectedBatchRows((current) => ({
                                  ...current,
                                  [item.id]: event.target.checked,
                                }))
                              }
                            />
                          </td>
                          <td>
                            <strong>{item.filename}.png</strong>
                            <small>Row {item.rowNumber}</small>
                          </td>
                          <td>
                            {QR_CONTENT_TYPES.find(
                              (content) => content.value === item.type,
                            )?.label ?? item.type}
                          </td>
                          <td>
                            <span className="qr-row-status">{statusText}</span>
                            {message ? (
                              <small className="qr-row-error">{message}</small>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="status error" role="alert">
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="status success" role="status">
              {note}
            </p>
          ) : null}
          <div className="qr-batch-actions">
            <button
              type="button"
              className="primary"
              onClick={() => void generateBatch()}
              disabled={batchBusy || !selectedBatchCount}
            >
              {batchBusy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <FileArchive size={16} />
              )}
              {batchBusy
                ? `Generating ${batchProgress} / ${batchTotal}…`
                : `Generate selected (${selectedBatchCount})`}
            </button>
            {batchBusy ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  batchCancelRef.current = true;
                }}
              >
                <X size={15} /> Cancel
              </button>
            ) : null}
            {batchCandidates.some(
              (candidate) =>
                !candidate.error &&
                selectedBatchRows[candidate.id] !== false &&
                batchResults[candidate.id]?.status === "error",
            ) ? (
              <button
                type="button"
                className="secondary"
                onClick={() => void generateBatch(true)}
                disabled={batchBusy}
              >
                <Redo2 size={15} /> Retry selected failures
              </button>
            ) : null}
            {batchZip ? (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  downloadBlob(batchZip.blob, `${adjustedFilename}-batch.zip`)
                }
              >
                <Download size={16} /> Download ZIP ({batchZip.count})
              </button>
            ) : null}
            {batchBusy ? (
              <span className="qr-progress" role="status">
                {batchProgress} / {batchTotal} codes processed locally
              </span>
            ) : null}
          </div>

          {batchZip ? (
            <section
              className="qr-sheet-export"
              aria-label="Print sheet export"
            >
              <div>
                <span className="eyebrow">PRINT LAYOUT</span>
                <h4>Multi-code sheet</h4>
                <p className="help">
                  Arrange scan-checked images on printable pages. Large batches
                  flow across multiple pages.
                </p>
              </div>
              <div className="qr-sheet-controls">
                <SelectField
                  id="qr-sheet-paper"
                  label="Paper size"
                  value={sheetPaper}
                  onChange={(value) => setSheetPaper(value as "A4" | "Letter")}
                >
                  <option value="A4">A4 · portrait</option>
                  <option value="Letter">US Letter · portrait</option>
                </SelectField>
                <SelectField
                  id="qr-sheet-columns"
                  label="Columns"
                  value={String(sheetColumns)}
                  onChange={(value) => setSheetColumns(Number(value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value}>
                      {value} columns
                    </option>
                  ))}
                </SelectField>
                <div className="qr-field">
                  <label htmlFor="qr-sheet-margin">Page margin (mm)</label>
                  <input
                    id="qr-sheet-margin"
                    type="number"
                    min="5"
                    max="45"
                    value={sheetMargin}
                    onChange={(event) =>
                      setSheetMargin(
                        Math.min(
                          45,
                          Math.max(5, Number(event.target.value) || 5),
                        ),
                      )
                    }
                  />
                </div>
                <div className="qr-field">
                  <label htmlFor="qr-sheet-spacing">Spacing (mm)</label>
                  <input
                    id="qr-sheet-spacing"
                    type="number"
                    min="0"
                    max="20"
                    value={sheetSpacing}
                    onChange={(event) =>
                      setSheetSpacing(
                        Math.min(
                          20,
                          Math.max(0, Number(event.target.value) || 0),
                        ),
                      )
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => void downloadBatchSheet()}
                disabled={exportBusy === "sheet"}
              >
                {exportBusy === "sheet" ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <FileText size={15} />
                )}{" "}
                Download {sheetPaper} print sheet PDF
              </button>
            </section>
          ) : null}
        </div>
      )}

      <details className="qr-settings-panel" open>
        <summary>
          <Sparkles size={15} /> Design, logo & export settings
        </summary>
        <div className="qr-studio-toolbar">
          <div>
            <strong>Design studio</strong>
            <small>Undo, compare and save reusable styling</small>
          </div>
          <div className="qr-studio-actions">
            <button
              type="button"
              className="secondary compact"
              onClick={undoDesign}
              disabled={!undoStack.length}
              title="Undo the last design change"
            >
              <Undo2 size={14} /> Undo
            </button>
            <button
              type="button"
              className="secondary compact"
              onClick={redoDesign}
              disabled={!redoStack.length}
              title="Redo the last undone design change"
            >
              <Redo2 size={14} /> Redo
            </button>
            <button
              type="button"
              className="secondary compact"
              onClick={() => setShowPresetCompare((show) => !show)}
              aria-expanded={showPresetCompare}
            >
              <Palette size={14} />{" "}
              {showPresetCompare ? "Hide comparison" : "Compare presets"}
            </button>
          </div>
        </div>
        <section
          className={
            showPresetCompare ? "qr-preset-panel comparing" : "qr-preset-panel"
          }
          aria-label="QR design presets"
        >
          <div className="qr-preset-heading">
            <div>
              <span className="eyebrow">DESIGN PRESETS</span>
              <h3>Pick a visual direction</h3>
            </div>
            <small>
              {showPresetCompare
                ? "Compare color, shape and frame styles"
                : "Tap a preset to load it, then keep editing"}
            </small>
          </div>
          <div className="qr-preset-grid">
            {QR_DESIGN_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                aria-pressed={selectedPreset === preset.id}
                className={
                  selectedPreset === preset.id
                    ? "qr-preset-card active"
                    : "qr-preset-card"
                }
                onClick={() => applyDesignPreset(preset.id)}
                title={preset.description}
              >
                <span className="qr-preset-swatches" aria-hidden="true">
                  <i
                    style={{
                      background:
                        preset.options.foreground ?? options.foreground,
                    }}
                  />
                  <i
                    style={{
                      background:
                        preset.options.gradientEnd ?? options.gradientEnd,
                    }}
                  />
                  <i
                    style={{
                      background:
                        preset.options.background ?? options.background,
                    }}
                  />
                </span>
                <span>
                  <strong>{preset.label}</strong>
                  {showPresetCompare ? (
                    <small>{preset.description}</small>
                  ) : null}
                </span>
                {selectedPreset === preset.id ? <Check size={14} /> : null}
              </button>
            ))}
          </div>
        </section>
        <div className="qr-settings-layout">
          <div className="qr-form-grid qr-setting-controls">
            <SelectField
              id="qr-size"
              label="PNG size"
              value={String(options.size)}
              onChange={(value) => {
                const size = Number(value);
                setWidthDraft(String(size));
                setHeightDraft(String(size));
                changeOptions({ ...options, size, width: size, height: size });
              }}
            >
              {QR_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} × {size} px
                </option>
              ))}
            </SelectField>
            <label className="check-label qr-field-wide">
              <input
                type="checkbox"
                checked={customDimensions}
                onChange={(event) => {
                  setCustomDimensions(event.target.checked);
                  if (!event.target.checked) {
                    setWidthDraft(String(options.size));
                    setHeightDraft(String(options.size));
                    changeOptions({
                      ...options,
                      width: options.size,
                      height: options.size,
                    });
                  }
                }}
              />
              Use custom canvas dimensions
            </label>
            {customDimensions ? (
              <>
                <TextField
                  id="qr-custom-width"
                  label="Canvas width (px)"
                  type="number"
                  min="128"
                  max="4096"
                  value={widthDraft}
                  onChange={setWidthDraft}
                  onBlur={() => commitDimension("width", widthDraft)}
                />
                <TextField
                  id="qr-custom-height"
                  label="Canvas height (px)"
                  type="number"
                  min="128"
                  max="4096"
                  value={heightDraft}
                  onChange={setHeightDraft}
                  onBlur={() => commitDimension("height", heightDraft)}
                />
              </>
            ) : null}
            <SelectField
              id="qr-margin"
              label="Quiet-zone margin"
              value={String(options.margin)}
              onChange={(value) =>
                changeOptions({ ...options, margin: Number(value) })
              }
            >
              {QR_MARGINS.map((margin) => (
                <option key={margin} value={margin}>
                  {margin} modules
                </option>
              ))}
            </SelectField>
            <SelectField
              id="qr-level"
              label="Error correction"
              value={options.errorLevel}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  errorLevel: value as QrOptions["errorLevel"],
                })
              }
            >
              <option value="L">Low · smallest code</option>
              <option value="M">Medium · recommended</option>
              <option value="Q">Quartile · more recovery</option>
              <option value="H">High · logo-friendly</option>
            </SelectField>
            <SelectField
              id="qr-fill-style"
              label="Code fill style"
              value={options.fillStyle}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  fillStyle: value as QrOptions["fillStyle"],
                })
              }
            >
              <option value="solid">Solid color</option>
              <option value="gradient">Diagonal gradient</option>
            </SelectField>
            <SelectField
              id="qr-dot-style"
              label="Dot style"
              value={options.dotStyle}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  dotStyle: value as QrOptions["dotStyle"],
                })
              }
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="dots">Dots</option>
              <option value="diamond">Diamond</option>
            </SelectField>
            <SelectField
              id="qr-corner-style"
              label="Finder corner style"
              value={options.cornerStyle}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  cornerStyle: value as QrOptions["cornerStyle"],
                })
              }
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="circle">Circle</option>
            </SelectField>
            <div className="qr-field">
              <label htmlFor="qr-filename">Download filename</label>
              <input
                id="qr-filename"
                type="text"
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="quickkit-qr-code"
                maxLength={100}
              />
              <small className="help">
                Saved safely as {adjustedFilename}.*
              </small>
            </div>
            <div className="qr-field">
              <label htmlFor="qr-fg">Code color</label>
              <div className="color-field">
                <input
                  id="qr-fg"
                  aria-label="Code color"
                  type="color"
                  value={options.foreground}
                  onChange={(event) =>
                    changeOptions({
                      ...options,
                      foreground: event.target.value,
                    })
                  }
                />
                <code>{options.foreground}</code>
              </div>
              {options.fillStyle === "gradient" ? (
                <small className="help">Gradient start color</small>
              ) : null}
            </div>
            {options.fillStyle === "gradient" ? (
              <div className="qr-field">
                <label htmlFor="qr-gradient-end">Gradient end color</label>
                <div className="color-field">
                  <input
                    id="qr-gradient-end"
                    aria-label="Gradient end color"
                    type="color"
                    value={options.gradientEnd}
                    onChange={(event) =>
                      changeOptions({
                        ...options,
                        gradientEnd: event.target.value,
                      })
                    }
                  />
                  <code>{options.gradientEnd}</code>
                </div>
              </div>
            ) : null}
            <div className="qr-field">
              <label htmlFor="qr-bg">Background</label>
              <div className="color-field">
                <input
                  id="qr-bg"
                  aria-label="Background"
                  type="color"
                  value={options.background}
                  onChange={(event) =>
                    changeOptions({
                      ...options,
                      background: event.target.value,
                    })
                  }
                />
                <code>{options.background}</code>
              </div>
            </div>
            <label
              className="check-label qr-field-wide"
              title="PNG and SVG keep a solid QR quiet zone with a transparent outer margin. JPG and PDF use the selected background color."
            >
              <input
                type="checkbox"
                checked={options.transparentBackground}
                onChange={(event) =>
                  changeOptions({
                    ...options,
                    transparentBackground: event.target.checked,
                  })
                }
              />
              Transparent background
            </label>
            {options.transparentBackground ? (
              <p className="help qr-field-wide">
                The QR keeps a solid quiet zone for reliable scanning; only the
                outer margin is transparent.
              </p>
            ) : null}
            <div className="qr-field">
              <label htmlFor="qr-eye-color">Finder / eye color</label>
              <div className="color-field">
                <input
                  id="qr-eye-color"
                  aria-label="Finder eye color"
                  type="color"
                  value={options.eyeColor}
                  onChange={(event) =>
                    changeOptions({ ...options, eyeColor: event.target.value })
                  }
                />
                <code>{options.eyeColor}</code>
              </div>
            </div>
            <SelectField
              id="qr-frame-style"
              label="Frame & caption"
              value={options.frameStyle}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  frameStyle: value as QrOptions["frameStyle"],
                })
              }
            >
              {QR_FRAME_STYLES.map((style) => (
                <option value={style} key={style}>
                  {style === "none"
                    ? "No frame"
                    : style[0].toUpperCase() + style.slice(1)}
                </option>
              ))}
            </SelectField>
            {options.frameStyle !== "none" ? (
              <>
                <TextField
                  id="qr-frame-caption"
                  label="Frame caption"
                  value={options.frameCaption}
                  maxLength={40}
                  onChange={(value) =>
                    changeOptions({ ...options, frameCaption: value })
                  }
                />
                <div className="qr-field">
                  <label htmlFor="qr-frame-color">Frame color</label>
                  <div className="color-field">
                    <input
                      id="qr-frame-color"
                      aria-label="Frame color"
                      type="color"
                      value={options.frameColor}
                      onChange={(event) =>
                        changeOptions({
                          ...options,
                          frameColor: event.target.value,
                        })
                      }
                    />
                    <code>{options.frameColor}</code>
                  </div>
                </div>
                <div className="qr-field">
                  <label htmlFor="qr-frame-text-color">
                    Frame text / border
                  </label>
                  <div className="color-field">
                    <input
                      id="qr-frame-text-color"
                      aria-label="Frame text color"
                      type="color"
                      value={options.frameTextColor}
                      onChange={(event) =>
                        changeOptions({
                          ...options,
                          frameTextColor: event.target.value,
                        })
                      }
                    />
                    <code>{options.frameTextColor}</code>
                  </div>
                </div>
              </>
            ) : null}
            <p
              className={
                contrastValue < 3
                  ? "help qr-contrast low qr-field-wide"
                  : "help qr-contrast qr-field-wide"
              }
              role="status"
            >
              <ShieldCheck size={15} /> Color contrast
              {options.fillStyle === "gradient" ? " (minimum stop)" : ""}{" "}
              {contrastValue.toFixed(1)}:1{" "}
              {contrastValue < 3
                ? "— too low to generate reliably."
                : contrastValue < 4.5
                  ? "— scannable; darker-on-lighter colors work best."
                  : "— strong dark-on-light contrast."}
            </p>
            <div className="qr-palette-tools qr-field-wide">
              <strong>Saved color palettes</strong>
              <div className="qr-palette-save-row">
                <input
                  aria-label="Palette name"
                  value={paletteName}
                  maxLength={32}
                  onChange={(event) => setPaletteName(event.target.value)}
                  placeholder="Name this palette"
                />
                <button
                  type="button"
                  className="secondary compact"
                  onClick={savePalette}
                >
                  <BookmarkPlus size={14} /> Save palette
                </button>
              </div>
              {savedPalettes.length ? (
                <div className="qr-saved-palette-list">
                  {savedPalettes.map((palette) => (
                    <span className="qr-saved-palette" key={palette.id}>
                      <button
                        type="button"
                        onClick={() => applyPalette(palette)}
                        title={`Apply ${palette.name}`}
                      >
                        <i style={{ background: palette.foreground }} />
                        <i style={{ background: palette.gradientEnd }} />
                        <strong>{palette.name}</strong>
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Delete ${palette.name} palette`}
                        onClick={() => deletePalette(palette.id)}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <small className="help">
                  Your saved palettes stay in this browser.
                </small>
              )}
            </div>
          </div>

          <div className="qr-logo-controls">
            <div className="qr-logo-heading">
              <span className="qr-logo-icon">
                <ImagePlus size={17} />
              </span>
              <div>
                <strong>Add your logo</strong>
                <small>
                  Stays on this device · PNG, JPG or WebP · max 2 MB
                </small>
              </div>
            </div>
            <label className="qr-upload-button" htmlFor="qr-logo-input">
              <Upload size={15} />{" "}
              {logo ? "Replace image" : "Choose logo image"}
            </label>
            <input
              ref={fileInput}
              id="qr-logo-input"
              aria-label="Center logo or image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void chooseLogo(event.target.files?.[0])}
            />
            {logo ? (
              <div className="qr-logo-selected">
                <img src={logo.dataUrl} alt="Selected logo" />
                <span title={logo.name}>{logo.name}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Remove logo"
                  onClick={removeLogo}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : null}
            <label htmlFor="qr-logo-scale" className="qr-range-label">
              <span>Logo size</span>
              <strong>{Math.round(options.logoScale * 100)}%</strong>
            </label>
            <input
              id="qr-logo-scale"
              aria-label="Logo size"
              type="range"
              min="12"
              max="22"
              step="1"
              value={Math.round(options.logoScale * 100)}
              onChange={(event) =>
                changeOptions({
                  ...options,
                  logoScale: Number(event.target.value) / 100,
                })
              }
              disabled={!logo}
            />
            <label htmlFor="qr-logo-x" className="qr-range-label">
              <span>Horizontal position</span>
              <strong>{Math.round(options.logoX * 100)}%</strong>
            </label>
            <input
              id="qr-logo-x"
              aria-label="Logo horizontal position"
              type="range"
              min="40"
              max="60"
              step="1"
              value={Math.round(options.logoX * 100)}
              onChange={(event) =>
                changeOptions({
                  ...options,
                  logoX: Number(event.target.value) / 100,
                })
              }
              disabled={!logo}
            />
            <label htmlFor="qr-logo-y" className="qr-range-label">
              <span>Vertical position</span>
              <strong>{Math.round(options.logoY * 100)}%</strong>
            </label>
            <input
              id="qr-logo-y"
              aria-label="Logo vertical position"
              type="range"
              min="40"
              max="60"
              step="1"
              value={Math.round(options.logoY * 100)}
              onChange={(event) =>
                changeOptions({
                  ...options,
                  logoY: Number(event.target.value) / 100,
                })
              }
              disabled={!logo}
            />
            <label htmlFor="qr-logo-padding" className="qr-range-label">
              <span>Logo padding</span>
              <strong>{Math.round(options.logoPadding * 100)}%</strong>
            </label>
            <input
              id="qr-logo-padding"
              aria-label="Logo padding"
              type="range"
              min="0"
              max="35"
              step="1"
              value={Math.round(options.logoPadding * 100)}
              onChange={(event) =>
                changeOptions({
                  ...options,
                  logoPadding: Number(event.target.value) / 100,
                })
              }
              disabled={!logo}
            />
            <div className="qr-field qr-logo-background">
              <label htmlFor="qr-logo-background">Logo plate color</label>
              <div className="color-field">
                <input
                  id="qr-logo-background"
                  aria-label="Logo background color"
                  type="color"
                  value={options.logoBackground}
                  onChange={(event) =>
                    changeOptions({
                      ...options,
                      logoBackground: event.target.value,
                    })
                  }
                  disabled={!logo}
                />
                <code>{options.logoBackground}</code>
              </div>
            </div>
            <label className="check-label qr-logo-plate">
              <input
                type="checkbox"
                checked={options.logoPlate}
                onChange={(event) =>
                  changeOptions({ ...options, logoPlate: event.target.checked })
                }
                disabled={!logo}
              />{" "}
              Add quiet backing plate
            </label>
            <p className="help">
              Keep logos small and use error correction H. The generator runs a
              real local scan check on each design.
            </p>
          </div>
        </div>
      </details>

      <details className="qr-local-saves">
        <summary>
          <BookmarkPlus size={15} /> Saved on this device & history
        </summary>
        <div className="qr-local-saves-grid">
          <section>
            <h3>Saved designs</h3>
            <p className="help">
              Style only — QR content and logo files are not included.
            </p>
            <div className="qr-saved-design-form">
              <input
                aria-label="Design name"
                value={savedDesignName}
                maxLength={40}
                onChange={(event) => setSavedDesignName(event.target.value)}
                placeholder="Name this design"
              />
              <button
                type="button"
                className="secondary compact"
                onClick={saveDesign}
              >
                <BookmarkPlus size={14} /> Save design
              </button>
            </div>
            {savedDesigns.length ? (
              <ul className="qr-saved-design-list">
                {savedDesigns.map((design) => (
                  <li key={design.id}>
                    <button
                      type="button"
                      className="qr-restore-button"
                      onClick={() => restoreDesign(design)}
                    >
                      {design.name}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete ${design.name} design`}
                      onClick={() => deleteDesign(design.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="help">No saved designs yet.</p>
            )}
          </section>
          <section>
            <div className="qr-history-heading">
              <div>
                <h3>Recent projects</h3>
                <p className="help">
                  Opt in to store up to 8 QR payloads on this device. This may
                  include private details such as Wi-Fi passwords.
                </p>
              </div>
              <History size={18} />
            </div>
            <label className="check-label qr-history-toggle">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={(event) =>
                  setLocalHistoryEnabled(event.target.checked)
                }
              />{" "}
              Save recent QR history locally
            </label>
            {recentProjects.length ? (
              <>
                <ul className="qr-history-list">
                  {recentProjects.map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        className="qr-restore-button"
                        onClick={() => restoreRecentProject(project)}
                      >
                        <strong>
                          {QR_CONTENT_TYPES.find(
                            (item) => item.value === project.type,
                          )?.label ?? "QR"}
                        </strong>
                        <small>
                          {new Date(project.savedAt).toLocaleString()}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="qr-text-action qr-clear-history"
                  onClick={clearRecentProjects}
                >
                  <Trash2 size={14} /> Clear saved history…
                </button>
              </>
            ) : (
              <p className="help">
                {historyEnabled
                  ? "Generated projects will appear here."
                  : "History is off; new QR content is not stored."}
              </p>
            )}
          </section>
        </div>
      </details>

      {mode === "batch" ? (
        <details className="qr-settings-panel qr-batch-settings">
          <summary>
            <Sparkles size={15} /> Batch design settings
          </summary>
          <p className="help">
            Size, quiet zone, error correction, colors, logo and download
            filename are shared with single-code settings above.
          </p>
        </details>
      ) : null}

      {note && mode === "single" ? (
        <p className="status success qr-bottom-status" role="status">
          {note}
        </p>
      ) : null}
      {mode === "batch" ? (
        <div className="qr-batch-limits">
          <FileImage size={15} /> Each QR is PNG inside one ZIP. Batches contain
          up to {MAX_BATCH_ITEMS} items and run entirely in your browser.
        </div>
      ) : null}
      {previewZoom && preview ? (
        <div
          className="qr-preview-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewZoom(false);
          }}
        >
          <div
            className="qr-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Large QR preview"
          >
            <div className="qr-preview-modal-header">
              <div>
                <span className="eyebrow">SCAN-CHECKED PREVIEW</span>
                <h2>{adjustedFilename}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close zoomed preview"
                onClick={() => setPreviewZoom(false)}
              >
                <Minimize2 size={18} />
              </button>
            </div>
            <img src={preview.pngDataUrl} alt="Zoomed generated QR code" />
            <p>
              Use this enlarged view to inspect the quiet zone and logo.
              Download the original-resolution file from the preview card.
            </p>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
