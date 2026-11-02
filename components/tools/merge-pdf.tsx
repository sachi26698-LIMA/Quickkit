"use client";

/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  ArrowUpToLine,
  Ban,
  BookmarkPlus,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FileText,
  Files,
  GripVertical,
  Info,
  ListOrdered,
  LoaderCircle,
  LockKeyhole,
  LockOpen,
  Merge,
  RotateCcw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";

import { useHydrated } from "@/lib/use-hydrated";
import type { PdfMergeProgress } from "@/lib/tools/pdf/merge-engine";
import {
  PDF_MERGE_LIMITS,
  PdfMergeError,
  buildMergeSummary,
  formatMiB,
  formatPageSelectionSummary,
  hashPdfBytes,
  isBlockingInspection,
  moveItem,
  parsePageRange,
  sanitizeOutputFilename,
  sanitizePdfTitle,
  serializePageSelection,
  sortEntriesByName,
  validatePdfFileCandidate,
  type PdfInspection,
  type PdfMergeIssueCode,
} from "@/lib/tools/pdf/merge-pdf-logic";
import {
  renderPdfPageBatch,
  renderPdfResultPreview,
  renderPdfThumbnail,
} from "@/lib/tools/pdf/pdf-preview";
import { usePdfMergeWorker } from "@/lib/tools/pdf/use-pdf-merge-worker";
import { EmptyState, WorkspaceHeading } from "./tool-ui";

type EntryStatus = "blocked" | "error" | "inspecting" | "password" | "ready";
type ThumbnailState = "idle" | "loading" | "ready" | "unavailable";
type PreviewState = "error" | "idle" | "loading" | "ready";

interface PdfEntry {
  contentHash?: string;
  error?: string;
  errorCode?: PdfMergeIssueCode;
  file: File;
  id: string;
  inspection?: PdfInspection;
  name: string;
  pageIndices: number[];
  pageInput: string;
  password?: string;
  passwordNotice?: string;
  previewError?: string;
  previewLoadedCount: number;
  previewOpen: boolean;
  previewPages: Record<number, string>;
  previewState: PreviewState;
  rangeError?: string;
  selectionMode: "all" | "custom";
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

interface MergeResultState {
  blob: Blob;
  bookmarkTitles: string[];
  filename: string;
  notices: string[];
  pageCount: number;
  previewState: PreviewState;
  previewUrl?: string;
  removedActions: number;
  removedDestinations: number;
  removedLinkAnnotations: number;
  size: number;
  title: string;
  url: string;
}

interface ProgressState extends PdfMergeProgress {
  percent: number;
}

const PREVIEW_BATCH_SIZE = 24;

function createEntry(file: File): PdfEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    file,
    id,
    name: file.name,
    pageIndices: [],
    pageInput: "all",
    previewLoadedCount: 0,
    previewOpen: false,
    previewPages: {},
    previewState: "idle",
    selectionMode: "all",
    size: file.size,
    status: "inspecting",
    thumbnailState: "idle",
  };
}

function progressPercent(progress: PdfMergeProgress): number {
  const fraction =
    progress.total > 0
      ? Math.min(1, Math.max(0, progress.current / progress.total))
      : 0;
  if (progress.stage === "inspecting") return Math.round(4 + fraction * 8);
  if (progress.stage === "preparing") return 14;
  if (progress.stage === "copying") return Math.round(16 + fraction * 68);
  if (progress.stage === "finalizing") return 88;
  if (progress.stage === "saving") return 93;
  return 97;
}

function geometryLabel(inspection: PdfInspection): string {
  const { height, rotation, width } = inspection.firstPage;
  const rotationText = rotation ? ` · ${rotation}°` : "";
  return `${Math.round(width)} × ${Math.round(height)} pt${rotationText}`;
}

