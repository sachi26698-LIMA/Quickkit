/** Tool ratings: the device-local copy shown on the laptop feed, the
 * once-a-day invitation rule, and the options shared with the server. */
export const TOOL_FEEDBACK_KEY = "quickkit-tool-feedback-v1";
export const TOOL_FEEDBACK_EVENT = "quickkit:tool-feedback-updated";
export type ToolFeedback = {
  tool: string;
  rating: number;
  tags: string[];
  comment: string;
  createdAt: string;
};

export function readToolFeedback(): string {
  try {
    return window.localStorage.getItem(TOOL_FEEDBACK_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseToolFeedback(raw: string): ToolFeedback[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ToolFeedback => {
      if (!item || typeof item !== "object") return false;
      return (
        typeof item.tool === "string" &&
        item.tool.length <= 100 &&
        Number.isInteger(item.rating) &&
        item.rating >= 1 &&
        item.rating <= 5 &&
        typeof item.comment === "string" &&
        item.comment.length <= 600 &&
        Array.isArray(item.tags) &&
        item.tags.length <= 4 &&
        item.tags.every(
          (tag: unknown) => typeof tag === "string" && tag.length <= 60,
        ) &&
        typeof item.createdAt === "string" &&
        Number.isFinite(Date.parse(item.createdAt))
      );
    });
  } catch {
    return [];
  }
}

export function subscribeToolFeedback(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(TOOL_FEEDBACK_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(TOOL_FEEDBACK_EVENT, callback);
  };
}

/** Star labels, index 0 = one star. Shared by the prompt and the admin inbox. */
export const TOOL_FEEDBACK_RATING_LABELS = [
  "Disappointing",
  "Could be better",
  "It was okay",
  "Really good",
  "Loved it!",
] as const;
/** Optional quick answers offered for a 4–5 star rating. */
export const TOOL_FEEDBACK_POSITIVE_TAGS = [
  "Easy to use",
  "Great result",
  "Fast & smooth",
  "Beautiful design",
] as const;
/** Optional quick answers offered for a 1–3 star rating. */
export const TOOL_FEEDBACK_IMPROVE_TAGS = [
  "Result quality",
  "Speed",
  "Hard to use",
  "Something else",
] as const;
export const TOOL_FEEDBACK_TAGS: readonly string[] = [
  ...TOOL_FEEDBACK_POSITIVE_TAGS,
  ...TOOL_FEEDBACK_IMPROVE_TAGS,
];
export const TOOL_FEEDBACK_COMMENT_MAX = 600;
export const TOOL_FEEDBACK_MAX_TAGS = 4;

/**
 * The rating invitation is shown at most once per tool in this window, no
 * matter how many files the visitor downloads or whether they answered it.
 */
export const TOOL_FEEDBACK_PROMPT_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const TOOL_FEEDBACK_PROMPT_KEY = "quickkit-tool-feedback-prompted-v1";

/** slug → time (ms since epoch) the invitation was last shown. */
export type ToolFeedbackPromptLog = Record<string, number>;

export function parseToolFeedbackPromptLog(
  raw: string | null | undefined,
  now: number,
): ToolFeedbackPromptLog {
  const log: ToolFeedbackPromptLog = {};
  if (!raw) return log;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return log;
    for (const [slug, at] of Object.entries(parsed)) {
      if (
        /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) &&
        typeof at === "number" &&
        Number.isFinite(at) &&
        // Entries older than the window no longer matter; a clock that was
        // set far in the future must not silence the prompt forever.
        now - at < TOOL_FEEDBACK_PROMPT_INTERVAL_MS &&
        at - now < TOOL_FEEDBACK_PROMPT_INTERVAL_MS
      )
        log[slug] = at;
    }
  } catch {
    // Corrupt data is treated as "never shown".
  }
  return log;
}

/** True when this tool's invitation has not been shown in the last 24 hours. */
export function canPromptToolFeedback(
  log: ToolFeedbackPromptLog,
  slug: string,
  now: number,
): boolean {
  const last = log[slug];
  return (
    typeof last !== "number" ||
    Math.abs(now - last) >= TOOL_FEEDBACK_PROMPT_INTERVAL_MS
  );
}

// Used only when the browser refuses localStorage, so the invitation still is
// not repeated while the visitor stays on the site in this tab.
const memoryPromptLog: ToolFeedbackPromptLog = {};

function readPromptLog(now: number): ToolFeedbackPromptLog {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(TOOL_FEEDBACK_PROMPT_KEY);
  } catch {
    stored = null;
  }
  return {
    ...parseToolFeedbackPromptLog(JSON.stringify(memoryPromptLog), now),
    ...parseToolFeedbackPromptLog(stored, now),
  };
}

export function shouldPromptToolFeedback(slug: string, now = Date.now()) {
  return canPromptToolFeedback(readPromptLog(now), slug, now);
}

export function markToolFeedbackPrompted(slug: string, now = Date.now()) {
  try {
    window.localStorage.setItem(
      TOOL_FEEDBACK_PROMPT_KEY,
      JSON.stringify({ ...readPromptLog(now), [slug]: now }),
    );
    delete memoryPromptLog[slug];
  } catch {
    // Storage is blocked: remember it for as long as this tab stays open.
    memoryPromptLog[slug] = now;
  }
}
