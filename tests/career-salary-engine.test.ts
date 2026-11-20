import { describe, expect, it } from "vitest";
import {
  compareOffers,
  contractorEquivalent,
  convertSalary,
  marginalRate,
  noticeBuyout,
  noticeEndDate,
  relocationComparison,
  totalCompensation,
  totalExperience,
  valueEquity,
} from "@/lib/tools/career/salary";
import type { TaxRegime } from "@/lib/tools/hr/payroll";

const NEW_REGIME: TaxRegime = "new";

describe("convertSalary", () => {
  it("converts an hourly rate to an annual figure", () => {
    const result = convertSalary({
      amount: 500,
      period: "hour",
      hoursPerWeek: 40,
      weeksPerYear: 52,
    });
    expect(result.annual).toBe(500 * 40 * 52);
    expect(result.hourly).toBe(500);
  });

  it("converts an annual salary to a monthly figure by twelfths", () => {
    const result = convertSalary({ amount: 1_200_000, period: "year" });
    expect(result.monthly).toBe(100_000);
  });

  it("converts a monthly salary to an annual figure", () => {
    const result = convertSalary({ amount: 100_000, period: "month" });
    expect(result.annual).toBe(1_200_000);
  });

  it("discloses the work week it assumed", () => {
    const result = convertSalary({
      amount: 500,
      period: "hour",
      hoursPerWeek: 45,
      weeksPerYear: 52,
    });
    expect(result.hoursPerYear).toBe(45 * 52);
  });

  it("never returns a negative salary", () => {
    expect(convertSalary({ amount: -100, period: "hour" }).annual).toBe(0);
  });
});

describe("contractorEquivalent", () => {
  it("derives the day rate a contractor needs to match the salary", () => {
    const result = contractorEquivalent({
      annualCtc: 1_200_000,
      paidDaysPerYear: 260,
      billedDaysPerYear: 220,
      loading: 0.2,
    });
    expect(result.contractorDayRate).toBeGreaterThan(0);
    expect(result.salariedDayValue).toBeGreaterThan(0);
  });

  it("shows the loading it applied", () => {
    const result = contractorEquivalent({
      annualCtc: 1_200_000,
      loading: 0.25,
    });
    expect(result.loadingApplied).toBeCloseTo(0.25, 6);
  });

  it("never returns a negative difference", () => {
    const result = contractorEquivalent({ annualCtc: 0 });
    expect(result.annualDifference).toBeGreaterThanOrEqual(0);
  });
});

describe("compareOffers", () => {
  it("shows that a raise is smaller after tax", () => {
    const result = compareOffers({
      currentCtc: 1_200_000,
      offeredCtc: 1_500_000,
      regime: NEW_REGIME,
    });
    expect(result.ctcIncreasePercent).toBeCloseTo(25, 4);
    expect(result.inHandIncreasePercent).toBeLessThan(
      result.ctcIncreasePercent,
    );
    expect(result.retainedShare).toBeLessThan(1);
  });

  it("reports the tax on each side", () => {
    const result = compareOffers({
      currentCtc: 1_200_000,
      offeredCtc: 1_500_000,
      regime: NEW_REGIME,
    });
    expect(result.offered.tax).toBeGreaterThan(result.current.tax);
    expect(result.offered.inHandAnnual).toBeGreaterThan(0);
  });

  it("keeps the retained share inside 0–1", () => {
    const result = compareOffers({
      currentCtc: 2_000_000,
      offeredCtc: 2_100_000,
      regime: NEW_REGIME,
    });
    expect(result.retainedShare).toBeGreaterThanOrEqual(0);
    expect(result.retainedShare).toBeLessThanOrEqual(1);
  });
});

