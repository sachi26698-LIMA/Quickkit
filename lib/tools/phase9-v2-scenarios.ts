/** Offer comparisons calculate on unrounded amounts and round only for presentation. */
export function compareDiscountOffers(
  price: number,
  taxRate: number,
  taxInclusive: boolean,
  discounts: number[],
) {
  if (
    ![price, taxRate, ...discounts].every(Number.isFinite) ||
    price < 0 ||
    price > 1e12 ||
    taxRate < 0 ||
    taxRate > 1000 ||
    discounts.length < 2 ||
    discounts.length > 20 ||
    discounts.some((d) => d < 0 || d > 100)
  )
    throw new Error(
      "Enter a non-negative price, tax from 0–1000%, and 2–20 discounts from 0–100%.",
    );
  const preTaxOriginal = taxInclusive ? price / (1 + taxRate / 100) : price;
  return discounts.map((rate) => {
    const taxable = preTaxOriginal * (1 - rate / 100);
    const tax = (taxable * taxRate) / 100;
    return {
      rate,
      original: preTaxOriginal,
      taxable,
      tax,
      total: taxable + tax,
      saved: (preTaxOriginal - taxable) * (1 + taxRate / 100),
    };
  });
}
export function discountRate(original: number, final: number) {
  if (
    ![original, final].every(Number.isFinite) ||
    original <= 0 ||
    original > 1e12 ||
    final < 0 ||
    final > original
  )
    throw new Error(
      "Original price must be positive and final price must be between zero and the original.",
    );
  return ((original - final) / original) * 100;
}
export type RateChange = { period: number; annualRate: number };
/** Nominal annual rate / payments per year, reset payment at each rate change over the remaining scheduled periods. */
export function variableLoan(
  principal: number,
  months: number,
  paymentsPerYear: number,
  initialRate: number,
  changes: RateChange[],
  extra = 0,
) {
  if (
    ![principal, months, paymentsPerYear, initialRate, extra].every(
      Number.isFinite,
    ) ||
    principal <= 0 ||
    principal > 1e12 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 1200 ||
    ![1, 4, 12].includes(paymentsPerYear) ||
    initialRate < 0 ||
    initialRate > 1000 ||
    extra < 0 ||
    extra > 1e12
  )
    throw new Error(
      "Enter a positive principal, rate 0–1000%, whole tenure 1–1200 months, and a non-negative extra payment.",
    );
  const periodMonths = 12 / paymentsPerYear;
  if (months % periodMonths !== 0)
    throw new Error(
      `Tenure must be a multiple of ${periodMonths} months for this frequency.`,
    );
  const periods = months / periodMonths;
  if (
    changes.length > 100 ||
    changes.some(
      (c) =>
        !Number.isInteger(c.period) ||
        c.period < 2 ||
        c.period > periods ||
        !Number.isFinite(c.annualRate) ||
        c.annualRate < 0 ||
        c.annualRate > 1000,
    ) ||
    new Set(changes.map((c) => c.period)).size !== changes.length
  )
    throw new Error(
      "Rate changes need unique payment periods from 2 to the final period and rates from 0–1000%.",
    );
  const map = new Map(changes.map((c) => [c.period, c.annualRate]));
  let balance = principal,
    rate = initialRate,
    payment = 0,
    interestTotal = 0,
    total = 0;
  const schedule: {
    period: number;
    annualRate: number;
    scheduled: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }[] = [];
  for (let period = 1; period <= periods && balance > 0; period++) {
    if (period === 1 || map.has(period)) {
      rate = map.get(period) ?? rate;
      const r = rate / 100 / paymentsPerYear;
      const remaining = periods - period + 1;
      payment =
        r === 0
          ? balance / remaining
          : (balance * r) / -Math.expm1(-remaining * Math.log1p(r));
    }
    const interest = (balance * rate) / 100 / paymentsPerYear;
    const actual =
      period === periods
        ? balance + interest
        : Math.min(balance + interest, payment + extra);
    const paidPrincipal = actual - interest;
    if (paidPrincipal <= 0)
      throw new Error(
        "This rate and tenure cannot be amortized with the available numeric precision.",
      );
    balance = Math.max(0, balance - paidPrincipal);
    interestTotal += interest;
    total += actual;
    schedule.push({
      period,
      annualRate: rate,
      scheduled: payment,
      payment: actual,
      principal: paidPrincipal,
      interest,
      balance,
    });
  }
  return {
    schedule,
    initialPayment: schedule[0].scheduled,
    interest: interestTotal,
    total,
  };
}
