"use client";
import { useState, type ReactNode } from "react";
import { downloadText } from "@/lib/tools/download";
import { csvCell } from "@/lib/tools/phase9-v2-advanced";
export function Workspace({
  children,
  result,
  detail,
  error,
  reset,
  snapshot,
  restore,
  resultExport,
}: {
  children: ReactNode;
  result: string;
  detail?: ReactNode;
  error?: string;
  reset: () => void;
  snapshot?: string;
  restore?: (snapshot: string) => void;
  resultExport?: { filename: string; rows: string[][] };
}) {
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<
    { result: string; snapshot?: string }[]
  >([]);
  return (
    <section
      className="workspace calculator-workspace"
      aria-label="Calculator workspace"
    >
      <div className="workspace-heading">
        <div>
          <h2>Calculate</h2>
          <p>Results update as you enter values.</p>
        </div>
        <span className="local-badge">Local processing</span>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          {children}
          <div className="calculator-actions">
            <button className="secondary" onClick={reset}>
              Reset
            </button>
            <button
              className="secondary"
              disabled={!result || !!error}
              onClick={() => {
                setHistory((h) => [{ result, snapshot }, ...h].slice(0, 20));
                setNotice("Added to history.");
              }}
            >
              Save to history
            </button>
          </div>
        </div>
        <div className="calculator-result" aria-live="polite">
          <span className="eyebrow">YOUR RESULT</span>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : result ? (
            <>
              <output>{result}</output>
              <div>{detail}</div>
              {resultExport && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      resultExport.rows
                        .map((row) => row.map(csvCell).join(","))
                        .join("\r\n"),
                      resultExport.filename,
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download result CSV
                </button>
              )}
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result);
                    setNotice("Copied to clipboard.");
                  } catch {
                    setNotice("Could not copy; select the result manually.");
                  }
                }}
              >
                Copy result
              </button>
            </>
          ) : (
            <p>Enter the required values to see your result.</p>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
      {history.length > 0 && (
        <div className="calculator-history">
          <div className="calculator-actions">
            <h3>Session history</h3>
            <button
              className="secondary"
              onClick={() =>
                downloadText(
                  ["Result", ...history.map((h) => csvCell(h.result))].join(
                    "\r\n",
                  ),
                  "calculator-history.csv",
                  "text/csv;charset=utf-8",
                )
              }
            >
              Export history CSV
            </button>
            <button className="secondary" onClick={() => setHistory([])}>
              Clear history
            </button>
          </div>
          <ol>
            {history.map((h, i) => (
              <li key={i}>
                {h.result}{" "}
                {restore && h.snapshot !== undefined && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      restore(h.snapshot!);
                      setNotice("Calculation restored.");
                    }}
                  >
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ol>
          <p>History is cleared when you leave or refresh.</p>
        </div>
      )}
    </section>
  );
}
