"use client";
import { useState } from "react";
import { loan } from "@/lib/tools/phase9-loans";
import { Workspace } from "./phase9-shared";
import { downloadText, downloadBlob } from "@/lib/tools/download";
import { loanAffordability } from "@/lib/tools/phase9-v2-advanced";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
export default function Loans({
  kind,
  heading,
}: {
  kind: string;
  heading?: string;
}) {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [years, setYears] = useState(false);
  const [extra, setExtra] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [oneTimeAmount, setOneTimeAmount] = useState("");
  const [oneTimeMonth, setOneTimeMonth] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [income, setIncome] = useState("");
  const [existingDebt, setExistingDebt] = useState("");
  const [ratio, setRatio] = useState("36");
  const [exportNotice, setExportNotice] = useState("");
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
  let financed: number | undefined,
    affordability: ReturnType<typeof loanAffordability> | undefined,
    helperError = "";
  try {
    if (purchasePrice !== "" && downPayment !== "") {
      const price = Number(purchasePrice),
        down = Number(downPayment);
      if (
        !Number.isFinite(price) ||
        !Number.isFinite(down) ||
        price <= 0 ||
        price > 1e12 ||
        down < 0 ||
        down >= price
      )
        throw new Error(
          "Purchase price must be positive; down payment must be non-negative and less than the price.",
        );
      financed = price - down;
    }
    if (income !== "" && existingDebt !== "" && ratio !== "")
      affordability = loanAffordability(
        Number(income),
        Number(existingDebt),
        Number(ratio),
      );
  } catch (e) {
    helperError = e instanceof Error ? e.message : "Invalid inputs.";
  }
  let maxLoan: number | undefined;
  if (affordability && rate !== "" && tenure !== "") {
    try {
      const factor = loan(
        1,
        Number(rate),
        Number(tenure) * (years ? 12 : 1),
      ).payment;
      const value = affordability.budget / factor;
      if (Number.isFinite(value) && value <= 1e12) maxLoan = value;
    } catch {
      /* Invalid rate or tenure is reported by the main calculation. */
    }
  }
  return (
    <>
      <Workspace
        heading={heading}
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
      {kind === "loan-calculator" && (
        <section className="workspace advanced-workspace">
          <details>
            <summary>Down payment &amp; affordability estimate</summary>
            <p>
              Use monthly gross income and existing monthly debt payments. The
              ratio is an assumption you choose, not a lender approval or
              financial advice. Living expenses, fees and taxes are not
              included.
            </p>
            <div className="advanced-options">
              <label>
                Purchase price (₹)
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </label>
              <label>
                Down payment (₹)
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                />
              </label>
              <label>
                Monthly gross income (₹)
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                />
              </label>
              <label>
                Existing monthly debt payments (₹)
                <input
                  type="number"
                  value={existingDebt}
                  onChange={(e) => setExistingDebt(e.target.value)}
                />
              </label>
              <label>
                Maximum debt-to-income ratio (%)
                <input
                  type="number"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                />
              </label>
            </div>
            {helperError && (
              <p className="calculator-error" role="alert">
                {helperError}
              </p>
            )}
            {financed !== undefined && (
              <p>
                Financed amount: {money(financed)}. Loan-to-value ratio:{" "}
                {((financed / Number(purchasePrice)) * 100).toFixed(2)}% of the
                purchase price (not a lender valuation).{" "}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPrincipal(String(financed))}
                >
                  Use as principal
                </button>
              </p>
            )}
            {maxLoan !== undefined && (
              <p>
                Estimated maximum affordable loan: {money(maxLoan)} using the
                selected fixed annual rate and tenure, monthly payments and the
                available debt budget; excludes taxes, fees, prepayments and
                lender underwriting.
              </p>
            )}
            {affordability && (
              <p>
                Estimated monthly debt allowance:{" "}
                {money(affordability.allowedDebt)}. Remaining for this loan:{" "}
                {money(affordability.budget)}.{" "}
                {r &&
                  (r.payment > affordability.budget
                    ? "The base payment exceeds this chosen budget."
                    : "The base payment is within this chosen budget.")}
              </p>
            )}
          </details>
        </section>
      )}
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
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              try {
                const { calculatorPdf } =
                  await import("@/lib/tools/calculator-pdf");
                const rows = [
                  `Principal INR ${principal}; annual rate ${rate}%; tenure ${tenure} ${years ? "years" : "months"}.`,
                  `Monthly payment INR ${r.payment.toFixed(2)}; total paid INR ${r.total.toFixed(2)}; interest INR ${r.interest.toFixed(2)}.`,
                  `Extra each month INR ${extra || "0"}; one-time payment INR ${oneTimeAmount || "0"}${oneTimeMonth ? ` in month ${oneTimeMonth}` : ""}.`,
                  "Monthly estimates; displayed amounts rounded to two decimals; no fees or taxes.",
                  ...r.schedule.map(
                    (row) =>
                      `Month ${row.month}: payment ${row.payment.toFixed(2)}, principal ${row.principal.toFixed(2)}, interest ${row.interest.toFixed(2)}, balance ${row.balance.toFixed(2)} INR.`,
                  ),
                ];
                const bytes = await calculatorPdf(
                  "Amortization schedule",
                  rows,
                );
                downloadBlob(
                  new Blob([new Uint8Array(bytes)], {
                    type: "application/pdf",
                  }),
                  "amortization.pdf",
                );
                setExportNotice("Schedule PDF downloaded.");
              } catch {
                setExportNotice(
                  "Could not create the schedule PDF. Please try again.",
                );
              }
            }}
          >
            Download schedule PDF
          </button>
          <p role="status">{exportNotice}</p>
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
