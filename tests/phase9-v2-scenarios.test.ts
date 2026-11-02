import { describe, it, expect } from "vitest";
import {
  compareDiscountOffers,
  discountRate,
  variableLoan,
} from "../lib/tools/phase9-v2-scenarios";
describe("V2 offer and loan scenarios", () => {
  it("compares exclusive and inclusive offers with tax", () => {
    const exclusive = compareDiscountOffers(100, 10, false, [10, 20]);
    expect(exclusive[0].total).toBeCloseTo(99);
    expect(exclusive[1].total).toBeCloseTo(88);
    expect(exclusive[1].saved).toBeCloseTo(22);
    const inclusive = compareDiscountOffers(110, 10, true, [10, 20]);
    expect(inclusive[0].total).toBeCloseTo(99);
    expect(inclusive[1].total).toBeCloseTo(88);
    expect(discountRate(100, 80)).toBe(20);
    expect(() => discountRate(0, 0)).toThrow();
    expect(() => compareDiscountOffers(1, 0, false, [101, 0])).toThrow();
  });
  it("calculates monthly and quarterly loans", () => {
    const monthly = variableLoan(1200, 12, 12, 0, []);
    expect(monthly.initialPayment).toBe(100);
    expect(monthly.schedule).toHaveLength(12);
    expect(monthly.total).toBe(1200);
    const quarterly = variableLoan(1200, 12, 4, 12, []);
    expect(quarterly.initialPayment).toBeCloseTo(322.83243, 4);
    expect(quarterly.schedule).toHaveLength(4);
    expect(quarterly.schedule.at(-1)?.balance).toBe(0);
  });
  it("recalculates payment at rate changes and rejects invalid periods", () => {
    const r = variableLoan(1200, 12, 12, 0, [{ period: 7, annualRate: 12 }]);
    expect(r.schedule[5].balance).toBe(600);
    expect(r.schedule[6].scheduled).toBeCloseTo(103.5290200265, 4);
    expect(r.interest).toBeCloseTo(21.1741201592, 4);
    expect(r.schedule.at(-1)?.balance).toBe(0);
    expect(() => variableLoan(100, 11, 4, 5, [])).toThrow(/multiple/);
    expect(() =>
      variableLoan(100, 12, 12, 5, [
        { period: 2, annualRate: 1 },
        { period: 2, annualRate: 2 },
      ]),
    ).toThrow(/unique/);
    expect(() => variableLoan(100, 12, 12, -1, [])).toThrow();
  });
});
