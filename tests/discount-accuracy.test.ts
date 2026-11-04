import { describe, it, expect } from "vitest";
import { discount } from "../lib/tools/calculators";
import { profit } from "../lib/tools/phase9-profit";
import {
  compareDiscountOffers,
  discountRate,
} from "../lib/tools/phase9-v2-scenarios";
describe("Discount independent examples and boundaries", () => {
  it("applies successive percentages before tax", () => {
    const r = discount(1250, [12, 7.5], 18, false);
    expect(r.discounted).toBeCloseTo(1017.5, 10);
    expect(r.saved).toBeCloseTo(232.5, 10);
    expect(r.taxAmount).toBeCloseTo(183.15, 10);
    expect(r.total).toBeCloseTo(1200.65, 10);
    expect(discount(1017.5, [12, 7.5], 0, true).original).toBeCloseTo(1250, 10);
  });
  it("handles zero, full discount, invalid rates and numeric extremes", () => {
    expect(discount(0, [100], 18, false).total).toBe(0);
    expect(discount(100, [100], 18, false).total).toBe(0);
    expect(() => discount(1, [100], 0, true)).toThrow(/cannot be reversed/);
    expect(() => discount(100, [-0.1], 0, false)).toThrow();
    expect(Number.isFinite(discount(1, [99.9999999], 0, true).original)).toBe(
      true,
    );
    expect(() => discount(1, Array(100).fill(99.9999999), 0, true)).toThrow(
      /too small/,
    );
    expect(() => profit(5e-324, 1)).toThrow(/numeric range/);
  });
  it("distinguishes tax inclusive and exclusive savings", () => {
    const ex = compareDiscountOffers(100, 10, false, [10, 20]);
    expect(ex[1].total).toBeCloseTo(88);
    expect(ex[1].saved).toBeCloseTo(22);
    const inc = compareDiscountOffers(110, 10, true, [10, 20]);
    expect(inc[1].tax).toBeCloseTo(8);
    expect(inc[1].total).toBeCloseTo(88);
    expect(discountRate(110, 88)).toBeCloseTo(20);
  });
});
