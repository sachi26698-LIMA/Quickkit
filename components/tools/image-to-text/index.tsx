"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Columns2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { formatBytes } from "@/lib/tools/download";
import {
  inspectSources,
  nextId,
  runOcr,
  type PageJob,
  type RunResult,
  type SourceRecord,
} from "@/lib/tools/image-to-text/runner";
import { extractPage } from "@/lib/tools/image-to-text/extract";
import { releaseEngine } from "@/lib/tools/image-to-text/engine";

import { detectLanguages } from "@/lib/tools/image-to-text/language";
import {
  createEditor,
  commit,
  redo,
  undo,
} from "@/lib/tools/image-to-text/editor";
import { sectionTitle } from "@/lib/tools/image-to-text/export";
import {
  DEFAULT_SETTINGS,
  OCR_EXTENSIONS,
  OCR_LIMITS,
  OCR_MIME_TYPES,
  normalizeSettings,
  type OcrDocumentSection,
  type OcrLanguageCode,
  type OcrSettings,
} from "@/lib/tools/image-to-text/types";
import SettingsPanel from "./settings-panel";
import UploadPanel from "./upload-panel";
import CropDialog, { type CropRect } from "./crop-dialog";
import EditorPane from "./editor-pane";
import PreviewPane from "./preview-pane";
import ExportPanel from "./export-panel";
import { ProgressBar, formatSeconds } from "./shared";

type Phase = "idle" | "running" | "done" | "cancelled" | "error";

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/** Reject a file we cannot read, with a reason the user can act on. */
function validateFile(file: File): string | null {
  const extension = extensionOf(file.name);
  const knownMime =
    (OCR_MIME_TYPES as readonly string[]).includes(file.type) ||
    (!file.type && (OCR_EXTENSIONS as readonly string[]).includes(extension));
  if (!knownMime)
    return `${file.name} is not an image or PDF this tool can read (JPG, PNG, WEBP, BMP, TIFF, AVIF, GIF, PDF).`;
  if (!file.size) return `${file.name} is empty, so there is nothing to read.`;
  if (file.size > OCR_LIMITS.maxFileBytes)
    return `${file.name} is ${formatBytes(file.size)}; the limit is ${formatBytes(OCR_LIMITS.maxFileBytes)} per file.`;
  return null;
}

