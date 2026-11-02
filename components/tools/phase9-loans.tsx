"use client";
import { useState } from "react";
import { loan } from "@/lib/tools/phase9-loans";
import { Workspace } from "./phase9-shared";
import { downloadText } from "@/lib/tools/download";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
export default function Loans({ kind }: { kind: string }) {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [years, setYears] = useState(false);
  const [extra, setExtra] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [oneTimeAmount, setOneTimeAmount] = useState("");
  const [oneTimeMonth, setOneTimeMonth] = useState("");
  let r: ReturnType<typeof loan> | undefined,
    error = "";
  try {
    if (principal && rate && tenure)
      r = loan(
        Number(principal),
        Number(rate),
        Number(tenure) * (years ? 12 : 1),
        extra ? Number(extra) : 0,
        oneTimeAmount || oneTimeMonth
          ? { month: Number(oneTimeMonth), amount: Number(oneTimeAmount || 0) }
          : undefined,
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid input.";
  }
  const summary = r
    ? `Monthly payment ${money(r.payment)} · Total ${money(r.total)} · Interest ${money(r.interest)}`
    : "";
  const baseline = r
    ? loan(Number(principal), Number(rate), Number(tenure) * (years ? 12 : 1))
    : undefined;
  const yearly = r
    ? Array.from({ length: Math.ceil(r.schedule.length / 12) }, (_, i) => {
        const rows = r!.schedule.slice(i * 12, (i + 1) * 12);
        return {
          year: i + 1,
          payment: rows.reduce((v, row) => v + row.payment, 0),
          interest: rows.reduce((v, row) => v + row.interest, 0),
          principal: rows.reduce((v, row) => v + row.principal, 0),
          balance: rows[rows.length - 1].balance,
        };
      })
    : [];
  return (
    <>
      <Workspace
        result={r ? money(r.payment) + " / month" : ""}
        error={error}
        reset={() => {
          setPrincipal("");
          setRate("");
          setTenure("");
          setYears(false);
          setExtra("");
          setOneTimeAmount("");
          setOneTimeMonth("");
        }}
        detail={
          r && (
            <>
              <p>
                Total repayment: {money(r.total)}
                <br />
                Total interest: {money(r.interest)}
                <br />
                Paid off in {r.schedule.length} months.
                <br />
                Interest saved versus no prepayment:{" "}
                {money((baseline?.interest ?? r.interest) - r.interest)}.
              </p>
              <div
                className="loan-bar"
                role="img"
                aria-label={`Principal ${money(Number(principal))}; interest ${money(r.interest)}`}
              >
                <span
                  style={{ width: `${(Number(principal) / r.total) * 100}%` }}
                />
              </div>
              <p>
                Principal vs interest. Fixed rate and equal monthly payments;
                interest accrues monthly on the outstanding balance. Extra
                payment is applied each month; no fees or taxes. Results are
                estimates and rounded only for display.
              </p>
            </>
          )
        }
      >
        <label>
          Principal (₹)
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
          />
        </label>
        <label>
          Annual interest rate (%)
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </label>
        <label>
          Tenure ({years ? "years" : "months"})
          <input
            type="number"
            value={tenure}
            onChange={(e) => setTenure(e.target.value)}
          />
        </label>
        <label className="calculator-check">
          <input
            type="checkbox"
            checked={years}
            onChange={(e) => setYears(e.target.checked)}
          />{" "}
          Tenure in years
        </label>
        <label>
          Extra payment per month (₹, optional)
          <input
            type="number"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        </label>
        <details>
          <summary>One-time prepayment</summary>
          <p>
            Added to the regular payment in the chosen month, after interest. If
            the loan is already paid off, no extra payment is made.
          </p>
          <label>
            Extra amount (₹)
            <input
              type="number"
              min="0"
              value={oneTimeAmount}
              onChange={(e) => setOneTimeAmount(e.target.value)}
            />
          </label>
          <label>
            Payment month
            <input
              type="number"
              min="1"
              step="1"
              value={oneTimeMonth}
              onChange={(e) => setOneTimeMonth(e.target.value)}
            />
          </label>
        </details>
        {(kind === "loan-calculator" || kind === "emi-calculator") && (
          <button
            className="secondary"
            disabled={!r}
            onClick={() =>
              setCompare((c) =>
                [
                  ...c,
                  `Principal ${money(Number(principal))}, rate ${rate}%, tenure ${tenure} ${years ? "years" : "months"}, extra ${money(Number(extra || 0))}/month: ${summary}`,
                ].slice(-5),
              )
            }
          >
            Add comparison scenario
          </button>
        )}
      </Workspace>
      {compare.length > 0 && (
        <section className="workspace">
          <h2>Scenario comparison</h2>
          <ul>
            {compare.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <button className="secondary" onClick={() => setCompare([])}>
            Clear scenarios
          </button>
        </section>
      )}
      {r && (
        <section className="workspace loan-schedule">
          <h2>Amortization schedule</h2>
          <button
            className="secondary"
            type="button"
            onClick={() =>
              downloadText(
                [
                  "Month,Payment,Principal,Interest,Balance",
                  ...r.schedule.map((row) =>
                    [
                      row.month,
                      row.payment.toFixed(2),
                      row.principal.toFixed(2),
                      row.interest.toFixed(2),
                      row.balance.toFixed(2),
                    ].join(","),
                  ),
                ].join("\n"),
                "amortization.csv",
                "text/csv;charset=utf-8",
              )
            }
          >
            Download schedule CSV
          </button>
          <details>
            <summary>Yearly repayment summary</summary>
            <div
              className="loan-table"
              tabIndex={0}
              role="region"
              aria-label="Yearly repayment summary"
            >
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Payment</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {yearly.map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
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
          <p>
            EMI = P × r / (1 − (1 + r)<sup>−n</sup>); r is annual rate ÷ 12. For
            zero interest, payment = P ÷ n.
          </p>
          <div
            className="loan-table"
            tabIndex={0}
            role="region"
            aria-label="Amortization schedule table"
          >
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Payment</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {r.schedule.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{money(row.payment)}</td>
                    <td>{money(row.principal)}</td>
                    <td>{money(row.interest)}</td>
                    <td>{money(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