describe("totalCompensation", () => {
  it("separates the one-off components from the recurring ones", () => {
    const result = totalCompensation({
      annualCtc: 1_200_000,
      joiningBonus: 100_000,
      relocation: 50_000,
    });
    expect(result.yearOneCash).toBeGreaterThan(result.steadyStateAnnual);
    const oneOff = result.components.filter((row) => !row.recurring);
    expect(oneOff.length).toBeGreaterThan(0);
  });

  it("adds a recurring bonus to the steady state", () => {
    const plain = totalCompensation({ annualCtc: 1_200_000 });
    const withBonus = totalCompensation({
      annualCtc: 1_200_000,
      annualBonusPercent: 10,
    });
    expect(withBonus.steadyStateAnnual).toBeGreaterThan(
      plain.steadyStateAnnual,
    );
  });

  it("warns about a joining bonus that is clawed back", () => {
    const result = totalCompensation({
      annualCtc: 1_200_000,
      joiningBonus: 100_000,
      bonusClawbackMonths: 12,
    });
    expect(result.notes.length).toBeGreaterThan(0);
  });
});

describe("valueEquity", () => {
  const grant = {
    units: 1000,
    strike: 100,
    fmv: 400,
    vestingYears: 4,
    cliffMonths: 12,
  };

  it("values the whole grant at the spread", () => {
    const result = valueEquity(grant, 48);
    expect(result.totalSpread).toBeCloseTo((400 - 100) * 1000, 4);
    expect(result.vested.units).toBe(1000);
  });

  it("vests nothing before the cliff", () => {
    const result = valueEquity(grant, 6);
    expect(result.vested.units).toBe(0);
  });

  it("vests part way through the schedule", () => {
    const result = valueEquity(grant, 24);
    expect(result.vested.units).toBeGreaterThan(0);
    expect(result.vested.units).toBeLessThan(1000);
  });

  it("flags options that are underwater", () => {
    const result = valueEquity({ ...grant, strike: 500 }, 48);
    expect(result.underwater).toBe(true);
  });

  it("does not flag a grant that is in the money", () => {
    expect(valueEquity(grant, 48).underwater).toBe(false);
  });

  it("lists the vesting schedule year by year", () => {
    const result = valueEquity(grant, 48);
    expect(result.schedule.length).toBe(4);
  });
});

describe("noticeBuyout", () => {
  it("charges only for the days not served", () => {
    const result = noticeBuyout({
      monthlyGross: 100_000,
      monthlyBasicDa: 50_000,
      noticeDays: 60,
      servedDays: 30,
      workingDays: 30,
    });
    expect(result.shortfallDays).toBe(30);
    expect(result.recoveryAmount).toBeCloseTo((50_000 / 30) * 30, 4);
  });

  it("recovers on gross when that is the basis", () => {
    const result = noticeBuyout({
      monthlyGross: 100_000,
      monthlyBasicDa: 50_000,
      noticeDays: 30,
      servedDays: 0,
      workingDays: 30,
      recoveryBasis: "gross",
    });
    expect(result.recoveryPerDay).toBeCloseTo(100_000 / 30, 4);
  });

  it("charges nothing when the whole notice was served", () => {
    const result = noticeBuyout({
      monthlyGross: 100_000,
      monthlyBasicDa: 50_000,
      noticeDays: 30,
      servedDays: 30,
    });
    expect(result.recoveryAmount).toBe(0);
    expect(result.shortfallDays).toBe(0);
  });

  it("does not assume the new employer pays the buyout", () => {
    const result = noticeBuyout({
      monthlyGross: 100_000,
      monthlyBasicDa: 50_000,
      noticeDays: 60,
      servedDays: 0,
    });
    expect(result.notes.join(" ").toLowerCase()).toContain("reimburs");
  });

  it("says the recoverability itself depends on the contract", () => {
    const result = noticeBuyout({
      monthlyGross: 100_000,
      monthlyBasicDa: 50_000,
      noticeDays: 60,
      servedDays: 0,
    });
    expect(result.notes.join(" ").toLowerCase()).toContain("contract");
  });
});

describe("noticeEndDate", () => {
  it("counts business days, not calendar days", () => {
    const result = noticeEndDate({
      resignationDate: "2026-03-02",
      noticeDays: 30,
    });
    expect(result.businessDays).toBe(30);
    expect(result.calendarDays).toBeGreaterThan(30);
  });

  it("skips the holidays it is given", () => {
    const result = noticeEndDate({
      resignationDate: "2026-03-02",
      noticeDays: 30,
      holidays: ["2026-03-05"],
    });
    expect(result.skippedHolidays).toContain("2026-03-05");
    expect(result.calendarDays).toBeGreaterThan(30);
  });

  it("counts every day when weekends are included", () => {
    const result = noticeEndDate({
      resignationDate: "2026-03-02",
      noticeDays: 10,
      includeWeekends: true,
    });
    expect(result.businessDays).toBe(10);
    expect(result.calendarDays).toBe(10);
  });

  it("returns nothing for an invalid date instead of throwing", () => {
    const result = noticeEndDate({
      resignationDate: "not-a-date",
      noticeDays: 30,
    });
    expect(result.lastWorkingDay).toBe("");
  });
});

