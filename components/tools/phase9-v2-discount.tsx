"use client";
import { useState } from "react";
import { buyGet, csvCell } from "@/lib/tools/phase9-v2-advanced";
import { downloadText } from "@/lib/tools/download";
export default function DiscountAdvanced() {
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [buy, setBuy] = useState("");
  const [free, setFree] = useState("");
  const [tax, setTax] = useState("0");
  const [currency, setCurrency] = useState("INR");
  const [notice, setNotice] = useState("");
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  let result: ReturnType<typeof buyGet> | undefined,
    error = "";
  try {
    if ([price, qty, buy, free, tax].every((v) => v !== ""))
      result = buyGet(
        Number(price),
        Number(qty),
        Number(buy),
        Number(free),
        Number(tax),
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid inputs.";
  }
  const summary = result
    ? `${result.paidUnits} paid, ${result.freeUnits} free · subtotal ${money(result.subtotal)} · saved ${money(result.saved)} · tax ${money(result.tax)} · total ${money(result.total)}`
    : "";
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="buy-get-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">ADVANCED WORKFLOW</span>
          <h2 id="buy-get-heading">Buy X, get Y free</h2>
          <p>Estimate savings for equal-priced items, then add tax.</p>
        </div>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Unit price
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label>
            Total items taken
            <input
              type="number"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
          <label>
            Buy (paid items per group)
            <input
              type="number"
              step="1"
              value={buy}
              onChange={(e) => setBuy(e.target.value)}
            />
          </label>
          <label>
            Get (free items per group)
            <input
              type="number"
              step="1"
              value={free}
              onChange={(e) => setFree(e.target.value)}
            />
          </label>
          <label>
            Tax after discount (%)
            <input
              type="number"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </label>
          <label>
            Offer currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPrice("");
              setQty("");
              setBuy("");
              setFree("");
              setTax("0");
              setCurrency("INR");
              setNotice("");
            }}
          >
            Reset offer
          </button>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>Buy X, get Y breakdown</h3>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : !result ? (
            <p>Enter all offer details to calculate.</p>
          ) : (
            <>
              <strong>Total: {money(result.total)}</strong>
              <p>{summary}</p>
              <p>
                One group has {buy} paid and {free} free items. Any incomplete
                group pays for the first {buy} items; remaining eligible items
                are free. Tax applies to the discounted subtotal.
              </p>
              <div
                className="advanced-chart-track"
                role="img"
                aria-label={`Saved ${money(result.saved)} from original ${money(result.original)}`}
              >
                <span
                  style={{
                    width: `${result.original ? (result.saved / result.original) * 100 : 0}%`,
                  }}
                />
              </div>
              <p>Bar shows savings as a share of original price.</p>
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
                  Copy offer summary
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() =>
                    downloadText(
                      [
                        [
                          "Currency",
                          "Original",
                          "Paid units",
                          "Free units",
                          "Savings",
                          "Subtotal",
                          "Tax",
                          "Total",
                        ],
                        [
                          currency,
                          result.original,
                          result.paidUnits,
                          result.freeUnits,
                          result.saved,
                          result.subtotal,
                          result.tax,
                          result.total,
                        ],
                      ]
                        .map((r) => r.map(csvCell).join(","))
                        .join("\r\n"),
                      "discount-offer.csv",
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download offer CSV
                </button>
              </div>
            </>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
    </section>
  );
}
