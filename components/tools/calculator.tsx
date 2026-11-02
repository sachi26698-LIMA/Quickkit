"use client";
import { useState } from "react";
import { bmi, discount, gst, percentage } from "@/lib/tools/calculators";

const format = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(n);
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
export default function Calculator({ kind }: { kind: string }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [extra, setExtra] = useState("");
  const [mode, setMode] = useState("of");
  const [toggle, setToggle] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  let result = "";
  let detail = "";
  let error = "";
  try {
    if (a !== "" && b !== "") {
      const x = Number(a),
        y = Number(b);
      if (kind === "percentage-calculator") {
        const r = percentage(mode, x, y);
        result =
          format(r.value) + (["is", "difference"].includes(mode) ? "%" : "");
        detail = r.formula;
      }
      if (kind === "bmi-calculator") {
        const r = bmi(x, y, toggle);
        result = `${format(r.value)} · ${r.category}`;
        detail = `Healthy weight range: ${format(r.low)}–${format(r.high)} ${toggle ? "lb" : "kg"}. BMI = kg ÷ m².`;
      }
      if (kind === "discount-calculator") {
        const rates = b.split(",").map((v) => {
          if (!v.trim()) throw new Error("Enter each discount rate.");
          return Number(v);
        });
        const r = discount(x, rates, extra === "" ? 0 : Number(extra), toggle);
        result = money(r.total);
        detail = `Original: ${money(r.original)} · After discounts: ${money(r.discounted)} · Saved: ${money(r.saved)} · Tax: ${money(r.taxAmount)}. Discounts are applied sequentially, then tax.`;
      }
      if (kind === "gst-calculator") {
        const r = gst(x, y, toggle);
        result = money(r.total);
        detail = `Taxable: ${money(r.taxable)} · Total GST: ${money(r.tax)} · Intra-state: CGST ${money(r.half)} + SGST ${money(r.half)} · Inter-state: IGST ${money(r.tax)}.`;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid input.";
  }
  function reset() {
    setA("");
    setB("");
    setExtra("");
    setMode("of");
    setToggle(false);
    setNotice("");
  }
  const isPercentage = kind === "percentage-calculator",
    isBmi = kind === "bmi-calculator",
    isDiscount = kind === "discount-calculator";
  return (
    <section
      className="workspace calculator-workspace"
      aria-label="Calculator workspace"
    >
      <div className="workspace-heading">
        <div>
          <h2>Calculate</h2>
          <p>Enter your values below. Results update as you type.</p>
        </div>
        <span className="local-badge">Local processing</span>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          {isPercentage && (
            <label>
              Calculation
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="of">Percentage of a number</option>
                <option value="is">One value as a percentage of another</option>
                <option value="increase">Increase by a percentage</option>
                <option value="decrease">Decrease by a percentage</option>
                <option value="difference">Percentage difference</option>
                <option value="reverse">Reverse a percentage change</option>
              </select>
            </label>
          )}
          {!isPercentage && (
            <label className="calculator-check">
              <input
                type="checkbox"
                checked={toggle}
                onChange={(e) => setToggle(e.target.checked)}
              />{" "}
              {isBmi
                ? "Use imperial units (inches and pounds)"
                : isDiscount
                  ? "Reverse: price is after discounts, before tax"
                  : "Amount includes GST (remove GST)"}
            </label>
          )}
          <label>
            {isBmi
              ? `Height (${toggle ? "in" : "cm"})`
              : isDiscount
                ? "Price (₹)"
                : kind === "gst-calculator"
                  ? "Amount (₹)"
                  : mode === "of"
                    ? "Percentage"
                    : mode === "reverse"
                      ? "Final value"
                      : "First value"}
            <input
              type="number"
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="Enter a value"
            />
          </label>
          <label>
            {isBmi
              ? `Weight (${toggle ? "lb" : "kg"})`
              : isDiscount
                ? "Discounts (%) — comma separated"
                : kind === "gst-calculator"
                  ? "GST rate (%)"
                  : mode === "of"
                    ? "Number"
                    : ["increase", "decrease", "reverse"].includes(mode)
                      ? "Change (%)"
                      : "Second value"}
            <input
              type={isDiscount ? "text" : "number"}
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder={isDiscount ? "e.g. 10, 5" : "Enter a value"}
            />
          </label>
          {isDiscount && (
            <label>
              Tax after discount (%)
              <input
                type="number"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="0"
              />
            </label>
          )}
          <div className="calculator-actions">
            <button type="button" className="secondary" onClick={reset}>
              Reset
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!result}
              onClick={() => {
                setHistory((h) => [result + " — " + detail, ...h].slice(0, 20));
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
              <p>{detail}</p>
              <button
                type="button"
                className="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${result} — ${detail}`,
                    );
                    setNotice("Copied to clipboard.");
                  } catch {
                    setNotice(
                      "Could not copy. Please select the result manually.",
                    );
                  }
                }}
              >
                Copy result
              </button>
            </>
          ) : (
            <p>Enter both values to see your result.</p>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
      {isBmi && (
        <p className="calculator-disclaimer">
          BMI is a screening measure, not a diagnosis. Adult ranges are not
          suitable for everyone. Speak with a healthcare professional about your
          health.
        </p>
      )}
      {history.length > 0 && (
        <div className="calculator-history">
          <div className="calculator-actions">
            <h3>Session history</h3>
            <button
              type="button"
              className="secondary"
              onClick={() => setHistory([])}
            >
              Clear history
            </button>
          </div>
          <ol>
            {history.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ol>
          <p>History is kept only until you leave or refresh this page.</p>
        </div>
      )}
    </section>
  );
}
