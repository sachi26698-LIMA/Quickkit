/** Four decimal places for ordinary numbers; small nonzero values use scientific notation. */
export function formatPercentageNumber(value: number) {
  if (!Number.isFinite(value))
    throw new Error("Result is outside the supported numeric range.");
  if (value !== 0 && (Math.abs(value) < 0.0001 || Math.abs(value) >= 1e15))
    return value.toExponential(6);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(
    Object.is(value, -0) ? 0 : value,
  );
}

/** Strict decimal input; report numeric underflow instead of silently treating it as zero. */
export function parsePercentageNumber(text: string) {
  const value = text.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value))
    throw new Error(
      "Enter a valid decimal number (scientific notation is supported).",
    );
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new Error("Number is outside the supported numeric range.");
  const significand = value.split(/[eE]/)[0];
  if (parsed === 0 && /[1-9]/.test(significand))
    throw new Error("Number is too small to represent accurately.");
  return parsed;
}
