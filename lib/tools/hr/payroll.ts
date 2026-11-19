/**
 * Indian payroll arithmetic.
 *
 * This module is deliberately pure: no React, no network, no clock. Every
 * function takes explicit inputs and returns a fully-explained result, so the
 * same code can be unit-tested directly and runs entirely in the browser.
 *
 * ## What this is and is not
 *
 * It implements the **statutory rules that are stable and well-defined** — the
 * EPF wage ceiling and contribution rates, the ESI wage ceiling and rates, the
 * four Indian professional-tax regimes that actually vary by state, gratuity
 * under the Payment of Gratuity Act, and the Income-tax Act section 87A rebate
 * with the new-regime slabs. Those are arithmetic.
 *
 * It is **not** a payroll filing system. Individual exemptions (HRA, LTA,
 * section 80C investment proofs, NPS employer contributions above the cap),
 * surcharge, marginal relief, perquisite valuation on ESOPs or company cars, and
 * state-specific labour-welfare-fund deductions all depend on facts this tool
 * never collects. Every result therefore reports its own assumptions, and the
 * UI states plainly that it is an estimate for planning — not a payslip, not a
 * filing, and not compliance advice.
 *
 * Nothing here is a "guess dressed as a fact": each output carries the exact
 * figure it was derived from.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Statutory constants. These are the numbers the arithmetic below uses, kept in
// one place so a rate change is a one-line edit and the tests can pin them.
// ─────────────────────────────────────────────────────────────────────────────

/** EPF statutory wage ceiling (₹15,000/month) — EPF Act, as amended 2014. */
export const EPF_WAGE_CEILING = 15_000;
/** Employee and employer contributions are each 12% of PF wages. */
export const EPF_RATE = 0.12;
/** ESI wage ceiling (₹21,000/month); above this an employee is out of scope. */
export const ESI_WAGE_CEILING = 21_000;
/** Employee share 0.75%, employer share 3.25%. */
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_EMPLOYER_RATE = 0.0325;
/** Gratuity: 15/26 of last drawn (basic + DA) per completed year. */
export const GRATUITY_RATE = 15 / 26;

/**
 * Professional tax regimes. Four patterns cover every Indian state that levies
 * PT, but the *amounts* differ by state and several states levy nothing.
 * `slabs` are monthly gross-wage bands; the last matching band wins.
 */
export type PtSlab = { upTo: number; amount: number };
export type PtRegime = { id: string; label: string; slabs: PtSlab[] };

export const PT_REGIMES: readonly PtRegime[] = [
  {
    id: "none",
    label: "No professional tax (many states and UTs)",
    slabs: [],
  },
  {
    id: "maharashtra",
    label: "Maharashtra (₹200/month above ₹10,000, ₹300 in February)",
    slabs: [
      { upTo: 7_500, amount: 0 },
      { upTo: 10_000, amount: 175 },
      { upTo: Infinity, amount: 200 },
    ],
  },
  {
    id: "karnataka",
    label: "Karnataka (₹200/month above ₹25,000)",
    slabs: [
      { upTo: 25_000, amount: 0 },
      { upTo: Infinity, amount: 200 },
    ],
  },
  {
    id: "west-bengal",
    label: "West Bengal (banded up to ₹200/month)",
    slabs: [
      { upTo: 10_000, amount: 0 },
      { upTo: 15_000, amount: 110 },
      { upTo: 25_000, amount: 130 },
      { upTo: 40_000, amount: 150 },
      { upTo: Infinity, amount: 200 },
    ],
  },
  {
    id: "andhra-telangana",
    label: "Andhra Pradesh / Telangana (₹200/month above ₹20,000)",
    slabs: [
      { upTo: 15_000, amount: 0 },
      { upTo: 20_000, amount: 150 },
      { upTo: Infinity, amount: 200 },
    ],
  },
];

export const ptRegimeById = (id: string): PtRegime =>
  PT_REGIMES.find((regime) => regime.id === id) ?? PT_REGIMES[0];

