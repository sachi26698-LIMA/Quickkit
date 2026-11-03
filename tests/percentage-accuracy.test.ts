import { describe, it, expect } from "vitest";
import { percentage } from "../lib/tools/calculators";
import {
  compareValues,
  originalFromDiscount,
  sequentialChanges,
} from "../lib/tools/phase9-v2-advanced";
import {
  formatPercentageNumber,
  parsePercentageNumber,
} from "../lib/tools/percentage-format";

describe("percentage calculator — formula and numerical boundaries", () => {
  it.each([
    ["of", 20, 150, 30],
    ["of", -10, 200, -20],
    ["of", 0, 500, 0],
    ["is", 25, 200, 12.5],
    ["is", -25, 200, -12.5],
    ["is", 25, -200, -12.5],
    ["increase", 80, 25, 100],
    ["increase", -100, 20, -120],
    ["increase", 100, -20, 80],
    ["decrease", 100, 25, 75],
    ["decrease", -100, 20, -80],
    ["decrease", 100, -20, 120],
    ["difference", 100, 120, 18.181818181818183],
    ["difference", -100, 100, 200],
    ["difference", -100, -50, 66.66666666666666],
    ["reverse", 80, -20, 100],
    ["reverse", 120, 20, 100],
    ["reverse", -120, 20, -100],
    ["reverse", 0, 50, 0],
  ])("%s(%s,%s) = %s", (mode, a, b, expected) =>
    expect(
      percentage(mode as string, a as number, b as number).value,
    ).toBeCloseTo(expected as number, 10),
  );
  it("handles zero and rejects invalid and unrepresentable values", () => {
    expect(() => percentage("is", 1, 0)).toThrow(/zero/);
    expect(() => percentage("difference", 0, 0)).toThrow(/zero/);
    expect(() => percentage("reverse", 0, -100)).toThrow(/cannot be reversed/);
    expect(() => percentage("is", 1, 1e-320)).toThrow(/numeric range/);
    expect(() => percentage("of", 5e-324, 1)).toThrow(/too small/);
    expect(percentage("difference", 1e-320, 2e-320).value).toBeCloseTo(
      66.6666666667,
    );
    expect(() => percentage("of", Infinity, 1)).toThrow();
    expect(() => percentage("of", 1e13, 1)).toThrow();
  });
  it("validates numeric text without silently accepting underflow or non-decimal syntax", () => {
    expect(parsePercentageNumber("-1.25e2")).toBe(-125);
    expect(parsePercentageNumber("0e-999")).toBe(0);
    expect(() => parsePercentageNumber("1e-999")).toThrow(/too small/);
    expect(() => parsePercentageNumber("0x10")).toThrow(/valid decimal/);
    expect(() => parsePercentageNumber("1e999")).toThrow(/numeric range/);
  });
  it("preserves tiny nonzero values in the formatted output", () => {
    expect(formatPercentageNumber((1 / 3) * 100)).toBe("33.3333");
    expect(formatPercentageNumber(1e-8)).toBe("1.000000e-8");
    expect(formatPercentageNumber(-1e-8)).toBe("-1.000000e-8");
    expect(formatPercentageNumber(0)).toBe("0");
  });
  it("compares signed and zero bases and guards overflow", () => {
    expect(compareValues([-100, -50, -150]).map((x) => x.change)).toEqual([
      50, -200,
    ]);
    expect(compareValues([0, 10])[0].change).toBeNull();
    expect(() => compareValues([1e-320, 1])).toThrow(/numeric range/);
    expect(sequentialChanges(100, [10, -20]).at(-1)?.after).toBeCloseTo(88);
    expect(sequentialChanges(10, [-100])[0].after).toBe(0);
    expect(() => sequentialChanges(1e-320, [-99.999999])).toThrow(/too small/);
    expect(originalFromDiscount(80, 20)).toBe(100);
    expect(() => originalFromDiscount(1, 100)).toThrow();
  });
});
