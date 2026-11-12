"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaults,
  MAX_FILE,
  MAX_QUEUE,
  nativeKey,
  outputName,
  validateSettings,
  type Settings,
} from "@/lib/tools/word-to-pdf/settings";
import {
  fetchEngineInfo,
  requestConversion,
  type ConversionStage,
  type EngineInfo,
} from "@/lib/tools/word-to-pdf/client-convert";
import {
  processPdf,
  extractPdfPages,
} from "@/lib/tools/word-to-pdf/process-pdf";
export type StudioRow = {
  id: string;
  file: File;
  name: string;
  status: "queued" | "checking" | "converting" | "done" | "error" | "cancelled";
  message: string;
  stage?: string;
  progress?: { done: number; total: number } | null;
  warnings?: string[];
  engine?: string;
  base?: Uint8Array<ArrayBuffer>;
  bytes?: Uint8Array<ArrayBuffer>;
  pages?: number;
  sourcePages?: number;
  native?: string;
  outputKey?: string;
  outputSettings?: Settings;
  version: number;
  /** True only after the browser has confirmed the file is a valid DOCX ZIP. */
  inputValid: boolean;
};
type Preferences = { global: Settings; individual: Record<string, Settings> };
const LIMIT = 120 * 1024 * 1024;
const retained = (rows: StudioRow[]) =>
  rows.reduce((n, r) => n + (r.base?.length || 0) + (r.bytes?.length || 0), 0);
export const fileProblem = (file: File) =>
  !/\.(docx|doc)$/i.test(file.name)
    ? "Only .docx documents (and .doc files that are really DOCX packages) are accepted."
    : file.size > MAX_FILE
      ? "File exceeds the 20 MiB limit."
      : !file.size
        ? "This file is empty."
        : "";

/**
 * Reads the first bytes of a local file to tell a DOCX package apart from a
 * legacy .doc binary, an encrypted (password-protected) package, or junk.
 * Nothing is uploaded: the check runs in the browser.
 */
