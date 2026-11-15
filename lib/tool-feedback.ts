/** Device-local reviews shared by the post-download invitation and laptop feed. */
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
