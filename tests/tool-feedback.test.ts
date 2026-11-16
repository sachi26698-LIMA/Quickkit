import { describe, expect, it } from "vitest";
import {
  TOOL_FEEDBACK_PROMPT_INTERVAL_MS,
  canPromptToolFeedback,
  parseToolFeedback,
  parseToolFeedbackPromptLog,
} from "../lib/tool-feedback";

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

describe("once-a-day rating invitation", () => {
  const now = Date.UTC(2026, 10, 15, 12, 0, 0);
  const hour = 60 * 60 * 1000;

  it("asks for a tool that has never been prompted", () => {
    expect(canPromptToolFeedback({}, "merge-pdf", now)).toBe(true);
  });

  it("stays quiet for 24 hours after the invitation was shown, then asks again", () => {
    const log = { "merge-pdf": now };
    expect(canPromptToolFeedback(log, "merge-pdf", now + 1)).toBe(false);
    expect(canPromptToolFeedback(log, "merge-pdf", now + 23 * hour)).toBe(
      false,
    );
    expect(
      canPromptToolFeedback(
        log,
        "merge-pdf",
        now + TOOL_FEEDBACK_PROMPT_INTERVAL_MS - 1,
      ),
    ).toBe(false);
    expect(
      canPromptToolFeedback(
        log,
        "merge-pdf",
        now + TOOL_FEEDBACK_PROMPT_INTERVAL_MS,
      ),
    ).toBe(true);
  });

  it("tracks each tool separately", () => {
    const log = { "merge-pdf": now };
    expect(canPromptToolFeedback(log, "split-pdf", now + hour)).toBe(true);
  });

  it("ignores corrupt, expired and far-future entries in the stored log", () => {
    expect(TOOL_FEEDBACK_PROMPT_INTERVAL_MS).toBe(24 * hour);
    for (const raw of [null, "", "oops", "[]", "null", "4"]) {
      expect(parseToolFeedbackPromptLog(raw, now)).toEqual({});
    }
    expect(
      parseToolFeedbackPromptLog(
        JSON.stringify({
          "merge-pdf": now - hour,
          "split-pdf": now - 25 * hour,
          "qr-code-generator": now + 48 * hour,
          "image-resizer": "yesterday",
          "../admin": now,
        }),
        now,
      ),
    ).toEqual({ "merge-pdf": now - hour });
  });
});
