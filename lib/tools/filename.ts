/**
 * File-name slugs shared by every tool that names a download after user input.
 * Kept dependency-free so importing it never pulls a renderer into a bundle.
 */
export function safeFilenamePart(input: string, limit = 42) {
  const cleaned = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, limit)
    .replace(/-+$/g, "");
  return cleaned || "code";
}
