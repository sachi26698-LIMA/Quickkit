"use client";

import { useState } from "react";
import {
  attendance,
  leaveBalance,
  leaveEncashment,
  lossOfPayDeduction,
  overtime,
  shiftDuration,
  weeklyHours,
} from "@/lib/tools/hr/attendance";
import { gratuity, fullAndFinal, inr } from "@/lib/tools/hr/payroll";
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
  "attendance" | "overtime" | "leave" | "gratuity" | "full-and-final" | "shift";

export default function AttendanceWorkspace({ mode }: { mode: Mode }) {
  switch (mode) {
    case "overtime":
      return <OvertimeTool />;
    case "leave":
      return <LeaveTool />;
    case "gratuity":
      return <GratuityTool />;
    case "full-and-final":
      return <FullAndFinalTool />;
    case "shift":
      return <ShiftTool />;
    default:
      return <AttendanceTool />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function AttendanceTool() {
  const [workingDays, setWorkingDays] = useState("26");
  const [present, setPresent] = useState("22");
  const [paidLeave, setPaidLeave] = useState("2");
  const [halfDays, setHalfDays] = useState("0");
  const [absent, setAbsent] = useState("2");
  const [monthlyWage, setMonthlyWage] = useState("45000");

  const nums = {
    workingDays: parseNumber(workingDays),
    present: parseNumber(present),
    paidLeave: parseNumber(paidLeave),
    halfDays: parseNumber(halfDays),
    absent: parseNumber(absent),
    wage: parseAmount(monthlyWage),
  };

  const errors: Record<string, string> = {};
  if (nums.workingDays === null || nums.workingDays <= 0)
    errors.workingDays = "Enter the month's working days (typically 22–26).";
  if (nums.present === null || nums.present < 0)
    errors.present = "Enter days present.";
  if (
    nums.workingDays !== null &&
    nums.present !== null &&
    nums.present > nums.workingDays
  ) {
    errors.present = "Present days cannot exceed working days.";
  }

  const valid = Object.keys(errors).length === 0;
  const result = valid
    ? attendance({
        workingDays: nums.workingDays!,
        presentDays: nums.present!,
        paidLeaveDays: nums.paidLeave ?? 0,
        halfDays: nums.halfDays ?? 0,
        absentDays: nums.absent ?? 0,
      })
    : null;

  const deduction =
    result && nums.wage !== null
      ? lossOfPayDeduction({
          monthlyWage: nums.wage,
          workingDays: nums.workingDays!,
          lopDays: result.lopDays,
        })
      : null;

  const reset = () => {
    setWorkingDays("26");
    setPresent("22");
    setPaidLeave("2");
    setHalfDays("0");
    setAbsent("2");
    setMonthlyWage("45000");
  };

  const text = result
    ? [
        "Attendance summary",
        `Working days: ${nums.workingDays}`,
        `Present: ${nums.present}`,
        `Paid leave: ${nums.paidLeave ?? 0}`,
        `Half days: ${nums.halfDays ?? 0}`,
        `Absent: ${nums.absent ?? 0}`,
        "",
        `Attendance: ${result.attendancePercent.toFixed(2)}%`,
        `Present only: ${result.rawPresentPercent.toFixed(2)}%`,
        `Payable days: ${result.payableDays}`,
        `Loss of pay days: ${result.lopDays}`,
        deduction ? `Salary deduction: ${inr(deduction.deduction)}` : "",
        deduction ? `Net payable: ${inr(deduction.netPayable)}` : "",
        "",
        ...result.notes,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Attendance month</h2>
        <p className="qw-section-note">
          Enter the days actually recorded. Working days are the denominator —
          count declared holidays separately, because they are paid and should
          not dilute the percentage.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Working days in the month"
            value={workingDays}
            onChange={setWorkingDays}
            inputMode="numeric"
            error={errors.workingDays}
          />
          <Field
            label="Present days"
            value={present}
            onChange={setPresent}
            inputMode="numeric"
            error={errors.present}
          />
          <Field
            label="Paid leave days"
            value={paidLeave}
            onChange={setPaidLeave}
            inputMode="numeric"
          />
          <Field
            label="Half days"
            value={halfDays}
            onChange={setHalfDays}
            inputMode="numeric"
            hint="Each half day counts as 0.5 payable days."
          />
          <Field
            label="Absent days (unpaid)"
            value={absent}
            onChange={setAbsent}
            inputMode="numeric"
          />
          <Field
            label="Monthly wage"
            value={monthlyWage}
            onChange={setMonthlyWage}
            suffix="₹"
            inputMode="decimal"
            hint="Used to convert loss-of-pay days into a deduction. Leave it blank for percentages only."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Fix the highlighted fields to see the attendance and loss-of-pay
          figures.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Attendance result"
          show
          text={text}
          filename="attendance-summary"
          onReset={reset}
          csvRows={[
            ["Component", "Days"],
            ...result.breakdown.map((row) => [row.label, row.days]),
          ]}
        >
          <StatRow>
            <Stat
              label="Attendance"
              value={`${result.attendancePercent.toFixed(1)}%`}
              detail="Present + paid leave + half days − late penalty, over working days"
              emphasis
            />
            <Stat
              label="Present only"
              value={`${result.rawPresentPercent.toFixed(1)}%`}
              detail="Days actually worked"
            />
            <Stat
              label="Payable days"
              value={formatInput(result.payableDays)}
              detail="Basis for salary"
            />
            <Stat
              label="Loss of pay"
              value={`${formatInput(result.lopDays)} day${result.lopDays === 1 ? "" : "s"}`}
              detail={
                deduction
                  ? `${inr(deduction.deduction)} deducted`
                  : "Enter a wage to see the deduction"
              }
            />
          </StatRow>

          <div
            className="qw-meter"
            data-tone={
              result.attendancePercent >= 95
                ? "ok"
                : result.attendancePercent >= 85
                  ? "warn"
                  : "bad"
            }
          >
            <div
              className="qw-meter-fill"
              style={{ width: `${Math.min(100, result.attendancePercent)}%` }}
            />
          </div>
          <p className="qw-hint">
            Two percentages matter and they are not the same: attendance counts
            paid leave as available, present-only does not. Payroll must use the
            second.
          </p>

          <BreakdownTable
            caption="Day count"
            head={["Item", "Days"]}
            rows={result.breakdown.map((row) => ({
              label: row.label,
              value: formatInput(row.days),
              tone: row.days < 0 ? "deduction" : "neutral",
            }))}
            total={{
              label: "Payable days",
              value: formatInput(result.payableDays),
            }}
          />

          {deduction ? (
            <BreakdownTable
              caption="Salary effect"
              head={["Item", "Amount"]}
              rows={[
                { label: "Monthly wage", value: inr(nums.wage!) },
                {
                  label: `Day rate (wage ÷ ${nums.workingDays})`,
                  value: inr(deduction.dayRate),
                },
                {
                  label: `Loss of pay (${formatInput(result.lopDays)} days)`,
                  value: `−${inr(deduction.deduction)}`,
                  tone: "deduction",
                },
              ]}
              total={{ label: "Net payable", value: inr(deduction.netPayable) }}
            />
          ) : null}

          {result.notes.length > 0 ? (
            <div className="qw-prose" style={{ marginTop: 12 }}>
              <ul>
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function OvertimeTool() {
  const [wage, setWage] = useState("30000");
  const [days, setDays] = useState("26");
  const [hours, setHours] = useState("8");
  const [otHours, setOtHours] = useState("10");
  const [multiplier, setMultiplier] = useState("2");

  const wageValue = parseAmount(wage);
  const daysValue = parseNumber(days);
  const hoursValue = parseNumber(hours);
  const otValue = parseNumber(otHours);
  const multiplierValue = parseNumber(multiplier);

  const errors: Record<string, string> = {};
  if (wageValue === null || wageValue <= 0)
    errors.wage = "Enter the monthly wage used for overtime.";
  if (daysValue === null || daysValue <= 0 || daysValue > 31)
    errors.days = "Working days must be 1–31.";
  if (hoursValue === null || hoursValue <= 0 || hoursValue > 24)
    errors.hours = "Hours per day must be 1–24.";
  if (otValue === null || otValue < 0)
    errors.ot = "Enter overtime hours (0 is allowed).";
  if (multiplierValue === null || multiplierValue < 1)
    errors.multiplier = "Multiplier must be at least 1.";

  const valid = Object.keys(errors).length === 0;
  const result = valid
    ? overtime({
        monthlyWage: wageValue!,
        workingDays: daysValue!,
        hoursPerDay: hoursValue!,
        overtimeHours: otValue!,
        multiplier: multiplierValue!,
      })
    : null;

  const reset = () => {
    setWage("30000");
    setDays("26");
    setHours("8");
    setOtHours("10");
    setMultiplier("2");
  };

  const text = result
    ? [
        "Overtime calculation",
        `Monthly wage: ${inr(wageValue!)}`,
        `Hourly rate: ${inr(result.hourlyRate, 2)}`,
        `Multiplier: ${multiplierValue}×`,
        `Overtime rate: ${inr(result.overtimeRate, 2)} per hour`,
        `Overtime hours: ${otValue}`,
        `Overtime pay: ${inr(result.overtimePay)}`,
        `Total payable: ${inr(result.totalPay)}`,
        "",
        ...result.notes,
      ].join("\n")
    : "";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Overtime for the month</h2>
        <p className="qw-section-note">
          The hourly rate is monthly wage ÷ (working days × hours per day). The
          multiplier is yours to choose, because the statutory position depends
          on which Act covers your establishment — the notes say which applies.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Monthly wage"
            value={wage}
            onChange={setWage}
            suffix="₹"
            inputMode="decimal"
            error={errors.wage}
          />
          <Field
            label="Contracted working days"
            value={days}
            onChange={setDays}
            inputMode="numeric"
            error={errors.days}
          />
          <Field
            label="Contracted hours per day"
            value={hours}
            onChange={setHours}
            inputMode="decimal"
            error={errors.hours}
          />
          <Field
            label="Overtime hours this month"
            value={otHours}
            onChange={setOtHours}
            inputMode="decimal"
            error={errors.ot}
          />
          <SelectField
            label="Multiplier on the ordinary rate"
            value={multiplier}
            onChange={setMultiplier}
            options={[
              {
                value: "2",
                label: "2× — Factories Act and Code on Wages basis",
              },
              { value: "1.5", label: "1.5× — common company policy" },
              { value: "1", label: "1× — no premium (rarely lawful)" },
            ]}
            error={errors.multiplier}
            hint="The statutory requirement is generally twice the ordinary rate."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Fix the highlighted fields to calculate overtime.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Overtime result"
          show
          text={text}
          filename="overtime-calculation"
          onReset={reset}
        >
          <StatRow>
            <Stat
              label="Overtime pay"
              value={inr(result.overtimePay)}
              detail={`${otValue} hours at ${inr(result.overtimeRate, 2)}`}
              emphasis
            />
            <Stat
              label="Hourly rate"
              value={inr(result.hourlyRate, 2)}
              detail="Ordinary rate"
            />
            <Stat
              label="Overtime rate"
              value={inr(result.overtimeRate, 2)}
              detail={`${multiplierValue}× ordinary`}
            />
            <Stat
              label="Total payable"
              value={inr(result.totalPay)}
              detail="Wage plus overtime"
            />
          </StatRow>

          {result.notes.length > 0 ? (
            <Notice
              tone={
                result.notes.some((note) => note.includes("twice"))
                  ? "warning"
                  : "info"
              }
            >
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <Disclosure summary="How the statutory basis differs">
            <p>
              <strong>Factories Act, 1948.</strong> Overtime is payable at twice
              the ordinary rate of wages. A worker may not work more than 60
              hours in a week including overtime, and total overtime is capped
              quarterly.
            </p>
            <p>
              <strong>Code on Wages, 2019.</strong> The ordinary rate is
              computed from total remuneration divided by hours actually worked
              in the month, and overtime is twice that. Because the divisor is
              actual hours, a month with more overtime slightly lowers the base
              rate — the effect is small but real.
            </p>
            <p>
              <strong>Company policy at 1.5×.</strong> Lawful only where it is
              at least the statutory minimum for that establishment, or where
              the contract is genuinely more favourable overall. It is common,
              and it is worth checking rather than assuming.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function LeaveTool() {
  const [entitlement, setEntitlement] = useState("18");
  const [method, setMethod] = useState<"monthly" | "annual">("monthly");
  const [months, setMonths] = useState("8");
  const [taken, setTaken] = useState("5");
  const [opening, setOpening] = useState("2");
  const [cap, setCap] = useState("10");
  const [encashable, setEncashable] = useState(false);
  const [basicDa, setBasicDa] = useState("30000");

  const errors: Record<string, string> = {};
  const entitlementValue = parseNumber(entitlement);
  const monthsValue = parseNumber(months);
  const takenValue = parseNumber(taken);
  if (entitlementValue === null || entitlementValue < 0)
    errors.entitlement = "Enter the annual entitlement in days.";
  if (monthsValue === null || monthsValue < 0 || monthsValue > 12)
    errors.months = "Months elapsed must be 0–12.";
  if (takenValue === null || takenValue < 0)
    errors.taken = "Enter leave already taken.";

  const valid = Object.keys(errors).length === 0;
  const result = valid
    ? leaveBalance({
        annualEntitlement: entitlementValue!,
        method,
        monthsElapsed: monthsValue!,
        taken: takenValue!,
        openingBalance: parseNumber(opening) ?? 0,
        maxCarryForward: parseNumber(cap) ?? 0,
        encashable,
      })
    : null;

  const encashment =
    result && encashable && parseAmount(basicDa) !== null
      ? leaveEncashment({
          monthlyBasicDa: parseAmount(basicDa)!,
          workingDays: 30,
          days: result.encashmentValueDays,
        })
      : null;

  const text = result
    ? [
        "Leave balance",
        `Entitlement: ${entitlementValue} days a year (${method} accrual)`,
        `Accrued to date: ${result.accrued} days`,
        `Opening balance: ${parseNumber(opening) ?? 0} days`,
        `Taken: ${takenValue} days`,
        `Available: ${result.available} days`,
        `Balance: ${result.balance} days`,
        `Projected year end: ${result.projectedYearEnd} days`,
        `Carry forward after cap: ${result.carryForwardAfterCap} days`,
        `Forfeited: ${result.forfeited} days`,
        encashment ? `Encashment value: ${inr(encashment.amount)}` : "",
        "",
        ...result.notes,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Leave year to date</h2>
        <p className="qw-section-note">
          India has no single national annual-leave entitlement, so the
          entitlement is yours to enter. The accrual method changes the number,
          and both are supported.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Annual entitlement (days)"
            value={entitlement}
            onChange={setEntitlement}
            inputMode="decimal"
            error={errors.entitlement}
          />
          <SelectField
            label="Accrual method"
            value={method}
            onChange={(value) => setMethod(value as "monthly" | "annual")}
            options={[
              { value: "monthly", label: "Monthly — 1/12 accrues each month" },
              { value: "annual", label: "Annual — full credit at year start" },
            ]}
          />
          <Field
            label="Months elapsed this year"
            value={months}
            onChange={setMonths}
            inputMode="numeric"
            error={errors.months}
          />
          <Field
            label="Leave already taken"
            value={taken}
            onChange={setTaken}
            inputMode="decimal"
            error={errors.taken}
          />
          <Field
            label="Opening balance carried in"
            value={opening}
            onChange={setOpening}
            inputMode="decimal"
          />
          <Field
            label="Maximum carry-forward (days)"
            value={cap}
            onChange={setCap}
            inputMode="decimal"
            hint="Set 0 if the policy does not allow carry-forward."
          />
          <Field
            label="Monthly basic + DA"
            value={basicDa}
            onChange={setBasicDa}
            suffix="₹"
            inputMode="decimal"
            hint="Only used when the policy allows encashment."
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <SelectField
            label="Encashment"
            value={encashable ? "yes" : "no"}
            onChange={(value) => setEncashable(value === "yes")}
            options={[
              { value: "no", label: "Unused leave lapses (no cash value)" },
              { value: "yes", label: "Unused leave can be encashed" },
            ]}
          />
        </div>
      </div>

      {!result ? (
        <EmptyState>
          Fix the highlighted fields to calculate the balance.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Leave result"
          show
          text={text}
          filename="leave-balance"
          onReset={() => {
            setEntitlement("18");
            setMonths("8");
            setTaken("5");
            setOpening("2");
            setCap("10");
            setEncashable(false);
          }}
        >
          <StatRow>
            <Stat
              label="Available"
              value={`${formatInput(result.available)} days`}
              detail={`${formatInput(result.accrued)} accrued + opening`}
              emphasis
            />
            <Stat
              label="Balance"
              value={`${formatInput(result.balance)} days`}
              detail="Available minus taken"
            />
            <Stat
              label="Projected year end"
              value={`${formatInput(result.projectedYearEnd)} days`}
              detail="If no further leave is taken"
            />
            <Stat
              label="Carry forward"
              value={`${formatInput(result.carryForwardAfterCap)} days`}
              detail={
                result.forfeited > 0
                  ? `${formatInput(result.forfeited)} will lapse`
                  : "Nothing forfeited"
              }
            />
          </StatRow>

          {encashment ? (
            <BreakdownTable
              caption="Encashment value"
              head={["Item", "Amount"]}
              rows={[
                {
                  label: "Day rate (basic + DA ÷ 30)",
                  value: inr(encashment.dayRate),
                },
                {
                  label: `Days encashed`,
                  value: formatInput(encashment.daysEncashed),
                },
              ]}
              total={{ label: "Encashment", value: inr(encashment.amount) }}
            />
          ) : null}

          {result.notes.length > 0 ? (
            <div className="qw-prose" style={{ marginTop: 12 }}>
              <ul>
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function GratuityTool() {
  const [basicDa, setBasicDa] = useState("30000");
  const [years, setYears] = useState("7");
  const [extraMonths, setExtraMonths] = useState("8");

  const basicValue = parseAmount(basicDa);
  const yearsValue = parseNumber(years);
  const monthsValue = parseNumber(extraMonths);

  const errors: Record<string, string> = {};
  if (basicValue === null || basicValue <= 0)
    errors.basic = "Enter the last drawn monthly basic + DA.";
  if (yearsValue === null || yearsValue < 0)
    errors.years = "Enter completed years of service.";

  const valid = Object.keys(errors).length === 0;
  const result = valid
    ? gratuity({
        monthlyBasicDa: basicValue!,
        years: yearsValue!,
        months: monthsValue ?? 0,
      })
    : null;

  const text = result
    ? [
        "Gratuity calculation",
        `Last drawn monthly basic + DA: ${inr(basicValue!)}`,
        `Completed years: ${yearsValue}`,
        `Months beyond the last full year: ${monthsValue ?? 0}`,
        `Years counted: ${result.completedYears}`,
        `Gratuity: ${inr(result.amount)}`,
        result.cappedAtStatutoryLimit
          ? "Capped at the ₹20,00,000 statutory tax-exempt limit."
          : "",
        result.eligible
          ? "Eligible: five or more years of continuous service."
          : "Not eligible: gratuity requires five completed years.",
        "",
        "15/26 × last drawn basic + DA × completed years (part of a year over six months counts as a full year).",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">
          Gratuity under the Payment of Gratuity Act
        </h2>
        <p className="qw-section-note">
          Fifteen twenty-sixths of last drawn basic plus dearness allowance for
          each completed year. A part of a year beyond six months counts as a
          full year.
        </p>
        <FieldGrid columns={3}>
          <Field
            label="Monthly basic + DA"
            value={basicDa}
            onChange={setBasicDa}
            suffix="₹"
            inputMode="decimal"
            error={errors.basic}
          />
          <Field
            label="Completed years"
            value={years}
            onChange={setYears}
            inputMode="numeric"
            error={errors.years}
          />
          <Field
            label="Extra months in the final year"
            value={extraMonths}
            onChange={setExtraMonths}
            inputMode="numeric"
            hint="Six or more months counts as a further full year."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Fix the highlighted fields to calculate gratuity.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Gratuity result"
          show
          text={text}
          filename="gratuity-calculation"
          onReset={() => {
            setBasicDa("30000");
            setYears("7");
            setExtraMonths("8");
          }}
        >
          <StatRow>
            <Stat
              label="Gratuity payable"
              value={inr(result.amount)}
              detail={`${result.completedYears} years counted`}
              emphasis
            />
            <Stat
              label="Per year"
              value={inr((basicValue! * 15) / 26)}
              detail="15/26 of monthly basic + DA"
            />
            <Stat
              label="Years counted"
              value={String(result.completedYears)}
              detail={`${yearsValue} completed + rounding`}
            />
            <Stat
              label="Eligibility"
              value={result.eligible ? "Eligible" : "Not eligible"}
              detail={
                result.eligible
                  ? "Five or more years of continuous service"
                  : "Requires five completed years"
              }
            />
          </StatRow>

          {result.cappedAtStatutoryLimit ? (
            <Notice tone="warning">
              The computed amount exceeds ₹20,00,000, which is the statutory
              ceiling for tax exemption. The amount shown is capped there; an
              employer may pay more, but the excess is taxable.
            </Notice>
          ) : null}

          <BreakdownTable
            caption="How it was computed"
            head={["Step", "Value"]}
            rows={[
              {
                label: "Last drawn monthly basic + DA",
                value: inr(basicValue!),
              },
              {
                label: "Multiplied by 15/26",
                value: inr((basicValue! * 15) / 26),
              },
              { label: "Years counted", value: String(result.completedYears) },
            ]}
            total={{ label: "Gratuity", value: inr(result.amount) }}
          />

          <Disclosure summary="When gratuity is not payable">
            <p>
              Five completed years of continuous service are required, with
              exceptions for death or disablement, where the requirement does
              not apply. Continuous service excludes unauthorised absence but
              counts approved leave, and the Act treats a year with at least 240
              days worked (or 190 in some seasonal establishments) as
              continuous.
            </p>
            <p>
              Gratuity is payable within 30 days of it becoming due, with
              interest owed after that. The employer cannot withhold it to
              recover a disputed amount.
            </p>
            <p>
              Employers not covered by the Act may still pay gratuity under a
              contract or a scheme; the formula there can differ, including a
              lower or higher ceiling.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FullAndFinalTool() {
  const [gross, setGross] = useState("60000");
  const [basicDa, setBasicDa] = useState("28000");
  const [daysWorked, setDaysWorked] = useState("12");
  const [daysInMonth, setDaysInMonth] = useState("30");
  const [leaveDays, setLeaveDays] = useState("9");
  const [years, setYears] = useState("4");
  const [months, setMonths] = useState("7");
  const [noticeShortfall, setNoticeShortfall] = useState("15");
  const [bonus, setBonus] = useState("0");

  const grossValue = parseAmount(gross);
  const basicValue = parseAmount(basicDa);
  const workedValue = parseNumber(daysWorked);
  const inMonthValue = parseNumber(daysInMonth);
  const leaveValue = parseNumber(leaveDays);
  const yearsValue = parseNumber(years);
  const shortfallValue = parseNumber(noticeShortfall);

  const errors: Record<string, string> = {};
  if (grossValue === null || grossValue <= 0)
    errors.gross = "Enter the monthly gross.";
  if (basicValue === null || basicValue < 0)
    errors.basic = "Enter monthly basic + DA (used for leave encashment).";
  if (workedValue === null || workedValue < 0)
    errors.worked = "Enter days worked in the final month.";
  if (inMonthValue === null || inMonthValue <= 0)
    errors.inMonth = "Enter the number of days in the final month.";

  const valid = Object.keys(errors).length === 0;
  const result = valid
    ? fullAndFinal({
        monthlyGross: grossValue!,
        monthlyBasicDa: basicValue!,
        daysWorkedInFinalMonth: workedValue!,
        daysInFinalMonth: inMonthValue!,
        leaveBalanceDays: leaveValue ?? 0,
        yearsOfService: yearsValue ?? 0,
        monthsOfService: (months ?? 0) ? (parseNumber(months) ?? 0) : 0,
        noticeShortfallDays: shortfallValue ?? 0,
        bonus: parseAmount(bonus) ?? 0,
      })
    : null;

  const text = result
    ? [
        "Full and final settlement",
        "",
        ...result.lines.map(
          (line) =>
            `${line.kind === "deduction" ? "−" : ""}${line.label}: ${inr(line.amount)}`,
        ),
        "",
        `Gross payable: ${inr(result.grossPayable)}`,
        `Deductions: ${inr(result.totalDeductions)}`,
        `Net settlement: ${inr(result.netSettlement)}`,
        "",
        result.gratuityEligible
          ? "Gratuity included: five or more years of service."
          : "No gratuity: fewer than five completed years.",
      ].join("\n")
    : "";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Final month and settlement</h2>
        <p className="qw-section-note">
          Everything owed on the last working day, and everything recoverable.
          Leave encashment uses the basic + DA day rate; notice recovery
          typically does too, which is why both are asked for separately from
          gross.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Monthly gross"
            value={gross}
            onChange={setGross}
            suffix="₹"
            inputMode="decimal"
            error={errors.gross}
          />
          <Field
            label="Monthly basic + DA"
            value={basicDa}
            onChange={setBasicDa}
            suffix="₹"
            inputMode="decimal"
            error={errors.basic}
            hint="Used for leave encashment and notice recovery."
          />
          <Field
            label="Days worked in the final month"
            value={daysWorked}
            onChange={setDaysWorked}
            inputMode="numeric"
            error={errors.worked}
          />
          <Field
            label="Days in that month"
            value={daysInMonth}
            onChange={setDaysInMonth}
            inputMode="numeric"
            error={errors.inMonth}
          />
          <Field
            label="Leave balance (days)"
            value={leaveDays}
            onChange={setLeaveDays}
            inputMode="decimal"
          />
          <Field
            label="Bonus or incentive owed"
            value={bonus}
            onChange={setBonus}
            suffix="₹"
            inputMode="decimal"
          />
          <Field
            label="Completed years of service"
            value={years}
            onChange={setYears}
            inputMode="numeric"
          />
          <Field
            label="Extra months in the final year"
            value={months}
            onChange={setMonths}
            inputMode="numeric"
          />
          <Field
            label="Notice shortfall (days)"
            value={noticeShortfall}
            onChange={setNoticeShortfall}
            inputMode="numeric"
            hint="Days of notice required minus days served. Enter 0 if the full notice was served."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Fix the highlighted fields to calculate the settlement.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Full and final settlement"
          show
          text={text}
          filename="full-and-final-settlement"
          onReset={() => {
            setGross("60000");
            setBasicDa("28000");
            setDaysWorked("12");
            setDaysInMonth("30");
            setLeaveDays("9");
            setYears("4");
            setMonths("7");
            setNoticeShortfall("15");
            setBonus("0");
          }}
        >
          <StatRow>
            <Stat
              label="Net settlement"
              value={inr(result.netSettlement)}
              detail="Gross payable minus deductions"
              emphasis
            />
            <Stat
              label="Gross payable"
              value={inr(result.grossPayable)}
              detail="Salary, leave, gratuity, bonus"
            />
            <Stat
              label="Deductions"
              value={inr(result.totalDeductions)}
              detail="Mostly notice recovery"
            />
            <Stat
              label="Gratuity"
              value={inr(result.gratuityAmount)}
              detail={
                result.gratuityEligible
                  ? "Five or more years"
                  : "Not eligible before five years"
              }
            />
          </StatRow>

          <BreakdownTable
            caption="Line items"
            head={["Item", "Amount"]}
            rows={result.lines.map((line) => ({
              label: line.label,
              value:
                line.kind === "deduction"
                  ? `−${inr(line.amount)}`
                  : inr(line.amount),
              tone: line.kind === "deduction" ? "deduction" : "neutral",
            }))}
            total={{
              label: "Net settlement",
              value: inr(result.netSettlement),
            }}
          />

          <Notice tone="info">
            Settlement is subject to tax in the year it is paid, and the tax
            treatment of leave encashment and gratuity differs. Add the taxable
            parts to your income rather than treating the total as received.
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ShiftTool() {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [breakMinutes, setBreakMinutes] = useState("45");
  const [daysPerWeek, setDaysPerWeek] = useState("5");

  const shift = {
    name: "Shift",
    start,
    end,
    breakMinutes: parseNumber(breakMinutes) ?? 0,
  };
  const duration = shiftDuration(shift);
  const hoursPerDay = duration / 60;
  const week = weeklyHours([shift], parseNumber(daysPerWeek) ?? 5);
  const valid = duration > 0;

  const text = valid
    ? [
        "Shift duration",
        `Start: ${start}`,
        `End: ${end}`,
        `Break: ${breakMinutes} minutes`,
        `Paid hours: ${hoursPerDay.toFixed(2)}`,
        `Weekly hours at ${daysPerWeek} days: ${week.toFixed(2)}`,
        week > 48
          ? "Above the 48-hour weekly limit."
          : "Within the 48-hour weekly limit.",
      ].join("\n")
    : "";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Shift timing</h2>
        <p className="qw-section-note">
          Overnight shifts are handled: if the end time is earlier than the
          start, the shift is treated as crossing midnight and the break is
          subtracted from the paid duration.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Start time"
            value={start}
            onChange={setStart}
            placeholder="09:00"
            hint="24-hour HH:MM."
          />
          <Field
            label="End time"
            value={end}
            onChange={setEnd}
            placeholder="18:00"
            hint="Earlier than start means an overnight shift."
          />
          <Field
            label="Unpaid break (minutes)"
            value={breakMinutes}
            onChange={setBreakMinutes}
            inputMode="numeric"
          />
          <Field
            label="Days per week"
            value={daysPerWeek}
            onChange={setDaysPerWeek}
            inputMode="numeric"
          />
        </FieldGrid>
      </div>

      {!valid ? (
        <EmptyState>
          Enter times as HH:MM. A zero-length shift cannot be calculated.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Shift result"
          show
          text={text}
          filename="shift-duration"
        >
          <StatRow>
            <Stat
              label="Paid hours per day"
              value={hoursPerDay.toFixed(2)}
              detail={`${duration} minutes after break`}
              emphasis
            />
            <Stat
              label="Weekly hours"
              value={week.toFixed(2)}
              detail={`${daysPerWeek} days a week`}
            />
            <Stat
              label="Statutory position"
              value={week > 48 ? "Above 48" : "Within 48"}
              detail="Factories Act weekly limit"
            />
          </StatRow>
          {week > 48 ? (
            <Notice tone="warning">
              A schedule of {daysPerWeek} days at {hoursPerDay.toFixed(1)} hours
              is {week.toFixed(1)} hours a week, above the 48-hour weekly limit.
              Overtime rules and rest-day requirements apply.
            </Notice>
          ) : null}
        </ResultPanel>
      )}
    </>
  );
}
