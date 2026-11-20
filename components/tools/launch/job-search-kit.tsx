"use client";

import { useState } from "react";
import {
  compareOffers,
  contractorEquivalent,
  convertSalary,
  marginalRate,
  noticeBuyout,
  relocationComparison,
  totalCompensation,
  valueEquity,
  type SalaryPeriod,
} from "@/lib/tools/career/salary";
import { inr } from "@/lib/tools/hr/payroll";
import {
  BreakdownTable,
  Disclosure,
  EmptyState,
  Field,
  FieldGrid,
  Notice,
  ResultPanel,
  SelectField,
  Stat,
  StatRow,
  formatInput,
  parseAmount,
  parseNumber,
} from "@/components/tools/launch/ui";

type Mode =
  | "salary-converter"
  | "offer-comparison-calculator"
  | "notice-buyout-calculator"
  | "equity-vesting-calculator"
  | "total-compensation-calculator"
  | "relocation-calculator"
  | "marginal-tax-rate"
  | "contractor-rate-calculator";

export default function JobSearchKit({ mode }: { mode: Mode }) {
  switch (mode) {
    case "offer-comparison-calculator":
      return <OfferComparison />;
    case "notice-buyout-calculator":
      return <NoticeBuyoutTool />;
    case "equity-vesting-calculator":
      return <EquityTool />;
    case "total-compensation-calculator":
      return <TotalCompTool />;
    case "relocation-calculator":
      return <RelocationTool />;
    case "marginal-tax-rate":
      return <MarginalTool />;
    case "contractor-rate-calculator":
      return <ContractorTool />;
    default:
      return <SalaryConverter />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function SalaryConverter() {
  const [amount, setAmount] = useState("1200000");
  const [period, setPeriod] = useState<SalaryPeriod>("year");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [weeksPerYear, setWeeksPerYear] = useState("52");

  const amountValue = parseAmount(amount);
  const valid = amountValue !== null && amountValue > 0;

  const result = valid
    ? convertSalary({
        amount: amountValue!,
        period,
        hoursPerWeek: parseNumber(hoursPerWeek) ?? 40,
        weeksPerYear: parseNumber(weeksPerYear) ?? 52,
      })
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Salary and working pattern</h2>
        <p className="qw-section-note">
          A monthly salary is annual ÷ 12 by definition, but an hourly figure
          depends on how many hours you actually work. Both bases are shown
          rather than one hidden divisor.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Amount"
            value={amount}
            onChange={setAmount}
            suffix="₹"
            inputMode="decimal"
          />
          <SelectField
            label="Period"
            value={period}
            onChange={(value) => setPeriod(value as SalaryPeriod)}
            options={[
              { value: "hour", label: "Per hour" },
              { value: "day", label: "Per day" },
              { value: "month", label: "Per month" },
              { value: "year", label: "Per year" },
            ]}
          />
          <Field
            label="Hours per week"
            value={hoursPerWeek}
            onChange={setHoursPerWeek}
            inputMode="decimal"
          />
          <Field
            label="Weeks per year"
            value={weeksPerYear}
            onChange={setWeeksPerYear}
            inputMode="decimal"
            hint="52 unpaid-leave-free weeks; use 46–48 for a contractor."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Enter a positive amount to convert between periods.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Equivalent across periods"
          show
          text={[
            `Hourly: ${inr(result.hourly, 2)}`,
            `Daily: ${inr(result.daily)}`,
            `Monthly: ${inr(result.monthly)}`,
            `Annual: ${inr(result.annual)}`,
            `Hours per year: ${Math.round(result.hoursPerYear)}`,
            "",
            ...result.notes,
          ].join("\n")}
          filename="salary-conversion"
        >
          <StatRow>
            <Stat label="Annual" value={inr(result.annual)} emphasis />
            <Stat label="Monthly" value={inr(result.monthly)} />
            <Stat label="Daily" value={inr(result.daily)} detail="5-day week" />
            <Stat
              label="Hourly"
              value={inr(result.hourly, 0)}
              detail={`${Math.round(result.hoursPerYear)} hours a year`}
            />
          </StatRow>

          <BreakdownTable
            caption="All periods"
            head={["Period", "Amount"]}
            rows={[
              { label: "Hourly", value: inr(result.hourly, 2) },
              { label: "Daily", value: inr(result.daily) },
              { label: "Monthly", value: inr(result.monthly) },
              { label: "Annual", value: inr(result.annual) },
            ]}
          />

          <Notice tone="info">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ContractorTool() {
  const [annualCtc, setAnnualCtc] = useState("1200000");
  const [paidDays, setPaidDays] = useState("260");
  const [billedDays, setBilledDays] = useState("220");
  const [loading, setLoading] = useState("20");

  const ctcValue = parseAmount(annualCtc);
  const valid = ctcValue !== null && ctcValue > 0;

  const result = valid
    ? contractorEquivalent({
        annualCtc: ctcValue!,
        paidDaysPerYear: parseNumber(paidDays) ?? 260,
        billedDaysPerYear: parseNumber(billedDays) ?? 220,
        loading: (parseNumber(loading) ?? 20) / 100,
      })
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Employment versus contracting</h2>
        <p className="qw-section-note">
          A contractor bills far fewer days than an employee is paid for. The
          day rate that matches a salary has to cover that gap plus the benefits
          the employer would have provided — so it is always higher than the
          salaried day value.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Annual CTC to match"
            value={annualCtc}
            onChange={setAnnualCtc}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Paid days per year"
            value={paidDays}
            onChange={setPaidDays}
            inputMode="numeric"
            hint="260 is a 5-day, 52-week year."
          />
          <Field
            label="Days actually billed"
            value={billedDays}
            onChange={setBilledDays}
            inputMode="numeric"
            hint="220 allows for leave, holidays and bench time."
          />
          <Field
            label="Overhead loading"
            value={loading}
            onChange={setLoading}
            suffix="%"
            inputMode="decimal"
            hint="Covers PF, gratuity, insurance, equipment. 20% is a starting point, not a rule."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>Enter the CTC you want to match.</EmptyState>
      ) : (
        <ResultPanel
          title="Equivalent day rate"
          show
          text={[
            `Salaried day value: ${inr(result.salariedDayValue)}`,
            `Contractor day rate: ${inr(result.contractorDayRate)}`,
            `Loading applied: ${Math.round(result.loadingApplied * 100)}%`,
            `Annual billed: ${inr(result.contractorDayRate * (parseNumber(billedDays) ?? 220))}`,
            "",
            ...result.notes,
          ].join("\n")}
          filename="contractor-day-rate"
        >
          <StatRow>
            <Stat
              label="Contractor day rate"
              value={inr(result.contractorDayRate)}
              detail="Floor for the conversation"
              emphasis
            />
            <Stat
              label="Salaried day value"
              value={inr(result.salariedDayValue)}
              detail="CTC ÷ paid days"
            />
            <Stat
              label="Loading"
              value={`${Math.round(result.loadingApplied * 100)}%`}
              detail="Benefits replaced"
            />
          </StatRow>

          <Notice tone="info">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function OfferComparison() {
  const [currentCtc, setCurrentCtc] = useState("1200000");
  const [offeredCtc, setOfferedCtc] = useState("1600000");
  const [regime, setRegime] = useState("new");
  const [deductions, setDeductions] = useState("");
  const [state, setState] = useState("none");

  const currentValue = parseAmount(currentCtc);
  const offeredValue = parseAmount(offeredCtc);
  const valid =
    currentValue !== null &&
    offeredValue !== null &&
    currentValue >= 0 &&
    offeredValue > 0;

  const result = valid
    ? compareOffers({
        currentCtc: currentValue!,
        offeredCtc: offeredValue!,
        regime: regime as "new",
        deductions: parseAmount(deductions) ?? 0,
        ptRegimeId: state,
      })
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Two offers</h2>
        <p className="qw-section-note">
          Compares the two CTCs after tax. The interesting number is how much of
          the hike survives — at higher incomes a large part of a raise is
          taxed, so a 33% hike is rarely a 33% take-home rise.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Current CTC"
            value={currentCtc}
            onChange={setCurrentCtc}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Offered CTC"
            value={offeredCtc}
            onChange={setOfferedCtc}
            suffix="₹"
            inputMode="decimal"
          />
          <SelectField
            label="Tax regime"
            value={regime}
            onChange={setRegime}
            options={[
              { value: "new", label: "New regime" },
              { value: "old", label: "Old regime" },
            ]}
          />
          <SelectField
            label="Professional tax state"
            value={state}
            onChange={setState}
            options={[
              { value: "none", label: "No professional tax" },
              { value: "maharashtra", label: "Maharashtra" },
              { value: "karnataka", label: "Karnataka" },
              { value: "west-bengal", label: "West Bengal" },
              { value: "andhra-telangana", label: "Andhra / Telangana" },
            ]}
          />
          <Field
            label="Provable deductions (old regime)"
            value={deductions}
            onChange={setDeductions}
            suffix="₹/yr"
            inputMode="decimal"
            disabled={regime === "new"}
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>Enter both CTCs to compare them after tax.</EmptyState>
      ) : (
        <ResultPanel
          title="Offer comparison"
          show
          text={[
            `Current: CTC ${inr(result.current.ctc)}, annual take-home ${inr(result.current.inHandAnnual)}`,
            `Offered: CTC ${inr(result.offered.ctc)}, annual take-home ${inr(result.offered.inHandAnnual)}`,
            "",
            `CTC increase: ${inr(result.ctcIncrease)} (${result.ctcIncreasePercent.toFixed(1)}%)`,
            `Take-home increase: ${inr(result.inHandIncrease)} (${result.inHandIncreasePercent.toFixed(1)}%)`,
            `Share of the raise that survives: ${(result.retainedShare * 100).toFixed(0)}%`,
            "",
            ...result.notes,
          ].join("\n")}
          filename="offer-comparison"
        >
          <StatRow>
            <Stat
              label="Take-home increase"
              value={inr(result.inHandIncrease)}
              detail={`${result.inHandIncreasePercent.toFixed(1)}% more in hand`}
              emphasis
            />
            <Stat
              label="CTC increase"
              value={`${result.ctcIncreasePercent.toFixed(1)}%`}
              detail={inr(result.ctcIncrease)}
            />
            <Stat
              label="Retained"
              value={`${(result.retainedShare * 100).toFixed(0)}%`}
              detail="Share of the raise not taxed"
            />
          </StatRow>

          <BreakdownTable
            caption="Current versus offered"
            head={["Figure", "Offered"]}
            rows={[
              {
                label: `CTC — was ${inr(result.current.ctc)}`,
                value: inr(result.offered.ctc),
              },
              {
                label: `Gross — was ${inr(result.current.gross)}`,
                value: inr(result.offered.gross),
              },
              {
                label: `Income tax — was ${inr(result.current.tax)}`,
                value: inr(result.offered.tax),
              },
              {
                label: `Effective tax rate — was ${(result.current.effectiveTaxRate * 100).toFixed(1)}%`,
                value: `${(result.offered.effectiveTaxRate * 100).toFixed(1)}%`,
              },
              {
                label: `Monthly take-home — was ${inr(result.current.inHandMonthly)}`,
                value: inr(result.offered.inHandMonthly),
              },
            ]}
          />

          {result.notes.length > 0 ? (
            <Notice tone="info">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <Disclosure summary="What is not in this comparison">
            <p>
              Only cash components. ESOPs, a joining bonus with a clawback,
              insurance and allowances are excluded unless you fold them into
              the CTC you enter. A higher CTC with a large variable component is
              not the same as a higher fixed salary.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function NoticeBuyoutTool() {
  const [monthlyGross, setMonthlyGross] = useState("60000");
  const [monthlyBasicDa, setMonthlyBasicDa] = useState("28000");
  const [noticeDays, setNoticeDays] = useState("60");
  const [servedDays, setServedDays] = useState("20");
  const [workingDays, setWorkingDays] = useState("30");
  const [basis, setBasis] = useState("basic");

  const grossValue = parseAmount(monthlyGross);
  const basicValue = parseAmount(monthlyBasicDa);
  const valid = grossValue !== null && basicValue !== null;

  const result = valid
    ? noticeBuyout({
        monthlyGross: grossValue!,
        monthlyBasicDa: basicValue!,
        noticeDays: parseNumber(noticeDays) ?? 60,
        servedDays: parseNumber(servedDays) ?? 0,
        workingDays: parseNumber(workingDays) ?? 30,
        recoveryBasis: basis as "basic",
      })
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Notice and recovery</h2>
        <p className="qw-section-note">
          Recovery is normally basic + DA per day, not full gross. The two
          differ substantially, which is why the basis is an explicit choice
          rather than a hidden assumption.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Monthly gross"
            value={monthlyGross}
            onChange={setMonthlyGross}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Monthly basic + DA"
            value={monthlyBasicDa}
            onChange={setMonthlyBasicDa}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Notice period (days)"
            value={noticeDays}
            onChange={setNoticeDays}
            inputMode="numeric"
          />
          <Field
            label="Days already served"
            value={servedDays}
            onChange={setServedDays}
            inputMode="numeric"
          />
          <Field
            label="Working days per month"
            value={workingDays}
            onChange={setWorkingDays}
            inputMode="numeric"
          />
          <SelectField
            label="Recovery basis"
            value={basis}
            onChange={setBasis}
            options={[
              { value: "basic", label: "Basic + DA per day (usual)" },
              { value: "gross", label: "Full gross per day" },
            ]}
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Enter both wage figures to calculate the buyout.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Notice buyout"
          show
          text={[
            `Notice: ${result.noticeDays} days, served ${result.servedDays}, shortfall ${result.shortfallDays}`,
            `Recovery per day: ${inr(result.recoveryPerDay)}`,
            `Recovery amount: ${inr(result.recoveryAmount)}`,
            `Earned for days served: ${inr(result.earnedForServedDays)}`,
            `Net effect: ${inr(result.netEffect)}`,
            "",
            ...result.notes,
          ].join("\n")}
          filename="notice-buyout"
        >
          <StatRow>
            <Stat
              label="Recovery amount"
              value={inr(result.recoveryAmount)}
              detail={`${result.shortfallDays} days short`}
              emphasis
            />
            <Stat
              label="Per day"
              value={inr(result.recoveryPerDay)}
              detail={basis === "basic" ? "Basic + DA basis" : "Gross basis"}
            />
            <Stat
              label="Earned for served days"
              value={inr(result.earnedForServedDays)}
            />
            <Stat
              label="Net effect"
              value={inr(result.netEffect)}
              detail="Earned minus recovery"
            />
          </StatRow>

          <Notice tone="info">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>

          <Disclosure summary="Buyout versus garden leave">
            <p>
              A buyout means you pay the employer for the notice you do not
              serve; garden leave means you are paid but not required to work
              for the notice period. They are different arrangements with
              different tax and contractual consequences.
            </p>
            <p>
              Whether a new employer reimburses a buyout is entirely
              contractual. Get the commitment in writing before resigning,
              because it is rarely offered after the fact.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function EquityTool() {
  const [units, setUnits] = useState("1000");
  const [strike, setStrike] = useState("100");
  const [fmv, setFmv] = useState("400");
  const [vestingYears, setVestingYears] = useState("4");
  const [cliffMonths, setCliffMonths] = useState("12");
  const [monthsElapsed, setMonthsElapsed] = useState("18");

  const unitsValue = parseNumber(units) ?? 0;
  const valid = unitsValue > 0;

  const grant = {
    units: unitsValue,
    strike: parseNumber(strike) ?? 0,
    fmv: parseNumber(fmv) ?? 0,
    vestingYears: parseNumber(vestingYears) ?? 4,
    cliffMonths: parseNumber(cliffMonths) ?? 12,
  };

  const result = valid
    ? valueEquity(grant, parseNumber(monthsElapsed) ?? 0)
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">The grant</h2>
        <p className="qw-section-note">
          For options the value is the spread — (FMV − strike) × units — which
          is a paper gain, not cash. RSUs are the same arithmetic with a strike
          of zero. Set strike to 0 for RSUs.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Units granted"
            value={units}
            onChange={setUnits}
            inputMode="numeric"
          />
          <Field
            label="Strike price per unit"
            value={strike}
            onChange={setStrike}
            suffix="₹"
            inputMode="decimal"
            hint="0 for RSUs."
          />
          <Field
            label="Current FMV per unit"
            value={fmv}
            onChange={setFmv}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Vesting period (years)"
            value={vestingYears}
            onChange={setVestingYears}
            inputMode="numeric"
          />
          <Field
            label="Cliff (months)"
            value={cliffMonths}
            onChange={setCliffMonths}
            inputMode="numeric"
            hint="12 is standard for a 4-year grant."
          />
          <Field
            label="Months elapsed"
            value={monthsElapsed}
            onChange={setMonthsElapsed}
            inputMode="numeric"
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>Enter the number of units to value the grant.</EmptyState>
      ) : (
        <ResultPanel
          title="Grant value"
          show
          text={[
            `Total spread at today's FMV: ${inr(result.totalSpread)}`,
            `Vested after ${result.vested.months} months: ${result.vested.units} units (${inr(result.vested.spread)})`,
            `Annualised value: ${inr(result.annualisedValue)}`,
            "",
            "Vesting schedule:",
            ...result.schedule.map(
              (year) =>
                `  Year ${year.year}: ${year.units} units (${inr(year.spread)})`,
            ),
            "",
            ...result.notes,
          ].join("\n")}
          filename="equity-valuation"
        >
          <StatRow>
            <Stat
              label="Vested so far"
              value={inr(result.vested.spread)}
              detail={`${result.vested.units} units after ${result.vested.months} months`}
              emphasis
            />
            <Stat
              label="Total grant value"
              value={inr(result.totalSpread)}
              detail="At today's FMV, pre-tax"
            />
            <Stat
              label="Annualised"
              value={inr(result.annualisedValue)}
              detail="Spread ÷ vesting years"
            />
          </StatRow>

          {result.underwater ? (
            <Notice tone="error">
              The strike is at or above the current FMV, so these options are
              underwater and worth zero today. They may still be worth something
              if the company grows.
            </Notice>
          ) : null}

          <BreakdownTable
            caption="Vesting schedule"
            head={["Year", "Value"]}
            rows={result.schedule.map((year) => ({
              label: `Year ${year.year} — ${year.units} units`,
              value: inr(year.spread),
            }))}
            total={{ label: "Total", value: inr(result.totalSpread) }}
          />

          <Notice tone="warning">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>

          <Disclosure summary="Options versus RSUs">
            <p>
              <strong>Options</strong> give you the right to buy shares at the
              strike price. They are worth the difference between the market
              value and the strike, and they can be worth nothing. You usually
              have to pay the strike to exercise them.
            </p>
            <p>
              <strong>RSUs</strong> are shares given to you outright. The full
              value is yours; there is no strike to pay. They are taxed as
              salary when they vest in most jurisdictions, which creates a real
              cash obligation before the shares are liquid.
            </p>
            <p>
              In both cases the value here assumes a buyer at the stated FMV.
              For a private company there may be no buyer for years, and the
              valuation may be a paper fair market value set for tax purposes
              rather than an achievable price.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TotalCompTool() {
  const [annualCtc, setAnnualCtc] = useState("1500000");
  const [joiningBonus, setJoiningBonus] = useState("100000");
  const [clawbackMonths, setClawbackMonths] = useState("12");
  const [bonusPercent, setBonusPercent] = useState("10");
  const [equityAnnual, setEquityAnnual] = useState("200000");
  const [relocation, setRelocation] = useState("50000");

  const ctcValue = parseAmount(annualCtc);
  const valid = ctcValue !== null && ctcValue > 0;

  const result = valid
    ? totalCompensation({
        annualCtc: ctcValue!,
        joiningBonus: parseAmount(joiningBonus) ?? 0,
        bonusClawbackMonths: parseNumber(clawbackMonths) ?? undefined,
        annualBonusPercent: parseNumber(bonusPercent) ?? 0,
        equityAnnualised: parseAmount(equityAnnual) ?? 0,
        relocation: parseAmount(relocation) ?? 0,
      })
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Offer components</h2>
        <p className="qw-section-note">
          Year one and steady state are different numbers. A joining bonus with
          a clawback is not income you keep if you leave within the clawback
          window, and variable pay is usually pro-rated in the first year.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Fixed CTC"
            value={annualCtc}
            onChange={setAnnualCtc}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Joining bonus"
            value={joiningBonus}
            onChange={setJoiningBonus}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Clawback months"
            value={clawbackMonths}
            onChange={setClawbackMonths}
            inputMode="numeric"
          />
          <Field
            label="Variable / bonus (% of CTC)"
            value={bonusPercent}
            onChange={setBonusPercent}
            suffix="%"
            inputMode="decimal"
          />
          <Field
            label="Equity, annualised"
            value={equityAnnual}
            onChange={setEquityAnnual}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Relocation"
            value={relocation}
            onChange={setRelocation}
            suffix="₹"
            inputMode="decimal"
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>Enter the fixed CTC to total the package.</EmptyState>
      ) : (
        <ResultPanel
          title="Total compensation"
          show
          text={[
            `Year one cash: ${inr(result.yearOneCash)}`,
            `Year one total including equity paper value: ${inr(result.yearOneTotal)}`,
            `Steady state annual: ${inr(result.steadyStateAnnual)}`,
            "",
            ...result.components.map(
              (component) =>
                `${component.label}: ${inr(component.amount)}${component.recurring ? " (recurring)" : " (one-off)"}`,
            ),
            "",
            ...result.notes,
          ].join("\n")}
          filename="total-compensation"
        >
          <StatRow>
            <Stat
              label="Year one cash"
              value={inr(result.yearOneCash)}
              detail="Including one-offs"
              emphasis
            />
            <Stat
              label="Steady state"
              value={inr(result.steadyStateAnnual)}
              detail="From year two, excluding one-offs"
            />
            <Stat
              label="Year one total"
              value={inr(result.yearOneTotal)}
              detail="Including equity paper value"
            />
          </StatRow>

          <BreakdownTable
            caption="Components"
            head={["Component", "Amount"]}
            rows={result.components.map((component) => ({
              label: `${component.label}${component.recurring ? "" : " (one-off)"}`,
              value: inr(component.amount),
            }))}
            total={{ label: "Year one total", value: inr(result.yearOneTotal) }}
          />

          {result.notes.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RelocationTool() {
  const [currentCtc, setCurrentCtc] = useState("1200000");
  const [offeredCtc, setOfferedCtc] = useState("1500000");
  const [currentIndex, setCurrentIndex] = useState("100");
  const [newIndex, setNewIndex] = useState("120");

  const currentValue = parseAmount(currentCtc);
  const offeredValue = parseAmount(offeredCtc);
  const valid =
    currentValue !== null && offeredValue !== null && currentValue > 0;

  const result = valid
    ? relocationComparison({
        currentCtc: currentValue!,
        offeredCtc: offeredValue!,
        currentIndex: (parseNumber(currentIndex) ?? 100) / 100,
        newIndex: (parseNumber(newIndex) ?? 120) / 100,
      })
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Two cities</h2>
        <p className="qw-section-note">
          The cost index is yours to set — QUICKKIT has no city cost database,
          and inventing one would mislead you. Set your current city to 100 and
          the new city relative to it using your own rent, transport and food
          estimates.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Current CTC"
            value={currentCtc}
            onChange={setCurrentCtc}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Offered CTC"
            value={offeredCtc}
            onChange={setOfferedCtc}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Current city index"
            value={currentIndex}
            onChange={setCurrentIndex}
            inputMode="numeric"
            hint="100 = your baseline."
          />
          <Field
            label="New city index"
            value={newIndex}
            onChange={setNewIndex}
            inputMode="numeric"
            hint="120 means 20% more expensive."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>Enter both CTCs to compare purchasing power.</EmptyState>
      ) : (
        <ResultPanel
          title="Relocation comparison"
          show
          text={[
            `Nominal increase: ${inr(result.nominalIncrease)}`,
            `Real increase: ${inr(result.realIncrease)}`,
            `Break-even CTC: ${inr(result.breakEvenCtc)}`,
            "",
            result.verdict,
            "",
            ...result.notes,
          ].join("\n")}
          filename="relocation-comparison"
        >
          <StatRow>
            <Stat
              label="Real increase"
              value={inr(result.realIncrease)}
              detail="After the cost difference you entered"
              emphasis
            />
            <Stat
              label="Break-even CTC"
              value={inr(result.breakEvenCtc)}
              detail="Preserves today's purchasing power"
            />
            <Stat
              label="Nominal increase"
              value={inr(result.nominalIncrease)}
              detail="Before the cost adjustment"
            />
          </StatRow>

          <Notice tone={result.realIncrease >= 0 ? "success" : "warning"}>
            {result.verdict}
          </Notice>

          <Notice tone="info">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MarginalTool() {
  const [grossAnnual, setGrossAnnual] = useState("1500000");
  const [regime, setRegime] = useState("new");
  const [deductions, setDeductions] = useState("");

  const grossValue = parseAmount(grossAnnual);
  const valid = grossValue !== null && grossValue > 0;

  const result = valid
    ? marginalRate(grossValue!, {
        regime: regime as "new",
        deductions: parseAmount(deductions) ?? 0,
      })
    : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Salary and regime</h2>
        <p className="qw-section-note">
          The marginal rate is what the next ₹10,000 costs in tax. It is higher
          than the average rate, and it is the number that answers &quot;what
          will this bonus actually be worth?&quot;
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Annual gross salary"
            value={grossAnnual}
            onChange={setGrossAnnual}
            suffix="₹"
            inputMode="decimal"
          />
          <SelectField
            label="Tax regime"
            value={regime}
            onChange={setRegime}
            options={[
              { value: "new", label: "New regime" },
              { value: "old", label: "Old regime" },
            ]}
          />
          <Field
            label="Provable deductions"
            value={deductions}
            onChange={setDeductions}
            suffix="₹/yr"
            inputMode="decimal"
            disabled={regime === "new"}
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>Enter an annual gross salary.</EmptyState>
      ) : (
        <ResultPanel
          title="Marginal rate"
          show
          text={[
            `Average rate: ${(result.current * 100).toFixed(1)}%`,
            `Marginal rate: ${(result.onNext10000 * 100).toFixed(1)}%`,
            "",
            ...result.notes,
          ].join("\n")}
          filename="marginal-tax-rate"
        >
          <StatRow>
            <Stat
              label="Marginal rate"
              value={`${(result.onNext10000 * 100).toFixed(1)}%`}
              detail="On the next ₹10,000"
              emphasis
            />
            <Stat
              label="Average rate"
              value={`${(result.current * 100).toFixed(1)}%`}
              detail="Total tax ÷ total gross"
            />
            <Stat
              label="Kept from ₹10,000"
              value={inr(10_000 * (1 - result.onNext10000))}
              detail="After tax and cess"
            />
          </StatRow>

          <Notice tone="info">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

export { formatInput, parseAmount };
