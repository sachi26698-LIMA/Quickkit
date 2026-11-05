import { describe, it, expect } from "vitest";
import { convert, temperature } from "../lib/tools/phase9-conversion";
describe("advanced conversions", () => {
  it("handles acceleration and milliseconds", () => {
    expect(
      convert(
        1,
        "Acceleration",
        "Standard gravity",
        "Metres per second squared",
      ),
    ).toBe(9.80665);
    expect(convert(1000, "Time", "Millisecond", "Second")).toBe(1);
  });
  it("handles Rankine and absolute-zero boundaries", () => {
    expect(temperature(0, "Celsius", "Rankine")).toBeCloseTo(491.67, 8);
    expect(temperature(0, "Rankine", "Fahrenheit")).toBeCloseTo(-459.67, 8);
    expect(temperature(491.67, "Rankine", "Celsius")).toBeCloseTo(0, 8);
    expect(() => temperature(-0.000000000001, "Kelvin", "Celsius")).toThrow(
      /absolute zero/,
    );
    expect(() => temperature(-459.68, "Fahrenheit", "Kelvin")).toThrow(
      /absolute zero/,
    );
  });
});
