import { describe, it, expect } from "vitest";
import { percentage, bmi, discount, gst } from "../lib/tools/calculators";
describe("Phase 9 calculation helpers", () => {
  it("calculates all percentage modes and rejects zero divisors", () => {
    expect(percentage("of", 20, 150).value).toBe(30);
    expect(percentage("is", 25, 200).value).toBe(12.5);
    expect(percentage("increase", 100, 20).value).toBe(120);
    expect(percentage("decrease", 100, 20).value).toBe(80);
    expect(percentage("difference", 100, 120).value).toBeCloseTo(18.181818);
    expect(percentage("reverse", 80, -20).value).toBe(100);
    expect(() => percentage("is", 1, 0)).toThrow();
    expect(() => percentage("reverse", 0, -100)).toThrow();
    expect(() => percentage("of", NaN, 1)).toThrow();
  });
  it("calculates metric and imperial BMI and validates inputs", () => {
    expect(bmi(170, 65, false).value).toBeCloseTo(22.49135);
    expect(bmi(70, 150, true).value).toBeCloseTo(21.5221, 3);
    expect(bmi(170, 65, false).category).toBe("Healthy weight");
    expect(() => bmi(0, 65, false)).toThrow();
    expect(() => bmi(170, -1, false)).toThrow();
  });
  it("calculates sequential and reverse discounts with tax", () => {
    const r = discount(1000, [10, 20], 5, false);
    expect(r.discounted).toBeCloseTo(720);
    expect(r.saved).toBeCloseTo(280);
    expect(r.total).toBeCloseTo(756);
    expect(discount(720, [10, 20], 0, true).original).toBeCloseTo(1000);
    expect(() => discount(0, [100], 0, true)).toThrow();
    expect(() => discount(1, [-1], 0, false)).toThrow();
  });
  it("adds and removes GST without double counting state and integrated tax", () => {
    expect(gst(1000, 18, false).total).toBe(1180);
    const r = gst(1180, 18, true);
    expect(r.taxable).toBeCloseTo(1000);
    expect(r.half).toBeCloseTo(90);
    expect(r.tax).toBeCloseTo(180);
    expect(gst(0, 0, false).total).toBe(0);
    expect(() => gst(-1, 18, false)).toThrow();
  });
});
