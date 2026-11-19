"use client";

/**
 * The shared file picker for the tool workspaces.
 *
 * ## Why this is one component
 *
 * Four workspaces need to read a document and eleven more will, and each of
 * them would otherwise grow its own file input: a different accept list, a
 * different size limit, a different way of reporting "that is not a PDF", and
 * a different amount of progress feedback. The rules live in
 * `lib/tools/launch/file-policy.ts`; this component is the one place they are
 * enforced and explained.
 *
 * ## What it does
 *
 * - Accepts a file by drag-and-drop or through the picker button.
 * - Validates the size and the declared type against the policy, then checks
 *   the leading bytes so a renamed file is rejected rather than parsed.
 * - Shows the file name, size and format, and lets the user remove it or
 *   replace it.
 * - Reports every failure in a sentence the user can act on, and moves focus
 *   to the message so a screen-reader user is told what happened.
 * - Reads the file in the browser. Nothing is uploaded, and the component
 *   never sends the bytes anywhere.
 */

import { useCallback, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { formatBytes } from "@/lib/tools/download";
import {
  acceptAttribute,
  checkFile,
  policyFormats,
  safeFileName,
  verifyContent,
  type FilePolicy,
} from "@/lib/tools/launch/file-policy";

export type FileDropProps = {
  /** What this tool accepts. */
  policy: FilePolicy;
  /** The accepted file, if one has been chosen. */
  value: File | null;
  /** Called with the accepted file, or `null` when it is removed. */
  onChange: (file: File | null) => void;
  /** Label shown on the drop area. */
  label?: string;
  /** Hint under the label. */
  hint?: string;
  /** Disable the picker, e.g. while a run is in progress. */
  disabled?: boolean;
  /** Called when the user asks to extract the text of the chosen file. */
  onExtractText?: (file: File) => void;
  /** True while text extraction is running. */
  extracting?: boolean;
};

export default function FileDrop({
  policy,
  value,
  onChange,
  label,
  hint,
  disabled = false,
  onExtractText,
  extracting = false,
}: FileDropProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const formats = policyFormats(policy);
  const formatLabel =
    label ?? `Drop a ${policy.label} file here, or choose one`;

  const accept = async (candidate: File | undefined) => {
    if (!candidate) return;
    setBusy(true);
    setError("");
    try {
      const checked = checkFile(candidate, policy);
      if (!checked.ok) {
        setError(checked.message);
        setAnnouncement(checked.message);
        return;
      }
      const verified = await verifyContent(candidate, checked.format);
      if (!verified.ok) {
        setError(verified.message);
        setAnnouncement(verified.message);
        return;
      }
      onChange(candidate);
      setAnnouncement(`${candidate.name} selected.`);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (disabled) return;
      void accept(event.dataTransfer.files?.[0]);
    },
    // `accept` closes over `policy` and `onChange`; both are stable props in
    // practice and re-creating the handler on every render would only churn
    // the DOM listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, policy, onChange],
  );

  const clear = () => {
    onChange(null);
    setError("");
    setAnnouncement("File removed.");
    if (inputRef.current) inputRef.current.value = "";
  };

  const replace = () => inputRef.current?.click();

  return (
    <div className="qw-upload">
      <div
        className="qw-dropzone"
        data-dragging={dragging ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload size={20} aria-hidden className="qw-dropzone-icon" />
        <p className="qw-dropzone-label">{formatLabel}</p>
        <p className="qw-dropzone-hint">
          {hint ??
            `${formats.map((format) => format.label).join(", ")} · up to ${formatBytes(policy.maxBytes)}`}
        </p>
        <button
          type="button"
          className="secondary"
          onClick={replace}
          disabled={disabled || busy}
        >
          {value ? (
            <>
              <RefreshCw size={15} aria-hidden /> Replace file
            </>
          ) : (
            <>
              <Upload size={15} aria-hidden /> Choose file
            </>
          )}
        </button>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="qw-visually-hidden"
          accept={acceptAttribute(policy)}
          multiple={policy.multiple ?? false}
          disabled={disabled}
          onChange={(event) => {
            void accept(event.target.files?.[0]);
          }}
        />
      </div>

      {value ? (
        <div className="qw-filecard">
          <FileText size={18} aria-hidden />
          <div className="qw-filecard-meta">
            <span className="qw-filecard-name">{safeFileName(value.name)}</span>
            <span className="qw-filecard-size">
              {formatBytes(value.size)}
              {value.type ? ` · ${value.type}` : ""}
            </span>
          </div>
          <div className="qw-filecard-actions">
            {onExtractText ? (
              <button
                type="button"
                className="secondary"
                onClick={() => onExtractText(value)}
                disabled={disabled || extracting}
              >
                {extracting ? "Reading…" : "Read text"}
              </button>
            ) : null}
            <button
              type="button"
              className="secondary"
              onClick={clear}
              disabled={disabled}
            >
              <Trash2 size={15} aria-hidden /> Remove
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="qw-error" role="alert">
          <AlertTriangle size={13} aria-hidden /> {error}
        </p>
      ) : null}

      <span className="qw-visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

/**
 * A file picker for a tool that has already accepted the file, used where the
 * user must confirm the file is what they meant before processing starts.
 */
export function FileSummary({
  name,
  size,
  onClear,
}: {
  name: string;
  size: number;
  onClear?: () => void;
}) {
  return (
    <div className="qw-filecard">
      <CheckCircle2 size={18} aria-hidden />
      <div className="qw-filecard-meta">
        <span className="qw-filecard-name">{safeFileName(name)}</span>
        <span className="qw-filecard-size">{formatBytes(size)}</span>
      </div>
      {onClear ? (
        <button type="button" className="secondary" onClick={onClear}>
          <Trash2 size={15} aria-hidden /> Remove
        </button>
      ) : null}
    </div>
  );
}
