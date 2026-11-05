import type { QueueStatus } from "./types";

/** One row of the batch report: what happened to one source file. */
export type BatchRow = {
  name: string;
  status: "converted" | "failed" | "cancelled";
  sourceBytes: number;
  outputBytes: number;
  format: string;
  error?: string;
};

/** The summary shown after a batch finishes. */
export type BatchReport = {
  startedAt: string;
  rows: BatchRow[];
  paused?: boolean;
};

export function reportTotals(report: BatchReport) {
  const converted = report.rows.filter((row) => row.status === "converted");
  const failed = report.rows.filter((row) => row.status === "failed");
  const cancelled = report.rows.filter((row) => row.status === "cancelled");
  const input = converted.reduce((sum, row) => sum + row.sourceBytes, 0);
  const output = converted.reduce((sum, row) => sum + row.outputBytes, 0);
  return { converted, failed, cancelled, input, output };
}

let sequence = 0;

/** Unique id for queue items and results within this tab session. */
export const nextId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

export const statusLabel: Record<QueueStatus, string> = {
  inspecting: "Reading…",
  ready: "Ready",
  converting: "Converting…",
  done: "Converted",
  error: "Needs attention",
  cancelled: "Cancelled",
};
