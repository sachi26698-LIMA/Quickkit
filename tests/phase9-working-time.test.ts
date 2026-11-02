import { describe, it, expect } from "vitest";
import {
  parseClock,
  workingTime,
  parseLocalTimestamp,
} from "../lib/tools/phase9-working-time";
describe("working-time calculation", () => {
  it("counts the overlap with a custom workweek and elapsed duration", () => {
    const r = workingTime(
      new Date(2024, 2, 4, 10),
      new Date(2024, 2, 6, 12),
      [1, 2, 3, 4, 5],
      9 * 60,
      17 * 60,
    );
    expect(r.workMs / 3600000).toBe(18);
    expect(r.elapsedMs / 3600000).toBe(50);
  });
  it("excludes unselected weekends and supports partial days", () => {
    const r = workingTime(
      new Date(2024, 2, 8, 16),
      new Date(2024, 2, 11, 10),
      [1, 2, 3, 4, 5],
      540,
      1020,
    );
    expect(r.workMs / 3600000).toBe(2);
  });
  it("validates range, days and working times", () => {
    expect(parseClock("09:30")).toBe(570);
    expect(parseLocalTimestamp("2024-02-29T12:30").getDate()).toBe(29);
    expect(() => parseLocalTimestamp("2023-02-29T12:30")).toThrow();
    expect(() => parseClock("24:30")).toThrow();
    const d = new Date(2024, 1, 1);
    expect(() =>
      workingTime(d, new Date(2023, 1, 1), [1], 540, 1020),
    ).toThrow();
    expect(() => workingTime(d, d, [], 540, 1020)).toThrow();
    expect(() => workingTime(d, d, [1], 1020, 540)).toThrow();
  });
});