export async function probeFile(file: File) {
  if (!file.size) return { ok: false, message: "This file is empty." } as const;
  const head = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
  const zip =
    head[0] === 0x50 &&
    head[1] === 0x4b &&
    head[2] === 0x03 &&
    head[3] === 0x04;
  const cfb =
    head[0] === 0xd0 &&
    head[1] === 0xcf &&
    head[2] === 0x11 &&
    head[3] === 0xe0;
  if (zip)
    return {
      ok: true,
      message: /\.doc$/i.test(file.name)
        ? "DOCX package detected (safe to convert despite the .doc name)."
        : "Valid DOCX package · not yet uploaded.",
    } as const;
  if (cfb) {
    const text = new TextDecoder("latin1").decode(head);
    const wordName = /\.docx?$/i.test(file.name);
    return {
      ok: false,
      message:
        /EncryptedPackage/i.test(text) || wordName
          ? "This is a password-protected or legacy binary Word file. Re-save it as .docx without a password."
          : "This OLE container is not a DOCX document.",
    } as const;
  }
  return {
    ok: false,
    message:
      "This is not a DOCX package (no ZIP signature). The file may be renamed, corrupted or truncated.",
  } as const;
}
const newRow = (file: File): StudioRow => ({
  id: crypto.randomUUID(),
  file,
  name: outputName(file.name.replace(/\.docx$/i, "")),
  status: fileProblem(file) ? "error" : "checking",
  message: fileProblem(file) || "Checking document…",
  version: 0,
  inputValid: false,
});
export function useStudio() {
  const [rows, setRows] = useState<StudioRow[]>([]),
    rowsRef = useRef(rows);
  const [prefs, setPrefs] = useState<Preferences>({
      global: defaults,
      individual: {},
    }),
    prefsRef = useRef(prefs);
  const [undoCount, setUndoCount] = useState(0),
    history = useRef<Preferences[]>([]);
  const [redoCount, setRedoCount] = useState(0),
    future = useRef<Preferences[]>([]);
  const localAbort = useRef<AbortController | null>(null),
    extractionAbort = useRef<AbortController | null>(null);
  const [activeId, setActiveId] = useState("");
  const [consent, setConsent] = useState(false),
    [auto, setAuto] = useState(false);
  const [engine, setEngine] = useState<EngineInfo | null>(null),
    [engineError, setEngineError] = useState(""),
    [busy, setBusy] = useState(false),
    [localBusy, setLocalBusy] = useState(false),
    [error, setError] = useState("");
  const active = useRef(false),
    mounted = useRef(true),
    abort = useRef<AbortController | null>(null);
  const localChain = useRef<Promise<unknown>>(Promise.resolve());
  const processClient = (
    source: Uint8Array,
    settings: Settings,
    signal: AbortSignal,
  ) => {
    const task = localChain.current
      .catch(() => undefined)
      .then(() => processPdf(source, settings, signal));
    localChain.current = task;
    return task;
  };
  const updateRows = useCallback((fn: (rows: StudioRow[]) => StudioRow[]) => {
    if (mounted.current) {
      const next = fn(rowsRef.current);
      rowsRef.current = next;
      setRows(next);
    }
  }, []);
  const patch = useCallback(
    (id: string, value: Partial<StudioRow>) =>
      updateRows((all) =>
        all.map((r) => (r.id === id ? { ...r, ...value } : r)),
      ),
    [updateRows],
  );
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void fetchEngineInfo(controller.signal)
      .then((info) => {
        if (controller.signal.aborted) return;
        setEngine(info);
        setEngineError("");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setEngine(null);
        setEngineError(
          "Could not read the conversion engine status from this server. Check your connection, then retry.",
        );
      });
    return () => {
      mounted.current = false;
      controller.abort();
      abort.current?.abort();
      localAbort.current?.abort();
      extractionAbort.current?.abort();
    };
  }, []);
  const effective = (row: StudioRow) =>
    prefs.individual[row.id] || prefs.global;
  const ready = (row: StudioRow) =>
    !!row.bytes &&
    row.status === "done" &&
    row.outputKey === JSON.stringify(effective(row)) &&
    row.native === nativeKey(effective(row));
  const mutatePrefs = (next: Preferences) => {
    if (active.current) return;
    history.current = [...history.current.slice(-29), prefsRef.current];
    setUndoCount(history.current.length);
    future.current = [];
    setRedoCount(0);
    prefsRef.current = next;
    setPrefs(next);
  };
  const changeSettings = (settings: Settings, id?: string) =>
    mutatePrefs(
      id
        ? {
            ...prefsRef.current,
            individual: { ...prefsRef.current.individual, [id]: settings },
          }
        : { ...prefsRef.current, global: settings },
    );
  const override = (id: string, enabled: boolean) => {
    const individual = { ...prefs.individual };
    if (enabled) individual[id] = { ...prefs.global };
    else delete individual[id];
    mutatePrefs({ ...prefs, individual });
  };
  const undo = () => {
    if (active.current) return;
    const previous = history.current.pop();
    if (previous) {
      future.current = [...future.current.slice(-29), prefsRef.current];
      setRedoCount(future.current.length);
      prefsRef.current = previous;
      setPrefs(previous);
      setUndoCount(history.current.length);
    }
  };
  const redo = () => {
    if (active.current) return;
    const next = future.current.pop();
    if (next) {
      history.current = [...history.current.slice(-29), prefsRef.current];
      setUndoCount(history.current.length);
      prefsRef.current = next;
      setPrefs(next);
      setRedoCount(future.current.length);
    }
  };
  const snapshotCurrent = (snapshot: StudioRow[]) =>
    snapshot.every((row) => {
      const current = rowsRef.current.find((r) => r.id === row.id),
        settings =
          prefsRef.current.individual[row.id] || prefsRef.current.global;
      return (
        !!current &&
        current.bytes === row.bytes &&
        current.status === "done" &&
        current.outputKey === JSON.stringify(settings) &&
        current.native === nativeKey(settings)
      );
    });
  async function extract(id: string, indices: number[]) {
    const row = rowsRef.current.find((r) => r.id === id);
    if (!row || !ready(row) || !row.bytes || active.current)
      throw new Error("Wait for synchronized output before extraction.");
    extractionAbort.current?.abort();
    const control = new AbortController();
    extractionAbort.current = control;
    const task = localChain.current
      .catch(() => undefined)
      .then(() => extractPdfPages(row.bytes!, indices, control.signal));
    localChain.current = task;
    const bytes = await task;
    if (!snapshotCurrent([row]))
      throw new Error(
        "Document changed during extraction. Retry with synchronized output.",
      );
    return bytes;
  }
  function add(files: FileList | File[]) {
    if (active.current) return;
    setError("");
    const incoming = Array.from(files);
    if (
      rowsRef.current.length + incoming.length > 10 ||
      rowsRef.current.reduce((n, r) => n + r.file.size, 0) +
        incoming.reduce((n, f) => n + f.size, 0) >
        MAX_QUEUE
    ) {
      setError("Choose up to 10 files, with no more than 80 MiB in the queue.");
      return;
    }
    const additions = incoming.map(newRow);
    updateRows((all) => [...all, ...additions]);
    for (const row of additions) void validate(row.id, row.file);
    if (!activeId && additions[0]) setActiveId(additions[0].id);
  }
  async function validate(id: string, file: File) {
    if (fileProblem(file)) return;
    const probe = await probeFile(file);
    if (!mounted.current) return;
    const current = rowsRef.current.find((row) => row.id === id);
    if (!current || current.file !== file || current.status !== "checking")
      return;
    patch(id, {
      status: probe.ok ? "queued" : "error",
      inputValid: probe.ok,
      message: probe.message,
    });
  }
  function replace(id: string, file: File) {
    if (active.current) return;
    if (
      rowsRef.current.reduce((n, r) => n + (r.id === id ? 0 : r.file.size), 0) +
        file.size >
      MAX_QUEUE
    ) {
      setError("Replacement exceeds the 80 MiB queue limit.");
      return;
    }
    const replacement = newRow(file);
    updateRows((all) =>
      all.map((r) =>
        r.id === id ? { ...replacement, id, version: r.version + 1 } : r,
      ),
    );
    void validate(id, file);
  }
  function pruneFileSettings(ids: string[]) {
    const prune = (value: Preferences): Preferences => {
      const individual = { ...value.individual };
      ids.forEach((id) => delete individual[id]);
      return { ...value, individual };
    };
    history.current = history.current.map(prune);
    future.current = future.current.map(prune);
    const next = prune(prefsRef.current);
    prefsRef.current = next;
    setPrefs(next);
  }
  function remove(id: string) {
    if (active.current) return;
    extractionAbort.current?.abort();
    pruneFileSettings([id]);
    updateRows((all) => all.filter((r) => r.id !== id));
    if (id === activeId) setActiveId(rowsRef.current[0]?.id || "");
  }
  function move(id: string, direction: number) {
    if (active.current) return;
    updateRows((all) => {
      const next = [...all],
        from = next.findIndex((r) => r.id === id),
        to = from + direction;
      if (from >= 0 && to >= 0 && to < next.length)
        [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }
  const available = engine?.available ?? null;
  const refreshEngine = useCallback(async () => {
    setEngineError("");
    try {
      const info = await fetchEngineInfo();
      if (mounted.current) setEngine(info);
    } catch {
      if (mounted.current)
        setEngineError(
          "Could not read the conversion engine status from this server. Check your connection, then retry.",
        );
    }
  }, []);
  const maxPages = engine?.maxPages ?? 1000;
  async function run(only?: string, force = false) {
    if (active.current || !consent || !available) return;
    const jobs = rowsRef.current.filter(
      (r) => r.inputValid && (!only || r.id === only) && (force || !ready(r)),
    );
    if (!jobs.length) return;
    try {
      jobs.forEach((r) =>
        validateSettings(
          prefsRef.current.individual[r.id] || prefsRef.current.global,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your settings.");
      return;
    }
    active.current = true;
    setBusy(true);
    setError("");
    const control = new AbortController();
    abort.current = control;
    try {
      for (const row of jobs) {
        if (control.signal.aborted) {
          patch(row.id, {
            status: "cancelled",
            message: "Cancelled before upload",
          });
          continue;
        }
        const problem = fileProblem(row.file);
        if (problem) {
          patch(row.id, { status: "error", message: problem });
          continue;
        }
        const settings =
          prefsRef.current.individual[row.id] || prefsRef.current.global;
        if (!force && row.base && row.native === nativeKey(settings)) {
          try {
            const result = await processClient(
              row.base,
              settings,
              control.signal,
            );
            if (
              retained(rowsRef.current.filter((r) => r.id !== row.id)) +
                row.base.length +
                result.bytes.length >
              LIMIT
            )
              throw new Error(
                "Retained PDF memory limit reached. Clear completed files.",
              );
            patch(row.id, {
              status: "done",
              bytes: result.bytes,
              pages: result.pages,
              outputKey: JSON.stringify(settings),
              outputSettings: settings,
              message: "Live preview and export are synchronized",
            });
          } catch (e) {
            patch(row.id, {
              status: control.signal.aborted ? "cancelled" : "error",
              message: control.signal.aborted
                ? "Local update cancelled"
                : e instanceof Error
                  ? e.message
                  : "Local update failed.",
            });
          }
          continue;
        }
        patch(row.id, {
          status: "converting",
          bytes: undefined,
          base: undefined,
          outputKey: undefined,
          stage: "Uploading document",
          progress: null,
          warnings: [],
          message: "Uploading to this QUICKKIT server",
        });
        try {
          const onStage = (event: ConversionStage) =>
            patch(row.id, {
              stage: event.stage,
              progress:
                event.total && event.total > 0
                  ? { done: event.done ?? 0, total: event.total }
                  : null,
              message: event.stage,
            });
          const result = await requestConversion(
            row.file,
            settings,
            control.signal,
            onStage,
            maxPages,
          );
          control.signal.throwIfAborted();
          if (
            result.base &&
            retained(rowsRef.current.filter((r) => r.id !== row.id)) +
              result.bytes.length >
              LIMIT
          )
            throw new Error(
              "Retained PDF memory limit reached. Clear completed files before refreshing.",
            );
          if (result.base)
            patch(row.id, {
              base: result.bytes,
              sourcePages: result.pages,
              native: nativeKey(settings),
              version: row.version + 1,
            });
          const final = result.base
            ? await processClient(result.bytes, settings, control.signal)
            : result;
          if (
            retained(rowsRef.current.filter((r) => r.id !== row.id)) +
              final.bytes.length +
              (result.base ? result.bytes.length : 0) >
            LIMIT
          )
            throw new Error(
              "Retained PDFs exceed 120 MiB. Download and clear completed files before retrying.",
            );
          patch(row.id, {
            status: "done",
            base: result.base ? result.bytes : undefined,
            bytes: final.bytes,
            pages: final.pages,
            sourcePages: result.pages,
            native: nativeKey(settings),
            outputKey: JSON.stringify(settings),
            outputSettings: settings,
            version: row.version + 1,
            stage: undefined,
            progress: null,
            warnings: result.warnings,
            engine: result.engine,
            message: result.warnings.length
              ? `Completed with ${result.warnings.length} fidelity note${result.warnings.length > 1 ? "s" : ""} · review before use`
              : "Completed · review before export",
          });
        } catch (e) {
          patch(row.id, {
            status: control.signal.aborted ? "cancelled" : "error",
            stage: undefined,
            progress: null,
            message: control.signal.aborted
              ? "Conversion cancelled; temporary server files are cleaned up"
              : e instanceof Error
                ? e.message
                : "Conversion failed.",
          });
        }
      }
    } finally {
      active.current = false;
      abort.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  // Only settings and retained base versions trigger processing, not filename/status/preview navigation changes.
  const workKey = JSON.stringify([
    prefs,
    rows.map((r) => [r.id, r.version, !!r.base]),
  ]);
  useEffect(() => {
    const controller = new AbortController();
    localAbort.current = controller;
    const timer = setTimeout(() => {
      if (controller.signal.aborted) return;
      setLocalBusy(false);
      const jobs = rowsRef.current.filter(
        (r) =>
          r.base &&
          r.native ===
            nativeKey(
              prefsRef.current.individual[r.id] || prefsRef.current.global,
            ) &&
          r.outputKey !==
            JSON.stringify(
              prefsRef.current.individual[r.id] || prefsRef.current.global,
            ),
      );
      if (!jobs.length) return;
      setLocalBusy(true);
      localChain.current = localChain.current
        .catch(() => undefined)
        .then(async () => {
          try {
            for (const row of jobs) {
              if (controller.signal.aborted || !mounted.current) return;
              const s =
                prefsRef.current.individual[row.id] || prefsRef.current.global;
              if (
                rowsRef.current.find((r) => r.id === row.id)?.outputKey ===
                JSON.stringify(s)
              )
                continue;
              try {
                const result = await processPdf(
                  row.base!,
                  s,
                  controller.signal,
                  (done, total) => {
                    if (
                      !controller.signal.aborted &&
                      (done === total || done % 4 === 0)
                    )
                      patch(row.id, {
                        message: `Processing PDF pages ${done}/${total}`,
                      });
                  },
                );
                if (controller.signal.aborted) return;
                if (
                  retained(rowsRef.current.filter((r) => r.id !== row.id)) +
                    result.bytes.length +
                    row.base!.length >
                  LIMIT
                )
                  throw new Error(
                    "Retained PDF memory limit reached. Clear completed files.",
                  );
                patch(row.id, {
                  bytes: result.bytes,
                  pages: result.pages,
                  outputKey: JSON.stringify(s),
                  outputSettings: s,
                  status: "done",
                  message: "Live preview and export are synchronized",
                });
              } catch (e) {
                if (!controller.signal.aborted)
                  patch(row.id, {
                    status: "error",
                    message:
                      e instanceof Error ? e.message : "Preview update failed.",
                  });
              }
            }
          } finally {
            if (mounted.current && !controller.signal.aborted)
              setLocalBusy(false);
          }
        });
    }, 400);
    controller.signal.addEventListener("abort", () => clearTimeout(timer), {
      once: true,
    });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // workKey is the stable settings/base dependency; status updates must not restart this pipeline.
  }, [workKey, patch]);
  const selected = rows.find((r) => r.id === activeId) || rows[0];
  const selectedSettings = selected ? effective(selected) : prefs.global;
  const nativeStale =
    !!selected?.bytes && selected.native !== nativeKey(selectedSettings);
  useEffect(() => {
    if (!auto || !consent || !available || busy || !selected || !nativeStale)
      return;
    const timer = setTimeout(() => {
      void run(selected.id, true);
    }, 1000);
    return () => clearTimeout(timer);
    // Debounced opt-in auto-upload, only for a previously converted active document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, consent, available, busy, selected?.id, nativeStale, workKey]);
  return {
    rows,
    selected,
    selectedSettings,
    prefs,
    activeId,
    setActiveId,
    available,
    engine,
    engineError,
    refreshEngine,
    maxPages,
    consent,
    setConsent,
    auto,
    setAuto,
    busy,
    localBusy,
    error,
    setError,
    undoCount,
    undo,
    redoCount,
    redo,
    extract,
    snapshotCurrent,
    cancelExtraction: () => extractionAbort.current?.abort(),
    cancelLocal: () => {
      localAbort.current?.abort();
      setLocalBusy(false);
      updateRows((all) =>
        all.map((r) =>
          r.base && !ready(r)
            ? {
                ...r,
                status: "cancelled",
                outputKey: undefined,
                message: "Local PDF update cancelled. Retry before export.",
              }
            : r,
        ),
      );
    },
    retryLocal: () => {
      if (selected?.base && selected.native === nativeKey(selectedSettings))
        patch(selected.id, {
          version: selected.version + 1,
          outputKey: undefined,
        });
    },
    changeSettings,
    override,
    add,
    replace,
    remove,
    move,
    run,
    ready,
    nativeStale,
    patch,
    cancel: () => abort.current?.abort(),
    clear: () => {
      if (!active.current) {
        pruneFileSettings(rowsRef.current.map((r) => r.id));
        history.current = [];
        setUndoCount(0);
        future.current = [];
        setRedoCount(0);
        extractionAbort.current?.abort();
        updateRows(() => []);
        setActiveId("");
        setAuto(false);
      }
    },
  };
}
