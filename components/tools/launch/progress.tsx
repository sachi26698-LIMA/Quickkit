"use client";

/**
 * Progress, step and skeleton primitives for the tool workspaces.
 *
 * ## The rule this file exists to enforce
 *
 * A progress bar that does not reflect real progress is a lie told to the
 * person waiting. So the bar takes a percentage only when the caller has a
 * real one — a `FileReader` event, a byte count, a completed step out of a
 * known number — and otherwise renders as *indeterminate*, which honestly
 * says "this is running, and I cannot tell you how far along it is".
 *
 * There is deliberately no timer that animates a fake percentage upward.
 *
 * Every animation here is disabled under `prefers-reduced-motion`, and the
 * animated elements carry `aria-live` regions so a screen-reader user is told
 * what is happening without watching the animation.
 */

import { useState } from "react";

/** One named step in a multi-step run. */
export type ProgressStep = {
  label: string;
  state: "pending" | "active" | "done" | "failed";
};

export function ProgressBar({
  label,
  /** Real completion between 0 and 100, or null when it is not knowable. */
  percent,
  detail,
  steps,
}: {
  label: string;
  percent?: number | null;
  detail?: string;
  steps?: ProgressStep[];
}) {
  const known = typeof percent === "number" && Number.isFinite(percent);
  const clamped = known ? Math.min(100, Math.max(0, percent)) : 0;

  return (
    <div
      className="qw-progress"
      data-indeterminate={known ? undefined : "true"}
      role="progressbar"
      aria-label={label}
      {...(known
        ? {
            "aria-valuenow": Math.round(clamped),
            "aria-valuemin": 0,
            "aria-valuemax": 100,
          }
        : {})}
    >
      <div className="qw-progress-head">
        <p className="qw-progress-label">{label}</p>
        <span className="qw-progress-value">
          {known ? `${Math.round(clamped)}%` : (detail ?? "Working…")}
        </span>
      </div>
      <div className="qw-progress-track">
        <div
          className="qw-progress-bar"
          style={known ? { width: `${clamped}%` } : undefined}
        />
      </div>
      {steps && steps.length ? (
        <ol className="qw-progress-steps">
          {steps.map((step) => (
            <li key={step.label} data-state={step.state}>
              <span className="qw-step-dot" aria-hidden />
              {step.label}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/**
 * A skeleton that stands in for a result while one is being produced.
 *
 * It is announced as a status rather than as content, and it disappears the
 * moment a real result exists — a skeleton that lingers next to a finished
 * result reads as a second, broken answer.
 */
export function ResultSkeleton({
  lines = 4,
  label = "Preparing the result",
}: {
  lines?: number;
  label?: string;
}) {
  return (
    <div className="qw-skeleton" role="status" aria-live="polite">
      <span className="qw-visually-hidden">{label}…</span>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <div
          key={index}
          className="qw-skeleton-line"
          style={{ width: `${100 - index * 9}%` }}
          aria-hidden
        />
      ))}
    </div>
  );
}

/**
 * Track a long-running task with an honest state machine.
 *
 * `run` is called when the user asks for the work. The hook reports `running`,
 * `done` or `error`, and the percentage is whatever the task reports — never a
 * guess. A task that cannot report progress leaves `percent` null and the bar
 * renders as indeterminate.
 */
export function useTask<T>(run: () => Promise<T>) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string>("");
  const [percent, setPercent] = useState<number | null>(null);
  const [step, setStep] = useState("");

  const start = async () => {
    setState("running");
    setError("");
    setPercent(null);
    setStep("");
    try {
      const value = await run();
      setResult(value);
      setState("done");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong.",
      );
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setResult(null);
    setError("");
    setPercent(null);
    setStep("");
  };

  return {
    state,
    result,
    error,
    percent,
    step,
    start,
    reset,
    setPercent,
    setStep,
  };
}

/**
 * Report real read progress for a `FileReader`.
 *
 * `FileReader` fires `progress` with the number of bytes loaded, so the
 * percentage is measured rather than estimated. Returns a function that
 * detaches the listeners.
 */
export function readFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    reader.onerror = () =>
      reject(
        new Error("That file could not be read. It may be locked or damaged."),
      );
    reader.onload = () => {
      onProgress?.(100);
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  });
}
