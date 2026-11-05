/** Calculate profit on pre-tax sale proceeds. Margin is undefined if revenue is zero. */
export function profit(cost: number, sale: number) {
  if (
    !Number.isFinite(cost) ||
    !Number.isFinite(sale) ||
    cost <= 0 ||
    sale < 0 ||
    cost > 1e12 ||
    sale > 1e12
  )
    throw new Error(
      "Enter a cost greater than zero and a non-negative selling price, both at most 1 trillion.",
    );
  const amount = sale - cost;
  const margin = sale === 0 ? null : (amount / sale) * 100;
  const markup = (amount / cost) * 100;
  if (
    !Number.isFinite(amount) ||
    (margin !== null && !Number.isFinite(margin)) ||
    !Number.isFinite(markup)
  )
    throw new Error("Result is outside the supported numeric range.");
  return { amount, margin, markup };
}
