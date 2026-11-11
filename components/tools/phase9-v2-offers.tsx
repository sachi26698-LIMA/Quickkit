"use client";
import { useState } from "react";
import {
  compareDiscountOffers,
  discountRate,
} from "@/lib/tools/phase9-v2-scenarios";
import { downloadText } from "@/lib/tools/download";
import { csvCell } from "@/lib/tools/phase9-v2-advanced";
const fmt = (n: number, c: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(n);
export default function OfferComparison() {
  const [price, setPrice] = useState("");
  const [tax, setTax] = useState("0");
  const [rates, setRates] = useState("");
  const [inclusive, setInclusive] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [final, setFinal] = useState("");
  const [notice, setNotice] = useState("");
  let result: ReturnType<typeof compareDiscountOffers> | undefined,
    error = "",
    reverseError = "",
    reverse: number | undefined;
  try {
    if (price !== "" && tax !== "" && rates !== "") {
      const parts = rates.split(",");
      if (
        parts.some(
          (s) =>
            !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s.trim()),
        )
      )
        throw new Error(
          "Enter comma-separated decimal discount rates without empty entries.",
        );
      result = compareDiscountOffers(
        Number(price),
        Number(tax),
        inclusive,
        parts.map(Number),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid input.";
  }
  try {
    if (price !== "" && final !== "")
      reverse = discountRate(Number(price), Number(final));
  } catch (e) {
    reverseError = e instanceof Error ? e.message : "Invalid final price.";
  }
  const summary =
    result
      ?.map(
        (r) =>
          `${r.rate}%: ${fmt(r.total, currency)} (saved ${fmt(r.saved, currency)})`,
      )
      .join("\n") ?? "";
  const max = result ? Math.max(...result.map((r) => r.total), 1) : 1;
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="offer-comparison-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">COMPARE OFFERS</span>
          <h2 id="offer-comparison-heading">Compare discount offers</h2>
          <p>See which offer costs less, including tax.</p>
        </div>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Original price
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label>
            Discount rates (%) — comma separated
            <input
              type="text"
              value={rates}
              onChange={(e) => setRates(e.target.value)}
              placeholder="e.g. 10, 20"
            />
          </label>
          <label>
            Tax rate (%)
            <input
              type="number"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </label>
          <label>
            Price basis
            <select
              value={inclusive ? "inclusive" : "exclusive"}
              onChange={(e) => setInclusive(e.target.value === "inclusive")}
            >
              <option value="exclusive">Price excludes tax</option>
              <option value="inclusive">Price includes tax</option>
            </select>
          </label>
          <label>
            Comparison currency
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
          <details>
            <summary>Find discount percentage</summary>
            <label>
              Final price on same tax basis
              <input
                type="number"
                value={final}
                onChange={(e) => setFinal(e.target.value)}
              />
            </label>
            <p>
              Rate = (original − final) ÷ original × 100. Compare prices on the
              same tax basis.
            </p>
          </details>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPrice("");
              setTax("0");
              setRates("");
              setInclusive(false);
              setCurrency("INR");
              setFinal("");
              setNotice("");
            }}
          >
            Reset comparison
          </button>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>Comparison breakdown</h3>
          {reverseError && <p className="calculator-error">{reverseError}</p>}
          {reverse !== undefined && (
            <p>
              Discount percentage:{" "}
              {new Intl.NumberFormat("en-IN", {
                maximumFractionDigits: 4,
              }).format(reverse)}
              %
            </p>
          )}
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : (
            <>
              {!result ? (
                <p>Enter an original price and at least two discount rates.</p>
              ) : (
                <>
                  <p>
                    Price is{" "}
                    {inclusive
                      ? "tax-inclusive; tax is extracted after discount"
                      : "tax-exclusive; tax is added after discount"}
                    . Savings include the corresponding tax difference.
                  </p>
                  <ul>
                    {result.map((r, i) => (
                      <li key={i}>
                        <strong>
                          {r.rate}%: {fmt(r.total, currency)}
                        </strong>{" "}
                        · taxable {fmt(r.taxable, currency)} · tax{" "}
                        {fmt(r.tax, currency)} · saved {fmt(r.saved, currency)}
                        <div
                          className="advanced-chart-track"
                          role="img"
                          aria-label={`Total ${fmt(r.total, currency)}`}
                        >
                          <span
                            style={{ width: `${(r.total / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p>
                    Shorter bars indicate a lower final price. Amounts are
                    estimates; calculations round only for display.
                  </p>
                  <div className="calculator-actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(summary);
                          setNotice("Comparison copied.");
                        } catch {
                          setNotice("Copy failed; select the result manually.");
                        }
                      }}
                    >
                      Copy comparison
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() =>
                        downloadText(
                          [
                            ["Rate %", "Taxable", "Tax", "Final", "Saved"],
                            ...result!.map((r) => [
                              r.rate,
                              r.taxable,
                              r.tax,
                              r.total,
                              r.saved,
                            ]),
                          ]
                            .map((row) => row.map(csvCell).join(","))
                            .join("\r\n"),
                          "discount-comparison.csv",
                          "text/csv;charset=utf-8",
                        )
                      }
                    >
                      Download comparison CSV
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
    </section>
  );
}
