/**
 * Salary conversion, comparison and negotiation arithmetic for job seekers.
 *
 * ## The line this module does not cross
 *
 * It never states what a role "should" pay, because it has no salary data and
 * inventing a benchmark is exactly the kind of fabricated number the brief
 * forbids. Every figure here is derived from numbers the user enters:
 *
 * - What a **CTC in a new city** is worth after cost-of-living differences they
 *   supply themselves.
 * - What a **raise** does to net pay, using the same income-tax engine the HR
 *   category uses.
 * - What a **notice-period buyout** costs.
 * - How **equity and bonus** change the effective total, including vesting.
 *
 * The one place real published data could be used (salary benchmarks) needs a
 * paid source; it is documented as deferred rather than faked.
 */

import {
  incomeTax,
  salaryBreakdown,
  type TaxRegime,
  money,
} from "@/lib/tools/hr/payroll";

// ─────────────────────────────────────────────────────────────────────────────
// Salary period conversion
// ─────────────────────────────────────────────────────────────────────────────

export type SalaryPeriod = "hour" | "day" | "month" | "year";

export const PERIOD_HOURS: Readonly<Record<SalaryPeriod, number>> = {
  hour: 1,
  day: 8,
  month: 174, // 40-hour week × 4.345 weeks
  year: 2088, // 174 × 12
};

export type SalaryConversion = {
  hourly: number;
  daily: number;
  monthly: number;
  annual: number;
  /** Hours per year implied by the chosen work week. */
  hoursPerYear: number;
  notes: string[];
};

/**
 * Convert a salary between periods.
 *
 * The divisor is disclosed rather than assumed: a "monthly" salary is
 * annual ÷ 12 by definition, but the hourly figure depends on how many hours a
 * week the user actually works. Both are returned so a payroll comparison and a
 * contractor rate comparison use the right one.
 */
export function convertSalary(input: {
  amount: number;
  period: SalaryPeriod;
  hoursPerWeek?: number;
  weeksPerYear?: number;
}): SalaryConversion {
  const amount = Math.max(0, input.amount);
  const hoursPerWeek = Math.min(80, Math.max(1, input.hoursPerWeek ?? 40));
  const weeksPerYear = Math.min(52, Math.max(1, input.weeksPerYear ?? 52));
  const hoursPerYear = hoursPerWeek * weeksPerYear;

  // Annual from the input period, using the standard calendar for month/year and
  // the user's real hours for day/hour.
  let annual: number;
  switch (input.period) {
    case "hour":
      annual = amount * hoursPerYear;
      break;
    case "day":
      annual = amount * 5 * weeksPerYear;
      break;
    case "month":
      annual = amount * 12;
      break;
    default:
      annual = amount;
  }

  const notes: string[] = [];
  if (input.period === "hour" && amount > 0) {
    notes.push(
      `At ${hoursPerWeek} hours a week for ${weeksPerYear} weeks that is ${Math.round(hoursPerYear).toLocaleString("en-IN")} hours a year.`,
    );
  }
  if ((input.hoursPerWeek ?? 40) > 48) {
    notes.push(
      `Above 48 hours a week is over the Factories Act limit and unpaid overtime changes the real rate.`,
    );
  }
  notes.push(
    "A day rate assumes a 5-day week. Contractor day rates usually price in unpaid leave and overheads, so they are not directly comparable to a salaried day.",
  );

  return {
    hourly: annual / hoursPerYear,
    daily: annual / (5 * weeksPerYear),
    monthly: annual / 12,
    annual,
    hoursPerYear,
    notes,
  };
}

