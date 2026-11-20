import { describe, expect, it } from "vitest";
import {
  EPF_RATE,
  EPF_WAGE_CEILING,
  ESI_EMPLOYEE_RATE,
  ESI_WAGE_CEILING,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  gratuity,
  grossForNet,
  fullAndFinal,
  incomeTax,
  professionalTax,
  ptRegimeById,
  salaryBreakdown,
} from "@/lib/tools/hr/payroll";

/**
 * The HR payroll engine.
 *
 * These are the numbers a person takes home, so the tests are written around
 * properties that must hold for any CTC rather than around one worked example:
 * the decomposition must balance, deductions must never exceed earnings, and
 * the statutory ceilings must actually bind.
 */
describe("salaryBreakdown", () => {
  it("balances the CTC decomposition exactly", () => {
    const result = salaryBreakdown({ annualCtc: 1_200_000 });
    const employerCost =
      result.annualGross +
      result.employerPf +
      result.employerEsi +
      result.gratuityProvision;
    expect(employerCost).toBeCloseTo(result.annualCtc, 4);
  });

  it("splits gross into basic, HRA and special allowance", () => {
    const result = salaryBreakdown({ annualCtc: 1_200_000, basicPercent: 0.5 });
    expect(result.basic).toBeCloseTo(result.annualGross * 0.5, 4);
    // HRA is taken as 40% of basic before the employer PF share.
    expect(result.hra).toBeCloseTo(result.basic * 0.4, 4);
    // Special allowance is what is left of gross once basic, HRA and the
    // employer's PF contribution are accounted for.
    expect(result.specialAllowance).toBeCloseTo(
      result.annualGross - result.basic - result.hra - result.employerPf,
      4,
    );
  });

  it("clamps the basic share into the 30–70% band", () => {
    const low = salaryBreakdown({ annualCtc: 1_200_000, basicPercent: 0.05 });
    const high = salaryBreakdown({ annualCtc: 1_200_000, basicPercent: 0.95 });
    expect(low.basic).toBeCloseTo(low.annualGross * 0.3, 4);
    expect(high.basic).toBeCloseTo(high.annualGross * 0.7, 4);
  });

  it("caps PF at the statutory ceiling when asked to", () => {
    const result = salaryBreakdown({
      annualCtc: 3_000_000,
      basicPercent: 0.5,
      pfOnCeiling: true,
    });
    expect(result.pfCapped).toBe(true);
    expect(result.employeePf).toBeCloseTo(EPF_WAGE_CEILING * 12 * EPF_RATE, 4);
  });

  it("computes PF on real basic when the ceiling does not bind", () => {
    const result = salaryBreakdown({
      annualCtc: 600_000,
      basicPercent: 0.4,
      pfOnCeiling: false,
    });
    expect(result.pfCapped).toBe(false);
    expect(result.employeePf).toBeCloseTo(result.basic * EPF_RATE, 4);
  });

  it("applies ESI only under the wage ceiling", () => {
    const below = salaryBreakdown({ annualCtc: 240_000, includeEsi: true });
    expect(below.esiApplicable).toBe(true);
    const above = salaryBreakdown({ annualCtc: 1_200_000, includeEsi: true });
    expect(above.esiApplicable).toBe(false);
    expect(above.employeeEsi).toBe(0);
  });

  it("never takes more out than goes in", () => {
    for (const ctc of [120_000, 600_000, 1_200_000, 5_000_000, 20_000_000]) {
      const result = salaryBreakdown({ annualCtc: ctc });
      expect(result.annualNet).toBeGreaterThanOrEqual(0);
      expect(result.monthlyNet).toBeLessThanOrEqual(result.monthlyGross);
    }
  });

  it("treats a negative CTC as zero rather than a negative salary", () => {
    const result = salaryBreakdown({ annualCtc: -50_000 });
    expect(result.annualCtc).toBe(0);
    expect(result.annualGross).toBe(0);
  });

  it("states its assumptions", () => {
    const result = salaryBreakdown({ annualCtc: 1_200_000 });
    expect(result.assumptions.length).toBeGreaterThan(0);
  });
});

