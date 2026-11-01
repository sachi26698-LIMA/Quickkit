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
  FilePlus2,
  FileText,
  Info,
  Layers,
  LoaderCircle,
  LockKeyhole,
  LockOpen,
  RotateCcw,
  Rows3,
  ScissorsLineDashed,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";

import { useHydrated } from "@/lib/use-hydrated";
import type { PdfMergeProgress } from "@/lib/tools/pdf/merge-engine";
import {
  PdfMergeError,
  formatMiB,
  isBlockingInspection,
  isPdfSignature,
  parsePageRange,
  serializePageSelection,
  validatePdfFileCandidate,
  type PdfInspection,
  type PdfMergeIssueCode,
} from "@/lib/tools/pdf/merge-pdf-logic";
import {
  renderPdfPageBatch,
  renderPdfResultPreview,
  renderPdfThumbnail,
} from "@/lib/tools/pdf/pdf-preview";
import {
  PDF_SPLIT_LIMITS,
  buildPdfSplitPlan,
  buildZipFilename,
  filenameBase,
  outputsForPage,
  type PdfExtractStyle,
  type PdfSplitMode,
  type PdfSplitNamingStyle,
  type PdfSplitPlan,
} from "@/lib/tools/pdf/split-pdf-logic";
import { usePdfSplitWorker } from "@/lib/tools/pdf/use-pdf-split-worker";
import { EmptyState, WorkspaceHeading } from "./tool-ui";

type SourceStatus = "blocked" | "error" | "inspecting" | "password" | "ready";
type ThumbnailState = "idle" | "loading" | "ready" | "unavailable";
type PreviewState = "error" | "idle" | "loading" | "ready";

interface SplitSource {
  error?: string;
  errorCode?: PdfMergeIssueCode;
  file: File;
  id: string;
  inspection?: PdfInspection;
  name: string;
  password?: string;
  passwordNotice?: string;
  previewError?: string;
  previewLoadedCount: number;
  previewPages: Record<number, string>;
  previewState: PreviewState;
  size: number;
  status: SourceStatus;
  thumbnailState: ThumbnailState;
  thumbnailUrl?: string;
}

interface IntakeIssue {
  id: string;
  message: string;
  name: string;
}

interface SplitResultOutput {
  filename: string;
  pageCount: number;
  pagesLabel: string;
  size: number;
  title: string;
  url: string;
}

interface SplitResultState {
  notices: string[];
  outputs: SplitResultOutput[];
  previewState: PreviewState;
  previewUrl?: string;
  removedActions: number;
  removedDestinations: number;
  removedLinkAnnotations: number;
  totalBytes: number;
  zipFilename?: string;
  zipSize?: number;
  zipUrl?: string;
}

interface ProgressState extends PdfMergeProgress {
  percent: number;
}

const PREVIEW_BATCH_SIZE = 24;

