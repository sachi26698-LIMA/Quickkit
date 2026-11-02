/** Independent pure helpers for advanced workflows. Calculations use unrounded binary floating point. */
export type InvoiceInput = {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  rate: number;
};
export function gstInvoice(items: InvoiceInput[], inclusive: boolean) {
  if (!items.length || items.length > 100)
    throw new Error("Enter between 1 and 100 items.");
  const lines = items.map((item, index) => {
    const { quantity, unitPrice, discount, rate } = item;
    if (
      ![quantity, unitPrice, discount, rate].every(Number.isFinite) ||
      quantity <= 0 ||
      quantity > 1e6 ||
      unitPrice < 0 ||
      unitPrice > 1e9 ||
      discount < 0 ||
      discount > 100 ||
      rate < 0 ||
      rate > 1000
    )
      throw new Error(
        `Item ${index + 1}: quantity must be positive; price and rate non-negative; discount between 0 and 100%.`,
      );
    const gross = quantity * unitPrice;
    const discountAmount = (gross * discount) / 100;
    const afterDiscount = gross - discountAmount;
    const taxable = inclusive
      ? afterDiscount / (1 + rate / 100)
      : afterDiscount;
    const tax = (taxable * rate) / 100;
    return {
      ...item,
      gross,
      discountAmount,
      taxable,
      tax,
      total: taxable + tax,
    };
  });
  const sum = (key: "gross" | "discountAmount" | "taxable" | "tax" | "total") =>
    lines.reduce((total, item) => total + item[key], 0);
  return {
    lines,
    gross: sum("gross"),
    discount: sum("discountAmount"),
    taxable: sum("taxable"),
    tax: sum("tax"),
    total: sum("total"),
  };
}
export function originalFromDiscount(final: number, rate: number) {
  if (
    !Number.isFinite(final) ||
    final < 0 ||
    final > 1e12 ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate >= 100
  )
    throw new Error(
      "Enter a non-negative final value and a discount from 0% up to, but not including, 100%.",
    );
  return final / (1 - rate / 100);
}
export function sequentialChanges(initial: number, rates: number[]) {
  if (
    !Number.isFinite(initial) ||
    Math.abs(initial) > 1e12 ||
    !rates.length ||
    rates.length > 100 ||
    rates.some((rate) => !Number.isFinite(rate) || Math.abs(rate) > 10000)
  )
    throw new Error(
      "Enter an initial value and 1–100 changes between −10,000% and 10,000%.",
    );
  let value = initial;
  return rates.map((rate) => {
    const before = value;
    value = before * (1 + rate / 100);
    if (!Number.isFinite(value) || Math.abs(value) > 1e15)
      throw new Error("Result exceeds the supported range.");
    if (value === 0 && before !== 0 && 1 + rate / 100 !== 0)
      throw new Error("Result is too small to represent accurately.");
    return { before, rate, after: value };
  });
}
export function compareValues(values: number[]) {
  if (
    values.length < 2 ||
    values.length > 100 ||
    values.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e12)
  )
    throw new Error("Enter 2–100 values between −1 trillion and 1 trillion.");
  return values.slice(1).map((value, i) => {
    const previous = values[i];
    const change =
      previous === 0 ? null : ((value - previous) / Math.abs(previous)) * 100;
    if (change !== null && !Number.isFinite(change))
      throw new Error("Percentage change exceeds the supported numeric range.");
    return { previous, value, change };
  });
}
export function buyGet(
  unitPrice: number,
  quantity: number,
  buy: number,
  free: number,
  tax: number,
) {
  if (
    !Number.isFinite(unitPrice) ||
    unitPrice < 0 ||
    unitPrice > 1e12 ||
    ![quantity, buy, free].every(Number.isSafeInteger) ||
    quantity < 1 ||
    quantity > 1e6 ||
    buy < 1 ||
    free < 1 ||
    buy + free > 1e6 ||
    !Number.isFinite(tax) ||
    tax < 0 ||
    tax > 1000
  )
    throw new Error(
      "Enter a non-negative price, positive whole quantities, and tax from 0% to 1000%.",
    );
  const freeUnits =
    Math.floor(quantity / (buy + free)) * free +
    Math.max(0, (quantity % (buy + free)) - buy);
  const subtotal = (quantity - freeUnits) * unitPrice;
  const taxAmount = (subtotal * tax) / 100;
  return {
    freeUnits,
    paidUnits: quantity - freeUnits,
    original: quantity * unitPrice,
    saved: freeUnits * unitPrice,
    subtotal,
    tax: taxAmount,
    total: subtotal + taxAmount,
  };
}
export function csvCell(value: string | number) {
  let text = String(value);
  // Prevent spreadsheet formula injection, even after leading whitespace/control characters.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) && typeof value === "string")
    text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function loanAffordability(
  monthlyIncome: number,
  existingDebt: number,
  maxRatio: number,
) {
  if (
    ![monthlyIncome, existingDebt, maxRatio].every(Number.isFinite) ||
    monthlyIncome <= 0 ||
    monthlyIncome > 1e12 ||
    existingDebt < 0 ||
    existingDebt > 1e12 ||
    maxRatio <= 0 ||
    maxRatio > 100
  )
    throw new Error(
      "Enter positive monthly income, non-negative existing payments, and a ratio between 0 and 100%.",
    );
  const budget = Math.max(0, (monthlyIncome * maxRatio) / 100 - existingDebt);
  return { budget, allowedDebt: (monthlyIncome * maxRatio) / 100 };
}
