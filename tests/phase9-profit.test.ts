import { describe, it, expect } from "vitest";
import { profit } from "../lib/tools/phase9-profit";
describe("profit margin and markup", () => {
  it("uses selling price for margin and cost for markup", () => {
    expect(profit(80, 100)).toEqual({ amount: 20, margin: 20, markup: 25 });
    expect(profit(100, 80)).toEqual({ amount: -20, margin: -25, markup: -20 });
    expect(profit(100, 0)).toEqual({
      amount: -100,
      margin: null,
      markup: -100,
    });
  });
  it("rejects invalid amounts", () => {
    for (const pair of [
      [0, 2],
      [-1, 5],
      [2, -1],
      [Infinity, 2],
      [1e13, 1],
    ])
      expect(() => profit(pair[0], pair[1])).toThrow();
  });
});
