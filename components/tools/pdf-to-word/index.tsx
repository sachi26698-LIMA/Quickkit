"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Ban,
  Check,
  Download,
  Eye,
  FileText,
  Play,
  RefreshCw,
  ScanText,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { zipSync } from "fflate";
import { downloadBlob, downloadText, formatBytes } from "@/lib/tools/download";
import { useHydrated } from "@/lib/use-hydrated";
import {
  extractPdf,
  hasPdfMagic,
  inspectPdf,
  type InspectResult,
} from "@/lib/tools/pdf-to-word/extract";
import { terminateOcr } from "@/lib/tools/pdf-to-word/ocr";
import {
  intersectRange,
  parsePageRange,
} from "@/lib/tools/pdf-to-word/page-range";
import {
  DEFAULT_FILENAME_PATTERN,
  outputNameFor,
} from "@/lib/tools/pdf-to-word/filename";
import {
  addHistoryItem,
  clearHistory,
  loadHistory,
  loadRetentionPreference,
  MAX_HISTORY_ITEMS,
  removeHistoryItem,
  saveRetentionPreference,
  type HistoryItem,
  type HistoryRetention,
} from "@/lib/tools/pdf-to-word/history";
import { structureDocument } from "@/lib/tools/pdf-to-word/structure";
import { buildDocx } from "@/lib/tools/pdf-to-word/render-docx";
import {
  OCR_LANGUAGES,
  PDF_TO_WORD_LIMITS,
  PdfToWordError,
  type ConversionMode,
  type ConversionReport,
  type OcrLanguage,
} from "@/lib/tools/pdf-to-word/types";
import { WorkspaceHeading } from "../tool-ui";
import PreviewDialog, { type PreviewView } from "./preview-dialog";
import QualityReport from "./quality-report";
import HistoryPanel from "./history-panel";

type EntryStatus = "inspecting" | "ready" | "converting" | "done" | "failed";

interface Entry {
  id: number;
  file: File;
  status: EntryStatus;
  pageCount: number | null;
  kind: InspectResult["kind"] | null;
  progress: number;
  error: string | null;
  resultBlob: Blob | null;
  resultUrl: string | null;
  resultName: string | null;
  /** Mode the current result was converted with. */
  resultMode: ConversionMode | null;
  report: ConversionReport | null;
}

function kindLabel(kind: InspectResult["kind"] | null): string {
  if (kind === "scanned") return "Scanned (image-only PDF)";
  if (kind === "mixed") return "Mixed (some scanned pages)";
  return "Text-based";
}

const MODE_COPY: Record<
  ConversionMode,
  { title: string; description: string }
> = {
  layout: {
    title: "Original Layout",
    description:
      "Keeps each page's size and places text and images close to their original positions. Best when the look matters most.",
  },
  clean: {
    title: "Clean Editable",
    description:
      "Rebuilds a flowing document with tidy headings, lists and tables. Best when you plan to edit the content.",
  },
};

function modeLabel(mode: ConversionMode | null): string {
  return mode === "layout" ? "Original Layout" : "Clean Editable";
}