export default function PdfMerger() {
  const ready = useHydrated();
  const worker = usePdfMergeWorker();
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [intakeIssues, setIntakeIssues] = useState<IntakeIssue[]>([]);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dragOverEntryId, setDragOverEntryId] = useState<string | null>(null);
  const [outputTitle, setOutputTitle] = useState("Merged PDF");
  const [outputFilename, setOutputFilename] = useState("merged");
  const [createBookmarks, setCreateBookmarks] = useState(true);
  const [result, setResult] = useState<MergeResultState | null>(null);
  const [mergeError, setMergeError] = useState("");
  const [mergeNotice, setMergeNotice] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [queueAnnouncement, setQueueAnnouncement] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {},
  );

  const entriesModelRef = useRef<PdfEntry[]>([]);
  const trackedUrlsRef = useRef(new Set<string>());
  const resultRef = useRef<MergeResultState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const mergeErrorRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const entryTokensRef = useRef(new Map<string, number>());
  const previewTokensRef = useRef(new Map<string, number>());
  const inspectionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const thumbnailQueueRef = useRef<Promise<void>>(Promise.resolve());
  const intakeEpochRef = useRef(0);
  const mergeVersionRef = useRef(0);
  const pendingFocusRef = useRef<string | null>(null);
  const mergeStartedAtRef = useRef(0);

  const syncEntries = useCallback(() => {
    setEntries([...entriesModelRef.current]);
  }, []);

  const replaceEntries = useCallback(
    (next: PdfEntry[]) => {
      entriesModelRef.current = next;
      syncEntries();
    },
    [syncEntries],
  );

  const updateEntry = useCallback(
    (
      id: string,
      patch: Partial<PdfEntry> | ((entry: PdfEntry) => Partial<PdfEntry>),
    ): PdfEntry | undefined => {
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
    (entry: PdfEntry) => {
      revokeTrackedUrl(entry.thumbnailUrl);
      Object.values(entry.previewPages).forEach((url) => revokeTrackedUrl(url));
    },
    [revokeTrackedUrl],
  );

  const clearResult = useCallback(() => {
    if (resultRef.current) {
      revokeTrackedUrl(resultRef.current.url);
      revokeTrackedUrl(resultRef.current.previewUrl);
      resultRef.current = null;
    }
    setResult(null);
  }, [revokeTrackedUrl]);

  const invalidateResult = useCallback(() => {
    mergeVersionRef.current += 1;
    clearResult();
    setMergeError("");
    setMergeNotice("");
  }, [clearResult]);

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
    if (!pendingFocusRef.current) return;
    const selector = pendingFocusRef.current;
    pendingFocusRef.current = null;
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(selector);
      if (target && !target.hasAttribute("disabled")) target.focus();
      else
        document
          .querySelector<HTMLElement>("[data-pdf-queue-heading]")
          ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [entries]);

  useEffect(() => {
    if (!isMerging) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - mergeStartedAtRef.current) / 1000),
        ),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [isMerging]);

  const loadThumbnailNow = useCallback(
    async (id: string) => {
      const entry = entriesModelRef.current.find((item) => item.id === id);
      if (!entry || entry.status === "error" || entry.status === "inspecting")
        return;
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
        if (entryTokenIsCurrent(id, token))
          updateEntry(id, {
            thumbnailState: "unavailable",
            thumbnailUrl: undefined,
          });
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
        error: undefined,
        errorCode: undefined,
        status: "inspecting",
        thumbnailState: "idle",
      });

      try {
        const data = await initial.file.arrayBuffer();
        if (!entryTokenIsCurrent(id, token) || epoch !== intakeEpochRef.current)
          return;
        const contentHash = await hashPdfBytes(new Uint8Array(data.slice(0)));
        if (!entryTokenIsCurrent(id, token) || epoch !== intakeEpochRef.current)
          return;
        updateEntry(id, { contentHash });

        const password = passwordWasExplicit
          ? passwordOverride
          : initial.password;
        const inspection = await worker.inspect(id, data, password);
        if (!entryTokenIsCurrent(id, token) || epoch !== intakeEpochRef.current)
          return;

        const current = entriesModelRef.current.find(
          (entry) => entry.id === id,
        );
        if (!current) return;
        const previousSelectionStillValid =
          current.inspection?.pageCount === inspection.pageCount &&
          current.pageIndices.length > 0 &&
          current.pageIndices.every(
            (page) => page >= 0 && page < inspection.pageCount,
          );
        const pageIndices = previousSelectionStillValid
          ? current.pageIndices
          : Array.from({ length: inspection.pageCount }, (_, index) => index);
        const selectionMode = previousSelectionStillValid
          ? current.selectionMode
          : "all";
        const pageInput = previousSelectionStillValid
          ? current.pageInput
          : serializePageSelection(pageIndices, inspection.pageCount);
        const effectivePassword = inspection.encrypted
          ? (password ?? "")
          : undefined;
        const blocked = isBlockingInspection(inspection.features);

        updateEntry(id, {
          error: blocked
            ? inspection.features.hasXFA
              ? "Dynamic XFA forms are not supported. Print or export this file to a standard PDF, then add that copy."
              : "This PDF appears to be digitally signed. Merging is blocked so a signature is not silently invalidated."
            : undefined,
          errorCode: blocked
            ? inspection.features.hasXFA
              ? "unsupported_xfa"
              : "signed_pdf"
            : undefined,
          inspection,
          pageIndices,
          pageInput,
          password: effectivePassword,
          passwordNotice: undefined,
          rangeError: previousSelectionStillValid
            ? current.rangeError
            : undefined,
          selectionMode,
          status: blocked ? "blocked" : "ready",
        });
        queueThumbnail(id);
      } catch (error) {
        if (!entryTokenIsCurrent(id, token) || epoch !== intakeEpochRef.current)
          return;
        if (error instanceof PdfMergeError && error.code === "cancelled")
          return;
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
          error:
            error instanceof Error
              ? error.message
              : "This PDF could not be inspected. Remove it and try a fresh export from your PDF app.",
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
            if (inspectionQueueRef.current === holder.promise)
              setIntakeBusy(false);
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
      invalidateResult();
      setConfirmClear(false);

      void enqueueInspectionTask(async () => {
        const epoch = intakeEpochRef.current;
        const newIssues: IntakeIssue[] = [];
        for (const file of files) {
          if (epoch !== intakeEpochRef.current) break;
          const currentTotal = entriesModelRef.current.reduce(
            (sum, entry) => sum + entry.size,
            0,
          );
          const validationError = validatePdfFileCandidate(
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
          await inspectEntryNow(entry.id);
        }
        if (newIssues.length > 0)
          setIntakeIssues((previous) => [...previous, ...newIssues]);
      });
    },
    [enqueueInspectionTask, inspectEntryNow, invalidateResult, replaceEntries],
  );

  const summary = useMemo(() => {
    const readySelections = entries
      .filter(
        (entry) =>
          entry.status === "ready" && entry.inspection && !entry.rangeError,
      )
      .map((entry) => ({
        entryId: entry.id,
        name: entry.name,
        pageIndices: entry.pageIndices,
        totalPages: entry.inspection!.pageCount,
      }));
    return buildMergeSummary(readySelections);
  }, [entries]);

  const segmentByEntry = useMemo(
    () =>
      new Map(summary.segments.map((segment) => [segment.entryId, segment])),
    [summary],
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

  const blockers = useMemo(() => {
    const items: string[] = [];
    if (entries.length < 2)
      items.push("Add at least two PDFs. A single PDF does not need merging.");
    if (entries.some((entry) => entry.status === "inspecting"))
      items.push("Wait for every PDF to finish local inspection.");
    if (entries.some((entry) => entry.status === "password"))
      items.push("Unlock every password-protected PDF or remove it.");
    if (entries.some((entry) => entry.status === "error"))
      items.push(
        "Remove or retry every unreadable PDF; files are never skipped silently.",
      );
    if (entries.some((entry) => entry.status === "blocked"))
      items.push(
        "Remove each blocked XFA or signed PDF, or add a supported copy.",
      );
    if (
      entries.some(
        (entry) =>
          entry.rangeError ||
          (entry.status === "ready" && entry.pageIndices.length === 0),
      )
    ) {
      items.push(
        "Fix every page selection so each PDF contributes at least one explicit page.",
      );
    }
    if (summary.totalPages > PDF_MERGE_LIMITS.maxOutputPages) {
      items.push(
        `The output would have ${summary.totalPages.toLocaleString()} pages, above the ${PDF_MERGE_LIMITS.maxOutputPages.toLocaleString()}-page limit.`,
      );
    }
    return items;
  }, [entries, summary.totalPages]);

  const canMerge =
    ready &&
    !isMerging &&
    !intakeBusy &&
    blockers.length === 0 &&
    entries.length >= 2;
  const totalInputBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const finalFilename = sanitizeOutputFilename(outputFilename);
  const finalTitle = sanitizePdfTitle(outputTitle);

  const announceMove = useCallback(
    (entry: PdfEntry, index: number, total: number) => {
      setQueueAnnouncement(
        `${entry.name} is now position ${index + 1} of ${total}.`,
      );
    },
    [],
  );

  const moveEntry = useCallback(
    (id: string, targetIndex: number, focusControl = "grip") => {
      const current = entriesModelRef.current;
      const fromIndex = current.findIndex((entry) => entry.id === id);
      if (fromIndex < 0) return;
      const clamped = Math.max(0, Math.min(current.length - 1, targetIndex));
      if (fromIndex === clamped) return;
      invalidateResult();
      const next = moveItem(current, fromIndex, clamped);
      replaceEntries(next);
      announceMove(next[clamped], clamped, next.length);
      pendingFocusRef.current = `[data-pdf-entry="${id}"] [data-focus-control="${focusControl}"]`;
    },
    [announceMove, invalidateResult, replaceEntries],
  );

  function sortQueue() {
    invalidateResult();
    replaceEntries(sortEntriesByName(entriesModelRef.current));
    setQueueAnnouncement("PDFs sorted by file name from A to Z.");
    pendingFocusRef.current = "[data-pdf-queue-heading]";
  }

  function reverseQueue() {
    invalidateResult();
    replaceEntries([...entriesModelRef.current].reverse());
    setQueueAnnouncement("PDF order reversed.");
    pendingFocusRef.current = "[data-pdf-queue-heading]";
  }

  function removeEntry(id: string) {
    const current = entriesModelRef.current;
    const index = current.findIndex((entry) => entry.id === id);
    const entry = current[index];
    if (!entry) return;
    invalidateResult();
    nextEntryToken(id);
    previewTokensRef.current.set(
      id,
      (previewTokensRef.current.get(id) ?? 0) + 1,
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
    const focusEntry = next[Math.min(index, next.length - 1)];
    pendingFocusRef.current = focusEntry
      ? `[data-pdf-entry="${focusEntry.id}"] [data-focus-control="grip"]`
      : "[data-pdf-add-button]";
  }

  function clearQueue() {
    invalidateResult();
    intakeEpochRef.current += 1;
    entriesModelRef.current.forEach((entry) => {
      nextEntryToken(entry.id);
      previewTokensRef.current.set(
        entry.id,
        (previewTokensRef.current.get(entry.id) ?? 0) + 1,
      );
      revokeEntryUrls(entry);
    });
    replaceEntries([]);
    setPasswordDrafts({});
    setVisiblePasswords({});
    setConfirmClear(false);
    setQueueAnnouncement(
      "All PDFs removed. Add at least two PDFs to start again.",
    );
    pendingFocusRef.current = "[data-pdf-add-button]";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function retryEntry(id: string) {
    invalidateResult();
    void enqueueInspectionTask(() => inspectEntryNow(id));
  }

  async function unlockEntry(id: string, password: string) {
    invalidateResult();
    setPasswordDrafts((previous) => ({ ...previous, [id]: "" }));
    await enqueueInspectionTask(() => inspectEntryNow(id, password, true));
  }

  function applySelection(
    id: string,
    pageIndices: number[],
    mode: "all" | "custom",
    input?: string,
  ) {
    const entry = entriesModelRef.current.find((item) => item.id === id);
    if (!entry?.inspection) return;
    const sorted = [...new Set(pageIndices)].sort((a, b) => a - b);
    invalidateResult();
    updateEntry(id, {
      pageIndices: sorted,
      pageInput:
        input ?? serializePageSelection(sorted, entry.inspection.pageCount),
      rangeError: sorted.length
        ? undefined
        : "Select at least one page from this PDF, or remove the file from the queue.",
      selectionMode: mode,
    });
  }

  function handleRangeChange(entry: PdfEntry, value: string) {
    if (!entry.inspection) return;
    invalidateResult();
    try {
      const parsed = parsePageRange(value, entry.inspection.pageCount);
      updateEntry(entry.id, {
        pageIndices: parsed,
        pageInput: value,
        rangeError: undefined,
        selectionMode: "custom",
      });
    } catch (error) {
      updateEntry(entry.id, {
        pageInput: value,
        rangeError:
          error instanceof Error
            ? error.message
            : "Enter a valid page selection, for example 1-3, 5.",
        selectionMode: "custom",
      });
    }
  }

  const loadPreviewBatch = useCallback(
    async (id: string) => {
      const entry = entriesModelRef.current.find((item) => item.id === id);
      if (!entry?.inspection || entry.previewState === "loading") return;
      const start = entry.previewLoadedCount;
      if (start >= entry.inspection.pageCount) return;
      const end = Math.min(
        entry.inspection.pageCount,
        start + PREVIEW_BATCH_SIZE,
      );
      const indices = Array.from(
        { length: end - start },
        (_, offset) => start + offset,
      );
      const token = (previewTokensRef.current.get(id) ?? 0) + 1;
      previewTokensRef.current.set(id, token);
      updateEntry(id, { previewError: undefined, previewState: "loading" });
      let completed = 0;

      try {
        const data = await entry.file.arrayBuffer();
        if (previewTokensRef.current.get(id) !== token) return;
        await renderPdfPageBatch(
          new Uint8Array(data),
          entry.password,
          indices,
          (pageIndex, blob) => {
            completed += 1;
            if (previewTokensRef.current.get(id) !== token) return;
            const current = entriesModelRef.current.find(
              (item) => item.id === id,
            );
            if (!current) return;
            const url = createTrackedUrl(blob);
            revokeTrackedUrl(current.previewPages[pageIndex]);
            updateEntry(id, (item) => ({
              previewLoadedCount: Math.max(
                item.previewLoadedCount,
                pageIndex + 1,
              ),
              previewPages: { ...item.previewPages, [pageIndex]: url },
            }));
          },
        );
        if (previewTokensRef.current.get(id) !== token) return;
        updateEntry(id, {
          previewLoadedCount: Math.max(entry.previewLoadedCount, end),
          previewState: "ready",
        });
      } catch {
        if (previewTokensRef.current.get(id) !== token) return;
        updateEntry(id, {
          previewError:
            "Some page previews could not be rendered in this browser. Page ranges still work, and the merge validation will check the output.",
          previewLoadedCount: Math.max(
            entry.previewLoadedCount,
            start + completed,
          ),
          previewState: "error",
        });
      }
    },
    [createTrackedUrl, revokeTrackedUrl, updateEntry],
  );

  function togglePagePicker(entry: PdfEntry) {
    const nextOpen = !entry.previewOpen;
    updateEntry(entry.id, { previewOpen: nextOpen });
    if (nextOpen && entry.previewLoadedCount === 0)
      void loadPreviewBatch(entry.id);
  }

  function togglePreviewPage(entry: PdfEntry, pageIndex: number) {
    const selected = new Set(entry.pageIndices);
    if (selected.has(pageIndex)) selected.delete(pageIndex);
    else selected.add(pageIndex);
    applySelection(entry.id, [...selected], "custom");
  }

  function applyMergeError(error: PdfMergeError) {
    if (!error.entryId) return;
    const entry = entriesModelRef.current.find(
      (item) => item.id === error.entryId,
    );
    if (!entry) return;
    if (
      error.code === "password_required" ||
      error.code === "password_invalid"
    ) {
      updateEntry(entry.id, {
        error: error.message,
        errorCode: error.code,
        password: undefined,
        status: "password",
      });
    } else if (
      error.code === "unsupported_xfa" ||
      error.code === "signed_pdf"
    ) {
      updateEntry(entry.id, {
        error: error.message,
        errorCode: error.code,
        status: "blocked",
      });
    } else if (
      error.code === "invalid_page_range" ||
      error.code === "duplicate_page_selection"
    ) {
      updateEntry(entry.id, { rangeError: error.message });
    } else if (
      [
        "corrupt_or_unsupported",
        "encrypted_unsupported",
        "file_too_large",
        "invalid_pdf",
        "unsupported_form",
        "unsupported_pdf_structure",
      ].includes(error.code)
    ) {
      updateEntry(entry.id, {
        error: error.message,
        errorCode: error.code,
        status: "error",
      });
    }
  }

  function clearPasswordsAfterSuccessfulMerge() {
    entriesModelRef.current.forEach((entry) => {
      if (!entry.inspection?.encrypted) return;
      nextEntryToken(entry.id);
      updateEntry(entry.id, {
        error: undefined,
        errorCode: undefined,
        password: undefined,
        passwordNotice:
          "For safety, the password was cleared after the completed merge. Enter it again only if you change this queue and want another version.",
        status: "password",
      });
    });
    setPasswordDrafts({});
    setVisiblePasswords({});
  }

  async function merge() {
    if (!canMerge) return;
    const version = ++mergeVersionRef.current;
    clearResult();
    setMergeError("");
    setMergeNotice("");
    setIsMerging(true);
    setElapsedSeconds(0);
    mergeStartedAtRef.current = Date.now();
    setProgress({
      current: 0,
      message: "Preparing your PDFs on this device",
      percent: 2,
      stage: "preparing",
      total: Math.max(1, summary.totalPages),
    });

    try {
      const sources = [];
      for (const entry of entriesModelRef.current) {
        const data = await entry.file.arrayBuffer();
        if (version !== mergeVersionRef.current) return;
        sources.push({
          data,
          id: entry.id,
          name: entry.name,
          pageIndices: entry.pageIndices,
          password: entry.password,
        });
      }

      const workerResult = await worker.merge(
        sources,
        { createBookmarks, title: finalTitle },
        (nextProgress) => {
          if (version !== mergeVersionRef.current) return;
          setProgress({
            ...nextProgress,
            percent: progressPercent(nextProgress),
          });
        },
      );
      if (version !== mergeVersionRef.current) return;

      const blob = new Blob([workerResult.data], { type: "application/pdf" });
      const url = createTrackedUrl(blob);
      const nextResult: MergeResultState = {
        blob,
        bookmarkTitles: workerResult.bookmarkTitles,
        filename: finalFilename,
        notices: workerResult.notices,
        pageCount: workerResult.pageCount,
        previewState: "loading",
        removedActions: workerResult.removedActions,
        removedDestinations: workerResult.removedDestinations,
        removedLinkAnnotations: workerResult.removedLinkAnnotations,
        size: blob.size,
        title: finalTitle,
        url,
      };
      resultRef.current = nextResult;
      setResult(nextResult);
      setProgress(null);
      setIsMerging(false);
      clearPasswordsAfterSuccessfulMerge();
      worker.cancel();
      requestAnimationFrame(() => resultHeadingRef.current?.focus());

      try {
        const previewBlob = await renderPdfResultPreview(
          new Uint8Array(workerResult.data),
          0,
        );
        if (
          version !== mergeVersionRef.current ||
          resultRef.current !== nextResult
        )
          return;
        const previewUrl = createTrackedUrl(previewBlob);
        const withPreview = {
          ...nextResult,
          previewState: "ready" as const,
          previewUrl,
        };
        resultRef.current = withPreview;
        setResult(withPreview);
      } catch {
        if (
          version !== mergeVersionRef.current ||
          resultRef.current !== nextResult
        )
          return;
        const withoutPreview = {
          ...nextResult,
          previewState: "error" as const,
        };
        resultRef.current = withoutPreview;
        setResult(withoutPreview);
      }
    } catch (error) {
      if (version !== mergeVersionRef.current) return;
      if (error instanceof PdfMergeError && error.code === "cancelled") {
        setMergeNotice(error.message);
      } else if (error instanceof PdfMergeError) {
        applyMergeError(error);
        setMergeError(error.message);
        requestAnimationFrame(() => mergeErrorRef.current?.focus());
      } else {
        setMergeError(
          "The merge stopped before a validated PDF could be created. Try fewer or smaller files, then merge again.",
        );
        requestAnimationFrame(() => mergeErrorRef.current?.focus());
      }
    } finally {
      if (version === mergeVersionRef.current) {
        setIsMerging(false);
        setProgress(null);
      }
    }
  }

  function cancelMerge() {
    mergeVersionRef.current += 1;
    worker.cancel();
    setIsMerging(false);
    setProgress(null);
    setMergeNotice(
      "Merge cancelled. Your queue, page selections and original files are unchanged.",
    );
  }

  function startNewMerge() {
    clearQueue();
    setOutputTitle("Merged PDF");
    setOutputFilename("merged");
    setCreateBookmarks(true);
    setIntakeIssues([]);
    setMergeNotice("");
  }

  const controlsLocked = !ready || isMerging;

  return (
    <fieldset
      className="workspace pdf-merger-workspace"
      disabled={!ready}
      aria-label="PDF merger workspace"
    >
      <WorkspaceHeading
        title="Many PDFs. One tidy document."
        description="Add PDFs, put them in order, choose pages, then download one validated file."
      />

      <div className="pdf-privacy-banner" role="note">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>Your PDFs never leave this browser.</strong>
          <p>
            Inspection, passwords, merging and previews run locally on your
            device. No PDF, file name, password or merged output is uploaded to
            QUICKKIT or any external server.
          </p>
        </div>
      </div>

      <div className="pdf-steps" aria-label="Merge progress steps">
        <span className={entries.length ? "done" : "current"}>
          1 · Add PDFs
        </span>
        <span className={entries.length >= 2 ? "done" : ""}>
          2 · Order & pages
        </span>
        <span className={result ? "done" : canMerge ? "current" : ""}>
          3 · Merge & download
        </span>
      </div>

      <label htmlFor="pdf-input">Choose PDFs</label>
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
          <strong>Drop PDFs here</strong> or choose them from your device. You
          can add the same PDF more than once when you intentionally need its
          pages repeated.
        </p>
        <input
          ref={fileInputRef}
          id="pdf-input"
          className="pdf-file-input"
          type="file"
          tabIndex={-1}
          accept="application/pdf,.pdf"
          multiple
          aria-describedby="pdf-limits"
          disabled={controlsLocked}
          onChange={(event) => {
            addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          className="primary"
          data-pdf-add-button
          disabled={controlsLocked}
          onClick={() => fileInputRef.current?.click()}
        >
          <FilePlus2 size={17} /> Add PDFs
        </button>
      </div>
      <p id="pdf-limits" className="help">
        PDF only · up to {PDF_MERGE_LIMITS.maxFiles} files ·{" "}
        {formatMiB(PDF_MERGE_LIMITS.maxFileBytes)} per file ·{" "}
        {formatMiB(PDF_MERGE_LIMITS.maxTotalBytes)} total · up to{" "}
        {PDF_MERGE_LIMITS.maxPagesPerFile.toLocaleString()} pages per file and{" "}
        {PDF_MERGE_LIMITS.maxOutputPages.toLocaleString()} selected output
        pages. Files are checked one by one; anything that cannot be included is
        named below.
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
        <EmptyState icon={<Files size={34} aria-hidden="true" />}>
          Add at least two PDFs to see first-page previews, arrange the order
          and choose exactly which pages to include.
        </EmptyState>
      ) : (
        <>
          <div className="pdf-queue-header">
            <div>
              <h3 tabIndex={-1} data-pdf-queue-heading>
                Your merge queue
              </h3>
              <p>
                {entries.length} PDF{entries.length === 1 ? "" : "s"} ·{" "}
                {formatMiB(totalInputBytes)} selected on this device
              </p>
            </div>
            <div className="toolbar-actions" aria-label="Queue actions">
              <button
                type="button"
                className="toolbar-button"
                onClick={sortQueue}
                disabled={controlsLocked || entries.length < 2}
              >
                <ArrowDownAZ size={15} /> Sort A–Z
              </button>
              <button
                type="button"
                className="toolbar-button"
                onClick={reverseQueue}
                disabled={controlsLocked || entries.length < 2}
              >
                <ArrowUpDown size={15} /> Reverse
              </button>
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
                  Remove all {entries.length} PDFs from this queue?
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
                  onClick={clearQueue}
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
              const segment = segmentByEntry.get(entry.id);
              const duplicateIndex = duplicateByEntry.get(entry.id);
              const isReady = entry.status === "ready" && inspection;
              const firstPage = inspection?.firstPage;
              const aspectRatio = firstPage
                ? firstPage.rotation % 180 === 0
                  ? `${firstPage.width} / ${firstPage.height}`
                  : `${firstPage.height} / ${firstPage.width}`
                : "4 / 5";
              const entryLocked = controlsLocked || intakeBusy;

              return (
                <article
                  key={entry.id}
                  className={`pdf-entry status-${entry.status}${dragOverEntryId === entry.id ? " drag-over" : ""}${draggedEntryId === entry.id ? " dragging-entry" : ""}`}
                  data-pdf-entry={entry.id}
                  onDragOver={(event) => {
                    if (!draggedEntryId || draggedEntryId === entry.id) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverEntryId(entry.id);
                  }}
                  onDragLeave={() =>
                    setDragOverEntryId((current) =>
                      current === entry.id ? null : current,
                    )
                  }
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId =
                      draggedEntryId ||
                      event.dataTransfer.getData("text/plain");
                    setDragOverEntryId(null);
                    setDraggedEntryId(null);
                    if (!sourceId || sourceId === entry.id) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const after = event.clientY > rect.top + rect.height / 2;
                    const sourceIndex = entriesModelRef.current.findIndex(
                      (item) => item.id === sourceId,
                    );
                    let target = index + (after ? 1 : 0);
                    if (sourceIndex < target) target -= 1;
                    moveEntry(sourceId, target, "grip");
                  }}
                >
                  <div className="pdf-entry-main">
                    <div className="pdf-entry-order">
                      <button
                        type="button"
                        className="pdf-grip"
                        data-focus-control="grip"
                        aria-label={`Reorder ${entry.name}. Currently position ${index + 1} of ${entries.length}. Use arrow keys or drag.`}
                        title="Drag to reorder, or use Arrow Up and Arrow Down"
                        draggable={!entryLocked}
                        disabled={entryLocked}
                        onDragStart={(event) => {
                          setDraggedEntryId(entry.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", entry.id);
                        }}
                        onDragEnd={() => {
                          setDraggedEntryId(null);
                          setDragOverEntryId(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            moveEntry(entry.id, index - 1, "grip");
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            moveEntry(entry.id, index + 1, "grip");
                          } else if (event.key === "Home") {
                            event.preventDefault();
                            moveEntry(entry.id, 0, "grip");
                          } else if (event.key === "End") {
                            event.preventDefault();
                            moveEntry(entry.id, entries.length - 1, "grip");
                          }
                        }}
                      >
                        <GripVertical size={21} aria-hidden="true" />
                      </button>
                      <span className="pdf-entry-number" aria-hidden="true">
                        {index + 1}
                      </span>
                      <div
                        className="pdf-reorder-buttons"
                        aria-label={`Move ${entry.name}`}
                      >
                        <button
                          type="button"
                          data-focus-control="first"
                          aria-label={`Move ${entry.name} to first`}
                          disabled={entryLocked || index === 0}
                          onClick={() => moveEntry(entry.id, 0, "down")}
                        >
                          <ArrowUpToLine size={16} />
                        </button>
                        <button
                          type="button"
                          data-focus-control="up"
                          aria-label={`Move ${entry.name} up`}
                          disabled={entryLocked || index === 0}
                          onClick={() =>
                            moveEntry(
                              entry.id,
                              index - 1,
                              index - 1 === 0 ? "down" : "up",
                            )
                          }
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          data-focus-control="down"
                          aria-label={`Move ${entry.name} down`}
                          disabled={entryLocked || index === entries.length - 1}
                          onClick={() =>
                            moveEntry(
                              entry.id,
                              index + 1,
                              index + 1 === entries.length - 1 ? "up" : "down",
                            )
                          }
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          data-focus-control="last"
                          aria-label={`Move ${entry.name} to last`}
                          disabled={entryLocked || index === entries.length - 1}
                          onClick={() =>
                            moveEntry(entry.id, entries.length - 1, "up")
                          }
                        >
                          <ArrowDownToLine size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="pdf-thumbnail" style={{ aspectRatio }}>
                      {entry.thumbnailState === "ready" &&
                      entry.thumbnailUrl ? (
                        <img
                          src={entry.thumbnailUrl}
                          alt={`First page preview of ${entry.name}`}
                        />
                      ) : entry.thumbnailState === "loading" ||
                        entry.status === "inspecting" ? (
                        <div className="pdf-thumbnail-placeholder">
                          <LoaderCircle
                            className="spin"
                            size={24}
                            aria-hidden="true"
                          />
                          <span>
                            {entry.status === "inspecting"
                              ? "Inspecting…"
                              : "Rendering…"}
                          </span>
                        </div>
                      ) : (
                        <div className="pdf-thumbnail-placeholder">
                          <FileText size={30} aria-hidden="true" />
                          <span>
                            {entry.status === "password"
                              ? "Unlock for preview"
                              : "Preview unavailable"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pdf-entry-content">
                      <div className="pdf-entry-title-row">
                        <div>
                          <h4>{entry.name}</h4>
                          <p className="pdf-entry-meta">
                            {formatMiB(entry.size)}
                            {inspection
                              ? ` · ${inspection.pageCount.toLocaleString()} pages · ${geometryLabel(inspection)}`
                              : ""}
                            {segment
                              ? ` · Output pages ${segment.outputStart}–${segment.outputEnd}`
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="icon-button pdf-remove"
                          aria-label={`Remove ${entry.name}`}
                          disabled={controlsLocked || intakeBusy}
                          onClick={() => removeEntry(entry.id)}
                        >
                          <X size={19} />
                        </button>
                      </div>

                      <div className="pdf-badges">
                        {entry.status === "inspecting" ? (
                          <span>
                            <LoaderCircle className="spin" size={13} />{" "}
                            Inspecting locally
                          </span>
                        ) : null}
                        {isReady ? (
                          <span className="success-badge">
                            <CheckCircle2 size={13} /> Ready
                          </span>
                        ) : null}
                        {duplicateIndex !== undefined ? (
                          <span className="warning-badge">
                            <Copy size={13} /> Same content as #
                            {duplicateIndex + 1} — included again unless removed
                          </span>
                        ) : null}
                        {inspection?.encrypted && entry.status === "ready" ? (
                          <span>
                            <LockOpen size={13} /> Unlocked locally · output
                            will not be encrypted
                          </span>
                        ) : null}
                        {inspection?.features.hasForm ? (
                          <span>
                            Form will be flattened if safely supported
                          </span>
                        ) : null}
                        {inspection?.title ? (
                          <span>Source title: {inspection.title}</span>
                        ) : null}
                      </div>

                      {entry.passwordNotice ? (
                        <p className="pdf-inline-note">
                          <Info size={15} aria-hidden="true" />{" "}
                          {entry.passwordNotice}
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
                          <div>
                            <strong>
                              <LockKeyhole size={16} aria-hidden="true" />{" "}
                              Password needed
                            </strong>
                            <p>
                              Enter this PDF’s open password. It is used only in
                              this page’s memory, is never uploaded, and is
                              cleared when the file is removed, the queue resets
                              or a merge completes.
                            </p>
                          </div>
                          <label htmlFor={`pdf-password-${entry.id}`}>
                            Open password for {entry.name}
                          </label>
                          <div className="pdf-password-row">
                            <input
                              id={`pdf-password-${entry.id}`}
                              type={
                                visiblePasswords[entry.id] ? "text" : "password"
                              }
                              autoComplete="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              value={passwordDrafts[entry.id] ?? ""}
                              disabled={entryLocked}
                              aria-describedby={
                                entry.error
                                  ? `pdf-password-error-${entry.id}`
                                  : undefined
                              }
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
                              className="toolbar-button"
                              aria-pressed={Boolean(visiblePasswords[entry.id])}
                              aria-label={`${visiblePasswords[entry.id] ? "Hide" : "Show"} password for ${entry.name}`}
                              disabled={entryLocked}
                              onClick={() =>
                                setVisiblePasswords((previous) => ({
                                  ...previous,
                                  [entry.id]: !previous[entry.id],
                                }))
                              }
                            >
                              {visiblePasswords[entry.id] ? (
                                <EyeOff size={15} />
                              ) : (
                                <Eye size={15} />
                              )}
                              {visiblePasswords[entry.id] ? "Hide" : "Show"}
                            </button>
                          </div>
                          {entry.error ? (
                            <p
                              id={`pdf-password-error-${entry.id}`}
                              className="pdf-field-error"
                              role="alert"
                            >
                              {entry.error}
                            </p>
                          ) : null}
                          <div className="toolbar-actions">
                            <button
                              type="submit"
                              className="primary"
                              disabled={entryLocked}
                            >
                              <LockOpen size={15} /> Unlock PDF
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              disabled={entryLocked}
                              onClick={() => void unlockEntry(entry.id, "")}
                            >
                              Try blank password
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {(entry.status === "error" ||
                        entry.status === "blocked") &&
                      entry.error ? (
                        <div className="pdf-entry-alert" role="alert">
                          <TriangleAlert size={18} aria-hidden="true" />
                          <div>
                            <p>{entry.error}</p>
                            <div className="toolbar-actions">
                              {entry.status === "error" ? (
                                <button
                                  type="button"
                                  className="toolbar-button"
                                  disabled={entryLocked}
                                  onClick={() => retryEntry(entry.id)}
                                >
                                  <RotateCcw size={14} /> Retry inspection
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="toolbar-button"
                                disabled={entryLocked}
                                onClick={() => removeEntry(entry.id)}
                              >
                                <Trash2 size={14} /> Remove this PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {inspection && inspection.warnings.length > 0 ? (
                        <details className="pdf-file-notes">
                          <summary>
                            File notes & limits ({inspection.warnings.length})
                          </summary>
                          <ul>
                            {inspection.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}

                      {isReady ? (
                        <div className="pdf-page-selection">
                          <fieldset>
                            <legend>Pages to include from {entry.name}</legend>
                            <div className="pdf-mode-row">
                              <label className="check-label">
                                <input
                                  type="radio"
                                  name={`pdf-mode-${entry.id}`}
                                  checked={entry.selectionMode === "all"}
                                  disabled={entryLocked}
                                  onChange={() =>
                                    applySelection(
                                      entry.id,
                                      Array.from(
                                        { length: inspection.pageCount },
                                        (_, page) => page,
                                      ),
                                      "all",
                                      "all",
                                    )
                                  }
                                />
                                All pages
                              </label>
                              <label className="check-label">
                                <input
                                  type="radio"
                                  name={`pdf-mode-${entry.id}`}
                                  checked={entry.selectionMode === "custom"}
                                  disabled={entryLocked}
                                  onChange={() => {
                                    invalidateResult();
                                    updateEntry(entry.id, {
                                      selectionMode: "custom",
                                    });
                                  }}
                                />
                                Custom pages
                              </label>
                            </div>
                          </fieldset>

                          {entry.selectionMode === "custom" ? (
                            <>
                              <label htmlFor={`pdf-range-${entry.id}`}>
                                Page range
                              </label>
                              <input
                                id={`pdf-range-${entry.id}`}
                                className="pdf-range-input"
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                spellCheck={false}
                                value={entry.pageInput}
                                disabled={entryLocked}
                                aria-invalid={Boolean(entry.rangeError)}
                                aria-describedby={`pdf-range-help-${entry.id}${entry.rangeError ? ` pdf-range-error-${entry.id}` : ""}`}
                                onChange={(event) =>
                                  handleRangeChange(
                                    entry,
                                    event.currentTarget.value,
                                  )
                                }
                              />
                              <p
                                id={`pdf-range-help-${entry.id}`}
                                className="help"
                              >
                                Examples: <code>1-3, 5</code> or{" "}
                                <code>all</code>. Pages are included in document
                                order; duplicates are reported instead of being
                                removed silently.
                              </p>
                              {entry.rangeError ? (
                                <p
                                  id={`pdf-range-error-${entry.id}`}
                                  className="pdf-field-error"
                                  role="alert"
                                >
                                  {entry.rangeError}
                                </p>
                              ) : null}
                            </>
                          ) : entry.rangeError ? (
                            <p className="pdf-field-error" role="alert">
                              {entry.rangeError}
                            </p>
                          ) : null}

                          <div className="pdf-selection-summary">
                            <span>
                              {formatPageSelectionSummary(
                                entry.pageIndices,
                                inspection.pageCount,
                              )}
                            </span>
                            <button
                              type="button"
                              className="toolbar-button"
                              aria-expanded={entry.previewOpen}
                              aria-controls={`pdf-picker-${entry.id}`}
                              disabled={entryLocked}
                              onClick={() => togglePagePicker(entry)}
                            >
                              <ListOrdered size={15} />{" "}
                              {entry.previewOpen
                                ? "Hide page picker"
                                : "Choose pages visually"}
                            </button>
                          </div>

                          {entry.previewOpen ? (
                            <div
                              id={`pdf-picker-${entry.id}`}
                              className="pdf-page-picker"
                            >
                              <div className="pdf-picker-toolbar">
                                <strong>
                                  Tap pages to include or exclude them
                                </strong>
                                <div className="toolbar-actions">
                                  <button
                                    type="button"
                                    className="toolbar-button"
                                    disabled={entryLocked}
                                    onClick={() =>
                                      applySelection(
                                        entry.id,
                                        Array.from(
                                          { length: inspection.pageCount },
                                          (_, page) => page,
                                        ),
                                        "custom",
                                      )
                                    }
                                  >
                                    Select all
                                  </button>
                                  <button
                                    type="button"
                                    className="toolbar-button"
                                    disabled={entryLocked}
                                    onClick={() =>
                                      applySelection(entry.id, [], "custom", "")
                                    }
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    className="toolbar-button"
                                    disabled={entryLocked}
                                    onClick={() => {
                                      const selected = new Set(
                                        entry.pageIndices,
                                      );
                                      applySelection(
                                        entry.id,
                                        Array.from(
                                          { length: inspection.pageCount },
                                          (_, page) => page,
                                        ).filter((page) => !selected.has(page)),
                                        "custom",
                                      );
                                    }}
                                  >
                                    Invert
                                  </button>
                                </div>
                              </div>

                              {entry.previewState === "loading" &&
                              entry.previewLoadedCount === 0 ? (
                                <p className="pdf-picker-status">
                                  <LoaderCircle className="spin" size={17} />{" "}
                                  Rendering page previews locally…
                                </p>
                              ) : null}
                              {entry.previewError ? (
                                <p className="pdf-field-error" role="alert">
                                  {entry.previewError}
                                </p>
                              ) : null}

                              <div className="pdf-page-grid">
                                {Array.from(
                                  { length: entry.previewLoadedCount },
                                  (_, pageIndex) => {
                                    const selectedPage =
                                      entry.pageIndices.includes(pageIndex);
                                    const url = entry.previewPages[pageIndex];
                                    return (
                                      <button
                                        type="button"
                                        key={pageIndex}
                                        className={`pdf-page-tile${selectedPage ? " selected" : ""}`}
                                        aria-pressed={selectedPage}
                                        aria-label={`${selectedPage ? "Exclude" : "Include"} page ${pageIndex + 1} of ${entry.name}`}
                                        disabled={entryLocked}
                                        onClick={() =>
                                          togglePreviewPage(entry, pageIndex)
                                        }
                                      >
                                        {url ? (
                                          <img src={url} alt="" />
                                        ) : (
                                          <FileText
                                            size={28}
                                            aria-hidden="true"
                                          />
                                        )}
                                        <span>
                                          Page {pageIndex + 1}{" "}
                                          {selectedPage
                                            ? "· Included"
                                            : "· Excluded"}
                                        </span>
                                      </button>
                                    );
                                  },
                                )}
                              </div>

                              {entry.previewLoadedCount <
                              inspection.pageCount ? (
                                <button
                                  type="button"
                                  className="secondary"
                                  disabled={
                                    entryLocked ||
                                    entry.previewState === "loading"
                                  }
                                  onClick={() =>
                                    void loadPreviewBatch(entry.id)
                                  }
                                >
                                  {entry.previewState === "loading" ? (
                                    <LoaderCircle className="spin" size={16} />
                                  ) : (
                                    <FilePlus2 size={16} />
                                  )}
                                  Load next{" "}
                                  {Math.min(
                                    PREVIEW_BATCH_SIZE,
                                    inspection.pageCount -
                                      entry.previewLoadedCount,
                                  )}{" "}
                                  previews ({entry.previewLoadedCount}/
                                  {inspection.pageCount})
                                </button>
                              ) : (
                                <p className="help">
                                  All {inspection.pageCount} page previews are
                                  loaded locally.
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <section
            className="pdf-output-panel"
            aria-labelledby="pdf-output-title"
          >
            <div className="pdf-output-heading">
              <div>
                <h3 id="pdf-output-title">Output settings</h3>
                <p>Review the exact result before anything is created.</p>
              </div>
              <span className="local-badge">Validated before download</span>
            </div>

            <div className="pdf-output-grid">
              <div>
                <label htmlFor="pdf-output-name">Download file name</label>
                <div className="pdf-filename-row">
                  <input
                    id="pdf-output-name"
                    type="text"
                    value={outputFilename}
                    disabled={controlsLocked}
                    onChange={(event) => {
                      invalidateResult();
                      setOutputFilename(event.currentTarget.value);
                    }}
                    aria-describedby="pdf-final-filename"
                  />
                  <span>.pdf</span>
                </div>
                <p id="pdf-final-filename" className="help">
                  Final name: <strong>{finalFilename}</strong>
                </p>
              </div>
              <div>
                <label htmlFor="pdf-output-title-input">
                  PDF document title
                </label>
                <input
                  id="pdf-output-title-input"
                  type="text"
                  value={outputTitle}
                  disabled={controlsLocked}
                  onChange={(event) => {
                    invalidateResult();
                    setOutputTitle(event.currentTarget.value);
                  }}
                />
                <p className="help">Stored title: {finalTitle}</p>
              </div>
              <label className="check-label pdf-bookmark-option">
                <input
                  type="checkbox"
                  checked={createBookmarks}
                  disabled={controlsLocked}
                  onChange={(event) => {
                    invalidateResult();
                    setCreateBookmarks(event.currentTarget.checked);
                  }}
                />
                <span>
                  <BookmarkPlus size={16} aria-hidden="true" /> Add one bookmark
                  per source PDF
                  <small>
                    Original bookmark trees are not carried over; these new
                    bookmarks use each file name.
                  </small>
                </span>
              </label>
            </div>

            <div
              className="insight-grid pdf-summary-grid"
              aria-label="Merge summary"
            >
              <div className="insight">
                <strong>
                  {entries.filter((entry) => entry.status === "ready").length}/
                  {entries.length}
                </strong>
                <span>PDFs ready</span>
              </div>
              <div className="insight">
                <strong>{summary.totalPages.toLocaleString()}</strong>
                <span>selected output pages</span>
              </div>
              <div className="insight">
                <strong>{formatMiB(totalInputBytes)}</strong>
                <span>input size on device</span>
              </div>
              <div className="insight">
                <strong>{createBookmarks ? summary.segments.length : 0}</strong>
                <span>new source bookmarks</span>
              </div>
            </div>

            {summary.segments.length > 0 ? (
              <details className="pdf-file-notes pdf-output-map">
                <summary>See exactly where each PDF will appear</summary>
                <ol>
                  {summary.segments.map((segment) => (
                    <li key={segment.entryId}>
                      <strong>{segment.name}</strong> — source pages{" "}
                      {serializePageSelection(
                        segment.pageIndices,
                        segment.totalPages,
                      )}{" "}
                      → output pages {segment.outputStart}–{segment.outputEnd}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}

            {blockers.length > 0 ? (
              <div className="pdf-blockers" role="status">
                <strong>
                  <Ban size={16} aria-hidden="true" /> Before merging
                </strong>
                <ul>
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="pdf-ready-note">
                <CheckCircle2 size={17} aria-hidden="true" /> Ready to merge{" "}
                {summary.totalPages} selected pages into {finalFilename}.
                Processing stays in this browser.
              </p>
            )}

            {mergeNotice ? (
              <p className="pdf-inline-note" role="status">
                <Info size={16} aria-hidden="true" /> {mergeNotice}
              </p>
            ) : null}

            {isMerging && progress ? (
              <div className="pdf-progress-panel" aria-live="polite">
                <div className="pdf-progress-heading">
                  <strong>
                    <LoaderCircle
                      className="spin"
                      size={18}
                      aria-hidden="true"
                    />{" "}
                    {progress.message}
                  </strong>
                  <span>
                    {progress.percent}% · {elapsedSeconds}s
                  </span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="PDF merge progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                  aria-valuetext={progress.message}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p>
                  Stage: {progress.stage}. You can cancel safely; the originals
                  and queue will remain unchanged.
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={cancelMerge}
                >
                  <Ban size={16} /> Cancel merge
                </button>
              </div>
            ) : (
              <div className="action-row pdf-merge-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => void merge()}
                  disabled={!canMerge}
                >
                  <Merge size={17} /> Merge {summary.totalPages || ""} pages
                </button>
                <span className="pdf-no-upload-inline">
                  <ShieldCheck size={16} aria-hidden="true" /> No upload · no
                  account · output checked after writing
                </span>
              </div>
            )}

            {mergeError ? (
              <div
                ref={mergeErrorRef}
                className="status error"
                role="alert"
                tabIndex={-1}
              >
                <p>{mergeError}</p>
              </div>
            ) : null}
          </section>
        </>
      )}

      {result ? (
        <section
          className="result-panel pdf-result-panel"
          aria-labelledby="pdf-result-title"
        >
          <div className="pdf-result-preview">
            {result.previewState === "ready" && result.previewUrl ? (
              <img
                src={result.previewUrl}
                alt="First page preview of the merged PDF"
              />
            ) : result.previewState === "loading" ? (
              <div className="pdf-thumbnail-placeholder large">
                <LoaderCircle className="spin" size={28} aria-hidden="true" />
                <span>Rendering the validated first page…</span>
              </div>
            ) : (
              <div className="pdf-thumbnail-placeholder large">
                <FileText size={38} aria-hidden="true" />
                <span>
                  Preview unavailable. The PDF itself passed reopening
                  validation.
                </span>
              </div>
            )}
          </div>
          <div className="pdf-result-content">
            <span className="eyebrow">MERGED & VALIDATED LOCALLY</span>
            <h3 id="pdf-result-title" ref={resultHeadingRef} tabIndex={-1}>
              {result.filename}
            </h3>
            <p>
              {result.pageCount.toLocaleString()} pages ·{" "}
              {formatMiB(result.size)} · Title: {result.title}
            </p>
            <div className="meta-chips">
              <span>Reopened successfully</span>
              <span>No extra page objects</span>
              <span>{result.bookmarkTitles.length} source bookmarks</span>
              <span>Created without upload</span>
            </div>
            {result.notices.length > 0 ? (
              <details className="pdf-file-notes" open>
                <summary>
                  What changed during the merge ({result.notices.length})
                </summary>
                <ul>
                  {result.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            <div className="action-row">
              <a
                className="primary"
                href={result.url}
                download={result.filename}
              >
                <Download size={17} /> Download merged PDF
              </a>
              <a
                className="secondary"
                href={result.url}
                target="_blank"
                rel="noreferrer"
              >
                <Eye size={16} /> Open preview
              </a>
            </div>
            <div className="toolbar-actions">
              <button
                type="button"
                className="toolbar-button"
                onClick={() =>
                  document
                    .querySelector<HTMLElement>("[data-pdf-queue-heading]")
                    ?.focus()
                }
              >
                <ListOrdered size={15} /> Back to queue
              </button>
              <button
                type="button"
                className="toolbar-button"
                onClick={startNewMerge}
              >
                <RotateCcw size={15} /> Start a new merge
              </button>
            </div>
            <p className="help">
              Download the file before closing this tab. Changing the queue or
              output settings clears this result so a stale PDF is never
              presented as current.
            </p>
          </div>
        </section>
      ) : null}

      {canMerge && !result ? (
        <div className="pdf-mobile-action" aria-hidden="false">
          <span>
            {summary.totalPages} pages · {finalFilename}
          </span>
          <button
            type="button"
            className="primary"
            onClick={() => void merge()}
          >
            <Merge size={16} /> Merge
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
