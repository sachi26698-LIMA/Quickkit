"use client";

/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  FileCheck2,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  LockKeyhole,
  LockOpen,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Shrink,
  Target,
  Trash2,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";

import { useHydrated } from "@/lib/use-hydrated";
import type {
  PdfCompressionAnalysis,
  PdfCompressionProgress,
  PdfCompressionSettings,
  PdfCompressionStats,
  PdfCompressionPresetId,
  PdfTargetSizeUnit,
} from "@/lib/tools/pdf/compress-pdf-logic";
import {
  PDF_COMPRESSION_PRESETS,
  PDF_COMPRESS_LIMITS,
  compressionBlocker,
  compressionFeatureWarnings,
  defaultCompressedFilename,
  formatSavingsPercent,
  makeUniqueFilenames,
  normalizeCompressionSettings,
  parseTargetSize,
  presetSettings,
  validatePdfCompressionCandidate,
} from "@/lib/tools/pdf/compress-pdf-logic";
import {
  PdfMergeError,
  formatMiB,
  hashPdfBytes,
  sanitizeOutputFilename,
  type PdfInspection,
  type PdfMergeIssueCode,
} from "@/lib/tools/pdf/merge-pdf-logic";
import {
  renderPdfResultPreview,
  renderPdfThumbnail,
} from "@/lib/tools/pdf/pdf-preview";
import {
  buildZipFilename,
  createStoredZip,
} from "@/lib/tools/pdf/split-pdf-logic";
import { usePdfCompressWorker } from "@/lib/tools/pdf/use-pdf-compress-worker";
import { EmptyState, WorkspaceHeading } from "./tool-ui";

type EntryStatus = "blocked" | "error" | "inspecting" | "password" | "ready";
type ThumbnailState = "idle" | "loading" | "ready" | "unavailable";
type PreviewState = "error" | "idle" | "loading" | "ready";

interface EntryResult {
  blob: Blob;
  data: ArrayBuffer;
  notices: string[];
  originalBytes: number;
  outputBytes: number;
  pageCount: number;
  previewState: PreviewState;
  previewUrl?: string;
  settingsUsed: PdfCompressionSettings;
  stats: PdfCompressionStats;
  url: string;
}

interface CompressEntry {
  analysis?: PdfCompressionAnalysis;
  compressionError?: string;
  contentHash?: string;
  error?: string;
  errorCode?: PdfMergeIssueCode;
  file: File;
  id: string;
  inspection?: PdfInspection;
  name: string;
  outputName: string;
  password?: string;
  passwordNotice?: string;
  result?: EntryResult;
  size: number;
  status: EntryStatus;
  thumbnailState: ThumbnailState;
  thumbnailUrl?: string;
}

interface IntakeIssue {
  id: string;
  message: string;
  name: string;
}

interface ProgressState extends PdfCompressionProgress {
  fileIndex: number;
  percent: number;
  totalFiles: number;
}

interface ZipState {
  size: number;
  url: string;
}

function createEntry(file: File): CompressEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `pdf-compress-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    file,
    id,
    name: file.name,
    outputName: defaultCompressedFilename(file.name).replace(/\.pdf$/i, ""),
    size: file.size,
    status: "inspecting",
    thumbnailState: "idle",
  };
}

function stagePercent(progress: PdfCompressionProgress): number {
  const fraction =
    progress.total > 0
      ? Math.min(1, Math.max(0, progress.current / progress.total))
      : 0;
  if (progress.stage === "analyzing" || progress.stage === "preparing") {
    return 6;
  }
  if (progress.stage === "images") return Math.round(10 + fraction * 48);
  if (progress.stage === "lossless") return Math.round(60 + fraction * 22);
  if (progress.stage === "saving") return 88;
  if (progress.stage === "validating") return 95;
  return 99;
}

function geometryLabel(inspection: PdfInspection): string {
  const { height, rotation, width } = inspection.firstPage;
  const rotationText = rotation ? ` · ${rotation}°` : "";
  return `${Math.round(width)} × ${Math.round(height)} pt${rotationText}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "This PDF could not be processed locally. Remove it and try a fresh export from your PDF app.";
}

function statusLabel(entry: CompressEntry): string {
  if (entry.result) {
    return entry.result.stats.unchanged ? "Original retained" : "Compressed";
  }
  if (entry.compressionError) return "Compression failed";
  switch (entry.status) {
    case "blocked":
      return "Blocked";
    case "error":
      return "Needs attention";
    case "inspecting":
      return "Inspecting";
    case "password":
      return "Password needed";
    case "ready":
      return "Ready";
  }
}

function entryWarnings(entry: CompressEntry): string[] {
  if (!entry.inspection) return [];
  const warnings = compressionFeatureWarnings(entry.inspection.features);
  if (entry.inspection.encrypted) {
    warnings.push(
      "If a smaller validated rewrite is produced, it will not be password-protected. Protect sensitive results again in your PDF editor.",
    );
  }
  if (entry.analysis) {
    if (entry.analysis.imageCount === 0) {
      warnings.push(
        "No embedded raster images were found. Savings will mainly come from lossless stream and object compression, so a text/vector PDF may already be near its safe minimum.",
      );
    } else if (entry.analysis.unsupportedImageCount > 0) {
      warnings.push(
        `${entry.analysis.unsupportedImageCount.toLocaleString()} image${entry.analysis.unsupportedImageCount === 1 ? "" : "s"} use a format, color space, transparency model or size that this local engine will keep unchanged for safety.`,
      );
    }
  }
  return warnings;
}