describe("incomeTax", () => {
  it("charges nothing when the gross is under the standard deduction", () => {
    const result = incomeTax(50_000, { regime: "new" });
    expect(result.taxableIncome).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  it("gives the new regime a larger standard deduction", () => {
    const newer = incomeTax(1_500_000, { regime: "new" });
    const older = incomeTax(1_500_000, { regime: "old" });
    expect(newer.standardDeduction).toBeGreaterThan(older.standardDeduction);
  });

  it("ignores Chapter VI-A deductions in the new regime", () => {
    const withDeductions = incomeTax(2_000_000, {
      regime: "new",
      deductions: 200_000,
    });
    const without = incomeTax(2_000_000, { regime: "new" });
    expect(withDeductions.totalTax).toBe(without.totalTax);
    expect(withDeductions.otherDeductions).toBe(0);
  });

  it("applies Chapter VI-A deductions in the old regime", () => {
    const withDeductions = incomeTax(2_000_000, {
      regime: "old",
      deductions: 200_000,
    });
    const without = incomeTax(2_000_000, { regime: "old" });
    expect(withDeductions.otherDeductions).toBe(200_000);
    expect(withDeductions.totalTax).toBeLessThan(without.totalTax);
  });

  it("never returns a negative tax", () => {
    const result = incomeTax(100_000, { regime: "old", deductions: 500_000 });
    expect(result.totalTax).toBeGreaterThanOrEqual(0);
    expect(result.taxableIncome).toBeGreaterThanOrEqual(0);
  });

  it("adds cess on top of the tax after rebate", () => {
    const result = incomeTax(3_000_000, { regime: "new" });
    expect(result.cess).toBeCloseTo(result.taxAfterRebate * 0.04, 4);
    expect(result.totalTax).toBeCloseTo(result.taxAfterRebate + result.cess, 4);
  });

  it("exposes both regimes' slabs in ascending order", () => {
    for (const slabs of [NEW_REGIME_SLABS, OLD_REGIME_SLABS]) {
      for (let index = 1; index < slabs.length; index += 1) {
        expect(slabs[index].upTo).toBeGreaterThan(slabs[index - 1].upTo);
      }
    }
  });

  it("reports an effective rate that is a share of the gross", () => {
    const result = incomeTax(3_000_000, { regime: "new" });
    expect(result.effectiveRate).toBeGreaterThan(0);
    expect(result.effectiveRate).toBeLessThan(1);
  });
});

describe("grossForNet", () => {
  it("finds a gross whose net matches the target", () => {
    const target = 90_000;
    const solved = grossForNet(target, { basicPercent: 0.4 });
    expect(solved.breakdown.monthlyNet).toBeCloseTo(target, 0);
    expect(solved.annualGross).toBeGreaterThan(target * 12);
  });

  it("never returns a negative gross for a zero target", () => {
    const solved = grossForNet(0, {});
    expect(solved.annualGross).toBeGreaterThanOrEqual(0);
  });
});

describe("gratuity", () => {
  it("pays fifteen days of last-drawn wages per completed year", () => {
    const result = gratuity({ monthlyBasicDa: 50_000, years: 10 });
    expect(result.amount).toBeCloseTo((15 / 26) * 50_000 * 10, 2);
    expect(result.completedYears).toBe(10);
  });

  it("counts a part year of six months or more as a full year", () => {
    const result = gratuity({ monthlyBasicDa: 50_000, years: 4, months: 7 });
    expect(result.completedYears).toBe(5);
  });

  it("does not count a part year of under six months", () => {
    const result = gratuity({ monthlyBasicDa: 50_000, years: 4, months: 5 });
    expect(result.completedYears).toBe(4);
  });

  it("is not eligible before five completed years", () => {
    expect(gratuity({ monthlyBasicDa: 50_000, years: 4 }).eligible).toBe(false);
    expect(gratuity({ monthlyBasicDa: 50_000, years: 5 }).eligible).toBe(true);
  });

  it("applies the statutory cap and says that it did", () => {
    const result = gratuity({ monthlyBasicDa: 500_000, years: 20 });
    expect(result.amount).toBe(2_000_000);
    expect(result.cappedAtStatutoryLimit).toBe(true);
  });
});

describe("fullAndFinal", () => {
  const base = {
    monthlyGross: 60_000,
    monthlyBasicDa: 30_000,
    daysWorkedInFinalMonth: 30,
    leaveBalanceDays: 15,
    yearsOfService: 6,
    noticeShortfallDays: 0,
  };

  it("nets the recoverable amounts against the dues", () => {
    const result = fullAndFinal({ ...base, otherDeductions: 5_000 });
    expect(result.netSettlement).toBeCloseTo(
      result.grossPayable - result.totalDeductions,
      4,
    );
  });

  it("prorates the final month by the days worked", () => {
    const full = fullAndFinal({ ...base, daysWorkedInFinalMonth: 30 });
    const half = fullAndFinal({ ...base, daysWorkedInFinalMonth: 15 });
    expect(half.proratedSalary).toBeCloseTo(full.proratedSalary / 2, 4);
  });

  it("recovers notice pay as a deduction", () => {
    const result = fullAndFinal({ ...base, noticeShortfallDays: 30 });
    expect(result.noticeRecovery).toBeGreaterThan(0);
    expect(result.totalDeductions).toBeGreaterThanOrEqual(
      result.noticeRecovery,
    );
  });

  it("encashes leave at the basic rate", () => {
    const result = fullAndFinal({ ...base, leaveBalanceDays: 15 });
    expect(result.leaveEncashment).toBeCloseTo(15 * (30_000 / 30), 4);
  });

  it("lists every line it pays", () => {
    const result = fullAndFinal({ ...base, bonus: 50_000 });
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines.every((line) => line.label.length > 0)).toBe(true);
  });
});

describe("professionalTax", () => {
  it("charges nothing when there is no regime", () => {
    expect(professionalTax(50_000, "none")).toBe(0);
  });

  it("charges nothing for a non-positive wage", () => {
    expect(professionalTax(0, "karnataka")).toBe(0);
    expect(professionalTax(-100, "karnataka")).toBe(0);
  });

  it("rises with the wage", () => {
    const regime = ptRegimeById("karnataka");
    expect(regime).toBeDefined();
    const low = professionalTax(10_000, "karnataka");
    const high = professionalTax(50_000, "karnataka");
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

describe("statutory constants", () => {
  it("uses the published ceilings and rates", () => {
    expect(EPF_WAGE_CEILING).toBe(15_000);
    expect(EPF_RATE).toBeCloseTo(0.12, 6);
    expect(ESI_WAGE_CEILING).toBe(21_000);
    expect(ESI_EMPLOYEE_RATE).toBeCloseTo(0.0075, 6);
  });
});
