"use client";

/**
 * Batch orchestration for Image to Text.
 *
 * One source = one uploaded image or PDF. A source expands into one job per
 * page. Jobs run in bounded chunks (1–3 at a time, user controlled) so a large
 * batch never allocates every page at once, progress is reported per job and
 * overall, and cancellation stops both pending and in-flight work.
 */
import {
  preparePdfPages,
  preparePixels,
  decodeImageFile,
  inspectPdf,
} from "./prepare";
import { psmFor, recognizeImage, releaseEngine } from "./engine";
import { buildPage, extractPage, DEFAULT_EXTRACTION } from "./extract";
import { detectLanguages } from "./language";
import {
  OCR_LIMITS,
  OcrError,
  type EnhancementSettings,
  type OcrLanguageCode,
  type OcrPage,
  type OcrSettings,
  type PageExtraction,
} from "./types";

export type SourceKind = "image" | "pdf";

export type JobStatus =
  "queued" | "preparing" | "recognising" | "done" | "error" | "cancelled";

export interface SourceRecord {
  id: string;
  file: File;
  name: string;
  size: number;
  kind: SourceKind;
  /** Object URL for the uploaded file, shown in the gallery as-is. */
  previewUrl: string;
  /** Optional per-source rotation applied before OCR. */
  rotation: number;
  /** Optional normalised crop applied before OCR. */
  crop?: { x: number; y: number; width: number; height: number };
  /** Selected for the next run. */
  selected: boolean;
  order: number;
  pageCount: number | null;
  status: JobStatus;
  error: string | null;
  /** Optional per-source language override. */
  languages?: OcrLanguageCode[];
  /** Optional per-source mode override handled by the workspace. */
  notes: string[];
}

