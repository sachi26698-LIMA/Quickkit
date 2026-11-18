"use client";

import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

/**
 * Shared progress / status display for the local processing tools.
 *
 * Naming note, because it matters for honesty: QUICKKIT never uploads a file.
 * Every PDF, image and barcode is read by a worker on the visitor's own device.
 * So there is no upload socket to report bytes over, and this component is used
 * for the work the tool actually does — inspecting, compressing, merging,
 * encoding. The words it renders say "Processing", never "Uploading".
 *
 * What it will and will not show:
 *  - `determinate` (with a percentage): only when the caller has a real
 *    item-count fraction from its worker. `percent` is clamped and must be a
 *    finite number; if a caller has no measurement it must pass `indeterminate`
 *    instead.
 *  - `indeterminate`: a moving bar with no number, for stages with no
 *    countable total. No percentage is invented to fill the space.
 *
 * Every state is announced: `aria-live="polite"` for progress and success,
 * `role="alert"` for failure, and the bar carries `aria-valuenow` only when a
 * real value exists.
 *
 * The previous crop of tools each hand-rolled this markup; this keeps the
 * wording, the ARIA and the reduced-motion behaviour identical everywhere.
 */
export type UploadProgressState =
  | { status: "idle" }
  | {
      status: "working";
      label: string;
      /** Real 0-100 progress. Omit for a stage with no countable total. */
      percent?: number;
      detail?: string;
      onCancel?: () => void;
    }
  | { status: "success"; label: string; detail?: string }
  | {
      status: "error";
      label: string;
      detail?: string;
      onRetry?: () => void;
    }
  | { status: "cancelled"; label?: string };

export default function UploadProgress({
  state,
  className = "",
}: {
  state: UploadProgressState;
  className?: string;
}) {
  if (state.status === "idle") return null;

  if (state.status === "cancelled") {
    return (
      <p
        className={`upload-progress upload-progress-cancelled ${className}`.trim()}
      >
        <X size={16} aria-hidden="true" />
        <span>{state.label ?? "Cancelled."}</span>
      </p>
    );
  }

  if (state.status === "success") {
    return (
      <div
        className={`upload-progress upload-progress-success ${className}`.trim()}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={17} aria-hidden="true" />
        <span>
          <strong>{state.label}</strong>
          {state.detail ? <small>{state.detail}</small> : null}
        </span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={`upload-progress upload-progress-error ${className}`.trim()}
        role="alert"
      >
        <AlertCircle size={17} aria-hidden="true" />
        <span>
          <strong>{state.label}</strong>
          {state.detail ? <small>{state.detail}</small> : null}
        </span>
        {state.onRetry ? (
          <button type="button" onClick={state.onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  const determinate =
    typeof state.percent === "number" && Number.isFinite(state.percent);
  const percent = determinate
    ? Math.max(0, Math.min(100, Math.round(state.percent as number)))
    : undefined;

  return (
    <div
      className={`upload-progress upload-progress-working ${className}`.trim()}
      aria-live="polite"
    >
      <Loader2
        size={17}
        aria-hidden="true"
        className="upload-progress-spinner"
      />
      <span className="upload-progress-copy">
        <strong>{state.label}</strong>
        {state.detail ? <small>{state.detail}</small> : null}
      </span>
      <span
        className="upload-progress-track"
        role="progressbar"
        aria-label={state.label}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-valuenow={percent}
      >
        <span
          className={
            determinate
              ? "upload-progress-fill"
              : "upload-progress-fill is-indeterminate"
          }
          style={determinate ? { width: `${percent}%` } : undefined}
        />
      </span>
      {determinate ? (
        <span className="upload-progress-percent">{percent}%</span>
      ) : null}
      {state.onCancel ? (
        <button type="button" onClick={state.onCancel}>
          Cancel
        </button>
      ) : null}
    </div>
  );
}
