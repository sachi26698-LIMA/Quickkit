"use client";
import { useState } from "react";
import {
  sequentialChanges,
  compareValues,
  originalFromDiscount,
  csvCell,
} from "@/lib/tools/phase9-v2-advanced";
import { downloadText, downloadBlob } from "@/lib/tools/download";
import {
  formatPercentageNumber as format,
  parsePercentageNumber,
} from "@/lib/tools/percentage-format";
function numbers(text: string) {
  const parts = text.split(",");
  if (parts.some((s) => !s.trim()))
    throw new Error("Enter comma-separated numbers without empty entries.");
  return parts.map((s) => parsePercentageNumber(s));
}
type Snapshot = {
  mode: string;
  first: string;
  values: string;
  summary: string;
};
export default function PercentageAdvanced() {
  const [mode, setMode] = useState("sequence");
  const [first, setFirst] = useState("");
  const [values, setValues] = useState("");
  const [saved, setSaved] = useState<Snapshot[]>([]);
  const [notice, setNotice] = useState("");
  let title = "",
    lines: string[] = [],
    error = "",
    chart: { label: string; value: number }[] = [];
  try {
    if (first !== "" && values !== "") {
      if (mode === "sequence") {
        const steps = sequentialChanges(
          parsePercentageNumber(first),
          numbers(values),
        );
        title = `Final value: ${format(steps[steps.length - 1].after)}`;
        lines = steps.map(
          (s, i) =>
            `Step ${i + 1}: ${format(s.before)} × (1 + ${format(s.rate)} / 100) = ${format(s.after)}`,
        );
        chart = steps.map((s, i) => ({
          label: `Step ${i + 1}`,
          value: s.after,
        }));
      } else if (mode === "compare") {
        const series = [parsePercentageNumber(first), ...numbers(values)];
        const changes = compareValues(series);
        title = `${series.length} values compared`;
        lines = changes.map(
          (s) =>
            `${format(s.previous)} → ${format(s.value)}: ${s.change === null ? "undefined (starting value is zero)" : `${format(s.change)}% change`}`,
        );
        chart = series.map((value, i) => ({ label: `Value ${i + 1}`, value }));
      } else {
        const original = originalFromDiscount(
          parsePercentageNumber(first),
          parsePercentageNumber(values),
        );
        title = `Original value: ${format(original)}`;
        lines = [
          `${format(Number(first))} ÷ (1 − ${format(Number(values))} / 100) = ${format(original)}`,
        ];
        chart = [
          { label: "Discounted", value: Number(first) },
          { label: "Original", value: original },
        ];
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid input.";
  }
  const summary = [title, ...lines].join("\n");
  const max = Math.max(0, ...chart.map((c) => Math.abs(c.value))) || 1;
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="percent-advanced-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">ADVANCED WORKFLOW</span>
          <h2 id="percent-advanced-heading">Compare &amp; build changes</h2>
          <p>Follow each step or compare a sequence of values.</p>
        </div>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Advanced mode
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setFirst("");
                setValues("");
              }}
            >
              <option value="sequence">Sequential percentage changes</option>
              <option value="compare">Compare values</option>
              <option value="discount">Original before discount</option>
            </select>
          </label>
          <label>
            {mode === "discount" ? "Discounted value" : "Starting value"}
            <input
              type="number"
              step="any"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
          </label>
          <label>
            {mode === "sequence"
              ? "Changes (%) — comma separated"
              : mode === "compare"
                ? "Further values — comma separated"
                : "Discount (%)"}
            <input
              type={mode === "discount" ? "number" : "text"}
              value={values}
              onChange={(e) => setValues(e.target.value)}
              placeholder={
                mode === "sequence"
                  ? "e.g. 10, -20"
                  : mode === "compare"
                    ? "e.g. 120, 90"
                    : "e.g. 20"
              }
            />
          </label>
          <p>
            {mode === "sequence"
              ? "Each signed change applies to the previous result; use a negative value for a decrease."
              : mode === "compare"
                ? "Change = (new − old) ÷ |old| × 100. A zero starting value has no defined percentage change."
                : "Recover the original before a discount. A 100% discount has no unique original value."}
          </p>
          <div className="calculator-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setFirst("");
                setValues("");
                setNotice("");
              }}
            >
              Clear inputs
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!title || !!error}
              onClick={() =>
                setSaved((s) =>
                  [{ mode, first, values, summary }, ...s].slice(0, 20),
                )
              }
            >
              Save calculation
            </button>
          </div>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>Calculation breakdown</h3>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : !title ? (
            <p>Enter values to see the steps.</p>
          ) : (
            <>
              <strong>{title}</strong>
              <ol>
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <div
                aria-label={`Value comparison: ${chart.map((c) => `${c.label}: ${format(c.value)}`).join(", ")}`}
                role="img"
              >
                {chart.map((c, i) => (
                  <div key={i} className="advanced-chart-row">
                    <span>
                      {c.label}: {format(c.value)}
                    </span>
                    <div className="advanced-chart-track">
                      <span
                        style={{ width: `${(Math.abs(c.value) / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p>
                Bars show absolute magnitude; signs are retained in the labels.
                Results are rounded to four decimal places, or seven significant
                digits in scientific notation for very small or large values.
              </p>
              <div className="calculator-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(summary);
                      setNotice("Summary copied.");
                    } catch {
                      setNotice("Copy failed; select the result manually.");
                    }
                  }}
                >
                  Copy summary
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={async () => {
                    try {
                      const { calculatorPdf } =
                        await import("@/lib/tools/calculator-pdf");
                      const ascii = (v: string) =>
                        v
                          .replaceAll("×", "x")
                          .replaceAll("→", "->")
                          .replaceAll("÷", "/")
                          .replaceAll("−", "-");
                      const bytes = await calculatorPdf(
                        "Percentage calculation",
                        [
                          ascii(title),
                          ...lines.map(ascii),
                          "Rounded for display. Values are calculated using floating-point arithmetic.",
                        ],
                      );
                      downloadBlob(
                        new Blob([new Uint8Array(bytes)], {
                          type: "application/pdf",
                        }),
                        "percentage-calculation.pdf",
                      );
                      setNotice("PDF downloaded.");
                    } catch {
                      setNotice("Could not create the PDF. Please try again.");
                    }
                  }}
                >
                  Download percentage PDF
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() =>
                    downloadText(
                      [["Calculation"], [title], ...lines.map((l) => [l])]
                        .map((row) => row.map(csvCell).join(","))
                        .join("\r\n"),
                      "percentage-calculation.csv",
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download CSV
                </button>
              </div>
            </>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
      {saved.length > 0 && (
        <div className="calculator-history">
          <h3>Saved calculations</h3>
          <p>Stored only for this page session.</p>
          <ul>
            {saved.map((entry, i) => (
              <li key={i}>
                {entry.summary.split("\n")[0]}{" "}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setMode(entry.mode);
                    setFirst(entry.first);
                    setValues(entry.values);
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="secondary"
            onClick={() => setSaved([])}
          >
            Clear saved calculations
          </button>
        </div>
      )}
    </section>
  );
}