export default function PdfCompressor() {
  const ready = useHydrated();
  const worker = usePdfCompressWorker();
  const [entries, setEntries] = useState<CompressEntry[]>([]);
  const [intakeIssues, setIntakeIssues] = useState<IntakeIssue[]>([]);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [queueAnnouncement, setQueueAnnouncement] = useState("");
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {},
  );
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  const [preset, setPreset] = useState<PdfCompressionPresetId>("medium");
  const [qualityPercent, setQualityPercent] = useState(78);
  const [maxImageDimension, setMaxImageDimension] = useState(2400);
  const [recompressImages, setRecompressImages] = useState(true);
  const [grayscaleImages, setGrayscaleImages] = useState(false);
  const [targetEnabled, setTargetEnabled] = useState(false);
  const [targetValue, setTargetValue] = useState("2");
  const [targetUnit, setTargetUnit] = useState<PdfTargetSizeUnit>("MiB");
  const [zipName, setZipName] = useState("compressed-pdfs");

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [processingEntryId, setProcessingEntryId] = useState<string | null>(
    null,
  );
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [batchNotice, setBatchNotice] = useState("");
  const [batchError, setBatchError] = useState("");
  const [zipState, setZipState] = useState<ZipState | null>(null);
  const [zipError, setZipError] = useState("");

  const entriesModelRef = useRef<CompressEntry[]>([]);
  const trackedUrlsRef = useRef(new Set<string>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const batchErrorRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const entryTokensRef = useRef(new Map<string, number>());
  const resultPreviewTokensRef = useRef(new Map<string, number>());
  const inspectionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const thumbnailQueueRef = useRef<Promise<void>>(Promise.resolve());
  const intakeEpochRef = useRef(0);
  const compressionVersionRef = useRef(0);
  const compressionStartedAtRef = useRef(0);
  const zipRef = useRef<ZipState | null>(null);

  const syncEntries = useCallback(() => {
    setEntries([...entriesModelRef.current]);
  }, []);

  const replaceEntries = useCallback(
    (next: CompressEntry[]) => {
      entriesModelRef.current = next;
      syncEntries();
      setSelectedEntryId((current) =>
        current && next.some((entry) => entry.id === current)
          ? current
          : (next[0]?.id ?? null),
      );
    },
    [syncEntries],
  );

  const updateEntry = useCallback(
    (
      id: string,
      patch:
        | Partial<CompressEntry>
        | ((entry: CompressEntry) => Partial<CompressEntry>),
    ): CompressEntry | undefined => {
      const index = entriesModelRef.current.findIndex(
        (entry) => entry.id === id,
      );
      if (index < 0) return undefined;
      const current = entriesModelRef.current[index];
      const next = {
        ...current,
        ...(typeof patch === "function" ? patch(current) : patch),
      };
      entriesModelRef.current[index] = next;
      syncEntries();
      return next;
    },
    [syncEntries],
  );

  const createTrackedUrl = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    trackedUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeTrackedUrl = useCallback((url?: string) => {
    if (!url || !trackedUrlsRef.current.has(url)) return;
    trackedUrlsRef.current.delete(url);
    URL.revokeObjectURL(url);
  }, []);

  const revokeEntryUrls = useCallback(
    (entry: CompressEntry) => {
      revokeTrackedUrl(entry.thumbnailUrl);
      if (entry.result) {
        revokeTrackedUrl(entry.result.url);
        revokeTrackedUrl(entry.result.previewUrl);
      }
    },
    [revokeTrackedUrl],
  );

  const clearZip = useCallback(() => {
    if (zipRef.current) revokeTrackedUrl(zipRef.current.url);
    zipRef.current = null;
    setZipState(null);
    setZipError("");
  }, [revokeTrackedUrl]);

  const clearAllResults = useCallback(() => {
    let changed = false;
    entriesModelRef.current = entriesModelRef.current.map((entry) => {
      if (!entry.result && !entry.compressionError) return entry;
      changed = true;
      if (entry.result) {
        revokeTrackedUrl(entry.result.url);
        revokeTrackedUrl(entry.result.previewUrl);
      }
      return { ...entry, compressionError: undefined, result: undefined };
    });
    if (changed) syncEntries();
    clearZip();
    setBatchError("");
    setBatchNotice("");
  }, [clearZip, revokeTrackedUrl, syncEntries]);

  const markSettingsChanged = useCallback(() => {
    compressionVersionRef.current += 1;
    clearAllResults();
  }, [clearAllResults]);

  const nextEntryToken = useCallback((id: string): number => {
    const next = (entryTokensRef.current.get(id) ?? 0) + 1;
    entryTokensRef.current.set(id, next);
    return next;
  }, []);

  const entryTokenIsCurrent = useCallback(
    (id: string, token: number): boolean =>
      entryTokensRef.current.get(id) === token &&
      entriesModelRef.current.some((entry) => entry.id === id),
    [],
  );

  useEffect(() => {
    const urls = trackedUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!isCompressing) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - compressionStartedAtRef.current) / 1000),
        ),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [isCompressing]);

  const loadThumbnailNow = useCallback(
    async (id: string) => {
      const entry = entriesModelRef.current.find((item) => item.id === id);
      if (
        !entry ||
        entry.status === "error" ||
        entry.status === "inspecting" ||
        entry.status === "password"
      ) {
        return;
      }
      const token = entryTokensRef.current.get(id) ?? 0;
      updateEntry(id, { thumbnailState: "loading" });
      try {
        const data = await entry.file.arrayBuffer();
        const blob = await renderPdfThumbnail(
          new Uint8Array(data),
          entry.password,
          0,
        );
        if (!entryTokenIsCurrent(id, token)) return;
        const url = createTrackedUrl(blob);
        const current = entriesModelRef.current.find((item) => item.id === id);
        if (!current) {
          revokeTrackedUrl(url);
          return;
        }
        revokeTrackedUrl(current.thumbnailUrl);
        updateEntry(id, { thumbnailState: "ready", thumbnailUrl: url });
      } catch {
        if (entryTokenIsCurrent(id, token)) {
          updateEntry(id, {
            thumbnailState: "unavailable",
            thumbnailUrl: undefined,
          });
        }
      }
    },
    [createTrackedUrl, entryTokenIsCurrent, revokeTrackedUrl, updateEntry],
  );

  const queueThumbnail = useCallback(
    (id: string) => {
      const run = thumbnailQueueRef.current
        .catch(() => undefined)
        .then(() => loadThumbnailNow(id));
      thumbnailQueueRef.current = run.catch(() => undefined);
    },
    [loadThumbnailNow],
  );

  const inspectEntryNow = useCallback(
    async (
      id: string,
      passwordOverride?: string,
      passwordWasExplicit = false,
    ) => {
      const initial = entriesModelRef.current.find((entry) => entry.id === id);
      if (!initial) return;
      const token = nextEntryToken(id);
      const epoch = intakeEpochRef.current;
      updateEntry(id, {
        compressionError: undefined,
        error: undefined,
        errorCode: undefined,
        status: "inspecting",
        thumbnailState: "idle",
      });

      try {
        const data = await initial.file.arrayBuffer();
        if (
          !entryTokenIsCurrent(id, token) ||
          epoch !== intakeEpochRef.current
        ) {
          return;
        }
        const contentHash = await hashPdfBytes(new Uint8Array(data.slice(0)));
        if (
          !entryTokenIsCurrent(id, token) ||
          epoch !== intakeEpochRef.current
        ) {
          return;
        }
        updateEntry(id, { contentHash });

        const password = passwordWasExplicit
          ? passwordOverride
          : initial.password;
        const { analysis, inspection } = await worker.inspect(data, password);
        if (
          !entryTokenIsCurrent(id, token) ||
          epoch !== intakeEpochRef.current
        ) {
          return;
        }

        const blocker = compressionBlocker(inspection.features);
        const effectivePassword = inspection.encrypted
          ? (password ?? "")
          : undefined;
        updateEntry(id, {
          analysis,
          error: blocker,
          errorCode: blocker
            ? inspection.features.hasXFA
              ? "unsupported_xfa"
              : "signed_pdf"
            : undefined,
          inspection,
          password: effectivePassword,
          passwordNotice: undefined,
          status: blocker ? "blocked" : "ready",
        });
        queueThumbnail(id);
      } catch (error) {
        if (
          !entryTokenIsCurrent(id, token) ||
          epoch !== intakeEpochRef.current
        ) {
          return;
        }
        if (error instanceof PdfMergeError && error.code === "cancelled") {
          return;
        }
        if (
          error instanceof PdfMergeError &&
          (error.code === "password_required" ||
            error.code === "password_invalid")
        ) {
          updateEntry(id, {
            error: error.message,
            errorCode: error.code,
            password: undefined,
            passwordNotice:
              error.code === "password_invalid"
                ? "The password field has been cleared. Enter the open password again when you are ready."
                : undefined,
            status: "password",
          });
          return;
        }
        updateEntry(id, {
          error: errorMessage(error),
          errorCode:
            error instanceof PdfMergeError
              ? error.code
              : "corrupt_or_unsupported",
          password: undefined,
          status: "error",
        });
      }
    },
    [entryTokenIsCurrent, nextEntryToken, queueThumbnail, updateEntry, worker],
  );

  const enqueueInspectionTask = useCallback(
    (task: () => Promise<void>): Promise<void> => {
      const holder: { promise?: Promise<void> } = {};
      holder.promise = inspectionQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          setIntakeBusy(true);
          try {
            await task();
          } finally {
            if (inspectionQueueRef.current === holder.promise) {
              setIntakeBusy(false);
            }
          }
        });
      inspectionQueueRef.current = holder.promise;
      return holder.promise;
    },
    [],
  );

  const addFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      const files = fileList ? [...fileList] : [];
      if (files.length === 0) return;
      setConfirmClear(false);
      setBatchError("");

      void enqueueInspectionTask(async () => {
        const epoch = intakeEpochRef.current;
        const newIssues: IntakeIssue[] = [];
        for (const file of files) {
          if (epoch !== intakeEpochRef.current) break;
          const currentTotal = entriesModelRef.current.reduce(
            (sum, entry) => sum + entry.size,
            0,
          );
          const validationError = validatePdfCompressionCandidate(
            file,
            entriesModelRef.current.length,
            currentTotal,
          );
          if (validationError) {
            newIssues.push({
              id: `${file.name}-${file.size}-${file.lastModified}-${newIssues.length}`,
              message: validationError.message,
              name: file.name,
            });
            continue;
          }
          const entry = createEntry(file);
          replaceEntries([...entriesModelRef.current, entry]);
          setSelectedEntryId(entry.id);
          await inspectEntryNow(entry.id);
        }
        if (newIssues.length > 0) {
          setIntakeIssues((previous) => [...previous, ...newIssues]);
        }
      });
    },
    [enqueueInspectionTask, inspectEntryNow, replaceEntries],
  );

  const duplicateByEntry = useMemo(() => {
    const firstIndexByHash = new Map<string, number>();
    const duplicates = new Map<string, number>();
    entries.forEach((entry, index) => {
      if (!entry.contentHash) return;
      const first = firstIndexByHash.get(entry.contentHash);
      if (first === undefined) firstIndexByHash.set(entry.contentHash, index);
      else duplicates.set(entry.id, first);
    });
    return duplicates;
  }, [entries]);

  const settingsState = useMemo((): {
    error?: string;
    settings?: PdfCompressionSettings;
  } => {
    try {
      return {
        settings: normalizeCompressionSettings({
          grayscaleImages,
          imageQuality: qualityPercent / 100,
          maxImageDimension,
          preset,
          recompressImages,
          ...(targetEnabled
            ? { targetBytes: parseTargetSize(targetValue, targetUnit) }
            : {}),
        }),
      };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }, [
    grayscaleImages,
    maxImageDimension,
    preset,
    qualityPercent,
    recompressImages,
    targetEnabled,
    targetUnit,
    targetValue,
  ]);

  const readyEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.status === "ready" && entry.inspection && entry.analysis,
      ),
    [entries],
  );
  const pendingEntries = useMemo(
    () => readyEntries.filter((entry) => !entry.result),
    [readyEntries],
  );
  const successfulEntries = useMemo(
    () => entries.filter((entry) => entry.result),
    [entries],
  );
  const excludedEntries = useMemo(
    () => entries.filter((entry) => entry.status !== "ready"),
    [entries],
  );
  const resultFilenameByEntry = useMemo(() => {
    const unique = makeUniqueFilenames(
      successfulEntries.map((entry) =>
        sanitizeOutputFilename(entry.outputName, "compressed-pdf"),
      ),
    );
    return new Map(
      successfulEntries.map((entry, index) => [entry.id, unique[index]]),
    );
  }, [successfulEntries]);

  const refreshZip = useCallback(() => {
    const successes = entriesModelRef.current.filter((entry) => entry.result);
    clearZip();
    if (successes.length < 2) return;
    try {
      const filenames = makeUniqueFilenames(
        successes.map((entry) =>
          sanitizeOutputFilename(entry.outputName, "compressed-pdf"),
        ),
      );
      const zipBytes = createStoredZip(
        successes.map((entry, index) => ({
          bytes: new Uint8Array(entry.result!.data),
          name: filenames[index],
        })),
      );
      const blob = new Blob(
        [
          zipBytes.buffer.slice(
            zipBytes.byteOffset,
            zipBytes.byteOffset + zipBytes.byteLength,
          ) as ArrayBuffer,
        ],
        { type: "application/zip" },
      );
      const next = { size: blob.size, url: createTrackedUrl(blob) };
      zipRef.current = next;
      setZipState(next);
    } catch (error) {
      setZipError(
        error instanceof Error
          ? error.message
          : "The ZIP could not be prepared locally. Download the PDFs individually instead.",
      );
    }
  }, [clearZip, createTrackedUrl]);

  const totalInputBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const totalReadyPages = readyEntries.reduce(
    (sum, entry) => sum + (entry.inspection?.pageCount ?? 0),
    0,
  );
  const successfulOriginalBytes = successfulEntries.reduce(
    (sum, entry) => sum + entry.size,
    0,
  );
  const successfulOutputBytes = successfulEntries.reduce(
    (sum, entry) => sum + (entry.result?.outputBytes ?? 0),
    0,
  );
  const pendingSourceBytes = pendingEntries.reduce(
    (sum, entry) => sum + entry.size,
    0,
  );

  const runBlockers = useMemo(() => {
    const items: string[] = [];
    if (entries.length === 0) items.push("Add at least one PDF to compress.");
    if (settingsState.error) items.push(settingsState.error);
    if (entries.length > 0 && pendingEntries.length === 0) {
      items.push(
        successfulEntries.length > 0
          ? "Every ready PDF in this queue has a result. Change settings or add another PDF to run again."
          : "Unlock, fix or remove the PDFs that are not ready; ready files are never mixed with silent skips.",
      );
    }
    if (totalReadyPages > PDF_COMPRESS_LIMITS.maxTotalPages) {
      items.push(
        `This queue contains ${totalReadyPages.toLocaleString()} ready pages, above the ${PDF_COMPRESS_LIMITS.maxTotalPages.toLocaleString()}-page batch limit. Remove a PDF or split the batch.`,
      );
    }
    if (
      successfulOutputBytes + pendingSourceBytes >
      PDF_COMPRESS_LIMITS.maxGeneratedBytes
    ) {
      items.push(
        `Keeping every result for download could exceed the ${formatMiB(PDF_COMPRESS_LIMITS.maxGeneratedBytes)} local output limit. Download current results, start a new batch, or remove a large PDF.`,
      );
    }
    return items;
  }, [
    entries.length,
    pendingEntries.length,
    pendingSourceBytes,
    settingsState.error,
    successfulEntries.length,
    successfulOutputBytes,
    totalReadyPages,
  ]);

  const canCompress =
    ready &&
    !isCompressing &&
    !intakeBusy &&
    pendingEntries.length > 0 &&
    runBlockers.length === 0 &&
    Boolean(settingsState.settings);

  const selectedEntry =
    entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];

  function applyPreset(
    nextPreset: Exclude<PdfCompressionPresetId, "custom">,
  ): void {
    markSettingsChanged();
    const next = presetSettings(nextPreset);
    setPreset(nextPreset);
    setQualityPercent(Math.round(next.imageQuality * 100));
    setMaxImageDimension(next.maxImageDimension);
    setRecompressImages(true);
  }

  function removeEntry(id: string): void {
    const current = entriesModelRef.current;
    const index = current.findIndex((entry) => entry.id === id);
    const entry = current[index];
    if (!entry) return;
    nextEntryToken(id);
    resultPreviewTokensRef.current.set(
      id,
      (resultPreviewTokensRef.current.get(id) ?? 0) + 1,
    );
    revokeEntryUrls(entry);
    const next = current.filter((item) => item.id !== id);
    replaceEntries(next);
    setPasswordDrafts((previous) => {
      const copy = { ...previous };
      delete copy[id];
      return copy;
    });
    setQueueAnnouncement(
      `${entry.name} removed. ${next.length} PDF${next.length === 1 ? "" : "s"} remain.`,
    );
    refreshZip();
  }

  function resetWorkspace(focusAddButton = false): void {
    compressionVersionRef.current += 1;
    intakeEpochRef.current += 1;
    entriesModelRef.current.forEach((entry) => {
      nextEntryToken(entry.id);
      resultPreviewTokensRef.current.set(
        entry.id,
        (resultPreviewTokensRef.current.get(entry.id) ?? 0) + 1,
      );
      revokeEntryUrls(entry);
    });
    replaceEntries([]);
    clearZip();
    setPasswordDrafts({});
    setVisiblePasswords({});
    setConfirmClear(false);
    setBatchError("");
    setBatchNotice("");
    setQueueAnnouncement("All PDFs removed. Add a PDF to start again.");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (focusAddButton) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>("[data-pdf-compress-add-button]")
          ?.focus(),
      );
    }
  }

  function retryInspection(id: string): void {
    void enqueueInspectionTask(() => inspectEntryNow(id));
  }

  async function unlockEntry(id: string, password: string): Promise<void> {
    setPasswordDrafts((previous) => ({ ...previous, [id]: "" }));
    await enqueueInspectionTask(() => inspectEntryNow(id, password, true));
  }

  const loadResultPreview = useCallback(
    async (id: string) => {
      const entry = entriesModelRef.current.find((item) => item.id === id);
      if (
        !entry?.result ||
        entry.result.previewState === "ready" ||
        entry.result.previewState === "loading"
      ) {
        return;
      }
      const token = (resultPreviewTokensRef.current.get(id) ?? 0) + 1;
      resultPreviewTokensRef.current.set(id, token);
      updateEntry(id, (current) =>
        current.result
          ? {
              result: {
                ...current.result,
                previewState: "loading" as PreviewState,
              },
            }
          : {},
      );
      try {
        const data = await entry.result.blob.arrayBuffer();
        const blob = await renderPdfResultPreview(new Uint8Array(data), 0);
        if (
          resultPreviewTokensRef.current.get(id) !== token ||
          !entriesModelRef.current.some((item) => item.id === id)
        ) {
          return;
        }
        const url = createTrackedUrl(blob);
        const current = entriesModelRef.current.find((item) => item.id === id);
        if (!current?.result) {
          revokeTrackedUrl(url);
          return;
        }
        revokeTrackedUrl(current.result.previewUrl);
        updateEntry(id, (item) =>
          item.result
            ? {
                result: {
                  ...item.result,
                  previewState: "ready" as PreviewState,
                  previewUrl: url,
                },
              }
            : {},
        );
      } catch {
        if (resultPreviewTokensRef.current.get(id) === token) {
          updateEntry(id, (current) =>
            current.result
              ? {
                  result: {
                    ...current.result,
                    previewState: "error" as PreviewState,
                    previewUrl: undefined,
                  },
                }
              : {},
          );
        }
      }
    },
    [createTrackedUrl, revokeTrackedUrl, updateEntry],
  );

  function selectEntry(id: string): void {
    setSelectedEntryId(id);
    const entry = entriesModelRef.current.find((item) => item.id === id);
    if (entry?.result) void loadResultPreview(id);
  }

  function applyCompressionError(id: string, error: unknown): void {
    if (
      error instanceof PdfMergeError &&
      (error.code === "password_required" || error.code === "password_invalid")
    ) {
      updateEntry(id, {
        compressionError: undefined,
        error: error.message,
        errorCode: error.code,
        password: undefined,
        status: "password",
      });
      return;
    }
    if (
      error instanceof PdfMergeError &&
      (error.code === "signed_pdf" || error.code === "unsupported_xfa")
    ) {
      updateEntry(id, {
        compressionError: undefined,
        error: error.message,
        errorCode: error.code,
        status: "blocked",
      });
      return;
    }
    updateEntry(id, { compressionError: errorMessage(error) });
  }

  async function compressPending(onlyEntryId?: string): Promise<void> {
    const settings = settingsState.settings;
    if (!settings || !canCompress) return;
    const queue = entriesModelRef.current.filter(
      (entry) =>
        entry.status === "ready" &&
        !entry.result &&
        (!onlyEntryId || entry.id === onlyEntryId),
    );
    if (queue.length === 0) return;

    const version = ++compressionVersionRef.current;
    compressionStartedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setIsCompressing(true);
    setBatchError("");
    setBatchNotice("");
    setConfirmClear(false);

    let completed = 0;
    let failed = 0;
    let cancelled = false;

    try {
      for (let index = 0; index < queue.length; index += 1) {
        const queued = queue[index];
        const current = entriesModelRef.current.find(
          (entry) => entry.id === queued.id,
        );
        if (!current || current.status !== "ready" || current.result) continue;
        setProcessingEntryId(current.id);
        setSelectedEntryId(current.id);
        updateEntry(current.id, { compressionError: undefined });
        setProgress({
          current: 0,
          fileIndex: index,
          fileName: current.name,
          message: "Preparing this PDF",
          percent: Math.round((index / queue.length) * 100),
          stage: "preparing",
          total: 1,
          totalFiles: queue.length,
        });

        try {
          const data = await current.file.arrayBuffer();
          if (version !== compressionVersionRef.current) {
            cancelled = true;
            break;
          }
          const result = await worker.compress(
            data,
            current.name,
            settings,
            current.password,
            (workerProgress) => {
              if (version !== compressionVersionRef.current) return;
              const withinFile = stagePercent(workerProgress);
              setProgress({
                ...workerProgress,
                fileIndex: index,
                percent: Math.min(
                  99,
                  Math.round(((index + withinFile / 100) / queue.length) * 100),
                ),
                totalFiles: queue.length,
              });
            },
          );
          if (version !== compressionVersionRef.current) {
            cancelled = true;
            break;
          }

          const blob = new Blob([result.data], { type: "application/pdf" });
          const url = createTrackedUrl(blob);
          const keepPassword = Boolean(
            result.stats.unchanged && result.inspection.encrypted,
          );
          updateEntry(current.id, {
            compressionError: undefined,
            password: keepPassword ? current.password : undefined,
            passwordNotice: keepPassword
              ? "The original encrypted file was retained, so its password remains available only for another local attempt in this tab."
              : result.inspection.encrypted
                ? "Password cleared from this tab after the validated unencrypted result was created."
                : undefined,
            result: {
              blob,
              data: result.data,
              notices: result.notices,
              originalBytes: result.originalBytes,
              outputBytes: result.outputBytes,
              pageCount: result.pageCount,
              previewState: "idle",
              settingsUsed: result.settingsUsed,
              stats: result.stats,
              url,
            },
          });
          completed += 1;
        } catch (error) {
          if (error instanceof PdfMergeError && error.code === "cancelled") {
            cancelled = true;
            break;
          }
          failed += 1;
          applyCompressionError(current.id, error);
        }
      }
    } finally {
      if (version === compressionVersionRef.current) {
        setIsCompressing(false);
        setProcessingEntryId(null);
        setProgress(null);
        refreshZip();
        if (cancelled) {
          setBatchNotice(
            completed > 0
              ? `Compression cancelled after ${completed} completed PDF${completed === 1 ? "" : "s"}. Completed downloads are still available below; the remaining queue is unchanged.`
              : "Compression cancelled. Your queue and settings are unchanged.",
          );
        } else if (completed > 0 && failed > 0) {
          setBatchError(
            `${completed} PDF${completed === 1 ? "" : "s"} finished and ${failed} failed. Successful downloads are ready below; each failed file keeps its specific recovery message in the queue.`,
          );
          requestAnimationFrame(() => batchErrorRef.current?.focus());
        } else if (completed > 0) {
          setBatchNotice(
            `${completed} PDF${completed === 1 ? "" : "s"} compressed and validated locally. Review the size and quality notes before downloading.`,
          );
          requestAnimationFrame(() => resultHeadingRef.current?.focus());
          const firstCompleted = entriesModelRef.current.find(
            (entry) => entry.result,
          );
          if (firstCompleted) void loadResultPreview(firstCompleted.id);
        } else if (failed > 0) {
          setBatchError(
            "No PDF finished compression. The queue is unchanged; use the file-specific message to fix or remove each PDF and try again.",
          );
          requestAnimationFrame(() => batchErrorRef.current?.focus());
        }
      }
    }
  }

  function cancelCompression(): void {
    compressionVersionRef.current += 1;
    worker.cancel();
    setIsCompressing(false);
    setProcessingEntryId(null);
    setProgress(null);
    setBatchNotice(
      "Compression cancelled. Completed downloads, if any, remain available and the rest of the queue is unchanged.",
    );
  }

  const controlsLocked = !ready || isCompressing;
  const zipFilename = buildZipFilename(
    zipName || "compressed-pdfs",
    "compressed-pdfs",
  );
  const hasQualityWarning =
    recompressImages && (qualityPercent <= 64 || maxImageDimension <= 1800);
  const currentStep =
    successfulEntries.length > 0 ? 3 : entries.length > 0 ? 2 : 1;

  return (
    <fieldset
      className="workspace pdf-merger-workspace pdf-compressor-workspace"
      disabled={!ready}
      aria-label="PDF compressor workspace"
    >
      <WorkspaceHeading
        title="Smaller PDFs. Same pages."
        description="Batch-compress PDFs locally with honest size results, image-quality controls and validated downloads."
      />

      <div className="pdf-privacy-banner" role="note">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>Your PDFs never leave this browser.</strong>
          <p>
            Inspection, passwords, compression, previews and ZIP packaging run
            locally on your device. No PDF, file name, password or compressed
            output is uploaded to QUICKKIT or any external server.
          </p>
        </div>
      </div>

      <div className="pdf-steps" aria-label="Compression progress steps">
        <span className={currentStep > 1 ? "done" : "current"}>
          1 · Add PDFs
        </span>
        <span
          className={
            currentStep > 2 ? "done" : currentStep === 2 ? "current" : ""
          }
        >
          2 · Choose compression
        </span>
        <span className={currentStep === 3 ? "done" : ""}>3 · Download</span>
      </div>

      <label htmlFor="pdf-compress-input">Choose PDFs</label>
      <div
        className={`dropzone pdf-dropzone${draggingFiles ? " dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          dragCounterRef.current += 1;
          setDraggingFiles(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
          if (dragCounterRef.current === 0) setDraggingFiles(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragCounterRef.current = 0;
          setDraggingFiles(false);
          if (!controlsLocked) addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={30} aria-hidden="true" />
        <p>
          <strong>Drop PDFs here</strong> or choose them from your device.
          Compress a batch with one shared quality setting, then download each
          PDF or a ZIP.
        </p>
        <input
          ref={fileInputRef}
          id="pdf-compress-input"
          className="pdf-file-input"
          type="file"
          tabIndex={-1}
          accept="application/pdf,.pdf"
          multiple
          aria-describedby="pdf-compress-limits"
          disabled={controlsLocked}
          onChange={(event) => {
            addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          className="primary"
          data-pdf-compress-add-button
          disabled={controlsLocked}
          onClick={() => fileInputRef.current?.click()}
        >
          <FilePlus2 size={17} /> Add PDFs
        </button>
      </div>
      <p id="pdf-compress-limits" className="help">
        PDF only · up to {PDF_COMPRESS_LIMITS.maxFiles} files ·{" "}
        {formatMiB(PDF_COMPRESS_LIMITS.maxFileBytes)} per file ·{" "}
        {formatMiB(PDF_COMPRESS_LIMITS.maxTotalBytes)} batch input · up to{" "}
        {PDF_COMPRESS_LIMITS.maxPagesPerFile.toLocaleString()} pages per file
        and {PDF_COMPRESS_LIMITS.maxTotalPages.toLocaleString()} ready pages per
        batch. Every file is named if it cannot be included.
      </p>

      {intakeIssues.length > 0 ? (
        <div className="status error pdf-intake-issues" role="alert">
          <div className="pdf-status-heading">
            <TriangleAlert size={19} aria-hidden="true" />
            <strong>
              {intakeIssues.length} file
              {intakeIssues.length === 1 ? " was" : "s were"} not added
            </strong>
            <button
              type="button"
              className="toolbar-button"
              onClick={() => setIntakeIssues([])}
            >
              Dismiss
            </button>
          </div>
          <ul>
            {intakeIssues.map((issue) => (
              <li key={issue.id}>
                <strong>{issue.name}:</strong> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState icon={<Shrink size={34} aria-hidden="true" />}>
          Add PDFs to see page counts, first-page previews and embedded-image
          analysis before choosing a compression level.
        </EmptyState>
      ) : (
        <>
          <div className="pdf-queue-header">
            <div>
              <h3 tabIndex={-1} data-pdf-compress-queue-heading>
                Your compression queue
              </h3>
              <p>
                {entries.length} PDF{entries.length === 1 ? "" : "s"} ·{" "}
                {formatMiB(totalInputBytes)} selected ·{" "}
                {totalReadyPages.toLocaleString()} ready pages
              </p>
            </div>
            <div className="toolbar-actions" aria-label="Queue actions">
              <button
                type="button"
                className="toolbar-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={controlsLocked}
              >
                <FilePlus2 size={15} /> Add more
              </button>
              <button
                type="button"
                className="toolbar-button danger"
                onClick={() => setConfirmClear(true)}
                disabled={controlsLocked || intakeBusy}
              >
                <Trash2 size={15} /> Clear all
              </button>
            </div>
          </div>

          {confirmClear ? (
            <div className="pdf-confirm" role="alert">
              <div>
                <strong>
                  Remove all {entries.length} PDFs and their local results?
                </strong>
                <p>Your original files on your device are not deleted.</p>
              </div>
              <div className="toolbar-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setConfirmClear(false)}
                >
                  Keep files
                </button>
                <button
                  type="button"
                  className="primary danger-primary"
                  onClick={() => resetWorkspace(true)}
                >
                  <Trash2 size={16} /> Remove all
                </button>
              </div>
            </div>
          ) : null}

          <p className="sr-only" role="status" aria-live="polite">
            {queueAnnouncement}
          </p>

          <div className="pdf-entry-list">
            {entries.map((entry, index) => {
              const inspection = entry.inspection;
              const duplicateIndex = duplicateByEntry.get(entry.id);
              const firstPage = inspection?.firstPage;
              const aspectRatio = firstPage
                ? firstPage.rotation % 180 === 0
                  ? `${firstPage.width} / ${firstPage.height}`
                  : `${firstPage.height} / ${firstPage.width}`
                : "4 / 5";
              const warnings = entryWarnings(entry);
              const finalOutputName = sanitizeOutputFilename(
                entry.outputName,
                "compressed-pdf",
              );
              const resultFilename = resultFilenameByEntry.get(entry.id);
              const isProcessing = processingEntryId === entry.id;
              const entryLocked = controlsLocked || intakeBusy;

              return (
                <article
                  key={entry.id}
                  className={`pdf-entry status-${entry.status} pdf-compress-entry${selectedEntry?.id === entry.id ? " selected-entry" : ""}`}
                  data-pdf-compress-entry={entry.id}
                >
                  <div className="pdf-entry-main pdf-compress-entry-main">
                    <div
                      className="pdf-entry-order"
                      aria-label={`PDF ${index + 1}`}
                    >
                      <span className="pdf-entry-number">{index + 1}</span>
                    </div>

                    <button
                      type="button"
                      className="pdf-compress-thumbnail-button"
                      onClick={() => selectEntry(entry.id)}
                      aria-label={`Preview ${entry.name}`}
                    >
                      <span className="pdf-thumbnail" style={{ aspectRatio }}>
                        {entry.thumbnailState === "ready" &&
                        entry.thumbnailUrl ? (
                          <img
                            src={entry.thumbnailUrl}
                            alt={`First page preview of ${entry.name}`}
                          />
                        ) : entry.thumbnailState === "loading" ? (
                          <span className="pdf-thumbnail-placeholder">
                            <LoaderCircle
                              className="spin"
                              size={24}
                              aria-hidden="true"
                            />
                            Rendering preview…
                          </span>
                        ) : (
                          <span className="pdf-thumbnail-placeholder">
                            <FileText size={28} aria-hidden="true" />
                            {entry.status === "password"
                              ? "Unlock to preview"
                              : "Preview unavailable"}
                          </span>
                        )}
                      </span>
                    </button>

                    <div className="pdf-entry-content">
                      <div className="pdf-entry-title-row">
                        <h4>{entry.name}</h4>
                        <button
                          type="button"
                          className="icon-button pdf-remove"
                          onClick={() => removeEntry(entry.id)}
                          disabled={entryLocked}
                          aria-label={`Remove ${entry.name}`}
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                      <p className="pdf-entry-meta">
                        {formatMiB(entry.size)}
                        {inspection
                          ? ` · ${inspection.pageCount.toLocaleString()} page${inspection.pageCount === 1 ? "" : "s"} · ${geometryLabel(inspection)}`
                          : ""}
                        {entry.analysis
                          ? ` · ${entry.analysis.imageCount.toLocaleString()} embedded image${entry.analysis.imageCount === 1 ? "" : "s"} (${formatMiB(entry.analysis.imageBytes)})`
                          : ""}
                      </p>

                      <div
                        className="pdf-badges"
                        role="group"
                        aria-label="PDF status badges"
                      >
                        <span
                          className={entry.result ? "success-badge" : undefined}
                        >
                          {isProcessing ? "Compressing…" : statusLabel(entry)}
                        </span>
                        {inspection?.encrypted ? (
                          <span>Password protected</span>
                        ) : null}
                        {entry.analysis ? (
                          <span>
                            {entry.analysis.supportedImageCount.toLocaleString()}{" "}
                            image
                            {entry.analysis.supportedImageCount === 1
                              ? ""
                              : "s"}{" "}
                            can be recompressed
                          </span>
                        ) : null}
                        {duplicateIndex !== undefined ? (
                          <span className="warning-badge">
                            Duplicate of PDF {duplicateIndex + 1}
                          </span>
                        ) : null}
                        {entry.result ? (
                          <span className="success-badge">
                            {formatMiB(entry.result.outputBytes)} ·{" "}
                            {formatSavingsPercent(
                              entry.size,
                              entry.result.outputBytes,
                            )}
                          </span>
                        ) : null}
                      </div>

                      {entry.status === "inspecting" ? (
                        <p className="pdf-inline-note">
                          <LoaderCircle
                            className="spin"
                            size={15}
                            aria-hidden="true"
                          />{" "}
                          Inspecting pages, features and embedded images
                          locally…
                        </p>
                      ) : null}

                      {entry.status === "password" ? (
                        <form
                          className="pdf-password-panel"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void unlockEntry(
                              entry.id,
                              passwordDrafts[entry.id] ?? "",
                            );
                          }}
                        >
                          <strong>
                            <LockKeyhole size={16} aria-hidden="true" /> Open
                            password needed
                          </strong>
                          <p>{entry.error}</p>
                          <label htmlFor={`pdf-compress-password-${entry.id}`}>
                            PDF password
                          </label>
                          <div className="pdf-password-row">
                            <input
                              id={`pdf-compress-password-${entry.id}`}
                              type={
                                visiblePasswords[entry.id] ? "text" : "password"
                              }
                              value={passwordDrafts[entry.id] ?? ""}
                              autoComplete="off"
                              onChange={(event) => {
                                const value = event.currentTarget.value;
                                setPasswordDrafts((previous) => ({
                                  ...previous,
                                  [entry.id]: value,
                                }));
                              }}
                            />
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() =>
                                setVisiblePasswords((previous) => ({
                                  ...previous,
                                  [entry.id]: !previous[entry.id],
                                }))
                              }
                              aria-label={
                                visiblePasswords[entry.id]
                                  ? `Hide password for ${entry.name}`
                                  : `Show password for ${entry.name}`
                              }
                            >
                              {visiblePasswords[entry.id] ? (
                                <EyeOff size={17} aria-hidden="true" />
                              ) : (
                                <Eye size={17} aria-hidden="true" />
                              )}
                            </button>
                            <button type="submit" className="secondary">
                              <LockOpen size={15} aria-hidden="true" /> Unlock
                              PDF
                            </button>
                          </div>
                          {entry.passwordNotice ? (
                            <p>{entry.passwordNotice}</p>
                          ) : null}
                          <p>
                            The password stays in this tab’s memory and is
                            cleared when the file is removed or a validated
                            unencrypted result is created.
                          </p>
                        </form>
                      ) : null}

                      {(entry.status === "error" ||
                        entry.status === "blocked") &&
                      entry.error ? (
                        <div className="pdf-entry-alert" role="alert">
                          <TriangleAlert size={18} aria-hidden="true" />
                          <p>{entry.error}</p>
                          {entry.status === "error" ? (
                            <button
                              type="button"
                              className="toolbar-button"
                              onClick={() => retryInspection(entry.id)}
                              disabled={entryLocked}
                            >
                              <RotateCcw size={15} aria-hidden="true" /> Retry
                              inspection
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {entry.compressionError ? (
                        <div className="pdf-entry-alert" role="alert">
                          <TriangleAlert size={18} aria-hidden="true" />
                          <p>{entry.compressionError}</p>
                          <button
                            type="button"
                            className="toolbar-button"
                            onClick={() => void compressPending(entry.id)}
                            disabled={!canCompress}
                          >
                            <RotateCcw size={15} aria-hidden="true" /> Retry
                            this PDF
                          </button>
                        </div>
                      ) : null}

                      {entry.status !== "password" && entry.passwordNotice ? (
                        <p className="pdf-inline-note">
                          <Info size={15} aria-hidden="true" />{" "}
                          {entry.passwordNotice}
                        </p>
                      ) : null}

                      {warnings.length > 0 ? (
                        <details className="pdf-file-notes">
                          <summary>
                            <Info size={15} aria-hidden="true" /> Compression
                            notes ({warnings.length})
                          </summary>
                          <ul>
                            {warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}

                      <div className="pdf-compress-output-name">
                        <label htmlFor={`pdf-compress-output-${entry.id}`}>
                          Output filename
                        </label>
                        <div className="pdf-filename-row">
                          <input
                            id={`pdf-compress-output-${entry.id}`}
                            type="text"
                            value={entry.outputName}
                            disabled={controlsLocked}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              updateEntry(entry.id, { outputName: value });
                              if (entry.result) clearZip();
                            }}
                            onBlur={() => {
                              if (entry.result) refreshZip();
                            }}
                          />
                          <span>.pdf</span>
                        </div>
                        <p className="help">
                          Downloads as{" "}
                          <strong>{resultFilename ?? finalOutputName}</strong>
                          {resultFilename && resultFilename !== finalOutputName
                            ? " (numbered to keep batch filenames unique)"
                            : ""}
                        </p>
                      </div>

                      {entry.result ? (
                        <div className="pdf-compress-entry-result">
                          <div>
                            <strong>
                              {formatMiB(entry.size)} →{" "}
                              {formatMiB(entry.result.outputBytes)}
                            </strong>
                            <span>
                              {formatSavingsPercent(
                                entry.size,
                                entry.result.outputBytes,
                              )}
                              {entry.result.stats.targetReached !== undefined
                                ? entry.result.stats.targetReached
                                  ? " · target reached"
                                  : " · target not reached"
                                : ""}
                            </span>
                          </div>
                          <div className="toolbar-actions">
                            <button
                              type="button"
                              className="toolbar-button"
                              onClick={() => selectEntry(entry.id)}
                            >
                              <ImageIcon size={15} aria-hidden="true" /> Compare
                            </button>
                            <a
                              className="secondary pdf-download-link"
                              href={entry.result.url}
                              download={resultFilename ?? finalOutputName}
                            >
                              <Download size={15} aria-hidden="true" /> Download{" "}
                              {resultFilename ?? finalOutputName}
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <section
        className="pdf-output-panel pdf-compress-settings"
        aria-labelledby="pdf-compress-settings-heading"
      >
        <div className="pdf-output-heading">
          <div>
            <h3 id="pdf-compress-settings-heading">
              <Settings2 size={19} aria-hidden="true" /> Compression settings
            </h3>
            <p>
              Start with a preset, then fine-tune supported embedded-image
              quality. QUICKKIT does not rasterize text or vector pages.
            </p>
          </div>
          {preset === "custom" ? (
            <span className="pdf-compress-custom-badge">Custom</span>
          ) : null}
        </div>

        <fieldset className="pdf-compress-preset-fieldset">
          <legend>Compression level</legend>
          <div className="pdf-compress-preset-grid">
            {PDF_COMPRESSION_PRESETS.map((item) => (
              <label key={item.id} className="pdf-compress-preset-card">
                <input
                  type="radio"
                  name="pdf-compression-preset"
                  value={item.id}
                  checked={preset === item.id}
                  disabled={controlsLocked}
                  onChange={() => applyPreset(item.id)}
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                  <small>
                    {Math.round(item.settings.imageQuality * 100)}% image
                    quality · up to{" "}
                    {item.settings.maxImageDimension.toLocaleString()} px
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="pdf-compress-controls-grid">
          <label className="pdf-compress-check-card">
            <input
              type="checkbox"
              checked={recompressImages}
              disabled={controlsLocked}
              onChange={(event) => {
                markSettingsChanged();
                setPreset("custom");
                setRecompressImages(event.currentTarget.checked);
              }}
            />
            <span>
              <strong>Recompress embedded images</strong>
              <small>
                Supported JPEG/raster images are resized/re-encoded inside the
                PDF. ICC-based JPEGs become standard RGB/gray JPEGs, so check
                color-critical work. Unsupported formats stay unchanged.
              </small>
            </span>
          </label>

          <label className="pdf-compress-check-card">
            <input
              type="checkbox"
              checked={grayscaleImages}
              disabled={controlsLocked || !recompressImages}
              onChange={(event) => {
                markSettingsChanged();
                setPreset("custom");
                setGrayscaleImages(event.currentTarget.checked);
              }}
            />
            <span>
              <strong>Convert images to grayscale</strong>
              <small>
                Can shrink scans further, but permanently removes image color in
                the compressed copy.
              </small>
            </span>
          </label>

          <div className="pdf-compress-range-control">
            <label htmlFor="pdf-compress-quality">
              Image quality <output>{qualityPercent}%</output>
            </label>
            <input
              id="pdf-compress-quality"
              type="range"
              min={30}
              max={95}
              step={1}
              value={qualityPercent}
              disabled={controlsLocked || !recompressImages}
              onChange={(event) => {
                markSettingsChanged();
                setPreset("custom");
                setQualityPercent(Number(event.currentTarget.value));
              }}
              aria-describedby="pdf-compress-quality-help"
            />
            <p id="pdf-compress-quality-help" className="help">
              Higher keeps photo/scan detail. Lower usually saves more space but
              can soften edges and introduce JPEG artifacts.
            </p>
          </div>

          <div className="pdf-compress-range-control">
            <label htmlFor="pdf-compress-max-dimension">
              Maximum image size{" "}
              <output>{maxImageDimension.toLocaleString()} px</output>
            </label>
            <input
              id="pdf-compress-max-dimension"
              type="range"
              min={600}
              max={6000}
              step={100}
              value={maxImageDimension}
              disabled={controlsLocked || !recompressImages}
              onChange={(event) => {
                markSettingsChanged();
                setPreset("custom");
                setMaxImageDimension(Number(event.currentTarget.value));
              }}
              aria-describedby="pdf-compress-dimension-help"
            />
            <p id="pdf-compress-dimension-help" className="help">
              Longest side for embedded images. Page dimensions and placement do
              not change; only stored image resolution can reduce.
            </p>
          </div>

          <div className="pdf-compress-target-control">
            <label className="pdf-compress-check-card compact">
              <input
                type="checkbox"
                checked={targetEnabled}
                disabled={controlsLocked}
                onChange={(event) => {
                  markSettingsChanged();
                  setTargetEnabled(event.currentTarget.checked);
                }}
              />
              <span>
                <strong>
                  <Target size={15} aria-hidden="true" /> Target size per PDF
                </strong>
                <small>
                  Best effort; QUICKKIT reports plainly if unreachable.
                </small>
              </span>
            </label>
            {targetEnabled ? (
              <div className="pdf-compress-target-row">
                <label htmlFor="pdf-compress-target-value">Target</label>
                <input
                  id="pdf-compress-target-value"
                  type="number"
                  min="0"
                  step="0.1"
                  value={targetValue}
                  disabled={controlsLocked}
                  onChange={(event) => {
                    markSettingsChanged();
                    setTargetValue(event.currentTarget.value);
                  }}
                  aria-invalid={Boolean(settingsState.error)}
                  aria-describedby="pdf-compress-target-help"
                />
                <label htmlFor="pdf-compress-target-unit" className="sr-only">
                  Target unit
                </label>
                <select
                  id="pdf-compress-target-unit"
                  value={targetUnit}
                  disabled={controlsLocked}
                  onChange={(event) => {
                    markSettingsChanged();
                    setTargetUnit(
                      event.currentTarget.value as PdfTargetSizeUnit,
                    );
                  }}
                >
                  <option value="KiB">KiB</option>
                  <option value="MiB">MiB</option>
                </select>
              </div>
            ) : null}
            <p id="pdf-compress-target-help" className="help">
              Target mode tries your quality first, then progressively lowers
              supported-image quality/resolution. It will not turn text pages
              into images just to hit a number.
            </p>
          </div>

          <div className="pdf-compress-zip-name">
            <label htmlFor="pdf-compress-zip-name">ZIP filename</label>
            <div className="pdf-filename-row">
              <input
                id="pdf-compress-zip-name"
                type="text"
                value={zipName}
                disabled={controlsLocked}
                onChange={(event) => setZipName(event.currentTarget.value)}
              />
              <span>.zip</span>
            </div>
            <p className="help">
              Used when two or more PDFs finish successfully.
            </p>
          </div>
        </div>

        {settingsState.error ? (
          <div className="status error" role="alert">
            <TriangleAlert size={18} aria-hidden="true" /> {settingsState.error}
          </div>
        ) : null}

        {hasQualityWarning ||
        grayscaleImages ||
        targetEnabled ||
        !recompressImages ? (
          <div className="pdf-compress-warning" role="note">
            <TriangleAlert size={19} aria-hidden="true" />
            <div>
              <strong>Review quality-sensitive PDFs after compression.</strong>
              <ul>
                {hasQualityWarning ? (
                  <li>
                    The current image settings can visibly soften scans,
                    screenshots, fine lines and photo detail.
                  </li>
                ) : null}
                {grayscaleImages ? (
                  <li>Grayscale is on, so supported images will lose color.</li>
                ) : null}
                {targetEnabled ? (
                  <li>
                    A target is not a guarantee. Each result says “target
                    reached” or “target not reached” with its exact size.
                  </li>
                ) : null}
                {!recompressImages ? (
                  <li>
                    Image recompression is off. Savings are limited to lossless
                    PDF stream/object optimization.
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}

        <div
          className="pdf-summary-grid pdf-compress-summary-grid"
          aria-label="Compression batch summary"
        >
          <div className="stat-card">
            <span>Original batch</span>
            <strong>{formatMiB(totalInputBytes)}</strong>
          </div>
          <div className="stat-card">
            <span>Ready to compress</span>
            <strong>
              {pendingEntries.length.toLocaleString()} PDF
              {pendingEntries.length === 1 ? "" : "s"}
            </strong>
          </div>
          <div className="stat-card">
            <span>Completed output</span>
            <strong>
              {successfulEntries.length
                ? formatMiB(successfulOutputBytes)
                : "—"}
            </strong>
          </div>
          <div className="stat-card">
            <span>Completed saving</span>
            <strong>
              {successfulEntries.length
                ? formatSavingsPercent(
                    successfulOriginalBytes,
                    successfulOutputBytes,
                  )
                : "—"}
            </strong>
          </div>
        </div>
      </section>

      {selectedEntry ? (
        <section
          className="pdf-compress-compare"
          aria-labelledby="pdf-compress-compare-heading"
        >
          <div className="pdf-output-heading">
            <div>
              <h3 id="pdf-compress-compare-heading">Preview & compare</h3>
              <p>
                {selectedEntry.name}
                {selectedEntry.inspection
                  ? ` · ${selectedEntry.inspection.pageCount.toLocaleString()} pages · ${geometryLabel(selectedEntry.inspection)}`
                  : ""}
              </p>
            </div>
            {entries.length > 1 ? (
              <div>
                <label htmlFor="pdf-compress-preview-select">
                  PDF to preview
                </label>
                <select
                  id="pdf-compress-preview-select"
                  value={selectedEntry.id}
                  onChange={(event) => selectEntry(event.currentTarget.value)}
                >
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="pdf-compress-compare-grid">
            <figure>
              <div className="pdf-result-preview">
                {selectedEntry.thumbnailState === "ready" &&
                selectedEntry.thumbnailUrl ? (
                  <img
                    src={selectedEntry.thumbnailUrl}
                    alt={`Original first page of ${selectedEntry.name}`}
                  />
                ) : (
                  <div className="pdf-thumbnail-placeholder large">
                    <FileText size={32} aria-hidden="true" />
                    Original preview unavailable
                  </div>
                )}
              </div>
              <figcaption>
                <strong>Original</strong>
                <span>{formatMiB(selectedEntry.size)}</span>
              </figcaption>
            </figure>

            <figure>
              <div className="pdf-result-preview">
                {selectedEntry.result?.previewState === "ready" &&
                selectedEntry.result.previewUrl ? (
                  <img
                    src={selectedEntry.result.previewUrl}
                    alt={`Compressed first page of ${selectedEntry.name}`}
                  />
                ) : selectedEntry.result?.previewState === "loading" ? (
                  <div className="pdf-thumbnail-placeholder large">
                    <LoaderCircle
                      className="spin"
                      size={30}
                      aria-hidden="true"
                    />
                    Rendering compressed preview…
                  </div>
                ) : selectedEntry.result ? (
                  <div className="pdf-thumbnail-placeholder large">
                    <ImageIcon size={32} aria-hidden="true" />
                    {selectedEntry.result.previewState === "error"
                      ? "Compressed preview could not be rendered"
                      : "Load the compressed preview"}
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={() => void loadResultPreview(selectedEntry.id)}
                    >
                      Load preview
                    </button>
                  </div>
                ) : (
                  <div className="pdf-thumbnail-placeholder large">
                    <Shrink size={32} aria-hidden="true" />
                    Compress this PDF to compare the first page
                  </div>
                )}
              </div>
              <figcaption>
                <strong>Compressed</strong>
                <span>
                  {selectedEntry.result
                    ? `${formatMiB(selectedEntry.result.outputBytes)} · ${formatSavingsPercent(selectedEntry.size, selectedEntry.result.outputBytes)}`
                    : "Not compressed yet"}
                </span>
              </figcaption>
            </figure>
          </div>
          <p className="help">
            Previews help spot obvious softness or artifacts, but they are not a
            print-proof. Open important results in your PDF reader and zoom to
            100–200% before sharing.
          </p>
        </section>
      ) : null}

      {excludedEntries.length > 0 && pendingEntries.length > 0 ? (
        <div className="pdf-compress-excluded" role="note">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Not included in this run</strong>
            <ul>
              {excludedEntries.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.name}:</strong> {statusLabel(entry)}
                  {entry.error ? ` — ${entry.error}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {runBlockers.length > 0 ? (
        <div className="pdf-blockers" role="note">
          <strong>Before you compress</strong>
          <ul>
            {runBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="pdf-ready-note">
          <CheckCircle2 size={17} aria-hidden="true" /> {pendingEntries.length}{" "}
          PDF{pendingEntries.length === 1 ? " is" : "s are"} ready. Each output
          is reopened locally to verify page count, page size and rotation
          before download.
        </p>
      )}

      {batchError ? (
        <div
          ref={batchErrorRef}
          className="status error"
          role="alert"
          tabIndex={-1}
        >
          <TriangleAlert size={18} aria-hidden="true" /> {batchError}
        </div>
      ) : null}
      {batchNotice ? (
        <div className="status success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" /> {batchNotice}
        </div>
      ) : null}

      {isCompressing && progress ? (
        <div className="pdf-progress-panel" aria-live="polite">
          <div className="pdf-progress-heading">
            <strong>
              Compressing file {progress.fileIndex + 1} of {progress.totalFiles}
              {progress.fileName ? `: ${progress.fileName}` : ""}
            </strong>
            <span>{progress.percent}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-label="PDF compression progress"
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <p>
            {progress.message} · {elapsedSeconds}s elapsed. Keep this tab open;
            cancelling keeps completed downloads and leaves unfinished PDFs
            ready to retry.
          </p>
        </div>
      ) : null}

      <div className="pdf-merge-actions">
        {isCompressing ? (
          <button
            type="button"
            className="secondary danger-button"
            onClick={cancelCompression}
          >
            <Ban size={17} aria-hidden="true" /> Cancel compression
          </button>
        ) : (
          <button
            type="button"
            className="primary large"
            disabled={!canCompress}
            onClick={() => void compressPending()}
          >
            <Shrink size={18} aria-hidden="true" /> Compress{" "}
            {pendingEntries.length > 0
              ? `${pendingEntries.length} PDF${pendingEntries.length === 1 ? "" : "s"}`
              : "PDFs"}
          </button>
        )}
        <span className="pdf-no-upload-inline">
          <ShieldCheck size={15} aria-hidden="true" /> Local only — no upload
        </span>
      </div>

      {successfulEntries.length > 0 ? (
        <section
          className="pdf-compress-results"
          aria-labelledby="pdf-compress-results-heading"
        >
          <div className="pdf-output-heading">
            <div>
              <h3
                id="pdf-compress-results-heading"
                ref={resultHeadingRef}
                tabIndex={-1}
              >
                <FileCheck2 size={20} aria-hidden="true" /> Results ready
              </h3>
              <p>
                {successfulEntries.length} PDF
                {successfulEntries.length === 1 ? "" : "s"} ·{" "}
                {formatMiB(successfulOriginalBytes)} →{" "}
                {formatMiB(successfulOutputBytes)} ·{" "}
                {formatSavingsPercent(
                  successfulOriginalBytes,
                  successfulOutputBytes,
                )}
              </p>
            </div>
            <div className="toolbar-actions">
              {zipState ? (
                <a
                  className="primary pdf-download-link"
                  href={zipState.url}
                  download={zipFilename}
                >
                  <FileArchive size={16} aria-hidden="true" /> Download ZIP (
                  {formatMiB(zipState.size)})
                </a>
              ) : successfulEntries.length > 1 ? (
                <button
                  type="button"
                  className="primary"
                  onClick={refreshZip}
                  disabled={controlsLocked}
                >
                  <FileArchive size={16} aria-hidden="true" /> Prepare ZIP
                </button>
              ) : null}
              <button
                type="button"
                className="secondary"
                onClick={() => resetWorkspace(true)}
                disabled={controlsLocked}
              >
                <RotateCcw size={15} aria-hidden="true" /> Start a new batch
              </button>
            </div>
          </div>

          {zipError ? (
            <div className="status error" role="alert">
              <TriangleAlert size={18} aria-hidden="true" /> {zipError}
            </div>
          ) : null}

          <ol className="pdf-compress-result-list">
            {successfulEntries.map((entry) => {
              const result = entry.result!;
              const filename =
                resultFilenameByEntry.get(entry.id) ??
                sanitizeOutputFilename(entry.outputName, "compressed-pdf");
              return (
                <li key={entry.id}>
                  <div>
                    <strong>{filename}</strong>
                    <span>
                      {entry.name} · {formatMiB(entry.size)} →{" "}
                      {formatMiB(result.outputBytes)} ·{" "}
                      {formatSavingsPercent(entry.size, result.outputBytes)} ·{" "}
                      {result.pageCount.toLocaleString()} pages
                    </span>
                    <span>
                      {result.stats.unchanged
                        ? "Original retained because no safely smaller rewrite was found."
                        : `${result.stats.imagesRecompressed.toLocaleString()} images recompressed · ${result.stats.streamsRecompressed.toLocaleString()} streams losslessly recompressed · ${result.stats.attempts} attempt${result.stats.attempts === 1 ? "" : "s"}`}
                      {result.stats.targetReached !== undefined
                        ? result.stats.targetReached
                          ? " · Target reached"
                          : " · Target not reached"
                        : ""}
                    </span>
                    {result.notices.length > 0 ? (
                      <details>
                        <summary>
                          Result notes ({result.notices.length})
                        </summary>
                        <ul>
                          {result.notices.map((notice) => (
                            <li key={notice}>{notice}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                  <div className="toolbar-actions">
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={() => selectEntry(entry.id)}
                    >
                      <ImageIcon size={15} aria-hidden="true" /> Compare
                    </button>
                    <a
                      className="secondary pdf-download-link"
                      href={result.url}
                      download={filename}
                    >
                      <Download size={15} aria-hidden="true" /> Download{" "}
                      {filename}
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className="pdf-mobile-action" aria-label="Quick compression action">
        <span>
          {successfulEntries.length > 0
            ? `${successfulEntries.length} result${successfulEntries.length === 1 ? "" : "s"} ready`
            : pendingEntries.length > 0
              ? `${pendingEntries.length} PDF${pendingEntries.length === 1 ? "" : "s"} ready`
              : "Add PDFs to compress"}
        </span>
        {isCompressing ? (
          <button type="button" className="primary" onClick={cancelCompression}>
            Cancel
          </button>
        ) : successfulEntries.length > 0 && pendingEntries.length === 0 ? (
          <button
            type="button"
            className="primary"
            onClick={() => resultHeadingRef.current?.focus()}
          >
            View results
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={!canCompress}
            onClick={() => void compressPending()}
          >
            Compress
          </button>
        )}
      </div>
    </fieldset>
  );
}