export default function ImageToText() {
  const ready = useHydrated();
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState<OcrSettings>(DEFAULT_SETTINGS);
  const [jobs, setJobs] = useState<PageJob[]>([]);
  const [sections, setSections] = useState<OcrDocumentSection[]>([]);
  const [histories, setHistories] = useState<
    Record<string, ReturnType<typeof createEditor>>
  >({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [overall, setOverall] = useState({ fraction: 0, label: "" });
  const [runError, setRunError] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<SourceRecord | null>(null);
  const [detected, setDetected] = useState<
    Array<{ code: OcrLanguageCode; confidence: number }>
  >([]);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const jobQueueRef = useRef<PageJob[]>([]);

  const effectiveSettings = useMemo(() => {
    const accuracy = settings.accuracy;
    const maxSide =
      accuracy === "accuracy" ? 3200 : accuracy === "speed" ? 1600 : 2400;
    return normalizeSettings({ ...settings, maxSide });
  }, [settings]);

  /* ------------------------------- files --------------------------------- */

  const patchSource = useCallback(
    (id: string, patch: Partial<SourceRecord>) => {
      setSources((current) =>
        current.map((source) =>
          source.id === id ? { ...source, ...patch } : source,
        ),
      );
    },
    [],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const problems: string[] = [];
      const accepted: SourceRecord[] = [];
      const totalBytes =
        sources.reduce((sum, source) => sum + source.size, 0) +
        incoming.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > OCR_LIMITS.maxBatchBytes) {
        setIssues([
          `This batch would be ${formatBytes(totalBytes)}; the limit is ${formatBytes(OCR_LIMITS.maxBatchBytes)}. Remove a file or start a new batch.`,
        ]);
        return;
      }
      for (const file of incoming) {
        const problem = validateFile(file);
        if (problem) {
          problems.push(problem);
          continue;
        }
        if (sources.length + accepted.length >= OCR_LIMITS.maxFiles) {
          problems.push(
            `Only ${OCR_LIMITS.maxFiles} files can be read in one batch. ${file.name} was not added.`,
          );
          continue;
        }
        const isPdf =
          file.type === "application/pdf" || extensionOf(file.name) === ".pdf";
        accepted.push({
          id: nextId(),
          file,
          name: file.name,
          size: file.size,
          kind: isPdf ? "pdf" : "image",
          previewUrl: isPdf ? "" : URL.createObjectURL(file),
          rotation: 0,
          selected: true,
          order: sources.length + accepted.length,
          pageCount: null,
          status: "queued",
          error: null,
          notes: [],
        });
      }
      setIssues(problems);
      if (!accepted.length) return;
      setSources((current) => [...current, ...accepted]);
      setPhase("idle");
      // Inspect PDFs in the background so page counts and honesty notes show up
      // before OCR starts.
      const pdfs = accepted.filter((source) => source.kind === "pdf");
      if (pdfs.length) {
        const inspections = await inspectSources(pdfs);
        setSources((current) =>
          current.map((source) => {
            const inspection = inspections.get(source.id);
            if (!inspection) return source;
            return {
              ...source,
              pageCount: inspection.pageCount,
              notes: [inspection.note],
            };
          }),
        );
      }
    },
    [sources],
  );

  const removeSource = useCallback((id: string) => {
    setSources((current) => {
      const target = current.find((source) => source.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((source) => source.id !== id);
    });
    setSections((current) =>
      current.filter((section) => section.page.sourceId !== id),
    );
    setJobs((current) => current.filter((job) => job.sourceId !== id));
  }, []);

  const moveSource = useCallback((id: string, direction: -1 | 1) => {
    setSources((current) => {
      const index = current.findIndex((source) => source.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.length)
        return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((source, order) => ({ ...source, order }));
    });
  }, []);

  const rotateSource = useCallback((id: string) => {
    setSources((current) =>
      current.map((source) =>
        source.id === id
          ? { ...source, rotation: (source.rotation + 90) % 360 }
          : source,
      ),
    );
  }, []);

  /* ------------------------------ running -------------------------------- */

  const upsertSection = useCallback((result: RunResult) => {
    const section: OcrDocumentSection = {
      id: result.page.id,
      title: sectionTitle(result.page),
      page: result.page,
      extraction: result.extraction,
      text: result.extraction.text,
    };
    setSections((current) => {
      const index = current.findIndex((item) => item.id === section.id);
      if (index === -1) return [...current, section];
      const next = [...current];
      next[index] = section;
      return next;
    });
    setHistories((current) => ({
      ...current,
      [section.id]: createEditor(section.text),
    }));
    setActiveId((current) => current ?? section.id);
    if (result.page.text.trim()) setDetected(detectLanguages(result.page.text));
  }, []);

  const run = useCallback(
    async (targets?: SourceRecord[]) => {
      const queue = (targets ?? sources).filter((source) => source.selected);
      if (!queue.length) {
        setRunError("Select at least one file to read.");
        return;
      }
      setRunError(null);
      setPhase("running");
      setOverall({ fraction: 0, label: "Starting the on-device engine…" });
      startedAtRef.current = Date.now();
      setElapsed(0);
      const controller = new AbortController();
      abortRef.current = controller;
      jobQueueRef.current = [];
      // Reset the status of the files taking part in this run.
      setSources((current) =>
        current.map((source) =>
          queue.some((item) => item.id === source.id)
            ? { ...source, status: "queued", error: null }
            : source,
        ),
      );
      try {
        const outcome = await runOcr({
          sources: queue,
          settings: effectiveSettings,
          signal: controller.signal,
          handlers: {
            onJobs: (next) => {
              jobQueueRef.current = next;
              setJobs(next);
            },
            onPage: (result) => upsertSection(result),
            onSourceUpdate: (id, patch) => patchSource(id, patch),
            onOverall: (fraction, label) => setOverall({ fraction, label }),
          },
        });
        setPhase(
          outcome.cancelled
            ? "cancelled"
            : outcome.failures.length
              ? "error"
              : "done",
        );
        if (outcome.failures.length)
          setRunError(
            `${outcome.failures.length} file(s) could not be read. The reason is shown on each file.`,
          );
        if (outcome.results.length) {
          const first = outcome.results[0];
          if (first.page.text.trim())
            setDetected(detectLanguages(first.page.text));
        }
      } catch (error) {
        setPhase("error");
        setRunError(
          error instanceof Error ? error.message : "OCR could not run.",
        );
      } finally {
        abortRef.current = null;
      }
    },
    [effectiveSettings, patchSource, sources, upsertSection],
  );

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    const controller = abortRef.current;
    if (controller)
      setOverall((current) => ({ ...current, label: "Cancelling…" }));
    await releaseEngine();
    setPhase("cancelled");
  }, []);

  /* Per-file retry: re-select just that file and run it again. */
  const retrySource = useCallback(
    async (id: string) => {
      const source = sources.find((item) => item.id === id);
      if (!source) return;
      setSources((current) =>
        current.map((item) =>
          item.id === id ? { ...item, selected: true } : item,
        ),
      );
      await run([{ ...source, selected: true }]);
    },
    [run, sources],
  );

  const rerunPage = useCallback(
    async (sectionId: string) => {
      const section = sections.find((item) => item.id === sectionId);
      const source = sources.find((item) => item.id === section?.page.sourceId);
      if (!source) {
        setRunError("The original image is no longer in this batch.");
        return;
      }
      await run([{ ...source, selected: true }]);
    },
    [run, sections, sources],
  );

  /* Re-run extraction only (no engine) after the mode changes. */
  const reextractAll = useCallback(
    (mode: OcrSettings["mode"]) => {
      setSections((current) =>
        current.map((section) => {
          const extraction = extractPage(section.page, {
            mode,
            confidenceThreshold: effectiveSettings.confidenceThreshold,
            keepParagraphBreaks: effectiveSettings.keepParagraphBreaks,
            joinHyphenated: effectiveSettings.joinHyphenated,
          });
          return { ...section, extraction, text: extraction.text };
        }),
      );
      setHistories((current) => {
        const next = { ...current };
        for (const [id, state] of Object.entries(next))
          next[id] = commit(state, state.text);
        return next;
      });
    },
    [effectiveSettings],
  );

  /* ------------------------------ editing -------------------------------- */

  const updateText = useCallback((id: string, text: string) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id ? { ...section, text } : section,
      ),
    );
    setHistories((current) => {
      const state = current[id] ?? createEditor("");
      return { ...current, [id]: commit(state, text) };
    });
  }, []);

  const undoFor = useCallback((id: string) => {
    setHistories((current) => {
      const state = current[id];
      if (!state) return current;
      const next = undo(state);
      setSections((sectionsNow) =>
        sectionsNow.map((section) =>
          section.id === id ? { ...section, text: next.text } : section,
        ),
      );
      return { ...current, [id]: next };
    });
  }, []);

  const redoFor = useCallback((id: string) => {
    setHistories((current) => {
      const state = current[id];
      if (!state) return current;
      const next = redo(state);
      setSections((sectionsNow) =>
        sectionsNow.map((section) =>
          section.id === id ? { ...section, text: next.text } : section,
        ),
      );
      return { ...current, [id]: next };
    });
  }, []);

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(label);
    } catch {
      // Clipboard permissions can be denied; fall back to a manual selection.
      setToast(
        "Copy is blocked in this browser — select the text and press Ctrl+C.",
      );
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(
      () => setElapsed(Date.now() - startedAtRef.current),
      250,
    );
    return () => clearInterval(timer);
  }, [phase]);

  // Release the OCR worker when the tool unmounts: no dangling WAsm memory.
  useEffect(() => () => void releaseEngine(), []);

  /**
   * Changing the extraction mode re-runs extraction on the text we already
   * have. That costs no engine work, so it happens right in the handler
   * instead of an effect: the editor updates in the same render.
   */
  const changeSettings = useCallback(
    (patch: Partial<OcrSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch };
        if (patch.mode && patch.mode !== current.mode && patch.mode !== "smart")
          reextractAll(patch.mode);
        return next;
      });
    },
    [reextractAll],
  );

  /* ------------------------------- crop ---------------------------------- */

  const applyCrop = useCallback(
    (crop: CropRect | undefined) => {
      if (!cropTarget) return;
      patchSource(cropTarget.id, { crop });
      setCropTarget(null);
    },
    [cropTarget, patchSource],
  );

  /* ------------------------------- derived ------------------------------- */

  const selectedCount = sources.filter((source) => source.selected).length;
  const totalPages = sources.reduce(
    (sum, source) => sum + (source.pageCount ?? 1),
    0,
  );
  const finishedJobs = jobs.filter(
    (job) =>
      job.status === "done" ||
      job.status === "error" ||
      job.status === "cancelled",
  ).length;
  const overallFraction = jobs.length
    ? finishedJobs / jobs.length
    : overall.fraction;
  const activeSection =
    sections.find((section) => section.id === activeId) ?? sections[0] ?? null;
  const activeSource = sources.find(
    (source) => source.id === activeSection?.page.sourceId,
  );
  const [pageSelection, setPageSelection] = useState<{
    /** Page ids the user explicitly changed. */
    touched: Set<string>;
    /** Pages that existed when the user last changed something. */
    known: Set<string>;
  }>({ touched: new Set(), known: new Set() });

  // Every new page is selected by default; a page the user explicitly
  // deselected stays deselected. Derived in render, so adding a page never
  // needs a follow-up effect (and never flashes as unselected).
  const knownIds = sections.map((section) => section.id);
  if (
    knownIds.length !== pageSelection.known.size ||
    knownIds.some((id) => !pageSelection.known.has(id))
  ) {
    setPageSelection({
      touched: pageSelection.touched,
      known: new Set(knownIds),
    });
  }
  // `touched` records explicit user decisions only, so a page the user
  // deselected and then selected again stays selected for future pages too.
  const selectedPages = new Set(
    knownIds.filter((id) => !pageSelection.touched.has(id)),
  );

  const setPages = (next: Set<string>) =>
    setPageSelection({
      touched: new Set(knownIds.filter((id) => !next.has(id))),
      known: new Set(knownIds),
    });

  const togglePage = (id: string) => {
    const next = new Set(selectedPages);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPages(next);
  };

  const words = sections.reduce(
    (sum, section) =>
      sum + (section.text.trim() ? section.text.trim().split(/\s+/).length : 0),
    0,
  );

  if (!ready) {
    return (
      <div className="i2t-workspace">
        <div className="i2t-loading" aria-hidden="true">
          Preparing the OCR workspace…
        </div>
      </div>
    );
  }

  const busy = phase === "running";

  return (
    <div className="i2t-workspace">
      <div className="i2t-topbar">
        <div>
          <h2>Read any image into editable text</h2>
          <p>
            Printed pages, screenshots, receipts, tables and best-effort
            handwriting — in English, Hindi, Gujarati, Marathi, Bengali, Tamil,
            Telugu and Urdu.
          </p>
        </div>
        <span className="i2t-local">
          <ShieldCheck size={14} aria-hidden="true" /> 100% on-device
        </span>
      </div>

      <div className="i2t-layout">
        <div className="i2t-col-main">
          <UploadPanel
            sources={sources}
            issues={issues}
            dragging={dragging}
            busy={busy}
            inputRef={inputRef}
            onFiles={(files) => void addFiles(files)}
            onDragState={setDragging}
            onSelect={(id, selected) => patchSource(id, { selected })}
            onSelectAll={() =>
              setSources((current) =>
                current.map((source) => ({ ...source, selected: true })),
              )
            }
            onDeselectAll={() =>
              setSources((current) =>
                current.map((source) => ({ ...source, selected: false })),
              )
            }
            onInvert={() =>
              setSources((current) =>
                current.map((source) => ({
                  ...source,
                  selected: !source.selected,
                })),
              )
            }
            onRemove={removeSource}
            onRetry={(id) => void retrySource(id)}
            onRotate={rotateSource}
            onMove={moveSource}
            onCrop={(id) =>
              setCropTarget(sources.find((source) => source.id === id) ?? null)
            }
          />

          <div className="i2t-run-bar">
            <div className="i2t-run-info">
              <strong>
                {selectedCount} of {sources.length} file
                {sources.length === 1 ? "" : "s"} selected
              </strong>
              <span>
                {totalPages} page{totalPages === 1 ? "" : "s"} ·{" "}
                {settings.languages.length} language
                {settings.languages.length === 1 ? "" : "s"} ·{" "}
                {effectiveSettings.maxSide}px max · {sections.length} page
                {sections.length === 1 ? "" : "s"} read
                {words ? ` · ${words.toLocaleString()} words` : ""}
              </span>
            </div>
            <div className="i2t-run-actions">
              {sections.length > 0 && (
                <button
                  type="button"
                  className="i2t-btn ghost"
                  onClick={() => {
                    for (const section of sections)
                      setHistories((current) => {
                        const state = current[section.id];
                        return state
                          ? {
                              ...current,
                              [section.id]: { ...state, past: [], future: [] },
                            }
                          : current;
                      });
                  }}
                  disabled={busy}
                  title="Clear undo history for every page"
                >
                  <RefreshCw size={14} aria-hidden="true" /> Reset history
                </button>
              )}
              {busy ? (
                <button
                  type="button"
                  className="i2t-btn danger"
                  onClick={() => void cancel()}
                >
                  <CircleStop size={15} aria-hidden="true" /> Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="i2t-btn primary"
                  onClick={() => void run()}
                  disabled={!selectedCount}
                >
                  <Play size={15} aria-hidden="true" /> Start OCR
                </button>
              )}
            </div>
          </div>

          {(busy || jobs.length > 0) && (
            <div className="i2t-progress-panel" aria-live="polite">
              <div className="i2t-progress-head">
                <strong>
                  {busy
                    ? overall.label || "Reading…"
                    : phase === "cancelled"
                      ? "Cancelled"
                      : "Batch finished"}
                </strong>
                <span>
                  {finishedJobs}/{jobs.length} pages · {formatSeconds(elapsed)}
                </span>
              </div>
              <ProgressBar
                value={overallFraction}
                label="Overall batch progress"
              />
              <ul className="i2t-job-list">
                {jobs.map((job) => (
                  <li key={job.id} data-status={job.status}>
                    <span className="i2t-job-name">
                      {job.sourceName}
                      {job.pageCount > 1
                        ? ` · p${job.page}/${job.pageCount}`
                        : ""}
                    </span>
                    <span className={`i2t-job-state ${job.status}`}>
                      {job.status === "queued"
                        ? "Queued"
                        : job.status === "preparing"
                          ? "Preparing"
                          : job.status === "recognising"
                            ? `${Math.round(job.progress * 100)}%`
                            : job.status === "done"
                              ? "Done"
                              : job.status === "cancelled"
                                ? "Cancelled"
                                : "Failed"}
                    </span>
                    {job.error && (
                      <span className="i2t-job-error">{job.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {runError && (
            <p className="i2t-alert error" role="alert">
              <AlertTriangle size={16} aria-hidden="true" /> {runError}
            </p>
          )}
          {phase === "done" && sections.length > 0 && (
            <p className="i2t-success" role="status">
              <CheckCircle2 size={16} aria-hidden="true" /> Read{" "}
              {sections.length} page
              {sections.length === 1 ? "" : "s"} on this device. Nothing was
              uploaded or saved.
            </p>
          )}

          <div className="i2t-side-by-side">
            <div className="i2t-pane-head">
              <Columns2 size={15} aria-hidden="true" />
              <h3>Page and text, side by side</h3>
            </div>
            <div className="i2t-split">
              <PreviewPane
                section={activeSection}
                sourceUrl={activeSource?.previewUrl || null}
                busy={busy}
              />
              <EditorPane
                sections={sections}
                activeId={activeSection?.id ?? null}
                threshold={settings.confidenceThreshold}
                busy={busy}
                onActivate={setActiveId}
                onChangeText={updateText}
                onUndo={undoFor}
                onRedo={redoFor}
                canUndoFor={(id) => Boolean(histories[id]?.past.length)}
                canRedoFor={(id) => Boolean(histories[id]?.future.length)}
                onCopy={(text, label) => void copy(text, label)}
                onRerun={(id) => void rerunPage(id)}
                onSelectAllPages={() => setPages(new Set(knownIds))}
                onInvertPages={() =>
                  setPages(
                    new Set(knownIds.filter((id) => !selectedPages.has(id))),
                  )
                }
                selectedPages={selectedPages}
                onTogglePage={togglePage}
              />
            </div>
          </div>

          {sections.length > 0 && (
            <ExportPanel
              sections={sections}
              activeId={activeSection?.id ?? null}
              selectedPages={selectedPages}
              documentTitle={
                sections.length === 1
                  ? sections[0].title
                  : `${sections[0].page.sourceName.replace(/\.[^.]+$/u, "")}-and-others`
              }
              settingsSnapshot={{
                languages: settings.languages,
                mode: settings.mode,
                accuracy: settings.accuracy,
                segmentation: settings.segmentation,
                confidenceThreshold: settings.confidenceThreshold,
                enhancement: settings.enhancement,
                maxSide: effectiveSettings.maxSide,
              }}
              disabled={busy}
              onCopyAll={() =>
                void copy(
                  sections.map((section) => section.text).join("\n\n"),
                  "Copied all pages",
                )
              }
            />
          )}

          {sections.length > 0 && (
            <div className="i2t-batch-tools">
              <button
                type="button"
                className="i2t-btn ghost"
                onClick={() => {
                  for (const section of [...sections])
                    removeSource(section.page.sourceId);
                  setJobs([]);
                  setPhase("idle");
                }}
                disabled={busy}
              >
                <Trash2 size={14} aria-hidden="true" /> Clear this batch
              </button>
              <p>
                Closing the tab discards every image and every word of text —
                QUICKKIT stores neither.
              </p>
            </div>
          )}
        </div>

        <aside className="i2t-col-side" aria-label="OCR settings">
          <div className="i2t-side-head">
            <Sparkles size={15} aria-hidden="true" />
            <h3>Settings</h3>
          </div>
          <SettingsPanel
            settings={settings}
            onChange={changeSettings}
            disabled={busy}
            detected={detected}
          />
          <div className="i2t-privacy">
            <ShieldCheck size={15} aria-hidden="true" />
            <div>
              <strong>Nothing leaves this tab</strong>
              <p>
                The OCR engine, its language models and every export are loaded
                from this site and run in your browser. No document is sent to
                an OCR service, and no image or text is stored.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {cropTarget && (
        <CropDialog
          name={cropTarget.name}
          previewUrl={cropTarget.previewUrl}
          initial={cropTarget.crop}
          onCancel={() => setCropTarget(null)}
          onApply={applyCrop}
        />
      )}

      {toast && (
        <p className="i2t-floating-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  );
}
