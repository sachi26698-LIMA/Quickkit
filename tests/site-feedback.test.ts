import { describe, expect, it } from "vitest";
import {
  isSiteFeedbackRating,
  isSiteFeedbackToolSlug,
  parseSiteFeedback,
  SITE_FEEDBACK_IMPROVE_TAGS,
  SITE_FEEDBACK_MAX_TAGS,
  SITE_FEEDBACK_POSITIVE_TAGS,
  SITE_FEEDBACK_RATING_LABELS,
  SITE_FEEDBACK_TAGS,
  siteFeedbackRatingLabel,
  siteFeedbackTagsFor,
} from "@/lib/site-feedback";

describe("homepage feedback rating rules", () => {
  it("accepts only whole stars from 1 to 5", () => {
    for (const rating of [1, 2, 3, 4, 5])
      expect(isSiteFeedbackRating(rating)).toBe(true);
    for (const rating of [0, 6, -1, 2.5, "4", null, undefined, NaN, Infinity])
      expect(isSiteFeedbackRating(rating)).toBe(false);
  });

  it("names every star and nothing else", () => {
    expect(SITE_FEEDBACK_RATING_LABELS).toHaveLength(5);
    expect(siteFeedbackRatingLabel(1)).toBe("Disappointing");
    expect(siteFeedbackRatingLabel(5)).toBe("Loved it!");
    expect(siteFeedbackRatingLabel(0)).toBe("");
    expect(siteFeedbackRatingLabel(6)).toBe("");
  });

  it("offers praise options for 4–5 stars and improvement options for 1–3", () => {
    expect(siteFeedbackTagsFor(5)).toEqual(SITE_FEEDBACK_POSITIVE_TAGS);
    expect(siteFeedbackTagsFor(4)).toEqual(SITE_FEEDBACK_POSITIVE_TAGS);
    for (const rating of [1, 2, 3])
      expect(siteFeedbackTagsFor(rating)).toEqual(SITE_FEEDBACK_IMPROVE_TAGS);
    expect(siteFeedbackTagsFor(0)).toEqual([]);
  });

  it("keeps the two option groups distinct and within the database limit", () => {
    expect(new Set(SITE_FEEDBACK_TAGS).size).toBe(SITE_FEEDBACK_TAGS.length);
    expect(SITE_FEEDBACK_POSITIVE_TAGS.length).toBeLessThanOrEqual(
      SITE_FEEDBACK_MAX_TAGS,
    );
    expect(SITE_FEEDBACK_IMPROVE_TAGS.length).toBeLessThanOrEqual(
      SITE_FEEDBACK_MAX_TAGS,
    );
  });
});

describe("feedback saved in the browser", () => {
  it("keeps entries written before ratings existed, as unrated", () => {
    const stored = JSON.stringify([
      { name: "Asha", message: "Clear and easy to use." },
      { name: "", message: "A second entry." },
    ]);
    expect(parseSiteFeedback(stored)).toEqual([
      { name: "Asha", message: "Clear and easy to use.", rating: 0, tags: [] },
      { name: "", message: "A second entry.", rating: 0, tags: [] },
    ]);
  });

  it("reads a rating with its options, with or without a message", () => {
    const stored = JSON.stringify([
      {
        name: "Ravi",
        message: "",
        rating: 5,
        tags: ["Easy to use", "Useful tools"],
      },
      { name: "", message: "Search was slow.", rating: 2, tags: ["Too slow"] },
    ]);
    expect(parseSiteFeedback(stored)).toEqual([
      {
        name: "Ravi",
        message: "",
        rating: 5,
        tags: ["Easy to use", "Useful tools"],
      },
      { name: "", message: "Search was slow.", rating: 2, tags: ["Too slow"] },
    ]);
  });

  it("drops entries with nothing to show and ignores a rating out of range", () => {
    const stored = JSON.stringify([
      { name: "Blank", message: "   " },
      { name: "Blank rated zero", message: "", rating: 0 },
      { name: "Bad rating, has words", message: "Still useful.", rating: 9 },
      { name: "Bad rating, no words", message: "", rating: 9 },
    ]);
    expect(parseSiteFeedback(stored)).toEqual([
      {
        name: "Bad rating, has words",
        message: "Still useful.",
        rating: 0,
        tags: [],
      },
    ]);
  });

  it("removes options that are unknown, repeated or belong to the other rating group", () => {
    const stored = JSON.stringify([
      {
        name: "",
        message: "",
        rating: 5,
        tags: [
          "Easy to use",
          "Easy to use",
          "Too slow",
          "<script>alert(1)</script>",
          7,
        ],
      },
      { name: "", message: "No stars.", tags: ["Easy to use"] },
    ]);
    expect(parseSiteFeedback(stored)).toEqual([
      { name: "", message: "", rating: 5, tags: ["Easy to use"] },
      { name: "", message: "No stars.", rating: 0, tags: [] },
    ]);
  });

  it("rejects over-long fields, wrong types and corrupt storage", () => {
    expect(
      parseSiteFeedback(
        JSON.stringify([
          { name: "n".repeat(36), message: "ok", rating: 5 },
          { name: "ok", message: "m".repeat(181), rating: 5 },
          { name: 5, message: "ok" },
          { name: "ok", message: null, rating: 4 },
          null,
          "text",
        ]),
      ),
    ).toEqual([]);
    expect(parseSiteFeedback("{not json")).toEqual([]);
    expect(
      parseSiteFeedback(JSON.stringify({ name: "a", message: "b" })),
    ).toEqual([]);
    expect(parseSiteFeedback("[]")).toEqual([]);
  });
});

describe("homepage feedback: the About choice", () => {
  it("keeps a tool slug and leaves it out when there is none", () => {
    const [about, overall] = parseSiteFeedback(
      JSON.stringify([
        {
          name: "Riya",
          message: "Great.",
          rating: 5,
          tags: [],
          tool: "image-resizer",
        },
        { name: "", message: "Nice.", rating: 0, tags: [], tool: "" },
      ]),
    );
    expect(about.tool).toBe("image-resizer");
    expect("tool" in overall).toBe(false);
  });

  it("drops anything not shaped like a tool slug but keeps the entry", () => {
    for (const tool of [
      "<img src=x>",
      "Merge PDF",
      7,
      null,
      "a".repeat(101),
      "-x",
      "x--y",
    ]) {
      const entries = parseSiteFeedback(
        JSON.stringify([{ name: "", message: "Kept.", tool }]),
      );
      expect(entries).toHaveLength(1);
      expect("tool" in entries[0]).toBe(false);
    }
    expect(isSiteFeedbackToolSlug("merge-pdf")).toBe(true);
    expect(isSiteFeedbackToolSlug("qr2")).toBe(true);
  });
});
