"use client";
import { useState } from "react";
import { variableLoan } from "@/lib/tools/phase9-v2-scenarios";
import { downloadText } from "@/lib/tools/download";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
export default function VariableLoan({ kind }: { kind: string }) {
  const [principal, setPrincipal] = useState("");
  const [months, setMonths] = useState("");
  const [rate, setRate] = useState("");
  const [frequency, setFrequency] = useState("12");
  const [changes, setChanges] = useState("");
  const [extra, setExtra] = useState("0");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<
    {
      principal: string;
      months: string;
      rate: string;
      frequency: string;
      changes: string;
      extra: string;
      summary: string;
    }[]
  >([]);
  let result: ReturnType<typeof variableLoan> | undefined,
    baseline: ReturnType<typeof variableLoan> | undefined,
    error = "";
  try {
    if ([principal, months, rate, extra].every((x) => x !== "")) {
      const list = changes.trim()
        ? changes.split(",").map((pair) => {
            const match = /^\s*(\d+)\s*:\s*(\d+(?:\.\d+)?|\.\d+)\s*$/.exec(
              pair,
            );
            if (!match)
              throw new Error(
                "Use period:rate pairs, for example 13:8.5, 25:9.",
              );
            return { period: Number(match[1]), annualRate: Number(match[2]) };
          })
        : [];
      result = variableLoan(
        Number(principal),
        Number(months),
        Number(frequency),
        Number(rate),
        list,
        Number(extra),
      );
      baseline = variableLoan(
        Number(principal),
        Number(months),
        Number(frequency),
        Number(rate),
        [],
        0,
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid scenario.";
  }
  const label =
    frequency === "12" ? "monthly" : frequency === "4" ? "quarterly" : "annual";
  const summary = result
    ? `Initial ${label} scheduled payment ${money(result.initialPayment)}; total ${money(result.total)}; interest ${money(result.interest)}; ${result.schedule.length} payments.`
    : "";
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="variable-loan-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">ADVANCED SCENARIO</span>
          <h2 id="variable-loan-heading">
            Variable rate &amp; payment frequency
          </h2>
          <p>Estimate an amortizing loan with scheduled rate changes.</p>
        </div>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Scenario principal (₹)
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </label>
          <label>
            Scenario tenure (months)
            <input
              type="number"
              step="1"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
          </label>
          <label>
            Initial annual rate (%)
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <label>
            Payment frequency
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="12">Monthly</option>
              <option value="4">Quarterly</option>
              <option value="1">Annual</option>
            </select>
          </label>
          <label>
            Rate changes (payment period:annual rate)
            <input
              type="text"
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="e.g. 13:8.5, 25:9"
            />
          </label>
          <label>
            Extra payment each period (₹)
            <input
              type="number"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </label>
          <p>
            Example: 13:8.5 means the 13th payment period uses an 8.5% annual
            rate. Rate changes may be omitted for a fixed-rate scenario.
          </p>
          <button
            className="secondary"
            type="button"
            disabled={!result || !!error}
            onClick={() => {
              setSaved((current) =>
                [
                  {
                    principal,
                    months,
                    rate,
                    frequency,
                    changes,
                    extra,
                    summary,
                  },
                  ...current,
                ].slice(0, 20),
              );
              setNotice("Scenario saved for this session.");
            }}
          >
            Save scenario
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setPrincipal("");
              setMonths("");
              setRate("");
              setFrequency("12");
              setChanges("");
              setExtra("0");
              setNotice("");
            }}
          >
            Reset scenario
          </button>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>
            {kind === "emi-calculator" ? "EMI" : "Loan"} scenario breakdown
          </h3>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : !result ? (
            <p>Enter principal, tenure and initial annual rate.</p>
          ) : (
            <>
              <strong>
                Initial scheduled payment: {money(result.initialPayment)} /{" "}
                {label === "monthly"
                  ? "month"
                  : label === "quarterly"
                    ? "quarter"
                    : "year"}
              </strong>
              <p>
                Total paid: {money(result.total)}
                <br />
                Total interest: {money(result.interest)}
                <br />
                Payments: {result.schedule.length}
                <br />
                Interest difference versus fixed initial rate without extra
                payments:{" "}
                {money(
                  result.interest - (baseline?.interest ?? result.interest),
                )}
              </p>
              <div
                className="loan-bar"
                role="img"
                aria-label={`Principal ${money(Number(principal))}; interest ${money(result.interest)}`}
              >
                <span
                  style={{
                    width: `${(Number(principal) / result.total) * 100}%`,
                  }}
                />
              </div>
              <p>
                Nominal annual rate ÷ payments per year. Payments are
                recalculated at each rate change for the remaining scheduled
                periods. Extra payment applies every period and can shorten the
                loan. No fees, taxes or daily interest.
              </p>
              <button
                className="secondary"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summary);
                    setNotice("Summary copied.");
                  } catch {
                    setNotice("Copy failed; select the text manually.");
                  }
                }}
              >
                Copy scenario
              </button>
            </>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
      {saved.length > 0 && (
        <div className="calculator-history">
          <h3>Saved scenarios</h3>
          <ol>
            {saved.map((item, i) => (
              <li key={i}>
                {item.summary}{" "}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setPrincipal(item.principal);
                    setMonths(item.months);
                    setRate(item.rate);
                    setFrequency(item.frequency);
                    setChanges(item.changes);
                    setExtra(item.extra);
                    setNotice("Scenario restored.");
                  }}
                >
                  Restore scenario {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="secondary"
            onClick={() => setSaved([])}
          >
            Clear saved scenarios
          </button>
          <p>Saved until you leave or refresh this page.</p>
        </div>
      )}
      {result && (
        <details className="calculator-history">
          <summary>View scenario schedule</summary>
          <p>
            These estimates are not lender offers. Final payment is adjusted for
            the remaining balance; figures are rounded for display and CSV only.
          </p>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              downloadText(
                [
                  "Period,Annual rate %,Scheduled payment,Actual payment,Principal,Interest,Balance",
                  ...result!.schedule.map((r) =>
                    [
                      r.period,
                      r.annualRate,
                      r.scheduled.toFixed(2),
                      r.payment.toFixed(2),
                      r.principal.toFixed(2),
                      r.interest.toFixed(2),
                      r.balance.toFixed(2),
                    ].join(","),
                  ),
                ].join("\r\n"),
                "loan-scenario.csv",
                "text/csv;charset=utf-8",
              )
            }
          >
            Download scenario CSV
          </button>
          <div
            className="loan-table"
            role="region"
            aria-label="Variable rate scenario schedule"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Rate</th>
                  <th>Payment</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.annualRate}%</td>
                    <td>{money(row.payment)}</td>
                    <td>{money(row.principal)}</td>
                    <td>{money(row.interest)}</td>
                    <td>{money(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