/** A contractor day rate equivalent to a salaried CTC, with the loadings named. */
export function contractorEquivalent(input: {
  annualCtc: number;
  /** Working days a salaried employee is paid for. */
  paidDaysPerYear?: number;
  /** Days actually billed by a contractor. */
  billedDaysPerYear?: number;
  /** Overhead/benefits loading, e.g. 0.2 for 20%. */
  loading?: number;
}): {
  salariedDayValue: number;
  contractorDayRate: number;
  loadingApplied: number;
  annualDifference: number;
  notes: string[];
} {
  const paidDays = Math.max(1, input.paidDaysPerYear ?? 260);
  const billedDays = Math.max(1, input.billedDaysPerYear ?? 220);
  const loading = Math.max(0, input.loading ?? 0.2);
  const ctc = Math.max(0, input.annualCtc);

  const salariedDayValue = ctc / paidDays;
  const target = ctc * (1 + loading);
  const contractorDayRate = target / billedDays;

  return {
    salariedDayValue,
    contractorDayRate,
    loadingApplied: loading,
    annualDifference: contractorDayRate * billedDays - ctc,
    notes: [
      `A contractor bills about ${billedDays} days a year, not ${paidDays}: public holidays, leave and bench time are unpaid.`,
      `The ${Math.round(loading * 100)}% loading covers the benefits an employer would otherwise provide (PF, gratuity, insurance, equipment). Change it to match your own situation.`,
      "This is arithmetic on your inputs, not a market rate. Treat it as the floor for a conversation, not a recommendation.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Raise / offer comparison, after tax
// ─────────────────────────────────────────────────────────────────────────────

export type OfferComparison = {
  current: {
    ctc: number;
    gross: number;
    tax: number;
    inHandAnnual: number;
    inHandMonthly: number;
    effectiveTaxRate: number;
  };
  offered: {
    ctc: number;
    gross: number;
    tax: number;
    inHandAnnual: number;
    inHandMonthly: number;
    effectiveTaxRate: number;
  };
  ctcIncrease: number;
  ctcIncreasePercent: number;
  inHandIncrease: number;
  inHandIncreasePercent: number;
  /** Share of the raise that survives tax, 0–1. */
  retainedShare: number;
  notes: string[];
};

/**
 * Compare two CTCs after tax.
 *
 * The interesting output is `retainedShare`: at higher incomes a large part of a
 * raise is taxed, so "a 20% hike" is rarely a 20% take-home rise. That is a fact
 * about the slabs the user's own numbers produce, not a rule of thumb.
 */
export function compareOffers(input: {
  currentCtc: number;
  offeredCtc: number;
  regime: TaxRegime;
  deductions?: number;
  ptRegimeId?: string;
}): OfferComparison {
  const build = (ctc: number) => {
    const breakdown = salaryBreakdown({
      annualCtc: ctc,
      regime: input.regime,
      deductions: input.deductions,
      ptRegimeId: input.ptRegimeId,
    });
    return {
      ctc,
      gross: breakdown.annualGross,
      tax: breakdown.incomeTax,
      inHandAnnual: breakdown.annualNet,
      inHandMonthly: breakdown.monthlyNet,
      effectiveTaxRate:
        breakdown.annualGross > 0
          ? breakdown.incomeTax / breakdown.annualGross
          : 0,
    };
  };

  const current = build(Math.max(0, input.currentCtc));
  const offered = build(Math.max(0, input.offeredCtc));
  const ctcIncrease = offered.ctc - current.ctc;
  const inHandIncrease = offered.inHandAnnual - current.inHandAnnual;
  const retainedShare = ctcIncrease > 0 ? inHandIncrease / ctcIncrease : 0;

  const notes: string[] = [];
  if (ctcIncrease > 0 && retainedShare < 0.75) {
    notes.push(
      `${Math.round((1 - retainedShare) * 100)}% of the raise does not reach your bank account, because the extra income falls in a higher slab and PF/PT also rise.`,
    );
  }
  if (ctcIncrease < 0) {
    notes.push("The offered CTC is lower than the current one.");
  }
  notes.push(
    "Only cash components are compared. ESOPs, joining bonuses with clawbacks, insurance and allowances are excluded unless you add them to the CTC you enter.",
  );

  return {
    current,
    offered,
    ctcIncrease,
    ctcIncreasePercent: current.ctc > 0 ? (ctcIncrease / current.ctc) * 100 : 0,
    inHandIncrease,
    inHandIncreasePercent:
      current.inHandAnnual > 0
        ? (inHandIncrease / current.inHandAnnual) * 100
        : 0,
    retainedShare,
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Notice period and buyout
// ─────────────────────────────────────────────────────────────────────────────

export type NoticeBuyout = {
  noticeDays: number;
  servedDays: number;
  shortfallDays: number;
  recoveryPerDay: number;
  recoveryAmount: number;
  /** Salary earned for the days actually served. */
  earnedForServedDays: number;
  netEffect: number;
  notes: string[];
};

/**
 * Cost of leaving before a notice period completes.
 *
 * Recovery is normally basic+DA per day, not full gross — companies differ, so
 * the basis is an input and the result says which one it used. Whether the *new*
 * employer reimburses a buyout is a contractual matter, never assumed here.
 */
export function noticeBuyout(input: {
  monthlyGross: number;
  monthlyBasicDa: number;
  noticeDays: number;
  servedDays: number;
  workingDays?: number;
  /** Basis for recovery; defaults to basic+DA, the common contractual basis. */
  recoveryBasis?: "basic" | "gross";
}): NoticeBuyout {
  const workingDays = Math.max(1, input.workingDays ?? 30);
  const noticeDays = Math.max(0, input.noticeDays);
  const servedDays = Math.max(0, input.servedDays);
  const shortfallDays = Math.max(0, noticeDays - servedDays);
  const basis = input.recoveryBasis ?? "basic";
  const recoveryPerDay =
    (basis === "basic"
      ? Math.max(0, input.monthlyBasicDa)
      : Math.max(0, input.monthlyGross)) / workingDays;
  const recoveryAmount = recoveryPerDay * shortfallDays;
  const earnedForServedDays =
    (Math.max(0, input.monthlyGross) / workingDays) * servedDays;

  const notes: string[] = [];
  notes.push(
    basis === "basic"
      ? "Recovery is calculated on basic + DA per day, which is the usual contractual basis."
      : "Recovery is calculated on full gross per day. Check your appointment letter — many use basic only.",
  );
  if (shortfallDays === 0) {
    notes.push("The full notice period was served, so nothing is recoverable.");
  }
  notes.push(
    "A buyout is recoverable only if your contract says so, and only for the shortfall. Neither condition is checked here.",
  );
  notes.push(
    "Whether your new employer reimburses the buyout is a separate, contractual matter. Nothing above assumes that it does.",
  );

  return {
    noticeDays,
    servedDays,
    shortfallDays,
    recoveryPerDay,
    recoveryAmount,
    earnedForServedDays,
    netEffect: earnedForServedDays - recoveryAmount,
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compensation with equity and bonus
// ─────────────────────────────────────────────────────────────────────────────

export type EquityGrant = {
  /** Number of options or RSUs granted. */
  units: number;
  /** Strike price per unit; 0 for RSUs. */
  strike: number;
  /** Current fair market value per unit. */
  fmv: number;
  /** Total vesting period in years. */
  vestingYears: number;
  /** Cliff in months, during which nothing vests. */
  cliffMonths: number;
  /** Standard vesting is monthly after the cliff. */
  frequency?: "monthly" | "annual";
};

export type EquityValuation = {
  /** Value of the spread on the whole grant, at today's FMV. */
  totalSpread: number;
  /** Vested units and spread after a given number of months. */
  vested: { units: number; spread: number; months: number };
  /** Value received per fully vested year, used for annual-comp comparisons. */
  annualisedValue: number;
  schedule: { year: number; units: number; spread: number }[];
  notes: string[];
  /** True when the strike is at or above FMV — the options are worthless today. */
  underwater: boolean;
};

/**
 * Value an ESOP/RSU grant, vesting included.
 *
 * For options the value is the **spread** (FMV − strike) × units, which is the
 * pre-tax paper gain. It is not cash: the shares are illiquid until an event,
 * and tax treatment differs between options and RSUs and by how they are sold.
 * RSUs are modelled as strike 0, which makes spread equal FMV.
 */
export function valueEquity(
  grant: EquityGrant,
  monthsElapsed = 0,
): EquityValuation {
  const units = Math.max(0, grant.units);
  const strike = Math.max(0, grant.strike);
  const fmv = Math.max(0, grant.fmv);
  const years = Math.max(1, grant.vestingYears);
  const cliff = Math.min(12 * years, Math.max(0, grant.cliffMonths));
  const totalMonths = years * 12;
  const perUnitSpread = Math.max(0, fmv - strike);

  const vestedUnitsAt = (months: number): number => {
    if (months < cliff) return 0;
    if (months >= totalMonths) return units;
    const vestedMonths = months - cliff;
    const vestingMonths = totalMonths - cliff;
    if (vestingMonths <= 0) return units;
    return units * (vestedMonths / vestingMonths);
  };

  const schedule: EquityValuation["schedule"] = [];
  for (let year = 1; year <= years; year++) {
    const cumulative = vestedUnitsAt(year * 12);
    const previous = vestedUnitsAt((year - 1) * 12);
    schedule.push({
      year,
      units: Math.round((cumulative - previous) * 100) / 100,
      spread: Math.round((cumulative - previous) * perUnitSpread * 100) / 100,
    });
  }

  const vestedUnits = vestedUnitsAt(Math.max(0, monthsElapsed));
  const notes: string[] = [
    "Paper value, pre-tax: spread × units at today's fair market value. Shares are not liquid until a sale or buyback event.",
    "Tax treatment differs for ESOPs and RSUs and depends on when and how you sell. This is not tax advice.",
  ];
  if (cliff > 0) {
    notes.push(
      `A ${cliff}-month cliff means nothing vests before month ${cliff}; leaving earlier forfeits the whole grant.`,
    );
  }
  if (fmv <= strike && grant.strike > 0) {
    notes.push(
      "The strike price is at or above the current fair market value, so the options are underwater and worth zero today.",
    );
  }

  return {
    totalSpread: money(units * perUnitSpread),
    vested: {
      units: Math.round(vestedUnits * 100) / 100,
      spread: money(vestedUnits * perUnitSpread),
      months: monthsElapsed,
    },
    annualisedValue: money((units * perUnitSpread) / years),
    schedule,
    notes,
    underwater: grant.strike > 0 && fmv <= strike,
  };
}

/** Total compensation from its parts, with each part labelled. */
export function totalCompensation(input: {
  annualCtc: number;
  joiningBonus?: number;
  /** Clawback months on the joining bonus. */
  bonusClawbackMonths?: number;
  annualBonusPercent?: number;
  equityAnnualised?: number;
  /** One-off relocation. */
  relocation?: number;
}): {
  yearOneCash: number;
  yearOneTotal: number;
  steadyStateAnnual: number;
  components: { label: string; amount: number; recurring: boolean }[];
  notes: string[];
} {
  const ctc = Math.max(0, input.annualCtc);
  const joining = Math.max(0, input.joiningBonus ?? 0);
  const relocation = Math.max(0, input.relocation ?? 0);
  const variable = ctc * (Math.max(0, input.annualBonusPercent ?? 0) / 100);
  const equity = Math.max(0, input.equityAnnualised ?? 0);

  const components = [
    { label: "Fixed CTC", amount: ctc, recurring: true },
    {
      label: "Variable / performance bonus",
      amount: variable,
      recurring: true,
    },
    { label: "Equity (annualised)", amount: equity, recurring: true },
    { label: "Joining bonus (one-off)", amount: joining, recurring: false },
    { label: "Relocation (one-off)", amount: relocation, recurring: false },
  ];

  const notes: string[] = [];
  if (joining > 0 && input.bonusClawbackMonths) {
    notes.push(
      `The joining bonus is typically clawed back if you leave within ${input.bonusClawbackMonths} months, so it is not free money in year one.`,
    );
  }
  if (variable > 0) {
    notes.push(
      "Variable pay is usually discretionary and pro-rated in the first year. The figure here assumes full payout.",
    );
  }
  if (equity > 0) {
    notes.push(
      "Equity is annualised paper value, not cash, and its real value depends on a future liquidity event.",
    );
  }

  return {
    yearOneCash: ctc + variable + joining + relocation,
    yearOneTotal: ctc + variable + joining + relocation + equity,
    steadyStateAnnual: ctc + variable + equity,
    components,
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Relocation-adjusted comparison
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare two offers in different cities using a cost index the user supplies.
 *
 * This is the honest version of "city salary comparison". There is no
 * authoritative public index for Indian cities at the granularity people ask
 * for, and numbering them would be invention. So the index is an **input**
 * (1.0 = your current city), the arithmetic is exact, and the output is framed
 * as "what today's lifestyle costs there", not "what the market pays there".
 */
export function relocationComparison(input: {
  currentCtc: number;
  offeredCtc: number;
  /** Current city cost index, default 1. */
  currentIndex?: number;
  /** New city cost index, e.g. 1.15 if it is 15% more expensive. */
  newIndex: number;
  currentRentMonthly?: number;
  newRentMonthly?: number;
}): {
  nominalIncrease: number;
  realIncrease: number;
  purchasingPowerCurrent: number;
  purchasingPowerNew: number;
  breakEvenCtc: number;
  verdict: string;
  notes: string[];
} {
  const current = Math.max(0, input.currentCtc);
  const offered = Math.max(0, input.offeredCtc);
  const currentIndex = Math.max(0.1, input.currentIndex ?? 1);
  const newIndex = Math.max(0.1, input.newIndex);

  const relative = newIndex / currentIndex;
  const nominalIncrease = offered - current;
  const realIncrease = offered / relative - current;
  const breakEvenCtc = current * relative;

  // Rent is the largest single line that differs between cities, so when it is
  // supplied it is applied separately instead of hiding inside the index.
  const rentDelta =
    input.newRentMonthly !== undefined && input.currentRentMonthly !== undefined
      ? (input.newRentMonthly - input.currentRentMonthly) * 12
      : 0;

  const notes = [
    "The cost index is the one you entered, not a published figure — QUICKKIT has no city cost database, and inventing one would mislead you.",
    "Break-even CTC is the offer that preserves your current purchasing power under that index.",
  ];
  if (rentDelta !== 0) {
    notes.push(
      `Rent differs by ${rentDelta > 0 ? "+" : ""}₹${Math.abs(Math.round(rentDelta)).toLocaleString("en-IN")} a year, which is already inside the index if the index was chosen to include housing. Do not double count.`,
    );
  }

  return {
    nominalIncrease,
    realIncrease,
    purchasingPowerCurrent: current,
    purchasingPowerNew: offered / relative,
    breakEvenCtc,
    verdict:
      realIncrease > 0
        ? `A real increase of ₹${Math.round(realIncrease).toLocaleString("en-IN")} a year after adjusting for the cost difference you entered.`
        : realIncrease < 0
          ? `A real cut of ₹${Math.abs(Math.round(realIncrease)).toLocaleString("en-IN")} a year once the cost difference you entered is applied.`
          : "Purchasing power is unchanged under the index you entered.",
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Experience and notice-date arithmetic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Total experience from employment date ranges, merged so overlapping
 * concurrent roles are not double counted.
 */
export function totalExperience(
  periods: { start: string; end: string }[],
  asOf = new Date(),
): {
  months: number;
  years: number;
  formatted: string;
  gaps: { from: string; to: string; months: number }[];
} {
  const toDate = (value: string): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const ranges = periods
    .map((period) => ({
      start: toDate(period.start),
      end: toDate(period.end) ?? asOf,
    }))
    .filter(
      (range): range is { start: Date; end: Date } =>
        !!range.start && range.end >= range.start!,
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      if (range.end > last.end) last.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }

  const monthsOf = (from: Date, to: Date) =>
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    1;

  const months = merged.reduce(
    (sum, range) => sum + monthsOf(range.start, range.end),
    0,
  );
  const years = Math.floor(months / 12);
  const remainder = months % 12;

  const gaps: { from: string; to: string; months: number }[] = [];
  for (let i = 1; i < merged.length; i++) {
    const gapMonths = monthsOf(merged[i - 1].end, merged[i].start) - 2;
    if (gapMonths >= 2) {
      gaps.push({
        from: merged[i - 1].end.toISOString().slice(0, 10),
        to: merged[i].start.toISOString().slice(0, 10),
        months: gapMonths,
      });
    }
  }

  return {
    months,
    years: months / 12,
    formatted: `${years} year${years === 1 ? "" : "s"}${remainder > 0 ? ` ${remainder} month${remainder === 1 ? "" : "s"}` : ""}`,
    gaps,
  };
}

/** Last working day for a notice period, skipping weekends and declared holidays. */
export function noticeEndDate(input: {
  resignationDate: string;
  noticeDays: number;
  holidays?: string[];
  includeWeekends?: boolean;
}): {
  lastWorkingDay: string;
  calendarDays: number;
  businessDays: number;
  skippedHolidays: string[];
} {
  const start = new Date(input.resignationDate);
  if (Number.isNaN(start.getTime())) {
    return {
      lastWorkingDay: "",
      calendarDays: 0,
      businessDays: 0,
      skippedHolidays: [],
    };
  }
  const holidays = new Set((input.holidays ?? []).filter(Boolean));
  let businessDays = 0;
  let cursor = new Date(start);
  const skipped: string[] = [];
  let guard = 0;

  while (businessDays < Math.max(0, input.noticeDays) && guard < 2000) {
    guard++;
    cursor = new Date(cursor.getTime() + 86_400_000);
    const iso = cursor.toISOString().slice(0, 10);
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    if (input.includeWeekends) {
      businessDays++;
      continue;
    }
    if (weekend) continue;
    if (holidays.has(iso)) {
      skipped.push(iso);
      continue;
    }
    businessDays++;
  }

  return {
    lastWorkingDay: cursor.toISOString().slice(0, 10),
    calendarDays: input.includeWeekends
      ? Math.max(0, input.noticeDays)
      : Math.round((cursor.getTime() - start.getTime()) / 86_400_000),
    businessDays,
    skippedHolidays: skipped,
  };
}

/** Marginal tax rate on the next rupee, so a bonus question has a real answer. */
export function marginalRate(
  grossAnnual: number,
  options: { regime: TaxRegime; deductions?: number },
): {
  current: number;
  onNext10000: number;
  notes: string[];
} {
  const base = incomeTax(grossAnnual, options);
  const bumped = incomeTax(grossAnnual + 10_000, options);
  const current =
    incomeTax(grossAnnual, options).totalTax / Math.max(1, grossAnnual);
  return {
    current,
    onNext10000: (bumped.totalTax - base.totalTax) / 10_000,
    notes: [
      "The marginal rate is the share of the next ₹10,000 that goes to tax, including cess. It is higher than the average rate.",
      "Bonuses are taxed at the marginal rate in the month they are paid, but the annual liability is what matters — a high-TDS month is not necessarily a higher annual tax.",
    ],
  };
}
