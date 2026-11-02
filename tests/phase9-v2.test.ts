import { describe, expect, it } from "vitest";
import { scientific } from "../lib/tools/phase9-scientific";
import { convert, temperature } from "../lib/tools/phase9-conversion";
import {
  age,
  dateDifference,
  parseDate,
  shiftCalendar,
} from "../lib/tools/phase9-dates";
import { loan } from "../lib/tools/phase9-loans";

describe("Phase 9 V2 numerical features", () => {
  it("evaluates hyperbolic functions, combinations, permutations and previous answers", () => {
    expect(scientific("sinh(0)+cosh(0)", true)).toBe(1);
    expect(scientific("nCr(5,2)+nPr(5,2)", true)).toBe(30);
    expect(scientific("ans^2", true, 3)).toBe(9);
    expect(scientific("1e-3+2E2", true)).toBeCloseTo(200.001);
    expect(scientific("-2^2+2^3^2", true)).toBe(508);
    expect(() => scientific("ans+1", true)).toThrow();
    expect(() => scientific("nCr(3,4)", true)).toThrow();
    expect(() => scientific("nPr(171,2)", true)).toThrow();
    expect(() => scientific("tan(90)", true)).toThrow();
    expect(() => scientific("constructor(2)", true)).toThrow();
  });
  it("converts added categories and distinguishes data units", () => {
    expect(convert(1, "Force", "Pound-force", "Newton")).toBeCloseTo(
      4.4482216152605,
    );
    expect(convert(1, "Torque", "Pound-foot", "Newton metre")).toBeCloseTo(
      1.3558179483314,
    );
    expect(
      convert(
        1,
        "Density",
        "Gram per cubic centimetre",
        "Kilogram per cubic metre",
      ),
    ).toBe(1000);
    expect(convert(180, "Angle", "Degree", "Radian")).toBeCloseTo(Math.PI);
    expect(convert(1, "Data storage", "Kilobyte", "Byte")).toBe(1000);
    expect(convert(1, "Data storage", "Kibibyte", "Byte")).toBe(1024);
    expect(temperature(-40, "Celsius", "Fahrenheit")).toBeCloseTo(-40);
    expect(() => temperature(-274, "Celsius", "Kelvin")).toThrow();
  });
  it("clamps calendar months and excludes unique holidays, not weekend holidays", () => {
    expect(shiftCalendar(parseDate("2024-01-31"), 1, "months")).toBe(
      "2024-02-29",
    );
    expect(shiftCalendar(parseDate("2024-02-29"), 1, "years")).toBe(
      "2025-02-28",
    );
    expect(shiftCalendar(parseDate("2024-03-01"), -1, "weeks")).toBe(
      "2024-02-23",
    );
    const start = parseDate("2024-03-01"),
      end = parseDate("2024-03-05");
    expect(
      dateDifference(start, end, true, [
        parseDate("2024-03-04"),
        parseDate("2024-03-04"),
        parseDate("2024-03-02"),
      ]).business,
    ).toBe(2);
    expect(() => shiftCalendar(start, 1.5, "months")).toThrow();
    expect(
      age(parseDate("2000-02-29"), parseDate("2023-03-01")).previousBirthday,
    ).toBe("2023-02-28");
  });
  it("models one-time and recurring prepayment without overstating the final payment", () => {
    const base = loan(1200, 0, 12);
    const paid = loan(1200, 0, 12, 0, { month: 2, amount: 500 });
    expect(paid.schedule[1].payment).toBe(600);
    expect(paid.schedule.length).toBe(7);
    expect(paid.total).toBeCloseTo(base.total);
    expect(
      loan(100000, 12, 12, 0, { month: 2, amount: 20000 }).interest,
    ).toBeLessThan(loan(100000, 12, 12).interest);
    expect(() => loan(100, 0, 12, 0, { month: 13, amount: 2 })).toThrow();
  });
});
