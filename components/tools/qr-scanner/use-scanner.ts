"use client";
/**
 * Scanner state.
 *
 * One hook owns every piece of state the workspace needs, so the panels stay
 * presentational and the rules live in one place:
 *
 *  · a scan result is only created from a real decode outcome,
 *  · duplicate suppression is per payload and time-boxed, so a continuous
 *    camera cannot flood the list while a deliberate rescan still works,
 *  · history obeys the storage rules in `history.ts` (secrets withheld unless
 *    the user opts in),
 *  · object URLs for previews are revoked when a result is removed or replaced,
 *    because a batch of forty photos is otherwise a memory leak.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recognize } from "@/lib/tools/qr-scanner/content";
import { evaluateDuplicate } from "@/lib/tools/qr-scanner/duplicate";
import {
  clearHistory,
  filterHistory,
  loadHistory,
  prepareRecord,
  saveHistory,
  type HistoryRecord,
} from "@/lib/tools/qr-scanner/history";
import {
  fileToRaster,
  ImageLoadError,
} from "@/lib/tools/qr-scanner/image-source";
import { scanRaster } from "@/lib/tools/qr-scanner/scan-client";
import {
  defaultSettings,
  decodeProfileFor,
  duplicateWindowMs,
  loadSettings,
  saveSettings,
  type ScannerSettings,
} from "@/lib/tools/qr-scanner/settings";
import type {
  DecodedSymbol,
  ImageAdjustments,
  Raster,
} from "@/lib/tools/qr-scanner/types";

export type ScanItem = {
  id: string;
  sourceName: string;
  sourceBytes: number;
  scannedAt: number;
  symbols: DecodedSymbol[];
  attempts: string[];
  durationMs: number;
  failure: string | null;
  /** Object URL of the scanned image, for the preview and the download button. */
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
};

export type Flash = { kind: "info" | "error" | "success"; text: string } | null;

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function trimAttempts(attempts: string[], limit = 40): string[] {
  if (attempts.length <= limit) return attempts;
  return [
    ...attempts.slice(0, limit),
    `…and ${attempts.length - limit} more passes`,
  ];
}

