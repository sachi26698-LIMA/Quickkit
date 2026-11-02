"use client";
import { useState, type ReactNode } from "react";
export function Workspace({
  children,
  result,
  detail,
  error,
  reset,
}: {
  children: ReactNode;
  result: string;
  detail?: ReactNode;
  error?: string;
  reset: () => void;
}) {
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<string[]>([]);
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
                setHistory((h) => [result, ...h].slice(0, 20));
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
            <button className="secondary" onClick={() => setHistory([])}>
              Clear history
            </button>
          </div>
          <ol>
            {history.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
          <p>History is cleared when you leave or refresh.</p>
        </div>
      )}
    </section>
  );
}
