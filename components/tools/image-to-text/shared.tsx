"use client";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Ban,
} from "lucide-react";
import type { JobStatus } from "@/lib/tools/image-to-text/runner";

/** Status pill shared by the gallery and the progress list. */
export function StatusPill({ status }: { status: JobStatus }) {
  const map: Record<
    JobStatus,
    { label: string; icon: ReactNode; className: string }
  > = {
    queued: {
      label: "Queued",
      icon: <CircleDashed size={12} aria-hidden="true" />,
      className: "queued",
    },
    preparing: {
      label: "Preparing",
      icon: <Loader2 size={12} aria-hidden="true" className="spin" />,
      className: "working",
    },
    recognising: {
      label: "Reading",
      icon: <Loader2 size={12} aria-hidden="true" className="spin" />,
      className: "working",
    },
    done: {
      label: "Done",
      icon: <CheckCircle2 size={12} aria-hidden="true" />,
      className: "done",
    },
    error: {
      label: "Failed",
      icon: <AlertTriangle size={12} aria-hidden="true" />,
      className: "error",
    },
    cancelled: {
      label: "Cancelled",
      icon: <Ban size={12} aria-hidden="true" />,
      className: "cancelled",
    },
  };
  const entry = map[status];
  return (
    <span className={`i2t-status ${entry.className}`}>
      {entry.icon}
      {entry.label}
    </span>
  );
}

/** Thin progress bar used per file and for the batch. */
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className="i2t-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Confidence chip: green at/above the threshold, amber near it, red below. */
export function ConfidenceChip({
  value,
  threshold,
}: {
  value: number;
  threshold: number;
}) {
  const level =
    value >= threshold ? "good" : value >= threshold * 0.7 ? "fair" : "poor";
  return (
    <span
      className={`i2t-confidence ${level}`}
      title={`Mean confidence ${value}%`}
    >
      {Math.round(value)}%
    </span>
  );
}

export function formatSeconds(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}
