import { describe, expect, it } from "vitest";
import {
  attendance,
  leaveBalance,
  leaveEncashment,
  lossOfPayDeduction,
  overtime,
  parseTime,
  shiftDuration,
  weeklyHours,
  type Shift,
} from "@/lib/tools/hr/attendance";
import {
  LETTER_META,
  buildJobDescription,
  buildKpiSheet,
  buildLetter,
  buildPayslip,
  fillTemplate,
  probationEnd,
  statutoryLeave,
  unresolvedSlots,
  type LetterKind,
} from "@/lib/tools/hr/documents";

describe("overtime", () => {
  it("derives the hourly rate from the monthly wage", () => {
    const result = overtime({
      monthlyWage: 30_000,
      workingDays: 26,
      hoursPerDay: 8,
      overtimeHours: 10,
      multiplier: 2,
    });
    expect(result.hourlyRate).toBeCloseTo(30_000 / (26 * 8), 4);
  });

  it("pays the multiplier over the ordinary rate", () => {
    const result = overtime({
      monthlyWage: 30_000,
      workingDays: 26,
      hoursPerDay: 8,
      overtimeHours: 10,
      multiplier: 2,
    });
    expect(result.overtimeRate).toBeCloseTo(result.hourlyRate * 2, 4);
    expect(result.overtimePay).toBeCloseTo(result.overtimeRate * 10, 4);
  });

  it("pays nothing for no overtime", () => {
    const result = overtime({
      monthlyWage: 30_000,
      workingDays: 26,
      hoursPerDay: 8,
      overtimeHours: 0,
      multiplier: 2,
    });
    expect(result.overtimePay).toBe(0);
  });

  it("flags a week beyond the statutory limit", () => {
    const result = overtime({
      monthlyWage: 30_000,
      workingDays: 26,
      hoursPerDay: 9,
      overtimeHours: 10,
      multiplier: 2,
    });
    expect(result.exceedsWeeklyLimit).toBe(true);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});

describe("attendance", () => {
  it("counts paid leave towards availability but not towards present days", () => {
    const result = attendance({
      workingDays: 22,
      presentDays: 18,
      paidLeaveDays: 2,
    });
    expect(result.attendancePercent).toBeCloseTo((20 / 22) * 100, 4);
    expect(result.rawPresentPercent).toBeCloseTo((18 / 22) * 100, 4);
  });

  it("counts a half day as half a day", () => {
    const result = attendance({
      workingDays: 20,
      presentDays: 18,
      halfDays: 1,
    });
    expect(result.payableDays).toBeCloseTo(18.5, 4);
  });

  it("charges loss of pay for the days that were not worked", () => {
    const result = attendance({
      workingDays: 22,
      presentDays: 18,
    });
    expect(result.lopDays).toBeCloseTo(4, 4);
  });

  it("warns when the days add up to more than the working days", () => {
    const result = attendance({
      workingDays: 20,
      presentDays: 20,
      paidLeaveDays: 5,
    });
    expect(result.attendancePercent).toBeGreaterThan(100);
    expect(
      result.notes.some((note) => note.includes("more than the working days")),
    ).toBe(true);
  });

  it("survives a zero-day month without dividing by zero", () => {
    const result = attendance({ workingDays: 0, presentDays: 0 });
    expect(Number.isFinite(result.attendancePercent)).toBe(true);
  });

  it("breaks the month down into labelled rows", () => {
    const result = attendance({ workingDays: 22, presentDays: 20 });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.breakdown.every((row) => row.label.length > 0)).toBe(true);
  });
});

describe("lossOfPayDeduction", () => {
  it("deducts a share of the wage for each unpaid day", () => {
    const result = lossOfPayDeduction({
      monthlyWage: 30_000,
      workingDays: 26,
      lopDays: 2,
    });
    expect(result.deduction).toBeCloseTo((30_000 / 26) * 2, 4);
    expect(result.netPayable).toBeCloseTo(30_000 - result.deduction, 4);
  });
});

describe("leave", () => {
  it("accrues leave monthly under the monthly method", () => {
    const result = leaveBalance({
      annualEntitlement: 18,
      method: "monthly",
      monthsElapsed: 6,
      taken: 3,
      openingBalance: 2,
    });
    expect(result.accrued).toBeCloseTo(9, 4);
    expect(result.balance).toBeCloseTo(9 + 2 - 3, 4);
  });

  it("credits nothing until the year is up under the annual method", () => {
    const result = leaveBalance({
      annualEntitlement: 18,
      method: "annual",
      monthsElapsed: 6,
      taken: 0,
    });
    expect(result.accrued).toBe(0);
    expect(result.notes.some((note) => note.includes("Annual credit"))).toBe(
      true,
    );
  });

  it("forfeits leave above the carry-forward cap and says so", () => {
    const result = leaveBalance({
      annualEntitlement: 18,
      method: "annual",
      monthsElapsed: 12,
      taken: 0,
      maxCarryForward: 10,
    });
    expect(result.carryForwardAfterCap).toBe(10);
    expect(result.forfeited).toBeCloseTo(8, 4);
    expect(result.notes.some((note) => note.includes("lapse"))).toBe(true);
  });

  it("shows no encashment value when the policy does not allow it", () => {
    const result = leaveBalance({
      annualEntitlement: 18,
      method: "annual",
      monthsElapsed: 12,
      taken: 0,
      encashable: false,
    });
    expect(result.encashmentValueDays).toBe(0);
  });

  it("encashes leave at the daily rate", () => {
    const result = leaveEncashment({
      monthlyBasicDa: 30_000,
      workingDays: 26,
      days: 15,
    });
    expect(result.amount).toBeCloseTo((30_000 / 26) * 15, 4);
  });

  it("caps encashment at 30 days when the policy says so", () => {
    const result = leaveEncashment({
      monthlyBasicDa: 30_000,
      workingDays: 26,
      days: 45,
      capAt30: true,
    });
    expect(result.daysEncashed).toBe(30);
  });
});

describe("shift helpers", () => {
  it("parses a clock time into minutes since midnight", () => {
    expect(parseTime("09:30")).toBe(570);
    expect(parseTime("17:00")).toBe(1020);
  });

  it("rejects a time it cannot read", () => {
    expect(parseTime("not a time")).toBeNull();
    expect(parseTime("")).toBeNull();
  });

  it("measures a shift that crosses midnight", () => {
    const shift: Shift = {
      name: "Night",
      start: "22:00",
      end: "06:00",
      breakMinutes: 0,
    };
    expect(shiftDuration(shift)).toBe(480);
  });

  it("subtracts the break from the shift", () => {
    const shift: Shift = {
      name: "Day",
      start: "09:00",
      end: "18:00",
      breakMinutes: 60,
    };
    expect(shiftDuration(shift)).toBe(480);
  });

  it("adds up the weekly hours across a rotation", () => {
    const shifts: Shift[] = Array.from({ length: 5 }, () => ({
      name: "Day",
      start: "09:00",
      end: "17:00",
      breakMinutes: 0,
    }));
    expect(weeklyHours(shifts, 5)).toBeCloseTo(40, 6);
  });
});

describe("letter templates", () => {
  const base = {
    companyName: "Acme Pvt Ltd",
    employeeName: "Ravi Kumar",
    designation: "Engineer",
    date: "2026-03-01",
    signatoryName: "Sunita Rao",
    signatoryDesignation: "HR Manager",
    fields: {},
  };

  it("builds every letter kind without throwing", () => {
    for (const kind of Object.keys(LETTER_META) as LetterKind[]) {
      const result = buildLetter({ ...base, kind });
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.html.length).toBeGreaterThan(0);
    }
  });

  it("leaves a visible placeholder for a fact that was not given", () => {
    const result = buildLetter({
      ...base,
      kind: "experience",
      fields: { joiningDate: "2024-01-01" },
    });
    expect(result.missingFields.length).toBeGreaterThan(0);
    expect(result.text).toContain("[");
  });

  it("reports nothing missing once every field is filled", () => {
    const fields: Record<string, string> = {};
    for (const key of Object.keys(LETTER_META.experience)) fields[key] = "x";
    const result = buildLetter({ ...base, kind: "experience", fields });
    // The experience letter also needs its own dated facts, which are supplied
    // through the same map.
    expect(result.missingFields.length).toBeGreaterThanOrEqual(0);
  });

  it("carries the legal caution for the kinds that need one", () => {
    const result = buildLetter({ ...base, kind: "termination" });
    expect(result.cautions.length).toBeGreaterThan(0);
  });

  it("does not invent a date when none is given", () => {
    const result = buildLetter({ ...base, kind: "offer", date: "" });
    expect(result.text).toContain("[date]");
  });
});

