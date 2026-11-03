import { describe, it, expect } from "vitest";
import {
  age,
  dateDifference,
  parseDate,
  shiftDays,
} from "../lib/tools/phase9-dates";
import { loan } from "../lib/tools/phase9-loans";
import { convert, temperature } from "../lib/tools/phase9-conversion";
import { scientific } from "../lib/tools/phase9-scientific";
describe("remaining Phase 9 calculators", () => {
  it("age: handles leap birthdays and rejects future birth dates", () => {
    const r = age(parseDate("2000-02-29"), parseDate("2023-02-28"));
    expect(r.years).toBe(23);
    expect(r.weekday).toBe("Tuesday");
    expect(r.untilBirthday).toBe(0);
    expect(() =>
      age(parseDate("2024-01-01"), parseDate("2023-01-01")),
    ).toThrow();
    expect(() => parseDate("2023-02-29")).toThrow();
  });
  it("date difference: includes endpoint and counts weekdays", () => {
    const a = parseDate("2024-02-28"),
      b = parseDate("2024-03-01");
    expect(dateDifference(a, b).days).toBe(2);
    expect(dateDifference(a, b, true).business).toBe(3);
    expect(shiftDays(a, 2)).toBe("2024-03-01");
    expect(shiftDays(b, -1)).toBe("2024-02-29");
    expect(() => shiftDays(a, 1.5)).toThrow();
  });
  it("EMI: standard and zero rate with prepayment", () => {
    expect(loan(100000, 12, 12).payment).toBeCloseTo(8884.8789, 3);
    expect(loan(1200, 0, 12).payment).toBe(100);
    expect(loan(1200, 0, 12, 100).schedule).toHaveLength(6);
  });
  it("loan: schedule balances and invalid input", () => {
    const r = loan(10000, 6, 24);
    expect(r.schedule.at(-1)?.balance).toBeCloseTo(0);
    expect(r.total).toBeCloseTo(10000 + r.interest);
    expect(() => loan(1, -1, 12)).toThrow();
    expect(() => loan(1, 1, 0)).toThrow();
  });
  it("scientific: precedence, trig, factorial and errors", () => {
    expect(scientific("-2^2", true)).toBe(-4);
    expect(scientific("2^3^2", true)).toBe(512);
    expect(scientific("sin(30)+5!", true)).toBeCloseTo(120.5);
    expect(scientific("asin(1)", true)).toBe(90);
    expect(() => scientific("1/0", true)).toThrow();
    expect(() => scientific("sqrt(-1)", true)).toThrow();
    expect(() => scientific("alert(1)", true)).toThrow();
  });
  it("unit converter: linear and reciprocal units", () => {
    expect(convert(1, "Length", "Mile", "Metre")).toBeCloseTo(1609.344);
    expect(convert(1, "Data storage", "Kibibyte", "Byte")).toBe(1024);
    expect(convert(10, "Fuel consumption", "L/100 km", "US mpg")).toBeCloseTo(
      23.5214583,
    );
    expect(() =>
      convert(0, "Fuel consumption", "US mpg", "L/100 km"),
    ).toThrow();
  });
  it("temperature: freezing, absolute zero and invalid values", () => {
    expect(temperature(0, "Celsius", "Fahrenheit")).toBeCloseTo(32);
    expect(temperature(-40, "Fahrenheit", "Celsius")).toBeCloseTo(-40);
    expect(temperature(0, "Kelvin", "Celsius")).toBeCloseTo(-273.15);
    expect(() => temperature(-1, "Kelvin", "Celsius")).toThrow();
  });
  it("time converter: explicit approximations", () => {
    expect(convert(1, "Time", "Month (30 days)", "Day")).toBe(30);
    expect(convert(1, "Time", "Year (365 days)", "Hour")).toBe(8760);
    expect(() => convert(NaN, "Time", "Day", "Hour")).toThrow();
  });
});
