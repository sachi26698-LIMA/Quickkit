import { describe, it, expect } from "vitest";
import { zodiac } from "../lib/tools/phase9-zodiac";
describe("optional zodiac date ranges", () => {
  it("uses conventional sign boundaries", () => {
    expect(zodiac("2000-01-19")).toBe("Capricorn");
    expect(zodiac("2000-01-20")).toBe("Aquarius");
    expect(zodiac("2000-02-29")).toBe("Pisces");
    expect(zodiac("2000-12-22")).toBe("Capricorn");
    expect(() => zodiac("2023-02-29")).toThrow();
  });
});
