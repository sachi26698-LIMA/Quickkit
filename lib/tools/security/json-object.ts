/** Parse a JSON object while rejecting duplicate member names, including escaped
 * equivalents and nested objects. JSON.parse alone silently keeps the last value,
 * which can disagree with other JWT/JWK consumers. Inputs are bounded by callers.
 */
export function parseUniqueJsonObject(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a JSON object.");
  const stack: (Set<string> | null)[] = [];
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "{" || ch === "[") {
      if (stack.length >= 64)
        throw new Error("JSON nesting exceeds the safe limit.");
      stack.push(ch === "{" ? new Set<string>() : null);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    } else if (ch === '"') {
      const start = i++;
      while (i < raw.length) {
        if (raw[i] === "\\") {
          i += 2;
          continue;
        }
        if (raw[i] === '"') break;
        i++;
      }
      let next = i + 1;
      while (/\s/.test(raw[next] ?? "") && next < raw.length) next++;
      if (raw[next] === ":") {
        const keys = stack[stack.length - 1];
        if (!keys) throw new Error("Invalid JSON object.");
        const name: string = JSON.parse(raw.slice(start, i + 1));
        if (keys.has(name)) throw new Error("Duplicate JSON member name.");
        keys.add(name);
      }
    }
  }
  return value as Record<string, unknown>;
}
