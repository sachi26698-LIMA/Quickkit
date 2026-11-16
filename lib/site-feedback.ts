/** The homepage "Share your experience" form: an optional 1–5 star rating,
 * optional quick answers, an optional name, the tool it is about and a short
 * message. Shared by the
 * form, the server intake and the admin inbox so the rules cannot drift. */
import { TOOL_FEEDBACK_RATING_LABELS } from "./tool-feedback";

export const SITE_FEEDBACK_KEY = "quickkit-hero-feedback-v1";
export const SITE_FEEDBACK_NAME_MAX = 35;
export const SITE_FEEDBACK_MESSAGE_MAX = 180;
export const SITE_FEEDBACK_MAX_TAGS = 4;

/** Star labels, index 0 = one star. Same wording as the tool ratings. */
export const SITE_FEEDBACK_RATING_LABELS = TOOL_FEEDBACK_RATING_LABELS;

/** Optional quick answers offered for a 4–5 star rating. */
export const SITE_FEEDBACK_POSITIVE_TAGS = [
  "Easy to use",
  "Useful tools",
  "Fast & smooth",
  "Beautiful design",
] as const;
/** Optional quick answers offered for a 1–3 star rating. */
export const SITE_FEEDBACK_IMPROVE_TAGS = [
  "Hard to use",
  "Too slow",
  "Something broke",
  "Missing a tool",
] as const;
export const SITE_FEEDBACK_TAGS: readonly string[] = [
  ...SITE_FEEDBACK_POSITIVE_TAGS,
  ...SITE_FEEDBACK_IMPROVE_TAGS,
];

/** The quick answers that belong to a rating; none until a star is chosen. */
export function siteFeedbackTagsFor(rating: number): readonly string[] {
  if (!isSiteFeedbackRating(rating)) return [];
  return rating >= 4 ? SITE_FEEDBACK_POSITIVE_TAGS : SITE_FEEDBACK_IMPROVE_TAGS;
}

export function isSiteFeedbackRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function siteFeedbackRatingLabel(rating: number): string {
  return isSiteFeedbackRating(rating)
    ? SITE_FEEDBACK_RATING_LABELS[rating - 1]
    : "";
}

/** The "About" choice is a tool slug from the catalogue, e.g. `merge-pdf`. */
export function isSiteFeedbackToolSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.length <= 100
  );
}

/** One entry of the copy kept in this browser. `rating` is 0 when the visitor
 * wrote a message without choosing stars; `tool` is present only when the
 * feedback is about one tool rather than QUICKKIT as a whole. */
export type SiteFeedback = {
  name: string;
  message: string;
  rating: number;
  tags: string[];
  tool?: string;
};

/**
 * Reads the browser's saved feedback. Entries written before ratings existed
 * have only a name and a message and are kept as "no rating"; anything that
 * does not fit the current rules is dropped rather than shown.
 */
export function parseSiteFeedback(raw: string): SiteFeedback[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const entries: SiteFeedback[] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const { name, message } = record;
    if (
      typeof name !== "string" ||
      typeof message !== "string" ||
      name.length > SITE_FEEDBACK_NAME_MAX ||
      message.length > SITE_FEEDBACK_MESSAGE_MAX
    )
      continue;
    const rating = isSiteFeedbackRating(record.rating) ? record.rating : 0;
    // An entry needs something to show: a message, a rating, or both.
    if (!message.trim() && !rating) continue;
    const allowed = siteFeedbackTagsFor(rating);
    const tags = Array.isArray(record.tags)
      ? [
          ...new Set(
            record.tags.filter(
              (tag): tag is string =>
                typeof tag === "string" && allowed.includes(tag),
            ),
          ),
        ].slice(0, SITE_FEEDBACK_MAX_TAGS)
      : [];
    entries.push({
      name,
      message,
      rating,
      tags,
      ...(isSiteFeedbackToolSlug(record.tool) ? { tool: record.tool } : {}),
    });
  }
  return entries;
}
