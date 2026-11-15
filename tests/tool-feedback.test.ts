import { describe, expect, it } from "vitest";
import { parseToolFeedback } from "../lib/tool-feedback";

const valid = {
  tool: "merge-pdf",
  rating: 5,
  tags: ["Easy to use"],
  comment: "Lovely tool",
  createdAt: "2026-11-13T10:00:00Z",
};
describe("shared device-local tool feedback", () => {
  it("preserves reviews for the laptop without changing user text", () => {
    expect(parseToolFeedback(JSON.stringify([valid]))).toEqual([valid]);
  });
  it("ignores corrupt and invalid stored data", () => {
    for (const raw of [
      "oops",
      "{}",
      "null",
      JSON.stringify([
        null,
        { ...valid, rating: 0 },
        { ...valid, rating: 1.5 },
        { ...valid, rating: 6 },
        { ...valid, comment: "x".repeat(601) },
        { ...valid, tags: [4] },
        { ...valid, createdAt: "bad" },
      ]),
    ]) {
      expect(parseToolFeedback(raw)).toEqual([]);
    }
  });
  it("preserves older reviews instead of replacing them", () => {
    const entries = Array.from({ length: 105 }, (_, i) => ({
      ...valid,
      comment: `${i}`,
    }));
    expect(parseToolFeedback(JSON.stringify(entries))).toHaveLength(105);
    expect(parseToolFeedback(JSON.stringify(entries))[0].comment).toBe("0");
  });
});
