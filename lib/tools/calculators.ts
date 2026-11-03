/** Pure calculation helpers. Reject invalid input rather than returning misleading results. */
export function percentage(mode: string, a: number, b: number) {
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    Math.abs(a) > 1e12 ||
    Math.abs(b) > 1e12
  )
    throw new Error("Enter numbers between −1 trillion and 1 trillion.");
  let value: number, formula: string;
  switch (mode) {
    case "of":
      value = (a * b) / 100;
      formula = `${a} ÷ 100 × ${b}`;
      if (value === 0 && a !== 0 && b !== 0)
        throw new Error("Result is too small to represent accurately.");
      break;
    case "is":
      if (b === 0) throw new Error("The reference value cannot be zero.");
      value = (a / b) * 100;
      formula = `${a} ÷ ${b} × 100`;
      break;
    case "increase":
      value = a * (1 + b / 100);
      formula = `${a} × (1 + ${b} ÷ 100)`;
      break;
    case "decrease":
      value = a * (1 - b / 100);
      formula = `${a} × (1 − ${b} ÷ 100)`;
      break;
    case "difference": {
      const scale = Math.max(Math.abs(a), Math.abs(b));
      if (scale === 0) throw new Error("The average magnitude cannot be zero.");
      // Scale first to avoid underflow when both values are extremely small.
      const x = a / scale,
        y = b / scale;
      value = (Math.abs(x - y) / ((Math.abs(x) + Math.abs(y)) / 2)) * 100;
      formula = `|${a} − ${b}| ÷ average of |${a}| and |${b}| × 100`;
      break;
    }
    case "reverse":
      if (1 + b / 100 === 0)
        throw new Error("A −100% change cannot be reversed.");
      value = a / (1 + b / 100);
      formula = `${a} ÷ (1 + ${b} ÷ 100)`;
      break;
    default:
      throw new Error("Select a calculation.");
  }
  if (!Number.isFinite(value))
    throw new Error("Result is outside the supported numeric range.");
  if (
    value === 0 &&
    a !== 0 &&
    (mode === "is" ||
      mode === "reverse" ||
      (mode === "increase" && 1 + b / 100 !== 0) ||
      (mode === "decrease" && 1 - b / 100 !== 0))
  )
    throw new Error("Result is too small to represent accurately.");
  return { value, formula };
}

export function bmi(height: number, weight: number, imperial: boolean) {
  if (
    !Number.isFinite(height) ||
    !Number.isFinite(weight) ||
    height <= 0 ||
    weight <= 0 ||
    height > 1e6 ||
    weight > 1e12
  )
    throw new Error("Height and weight must be positive numbers.");
  const metres = imperial ? height * 0.0254 : height / 100;
  const kg = imperial ? weight * 0.45359237 : weight;
  const value = kg / metres ** 2;
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(metres ** 2) ||
    metres ** 2 === 0
  )
    throw new Error("Values are outside the supported range.");
  const factor = imperial ? 1 / 0.45359237 : 1;
  return {
    value,
    category:
      value < 18.5
        ? "Underweight"
        : value < 25
          ? "Healthy weight"
          : value < 30
            ? "Overweight"
            : "Obesity",
    low: 18.5 * metres ** 2 * factor,
    high: 24.9 * metres ** 2 * factor,
  };
}
export function discount(
  price: number,
  rates: number[],
  tax: number,
  reverse: boolean,
) {
  if (
    ![price, tax, ...rates].every(Number.isFinite) ||
    price < 0 ||
    price > 1e12 ||
    tax < 0 ||
    tax > 1e6 ||
    rates.length > 100 ||
    rates.some((r) => r < 0 || r > 100)
  )
    throw new Error(
      "Enter a non-negative price and tax, and discounts between 0 and 100%.",
    );
  const multiplier = rates.reduce((v, r) => v * (1 - r / 100), 1);
  if (reverse && multiplier === 0)
    throw new Error("A 100% discount cannot be reversed.");
  const original = reverse ? price / multiplier : price;
  const discounted = original * multiplier;
  return {
    original,
    discounted,
    saved: original - discounted,
    taxAmount: (discounted * tax) / 100,
    total: discounted * (1 + tax / 100),
  };
}
export function gst(amount: number, rate: number, inclusive: boolean) {
  if (
    ![amount, rate].every(Number.isFinite) ||
    amount < 0 ||
    amount > 1e12 ||
    rate < 0 ||
    rate > 1e6
  )
    throw new Error("Amount and GST rate must be non-negative numbers.");
  const taxable = inclusive ? amount / (1 + rate / 100) : amount;
  const tax = (taxable * rate) / 100;
  return { taxable, tax, total: taxable + tax, half: tax / 2 };
}
