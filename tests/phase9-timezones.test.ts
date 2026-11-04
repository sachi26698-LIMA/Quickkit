import { describe, it, expect } from "vitest";
import {
  resolveZonedTime,
  formatZonedTime,
} from "../lib/tools/phase9-timezones";
describe("IANA meeting time", () => {
  it("handles dates, offsets and daylight-saving gaps", () => {
    const r = resolveZonedTime("2024-01-01T09:00", "Asia/Kolkata");
    expect(r.instant.toISOString()).toBe("2024-01-01T03:30:00.000Z");
    expect(formatZonedTime(r.instant, "America/New_York", false)).toContain(
      "31 Dec 2023",
    );
    expect(() =>
      resolveZonedTime("2024-03-10T02:30", "America/New_York"),
    ).toThrow(/does not exist/);
  });
  it("requires disambiguation for a repeated time", () => {
    expect(() =>
      resolveZonedTime("2024-11-03T01:30", "America/New_York"),
    ).toThrow(/occurs twice/);
    expect(
      resolveZonedTime(
        "2024-11-03T01:30",
        "America/New_York",
        "earlier",
      ).instant.toISOString(),
    ).toBe("2024-11-03T05:30:00.000Z");
    expect(
      resolveZonedTime(
        "2024-11-03T01:30",
        "America/New_York",
        "later",
      ).instant.toISOString(),
    ).toBe("2024-11-03T06:30:00.000Z");
  });
  it("rejects invalid input and zones", () => {
    expect(() => resolveZonedTime("2024-02-30T10:00", "UTC")).toThrow();
    expect(() => resolveZonedTime("2024-01-01T09:00", "Not/AZone")).toThrow(
      /IANA/,
    );
  });
});