export default function PdfToWord() {
  const ready = useHydrated();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<ConversionMode>("clean");
  const [useOcr, setUseOcr] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("eng");
  const [pageRangeInput, setPageRangeInput] = useState("");
  const [preserveImages, setPreserveImages] = useState(true);
  const [preserveTables, setPreserveTables] = useState(true);
  const [preserveHeadingsLists, setPreserveHeadingsLists] = useState(true);
  const [keepHeadersFooters, setKeepHeadersFooters] = useState(false);
  const [preserveLinks, setPreserveLinks] = useState(true);
  const [filenamePattern, setFilenamePattern] = useState(
    DEFAULT_FILENAME_PATTERN,
  );
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [batchSummary, setBatchSummary] = useState<{
    done: number;
    failed: number;
  } | null>(null);
  const [retention, setRetention] = useState<HistoryRetention>("session");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    id?: number;
    item?: HistoryItem;
    view: PreviewView;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const idRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const entriesRef = useRef<Entry[]>([]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      for (const entry of entriesRef.current) {
        if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
      }
      void terminateOcr();
    },
    [],
  );

  const patchEntry = (id: number, patch: Partial<Entry>) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );

  const totalBytes = entries.reduce((n, e) => n + e.file.size, 0);
  const readyCount = entries.filter((e) => e.status === "ready").length;
  const doneEntries = entries.filter((e) => e.status === "done");
  const failedCount = entries.filter((e) => e.status === "failed").length;
  const scannedReady = entries.filter(
    (e) => e.status === "ready" && e.kind !== "text" && e.kind !== null,
  ).length;
  const converting = entries.find((e) => e.status === "converting");
  // Progress counts only files that passed inspection (pageCount set);
  // inspection failures must not inflate the batch bar before conversion.
  const convertible = entries.filter((e) => e.pageCount !== null);
  const finishedConvertible = convertible.filter(
    (e) => e.status === "done" || e.status === "failed",
  ).length;
  const attempted = finishedConvertible > 0;
  const overallProgress =
    convertible.length === 0
      ? 0
      : (finishedConvertible + (converting?.progress ?? 0)) /
        convertible.length;

  const rangeState = useMemo((): {
    set: Set<number> | null;
    error: string | null;
  } => {
    try {
      return { set: parsePageRange(pageRangeInput), error: null };
    } catch (error) {
      return {
        set: null,
        error:
          error instanceof PdfToWordError
            ? error.message
            : "That page range is not valid.",
      };
    }
  }, [pageRangeInput]);

  const advancedSummaryParts: string[] = [];
  if (rangeState.set)
    advancedSummaryParts.push(`Pages ${pageRangeInput.trim()}`);
  if (!preserveImages) advancedSummaryParts.push("Images off");
  if (!preserveTables) advancedSummaryParts.push("Tables off");
  if (!preserveHeadingsLists) advancedSummaryParts.push("Headings/lists off");
  if (!preserveLinks) advancedSummaryParts.push("Links off");
  if (keepHeadersFooters) advancedSummaryParts.push("Headers/footers kept");
  if (
    filenamePattern.trim() &&
    filenamePattern.trim() !== DEFAULT_FILENAME_PATTERN
  )
    advancedSummaryParts.push("Custom filename");

  // Load the stored-history preference + items once hydrated.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      const preference = loadRetentionPreference();
      const items = await loadHistory(preference);
      if (!cancelled) {
        setRetention(preference);
        setHistoryItems(items);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  async function changeRetention(next: HistoryRetention) {
    setRetention(next);
    saveRetentionPreference(next);
    if (next === "session") {
      await clearHistory();
      setHistoryItems([]);
    } else {
      setHistoryItems(await loadHistory(next));
    }
  }

  async function inspectEntry(entry: Entry) {
    try {
      const bytes = new Uint8Array(await entry.file.arrayBuffer());
      if (!hasPdfMagic(bytes)) {
        throw new PdfToWordError(
          "not-a-pdf",
          "This file is not a PDF. Choose a file ending in .pdf.",
        );
      }
      const result = await inspectPdf(bytes);
      patchEntry(entry.id, {
        status: "ready",
        pageCount: result.pageCount,
        kind: result.kind,
        error: null,
      });
    } catch (error) {
      patchEntry(entry.id, {
        status: "failed",
        error:
          error instanceof PdfToWordError
            ? error.message
            : "This PDF could not be inspected. It may be corrupted.",
      });
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;
    const room = PDF_TO_WORD_LIMITS.maxFiles - entriesRef.current.length;
    const accepted = incoming.slice(0, Math.max(0, room));
    const notes: string[] = [];
    if (incoming.length > accepted.length) {
      notes.push(
        `Only ${PDF_TO_WORD_LIMITS.maxFiles} files can be queued at once — ${incoming.length - accepted.length} file(s) were not added.`,
      );
    }
    const currentTotal = entriesRef.current.reduce(
      (n, e) => n + e.file.size,
      0,
    );
    let runningTotal = currentTotal;
    const newEntries: Entry[] = [];
    for (const file of accepted) {
      const base: Entry = {
        id: idRef.current++,
        file,
        status: "inspecting",
        pageCount: null,
        kind: null,
        progress: 0,
        error: null,
        resultBlob: null,
        resultUrl: null,
        resultName: null,
        resultMode: null,
        report: null,
      };
      if (file.size > PDF_TO_WORD_LIMITS.maxFileBytes) {
        newEntries.push({
          ...base,
          status: "failed",
          error: `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(PDF_TO_WORD_LIMITS.maxFileBytes)} per file.`,
        });
        continue;
      }
      if (runningTotal + file.size > PDF_TO_WORD_LIMITS.maxBatchBytes) {
        newEntries.push({
          ...base,
          status: "failed",
          error: `Adding this file exceeds the ${formatBytes(PDF_TO_WORD_LIMITS.maxBatchBytes)} batch limit. Remove some files first.`,
        });
        continue;
      }
      runningTotal += file.size;
      newEntries.push(base);
    }
    if (notes.length) setBatchNotice(notes.join(" "));
    else setBatchNotice(null);
    setBatchSummary(null);
    setEntries((current) => [...current, ...newEntries]);
    for (const entry of newEntries) {
      if (entry.status === "inspecting") await inspectEntry(entry);
    }
  }

  function removeEntry(id: number) {
    setEntries((current) => {
      const entry = current.find((e) => e.id === id);
      if (entry?.resultUrl) URL.revokeObjectURL(entry.resultUrl);
      return current.filter((e) => e.id !== id);
    });
  }

  function replaceEntryFile(id: number, file: File) {
    const current = entriesRef.current.find((e) => e.id === id);
    if (!current) return;
    if (current.resultUrl) URL.revokeObjectURL(current.resultUrl);
    const othersBytes = entriesRef.current
      .filter((e) => e.id !== id)
      .reduce((n, e) => n + e.file.size, 0);
    let replacement: Entry = {
      ...current,
      file,
      status: "inspecting",
      pageCount: null,
      kind: null,
      progress: 0,
      error: null,
      resultBlob: null,
      resultUrl: null,
      resultName: null,
      resultMode: null,
      report: null,
    };
    if (file.size > PDF_TO_WORD_LIMITS.maxFileBytes) {
      replacement = {
        ...replacement,
        status: "failed",
        error: `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(PDF_TO_WORD_LIMITS.maxFileBytes)} per file.`,
      };
    } else if (othersBytes + file.size > PDF_TO_WORD_LIMITS.maxBatchBytes) {
      replacement = {
        ...replacement,
        status: "failed",
        error: `Replacing with this file exceeds the ${formatBytes(PDF_TO_WORD_LIMITS.maxBatchBytes)} batch limit. Remove some files first.`,
      };
    }
    setEntries((all) => all.map((e) => (e.id === id ? replacement : e)));
    if (replacement.status === "inspecting") void inspectEntry(replacement);
  }

  function clearAll() {
    for (const entry of entriesRef.current) {
      if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
    }
    setEntries([]);
    setBatchNotice(null);
    setBatchSummary(null);
    setPreview(null);
    setConfirmRemoveId(null);
  }

  function clearCompleted() {
    for (const entry of entriesRef.current) {
      if (entry.status === "done" && entry.resultUrl)
        URL.revokeObjectURL(entry.resultUrl);
    }
    setEntries((current) => current.filter((e) => e.status !== "done"));
  }

  async function convertEntry(
    entry: Entry,
    signal: AbortSignal,
  ): Promise<"done" | "failed" | "cancelled"> {
    patchEntry(entry.id, { status: "converting", progress: 0, error: null });
    setAnnouncement(`Converting ${entry.file.name}`);
    try {
      if (rangeState.error) {
        throw new PdfToWordError("invalid-range", rangeState.error);
      }
      const { pages: selectedPages, outsideCount } = intersectRange(
        rangeState.set,
        entry.pageCount ?? 0,
      );
      if (rangeState.set && selectedPages.length === 0) {
        throw new PdfToWordError(
          "invalid-range",
          `The page range "${pageRangeInput.trim()}" includes no pages in this ${entry.pageCount}-page file.`,
        );
      }
      const bytes = new Uint8Array(await entry.file.arrayBuffer());
      const { pages, stats, totalPages } = await extractPdf(bytes, {
        ocr: useOcr,
        ocrLanguage,
        pages: rangeState.set ? new Set(selectedPages) : null,
        includeImages: preserveImages,
        includeLinks: preserveLinks,
        signal,
        onProgress: (done, total) =>
          patchEntry(entry.id, { progress: done / total }),
      });
      const { pages: structured, removedRunningLines } = structureDocument(
        pages,
        {
          detectTables: preserveTables,
          detectHeadingsLists: preserveHeadingsLists,
          keepRunningHeadersFooters: keepHeadersFooters,
        },
      );
      if (signal.aborted)
        throw new PdfToWordError("cancelled", "Conversion was cancelled.");

      const warnings: string[] = [];
      if (stats.ocrPages > 0)
        warnings.push(
          `${stats.ocrPages} page(s) were read with OCR — proofread names and numbers.`,
        );
      if (stats.ocrFailedPages > 0)
        warnings.push(
          "OCR was unavailable for some scanned pages, so they were left out.",
        );
      if (stats.scannedPagesSkipped > 0 && stats.ocrFailedPages === 0)
        warnings.push(
          useOcr
            ? `${stats.scannedPagesSkipped} scanned page(s) had no readable text and were left out.`
            : `${stats.scannedPagesSkipped} scanned page(s) were skipped — enable OCR to include them.`,
        );
      if (stats.imagesSkipped > 0)
        warnings.push(
          `${stats.imagesSkipped} embedded image(s) could not be extracted.`,
        );
      const multiColumnPages = structured.filter((p) => p.multiColumn).length;
      if (multiColumnPages > 0)
        warnings.push(
          `${multiColumnPages} multi-column page(s): reading order was approximated.`,
        );
      if (removedRunningLines > 0)
        warnings.push(
          `Repeated page headers/footers were removed (${removedRunningLines}).`,
        );
      if (mode === "layout")
        warnings.push(
          "Layout mode approximates positions and spacing — give the result a quick visual check.",
        );
      if (outsideCount > 0)
        warnings.push(
          `The page range mentions ${outsideCount} page(s) beyond this file's ${totalPages} pages — those were ignored.`,
        );
      if (!preserveImages)
        warnings.push("Images were excluded by your settings.");
      if (!preserveTables)
        warnings.push(
          "Table detection was off — table-like content appears as plain text.",
        );
      if (!preserveHeadingsLists)
        warnings.push(
          "Heading/list detection was off — everything was converted as body text.",
        );

      const blob = await buildDocx(structured, mode, entry.file.name);
      const url = URL.createObjectURL(blob);
      const resultName = outputNameFor(filenamePattern, entry.file.name, mode);
      const tablesDetected = structured.reduce(
        (n, p) => n + p.blocks.filter((b) => b.kind === "table").length,
        0,
      );
      patchEntry(entry.id, {
        status: "done",
        progress: 1,
        resultBlob: blob,
        resultUrl: url,
        resultName,
        resultMode: mode,
        report: {
          sourcePages: totalPages,
          convertedPages: structured.length,
          pageSelection: rangeState.set ? pageRangeInput.trim() : null,
          textPages: stats.textPages,
          ocrPages: stats.ocrPages,
          scannedPagesSkipped: stats.scannedPagesSkipped,
          imagesExtracted: stats.imagesExtracted,
          imagesSkipped: stats.imagesSkipped,
          tablesDetected,
          linksExtracted: stats.linksExtracted,
          removedRunningLines,
          multiColumnPages,
          warnings,
        },
      });
      setAnnouncement(`Converted ${entry.file.name}`);
      if (retention !== "session") {
        void addHistoryItem(retention, {
          sourceName: entry.file.name,
          resultName,
          mode,
          summary: `${structured.length} page(s) · ${tablesDetected} table(s) · ${stats.imagesExtracted} image(s)`,
          blob,
        }).then((stored) => {
          if (stored)
            setHistoryItems((current) =>
              [stored, ...current].slice(0, MAX_HISTORY_ITEMS),
            );
        });
      }
      return "done";
    } catch (error) {
      if (error instanceof PdfToWordError && error.kind === "cancelled") {
        patchEntry(entry.id, { status: "ready", progress: 0, error: null });
        return "cancelled";
      }
      patchEntry(entry.id, {
        status: "failed",
        progress: 0,
        error:
          error instanceof PdfToWordError
            ? error.message
            : "Conversion failed unexpectedly. Try again, or try the other mode.",
      });
      setAnnouncement(`Could not convert ${entry.file.name}`);
      return "failed";
    }
  }

  async function runQueue(ids: number[]) {
    if (running || ids.length === 0) return;
    setBatchSummary(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    let done = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        if (controller.signal.aborted) break;
        const entry = entriesRef.current.find((e) => e.id === id);
        if (entry && entry.status !== "done" && entry.status !== "converting") {
          const outcome = await convertEntry(entry, controller.signal);
          if (outcome === "done") done++;
          else if (outcome === "failed") failed++;
        }
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      if (useOcr) void terminateOcr();
      setBatchSummary({ done, failed });
      setAnnouncement(`Batch finished. ${done} converted, ${failed} failed.`);
    }
  }

  /** Unique in-ZIP filename per completed entry (deduplicated). */
  function zipNameMap(): Map<number, string> {
    const map = new Map<number, string>();
    const usedNames = new Set<string>();
    for (const entry of entriesRef.current) {
      if (entry.status !== "done" || !entry.resultName) continue;
      let name = entry.resultName;
      let counter = 2;
      while (usedNames.has(name.toLowerCase())) {
        name = entry.resultName.replace(/\.docx$/i, ` (${counter++}).docx`);
      }
      usedNames.add(name.toLowerCase());
      map.set(entry.id, name);
    }
    return map;
  }

  function buildBatchReportText(names: Map<number, string>): string {
    const all = entriesRef.current;
    const lines: string[] = [
      "QUICKKIT — PDF to Word batch report",
      `Converted: ${all.filter((e) => e.status === "done").length}  Failed: ${all.filter((e) => e.status === "failed").length}`,
      "",
    ];
    for (const entry of all) {
      if (entry.status === "done" && entry.report) {
        const r = entry.report;
        const name = names.get(entry.id) ?? entry.resultName ?? "document.docx";
        lines.push(
          `✓ ${entry.file.name} -> ${name} (${modeLabel(entry.resultMode)})`,
        );
        lines.push(
          `    ${r.convertedPages} of ${r.sourcePages} pages · ${r.tablesDetected} table(s) · ${r.imagesExtracted} image(s) · ${r.linksExtracted} link(s)${r.ocrPages ? ` · ${r.ocrPages} OCR page(s)` : ""}${r.scannedPagesSkipped ? ` · ${r.scannedPagesSkipped} scanned page(s) skipped` : ""}`,
        );
        for (const warning of r.warnings) lines.push(`    note: ${warning}`);
      } else if (entry.status === "failed") {
        lines.push(`✗ ${entry.file.name} — ${entry.error ?? "failed"}`);
      }
    }
    lines.push(
      "",
      "Generated locally by QUICKKIT. Layout in Word files is approximated; see notes above.",
    );
    return lines.join("\n") + "\n";
  }

  async function downloadZip() {
    const names = zipNameMap();
    if (names.size === 0) return;
    const files: Record<string, Uint8Array> = {};
    for (const entry of entriesRef.current) {
      const name = names.get(entry.id);
      if (name && entry.resultBlob) {
        files[name] = new Uint8Array(await entry.resultBlob.arrayBuffer());
      }
    }
    files["batch-report.txt"] = new TextEncoder().encode(
      buildBatchReportText(names),
    );
    const zipped = zipSync(files, { level: 0 });
    downloadBlob(
      new Blob([zipped as BlobPart], { type: "application/zip" }),
      "quickkit-word-documents.zip",
    );
  }

  function downloadReport() {
    downloadText(
      buildBatchReportText(zipNameMap()),
      "quickkit-batch-report.txt",
    );
  }

  const statusChip = (entry: Entry) => {
    switch (entry.status) {
      case "inspecting":
        return <span className="p2w-chip">Inspecting…</span>;
      case "ready":
        return <span className="p2w-chip p2w-chip-ready">Ready</span>;
      case "converting":
        return (
          <span className="p2w-chip p2w-chip-busy">
            Converting {Math.round(entry.progress * 100)}%
          </span>
        );
      case "done":
        return (
          <span className="p2w-chip p2w-chip-done">
            <Check size={12} aria-hidden="true" /> Done
          </span>
        );
      case "failed":
        return (
          <span className="p2w-chip p2w-chip-failed">
            <AlertTriangle size={12} aria-hidden="true" /> Failed
          </span>
        );
    }
  };

  const previewEntry = preview
    ? (entries.find((e) => e.id === preview.id) ?? null)
    : null;

  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <WorkspaceHeading
        title="From PDF to an editable Word document"
        description="Batch-convert PDFs to real DOCX files — headings, lists, tables and images carried over, all without an upload."
      />

      <span className="local-badge">
        Runs 100% on your device — files are never uploaded
      </span>

      <div className="p2w-modes" role="radiogroup" aria-label="Conversion mode">
        {(Object.keys(MODE_COPY) as ConversionMode[]).map((value) => (
          <label key={value} className="p2w-mode-card">
            <input
              type="radio"
              name="p2w-mode"
              className="sr-only"
              checked={mode === value}
              disabled={running}
              onChange={() => setMode(value)}
            />
            <span className="p2w-mode-body">
              <strong>{MODE_COPY[value].title}</strong>
              <span>{MODE_COPY[value].description}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="p2w-ocr-row">
        <label className="check-label p2w-ocr-toggle">
          <input
            type="checkbox"
            checked={useOcr}
            disabled={running}
            onChange={(e) => setUseOcr(e.target.checked)}
          />
          <ScanText size={16} aria-hidden="true" />
          Use OCR for scanned pages
          <span className="help">
            Reads text from page images when a PDF has no text layer. Slower,
            still fully on-device.
          </span>
        </label>
        {useOcr && (
          <label className="p2w-ocr-lang">
            OCR language
            <select
              value={ocrLanguage}
              disabled={running}
              onChange={(e) => setOcrLanguage(e.target.value as OcrLanguage)}
            >
              {OCR_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <details className="p2w-advanced">
        <summary>
          <SlidersHorizontal size={14} aria-hidden="true" /> Advanced settings
          {advancedSummaryParts.length > 0 && (
            <span className="p2w-advanced-summary">
              {advancedSummaryParts.join(" · ")}
            </span>
          )}
        </summary>
        <div className="p2w-advanced-grid">
          <label className="p2w-field">
            Pages to convert
            <input
              type="text"
              value={pageRangeInput}
              disabled={running}
              placeholder="All pages"
              inputMode="numeric"
              aria-describedby="p2w-range-help"
              onChange={(e) => setPageRangeInput(e.target.value)}
            />
            <span id="p2w-range-help" className="help">
              Leave empty for all pages, or use ranges like 1-3, 5, 8-10.
            </span>
            {rangeState.error && (
              <span className="p2w-error" role="alert">
                {rangeState.error}
              </span>
            )}
          </label>
          <label className="p2w-field">
            Output filename
            <input
              type="text"
              value={filenamePattern}
              disabled={running}
              placeholder="{name}"
              onChange={(e) => setFilenamePattern(e.target.value)}
            />
            <span className="help">
              {"{name}"} = original name, {"{mode}"} = clean/layout. Example:{" "}
              {outputNameFor(filenamePattern, "Annual Report.pdf", mode)}
            </span>
          </label>
          <fieldset className="p2w-preserve">
            <legend>Preserve in the Word file</legend>
            <label className="check-label">
              <input
                type="checkbox"
                checked={preserveImages}
                disabled={running}
                onChange={(e) => setPreserveImages(e.target.checked)}
              />
              Images
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={preserveTables}
                disabled={running}
                onChange={(e) => setPreserveTables(e.target.checked)}
              />
              Tables (detect &amp; rebuild)
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={preserveHeadingsLists}
                disabled={running}
                onChange={(e) => setPreserveHeadingsLists(e.target.checked)}
              />
              Headings &amp; lists
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={preserveLinks}
                disabled={running}
                onChange={(e) => setPreserveLinks(e.target.checked)}
              />
              Hyperlinks (where present)
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={keepHeadersFooters}
                disabled={running}
                onChange={(e) => setKeepHeadersFooters(e.target.checked)}
              />
              Keep repeating headers/footers
            </label>
          </fieldset>
        </div>
      </details>

      <div
        className={`dropzone p2w-dropzone${dragging ? " dragging" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={26} aria-hidden="true" />
        <p>
          Drag &amp; drop PDFs here, or browse to add up to{" "}
          {PDF_TO_WORD_LIMITS.maxFiles} files (
          {formatBytes(PDF_TO_WORD_LIMITS.maxFileBytes)} each,{" "}
          {formatBytes(PDF_TO_WORD_LIMITS.maxBatchBytes)} per batch).
        </p>
        <label className="toolbar-button p2w-browse">
          Browse PDFs
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="sr-only"
            disabled={running}
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {batchNotice && (
        <p className="p2w-notice" role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {batchNotice}
        </p>
      )}
      {scannedReady > 0 && !useOcr && (
        <p className="p2w-notice">
          <ScanText size={14} aria-hidden="true" /> {scannedReady} file(s) look
          scanned. Without OCR their image-only pages will be skipped — tick
          “Use OCR for scanned pages” to include them.
        </p>
      )}

      {entries.length > 0 && (
        <>
          <div className="p2w-batchbar">
            <span>
              {entries.length} file(s) · {formatBytes(totalBytes)} total
              {running || attempted
                ? ` · ${doneEntries.length} completed · ${failedCount} failed · ${entries.length - doneEntries.length - failedCount} pending`
                : ""}
            </span>
            <div className="p2w-batch-actions">
              {!running ? (
                <>
                  <button
                    type="button"
                    className="primary"
                    disabled={readyCount === 0 || rangeState.error !== null}
                    onClick={() =>
                      void runQueue(
                        entriesRef.current
                          .filter((e) => e.status === "ready")
                          .map((e) => e.id),
                      )
                    }
                  >
                    <Play size={15} aria-hidden="true" /> Convert{" "}
                    {readyCount > 0 ? `${readyCount} file(s)` : ""}
                  </button>
                  {failedCount > 0 && (
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={() =>
                        void runQueue(
                          entriesRef.current
                            .filter((e) => e.status === "failed")
                            .map((e) => e.id),
                        )
                      }
                    >
                      <RefreshCw size={15} aria-hidden="true" /> Retry failed (
                      {failedCount})
                    </button>
                  )}
                  {doneEntries.length >= 1 && (
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={() => void downloadZip()}
                    >
                      <Archive size={15} aria-hidden="true" /> Download ZIP
                    </button>
                  )}
                  {attempted && (
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={downloadReport}
                    >
                      <FileText size={15} aria-hidden="true" /> Batch report
                    </button>
                  )}
                  {doneEntries.length > 0 && (
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={clearCompleted}
                    >
                      <Check size={15} aria-hidden="true" /> Clear completed
                    </button>
                  )}
                  <button
                    type="button"
                    className="toolbar-button"
                    onClick={clearAll}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Clear all
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="toolbar-button"
                  onClick={() => abortRef.current?.abort()}
                >
                  <Ban size={15} aria-hidden="true" /> Cancel
                </button>
              )}
            </div>
          </div>
          {(running || attempted) && (
            <div
              className="progress-track p2w-overall"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(overallProgress * 100)}
              aria-label="Overall batch progress"
            >
              <div
                className="progress-fill"
                style={{ width: `${Math.round(overallProgress * 100)}%` }}
              />
            </div>
          )}

          {batchSummary && !running && (
            <div
              className={`p2w-banner ${batchSummary.failed > 0 ? "warn" : "ok"}`}
              role="status"
            >
              {batchSummary.failed > 0 ? (
                <AlertTriangle size={15} aria-hidden="true" />
              ) : (
                <Check size={15} aria-hidden="true" />
              )}
              <span>
                Batch finished — {batchSummary.done} converted,{" "}
                {batchSummary.failed} failed. Download each Word file below
                {batchSummary.done > 0 ? ", or grab the ZIP." : "."}
              </span>
              {batchSummary.done > 0 && (
                <button
                  type="button"
                  className="toolbar-button"
                  onClick={() => void downloadZip()}
                >
                  <Archive size={14} aria-hidden="true" /> Download ZIP
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                aria-label="Dismiss batch summary"
                onClick={() => setBatchSummary(null)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          <ul className="p2w-list">
            {entries.map((entry) => (
              <li key={entry.id} className="p2w-row">
                <FileText
                  size={20}
                  aria-hidden="true"
                  className="p2w-row-icon"
                />
                <div className="p2w-row-main">
                  <span className="p2w-row-title" title={entry.file.name}>
                    {entry.file.name}
                  </span>
                  <span className="p2w-row-meta">
                    {formatBytes(entry.file.size)}
                    {entry.pageCount !== null &&
                      ` · ${entry.pageCount} page(s)`}
                    {entry.kind !== null && ` · ${kindLabel(entry.kind)}`}
                    {entry.status === "done" &&
                      entry.resultBlob &&
                      ` → ${entry.resultName} · ${formatBytes(entry.resultBlob.size)} · ${modeLabel(entry.resultMode)}`}
                  </span>
                  {entry.status === "inspecting" && (
                    <span className="p2w-skeleton-line" aria-hidden="true" />
                  )}
                  {entry.status === "converting" && (
                    <div className="progress-track p2w-file-progress">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.round(entry.progress * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                  {entry.error && (
                    <p className="p2w-error" role="alert">
                      {entry.error}
                    </p>
                  )}
                  {entry.report && (
                    <details className="p2w-notes">
                      <summary>Quality report</summary>
                      <QualityReport
                        report={entry.report}
                        mode={entry.resultMode}
                      />
                    </details>
                  )}
                </div>
                {statusChip(entry)}
                <span className="p2w-row-actions">
                  {entry.pageCount !== null &&
                    entry.status !== "converting" && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Preview ${entry.file.name}`}
                        onClick={() =>
                          setPreview({
                            id: entry.id,
                            view: entry.status === "done" ? "compare" : "pdf",
                          })
                        }
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                    )}
                  {entry.status === "done" && entry.resultUrl && (
                    <a
                      className="icon-button"
                      href={entry.resultUrl}
                      download={entry.resultName ?? "document.docx"}
                      aria-label={`Download ${entry.resultName ?? "Word document"}`}
                    >
                      <Download size={16} aria-hidden="true" />
                    </a>
                  )}
                  {entry.status === "failed" && !running && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Retry ${entry.file.name}`}
                      onClick={() => {
                        patchEntry(entry.id, {
                          status: "ready",
                          error: null,
                        });
                        void runQueue([entry.id]);
                      }}
                    >
                      <RefreshCw size={16} aria-hidden="true" />
                    </button>
                  )}
                  {confirmRemoveId === entry.id ? (
                    <>
                      <button
                        type="button"
                        className="icon-button p2w-confirm-yes"
                        aria-label={`Confirm remove ${entry.file.name}`}
                        title="Remove while the batch is running?"
                        onClick={() => {
                          setConfirmRemoveId(null);
                          removeEntry(entry.id);
                        }}
                      >
                        <Check size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Keep ${entry.file.name}`}
                        onClick={() => setConfirmRemoveId(null)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${entry.file.name}`}
                      disabled={entry.status === "converting"}
                      onClick={() =>
                        running
                          ? setConfirmRemoveId(entry.id)
                          : removeEntry(entry.id)
                      }
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {doneEntries.length === 1 && !running && (
            <div className="action-row">
              <a
                className="primary"
                href={doneEntries[0].resultUrl ?? undefined}
                download={doneEntries[0].resultName ?? "document.docx"}
              >
                <Download size={15} aria-hidden="true" /> Download{" "}
                {doneEntries[0].resultName}
              </a>
              <button
                type="button"
                className="toolbar-button"
                onClick={() =>
                  setPreview({ id: doneEntries[0].id, view: "docx" })
                }
              >
                <Eye size={15} aria-hidden="true" /> Preview result
              </button>
            </div>
          )}
        </>
      )}

      <HistoryPanel
        items={historyItems}
        retention={retention}
        onRetentionChange={(next) => void changeRetention(next)}
        onPreview={(item) => setPreview({ item, view: "docx" })}
        onRemove={(item) => {
          setHistoryItems((current) =>
            current.filter((entry) => entry.id !== item.id),
          );
          void removeHistoryItem(item.id);
        }}
        onClearAll={() => {
          setHistoryItems([]);
          void clearHistory();
        }}
      />

      <p className="help">
        Converted files are genuine Word documents that open in Microsoft Word,
        LibreOffice and Google Docs. Layout is approximated — fonts are
        substituted and complex vector graphics cannot be carried over. Use the
        preview to compare the original PDF with the converted Word file before
        you rely on it. Your original PDFs are never modified or stored.
      </p>

      {previewEntry && preview && (
        <PreviewDialog
          target={{
            file: previewEntry.file,
            sourceName: previewEntry.file.name,
            sourceMeta: `${formatBytes(previewEntry.file.size)} · ${previewEntry.pageCount ?? "?"} page(s) · ${kindLabel(previewEntry.kind)}`,
            resultBlob: previewEntry.resultBlob,
            resultUrl: previewEntry.resultUrl,
            resultName: previewEntry.resultName,
            resultMeta: previewEntry.resultBlob
              ? `${previewEntry.resultName} · ${formatBytes(previewEntry.resultBlob.size)} · ${previewEntry.resultMode === "layout" ? "Original Layout" : "Clean Editable"}`
              : null,
          }}
          initialView={preview.view}
          onClose={() => setPreview(null)}
          onRemove={() => {
            removeEntry(previewEntry.id);
            setPreview(null);
          }}
          onReplace={(file) => replaceEntryFile(previewEntry.id, file)}
        />
      )}
      {preview?.item && (
        <PreviewDialog
          target={{
            file: null,
            sourceName: preview.item.sourceName,
            sourceMeta: `Converted ${new Date(preview.item.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${preview.item.summary}`,
            resultBlob: preview.item.blob,
            resultUrl: null,
            resultName: preview.item.resultName,
            resultMeta: `${preview.item.resultName} · ${formatBytes(preview.item.size)} · ${modeLabel(preview.item.mode)}`,
          }}
          initialView="docx"
          onClose={() => setPreview(null)}
        />
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </fieldset>
  );
}