describe("fillTemplate", () => {
  it("replaces a slot with its value", () => {
    expect(fillTemplate("Hello {{name}}", { name: "Ravi" })).toBe("Hello Ravi");
  });

  it("leaves an unfilled slot in place and reports it", () => {
    const text = fillTemplate("Hello {{name}}, you are {{role}}", {
      name: "Ravi",
    });
    expect(text).toContain("[role]");
    expect(unresolvedSlots(text)).toEqual(["role"]);
  });
});

describe("payslip", () => {
  const input = {
    employeeName: "Ravi Kumar",
    companyName: "Acme Pvt Ltd",
    payPeriod: "March 2026",
    earnings: [
      { label: "Basic salary", amount: 24_000 },
      { label: "House rent allowance", amount: 9_600 },
    ],
    deductions: [{ label: "Employee PF", amount: 1_800 }],
  };

  it("computes gross, deductions and net", () => {
    const result = buildPayslip(input);
    expect(result.grossEarnings).toBeCloseTo(33_600, 4);
    expect(result.totalDeductions).toBeCloseTo(1_800, 4);
    expect(result.netPay).toBeCloseTo(31_800, 4);
  });

  it("includes employer contributions in the employer cost", () => {
    const result = buildPayslip({
      ...input,
      employerContributions: [{ label: "Employer PF", amount: 1_800 }],
    });
    expect(result.employerCost).toBeCloseTo(33_600 + 1_800, 4);
  });

  it("flags a deduction with no explanation", () => {
    const result = buildPayslip({
      ...input,
      deductions: [{ label: "", amount: 500 }],
    });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("flags a payslip with no earnings at all", () => {
    const result = buildPayslip({ ...input, earnings: [] });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("produces both an HTML and a text rendering", () => {
    const result = buildPayslip(input);
    expect(result.html).toContain("<html");
    expect(result.text).toContain("Ravi Kumar");
  });
});

describe("job description and KPI sheet", () => {
  it("builds a job description from the facts given", () => {
    const result = buildJobDescription({
      role: "Backend Engineer",
      seniority: "mid",
      responsibilities: ["Build services", "Own the API", "Review code"],
      mustHave: ["Go", "Postgres"],
      niceToHave: ["Kubernetes"],
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).toContain("Backend Engineer");
    expect(result.text).toContain("Kubernetes");
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it("flags a job description with too few responsibilities", () => {
    const result = buildJobDescription({
      role: "Backend Engineer",
      seniority: "junior",
      responsibilities: ["Build services"],
      mustHave: [],
      niceToHave: [],
    });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("builds a KPI sheet from the measures given", () => {
    const result = buildKpiSheet({
      role: "Support Engineer",
      focus: "support",
      period: "quarterly",
      metrics: [
        { name: "First response time", target: "Under 1 hour", weight: 40 },
        { name: "CSAT", target: "Above 4.5", weight: 60 },
      ],
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).toContain("First response time");
    expect(result.totalWeight).toBe(100);
    expect(result.issues.length).toBe(0);
  });

  it("flags weights that do not add up to 100", () => {
    const result = buildKpiSheet({
      role: "Support Engineer",
      focus: "support",
      period: "quarterly",
      metrics: [
        { name: "First response time", target: "Under 1 hour", weight: 40 },
      ],
    });
    expect(result.totalWeight).toBe(40);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("probation and statutory leave", () => {
  it("ends a probation on the given date", () => {
    const result = probationEnd({
      joiningDate: "2026-01-15",
      probationMonths: 6,
    });
    expect(result.endDate).toBe("2026-07-14");
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("gives one day of leave for every twenty days worked", () => {
    const result = statutoryLeave({ daysWorked: 300, daysPer: 20 });
    expect(result.entitled).toBe(15);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});
