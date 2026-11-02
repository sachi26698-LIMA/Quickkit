export function loan(
  principal: number,
  annualRate: number,
  months: number,
  extra = 0,
) {
  if (
    ![principal, annualRate, months, extra].every(Number.isFinite) ||
    principal <= 0 ||
    principal > 1e12 ||
    annualRate < 0 ||
    annualRate > 1000 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 1200 ||
    extra < 0 ||
    extra > 1e12
  )
    throw new Error(
      "Enter a positive principal (up to 1 trillion), rate 0–1000%, whole tenure 1–1200 months, and non-negative extra payment.",
    );
  const rate = annualRate / 1200;
  const payment =
    rate === 0
      ? principal / months
      : (principal * rate) / -Math.expm1(-months * Math.log1p(rate));
  let balance = principal,
    interestTotal = 0,
    paid = 0;
  const schedule: {
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }[] = [];
  for (let month = 1; month <= months && balance > 0; month++) {
    const interest = balance * rate;
    const actual =
      month === months
        ? balance + interest
        : Math.min(balance + interest, payment + extra);
    const paidPrincipal = actual - interest;
    balance = Math.max(0, balance - paidPrincipal);
    interestTotal += interest;
    paid += actual;
    schedule.push({
      month,
      payment: actual,
      principal: paidPrincipal,
      interest,
      balance,
    });
  }
  return { payment, interest: interestTotal, total: paid, schedule };
}
