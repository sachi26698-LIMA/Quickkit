"use client";

import { useState } from "react";
import {
  PT_REGIMES,
  grossForNet,
  inr,
  money,
  salaryBreakdown,
  type TaxRegime,
} from "@/lib/tools/hr/payroll";
import {
  BreakdownTable,
  EmptyState,
  Field,
  FieldGrid,
  Notice,
  ResultPanel,
  SelectField,
  Stat,
  StatRow,
  ToggleField,
  parseAmount,
  parseNumber,
  useComputed,
} from "@/components/tools/launch/ui";

type Mode = "ctc-to-net" | "net-to-gross" | "income-tax" | "gratuity";

/**
 * Salary workspace.
 *
 * One component serves four tools because they share the same engine and the
 * same inputs; the `mode` prop only changes which computed view is shown and
 * which result block is emphasised. That is a real saving rather than a
 * shortcut: the four pages cannot drift apart in their arithmetic because there
 * is one arithmetic.
 *
 * Every numeric field tolerates "12,00,000", "12 lakh" and "1200000".
 */
export default function SalaryWorkspace({ mode }: { mode: Mode }) {
  const [ctc, setCtc] = useState("1200000");
  const [targetNet, setTargetNet] = useState("90000");
  const [basicPercent, setBasicPercent] = useState("40");
  const [regime, setRegime] = useState<TaxRegime>("new");
  const [pfCeiling, setPfCeiling] = useState(true);
  const [includeEsi, setIncludeEsi] = useState(true);
  const [state, setState] = useState("none");
  const [deductions, setDeductions] = useState("");
  const [employerNps, setEmployerNps] = useState("");

  const reset = () => {
    setCtc("1200000");
    setTargetNet("90000");
    setBasicPercent("40");
    setRegime("new");
    setPfCeiling(true);
    setIncludeEsi(true);
    setState("none");
    setDeductions("");
    setEmployerNps("");
  };

  const ctcValue = parseAmount(ctc);
  const netValue = parseAmount(targetNet);
  const basicValue = parseNumber(basicPercent);
  const deductionsValue = parseAmount(deductions) ?? 0;
  const npsValue = parseAmount(employerNps) ?? 0;

  const errors: Record<string, string> = {};
  if (mode !== "net-to-gross" && ctcValue === null) {
    errors.ctc = "Enter an annual CTC, e.g. 1200000 or 12 lakh.";
  } else if (ctcValue !== null && ctcValue < 0) {
    errors.ctc = "CTC cannot be negative.";
  } else if (ctcValue !== null && ctcValue > 1_000_000_000) {
    errors.ctc = "Above ₹100 crore is outside what this estimator models.";
  }
  if (mode === "net-to-gross") {
    if (netValue === null) errors.net = "Enter the monthly take-home you want.";
    else if (netValue <= 0) errors.net = "Enter a take-home above zero.";
  }
  if (basicValue !== null && (basicValue < 30 || basicValue > 70)) {
    errors.basic =
      "Basic is normally 30–70% of gross. Values outside that are clamped.";
  }
  if (regime === "new" && deductionsValue > 0) {
    errors.deductions =
      "Chapter VI-A deductions do not apply in the new regime; they are ignored. Switch to the old regime to use them.";
  }

  const hasValidInput =
    mode === "net-to-gross"
      ? netValue !== null && netValue > 0
      : ctcValue !== null && ctcValue >= 0 && !errors.ctc;

  const computed = useComputed(() => {
    if (!hasValidInput) return null;
    const options = {
      basicPercent: (basicValue ?? 40) / 100,
      pfOnCeiling: pfCeiling,
      includeEsi,
      regime,
      deductions: deductionsValue,
      ptRegimeId: state,
      employerNps: npsValue,
    };

    if (mode === "net-to-gross") {
      const solved = grossForNet(netValue ?? 0, options);
      return { kind: "reverse" as const, solved };
    }

    const breakdown = salaryBreakdown({ annualCtc: ctcValue ?? 0, ...options });
    return { kind: "forward" as const, breakdown };
  }, [
    hasValidInput,
    mode,
    ctcValue,
    netValue,
    basicValue,
    pfCeiling,
    includeEsi,
    regime,
    deductionsValue,
    state,
    npsValue,
  ]);

  // ── Text output for copy/download ──
  const outputText = (() => {
    if (!computed) return "";
    if (computed.kind === "reverse") {
      const { breakdown, annualGross } = computed.solved;
      return [
        `Required CTC for ${inr(netValue ?? 0)} monthly take-home`,
        `Annual gross: ${inr(annualGross)}`,
        `Monthly gross: ${inr(breakdown.monthlyGross)}`,
        `Employee PF: ${inr(breakdown.employeePf)}`,
        `Professional tax: ${inr(breakdown.professionalTax)}`,
        `Income tax: ${inr(breakdown.incomeTax)}`,
        `Monthly take-home: ${inr(breakdown.monthlyNet)}`,
        "",
        "Estimate from published statutory rates. Not a payslip or tax advice.",
      ].join("\n");
    }
    const b = computed.breakdown;
    return [
      `Salary breakdown — CTC ${inr(b.annualCtc)} — ${regime === "new" ? "new" : "old"} regime`,
      "",
      "MONTHLY",
      `Gross: ${inr(b.monthlyGross)}`,
      `Employee PF: −${inr(b.employeePf / 12)}`,
      `Employee ESI: −${inr(b.employeeEsi / 12)}`,
      `Professional tax: −${inr(b.professionalTax / 12)}`,
      `Income tax: −${inr(b.incomeTax / 12)}`,
      `Take-home: ${inr(b.monthlyNet)}`,
      "",
      "ANNUAL",
      `CTC: ${inr(b.annualCtc)}`,
      `Employer PF: ${inr(b.employerPf)}`,
      `Employer ESI: ${inr(b.employerEsi)}`,
      `Gratuity provision: ${inr(b.gratuityProvision)}`,
      `Gross salary: ${inr(b.annualGross)}`,
      `Basic: ${inr(b.basic)}`,
      `HRA: ${inr(b.hra)}`,
      `Special allowance: ${inr(b.specialAllowance)}`,
      `Taxable income: ${inr(b.tax.taxableIncome)}`,
      `Income tax incl. cess: ${inr(b.incomeTax)}`,
      `Net annual: ${inr(b.annualNet)}`,
      "",
      ...b.tax.notes.map((note) => `• ${note}`),
      "",
      "Estimate from published statutory rates. Not a payslip or tax advice.",
    ].join("\n");
  })();

  const csvRows = (() => {
    if (!computed || computed.kind !== "forward") return undefined;
    const b = computed.breakdown;
    return [
      ["Component", "Monthly", "Annual"],
      ["CTC", money(b.annualCtc / 12), money(b.annualCtc)],
      ["Gross salary", money(b.monthlyGross), money(b.annualGross)],
      ["Basic", money(b.basic / 12), money(b.basic)],
      ["HRA", money(b.hra / 12), money(b.hra)],
      [
        "Special allowance",
        money(b.specialAllowance / 12),
        money(b.specialAllowance),
      ],
      ["Employer PF", money(b.employerPf / 12), money(b.employerPf)],
      ["Employer ESI", money(b.employerEsi / 12), money(b.employerEsi)],
      [
        "Gratuity provision",
        money(b.gratuityProvision / 12),
        money(b.gratuityProvision),
      ],
      ["Employee PF", -money(b.employeePf / 12), -money(b.employeePf)],
      ["Employee ESI", -money(b.employeeEsi / 12), -money(b.employeeEsi)],
      [
        "Professional tax",
        -money(b.professionalTax / 12),
        -money(b.professionalTax),
      ],
      ["Income tax", -money(b.incomeTax / 12), -money(b.incomeTax)],
      ["Take-home", money(b.monthlyNet), money(b.annualNet)],
    ];
  })();

  const isTaxMode = mode === "income-tax";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">
          {mode === "net-to-gross"
            ? "Your target take-home"
            : mode === "income-tax"
              ? "Salary income and regime"
              : "Compensation and structure"}
        </h2>
        <p className="qw-section-note">
          {mode === "net-to-gross"
            ? "Enter the amount you need in your account each month. The tool solves upwards through the tax slabs, the PF ceiling and the ESI threshold."
            : "Enter the annual CTC and the structure. Every figure below is derived from published statutory rates, and the rate used is shown next to each one."}
        </p>

        <FieldGrid columns={2}>
          {mode === "net-to-gross" ? (
            <Field
              label="Target monthly take-home"
              value={targetNet}
              onChange={setTargetNet}
              suffix="₹"
              inputMode="decimal"
              error={errors.net}
              hint="After PF, professional tax and income tax. Commas and 'lakh' are accepted."
            />
          ) : (
            <Field
              label="Annual CTC"
              value={ctc}
              onChange={setCtc}
              suffix="₹"
              inputMode="decimal"
              error={errors.ctc}
              hint="Total cost to company, including employer PF and gratuity provision."
            />
          )}

          <Field
            label="Basic as % of gross"
            value={basicPercent}
            onChange={setBasicPercent}
            suffix="%"
            inputMode="decimal"
            error={errors.basic}
            hint="40% is the most common structure. This changes PF and gratuity, not just the label."
          />

          <SelectField
            label="Tax regime"
            value={regime}
            onChange={(value) => setRegime(value as TaxRegime)}
            options={[
              { value: "new", label: "New regime (default for salaried)" },
              { value: "old", label: "Old regime (with deductions)" },
            ]}
            hint="The new regime allows a ₹75,000 standard deduction but no Chapter VI-A deductions."
          />

          <SelectField
            label="Professional tax state"
            value={state}
            onChange={setState}
            options={PT_REGIMES.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
            hint="Several states levy no professional tax. Bands differ where they do."
          />

          <Field
            label="Provable deductions (old regime only)"
            value={deductions}
            onChange={setDeductions}
            suffix="₹/yr"
            inputMode="decimal"
            error={errors.deductions}
            disabled={regime === "new"}
            hint="80C, 80D, home-loan interest and similar. Ignored in the new regime."
          />

          <Field
            label="Employer NPS contribution"
            value={employerNps}
            onChange={setEmployerNps}
            suffix="₹/yr"
            inputMode="decimal"
            hint="Section 80CCD(2), allowed in both regimes. Capped at 14% of basic (new) or 10% (old)."
          />
        </FieldGrid>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <ToggleField
            label="Limit employer PF to the ₹15,000 statutory wage ceiling"
            checked={pfCeiling}
            onChange={setPfCeiling}
            hint="Most employers do. Turning this off computes 12% of your full basic instead."
          />
          <ToggleField
            label="Include ESI where the wage is below the ₹21,000 ceiling"
            checked={includeEsi}
            onChange={setIncludeEsi}
            hint="ESI applies only while monthly gross is at or below ₹21,000."
          />
        </div>
      </div>

      {!computed ? (
        <EmptyState>
          {mode === "net-to-gross"
            ? "Enter a monthly take-home above zero to see the CTC required and the full breakdown at that level."
            : "Enter an annual CTC to see the full breakdown. Nothing is calculated until the input is valid, so there is no misleading zero."}
        </EmptyState>
      ) : null}

      {computed?.kind === "reverse" ? (
        <ResultPanel
          title="CTC required for that take-home"
          show
          text={outputText}
          filename="required-ctc-breakdown"
          onReset={reset}
        >
          <StatRow>
            <Stat
              label="Required annual CTC"
              value={inr(ctcFromBreakdown(computed.solved.breakdown))}
              detail="Gross plus employer PF, ESI and gratuity provision"
              emphasis
            />
            <Stat
              label="Monthly gross"
              value={inr(computed.solved.breakdown.monthlyGross)}
              detail="Salary before deductions"
            />
            <Stat
              label="Monthly take-home"
              value={inr(computed.solved.breakdown.monthlyNet)}
              detail="After PF, PT and income tax"
            />
            <Stat
              label="Income tax (annual)"
              value={inr(computed.solved.breakdown.incomeTax)}
              detail={`${(computed.solved.breakdown.tax.effectiveRate * 100).toFixed(1)}% of gross`}
            />
          </StatRow>
          <BreakdownTable
            caption="Where the monthly gross goes"
            head={["Deduction", "Monthly"]}
            rows={[
              {
                label: "Employee PF",
                value: `−${inr(computed.solved.breakdown.employeePf / 12)}`,
                tone: "deduction",
              },
              {
                label: `Employee ESI${computed.solved.breakdown.esiApplicable ? "" : " (not applicable above ceiling)"}`,
                value: `−${inr(computed.solved.breakdown.employeeEsi / 12)}`,
                tone: "deduction",
              },
              {
                label: "Professional tax",
                value: `−${inr(computed.solved.breakdown.professionalTax / 12)}`,
                tone: "deduction",
              },
              {
                label: "Income tax (incl. cess)",
                value: `−${inr(computed.solved.breakdown.incomeTax / 12)}`,
                tone: "deduction",
              },
            ]}
            total={{
              label: "Take-home",
              value: inr(computed.solved.breakdown.monthlyNet),
            }}
          />
          <Notice tone="info">
            The solve assumes the standard structure above. A different basic
            share, a different PF basis or a different state changes the CTC
            that produces this take-home — adjust the inputs rather than
            assuming one number is universal.
          </Notice>
        </ResultPanel>
      ) : null}

      {computed?.kind === "forward" ? (
        <ResultPanel
          title={isTaxMode ? "Income tax on this salary" : "Salary breakdown"}
          show
          text={outputText}
          filename="salary-breakdown"
          csvRows={csvRows}
          onReset={reset}
        >
          <StatRow>
            <Stat
              label={isTaxMode ? "Annual income tax" : "Monthly take-home"}
              value={
                isTaxMode
                  ? inr(computed.breakdown.incomeTax)
                  : inr(computed.breakdown.monthlyNet)
              }
              detail={
                isTaxMode
                  ? `${(computed.breakdown.tax.effectiveRate * 100).toFixed(1)}% of ₹${money(computed.breakdown.annualGross).toLocaleString("en-IN")} gross`
                  : `${inr(computed.breakdown.annualNet)} a year`
              }
              emphasis
            />
            <Stat
              label="Annual gross"
              value={inr(computed.breakdown.annualGross)}
              detail={`Basic ${inr(computed.breakdown.basic)}`}
            />
            <Stat
              label="Taxable income"
              value={inr(computed.breakdown.tax.taxableIncome)}
              detail={`After ${inr(computed.breakdown.tax.standardDeduction)} standard deduction`}
            />
            <Stat
              label="Employer contributions"
              value={inr(
                computed.breakdown.employerPf + computed.breakdown.employerEsi,
              )}
              detail={`Plus ${inr(computed.breakdown.gratuityProvision)} gratuity provision`}
            />
          </StatRow>

          <div className="qw-split">
            <BreakdownTable
              caption="Annual cost to company"
              head={["Component", "Annual"]}
              rows={[
                {
                  label: "Gross salary",
                  value: inr(computed.breakdown.annualGross),
                },
                {
                  label: "Employer PF",
                  value: inr(computed.breakdown.employerPf),
                },
                {
                  label: "Employer ESI",
                  value: computed.breakdown.esiApplicable
                    ? inr(computed.breakdown.employerEsi)
                    : "Not applicable",
                },
                {
                  label: "Gratuity provision (4.81% of basic)",
                  value: inr(computed.breakdown.gratuityProvision),
                },
              ]}
              total={{
                label: "Total CTC",
                value: inr(
                  computed.breakdown.annualGross +
                    computed.breakdown.employerPf +
                    computed.breakdown.employerEsi +
                    computed.breakdown.gratuityProvision,
                ),
              }}
            />

            <BreakdownTable
              caption="From gross to take-home"
              head={["Deduction", "Annual"]}
              rows={[
                {
                  label: "Employee PF (12% of PF wages)",
                  value: `−${inr(computed.breakdown.employeePf)}`,
                  tone: "deduction",
                },
                {
                  label: "Employee ESI",
                  value: computed.breakdown.esiApplicable
                    ? `−${inr(computed.breakdown.employeeEsi)}`
                    : "Not applicable",
                  tone: "deduction",
                },
                {
                  label: "Professional tax",
                  value: `−${inr(computed.breakdown.professionalTax)}`,
                  tone: "deduction",
                },
                {
                  label: `Income tax — ${regime === "new" ? "new" : "old"} regime incl. 4% cess`,
                  value: `−${inr(computed.breakdown.incomeTax)}`,
                  tone: "deduction",
                },
              ]}
              total={{
                label: "Annual take-home",
                value: inr(computed.breakdown.annualNet),
              }}
            />
          </div>

          {computed.breakdown.tax.bands.length > 0 ? (
            <BreakdownTable
              caption={`Tax by slab — taxable income ${inr(computed.breakdown.tax.taxableIncome)}`}
              head={["Income band", "Tax"]}
              rows={computed.breakdown.tax.bands.map((band) => ({
                label: `${inr(band.from)} – ${band.to === Infinity ? "above" : inr(band.to)} at ${(band.rate * 100).toFixed(0)}% · on ${inr(band.taxable)}`,
                value: inr(band.tax),
              }))}
              total={{
                label:
                  computed.breakdown.tax.rebateApplied > 0
                    ? "After section 87A rebate, plus 4% cess"
                    : "Plus 4% cess",
                value: inr(computed.breakdown.incomeTax),
              }}
            />
          ) : null}

          {computed.breakdown.tax.notes.length > 0 ? (
            <div className="qw-prose" style={{ marginTop: 14 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>
                How this number was produced
              </p>
              <ul>
                {[
                  ...new Set([
                    ...computed.breakdown.tax.notes,
                    ...computed.breakdown.assumptions,
                  ]),
                ].map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </ResultPanel>
      ) : null}
    </>
  );
}

/** Rebuild the CTC from a solved breakdown (its parts sum to CTC by construction). */
function ctcFromBreakdown(
  breakdown: ReturnType<typeof salaryBreakdown>,
): number {
  return (
    breakdown.annualGross +
    breakdown.employerPf +
    breakdown.employerEsi +
    breakdown.gratuityProvision
  );
}

export { SalaryWorkspace };