describe("totalExperience", () => {
  const asOf = new Date("2026-01-01T00:00:00Z");

  it("adds up two periods, counting both endpoint months", () => {
    const result = totalExperience(
      [
        { start: "2022-01-01", end: "2024-01-01" },
        { start: "2024-03-01", end: "2026-01-01" },
      ],
      asOf,
    );
    // The end date is the last day worked, so both endpoint months count:
    // Jan 2022–Jan 2024 is 25 months and Mar 2024–Jan 2026 is 23.
    expect(result.months).toBe(48);
  });

  it("merges overlapping roles so concurrent work is not double counted", () => {
    const result = totalExperience(
      [
        { start: "2020-01-01", end: "2022-01-01" },
        { start: "2021-01-01", end: "2023-01-01" },
      ],
      asOf,
    );
    expect(result.months).toBe(37);
  });

  it("reports a gap between two periods", () => {
    const result = totalExperience(
      [
        { start: "2020-01-01", end: "2021-01-01" },
        { start: "2022-01-01", end: "2023-01-01" },
      ],
      asOf,
    );
    expect(result.gaps.length).toBe(1);
    // Feb 2021 – Dec 2021 is eleven months with no work.
    expect(result.gaps[0].months).toBe(11);
  });

  it("formats the total for a human", () => {
    const result = totalExperience(
      [{ start: "2024-01-01", end: "2026-01-01" }],
      asOf,
    );
    expect(result.formatted).toContain("2");
  });

  it("runs an open-ended role up to the date asked for", () => {
    const result = totalExperience([{ start: "2024-01-01", end: "" }], asOf);
    expect(result.months).toBe(25);
  });
});

describe("relocationComparison", () => {
  it("shows a nominal rise that a cost index erodes", () => {
    const result = relocationComparison({
      currentCtc: 1_000_000,
      offeredCtc: 1_200_000,
      newIndex: 1.3,
    });
    expect(result.nominalIncrease).toBe(200_000);
    expect(result.realIncrease).toBeLessThan(result.nominalIncrease);
  });

  it("names the break-even salary", () => {
    const result = relocationComparison({
      currentCtc: 1_000_000,
      offeredCtc: 1_200_000,
      newIndex: 1.3,
    });
    expect(result.breakEvenCtc).toBeGreaterThan(0);
    expect(result.verdict.length).toBeGreaterThan(0);
  });

  it("does not treat a flat move as a raise", () => {
    const result = relocationComparison({
      currentCtc: 1_000_000,
      offeredCtc: 1_000_000,
      newIndex: 1.0,
    });
    expect(result.nominalIncrease).toBe(0);
  });
});

describe("marginalRate", () => {
  it("gives the rate on the next ten thousand", () => {
    const result = marginalRate(1_500_000, { regime: NEW_REGIME });
    // 15% slab plus 4% health and education cess.
    expect(result.onNext10000).toBeCloseTo(0.156, 4);
  });

  it("reports no marginal tax where the 87A rebate still absorbs it", () => {
    const result = marginalRate(1_200_000, { regime: NEW_REGIME });
    expect(result.onNext10000).toBe(0);
  });

  it("rises as the income crosses a slab", () => {
    const low = marginalRate(500_000, { regime: NEW_REGIME });
    const high = marginalRate(2_500_000, { regime: NEW_REGIME });
    expect(high.onNext10000).toBeGreaterThan(low.onNext10000);
  });

  it("keeps the effective rate inside 0–1", () => {
    const result = marginalRate(1_200_000, { regime: NEW_REGIME });
    expect(result.current).toBeGreaterThanOrEqual(0);
    expect(result.current).toBeLessThanOrEqual(1);
  });
});
