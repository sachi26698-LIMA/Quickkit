import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TOOL_FEEDBACK_PROMPT_INTERVAL_MS,
  TOOL_FEEDBACK_REVIEWED_KEY,
  canPromptToolFeedback,
  markToolFeedbackReviewed,
  needsToolFeedbackReview,
  parseToolFeedback,
  parseToolFeedbackPromptLog,
  parseToolFeedbackReviewedLog,
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

/**
 * Decision (2026-11-16): a visitor who has already rated a tool is never asked
 * again, on top of the 24-hour shown-based cooldown, which stays as it was.
 */
describe("rated tools are never asked again", () => {
  const now = Date.UTC(2026, 10, 15, 12, 0, 0);
  const hour = 60 * 60 * 1000;
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, String(value));
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("asks a tool that has never been rated", () => {
    expect(needsToolFeedbackReview("merge-pdf")).toBe(true);
  });

  it("stops asking as soon as the rating was sent", () => {
    markToolFeedbackReviewed("merge-pdf", now);
    expect(needsToolFeedbackReview("merge-pdf")).toBe(false);
  });

  it("keeps quiet for ever, not just for the 24-hour cooldown", () => {
    markToolFeedbackReviewed("merge-pdf", now);
    vi.useFakeTimers();
    for (const later of [
      now + hour,
      now + 30 * 24 * hour,
      now + 10 * 365 * 24 * hour,
    ]) {
      vi.setSystemTime(later);
      expect(needsToolFeedbackReview("merge-pdf")).toBe(false);
    }
    // The shown-based rule on its own becomes willing to re-ask after the
    // cooldown expires; the reviewed record is what keeps the dialog quiet.
    expect(
      canPromptToolFeedback({ "merge-pdf": now }, "merge-pdf", now + hour),
    ).toBe(false);
    for (const later of [now + 30 * 24 * hour, now + 10 * 365 * 24 * hour])
      expect(
        canPromptToolFeedback({ "merge-pdf": now }, "merge-pdf", later),
      ).toBe(true);
  });

  it("leaves other tools alone", () => {
    markToolFeedbackReviewed("merge-pdf", now);
    expect(needsToolFeedbackReview("split-pdf")).toBe(true);
  });

  it("remembers one tool per entry rather than one flag for the browser", () => {
    markToolFeedbackReviewed("merge-pdf", now);
    markToolFeedbackReviewed("split-pdf", now + hour);
    expect(needsToolFeedbackReview("merge-pdf")).toBe(false);
    expect(needsToolFeedbackReview("split-pdf")).toBe(false);
    expect(
      Object.keys(
        parseToolFeedbackReviewedLog(store.get(TOOL_FEEDBACK_REVIEWED_KEY)),
      ),
    ).toEqual(["merge-pdf", "split-pdf"]);
  });

  it("stores the slug and a timestamp only — never what the visitor wrote", () => {
    markToolFeedbackReviewed("merge-pdf", now);
    const raw = store.get(TOOL_FEEDBACK_REVIEWED_KEY)!;
    expect(JSON.parse(raw)).toEqual({ "merge-pdf": now });
    expect(raw).not.toMatch(/rating|comment|tags|Easy to use/);
  });

  it("still asks when the stored record is corrupt or unrecognisable", () => {
    for (const raw of ["oops", "[]", "null", "4", '"merge-pdf"']) {
      expect(parseToolFeedbackReviewedLog(raw)).toEqual({});
    }
    expect(
      parseToolFeedbackReviewedLog(
        JSON.stringify({
          "merge-pdf": "yesterday",
          "../admin": now,
          "split-pdf": now,
        }),
      ),
    ).toEqual({ "split-pdf": now });
  });

  it("does not let a future timestamp silence a tool for ever", () => {
    // A clock set 48 hours ahead is an accident, not evidence of a review.
    expect(
      parseToolFeedbackReviewedLog(
        JSON.stringify({ "merge-pdf": Date.now() + 48 * hour }),
      ),
    ).toEqual({});
    // Mild skew is tolerated, so normal cross-device clock drift is not a bug.
    expect(
      parseToolFeedbackReviewedLog(
        JSON.stringify({ "merge-pdf": Date.now() + hour }),
      ),
    ).toEqual({ "merge-pdf": Date.now() + hour });
  });

  it("keeps suppressing for this tab when storage is blocked", () => {
    const blocked = {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    };
    vi.stubGlobal("window", blocked);
    markToolFeedbackReviewed("merge-pdf", now);
    expect(needsToolFeedbackReview("merge-pdf")).toBe(false);
    expect(needsToolFeedbackReview("split-pdf")).toBe(true);
  });

  it("does not throw when the write is blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      },
    });
    expect(() => markToolFeedbackReviewed("merge-pdf", now)).not.toThrow();
    expect(needsToolFeedbackReview("merge-pdf")).toBe(false);
  });
});
