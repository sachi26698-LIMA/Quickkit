"use client";
/**
 * History tab: search, filter, sort, select, export, delete.
 *
 * The list is deliberately dumb about privacy — the *storage* layer already
 * decides what was withheld, so a redacted record renders as a redacted record
 * here and cannot leak through an export, a copy button or a share sheet.
 */
import { useMemo, useState } from "react";
import { Clock, Copy, Download, Search, ShieldOff, Trash2 } from "lucide-react";
import { downloadText } from "@/lib/tools/download";
import {
  contentTypeLabel,
  type ContentTypeId,
} from "@/lib/tools/qr-scanner/content";
import {
  exportFilename,
  rowsFromHistory,
  toCsv,
  toJson,
  toTxt,
} from "@/lib/tools/qr-scanner/export";
import { historyTypes } from "@/lib/tools/qr-scanner/history";
import type { ScannerApi } from "./use-scanner";

const DATE_RANGES: { id: string; label: string; days: number | null }[] = [
  { id: "all", label: "Any time", days: null },
  { id: "today", label: "Last 24 hours", days: 1 },
  { id: "week", label: "Last 7 days", days: 7 },
  { id: "month", label: "Last 30 days", days: 30 },
];

export default function HistoryTab({ api }: { api: ScannerApi }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [range, setRange] = useState("all");
  /**
   * The cut-off is fixed when the user picks a range, not recomputed on every
   * render: reading the clock during render makes the component impure, and a
   * moving cut-off would make rows vanish while they are being read.
   */
  const [rangeFrom, setRangeFrom] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const records = useMemo(() => {
    const from = rangeFrom;
    return api.history
      .filter((record) => {
        if (typeof from === "number" && record.at < from) return false;
        if (api.historyType !== "all" && record.type !== api.historyType)
          return false;
        const query = api.historyQuery.trim().toLocaleLowerCase();
        if (!query) return true;
        return [
          record.summary,
          record.payload ?? "",
          record.typeLabel,
          record.sourceName,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      })
      .sort((a, b) =>
        api.historySort === "newest" ? b.at - a.at : a.at - b.at,
      );
  }, [
    api.history,
    api.historyQuery,
    api.historyType,
    api.historySort,
    rangeFrom,
  ]);

  const types = historyTypes(api.history);
  const exportOptions = {
    exportTimestamps: api.settings.exportTimestamps,
    exportTypes: api.settings.exportTypes,
    exportFilenames: api.settings.exportFilenames,
    exportStatus: api.settings.exportStatus,
  };
  const selectedRecords = records.filter((record) => selected.has(record.id));
  const rows = rowsFromHistory(
    selectedRecords.length ? selectedRecords : records,
  );

  if (!api.settings.history)
    return (
      <div className="scanner-history-off">
        <ShieldOff size={30} aria-hidden="true" />
        <h3>History is turned off</h3>
        <p>
          Scans are not being recorded, and anything previously stored was
          deleted when you turned it off. You can re-enable it in Advanced
          settings — the switch also explains exactly what is stored.
        </p>
        <button
          type="button"
          className="secondary"
          onClick={() => api.updateSettings({ history: true })}
        >
          Turn history on
        </button>
      </div>
    );

  return (
    <div className="scanner-history">
      <div className="scanner-history-toolbar">
        <label className="scanner-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search history…"
            value={api.historyQuery}
            onChange={(event) => api.setHistoryQuery(event.target.value)}
            aria-label="Search scan history"
          />
        </label>
        <label>
          Type
          <select
            value={api.historyType}
            onChange={(event) =>
              api.setHistoryType(event.target.value as "all" | ContentTypeId)
            }
          >
            <option value="all">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {contentTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <select
            value={range}
            onChange={(event) => {
              const next = event.target.value;
              setRange(next);
              const days = DATE_RANGES.find((entry) => entry.id === next)?.days;
              setRangeFrom(
                days ? Date.now() - days * 24 * 60 * 60 * 1000 : null,
              );
            }}
          >
            {DATE_RANGES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={api.historySort}
            onChange={(event) =>
              api.setHistorySort(event.target.value as "newest" | "oldest")
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {!records.length ? (
        <div className="scanner-history-empty">
          <Clock size={28} aria-hidden="true" />
          <p>
            {api.history.length
              ? "No records match these filters."
              : "Nothing here yet. Scans you make appear in this list, stored only in this browser."}
          </p>
        </div>
      ) : (
        <>
          <div className="scanner-history-bar">
            <span>
              {records.length} record{records.length === 1 ? "" : "s"}
              {selected.size ? ` · ${selected.size} selected` : ""}
            </span>
            <div className="scanner-history-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setSelected(
                    selected.size === records.length
                      ? new Set()
                      : new Set(records.map((record) => record.id)),
                  )
                }
              >
                {selected.size === records.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const payloads = (
                    selectedRecords.length ? selectedRecords : records
                  )
                    .map((record) => record.payload ?? record.summary)
                    .join("\n");
                  void navigator.clipboard.writeText(payloads).then(
                    () =>
                      api.setFlash({
                        kind: "success",
                        text: `Copied ${selectedRecords.length || records.length} record(s) to the clipboard.`,
                      }),
                    () =>
                      api.setFlash({
                        kind: "error",
                        text: "The clipboard is blocked in this browser.",
                      }),
                  );
                }}
              >
                <Copy size={15} /> Copy selected
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  downloadText(
                    toCsv(rows, exportOptions),
                    exportFilename("history", "csv"),
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
                    exportFilename("history", "json"),
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
                    exportFilename("history", "txt"),
                  )
                }
              >
                <Download size={15} /> TXT
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    api.deleteHistoryRecords([...selected]);
                    setSelected(new Set());
                  }}
                >
                  <Trash2 size={15} /> Delete selected
                </button>
              )}
            </div>
          </div>

          <ul className="scanner-history-list">
            {records.map((record) => (
              <li key={record.id} className="scanner-history-item">
                <label className="scanner-select">
                  <input
                    type="checkbox"
                    checked={selected.has(record.id)}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(record.id)) next.delete(record.id);
                        else next.add(record.id);
                        return next;
                      })
                    }
                    aria-label={`Select record ${record.summary}`}
                  />
                </label>
                <div className="scanner-history-body">
                  <div className="scanner-history-line">
                    <span className={`scanner-type small`}>
                      {record.typeLabel}
                    </span>
                    <span className="scanner-history-time">
                      {new Date(record.at).toLocaleString()}
                    </span>
                    {record.status === "failed" && (
                      <span className="scanner-detect none">no code</span>
                    )}
                  </div>
                  <p className={record.redacted ? "redacted" : ""}>
                    {record.summary}
                  </p>
                  {record.payload && record.payload !== record.summary && (
                    <code className="scanner-history-payload">
                      {record.payload}
                    </code>
                  )}
                  {record.sourceName && <small>From {record.sourceName}</small>}
                </div>
                <div className="scanner-history-item-actions">
                  {record.payload && (
                    <button
                      type="button"
                      className="scanner-icon-button"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(record.payload!)
                          .then(
                            () =>
                              api.setFlash({
                                kind: "success",
                                text: "Copied to the clipboard.",
                              }),
                            () =>
                              api.setFlash({
                                kind: "error",
                                text: "The clipboard is blocked in this browser.",
                              }),
                          )
                      }
                      aria-label="Copy this record"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="scanner-icon-button"
                    onClick={() => {
                      api.deleteHistoryRecords([record.id]);
                      setSelected((current) => {
                        const next = new Set(current);
                        next.delete(record.id);
                        return next;
                      });
                    }}
                    aria-label="Delete this record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="scanner-history-danger">
        {confirmClear ? (
          <>
            <p>
              Delete all {api.history.length} records? This cannot be undone —
              the history is only stored in this browser, so there is no copy
              anywhere else.
            </p>
            <div>
              <button
                type="button"
                className="primary danger"
                onClick={() => {
                  api.wipeHistory();
                  setSelected(new Set());
                  setConfirmClear(false);
                }}
              >
                Delete everything
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmClear(false)}
              >
                Keep history
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="scanner-link-button danger"
            onClick={() => setConfirmClear(true)}
            disabled={!api.history.length}
          >
            <Trash2 size={14} /> Clear all history
          </button>
        )}
      </div>
    </div>
  );
}
