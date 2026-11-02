"use client";
import { Download, Eye, FileText, History, Trash2, X } from "lucide-react";
import { downloadBlob, formatBytes } from "@/lib/tools/download";
import type {
  HistoryItem,
  HistoryRetention,
} from "@/lib/tools/pdf-to-word/history";

interface HistoryPanelProps {
  items: HistoryItem[];
  retention: HistoryRetention;
  onRetentionChange: (retention: HistoryRetention) => void;
  onPreview: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
}

export default function HistoryPanel({
  items,
  retention,
  onRetentionChange,
  onPreview,
  onRemove,
  onClearAll,
}: HistoryPanelProps) {
  return (
    <section className="p2w-history" aria-label="Recent conversions">
      <div className="p2w-history-head">
        <h3>
          <History size={16} aria-hidden="true" /> Recent conversions
        </h3>
        <span className="p2w-history-controls">
          <label className="p2w-history-retention">
            Keep on this device for
            <select
              value={retention}
              onChange={(e) =>
                onRetentionChange(e.target.value as HistoryRetention)
              }
            >
              <option value="session">This session only</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
            </select>
          </label>
          {items.length > 0 && (
            <button
              type="button"
              className="toolbar-button"
              onClick={onClearAll}
            >
              <Trash2 size={14} aria-hidden="true" /> Clear history
            </button>
          )}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="p2w-history-empty">
          {retention === "session"
            ? "History is off. Converted files are discarded when you leave this page. Choose 24 hours or 7 days to keep converted DOCX files in this browser so you can download them again later — they never leave your device, and your original PDFs are never stored."
            : "No stored conversions yet. Files you convert will appear here and stay available for re-download until the retention period ends."}
        </p>
      ) : (
        <ul className="p2w-history-list">
          {items.map((item) => (
            <li key={item.id} className="p2w-history-row">
              <FileText size={18} aria-hidden="true" className="p2w-row-icon" />
              <span className="p2w-history-main">
                <strong title={item.resultName}>{item.resultName}</strong>
                <small>
                  from {item.sourceName} ·{" "}
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {formatBytes(item.size)} ·{" "}
                  {item.mode === "layout"
                    ? "Original Layout"
                    : "Clean Editable"}{" "}
                  · {item.summary}
                </small>
              </span>
              <span className="p2w-row-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Preview ${item.resultName}`}
                  onClick={() => onPreview(item)}
                >
                  <Eye size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Download ${item.resultName} again`}
                  onClick={() => downloadBlob(item.blob, item.resultName)}
                >
                  <Download size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${item.resultName} from history`}
                  onClick={() => onRemove(item)}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="p2w-history-note">
        Stored only in this browser on this device. Original PDFs are never
        stored or uploaded.
      </p>
    </section>
  );
}
