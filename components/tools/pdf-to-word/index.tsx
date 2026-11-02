"use client";
import { useEffect, useRef, useState } from "react";
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
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { zipSync } from "fflate";
import { downloadBlob, formatBytes } from "@/lib/tools/download";
import { useHydrated } from "@/lib/use-hydrated";
import {
  extractPdf,
  hasPdfMagic,
  inspectPdf,
  type InspectResult,
} from "@/lib/tools/pdf-to-word/extract";
import { terminateOcr } from "@/lib/tools/pdf-to-word/ocr";
import { structureDocument } from "@/lib/tools/pdf-to-word/structure";
import { buildDocx } from "@/lib/tools/pdf-to-word/render-docx";
import {
  PDF_TO_WORD_LIMITS,
  PdfToWordError,
  type ConversionMode,
  type ConversionReport,
} from "@/lib/tools/pdf-to-word/types";
import { WorkspaceHeading } from "../tool-ui";
import PreviewDialog, { type PreviewView } from "./preview-dialog";

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
  if (kind === "scanned") return "Scanned";
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

function resultNameFor(fileName: string): string {
  return `${fileName.replace(/\.pdf$/i, "")}.docx`;
}

export default function PdfToWord() {
  const ready = useHydrated();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<ConversionMode>("clean");
  const [useOcr, setUseOcr] = useState(false);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    id: number;
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
  }

  async function convertEntry(
    entry: Entry,
    signal: AbortSignal,
  ): Promise<"done" | "failed" | "cancelled"> {
    patchEntry(entry.id, { status: "converting", progress: 0, error: null });
    setAnnouncement(`Converting ${entry.file.name}`);
    try {
      const bytes = new Uint8Array(await entry.file.arrayBuffer());
      const { pages, stats } = await extractPdf(bytes, {
        ocr: useOcr,
        signal,
        onProgress: (done, total) =>
          patchEntry(entry.id, { progress: done / total }),
      });
      const { pages: structured, removedRunningLines } =
        structureDocument(pages);
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

      const blob = await buildDocx(structured, mode, entry.file.name);
      const url = URL.createObjectURL(blob);
      const tablesDetected = structured.reduce(
        (n, p) => n + p.blocks.filter((b) => b.kind === "table").length,
        0,
      );
      patchEntry(entry.id, {
        status: "done",
        progress: 1,
        resultBlob: blob,
        resultUrl: url,
        resultName: resultNameFor(entry.file.name),
        resultMode: mode,
        report: {
          sourcePages: entry.pageCount ?? structured.length,
          convertedPages: structured.length,
          pageSelection: null,
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
      setAnnouncement(`Batch finished. ${done} converted, ${failed} failed.`);
    }
  }

  async function downloadZip() {
    const done = entriesRef.current.filter(
      (e) => e.status === "done" && e.resultBlob && e.resultName,
    );
    if (done.length === 0) return;
    const files: Record<string, Uint8Array> = {};
    const usedNames = new Set<string>();
    const reportLines: string[] = [
      "QUICKKIT — PDF to Word batch report",
      `Mode: ${mode === "layout" ? "Original Layout" : "Clean Editable"}`,
      `Converted: ${done.length}  Failed: ${entriesRef.current.filter((e) => e.status === "failed").length}`,
      "",
    ];
    for (const entry of entriesRef.current) {
      if (entry.status === "done" && entry.resultBlob && entry.resultName) {
        let name = entry.resultName;
        let counter = 2;
        while (usedNames.has(name.toLowerCase())) {
          name = entry.resultName.replace(/\.docx$/i, ` (${counter++}).docx`);
        }
        usedNames.add(name.toLowerCase());
        files[name] = new Uint8Array(await entry.resultBlob.arrayBuffer());
        const r = entry.report;
        reportLines.push(
          `✓ ${entry.file.name} -> ${name}` +
            (r
              ? ` (${r.convertedPages} of ${r.sourcePages} pages, ${r.tablesDetected} tables, ${r.imagesExtracted} images${r.ocrPages ? `, ${r.ocrPages} OCR pages` : ""})`
              : ""),
        );
        for (const warning of r?.warnings ?? []) {
          reportLines.push(`    note: ${warning}`);
        }
      } else if (entry.status === "failed") {
        reportLines.push(`✗ ${entry.file.name} — ${entry.error ?? "failed"}`);
      }
    }
    files["batch-report.txt"] = new TextEncoder().encode(
      reportLines.join("\n") + "\n",
    );
    const zipped = zipSync(files, { level: 0 });
    downloadBlob(
      new Blob([zipped as BlobPart], { type: "application/zip" }),
      "quickkit-word-documents.zip",
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
                ? ` · ${doneEntries.length} converted, ${failedCount} failed`
                : ""}
            </span>
            <div className="p2w-batch-actions">
              {!running ? (
                <>
                  <button
                    type="button"
                    className="primary"
                    disabled={readyCount === 0}
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
                  {doneEntries.length > 1 && (
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={() => void downloadZip()}
                    >
                      <Archive size={15} aria-hidden="true" /> Download ZIP
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
                    {entry.kind === "scanned" && " · Scanned (image-only)"}
                    {entry.kind === "mixed" && " · Some scanned pages"}
                    {entry.report &&
                      ` · ${entry.report.tablesDetected} table(s), ${entry.report.imagesExtracted} image(s)`}
                  </span>
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
                  {entry.report && entry.report.warnings.length > 0 && (
                    <details className="p2w-notes">
                      <summary>
                        Conversion notes ({entry.report.warnings.length})
                      </summary>
                      <ul>
                        {entry.report.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
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
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${entry.file.name}`}
                    disabled={entry.status === "converting"}
                    onClick={() => removeEntry(entry.id)}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
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
            </div>
          )}
        </>
      )}

      <p className="help">
        Converted files are genuine Word documents that open in Microsoft Word,
        LibreOffice and Google Docs. Layout is approximated — fonts are
        substituted and complex vector graphics cannot be carried over. Your
        original PDFs are never modified.
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

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </fieldset>
  );
}