function createSource(file: File): SplitSource {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `pdf-split-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    file,
    id,
    name: file.name,
    previewLoadedCount: 0,
    previewPages: {},
    previewState: "idle",
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
  if (progress.stage === "finalizing") return Math.round(85 + fraction * 10);
  if (progress.stage === "saving") return 96;
  return 98;
}

function geometryLabel(inspection: PdfInspection): string {
  const { height, rotation, width } = inspection.firstPage;
  const rotationText = rotation ? ` · ${rotation}°` : "";
  return `${Math.round(width)} × ${Math.round(height)} pt${rotationText}`;
}

function sourceWarnings(source: SplitSource): string[] {
  const inspection = source.inspection;
  if (!inspection) return [];
  const { features } = inspection;
  const warnings: string[] = [];
  if (features.hasForm) {
    warnings.push(
      "Interactive form fields will be flattened only after visible-value checks; split fields will not remain editable.",
    );
  }
  if (features.hasOutlines) {
    warnings.push(
      "The original shared bookmark tree is not copied into split PDFs.",
    );
  }
  if (features.hasAttachments) {
    warnings.push(
      "Embedded attachments are not copied into split PDFs; extract them from the original if needed.",
    );
  }
  if (features.hasLayers) {
    warnings.push(
      "Optional-content layers may not remain interactive after splitting.",
    );
  }
  if (features.hasTags) {
    warnings.push(
      "Tagged-PDF accessibility structure is not guaranteed after splitting.",
    );
  }
  if (features.hasJavaScript) {
    warnings.push(
      "Document JavaScript and unsupported script-based actions are removed.",
    );
  }
  if (features.hasSignatureField && !features.hasSignedSignature) {
    warnings.push(
      "Unsigned signature fields are flattened like other checked form fields.",
    );
  }
  if (inspection.encrypted) {
    warnings.push(
      "The open password is not re-applied; validated split outputs are unencrypted.",
    );
  }
  return warnings;
}

function splitErrorMessage(error: unknown): string {
  if (error instanceof PdfMergeError) {
    if (error.code === "password_required") {
      return "This PDF is password-protected. Enter its open password to preview and split it. The password stays on this device.";
    }
    return error.message
      .replace(/inspect and merge/gi, "preview and split")
      .replace(/the merge was stopped/gi, "the split was stopped")
      .replace(/then merge that copy/gi, "then split that copy")
      .replace(/merged PDF/gi, "split PDF");
  }
  return error instanceof Error
    ? error.message
    : "This PDF could not be processed locally. Remove it and try a fresh export from your PDF app.";
}

export default function PdfSplitter() {
  const ready = useHydrated();
  const { cancel, inspect, split } = usePdfSplitWorker();
  const [source, setSource] = useState<SplitSource | null>(null);
  const [intakeIssues, setIntakeIssues] = useState<IntakeIssue[]>([]);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [mode, setMode] = useState<PdfSplitMode>("ranges");
  const [rangeText, setRangeText] = useState("");
  const [extractText, setExtractText] = useState("all");
  const [extractError, setExtractError] = useState("");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [extractStyle, setExtractStyle] = useState<PdfExtractStyle>("combined");
  const [everyNText, setEveryNText] = useState("5");
  const [outputBase, setOutputBase] = useState("split-pdf");
  const [namingStyle, setNamingStyle] = useState<PdfSplitNamingStyle>("both");
  const [zipName, setZipName] = useState("split-pdfs");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [result, setResult] = useState<SplitResultState | null>(null);
  const [splitError, setSplitError] = useState("");
  const [splitNotice, setSplitNotice] = useState("");
  const [isSplitting, setIsSplitting] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const sourceModelRef = useRef<SplitSource | null>(null);
  const trackedUrlsRef = useRef(new Set<string>());
  const resultRef = useRef<SplitResultState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const splitErrorRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const sourceTokenRef = useRef(0);
  const previewTokenRef = useRef(0);
  const splitVersionRef = useRef(0);
  const splitStartedAtRef = useRef(0);
  const planSourceIdRef = useRef<string | null>(null);
  const maxProgressRef = useRef(0);

  const replaceSource = useCallback((next: SplitSource | null) => {
    sourceModelRef.current = next;
    setSource(next);
  }, []);

  const updateSource = useCallback(
    (
      patch:
        Partial<SplitSource> | ((current: SplitSource) => Partial<SplitSource>),
    ): SplitSource | null => {
      const current = sourceModelRef.current;
      if (!current) return null;
      const next = {
        ...current,
        ...(typeof patch === "function" ? patch(current) : patch),
      };
      sourceModelRef.current = next;
      setSource(next);
      return next;
    },
    [],
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

  const revokeSourceUrls = useCallback(
    (current: SplitSource | null) => {
      if (!current) return;
      revokeTrackedUrl(current.thumbnailUrl);
      Object.values(current.previewPages).forEach((url) =>
        revokeTrackedUrl(url),
      );
    },
    [revokeTrackedUrl],
  );

  const clearResult = useCallback(() => {
    if (resultRef.current) {
      resultRef.current.outputs.forEach((output) =>
        revokeTrackedUrl(output.url),
      );
      revokeTrackedUrl(resultRef.current.zipUrl);
      revokeTrackedUrl(resultRef.current.previewUrl);
      resultRef.current = null;
    }
    setResult(null);
  }, [revokeTrackedUrl]);

  const invalidateResult = useCallback(() => {
    splitVersionRef.current += 1;
    clearResult();
    setSplitError("");
    setSplitNotice("");
  }, [clearResult]);

  useEffect(() => {
    const urls = trackedUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!isSplitting) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - splitStartedAtRef.current) / 1000),
        ),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [isSplitting]);

  const loadThumbnail = useCallback(async () => {
    const current = sourceModelRef.current;
    if (!current || current.status === "error") return;
    const token = sourceTokenRef.current;
    updateSource({ thumbnailState: "loading" });
    try {
      const data = await current.file.arrayBuffer();
      const blob = await renderPdfThumbnail(
        new Uint8Array(data),
        current.password,
        0,
      );
      if (token !== sourceTokenRef.current || !sourceModelRef.current) return;
      const url = createTrackedUrl(blob);
      revokeTrackedUrl(sourceModelRef.current.thumbnailUrl);
      updateSource({ thumbnailState: "ready", thumbnailUrl: url });
    } catch {
      if (token === sourceTokenRef.current) {
        updateSource({
          thumbnailState: "unavailable",
          thumbnailUrl: undefined,
        });
      }
    }
  }, [createTrackedUrl, revokeTrackedUrl, updateSource]);

  const loadPreviewBatch = useCallback(async () => {
    const current = sourceModelRef.current;
    if (
      !current?.inspection ||
      current.status !== "ready" ||
      current.previewState === "loading"
    ) {
      return;
    }
    const start = current.previewLoadedCount;
    const pageCount = current.inspection.pageCount;
    if (start >= pageCount) return;
    const end = Math.min(pageCount, start + PREVIEW_BATCH_SIZE);
    const indices = Array.from(
      { length: end - start },
      (_, offset) => start + offset,
    );
    const token = ++previewTokenRef.current;
    updateSource({ previewError: undefined, previewState: "loading" });
    let completed = 0;

    try {
      const data = await current.file.arrayBuffer();
      if (token !== previewTokenRef.current) return;
      await renderPdfPageBatch(
        new Uint8Array(data),
        current.password,
        indices,
        (pageIndex, blob) => {
          completed += 1;
          if (token !== previewTokenRef.current || !sourceModelRef.current)
            return;
          const url = createTrackedUrl(blob);
          revokeTrackedUrl(sourceModelRef.current.previewPages[pageIndex]);
          updateSource((item) => ({
            previewLoadedCount: Math.max(
              item.previewLoadedCount,
              pageIndex + 1,
            ),
            previewPages: { ...item.previewPages, [pageIndex]: url },
          }));
        },
      );
      if (token !== previewTokenRef.current) return;
      updateSource((item) => ({
        previewLoadedCount: Math.max(item.previewLoadedCount, end),
        previewState: "ready",
      }));
    } catch {
      if (token !== previewTokenRef.current) return;
      updateSource((item) => ({
        previewError:
          "Some page previews could not be rendered in this browser. Typed ranges still work, and every output is validated before download.",
        previewLoadedCount: Math.max(
          item.previewLoadedCount,
          start + completed,
        ),
        previewState: "error",
      }));
    }
  }, [createTrackedUrl, revokeTrackedUrl, updateSource]);

  const sourceId = source?.id;
  const sourceStatus = source?.status;
  useEffect(() => {
    if (sourceStatus === "ready") void loadPreviewBatch();
  }, [loadPreviewBatch, sourceId, sourceStatus]);

  const setInitialPlan = useCallback(
    (current: SplitSource, inspection: PdfInspection) => {
      if (planSourceIdRef.current === current.id) return;
      planSourceIdRef.current = current.id;
      const pageCount = inspection.pageCount;
      const base = filenameBase(current.name, "split-pdf");
      setOutputBase(`${base}-split`);
      setZipName(`${base}-split-files`);
      setMode("ranges");
      if (pageCount === 1) {
        setRangeText("1");
      } else if (pageCount <= 3) {
        setRangeText(
          Array.from({ length: pageCount }, (_, index) => index + 1).join("; "),
        );
      } else {
        const midpoint = Math.ceil(pageCount / 2);
        setRangeText(`1-${midpoint}; ${midpoint + 1}-${pageCount}`);
      }
      const allPages = Array.from({ length: pageCount }, (_, index) => index);
      setSelectedPages(allPages);
      setExtractText("all");
      setExtractError("");
      setExtractStyle("combined");
      setEveryNText(String(Math.min(5, pageCount)));
      setNamingStyle("both");
    },
    [],
  );

  const inspectSourceNow = useCallback(
    async (passwordOverride?: string, passwordWasExplicit = false) => {
      const initial = sourceModelRef.current;
      if (!initial) return;
      const token = ++sourceTokenRef.current;
      setIntakeBusy(true);
      updateSource({
        error: undefined,
        errorCode: undefined,
        status: "inspecting",
        thumbnailState: "idle",
      });

      try {
        const data = await initial.file.arrayBuffer();
        if (token !== sourceTokenRef.current || !sourceModelRef.current) return;
        const password = passwordWasExplicit
          ? passwordOverride
          : initial.password;
        const inspection = await inspect(data, password);
        if (token !== sourceTokenRef.current || !sourceModelRef.current) return;
        const current = sourceModelRef.current;
        const blocked = isBlockingInspection(inspection.features);
        const effectivePassword = inspection.encrypted
          ? (password ?? "")
          : undefined;
        updateSource({
          error: blocked
            ? inspection.features.hasXFA
              ? "Dynamic XFA forms are not supported. Print or export this file to a standard PDF, then split that copy."
              : "This PDF appears to be digitally signed. Splitting is blocked so a signature is not silently invalidated."
            : undefined,
          errorCode: blocked
            ? inspection.features.hasXFA
              ? "unsupported_xfa"
              : "signed_pdf"
            : undefined,
          inspection,
          password: effectivePassword,
          passwordNotice: undefined,
          status: blocked ? "blocked" : "ready",
        });
        if (!blocked) setInitialPlan(current, inspection);
        void loadThumbnail();
      } catch (error) {
        if (token !== sourceTokenRef.current || !sourceModelRef.current) return;
        if (error instanceof PdfMergeError && error.code === "cancelled")
          return;
        if (
          error instanceof PdfMergeError &&
          (error.code === "password_required" ||
            error.code === "password_invalid")
        ) {
          updateSource({
            error: splitErrorMessage(error),
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
        updateSource({
          error: splitErrorMessage(error),
          errorCode:
            error instanceof PdfMergeError
              ? error.code
              : "corrupt_or_unsupported",
          password: undefined,
          status: "error",
        });
      } finally {
        if (token === sourceTokenRef.current) setIntakeBusy(false);
      }
    },
    [inspect, loadThumbnail, setInitialPlan, updateSource],
  );

  const removeSource = useCallback(() => {
    invalidateResult();
    sourceTokenRef.current += 1;
    previewTokenRef.current += 1;
    cancel();
    revokeSourceUrls(sourceModelRef.current);
    replaceSource(null);
    planSourceIdRef.current = null;
    setIntakeBusy(false);
    setPasswordDraft("");
    setPasswordVisible(false);
    setSelectedPages([]);
    setExtractText("all");
    setExtractError("");
    setRangeText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cancel, invalidateResult, replaceSource, revokeSourceUrls]);

  const addFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      const files = fileList ? [...fileList] : [];
      if (files.length === 0) return;
      const [file, ...extras] = files;
      const issues: IntakeIssue[] = extras.map((extra, index) => ({
        id: `extra-${extra.name}-${extra.size}-${index}`,
        message:
          "PDF Splitter works on one source PDF at a time, so this extra file was not added. Split the first PDF, then start again with this file.",
        name: extra.name,
      }));
      const validationError = validatePdfFileCandidate(file, 0, 0);
      if (validationError) {
        setIntakeIssues((previous) => [
          ...previous,
          {
            id: `invalid-${file.name}-${file.size}-${file.lastModified}`,
            message: validationError.message,
            name: file.name,
          },
          ...issues,
        ]);
        return;
      }

      invalidateResult();
      sourceTokenRef.current += 1;
      previewTokenRef.current += 1;
      revokeSourceUrls(sourceModelRef.current);
      planSourceIdRef.current = null;
      setPasswordDraft("");
      setPasswordVisible(false);
      setSelectedPages([]);
      setExtractError("");
      const nextSource = createSource(file);
      replaceSource(nextSource);
      if (issues.length > 0) {
        setIntakeIssues((previous) => [...previous, ...issues]);
      }

      try {
        const prefix = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
        if (!isPdfSignature(prefix)) {
          updateSource({
            error:
              "This file does not start with a PDF signature. It may be renamed, corrupted or an incomplete download. Open it in a PDF reader, export a fresh PDF, then try again.",
            errorCode: "invalid_pdf",
            status: "error",
          });
          return;
        }
      } catch {
        updateSource({
          error:
            "This file could not be read from your device. Choose it again or export a fresh PDF copy.",
          errorCode: "corrupt_or_unsupported",
          status: "error",
        });
        return;
      }
      await inspectSourceNow();
    },
    [
      inspectSourceNow,
      invalidateResult,
      replaceSource,
      revokeSourceUrls,
      updateSource,
    ],
  );

  async function unlockSource(password: string) {
    invalidateResult();
    setPasswordDraft("");
    await inspectSourceNow(password, true);
  }

  const pageCount = source?.inspection?.pageCount ?? 0;
  const planState = useMemo((): {
    error?: string;
    plan: PdfSplitPlan | null;
  } => {
    if (!source?.inspection || source.status !== "ready") {
      return { plan: null };
    }
    if (mode === "extract" && extractError) {
      return { error: extractError, plan: null };
    }
    try {
      return {
        plan: buildPdfSplitPlan({
          baseName: outputBase,
          everyN: Number(everyNText),
          extractStyle,
          mode,
          namingStyle,
          pageCount: source.inspection.pageCount,
          rangeText,
          selectedPageIndices: selectedPages,
        }),
      };
    } catch (error) {
      return { error: splitErrorMessage(error), plan: null };
    }
  }, [
    everyNText,
    extractError,
    extractStyle,
    mode,
    namingStyle,
    outputBase,
    rangeText,
    selectedPages,
    source,
  ]);
  const plan = planState.plan;
  const planError = planState.error;

  const blockers = useMemo(() => {
    const items: string[] = [];
    if (!source) items.push("Add one PDF to split.");
    if (source?.status === "inspecting")
      items.push("Wait for local PDF inspection to finish.");
    if (source?.status === "password")
      items.push("Unlock the PDF with its open password or remove it.");
    if (source?.status === "error")
      items.push("Remove or retry the unreadable PDF; it will not be skipped.");
    if (source?.status === "blocked")
      items.push(
        "Remove the blocked XFA or signed PDF, or add a supported copy.",
      );
    if (source?.status === "ready" && planError) items.push(planError);
    return items;
  }, [planError, source]);

  const canSplit = Boolean(
    ready && !isSplitting && !intakeBusy && source?.status === "ready" && plan,
  );
  const finalZipFilename = buildZipFilename(zipName);
  const controlsLocked = !ready || isSplitting;
  const warnings = source ? sourceWarnings(source) : [];

  function applyExtractSelection(nextPages: number[]) {
    const sorted = [...new Set(nextPages)].sort((a, b) => a - b);
    invalidateResult();
    setSelectedPages(sorted);
    setExtractText(serializePageSelection(sorted, pageCount));
    setExtractError(
      sorted.length
        ? ""
        : "Select at least one page to extract. Tap page previews or enter pages such as 1-3, 5.",
    );
  }

  function handleExtractTextChange(value: string) {
    invalidateResult();
    setExtractText(value);
    if (!pageCount) return;
    if (!value.trim()) {
      setSelectedPages([]);
      setExtractError(
        "Select at least one page to extract. Tap page previews or enter pages such as 1-3, 5.",
      );
      return;
    }
    try {
      setSelectedPages(parsePageRange(value, pageCount));
      setExtractError("");
    } catch (error) {
      setExtractError(splitErrorMessage(error));
    }
  }

  function toggleExtractPage(pageIndex: number) {
    const selected = new Set(selectedPages);
    if (selected.has(pageIndex)) selected.delete(pageIndex);
    else selected.add(pageIndex);
    applyExtractSelection([...selected]);
  }

  function applySplitError(error: PdfMergeError) {
    if (
      error.code === "password_required" ||
      error.code === "password_invalid"
    ) {
      updateSource({
        error: splitErrorMessage(error),
        errorCode: error.code,
        password: undefined,
        status: "password",
      });
    } else if (
      error.code === "unsupported_xfa" ||
      error.code === "signed_pdf"
    ) {
      updateSource({
        error: splitErrorMessage(error),
        errorCode: error.code,
        status: "blocked",
      });
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
      updateSource({
        error: splitErrorMessage(error),
        errorCode: error.code,
        status: "error",
      });
    }
  }

  function clearPasswordAfterSuccessfulSplit() {
    const current = sourceModelRef.current;
    if (!current?.inspection?.encrypted) return;
    sourceTokenRef.current += 1;
    previewTokenRef.current += 1;
    updateSource({
      error: undefined,
      errorCode: undefined,
      password: undefined,
      passwordNotice:
        "For safety, the password was cleared after the completed split. Enter it again only if you change the plan and want another version.",
      status: "password",
    });
    setPasswordDraft("");
    setPasswordVisible(false);
  }

  async function splitPdf() {
    const current = sourceModelRef.current;
    if (!current || !plan || !canSplit) return;
    const version = ++splitVersionRef.current;
    clearResult();
    setSplitError("");
    setSplitNotice("");
    setIsSplitting(true);
    setElapsedSeconds(0);
    maxProgressRef.current = 2;
    splitStartedAtRef.current = Date.now();
    setProgress({
      current: 0,
      message: "Preparing your PDF on this device",
      percent: 2,
      stage: "preparing",
      total: Math.max(1, plan.totalOutputPages),
    });

    try {
      const data = await current.file.arrayBuffer();
      if (version !== splitVersionRef.current) return;
      const workerResult = await split(
        data,
        current.name,
        plan.outputs.map((output) => ({
          filename: output.filename,
          pageIndices: output.pageIndices,
          pagesLabel: output.pagesLabel,
          title: output.title,
        })),
        finalZipFilename,
        current.password,
        (nextProgress) => {
          if (version !== splitVersionRef.current) return;
          const percent = Math.max(
            maxProgressRef.current,
            progressPercent(nextProgress),
          );
          maxProgressRef.current = percent;
          setProgress({ ...nextProgress, percent });
        },
      );
      if (version !== splitVersionRef.current) return;

      const outputs = workerResult.outputs.map<SplitResultOutput>((output) => {
        const blob = new Blob([output.data], {
          type: "application/pdf",
        });
        return {
          filename: output.filename,
          pageCount: output.pageCount,
          pagesLabel: output.pagesLabel,
          size: blob.size,
          title: output.title,
          url: createTrackedUrl(blob),
        };
      });
      const zipBlob = workerResult.zipData
        ? new Blob([workerResult.zipData], { type: "application/zip" })
        : undefined;
      const nextResult: SplitResultState = {
        notices: workerResult.notices,
        outputs,
        previewState: "loading",
        removedActions: workerResult.removedActions,
        removedDestinations: workerResult.removedDestinations,
        removedLinkAnnotations: workerResult.removedLinkAnnotations,
        totalBytes: workerResult.totalBytes,
        zipFilename: workerResult.zipFilename,
        zipSize: zipBlob?.size,
        zipUrl: zipBlob ? createTrackedUrl(zipBlob) : undefined,
      };
      resultRef.current = nextResult;
      setResult(nextResult);
      setProgress(null);
      setIsSplitting(false);
      clearPasswordAfterSuccessfulSplit();
      cancel();
      requestAnimationFrame(() => resultHeadingRef.current?.focus());

      try {
        const firstOutput = workerResult.outputs[0];
        const previewBlob = await renderPdfResultPreview(
          new Uint8Array(firstOutput.data),
          0,
        );
        if (
          version !== splitVersionRef.current ||
          resultRef.current !== nextResult
        ) {
          return;
        }
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
          version !== splitVersionRef.current ||
          resultRef.current !== nextResult
        ) {
          return;
        }
        const withoutPreview = {
          ...nextResult,
          previewState: "error" as const,
        };
        resultRef.current = withoutPreview;
        setResult(withoutPreview);
      }
    } catch (error) {
      if (version !== splitVersionRef.current) return;
      if (error instanceof PdfMergeError && error.code === "cancelled") {
        setSplitNotice(error.message);
      } else if (error instanceof PdfMergeError) {
        applySplitError(error);
        setSplitError(splitErrorMessage(error));
        requestAnimationFrame(() => splitErrorRef.current?.focus());
      } else {
        setSplitError(
          "The split stopped before validated PDFs could be created. Try fewer pages or outputs, then split again.",
        );
        requestAnimationFrame(() => splitErrorRef.current?.focus());
      }
    } finally {
      if (version === splitVersionRef.current) {
        setIsSplitting(false);
        setProgress(null);
      }
    }
  }

  function cancelSplit() {
    splitVersionRef.current += 1;
    cancel();
    setIsSplitting(false);
    setProgress(null);
    setSplitNotice(
      "Split cancelled. Your source PDF, page plan and original file are unchanged.",
    );
  }

  function startNewSplit() {
    removeSource();
    setIntakeIssues([]);
    setOutputBase("split-pdf");
    setZipName("split-pdfs");
    setMode("ranges");
    requestAnimationFrame(() => fileInputRef.current?.focus());
  }

  const aspectRatio = source?.inspection
    ? `${source.inspection.firstPage.width} / ${source.inspection.firstPage.height}`
    : "3 / 4";

  return (
    <fieldset
      className="workspace pdf-splitter-workspace"
      disabled={!ready}
      aria-label="PDF splitter workspace"
    >
      <WorkspaceHeading
        title="One PDF. The right pieces."
        description="Choose ranges or pages, review exactly what will be created, then download validated PDFs or a ZIP."
      />

      <div className="pdf-privacy-banner" role="note">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>Your PDF never leaves this browser.</strong>
          <p>
            Inspection, passwords, page previews, splitting and ZIP packaging
            run locally on your device. No PDF, file name, password or split
            output is uploaded to QUICKKIT or any external server.
          </p>
        </div>
      </div>

      <div className="pdf-steps" aria-label="Split progress steps">
        <span className={source ? "done" : "current"}>1 · Add PDF</span>
        <span className={plan ? "done" : source ? "current" : ""}>
          2 · Choose pages
        </span>
        <span className={result ? "done" : canSplit ? "current" : ""}>
          3 · Split & download
        </span>
      </div>

      <label htmlFor="pdf-split-input">Choose a PDF</label>
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
          if (!controlsLocked) void addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={30} aria-hidden="true" />
        <p>
          <strong>Drop one PDF here</strong> or choose it from your device. To
          work on a different document, replace this source below—your original
          file is never changed.
        </p>
        <input
          ref={fileInputRef}
          id="pdf-split-input"
          className="pdf-file-input"
          type="file"
          tabIndex={-1}
          accept="application/pdf,.pdf"
          aria-describedby="pdf-split-limits"
          disabled={controlsLocked}
          onChange={(event) => {
            const files = event.currentTarget.files
              ? [...event.currentTarget.files]
              : [];
            event.currentTarget.value = "";
            void addFiles(files);
          }}
        />
        <button
          type="button"
          className="primary"
          data-pdf-split-add-button
          disabled={controlsLocked}
          onClick={() => fileInputRef.current?.click()}
        >
          <FilePlus2 size={17} /> {source ? "Replace PDF" : "Choose PDF"}
        </button>
      </div>
      <p id="pdf-split-limits" className="help">
        One PDF · up to {formatMiB(PDF_SPLIT_LIMITS.maxSourceBytes)} · up to{" "}
        {PDF_SPLIT_LIMITS.maxSourcePages.toLocaleString()} source pages · up to{" "}
        {PDF_SPLIT_LIMITS.maxOutputFiles} outputs and{" "}
        {PDF_SPLIT_LIMITS.maxOutputPages.toLocaleString()} written output pages
        per run. Anything outside these limits is explained, never skipped
        silently.
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

      {!source ? (
        <EmptyState icon={<ScissorsLineDashed size={34} aria-hidden="true" />}>
          Add one PDF to see its pages, choose a splitting method and preview
          every output before anything is created.
        </EmptyState>
      ) : (
        <>
          <section
            className="pdf-split-source-card"
            aria-labelledby="pdf-split-source-title"
          >
            <div className="pdf-thumbnail" style={{ aspectRatio }}>
              {source.thumbnailState === "ready" && source.thumbnailUrl ? (
                <img src={source.thumbnailUrl} alt="" />
              ) : source.thumbnailState === "loading" ? (
                <div className="pdf-thumbnail-placeholder">
                  <LoaderCircle className="spin" size={24} aria-hidden="true" />
                  <span>Rendering first page…</span>
                </div>
              ) : (
                <div className="pdf-thumbnail-placeholder">
                  <FileText size={34} aria-hidden="true" />
                  <span>
                    {source.status === "password"
                      ? "Unlock to preview"
                      : "First-page preview"}
                  </span>
                </div>
              )}
            </div>
            <div className="pdf-split-source-content">
              <div className="pdf-entry-title-row">
                <div>
                  <h3 id="pdf-split-source-title" tabIndex={-1}>
                    {source.name}
                  </h3>
                  <p className="pdf-entry-meta">
                    {formatMiB(source.size)}
                    {source.inspection
                      ? ` · ${source.inspection.pageCount.toLocaleString()} pages · ${geometryLabel(source.inspection)}`
                      : " · inspecting locally"}
                  </p>
                </div>
                <div className="toolbar-actions">
                  <button
                    type="button"
                    className="toolbar-button"
                    disabled={controlsLocked}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FilePlus2 size={15} /> Replace
                  </button>
                  <button
                    type="button"
                    className="toolbar-button danger"
                    disabled={controlsLocked}
                    onClick={removeSource}
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </div>

              <div className="pdf-badges" role="group" aria-label="PDF status">
                {source.status === "inspecting" ? (
                  <span>
                    <LoaderCircle className="spin" size={14} /> Inspecting
                  </span>
                ) : null}
                {source.status === "ready" ? (
                  <span>
                    <CheckCircle2 size={14} /> Ready to split
                  </span>
                ) : null}
                {source.inspection?.encrypted ||
                source.status === "password" ? (
                  <span>
                    <LockKeyhole size={14} /> Password-protected
                  </span>
                ) : null}
                {source.inspection?.features.hasForm ? (
                  <span>Form fields will be checked & flattened</span>
                ) : null}
                {source.inspection?.features.hasAttachments ? (
                  <span>Attachments stay in original</span>
                ) : null}
                {source.inspection?.title ? (
                  <span>Source title: {source.inspection.title}</span>
                ) : null}
              </div>

              {source.passwordNotice ? (
                <p className="pdf-inline-note">
                  <Info size={15} aria-hidden="true" /> {source.passwordNotice}
                </p>
              ) : null}

              {source.status === "password" ? (
                <form
                  className="pdf-password-panel"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void unlockSource(passwordDraft);
                  }}
                >
                  <div>
                    <strong>
                      <LockKeyhole size={16} aria-hidden="true" /> Password
                      needed
                    </strong>
                    <p>
                      Enter this PDF’s open password. It is used only in this
                      page’s memory, is never uploaded, and is cleared when the
                      PDF is removed, the workspace resets or a split completes.
                    </p>
                  </div>
                  <label htmlFor="pdf-split-password">
                    Open password for {source.name}
                  </label>
                  <div className="pdf-password-row">
                    <input
                      id="pdf-split-password"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={passwordDraft}
                      disabled={controlsLocked || intakeBusy}
                      aria-describedby={
                        source.error ? "pdf-split-password-error" : undefined
                      }
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPasswordDraft(value);
                      }}
                    />
                    <button
                      type="button"
                      className="toolbar-button"
                      aria-pressed={passwordVisible}
                      aria-label={`${passwordVisible ? "Hide" : "Show"} password for ${source.name}`}
                      disabled={controlsLocked || intakeBusy}
                      onClick={() => setPasswordVisible((value) => !value)}
                    >
                      {passwordVisible ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                      {passwordVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                  {source.error ? (
                    <p
                      id="pdf-split-password-error"
                      className="pdf-field-error"
                      role="alert"
                    >
                      {source.error}
                    </p>
                  ) : null}
                  <div className="toolbar-actions">
                    <button
                      type="submit"
                      className="primary"
                      disabled={controlsLocked || intakeBusy}
                    >
                      <LockOpen size={15} /> Unlock PDF
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={controlsLocked || intakeBusy}
                      onClick={() => void unlockSource("")}
                    >
                      Try blank password
                    </button>
                  </div>
                </form>
              ) : null}

              {(source.status === "error" || source.status === "blocked") &&
              source.error ? (
                <div className="pdf-entry-alert" role="alert">
                  <TriangleAlert size={18} aria-hidden="true" />
                  <div>
                    <p>{source.error}</p>
                    <div className="toolbar-actions">
                      {source.status === "error" ? (
                        <button
                          type="button"
                          className="toolbar-button"
                          disabled={controlsLocked || intakeBusy}
                          onClick={() => {
                            invalidateResult();
                            void inspectSourceNow();
                          }}
                        >
                          <RotateCcw size={14} /> Retry inspection
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="toolbar-button"
                        disabled={controlsLocked}
                        onClick={removeSource}
                      >
                        <Trash2 size={14} /> Remove PDF
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {source.status === "ready" && warnings.length > 0 ? (
                <details className="pdf-file-notes">
                  <summary>Split fidelity notes ({warnings.length})</summary>
                  <ul>
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </section>

          {source.status === "ready" && source.inspection ? (
            <>
              <section
                className="pdf-split-plan-panel"
                aria-labelledby="pdf-split-method-title"
              >
                <div className="pdf-output-heading">
                  <div>
                    <h3 id="pdf-split-method-title">How should we split it?</h3>
                    <p>Review the exact output plan before processing.</p>
                  </div>
                  <span className="local-badge">Local preview</span>
                </div>

                <fieldset
                  className="pdf-split-mode-fieldset"
                  disabled={controlsLocked}
                >
                  <legend>Choose a splitting method</legend>
                  <div className="pdf-split-mode-grid">
                    <label className="pdf-split-mode-card">
                      <input
                        type="radio"
                        name="pdf-split-mode"
                        value="ranges"
                        checked={mode === "ranges"}
                        onChange={() => {
                          invalidateResult();
                          setMode("ranges");
                        }}
                      />
                      <span>
                        <Rows3 size={19} aria-hidden="true" />
                        <strong>Custom ranges</strong>
                        <small>
                          One output per range group, separated by semicolons.
                        </small>
                      </span>
                    </label>
                    <label className="pdf-split-mode-card">
                      <input
                        type="radio"
                        name="pdf-split-mode"
                        value="extract"
                        checked={mode === "extract"}
                        onChange={() => {
                          invalidateResult();
                          setMode("extract");
                        }}
                      />
                      <span>
                        <CheckCircle2 size={19} aria-hidden="true" />
                        <strong>Extract pages</strong>
                        <small>Select page previews or type exact pages.</small>
                      </span>
                    </label>
                    <label className="pdf-split-mode-card">
                      <input
                        type="radio"
                        name="pdf-split-mode"
                        value="every"
                        checked={mode === "every"}
                        onChange={() => {
                          invalidateResult();
                          setMode("every");
                        }}
                      />
                      <span>
                        <Layers size={19} aria-hidden="true" />
                        <strong>Every N pages</strong>
                        <small>
                          Create even groups; the final PDF keeps any remainder.
                        </small>
                      </span>
                    </label>
                    <label className="pdf-split-mode-card">
                      <input
                        type="radio"
                        name="pdf-split-mode"
                        value="perPage"
                        checked={mode === "perPage"}
                        onChange={() => {
                          invalidateResult();
                          setMode("perPage");
                        }}
                      />
                      <span>
                        <ScissorsLineDashed size={19} aria-hidden="true" />
                        <strong>Every page</strong>
                        <small>Create one separate PDF for each page.</small>
                      </span>
                    </label>
                  </div>
                </fieldset>

                {mode === "ranges" ? (
                  <div className="pdf-split-control-card">
                    <label htmlFor="pdf-split-ranges">Output ranges</label>
                    <textarea
                      id="pdf-split-ranges"
                      className="pdf-split-ranges-input"
                      value={rangeText}
                      rows={3}
                      disabled={controlsLocked}
                      aria-describedby="pdf-split-ranges-help pdf-split-plan-error"
                      aria-invalid={Boolean(planError)}
                      onChange={(event) => {
                        invalidateResult();
                        setRangeText(event.currentTarget.value);
                      }}
                    />
                    <p id="pdf-split-ranges-help" className="help">
                      Use a semicolon or new line between outputs. Example:{" "}
                      <strong>1-3; 4-5, 8; 9</strong>. The plan below calls out
                      repeated or omitted pages.
                    </p>
                  </div>
                ) : null}

                {mode === "extract" ? (
                  <div className="pdf-split-control-card">
                    <label htmlFor="pdf-split-extract-pages">
                      Pages to extract
                    </label>
                    <input
                      id="pdf-split-extract-pages"
                      className="pdf-range-input"
                      type="text"
                      value={extractText}
                      disabled={controlsLocked}
                      aria-describedby="pdf-split-extract-help pdf-split-plan-error"
                      aria-invalid={Boolean(extractError)}
                      onChange={(event) =>
                        handleExtractTextChange(event.currentTarget.value)
                      }
                    />
                    <p id="pdf-split-extract-help" className="help">
                      Type pages such as <strong>1-3, 5</strong>, use{" "}
                      <strong>all</strong>, or tap the previews below.
                    </p>
                    <div
                      className="pdf-mode-row"
                      role="group"
                      aria-label="Extracted page output style"
                    >
                      <button
                        type="button"
                        className={extractStyle === "combined" ? "active" : ""}
                        aria-pressed={extractStyle === "combined"}
                        disabled={controlsLocked}
                        onClick={() => {
                          invalidateResult();
                          setExtractStyle("combined");
                        }}
                      >
                        One combined PDF
                      </button>
                      <button
                        type="button"
                        className={extractStyle === "separate" ? "active" : ""}
                        aria-pressed={extractStyle === "separate"}
                        disabled={controlsLocked}
                        onClick={() => {
                          invalidateResult();
                          setExtractStyle("separate");
                        }}
                      >
                        Separate PDF per page
                      </button>
                    </div>
                    <div className="toolbar-actions">
                      <button
                        type="button"
                        className="toolbar-button"
                        disabled={controlsLocked}
                        onClick={() =>
                          applyExtractSelection(
                            Array.from(
                              { length: pageCount },
                              (_, page) => page,
                            ),
                          )
                        }
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="toolbar-button"
                        disabled={controlsLocked}
                        onClick={() => applyExtractSelection([])}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="toolbar-button"
                        disabled={controlsLocked}
                        onClick={() => {
                          const selected = new Set(selectedPages);
                          applyExtractSelection(
                            Array.from(
                              { length: pageCount },
                              (_, page) => page,
                            ).filter((page) => !selected.has(page)),
                          );
                        }}
                      >
                        Invert
                      </button>
                    </div>
                  </div>
                ) : null}

                {mode === "every" ? (
                  <div className="pdf-split-control-card pdf-split-every-row">
                    <div>
                      <label htmlFor="pdf-split-every-n">Pages per PDF</label>
                      <input
                        id="pdf-split-every-n"
                        type="number"
                        min={1}
                        max={pageCount}
                        step={1}
                        inputMode="numeric"
                        value={everyNText}
                        disabled={controlsLocked}
                        aria-describedby="pdf-split-every-help pdf-split-plan-error"
                        aria-invalid={Boolean(planError)}
                        onChange={(event) => {
                          invalidateResult();
                          setEveryNText(event.currentTarget.value);
                        }}
                      />
                    </div>
                    <p id="pdf-split-every-help" className="help">
                      Groups run in document order. If the page count does not
                      divide evenly, the last PDF contains the remaining pages.
                    </p>
                  </div>
                ) : null}

                {mode === "perPage" ? (
                  <p className="pdf-inline-note">
                    <Info size={16} aria-hidden="true" /> This creates one PDF
                    for every page, up to the {PDF_SPLIT_LIMITS.maxOutputFiles}
                    -output local limit.
                  </p>
                ) : null}

                {planError ? (
                  <p
                    id="pdf-split-plan-error"
                    className="pdf-field-error"
                    role="alert"
                  >
                    {planError}
                  </p>
                ) : null}

                {plan ? (
                  <>
                    <div
                      className="insight-grid pdf-summary-grid"
                      aria-label="Split plan summary"
                    >
                      <div className="insight">
                        <strong>{pageCount.toLocaleString()}</strong>
                        <span>source pages</span>
                      </div>
                      <div className="insight">
                        <strong>{plan.outputs.length}</strong>
                        <span>PDFs to create</span>
                      </div>
                      <div className="insight">
                        <strong>
                          {plan.totalOutputPages.toLocaleString()}
                        </strong>
                        <span>pages written</span>
                      </div>
                      <div className="insight">
                        <strong>
                          {plan.outputs.length > 1 ? "ZIP" : "PDF"}
                        </strong>
                        <span>download package</span>
                      </div>
                    </div>

                    {plan.warnings.length > 0 ? (
                      <div className="pdf-blockers" role="status">
                        <strong>
                          <TriangleAlert size={16} aria-hidden="true" /> Check
                          this plan
                        </strong>
                        <ul>
                          {plan.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <details className="pdf-file-notes pdf-output-map" open>
                      <summary>Exact output plan</summary>
                      <ol className="pdf-split-plan-list">
                        {plan.outputs.map((output) => (
                          <li key={output.id} className="pdf-split-plan-item">
                            <span className="pdf-split-output-number">
                              {output.index + 1}
                            </span>
                            <div>
                              <strong>{output.filename}</strong>
                              <span>
                                Pages {output.pagesLabel} ·{" "}
                                {output.pageIndices.length}{" "}
                                {output.pageIndices.length === 1
                                  ? "page"
                                  : "pages"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </>
                ) : null}
              </section>

              <section
                className="pdf-split-pages-panel"
                aria-labelledby="pdf-split-pages-title"
              >
                <div className="pdf-picker-toolbar">
                  <div>
                    <h3 id="pdf-split-pages-title">Page previews</h3>
                    <p>
                      {mode === "extract"
                        ? "Tap a page to include or exclude it from extraction."
                        : "Each preview shows which planned output will contain that page."}
                    </p>
                  </div>
                  <span className="local-badge">
                    {source.previewLoadedCount}/{pageCount} rendered
                  </span>
                </div>
                {source.previewState === "loading" &&
                source.previewLoadedCount === 0 ? (
                  <p className="pdf-picker-status">
                    <LoaderCircle className="spin" size={17} /> Rendering page
                    previews locally…
                  </p>
                ) : null}
                {source.previewError ? (
                  <p className="pdf-field-error" role="alert">
                    {source.previewError}
                  </p>
                ) : null}
                <div className="pdf-page-grid">
                  {Array.from(
                    { length: source.previewLoadedCount },
                    (_, pageIndex) => {
                      const url = source.previewPages[pageIndex];
                      const assigned = plan
                        ? outputsForPage(plan.outputs, pageIndex)
                        : [];
                      const selected =
                        mode === "extract"
                          ? selectedPages.includes(pageIndex)
                          : assigned.length > 0;
                      const assignmentLabel =
                        mode === "extract"
                          ? selected
                            ? extractStyle === "separate"
                              ? `Output ${assigned[0] ? assigned[0].index + 1 : ""}`
                              : "Included"
                            : "Excluded"
                          : assigned.length === 1
                            ? `Output ${assigned[0].index + 1}`
                            : assigned.length > 1
                              ? `Outputs ${assigned.map((output) => output.index + 1).join(", ")}`
                              : "Not included";
                      const content = (
                        <>
                          {url ? (
                            <img src={url} alt="" />
                          ) : (
                            <FileText size={28} aria-hidden="true" />
                          )}
                          <span>
                            Page {pageIndex + 1} · {assignmentLabel}
                          </span>
                        </>
                      );
                      return mode === "extract" ? (
                        <button
                          type="button"
                          key={pageIndex}
                          className={`pdf-page-tile${selected ? " selected" : ""}`}
                          aria-pressed={selected}
                          aria-label={`${selected ? "Exclude" : "Include"} page ${pageIndex + 1} from extraction`}
                          disabled={controlsLocked}
                          onClick={() => toggleExtractPage(pageIndex)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div
                          key={pageIndex}
                          className={`pdf-page-tile pdf-split-page-tile${selected ? " selected" : ""}`}
                          aria-label={`Page ${pageIndex + 1}: ${assignmentLabel}`}
                        >
                          {content}
                        </div>
                      );
                    },
                  )}
                </div>
                {source.previewLoadedCount < pageCount ? (
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      controlsLocked || source.previewState === "loading"
                    }
                    onClick={() => void loadPreviewBatch()}
                  >
                    {source.previewState === "loading" ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <FilePlus2 size={16} />
                    )}
                    Load next{" "}
                    {Math.min(
                      PREVIEW_BATCH_SIZE,
                      pageCount - source.previewLoadedCount,
                    )}{" "}
                    previews ({source.previewLoadedCount}/{pageCount})
                  </button>
                ) : (
                  <p className="help">
                    All {pageCount} page previews are loaded locally.
                  </p>
                )}
              </section>

              <section
                className="pdf-output-panel"
                aria-labelledby="pdf-split-output-title"
              >
                <div className="pdf-output-heading">
                  <div>
                    <h3 id="pdf-split-output-title">Names & split</h3>
                    <p>Every output is reopened and checked before download.</p>
                  </div>
                  <span className="local-badge">Validated before download</span>
                </div>

                <div className="pdf-output-grid">
                  <div>
                    <label htmlFor="pdf-split-output-base">Output name</label>
                    <input
                      id="pdf-split-output-base"
                      type="text"
                      value={outputBase}
                      disabled={controlsLocked}
                      aria-describedby="pdf-split-output-example"
                      onChange={(event) => {
                        invalidateResult();
                        setOutputBase(event.currentTarget.value);
                      }}
                    />
                    <p id="pdf-split-output-example" className="help">
                      First file:{" "}
                      <strong>
                        {plan?.outputs[0]?.filename ??
                          "fix the plan to preview"}
                      </strong>
                    </p>
                  </div>
                  <div>
                    <label htmlFor="pdf-split-naming-style">Name suffix</label>
                    <select
                      id="pdf-split-naming-style"
                      value={namingStyle}
                      disabled={controlsLocked}
                      onChange={(event) => {
                        invalidateResult();
                        setNamingStyle(
                          event.currentTarget.value as PdfSplitNamingStyle,
                        );
                      }}
                    >
                      <option value="both">Part number and pages</option>
                      <option value="part">Part number only</option>
                      <option value="pages">Page numbers only</option>
                    </select>
                    <p className="help">
                      Each PDF’s stored title also names its source pages.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="pdf-split-zip-name">ZIP name</label>
                    <div className="pdf-filename-row">
                      <input
                        id="pdf-split-zip-name"
                        type="text"
                        value={zipName}
                        disabled={controlsLocked}
                        aria-describedby="pdf-split-final-zip"
                        onChange={(event) => {
                          invalidateResult();
                          setZipName(event.currentTarget.value);
                        }}
                      />
                      <span>.zip</span>
                    </div>
                    <p id="pdf-split-final-zip" className="help">
                      {plan && plan.outputs.length > 1
                        ? `Final ZIP: ${finalZipFilename}`
                        : "A ZIP is added when the plan creates more than one PDF."}
                    </p>
                  </div>
                </div>

                {blockers.length > 0 ? (
                  <div className="pdf-blockers" role="status">
                    <strong>
                      <Ban size={16} aria-hidden="true" /> Before splitting
                    </strong>
                    <ul>
                      {blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                ) : plan ? (
                  <p className="pdf-ready-note">
                    <CheckCircle2 size={17} aria-hidden="true" /> Ready to
                    create {plan.outputs.length} PDF
                    {plan.outputs.length === 1 ? "" : "s"} from{" "}
                    {plan.totalOutputPages} written pages. Processing stays in
                    this browser.
                  </p>
                ) : null}

                {splitNotice ? (
                  <p className="pdf-inline-note" role="status">
                    <Info size={16} aria-hidden="true" /> {splitNotice}
                  </p>
                ) : null}

                {isSplitting && progress ? (
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
                      aria-label="PDF split progress"
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
                      Stage: {progress.stage}. You can cancel safely; the source
                      PDF and plan will remain unchanged.
                    </p>
                    <button
                      type="button"
                      className="secondary"
                      onClick={cancelSplit}
                    >
                      <Ban size={16} /> Cancel split
                    </button>
                  </div>
                ) : (
                  <div className="action-row pdf-merge-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => void splitPdf()}
                      disabled={!canSplit}
                    >
                      <ScissorsLineDashed size={17} /> Split into{" "}
                      {plan?.outputs.length ?? ""} PDF
                      {plan && plan.outputs.length !== 1 ? "s" : ""}
                    </button>
                    <span className="pdf-no-upload-inline">
                      <ShieldCheck size={16} aria-hidden="true" /> No upload ·
                      no account · outputs checked after writing
                    </span>
                  </div>
                )}

                {splitError ? (
                  <div
                    ref={splitErrorRef}
                    className="status error"
                    role="alert"
                    tabIndex={-1}
                  >
                    <p>{splitError}</p>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}
        </>
      )}

      {result ? (
        <section
          className="result-panel pdf-result-panel"
          aria-labelledby="pdf-split-result-title"
        >
          <div className="pdf-result-preview">
            {result.previewState === "ready" && result.previewUrl ? (
              <img
                src={result.previewUrl}
                alt="First page preview of the first split PDF"
              />
            ) : result.previewState === "loading" ? (
              <div className="pdf-thumbnail-placeholder large">
                <LoaderCircle className="spin" size={28} aria-hidden="true" />
                <span>Rendering the first validated output…</span>
              </div>
            ) : (
              <div className="pdf-thumbnail-placeholder large">
                <FileText size={38} aria-hidden="true" />
                <span>
                  Preview unavailable. Every split PDF passed reopening
                  validation.
                </span>
              </div>
            )}
          </div>
          <div className="pdf-result-content">
            <span className="eyebrow">SPLIT & VALIDATED LOCALLY</span>
            <h3
              id="pdf-split-result-title"
              ref={resultHeadingRef}
              tabIndex={-1}
            >
              {result.outputs.length} PDF
              {result.outputs.length === 1 ? "" : "s"} ready
            </h3>
            <p>
              {result.outputs.reduce(
                (total, output) => total + output.pageCount,
                0,
              )}{" "}
              written pages · {formatMiB(result.totalBytes)} of PDFs
              {result.zipSize ? ` · ZIP ${formatMiB(result.zipSize)}` : ""}
            </p>
            <div className="meta-chips">
              <span>Every output reopened</span>
              <span>No extra page objects</span>
              <span>Created without upload</span>
              {result.zipUrl ? <span>ZIP packaged locally</span> : null}
            </div>
            {result.notices.length > 0 ? (
              <details className="pdf-file-notes" open>
                <summary>
                  What changed during the split ({result.notices.length})
                </summary>
                <ul>
                  {result.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {result.zipUrl && result.zipFilename ? (
              <div className="action-row">
                <a
                  className="primary"
                  href={result.zipUrl}
                  download={result.zipFilename}
                >
                  <FileArchive size={17} /> Download ZIP (
                  {result.outputs.length} PDFs)
                </a>
              </div>
            ) : null}

            <ol className="pdf-split-result-list">
              {result.outputs.map((output, index) => (
                <li key={`${output.filename}-${index}`}>
                  <div>
                    <strong>{output.filename}</strong>
                    <span>
                      Pages {output.pagesLabel} · {output.pageCount}{" "}
                      {output.pageCount === 1 ? "page" : "pages"} ·{" "}
                      {formatMiB(output.size)}
                    </span>
                  </div>
                  <div className="toolbar-actions">
                    <a
                      className="secondary"
                      href={output.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Eye size={15} /> Open
                    </a>
                    <a
                      className="primary"
                      href={output.url}
                      download={output.filename}
                    >
                      <Download size={15} /> Download
                    </a>
                  </div>
                </li>
              ))}
            </ol>

            <div className="toolbar-actions">
              <button
                type="button"
                className="toolbar-button"
                onClick={() =>
                  document.getElementById("pdf-split-source-title")?.focus()
                }
              >
                <Rows3 size={15} /> Back to source
              </button>
              <button
                type="button"
                className="toolbar-button"
                onClick={startNewSplit}
              >
                <RotateCcw size={15} /> Start a new split
              </button>
            </div>
            <p className="help">
              Download the PDFs or ZIP before closing this tab. Changing the
              source, plan or names clears this result so stale files are never
              presented as current.
            </p>
          </div>
        </section>
      ) : null}

      {canSplit && !result && plan ? (
        <div className="pdf-mobile-action" aria-hidden="false">
          <span>
            {plan.outputs.length} PDFs · {plan.totalOutputPages} pages
          </span>
          <button
            type="button"
            className="primary"
            onClick={() => void splitPdf()}
          >
            <ScissorsLineDashed size={16} /> Split
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
