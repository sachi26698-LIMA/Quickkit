import { describe, expect, it } from "vitest";
import {
  buyGet,
  compareValues,
  csvCell,
  gstInvoice,
  loanAffordability,
  originalFromDiscount,
  sequentialChanges,
} from "../lib/tools/phase9-v2-advanced";
describe("advanced percentage, GST and offer calculations", () => {
  it("compounds signed percentage changes and compares values safely", () => {
    const steps = sequentialChanges(100, [10, -20]);
    expect(steps[0].after).toBeCloseTo(110);
    expect(steps[1].after).toBeCloseTo(88);
    expect(compareValues([100, 120, 90]).map((c) => c.change)).toEqual([
      20, -25,
    ]);
    expect(compareValues([0, 2])[0].change).toBeNull();
    expect(originalFromDiscount(80, 20)).toBe(100);
    expect(() => originalFromDiscount(0, 100)).toThrow();
    expect(() => sequentialChanges(1, [])).toThrow();
    expect(() => compareValues([1, Infinity])).toThrow();
  });
  it("calculates multi-item exclusive and inclusive GST with discount", () => {
    const items = [
      { name: "A", quantity: 2, unitPrice: 100, discount: 10, rate: 18 },
      { name: "B", quantity: 1, unitPrice: 50, discount: 0, rate: 5 },
    ];
    const exclusive = gstInvoice(items, false);
    expect(exclusive.taxable).toBeCloseTo(230);
    expect(exclusive.tax).toBeCloseTo(34.9);
    expect(exclusive.total).toBeCloseTo(264.9);
    const inclusive = gstInvoice(
      [{ name: "A", quantity: 1, unitPrice: 118, discount: 0, rate: 18 }],
      true,
    );
    expect(inclusive.taxable).toBeCloseTo(100);
    expect(inclusive.tax).toBeCloseTo(18);
    expect(inclusive.total).toBeCloseTo(118);
    expect(() => gstInvoice([{ ...items[0], quantity: 0 }], false)).toThrow();
    expect(() => gstInvoice([{ ...items[0], discount: 101 }], false)).toThrow();
    expect(() => gstInvoice([], false)).toThrow();
  });
  it("calculates complete and partial buy-get groups", () => {
    const r = buyGet(100, 8, 2, 1, 10);
    expect(r.freeUnits).toBe(2);
    expect(r.paidUnits).toBe(6);
    expect(r.saved).toBe(200);
    expect(r.total).toBe(660);
    expect(buyGet(10, 5, 1, 2, 0).freeUnits).toBe(3);
    expect(() => buyGet(1, 1, 0, 1, 0)).toThrow();
    expect(() => buyGet(-1, 1, 1, 1, 0)).toThrow();
    expect(() => buyGet(1, 1.5, 1, 1, 0)).toThrow();
  });
  it("calculates an explicit affordability budget", () => {
    expect(loanAffordability(100000, 10000, 36).budget).toBe(26000);
    expect(loanAffordability(1000, 500, 30).budget).toBe(0);
    expect(() => loanAffordability(0, 0, 36)).toThrow();
    expect(() => loanAffordability(1000, -1, 36)).toThrow();
  });
  it("escapes CSV and prevents spreadsheet formula injection", () => {
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
    expect(csvCell(' A,"B"')).toBe('" A,""B"""');
    expect(csvCell(-1)).toBe('"-1"');
  });
});
