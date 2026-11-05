"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useRef, type RefObject } from "react";
import {
  AlertCircle,
  CheckSquare,
  FileText,
  ImagePlus,
  RotateCw,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { formatBytes } from "@/lib/tools/download";
import type { SourceRecord } from "@/lib/tools/image-to-text/runner";
import { StatusPill } from "./shared";

export interface UploadPanelProps {
  sources: SourceRecord[];
  issues: string[];
  dragging: boolean;
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | File[]) => void;
  onDragState: (dragging: boolean) => void;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvert: () => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onRotate: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onCrop: (id: string) => void;
}

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/avif,image/gif,application/pdf";

export default function UploadPanel(props: UploadPanelProps) {
  const {
    sources,
    issues,
    dragging,
    busy,
    inputRef,
    onFiles,
    onDragState,
    onSelect,
    onSelectAll,
    onDeselectAll,
    onInvert,
    onRemove,
    onRetry,
    onRotate,
    onMove,
    onCrop,
  } = props;
  const dropRef = useRef<HTMLLabelElement>(null);
  const selectedCount = sources.filter((source) => source.selected).length;

  return (
    <section className="i2t-upload" aria-labelledby="i2t-upload-title">
      <label
        ref={dropRef}
        id="i2t-upload-title"
        className={`i2t-drop${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          onDragState(true);
        }}
        onDragLeave={() => onDragState(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDragState(false);
          if (event.dataTransfer.files?.length)
            onFiles(event.dataTransfer.files);
        }}
      >
        <span className="i2t-drop-icon" aria-hidden="true">
          <Upload size={24} strokeWidth={1.8} />
        </span>
        <span className="i2t-drop-copy">
          <strong>Drop images or scanned PDFs to read them</strong>
          <span>
            JPG, PNG, WEBP, BMP, TIFF, AVIF or PDF · up to 40 files · 25 MB each
            · read entirely on this device
          </span>
        </span>
        <span className="i2t-drop-action">Choose files</span>
        <input
          ref={inputRef}
          className="i2t-file-input"
          type="file"
          accept={ACCEPT}
          multiple
          aria-label="Add images or scanned PDFs"
          onChange={(event) => {
            if (event.target.files?.length) onFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {issues.length > 0 && (
        <div className="i2t-alert" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div className="i2t-gallery" aria-label="Image gallery">
          <div className="i2t-gallery-head">
            <div>
              <h3>
                {sources.length} file{sources.length === 1 ? "" : "s"} in this
                batch
              </h3>
              <p>
                {selectedCount} selected · drag to reorder with the arrows ·
                rotate or crop before reading
              </p>
            </div>
            <div
              className="i2t-gallery-actions"
              role="group"
              aria-label="Selection"
            >
              <button
                type="button"
                className="i2t-mini"
                onClick={onSelectAll}
                disabled={busy || selectedCount === sources.length}
              >
                <CheckSquare size={13} aria-hidden="true" /> Select all
              </button>
              <button
                type="button"
                className="i2t-mini"
                onClick={onDeselectAll}
                disabled={busy || selectedCount === 0}
              >
                <Square size={13} aria-hidden="true" /> Deselect
              </button>
              <button
                type="button"
                className="i2t-mini"
                onClick={onInvert}
                disabled={busy}
              >
                Invert
              </button>
            </div>
          </div>

          <ul className="i2t-thumbs">
            {sources.map((source, index) => (
              <li
                key={source.id}
                className={`i2t-thumb${source.selected ? " is-selected" : ""}${
                  source.status === "error" ? " has-error" : ""
                }`}
              >
                <div className="i2t-thumb-media">
                  {source.kind === "pdf" ? (
                    <span className="i2t-thumb-pdf" aria-hidden="true">
                      <FileText size={26} />
                      <small>PDF</small>
                    </span>
                  ) : (
                    <img
                      src={source.previewUrl}
                      alt={`Preview of ${source.name}`}
                      loading="lazy"
                      style={{
                        transform: source.rotation
                          ? `rotate(${source.rotation}deg)`
                          : undefined,
                      }}
                    />
                  )}
                  {source.crop && (
                    <span className="i2t-thumb-crop" title="Cropped before OCR">
                      crop
                    </span>
                  )}
                  {source.rotation !== 0 && (
                    <span className="i2t-thumb-rotation">
                      {source.rotation}°
                    </span>
                  )}
                </div>
                <div className="i2t-thumb-body">
                  <label className="i2t-thumb-check">
                    <input
                      type="checkbox"
                      checked={source.selected}
                      onChange={(event) =>
                        onSelect(source.id, event.target.checked)
                      }
                      aria-label={`Include ${source.name} in OCR`}
                    />
                    <span className="i2t-thumb-name" title={source.name}>
                      {source.name}
                    </span>
                  </label>
                  <span className="i2t-thumb-meta">
                    {formatBytes(source.size)}
                    {source.pageCount && source.pageCount > 1
                      ? ` · ${source.pageCount} pages`
                      : ""}
                  </span>
                  <StatusPill status={source.status} />
                  {source.error && (
                    <p className="i2t-thumb-error" role="alert">
                      {source.error}
                    </p>
                  )}
                  {source.notes.length > 0 && source.status === "done" && (
                    <p className="i2t-thumb-note">{source.notes.join(" · ")}</p>
                  )}
                  <div className="i2t-thumb-tools">
                    <button
                      type="button"
                      className="i2t-icon"
                      onClick={() => onMove(source.id, -1)}
                      disabled={busy || index === 0}
                      aria-label={`Move ${source.name} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="i2t-icon"
                      onClick={() => onMove(source.id, 1)}
                      disabled={busy || index === sources.length - 1}
                      aria-label={`Move ${source.name} down`}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="i2t-icon"
                      onClick={() => onRotate(source.id)}
                      disabled={busy}
                      aria-label={`Rotate ${source.name} 90 degrees`}
                      title="Rotate 90°"
                    >
                      <RotateCw size={13} aria-hidden="true" />
                    </button>
                    {source.kind === "image" && (
                      <button
                        type="button"
                        className="i2t-icon"
                        onClick={() => onCrop(source.id)}
                        disabled={busy}
                        aria-label={`Crop ${source.name}`}
                        title={source.crop ? "Adjust crop" : "Crop"}
                      >
                        <ImagePlus size={13} aria-hidden="true" />
                      </button>
                    )}
                    {source.status === "error" && (
                      <button
                        type="button"
                        className="i2t-icon retry"
                        onClick={() => onRetry(source.id)}
                        disabled={busy}
                        aria-label={`Retry ${source.name}`}
                        title="Retry"
                      >
                        ↻
                      </button>
                    )}
                    <button
                      type="button"
                      className="i2t-icon danger"
                      onClick={() => onRemove(source.id)}
                      disabled={busy}
                      aria-label={`Remove ${source.name}`}
                      title="Remove"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length === 0 && (
        <p className="i2t-empty-hint">
          <X size={13} aria-hidden="true" /> Nothing is uploaded. Files stay in
          this tab and disappear when you close or refresh it.
        </p>
      )}
    </section>
  );
}
