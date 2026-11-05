"use client";
/**
 * HISTORY — what this tab has generated recently, kept in browser storage.
 * "Designs only" mode drops every field value, and a Wi-Fi password is never
 * stored in either mode. Rows offer a real re-render, not a snapshot.
 */
import { useState } from "react";
import {
  Check,
  Clock,
  Copy,
  Pencil,
  Repeat2,
  ShieldCheck,
  Trash,
  X,
} from "lucide-react";
import { buildPayload } from "@/lib/tools/qr/payload";
import { QrSection, QrToggle } from "./shared";
import { formatWhen, type QrHistoryEntry } from "@/lib/tools/qr/storage";
import { contentTypeDef } from "@/lib/tools/qr/payload";
import { QrThumb } from "./thumb";
import type { QrStudio } from "./use-qr-studio";

/** The stored content when history keeps it, so the thumb is the real code. */
function payloadOf(entry: QrHistoryEntry) {
  if (entry.mode !== "full") return undefined;
  try {
    return buildPayload(entry.typeId, entry.values);
  } catch {
    return undefined;
  }
}

export default function HistoryPanel({ studio }: { studio: QrStudio }) {
  const {
    history,
    historyMode,
    restoreHistory,
    removeOne,
    renameHistory,
    duplicateHistory,
    clearAllHistory,
    toggleHistoryMode,
  } = studio;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const startRename = (entry: QrHistoryEntry) => {
    setEditingId(entry.id);
    setEditLabel(entry.label || contentTypeDef(entry.typeId).label);
  };
  const commitRename = () => {
    if (editingId) renameHistory(editingId, editLabel);
    setEditingId(null);
    setEditLabel("");
  };

  return (
    <QrSection
      id="qr-history"
      title="History"
      hint="Recent codes from this browser only. Nothing is uploaded, and nothing is written to disk."
      icon={<Clock size={17} />}
      action={
        history.length ? (
          <button
            type="button"
            className="qr-link-button"
            onClick={clearAllHistory}
          >
            <Trash size={13} /> Clear all
          </button>
        ) : (
          <span className="qr-badge">0 entries</span>
        )
      }
    >
      <QrToggle
        id="qr-history-mode"
        label="Store designs only — never my content"
        hint={
          historyMode === "designs"
            ? "On: colours and geometry are kept so a layout can be reapplied, and no field text is stored at all."
            : "Off: field values are kept so “Edit and regenerate” works. A Wi-Fi password is never stored either way."
        }
        checked={historyMode === "designs"}
        onChange={(on) => toggleHistoryMode(on ? "designs" : "full")}
      />

      {history.length ? (
        <ul className="qr-history-list">
          {history.map((entry) => (
            <li key={entry.id}>
              <QrThumb
                design={entry.design}
                payload={payloadOf(entry)}
                size={64}
                label={`Preview of ${entry.label || contentTypeDef(entry.typeId).label}`}
              />
              <div className="qr-history-text">
                {editingId === entry.id ? (
                  <div className="qr-rename-row">
                    <input
                      type="text"
                      className="qr-input"
                      value={editLabel}
                      maxLength={80}
                      aria-label={`Rename the ${entry.label || "history"} entry`}
                      onChange={(event) => setEditLabel(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      type="button"
                      className="qr-icon-button"
                      onClick={commitRename}
                      aria-label="Save the new label"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className="qr-icon-button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel renaming"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <strong>
                    {entry.label || contentTypeDef(entry.typeId).label}
                  </strong>
                )}
                <small>
                  {contentTypeDef(entry.typeId).label} · v{entry.version} ·{" "}
                  {entry.bytes.toLocaleString()} bytes ·{" "}
                  {formatWhen(entry.createdAt)}
                  {entry.mode === "designs" ? " · design only" : ""}
                </small>
              </div>
              <div className="qr-history-actions">
                <button
                  type="button"
                  className="secondary qr-mini-button"
                  onClick={() => restoreHistory(entry)}
                >
                  <Repeat2 size={13} />{" "}
                  {entry.mode === "designs"
                    ? "Apply design"
                    : "Edit and regenerate"}
                </button>
                <button
                  type="button"
                  className="qr-icon-button"
                  onClick={() => startRename(entry)}
                  aria-label={`Rename the ${entry.label || "history"} entry`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="qr-icon-button"
                  onClick={() => duplicateHistory(entry.id)}
                  aria-label={`Duplicate the ${entry.label || "history"} entry`}
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  className="qr-icon-button"
                  onClick={() => removeOne(entry.id)}
                  aria-label={`Forget the ${entry.label || "last"} entry`}
                >
                  <Trash size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="qr-tab-empty">
          <ShieldCheck size={22} aria-hidden="true" />
          <strong>Nothing recorded yet</strong>
          <p>
            Every code that passes its decode check is listed here, so a link
            you made ten minutes ago can be reopened, restyled or forgotten — on
            this device only.
          </p>
        </div>
      )}
    </QrSection>
  );
}
