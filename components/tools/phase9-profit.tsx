"use client";
import { useState } from "react";
import { profit } from "@/lib/tools/phase9-profit";
import { downloadText } from "@/lib/tools/download";
export default function Profit() {
  const [cost, setCost] = useState("");
  const [sale, setSale] = useState("");
  const [notice, setNotice] = useState("");
  let r: ReturnType<typeof profit> | undefined,
    error = "";
  try {
    if (cost !== "" && sale !== "") r = profit(Number(cost), Number(sale));
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid values.";
  }
  const f = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(n);
  const summary = r
    ? `Profit: ${f(r.amount)}; margin: ${r.margin === null ? "undefined (zero selling price)" : `${f(r.margin)}%`}; markup: ${f(r.markup)}%.`
    : "";
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="profit-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">SALES ANALYSIS</span>
          <h2 id="profit-heading">Profit, margin &amp; markup</h2>
          <p>Compare your cost with the final selling price.</p>
        </div>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Cost price
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
          <label>
            Selling price before tax
            <input
              type="number"
              value={sale}
              onChange={(e) => setSale(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setCost("");
              setSale("");
              setNotice("");
            }}
          >
            Reset profit analysis
          </button>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>Profit breakdown</h3>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : r ? (
            <>
              <p>{summary}</p>
              <p>
                Profit = selling price − cost. Margin = profit ÷ selling price;
                markup = profit ÷ cost. Negative values indicate a loss.
                Excludes tax, overheads and fees.
              </p>
              <div className="calculator-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(summary);
                      setNotice("Profit analysis copied.");
                    } catch {
                      setNotice("Copy failed; select the result manually.");
                    }
                  }}
                >
                  Copy profit analysis
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      `Cost,Selling price,Profit,Margin %,Markup %\r\n${cost},${sale},${r!.amount},${r!.margin ?? ""},${r!.markup}\r\n`,
                      "profit-analysis.csv",
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download profit CSV
                </button>
              </div>
            </>
          ) : (
            <p>Enter cost and selling price.</p>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
    </section>
  );
}