/** Monthly professional tax for a monthly gross wage under a regime. */
export function professionalTax(
  monthlyGross: number,
  regimeId: string,
): number {
  const regime = ptRegimeById(regimeId);
  if (monthlyGross <= 0 || regime.slabs.length === 0) return 0;
  for (const slab of regime.slabs) {
    if (monthlyGross <= slab.upTo) return slab.amount;
  }
  return regime.slabs[regime.slabs.length - 1].amount;
}

// ─────────────────────────────────────────────────────────────────────────────
// Income tax — new regime (default from FY 2023-24) and the old regime.
// ─────────────────────────────────────────────────────────────────────────────

export type TaxSlab = { upTo: number; rate: number };

/**
 * New-regime slabs for FY 2025-26 (AY 2026-27), as announced in the July 2024
 * budget: 0–4L nil, 4–8L 5%, 8–12L 10%, 12–16L 15%, 16–20L 20%, 20–24L 25%,
 * above 24L 30%. The standard deduction under the new regime is ₹75,000 and the
 * section 87A rebate fully offsets tax up to ₹12,00,000 of taxable income.
 */
export const NEW_REGIME_SLABS: readonly TaxSlab[] = [
  { upTo: 400_000, rate: 0 },
  { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.1 },
  { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.2 },
  { upTo: 2_400_000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
];
export const NEW_REGIME_STANDARD_DEDUCTION = 75_000;
export const NEW_REGIME_REBATE_LIMIT = 1_200_000;

/**
 * Old-regime slabs for an individual below 60. The old regime keeps the ₹50,000
 * standard deduction, the ₹2,50,000 basic exemption and the ₹5,00,000 87A
 * rebate, and — importantly — allows the deduction set the user supplies.
 */
export const OLD_REGIME_SLABS: readonly TaxSlab[] = [
  { upTo: 250_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];
export const OLD_REGIME_STANDARD_DEDUCTION = 50_000;
export const OLD_REGIME_REBATE_LIMIT = 500_000;

/** Health & education cess on income tax. */
export const CESS_RATE = 0.04;

export type TaxRegime = "new" | "old";

export type TaxOptions = {
  regime: TaxRegime;
  /** Total deductions the employee can prove (old regime only). */
  deductions?: number;
  /**
   * Employer NPS contribution under 80CCD(2). Allowed in **both** regimes, up to
   * 14% of basic for the new regime (10% under the old). Modelled because it is
   * the one deduction that still works in the new regime.
   */
  employerNps?: number;
  basic?: number;
};

export type TaxResult = {
  grossAnnual: number;
  standardDeduction: number;
  otherDeductions: number;
  employerNpsDeduction: number;
  taxableIncome: number;
  /** Tax before cess, after the 87A rebate. */
  taxAfterRebate: number;
  rebateApplied: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
  /** Which slab each rupee of income fell into, for the breakdown table. */
  bands: {
    from: number;
    to: number;
    rate: number;
    taxable: number;
    tax: number;
  }[];
  regime: TaxRegime;
  notes: string[];
};

function slabTax(taxable: number, slabs: readonly TaxSlab[]) {
  const bands: TaxResult["bands"] = [];
  let remaining = taxable;
  let previous = 0;
  let total = 0;
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const width = slab.upTo - previous;
    const taxableInBand = Math.min(remaining, width);
    const tax = taxableInBand * slab.rate;
    bands.push({
      from: previous,
      to: slab.upTo === Infinity ? taxable : slab.upTo,
      rate: slab.rate,
      taxable: taxableInBand,
      tax,
    });
    total += tax;
    remaining -= taxableInBand;
    previous = slab.upTo;
  }
  return { total, bands };
}

/**
 * Annual income tax on salary, including the 87A rebate and cess.
 *
 * `grossAnnual` is the CTC minus employer PF and employer ESI — those are
 * employer outlays, never the employee's taxable salary. Surcharge and marginal
 * relief are intentionally not modelled; both only bite well above the salary
 * ranges this estimator is honest about, and they are named in `notes`.
 */
export function incomeTax(grossAnnual: number, options: TaxOptions): TaxResult {
  const notes: string[] = [];
  if (grossAnnual <= 0) {
    return {
      grossAnnual: 0,
      standardDeduction: 0,
      otherDeductions: 0,
      employerNpsDeduction: 0,
      taxableIncome: 0,
      taxAfterRebate: 0,
      rebateApplied: 0,
      cess: 0,
      totalTax: 0,
      effectiveRate: 0,
      bands: [],
      regime: options.regime,
      notes: ["Enter a CTC above zero to see a tax estimate."],
    };
  }

  const newRegime = options.regime === "new";
  const standardDeduction = Math.min(
    grossAnnual,
    newRegime ? NEW_REGIME_STANDARD_DEDUCTION : OLD_REGIME_STANDARD_DEDUCTION,
  );

  // 80CCD(2) employer NPS is capped as a share of basic, and is allowed in both
  // regimes — the only deduction that survives the new regime.
  const npsCapRate = newRegime ? 0.14 : 0.1;
  const employerNpsDeduction = Math.min(
    Math.max(0, options.employerNps ?? 0),
    Math.max(0, options.basic ?? 0) * npsCapRate,
  );
  if ((options.employerNps ?? 0) > employerNpsDeduction) {
    notes.push(
      `Employer NPS capped at ${npsCapRate * 100}% of basic (₹${Math.round(employerNpsDeduction).toLocaleString("en-IN")}); the excess is taxable.`,
    );
  }

  let otherDeductions = 0;
  if (newRegime) {
    if ((options.deductions ?? 0) > 0) {
      notes.push(
        "Chapter VI-A deductions (80C, 80D, HRA, home-loan interest) are not allowed under the new regime, so they are ignored here.",
      );
    }
  } else {
    otherDeductions = Math.max(0, options.deductions ?? 0);
  }

  const taxableIncome = Math.max(
    0,
    grossAnnual - standardDeduction - otherDeductions - employerNpsDeduction,
  );

  const slabs = newRegime ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const rebateLimit = newRegime
    ? NEW_REGIME_REBATE_LIMIT
    : OLD_REGIME_REBATE_LIMIT;

  const { total: taxBeforeRebate, bands } = slabTax(taxableIncome, slabs);

  // Section 87A: a resident individual below the rebate limit pays nothing.
  // Modelled as a full offset, which is how it behaves up to the limit.
  const rebateApplied = taxableIncome <= rebateLimit ? taxBeforeRebate : 0;
  if (rebateApplied > 0) {
    notes.push(
      `Taxable income is within ₹${rebateLimit.toLocaleString("en-IN")}, so the section 87A rebate offsets the whole liability.`,
    );
  }

  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebateApplied);
  const cess = taxAfterRebate * CESS_RATE;
  const totalTax = taxAfterRebate + cess;

  notes.push(
    "Surcharge and marginal relief are not modelled; both apply only at high incomes.",
  );
  notes.push("Health and education cess at 4% is included.");
  if (newRegime) {
    notes.push(
      "New regime (the default for salaried taxpayers): ₹75,000 standard deduction, wider slabs, no Chapter VI-A deductions.",
    );
  } else {
    notes.push(
      "Old regime: ₹50,000 standard deduction and the deductions you entered are subtracted before tax.",
    );
  }

  return {
    grossAnnual,
    standardDeduction,
    otherDeductions,
    employerNpsDeduction,
    taxableIncome,
    taxAfterRebate,
    rebateApplied,
    cess,
    totalTax,
    effectiveRate: grossAnnual > 0 ? totalTax / grossAnnual : 0,
    bands,
    regime: options.regime,
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CTC ⇄ gross ⇄ net
// ─────────────────────────────────────────────────────────────────────────────

export type SalaryBreakdownInput = {
  /** Annual cost to company, including employer contributions. */
  annualCtc: number;
  /** Share of gross paid as basic; 40–50% is typical. */
  basicPercent?: number;
  /** PF on the statutory ceiling only (True) or on actual basic (False). */
  pfOnCeiling?: boolean;
  regime?: TaxRegime;
  deductions?: number;
  ptRegimeId?: string;
  /** Include the employer's ESI share while the wage is under the ceiling. */
  includeEsi?: boolean;
  employerNps?: number;
};

export type SalaryBreakdown = {
  annualCtc: number;
  // Employer side
  employerPf: number;
  employerEsi: number;
  gratuityProvision: number;
  // Employee side
  annualGross: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  employeePf: number;
  employeeEsi: number;
  professionalTax: number;
  incomeTax: number;
  annualNet: number;
  monthlyGross: number;
  monthlyNet: number;
  monthlyTakeHome: number;
  tax: TaxResult;
  assumptions: string[];
  /** True when ESI applies to this wage. */
  esiApplicable: boolean;
  /** True when PF is computed on the statutory ceiling rather than real basic. */
  pfCapped: boolean;
};

/**
 * Split an annual CTC into its components and take-home pay.
 *
 * The decomposition follows the conventional Indian CTC structure:
 *
 *   CTC = gross + employer PF + employer ESI + gratuity provision
 *
 * where the gratuity provision is 4.81% of basic (15/26 ÷ 12 per month) — it is
 * part of what a company budgets, not money the employee receives monthly. This
 * is why take-home is always lower than people expect from the CTC headline, and
 * the result says so explicitly rather than hiding it.
 */
export function salaryBreakdown(input: SalaryBreakdownInput): SalaryBreakdown {
  const annualCtc = Math.max(0, input.annualCtc);
  const basicPercent = Math.min(0.7, Math.max(0.3, input.basicPercent ?? 0.4));
  const pfOnCeiling = input.pfOnCeiling ?? true;
  const regime = input.regime ?? "new";
  const includeEsi = input.includeEsi ?? true;
  const assumptions: string[] = [];

  // Solve for gross: employer contributions are a function of basic, and basic
  // is a fixed share of gross, so the relationship is linear and can be solved
  // directly instead of iterated.
  //
  //   basic      = gross × basicPercent
  //   employerPf = min(basic, ceiling×12) × 12%           (capped mode)
  //   gratuity   = basic × 4.81%
  //   CTC        = gross + employerPf + gratuity + employerEsi
  //
  // With basicPercent = 0.4 and PF capped, employerPf is constant for any gross
  // above ₹3.75L/yr, so gross = (CTC − employerPf − gratuityShare·…) is closed
  // form below the ceiling and constant-subtracted above it. Both branches are
  // handled explicitly.
  const monthlyCeilingBasic = EPF_WAGE_CEILING; // monthly PF wage ceiling
  const annualCeilingBasic = monthlyCeilingBasic * 12;

  let annualGross: number;
  if (pfOnCeiling) {
    // Employer PF is fixed at the ceiling once basic exceeds it. Assume the
    // ceiling case first (it holds for almost every CTC above ~₹3.75L).
    const employerPfAtCeiling = annualCeilingBasic * EPF_RATE;
    const gratuityFactor = GRATUITY_RATE / 12; // 4.81% of annual basic
    // gross = (CTC − employerPf) / (1 + gratuityFactor × basicPercent)
    annualGross =
      (annualCtc - employerPfAtCeiling) / (1 + gratuityFactor * basicPercent);
    // If basic is below the ceiling, PF scales with basic, so re-solve exactly.
    if (annualGross * basicPercent < annualCeilingBasic) {
      annualGross =
        annualCtc /
        (1 + EPF_RATE * basicPercent + gratuityFactor * basicPercent);
    }
    assumptions.push(
      "Employer PF is limited to the ₹15,000/month statutory wage ceiling (the standard, compliant arrangement).",
    );
  } else {
    const gratuityFactor = GRATUITY_RATE / 12;
    annualGross =
      annualCtc / (1 + EPF_RATE * basicPercent + gratuityFactor * basicPercent);
    assumptions.push(
      "PF is computed on full basic rather than the statutory ceiling; a smaller take-home than a ceiling-restricted employer would produce.",
    );
  }

  annualGross = Math.max(0, annualGross);
  const basic = annualGross * basicPercent;
  const monthlyBasic = basic / 12;
  const pfWageBase = pfOnCeiling
    ? Math.min(monthlyBasic, monthlyCeilingBasic)
    : monthlyBasic;
  const employerPf = pfWageBase * EPF_RATE * 12;
  const employeePf = employerPf; // 12% each side

  const monthlyGross = annualGross / 12;
  const esiApplicable =
    includeEsi && monthlyGross > 0 && monthlyGross <= ESI_WAGE_CEILING;
  const employerEsi = esiApplicable ? monthlyGross * ESI_EMPLOYER_RATE * 12 : 0;
  const employeeEsi = esiApplicable ? monthlyGross * ESI_EMPLOYEE_RATE * 12 : 0;
  if (monthlyGross > ESI_WAGE_CEILING && includeEsi) {
    assumptions.push(
      "Monthly gross exceeds the ₹21,000 ESI ceiling, so ESI does not apply.",
    );
  }

  const gratuityProvision = basic * (GRATUITY_RATE / 12);

  const hra = basic * 0.4; // 40% of basic is the common urban structure
  assumptions.push(
    "HRA is shown at 40% of basic. It is a component split, not a tax exemption — the exemption depends on rent paid and city, which this tool does not ask for.",
  );
  const specialAllowance = Math.max(0, annualGross - basic - hra - employerPf);

  const ptYearly =
    professionalTax(monthlyGross, input.ptRegimeId ?? "none") * 12;

  const tax = incomeTax(annualGross, {
    regime,
    deductions: input.deductions,
    employerNps: input.employerNps,
    basic,
  });

  const annualNet = Math.max(
    0,
    annualGross - employeePf - employeeEsi - ptYearly - tax.totalTax,
  );

  assumptions.push(
    "Gratuity is a provision inside the CTC (4.81% of basic), not monthly income; it is payable only after five years of service.",
  );
  assumptions.push(
    "Employer PF and ESI are employer outlays that are part of CTC but never reach your bank account.",
  );
  assumptions.push(
    "Estimates only. Actual pay depends on your structure, exemptions, proofs and applicable state rules — this is not a payslip or a tax filing.",
  );

  return {
    annualCtc,
    employerPf,
    employerEsi,
    gratuityProvision,
    annualGross,
    basic,
    hra,
    specialAllowance,
    employeePf,
    employeeEsi,
    professionalTax: ptYearly,
    incomeTax: tax.totalTax,
    annualNet,
    monthlyGross,
    monthlyNet: annualNet / 12,
    monthlyTakeHome: annualNet / 12,
    tax,
    assumptions,
    esiApplicable,
    pfCapped: pfOnCeiling,
  };
}

/**
 * Annual gross for a target monthly take-home.
 *
 * Take-home is monotonic in gross but not linear (tax slabs, the PF ceiling and
 * the ESI cliff all bend the curve), so this bisects rather than inverting a
 * formula. 60 iterations of a 0–₹10 crore bracket converge well below one rupee.
 */
export function grossForNet(
  targetMonthlyNet: number,
  input: Omit<SalaryBreakdownInput, "annualCtc">,
): { annualGross: number; breakdown: SalaryBreakdown } {
  const target = Math.max(0, targetMonthlyNet) * 12;
  let low = 0;
  let high = 100_000_000;
  let best = salaryBreakdown({ ...input, annualCtc: 0 });
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const candidate = salaryBreakdown({ ...input, annualCtc: mid });
    best = candidate;
    if (candidate.annualNet < target) low = mid;
    else high = mid;
  }
  return { annualGross: best.annualGross, breakdown: best };
}

/**
 * Gratuity payable under the Payment of Gratuity Act for a monthly-rated
 * employee: 15/26 × last drawn (basic + DA) × completed years, with any part of
 * a year above six months counted as a full year. The statutory ceiling of
 * ₹20,00,000 is applied because it is the tax-exempt limit.
 */
export function gratuity(input: {
  monthlyBasicDa: number;
  years: number;
  months?: number;
}): {
  completedYears: number;
  amount: number;
  cappedAtStatutoryLimit: boolean;
  eligible: boolean;
} {
  const years = Math.max(0, input.years);
  const months = Math.max(0, input.months ?? 0);
  let counted = years;
  if (months >= 6) counted += 1;
  const raw = GRATUITY_RATE * Math.max(0, input.monthlyBasicDa) * counted;
  const cap = 2_000_000;
  return {
    completedYears: counted,
    amount: Math.min(raw, cap),
    cappedAtStatutoryLimit: raw > cap,
    eligible: years >= 5,
  };
}

/**
 * Full and final settlement: what is owed on the last working day.
 *
 * Components are computed, not guessed: unpaid salary for the notice shortfall,
 * leave encashment on the basic+DA day rate, the gratuity entitlement if
 * eligible, and any bonus or incentive entered. Notice recovery is a *deduction*
 * because it is money the employer would otherwise have to recover.
 */
export function fullAndFinal(input: {
  monthlyGross: number;
  monthlyBasicDa: number;
  daysWorkedInFinalMonth: number;
  daysInFinalMonth?: number;
  /** Leave days left in the balance, encashed at the basic+DA day rate. */
  leaveBalanceDays: number;
  yearsOfService: number;
  monthsOfService?: number;
  /** Notice days required minus days served; positive means a shortfall. */
  noticeShortfallDays: number;
  bonus?: number;
  otherDeductions?: number;
  salaryRecoveryPerDay?: number;
}): {
  proratedSalary: number;
  leaveEncashment: number;
  gratuityAmount: number;
  bonus: number;
  noticeRecovery: number;
  otherDeductions: number;
  grossPayable: number;
  totalDeductions: number;
  netSettlement: number;
  gratuityEligible: boolean;
  lines: { label: string; amount: number; kind: "earning" | "deduction" }[];
} {
  const daysInMonth = Math.max(1, input.daysInFinalMonth ?? 30);
  const worked = Math.min(
    Math.max(0, input.daysWorkedInFinalMonth),
    daysInMonth,
  );
  const dailyGross = Math.max(0, input.monthlyGross) / daysInMonth;
  const dailyBasic = Math.max(0, input.monthlyBasicDa) / daysInMonth;

  const proratedSalary = dailyGross * worked;
  const leaveEncashment = Math.max(0, input.leaveBalanceDays) * dailyBasic;
  const g = gratuity({
    monthlyBasicDa: input.monthlyBasicDa,
    years: input.yearsOfService,
    months: input.monthsOfService,
  });
  const bonus = Math.max(0, input.bonus ?? 0);
  const noticeRecovery =
    Math.max(0, input.noticeShortfallDays) *
    Math.max(0, input.salaryRecoveryPerDay ?? dailyGross);
  const otherDeductions = Math.max(0, input.otherDeductions ?? 0);

  const lines: {
    label: string;
    amount: number;
    kind: "earning" | "deduction";
  }[] = [
    {
      label: `Salary for ${worked} of ${daysInMonth} days`,
      amount: proratedSalary,
      kind: "earning",
    },
    {
      label: `Leave encashment (${Math.max(0, input.leaveBalanceDays)} days)`,
      amount: leaveEncashment,
      kind: "earning",
    },
    {
      label: g.eligible
        ? `Gratuity (${g.completedYears} years counted)`
        : "Gratuity (not eligible before 5 completed years)",
      amount: g.amount,
      kind: "earning",
    },
    { label: "Bonus or incentive", amount: bonus, kind: "earning" },
    {
      label: `Notice-period recovery (${Math.max(0, input.noticeShortfallDays)} days)`,
      amount: noticeRecovery,
      kind: "deduction",
    },
    { label: "Other deductions", amount: otherDeductions, kind: "deduction" },
  ];

  const grossPayable = proratedSalary + leaveEncashment + g.amount + bonus;
  const totalDeductions = noticeRecovery + otherDeductions;

  return {
    proratedSalary,
    leaveEncashment,
    gratuityAmount: g.amount,
    bonus,
    noticeRecovery,
    otherDeductions,
    grossPayable,
    totalDeductions,
    netSettlement: grossPayable - totalDeductions,
    gratuityEligible: g.eligible,
    lines,
  };
}

/** Round to paise, so a displayed total always equals the displayed parts. */
export const money = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

/** Indian-grouped currency, e.g. ₹12,34,567. */
export function inr(value: number, decimals = 0): string {
  return `₹${money(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
