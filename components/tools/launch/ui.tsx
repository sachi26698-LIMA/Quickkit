"use client";

/**
 * Shared form and result primitives for the launched tool workspaces.
 *
 * Every new tool is a form over pure engine functions, so the same dozen
 * patterns recur: a labelled field with an inline error, a numeric input that
 * tolerates a comma-grouped rupee amount, a result panel that can be copied or
 * downloaded, and a status line that is announced to screen readers.
 *
 * These live in one file so the workspaces stay readable — a workspace that
 * spends 200 lines on input chrome has no room for the logic that matters.
 */

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Info,
  RotateCcw,
} from "lucide-react";
import { downloadText } from "@/lib/tools/download";
import { csvDocument } from "@/lib/tools/csv";

// ─────────────────────────────────────────────────────────────────────────────
// Fields
// ─────────────────────────────────────────────────────────────────────────────

export type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  suffix?: string;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  /** Renders a textarea instead of an input. */
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
};

export function Field({
  label,
  value,
  onChange,
  hint,
  error,
  suffix,
  placeholder,
  inputMode = "text",
  multiline = false,
  rows = 6,
  disabled = false,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="qw-field" data-invalid={error ? "true" : undefined}>
      <label className="qw-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="qw-input qw-textarea"
          value={value}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div className="qw-input-row">
          <input
            id={id}
            className="qw-input"
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            inputMode={inputMode}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(event.target.value)}
          />
          {suffix ? <span className="qw-suffix">{suffix}</span> : null}
        </div>
      )}
      {hint ? (
        <p className="qw-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="qw-error" id={errorId}>
          <AlertTriangle size={13} aria-hidden /> {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="qw-field" data-invalid={error ? "true" : undefined}>
      <label className="qw-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="qw-input"
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p className="qw-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? <p className="qw-error">{error}</p> : null}
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="qw-field qw-toggle">
      <label htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p className="qw-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read a money amount from a field that may contain commas, a currency symbol,
 * spaces or a trailing "lakh". Returns null for empty input so a workspace can
 * distinguish "not filled in" from "zero".
 */
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const lakh = /l(akh|ac)?\b|l$/.test(trimmed) ? 100_000 : 1;
  const crore = /cr(ore)?\b/.test(trimmed) ? 10_000_000 : 1;
  const cleaned = trimmed
    .replace(/[₹,\s]/g, "")
    .replace(/(lakh|lac|l|cr|crore)$/, "");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;
  return value * lakh * crore;
}

export function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed.replace(/[,\s]/g, ""));
  return Number.isFinite(value) ? value : null;
}

