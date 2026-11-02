"use client";
import { useState } from "react";
import { loan } from "@/lib/tools/phase9-loans";
import { Workspace } from "./phase9-shared";
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
  let r: ReturnType<typeof loan> | undefined,
    error = "";
  try {
    if (principal && rate && tenure)
      r = loan(
        Number(principal),
        Number(rate),
        Number(tenure) * (years ? 12 : 1),
        extra ? Number(extra) : 0,
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid input.";
  }
  const summary = r
    ? `Monthly payment ${money(r.payment)} · Total ${money(r.total)} · Interest ${money(r.interest)}`
    : "";
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
        {kind === "loan-calculator" && (
          <button
            className="secondary"
            disabled={!r}
            onClick={() => setCompare((c) => [...c, summary].slice(-5))}
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