export interface PageJob {
  id: string;
  sourceId: string;
  sourceName: string;
  page: number;
  pageCount: number;
  status: JobStatus;
  /** 0..1 engine progress for this page. */
  progress: number;
  error: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface RunResult {
  page: OcrPage;
  extraction: PageExtraction;
}

export interface RunHandlers {
  onJobs: (jobs: PageJob[]) => void;
  onPage: (result: RunResult) => void;
  onSourceUpdate: (id: string, patch: Partial<SourceRecord>) => void;
  onOverall?: (fraction: number, label: string) => void;
}

export interface RunOutcome {
  results: RunResult[];
  jobs: PageJob[];
  failures: Array<{ id: string; error: string }>;
  cancelled: boolean;
}

let jobCounter = 0;

export function nextId(prefix = "src"): string {
  jobCounter += 1;
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${jobCounter}`;
  return `${prefix}-${random}`;
}

/** Build the page jobs for one source (unknown page count = 1 until inspected). */
export function jobsForSource(source: SourceRecord): PageJob[] {
  const pages = source.pageCount ?? 1;
  return Array.from({ length: pages }, (_, index) => ({
    id: `${source.id}:${index + 1}`,
    sourceId: source.id,
    sourceName: source.name,
    page: index + 1,
    pageCount: pages,
    status: "queued",
    progress: 0,
    error: null,
    startedAt: null,
    finishedAt: null,
  }));
}

/** Run `tasks` with at most `limit` in flight, preserving result order. */
export async function runBounded<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: unknown }>> {
  const results: Array<{ ok: true; value: R } | { ok: false; error: unknown }> =
    new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        try {
          results[index] = {
            ok: true,
            value: await worker(items[index], index),
          };
        } catch (error) {
          results[index] = { ok: false, error };
        }
      }
    },
  );
  await Promise.all(runners);
  return results;
}

export interface RunOptions {
  sources: SourceRecord[];
  settings: OcrSettings;
  handlers: RunHandlers;
  signal: AbortSignal;
}

function message(error: unknown): string {
  if (error instanceof OcrError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong while reading this page.";
}

/**
 * Inspect PDFs (page counts, text layer) before any OCR runs, so the UI can
 * show how many pages a file will produce and whether it is already digital.
 */
export async function inspectSources(
  sources: SourceRecord[],
): Promise<
  Map<string, { pageCount: number; hasTextLayer: boolean; note: string }>
> {
  const pdfs = sources.filter((source) => source.kind === "pdf");
  const results = new Map<
    string,
    { pageCount: number; hasTextLayer: boolean; note: string }
  >();
  for (const source of pdfs) {
    try {
      const inspection = await inspectPdf(source.file);
      results.set(source.id, {
        pageCount: Math.min(inspection.pageCount, OCR_LIMITS.maxPdfPages),
        hasTextLayer: inspection.hasTextLayer,
        note: inspection.hasTextLayer
          ? "This PDF already has a text layer; OCR readings can differ from the embedded text."
          : `Scanned PDF · ${inspection.pageCount} page(s) will be rendered on this device.`,
      });
    } catch (error) {
      results.set(source.id, {
        pageCount: 1,
        hasTextLayer: false,
        note: message(error),
      });
    }
  }
  return results;
}

/** Merge the global enhancement settings with a source's own rotate/crop. */
export function enhancementFor(
  source: SourceRecord,
  enhancement: EnhancementSettings,
): EnhancementSettings {
  return {
    ...enhancement,
    rotation: (enhancement.rotation + source.rotation) % 360,
    crop: source.crop ?? enhancement.crop,
  };
}

/**
 * Run OCR over every selected source. Resolves with every successful page,
 * keeps failures per job (never silently dropped) and supports cancellation.
 */
export async function runOcr(options: RunOptions): Promise<RunOutcome> {
  const { sources, settings, handlers, signal } = options;
  const selected = sources.filter((source) => source.selected);
  const jobs: PageJob[] = [];
  const results: RunResult[] = [];
  const failures: Array<{ id: string; error: string }> = [];
  let cancelled = false;

  const emit = () => handlers.onJobs([...jobs]);
  const overall = (label: string) => {
    const done = jobs.filter(
      (job) =>
        job.status === "done" ||
        job.status === "error" ||
        job.status === "cancelled",
    ).length;
    const fraction = jobs.length ? done / jobs.length : 0;
    handlers.onOverall?.(fraction, label);
  };

  // 1. Expand sources into jobs.
  for (const source of selected) {
    if (signal.aborted) {
      cancelled = true;
      break;
    }
    if (source.kind === "pdf" && source.pageCount === null) {
      try {
        const inspection = await inspectPdf(source.file);
        jobs.push(
          ...jobsForSource({ ...source, pageCount: inspection.pageCount }),
        );
      } catch (error) {
        failures.push({ id: source.id, error: message(error) });
        handlers.onSourceUpdate(source.id, {
          status: "error",
          error: message(error),
        });
        continue;
      }
    } else {
      jobs.push(...jobsForSource(source));
    }
  }
  emit();
  if (!jobs.length) {
    return { results, jobs, failures, cancelled };
  }

  const updateJob = (id: string, patch: Partial<PageJob>) => {
    const index = jobs.findIndex((job) => job.id === id);
    if (index === -1) return;
    jobs[index] = { ...jobs[index], ...patch };
    emit();
  };

  const extractionOptions = {
    mode: settings.mode,
    confidenceThreshold: settings.confidenceThreshold,
    keepParagraphBreaks: settings.keepParagraphBreaks,
    joinHyphenated: settings.joinHyphenated,
  };

  // 2. Group jobs by source so a PDF is rendered once per page, in order.
  const bySource = new Map<string, PageJob[]>();
  for (const job of jobs) {
    const list = bySource.get(job.sourceId) ?? [];
    list.push(job);
    bySource.set(job.sourceId, list);
  }

  const sourceList = [...bySource.entries()];

  await runBounded(
    sourceList,
    settings.concurrency,
    async ([sourceId, list]) => {
      const source = sources.find((candidate) => candidate.id === sourceId);
      if (!source) return;
      if (signal.aborted) {
        cancelled = true;
        for (const job of list)
          updateJob(job.id, { status: "cancelled", error: "Cancelled" });
        return;
      }
      handlers.onSourceUpdate(sourceId, { status: "preparing", error: null });
      try {
        const enhancement = enhancementFor(source, settings.enhancement);
        const languages = (
          source.languages?.length ? source.languages : settings.languages
        ) as OcrLanguageCode[];

        if (source.kind === "pdf") {
          // Render only the pages this source actually needs.
          const wanted = new Set(list.map((job) => job.page));
          const range = [...wanted].sort((a, b) => a - b).join(",");
          const rendered = await preparePdfPages(
            source.file,
            range,
            { enhancement, maxSide: settings.maxSide },
            (page, count) =>
              handlers.onOverall?.(
                0,
                `Rendering ${source.name} page ${page} of ${count}`,
              ),
            signal,
          );
          for (const item of rendered) {
            const job = list.find((candidate) => candidate.page === item.page);
            if (!job) continue;
            if (signal.aborted) {
              cancelled = true;
              updateJob(job.id, { status: "cancelled", error: "Cancelled" });
              continue;
            }
            updateJob(job.id, {
              status: "recognising",
              progress: 0,
              startedAt: Date.now(),
            });
            handlers.onSourceUpdate(sourceId, { status: "recognising" });
            const result = await recognizeAndExtract({
              prepared: item.prepared,
              source,
              page: item.page,
              pageCount: list.length,
              languages,
              settings,
              extractionOptions,
              signal,
              onProgress: (progress) => updateJob(job.id, { progress }),
            });
            if (result) {
              results.push(result);
              updateJob(job.id, {
                status: "done",
                progress: 1,
                finishedAt: Date.now(),
              });
              handlers.onPage(result);
            } else {
              cancelled = true;
              updateJob(job.id, { status: "cancelled", error: "Cancelled" });
            }
            overall(`Reading ${source.name}`);
          }
          handlers.onSourceUpdate(sourceId, { status: "done" });
          return;
        }

        // Images: decode once, prepare, recognise.
        const job = list[0];
        updateJob(job.id, {
          status: "preparing",
          progress: 0,
          startedAt: Date.now(),
        });
        const decoded = await decodeImageFile(source.file);
        try {
          if (signal.aborted) {
            cancelled = true;
            updateJob(job.id, { status: "cancelled", error: "Cancelled" });
            return;
          }
          const prepared = preparePixels(decoded.pixels, {
            enhancement,
            maxSide: settings.maxSide,
          });
          updateJob(job.id, { status: "recognising" });
          handlers.onSourceUpdate(sourceId, {
            status: "recognising",
            notes: [
              ...source.notes,
              ...decoded.notes.filter((note) => !source.notes.includes(note)),
            ],
          });
          const result = await recognizeAndExtract({
            prepared,
            source,
            page: 1,
            pageCount: 1,
            languages,
            settings,
            extractionOptions,
            signal,
            onProgress: (progress) => updateJob(job.id, { progress }),
          });
          if (result) {
            results.push(result);
            updateJob(job.id, {
              status: "done",
              progress: 1,
              finishedAt: Date.now(),
            });
            handlers.onPage(result);
            handlers.onSourceUpdate(sourceId, {
              status: "done",
              notes: prepared.notes,
            });
          } else {
            cancelled = true;
            updateJob(job.id, { status: "cancelled", error: "Cancelled" });
          }
        } finally {
          decoded.release();
        }
        overall(`Reading ${source.name}`);
      } catch (error) {
        const text = message(error);
        const isCancel =
          error instanceof OcrError && error.kind === "cancelled";
        if (isCancel) cancelled = true;
        for (const job of list) {
          if (job.status === "done") continue;
          updateJob(job.id, {
            status: isCancel ? "cancelled" : "error",
            error: text,
          });
        }
        handlers.onSourceUpdate(sourceId, {
          status: isCancel ? "cancelled" : "error",
          error: text,
        });
        if (!isCancel) failures.push({ id: sourceId, error: text });
      }
    },
  );

  overall("Finished");
  if (signal.aborted || cancelled) await releaseEngine();
  return { results, jobs, failures, cancelled };
}

interface RecognizeAndExtractArgs {
  prepared: {
    image: ImageData;
    width: number;
    height: number;
    notes: string[];
  };
  source: SourceRecord;
  page: number;
  pageCount: number;
  languages: OcrLanguageCode[];
  settings: OcrSettings;
  extractionOptions: Parameters<typeof extractPage>[1];
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}

/** Recognise a prepared page and run extraction in the chosen mode. */
async function recognizeAndExtract(
  args: RecognizeAndExtractArgs,
): Promise<RunResult | null> {
  const {
    prepared,
    source,
    page,
    pageCount,
    languages,
    settings,
    extractionOptions,
    signal,
    onProgress,
  } = args;
  if (signal.aborted) return null;
  const recognized = await recognizeImage(prepared.image, languages, {
    psm: psmFor(settings.segmentation),
    autoRotate: settings.autoRotate,
    signal,
    onProgress: (progress) => {
      if (progress.status === "recognizing text") onProgress(progress.progress);
    },
  });
  if (signal.aborted) return null;

  const detected = detectLanguages(recognized.text);
  const pageModel = buildPage({
    id: `${source.id}:${page}`,
    sourceId: source.id,
    sourceName: source.name,
    page,
    pageCount,
    width: prepared.width,
    height: prepared.height,
    lines: recognized.lines,
    text: recognized.text,
    confidence: recognized.confidence,
    durationMs: recognized.durationMs,
    threshold: settings.confidenceThreshold,
    languages,
    warnings: [
      ...prepared.notes,
      ...(detected.length
        ? [
            `Detected: ${detected.map((d) => `${d.code} ${Math.round(d.confidence * 100)}%`).join(", ")}`,
          ]
        : []),
      ...(recognized.lines.length === 0
        ? ["No text was recognised on this page."]
        : []),
    ],
  });
  const extraction = extractPage(
    pageModel,
    extractionOptions ?? DEFAULT_EXTRACTION,
  );
  return { page: pageModel, extraction };
}