/** Format a number for a text field, without trailing decimals when whole. */
export function formatInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export function FieldGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className="qw-grid" data-columns={columns}>
      {children}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "error" | "success";
  children: ReactNode;
}) {
  const Icon =
    tone === "warning" || tone === "error"
      ? AlertTriangle
      : tone === "success"
        ? Check
        : Info;
  return (
    <div
      className="qw-notice"
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={15} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** A labelled figure. `emphasis` makes it the primary answer of the workspace. */
export function Stat({
  label,
  value,
  detail,
  emphasis = false,
}: {
  label: string;
  value: string;
  detail?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="qw-stat" data-emphasis={emphasis ? "true" : undefined}>
      <span className="qw-stat-label">{label}</span>
      <strong className="qw-stat-value">{value}</strong>
      {detail ? <span className="qw-stat-detail">{detail}</span> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="qw-stat-row">{children}</div>;
}

/** A simple two-column table with an optional total row. */
export function BreakdownTable({
  head,
  rows,
  total,
  caption,
}: {
  head: [string, string];
  rows: { label: string; value: string; tone?: "deduction" | "neutral" }[];
  total?: { label: string; value: string };
  caption?: string;
}) {
  return (
    <div className="qw-table-wrap">
      <table className="qw-table">
        {caption ? (
          <caption className="qw-table-caption">{caption}</caption>
        ) : null}
        <thead>
          <tr>
            <th scope="col">{head[0]}</th>
            <th scope="col" className="qw-num">
              {head[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} data-tone={row.tone}>
              <td>{row.label}</td>
              <td className="qw-num">{row.value}</td>
            </tr>
          ))}
        </tbody>
        {total ? (
          <tfoot>
            <tr>
              <td>{total.label}</td>
              <td className="qw-num">{total.value}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

/** Collapsible detail block, native `<details>` so it works without JS. */
export function Disclosure({
  summary,
  children,
  open = false,
}: {
  summary: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="qw-details" open={open}>
      <summary>{summary}</summary>
      <div className="qw-details-body">{children}</div>
    </details>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Output actions
// ─────────────────────────────────────────────────────────────────────────────

export function OutputActions({
  text,
  filename,
  csvRows,
  onReset,
  resetLabel = "Reset",
}: {
  text: string;
  filename: string;
  /** When provided, adds a "Download CSV" action using these rows. */
  csvRows?: (string | number | boolean)[][];
  onReset?: () => void;
  resetLabel?: string;
}) {
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const [downloaded, setDownloaded] = useState(false);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  };

  const download = (kind: "txt" | "csv") => {
    if (kind === "csv" && csvRows) {
      downloadText(
        csvDocument(csvRows),
        `${filename}.csv`,
        "text/csv;charset=utf-8",
      );
    } else {
      downloadText(text, `${filename}.txt`, "text/plain;charset=utf-8");
    }
    setDownloaded(true);
  };

  return (
    <div className="qw-actions">
      <button
        type="button"
        className="secondary"
        onClick={copy}
        disabled={!text}
      >
        {copied === "ok" ? (
          <Check size={15} aria-hidden />
        ) : (
          <Copy size={15} aria-hidden />
        )}{" "}
        Copy
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => download("txt")}
        disabled={!text}
      >
        <Download size={15} aria-hidden /> Download
      </button>
      {csvRows ? (
        <button
          type="button"
          className="secondary"
          onClick={() => download("csv")}
        >
          <Download size={15} aria-hidden /> CSV
        </button>
      ) : null}
      {onReset ? (
        <button type="button" className="secondary" onClick={onReset}>
          <RotateCcw size={15} aria-hidden /> {resetLabel}
        </button>
      ) : null}
      <span className="qw-action-status" role="status" aria-live="polite">
        {copied === "ok"
          ? "Copied to clipboard."
          : copied === "fail"
            ? "Copy unavailable — select the text and copy manually."
            : downloaded
              ? "Downloaded."
              : ""}
      </span>
    </div>
  );
}

/**
 * Result panel with a heading, an optional summary and the output actions.
 * Renders nothing until `show` is true, so a workspace can keep the panel out of
 * the accessibility tree until there is a real answer in it.
 */
export function ResultPanel({
  title,
  show,
  children,
  text,
  filename,
  csvRows,
  onReset,
}: {
  title: string;
  show: boolean;
  children: ReactNode;
  text: string;
  filename: string;
  csvRows?: (string | number | boolean)[][];
  onReset?: () => void;
}) {
  if (!show) return null;
  return (
    <section className="qw-result" aria-label={title}>
      <div className="qw-result-head">
        <h3>{title}</h3>
      </div>
      {children}
      <OutputActions
        text={text}
        filename={filename}
        csvRows={csvRows}
        onReset={onReset}
      />
    </section>
  );
}

/**
 * Empty state for a workspace that has not been run yet.
 *
 * Deliberately explicit: it names what the tool needs rather than showing a
 * zero-filled result that could be mistaken for an answer.
 */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="qw-empty">
      <Info size={16} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** A local-state hook that also tracks whether the user has touched the form. */
export function useTrackedForm<T extends Record<string, string | boolean>>(
  initial: T,
) {
  const [state, setState] = useState<T>(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof T>(key: K, value: T[K]) => {
    setState((current) => ({ ...current, [key]: value }));
    setTouched(true);
  };
  const reset = () => {
    setState(initial);
    setTouched(false);
  };
  return { state, set, reset, touched };
}

/**
 * Memoise an engine call over a form snapshot.
 *
 * Every workspace computes its result synchronously from pure functions, so the
 * only performance concern is not re-running a bisecting solve on every render.
 * `useMemo` over the state object is enough, and it keeps the workspaces free of
 * effect-driven recomputation that can flash stale results.
 */
export function useComputed<T>(compute: () => T, deps: readonly unknown[]): T {
  // Recomputing is the only cost here and the workspaces pass the whole form
  // snapshot as the dependency list, so lint's literal-array requirement is
  // waived at this one call site rather than at every workspace.
  // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps -- caller owns the snapshot
  return useMemo(compute, deps as unknown[]);
}
