"use client";
/**
 * Batch scanner.
 *
 * Built on the shared bounded-concurrency runner the PDF tools already use, so
 * "process 40 screenshots" means at most N images in flight rather than 40 —
 * the difference between finishing and running out of memory on a phone.
 *
 * Failures are shown per file with their real reason, and retry re-runs only the
 * failed files. Nothing is silently dropped: a file that never started is
 * reported as cancelled, and a file that failed stays in the list with its error.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Download,
  FileImage,
  RefreshCw,
  Rows3,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { runBounded, suggestConcurrency } from "@/lib/tools/batch/concurrency";
import { downloadBlob, downloadText, formatBytes } from "@/lib/tools/download";
import {
  exportFilename,
  toCsv,
  toJson,
  toTxt,
  type ExportRow,
} from "@/lib/tools/qr-scanner/export";
import {
  fileToRaster,
  ImageLoadError,
} from "@/lib/tools/qr-scanner/image-source";
import { recognize } from "@/lib/tools/qr-scanner/content";
import type { DecodedSymbol } from "@/lib/tools/qr-scanner/types";
import type { ScannerApi } from "./use-scanner";

type BatchEntry = {
  id: string;
  file: File;
  status: "pending" | "running" | "done" | "failed" | "cancelled";
  symbols: DecodedSymbol[];
  error: string | null;
  durationMs: number;
};

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function BatchPanel({ api }: { api: ScannerApi }) {
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [concurrency, setConcurrency] = useState(3);
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next = Array.from(files).map<BatchEntry>((file) => ({
      id: newId(),
      file,
      status: "pending",
      symbols: [],
      error: null,
      durationMs: 0,
    }));
    setEntries((current) => [...current, ...next].slice(0, 120));
  }, []);

  const counts = useMemo(() => {
    const total = entries.length;
    const done = entries.filter((entry) => entry.status === "done").length;
    const failed = entries.filter((entry) => entry.status === "failed").length;
    const cancelled = entries.filter(
      (entry) => entry.status === "cancelled",
    ).length;
    const pending = entries.filter(
      (entry) => entry.status === "pending" || entry.status === "running",
    ).length;
    return { total, done, failed, cancelled, pending };
  }, [entries]);

  const runQueue = useCallback(
    async (queue: BatchEntry[]) => {
      if (!queue.length) return;
      const controller = new AbortController();
      controllerRef.current = controller;
      setRunning(true);
      const ids = new Set(queue.map((entry) => entry.id));
      setEntries((current) =>
        current.map((entry) =>
          ids.has(entry.id)
            ? { ...entry, status: "pending", error: null, symbols: [] }
            : entry,
        ),
      );

      const limit = Math.max(1, Math.min(6, concurrency));
      await runBounded({
        items: queue,
        concurrency: limit,
        signal: controller.signal,
        maxRetries: 1,
        worker: async (entry) => {
          setEntries((current) =>
            current.map((item) =>
              item.id === entry.id ? { ...item, status: "running" } : item,
            ),
          );
          const started = performance.now();
          try {
            const raster = await fileToRaster(entry.file);
            const decoded = await api.decodeOnly(raster, { profile: "image" });
            const durationMs = Math.round(performance.now() - started);
            setEntries((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? {
                      ...item,
                      status: "done",
                      symbols: decoded.symbols,
                      durationMs,
                    }
                  : item,
              ),
            );
            // One history entry per file, subject to the same privacy rules.
            api.commitDecoded(raster, decoded, {
              sourceName: entry.file.name,
              sourceBytes: entry.file.size,
            });
          } catch (caught) {
            const message =
              caught instanceof ImageLoadError
                ? caught.message
                : caught instanceof Error
                  ? caught.message
                  : "This file could not be scanned.";
            setEntries((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? {
                      ...item,
                      status: "failed",
                      error: message,
                      durationMs: Math.round(performance.now() - started),
                    }
                  : item,
              ),
            );
            throw caught;
          }
        },
      });

      setRunning(false);
      controllerRef.current = null;
    },
    [api, concurrency],
  );

  const start = () =>
    void runQueue(entries.filter((entry) => entry.status === "pending"));

  const cancel = () => {
    controllerRef.current?.abort();
    setEntries((current) =>
      current.map((entry) =>
        entry.status === "pending" || entry.status === "running"
          ? {
              ...entry,
              status: "cancelled",
              error: "Cancelled before finishing.",
            }
          : entry,
      ),
    );
    setRunning(false);
  };

  const retryFailed = () =>
    void runQueue(entries.filter((entry) => entry.status === "failed"));

  const rows: ExportRow[] = entries
    .filter((entry) => entry.status === "done" && entry.symbols.length)
    .flatMap((entry) =>
      entry.symbols.map((symbol) => {
        const recognition = recognize(symbol.data);
        return {
          payload: symbol.data,
          type: recognition.type,
          typeLabel: recognition.label,
          sourceName: entry.file.name,
          scannedAt: Date.now(),
          status: "decoded" as const,
          count: entry.symbols.length,
          summary: recognition.summary,
        };
      }),
    );

  const exportOptions = {
    exportTimestamps: api.settings.exportTimestamps,
    exportTypes: api.settings.exportTypes,
    exportFilenames: api.settings.exportFilenames,
    exportStatus: api.settings.exportStatus,
  };

  return (
    <div className="scanner-batch">
      <div
        className="scanner-dropzone compact"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files?.length)
            addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple
          accept="image/*,.heic,.heif,.bmp"
          aria-label="Choose images to scan in a batch"
          onChange={(event) => {
            if (event.target.files?.length) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Rows3 size={30} aria-hidden="true" />
        <p>
          <strong>Drop several images to scan them together</strong>
        </p>
        <small>
          {concurrency} image{concurrency === 1 ? "" : "s"} processed at a time,
          never more, so memory stays flat. Up to 120 files.
        </small>
        <div className="scanner-dropzone-actions">
          <button
            type="button"
            className="primary"
            onClick={() => inputRef.current?.click()}
          >
            <FileImage size={16} /> Add images
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              className="secondary"
              onClick={() => setEntries([])}
              disabled={running}
            >
              <Ban size={16} /> Clear queue
            </button>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <>
          <div className="scanner-batch-bar">
            <div className="scanner-batch-counts">
              <span>
                <strong>{counts.total}</strong> files
              </span>
              <span className="ok">
                <CheckCircle2 size={14} aria-hidden="true" /> {counts.done} done
              </span>
              <span className={counts.failed ? "bad" : ""}>
                <XCircle size={14} aria-hidden="true" /> {counts.failed} failed
              </span>
              <span>{counts.pending} pending</span>
              {counts.cancelled > 0 && (
                <span>{counts.cancelled} cancelled</span>
              )}
            </div>
            <div className="scanner-batch-actions">
              <label className="scanner-inline-toggle">
                At once
                <select
                  value={concurrency}
                  onChange={(event) =>
                    setConcurrency(Number(event.target.value))
                  }
                  disabled={running}
                >
                  {[1, 2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="primary"
                onClick={start}
                disabled={running || counts.pending === 0}
              >
                <Rows3 size={16} /> {running ? "Scanning…" : "Scan all"}
              </button>
              {running && (
                <button type="button" className="secondary" onClick={cancel}>
                  <Ban size={16} /> Cancel
                </button>
              )}
              {counts.failed > 0 && !running && (
                <button
                  type="button"
                  className="secondary"
                  onClick={retryFailed}
                >
                  <RefreshCw size={16} /> Retry failed
                </button>
              )}
            </div>
          </div>

          <progress
            className="scanner-progress"
            value={counts.done + counts.failed + counts.cancelled}
            max={Math.max(1, counts.total)}
            aria-label="Batch progress"
          />

          <ul className="scanner-batch-list">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`scanner-batch-item ${entry.status}`}
              >
                <FileImage size={16} aria-hidden="true" />
                <span className="scanner-batch-name" title={entry.file.name}>
                  {entry.file.name}
                </span>
                <span className="scanner-batch-size">
                  {formatBytes(entry.file.size)}
                </span>
                <span className="scanner-batch-state">
                  {entry.status === "running" && "Scanning…"}
                  {entry.status === "pending" && "Waiting"}
                  {entry.status === "cancelled" && "Cancelled"}
                  {entry.status === "failed" && (
                    <span
                      className="scanner-batch-error"
                      title={entry.error ?? ""}
                    >
                      <TriangleAlert size={13} aria-hidden="true" />
                      {entry.error}
                    </span>
                  )}
                  {entry.status === "done" &&
                    (entry.symbols.length
                      ? `${entry.symbols.length} code${entry.symbols.length === 1 ? "" : "s"} · ${entry.durationMs} ms`
                      : `No code found · ${entry.durationMs} ms`)}
                </span>
              </li>
            ))}
          </ul>

          {rows.length > 0 && (
            <div className="scanner-export">
              <strong>
                {rows.length} decoded result{rows.length === 1 ? "" : "s"} ready
                to export
              </strong>
              <div className="scanner-export-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      toCsv(rows, exportOptions),
                      exportFilename("batch", "csv"),
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  <Download size={15} /> CSV
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      toJson(rows, exportOptions),
                      exportFilename("batch", "json"),
                      "application/json",
                    )
                  }
                >
                  <Download size={15} /> JSON
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      toTxt(rows, exportOptions),
                      exportFilename("batch", "txt"),
                    )
                  }
                >
                  <Download size={15} /> TXT
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    // The results also land in the results panel, so this is a
                    // convenience for copying the whole batch at once.
                    downloadBlob(
                      new Blob([toTxt(rows, exportOptions)], {
                        type: "text/plain;charset=utf-8",
                      }),
                      exportFilename("results", "txt", "batch"),
                    );
                  }}
                >
                  <Download size={15} /> Combined .txt
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <p className="scanner-hint">
        Suggested concurrency for this device:{" "}
        {suggestConcurrency({
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: (navigator as Navigator & { deviceMemory?: number })
            .deviceMemory,
        })}
        . Lower it if the page feels sluggish.
      </p>
    </div>
  );
}