export function useScanner() {
  const [settings, setSettings] = useState<ScannerSettings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<ScanItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyType, setHistoryType] = useState<"all" | HistoryRecord["type"]>(
    "all",
  );
  const [historySort, setHistorySort] = useState<"newest" | "oldest">("newest");

  const urlsRef = useRef(new Set<string>());
  const duplicateRef = useRef(new Map<string, number>());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state once, on the client only. Deferred by a microtask so
  // the first paint is not blocked and the effect does not cascade renders.
  useEffect(() => {
    const stored = loadSettings(window.localStorage);
    const records = loadHistory(window.localStorage);
    const timer = setTimeout(() => {
      setSettings(stored);
      setHistory(records);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Persist settings whenever they change (after the initial load).
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    saveSettings(window.localStorage, settings);
  }, [ready, settings]);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    // "History off" means nothing is kept: the stored list is removed rather
    // than replaced with an empty array, so a later look at localStorage cannot
    // even tell that this device used the scanner.
    if (!settings.history) {
      clearHistory(window.localStorage);
      return;
    }
    saveHistory(window.localStorage, history);
  }, [ready, history, settings.history]);

  // Revoke every object URL when the tool unmounts.
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(
      () => setFlash(null),
      flash.kind === "error" ? 11000 : 6000,
    );
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [flash]);

  const updateSettings = useCallback((patch: Partial<ScannerSettings>) => {
    setSettings((current) => {
      // "History off" means off: the moment the switch flips, whatever was
      // stored is deleted rather than left behind behind a hidden list.
      if (current.history && patch.history === false) {
        setHistory([]);
        if (typeof window !== "undefined") clearHistory(window.localStorage);
      }
      return { ...current, ...patch };
    });
  }, []);

  /**
   * Register the decoded symbols in history. One record per scan, so a
   * screenshot with three codes is one History entry carrying a count.
   */
  const recordHistory = useCallback(
    (item: ScanItem) => {
      if (!settings.history) return;
      const first = item.symbols[0];
      const recognition = first ? recognize(first.data) : null;
      const entry = prepareRecord({
        type: recognition?.type ?? "unknown",
        payload: first?.data ?? "",
        summary: first
          ? item.symbols.length > 1
            ? `${recognition?.summary ?? ""} (+${item.symbols.length - 1} more)`
            : (recognition?.summary ?? "")
          : (item.failure ?? "No QR code found"),
        sensitive: Boolean(recognition?.sensitive),
        sourceName: item.sourceName,
        status: item.symbols.length ? "decoded" : "failed",
        count: item.symbols.length,
        storeSensitive: settings.storeSensitive,
        at: item.scannedAt,
      });
      setHistory((current) => [entry, ...current].slice(0, 200));
    },
    [settings.history, settings.storeSensitive],
  );

  const announce = useCallback((next: Flash) => setFlash(next), []);

  /** Build a ScanItem from a decode and add it to the result list. */
  const commit = useCallback(
    (input: {
      sourceName: string;
      sourceBytes: number;
      raster: Raster;
      symbols: DecodedSymbol[];
      attempts: string[];
      durationMs: number;
      failure: string | null;
      imageUrl?: string | null;
    }): ScanItem => {
      const item: ScanItem = {
        id: newId(),
        sourceName: input.sourceName,
        sourceBytes: input.sourceBytes,
        scannedAt: Date.now(),
        symbols: input.symbols,
        attempts: trimAttempts(input.attempts),
        durationMs: input.durationMs,
        failure: input.failure,
        imageUrl: input.imageUrl ?? null,
        imageWidth: input.raster.width,
        imageHeight: input.raster.height,
      };
      if (item.imageUrl) urlsRef.current.add(item.imageUrl);
      setResults((current) => [item, ...current].slice(0, 60));
      recordHistory(item);
      return item;
    },
    [recordHistory],
  );

  /**
   * Decode a raster without touching the result list.
   *
   * The camera needs this: it probes frames continuously and only commits one
   * that carries a code the user has not already seen. Decoding twice per frame
   * would double the cost of the most frequent operation in the tool.
   */
  const decodeOnly = useCallback(
    async (
      raster: Raster,
      options: {
        profile?: "image" | "frame" | "precise";
        adjustments?: Partial<ImageAdjustments>;
      } = {},
    ) => {
      const profileSettings = decodeProfileFor(settings);
      const started = performance.now();
      const result = await scanRaster(raster, {
        profile: options.profile ?? profileSettings.profile,
        adjustments: {
          contrast: profileSettings.contrast,
          sharpen: profileSettings.sharpen,
          ...options.adjustments,
        },
      });
      return {
        ...result,
        durationMs: Math.round(performance.now() - started),
      };
    },
    [settings],
  );

  /** Add a finished decode to the results list and to history. */
  const commitDecoded = useCallback(
    (
      raster: Raster,
      decoded: {
        symbols: DecodedSymbol[];
        attempts: string[];
        durationMs: number;
      },
      meta: {
        sourceName: string;
        sourceBytes?: number;
        imageUrl?: string | null;
      },
    ) =>
      commit({
        sourceName: meta.sourceName,
        sourceBytes: meta.sourceBytes ?? 0,
        raster,
        symbols: decoded.symbols,
        attempts: decoded.attempts,
        durationMs: decoded.durationMs,
        failure: decoded.symbols.length
          ? null
          : "No QR code could be decoded in this image.",
        imageUrl: meta.imageUrl ?? null,
      }),
    [commit],
  );

  /** Decode once and commit the outcome. */
  const scanRasterAndCommit = useCallback(
    async (
      raster: Raster,
      meta: {
        sourceName: string;
        sourceBytes?: number;
        imageUrl?: string | null;
        adjustments?: Partial<ImageAdjustments>;
        profile?: "image" | "frame" | "precise";
      },
    ) => {
      const decoded = await decodeOnly(raster, {
        profile: meta.profile,
        adjustments: meta.adjustments,
      });
      return commitDecoded(raster, decoded, meta);
    },
    [commitDecoded, decodeOnly],
  );

  /**
   * Duplicate decision for a camera frame. Returns both the verdict and a
   * message, so the caller never has to guess why a read was ignored.
   */
  const checkDuplicate = useCallback(
    (payload: string) => {
      const listed = results.flatMap((item) =>
        item.symbols.map((symbol) => symbol.data),
      );
      const verdict = evaluateDuplicate({
        payload,
        listed,
        lastSeen: duplicateRef.current,
        now: Date.now(),
        windowMs: duplicateWindowMs(settings.sensitivity),
        enabled: settings.duplicateDetection,
      });
      if (!verdict.suppress) duplicateRef.current.set(verdict.key, Date.now());
      return verdict;
    },
    [results, settings.duplicateDetection, settings.sensitivity],
  );

  /** Convenience wrapper for callers that only need a boolean. */
  const isDuplicate = useCallback(
    (payload: string) => checkDuplicate(payload).suppress,
    [checkDuplicate],
  );

  /** Scan one uploaded file end to end. */
  const scanFile = useCallback(
    async (file: File, options: { preview?: boolean } = {}) => {
      const objectUrl =
        options.preview === false ? null : URL.createObjectURL(file);
      try {
        setBusy(true);
        const raster = await fileToRaster(file);
        const item = await scanRasterAndCommit(raster, {
          sourceName: file.name,
          sourceBytes: file.size,
          imageUrl: objectUrl,
        });
        if (item && objectUrl) urlsRef.current.add(objectUrl);
        return item;
      } catch (error) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        throw error instanceof ImageLoadError
          ? error
          : new Error(
              error instanceof Error
                ? error.message
                : "This image could not be scanned.",
            );
      } finally {
        setBusy(false);
      }
    },
    [scanRasterAndCommit],
  );

  const removeResult = useCallback((id: string) => {
    setResults((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.imageUrl) {
        URL.revokeObjectURL(target.imageUrl);
        urlsRef.current.delete(target.imageUrl);
      }
      return current.filter((item) => item.id !== id);
    });
    setSelected((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const clearResults = useCallback(() => {
    setResults((current) => {
      for (const item of current) {
        if (item.imageUrl) {
          URL.revokeObjectURL(item.imageUrl);
          urlsRef.current.delete(item.imageUrl);
        }
      }
      return [];
    });
    setSelected(new Set());
    duplicateRef.current.clear();
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (value: boolean) =>
      setSelected(value ? new Set(results.map((item) => item.id)) : new Set()),
    [results],
  );

  const deleteHistoryRecords = useCallback((ids: string[]) => {
    const remove = new Set(ids);
    setHistory((current) => current.filter((entry) => !remove.has(entry.id)));
  }, []);

  const wipeHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== "undefined") clearHistory(window.localStorage);
  }, []);

  const visibleHistory = useMemo(
    () =>
      filterHistory(
        history,
        { query: historyQuery, type: historyType },
        historySort,
      ),
    [history, historyQuery, historyType, historySort],
  );

  // Auto-clear timer for the results panel.
  useEffect(() => {
    if (!settings.autoClearSeconds || !results.length) return;
    const timer = setTimeout(() => {
      clearResults();
      setFlash({ kind: "info", text: "Results cleared automatically." });
    }, settings.autoClearSeconds * 1000);
    return () => clearTimeout(timer);
  }, [settings.autoClearSeconds, results.length, clearResults]);

  return {
    ready,
    settings,
    updateSettings,
    results,
    selected,
    toggleSelected,
    selectAll,
    removeResult,
    clearResults,
    history,
    visibleHistory,
    historyQuery,
    setHistoryQuery,
    historyType,
    setHistoryType,
    historySort,
    setHistorySort,
    deleteHistoryRecords,
    wipeHistory,
    flash,
    setFlash,
    announce,
    busy,
    scanFile,
    scanRasterAndCommit,
    decodeOnly,
    commitDecoded,
    isDuplicate,
    checkDuplicate,
  };
}

export type ScannerApi = ReturnType<typeof useScanner>;
