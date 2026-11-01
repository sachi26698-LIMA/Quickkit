export const MAX_JSON_LENGTH = 1_000_000;
export type JsonIndent = 2 | 4 | "\t";
export type JsonOptions = { indent?: JsonIndent; sortKeys?: boolean };

function guardDepthAndParse(input: string): unknown {
  if (!input.trim())
    throw new Error('Enter JSON first. For example: {"hello": "world"}');
  if (input.length > MAX_JSON_LENGTH)
    throw new Error(
      "JSON is too large. Keep input below 1,000,000 characters.",
    );
  // Bound nesting before parsing/stringifying to limit stack and pretty-print expansion.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const char of input) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{" || char === "[") {
      if (++depth > 128)
        throw new Error("JSON is too deeply nested. Use at most 128 levels.");
    } else if (char === "}" || char === "]") depth--;
  }
  try {
    return JSON.parse(input);
  } catch {
    throw new Error(
      "Invalid JSON. Check double-quoted keys and strings, missing brackets, and trailing commas.",
    );
  }
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)]),
    );
  }
  return value;
}

export function processJson(
  input: string,
  mode: "format" | "minify" | "validate",
  options: JsonOptions = {},
) {
  const parsed = guardDepthAndParse(input);
  const data = options.sortKeys ? sortKeysDeep(parsed) : parsed;
  const output = JSON.stringify(
    data,
    (_key, value: unknown) => {
      if (typeof value === "number" && !Number.isFinite(value))
        throw new Error(
          "A JSON number exceeds JavaScript’s finite range. Encode very large values as strings.",
        );
      return value;
    },
    mode === "minify" ? undefined : (options.indent ?? 2),
  );
  if (output.length > 6_000_000)
    throw new Error("Formatted output is too large. Try minifying instead.");
  return output;
}

/** Best-effort line/column for a JSON syntax error (uses the engine message). */
export function locateJsonError(input: string) {
  try {
    JSON.parse(input);
    return null;
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const posMatch = /position\s+(\d+)/i.exec(message);
    if (!posMatch) return null;
    const position = Math.min(Number(posMatch[1]), input.length);
    const before = input.slice(0, position);
    const line = before.split("\n").length;
    const column = position - before.lastIndexOf("\n");
    const lines = input.split("\n");
    const lineText = lines[line - 1] ?? "";
    return {
      position,
      line,
      column,
      lineText: lineText.slice(0, 120),
      excerpt:
        lineText.slice(0, 120) +
        "\n" +
        " ".repeat(Math.min(column - 1, 119)) +
        "^",
    };
  }
}

export function inspectJson(input: string) {
  const parsed = JSON.parse(input) as unknown;
  let keyCount = 0;
  let maxDepth = 0;
  const walk = (value: unknown, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    if (Array.isArray(value)) value.forEach((v) => walk(v, depth + 1));
    else if (value && typeof value === "object") {
      const entries = Object.entries(value);
      keyCount += entries.length;
      entries.forEach(([, v]) => walk(v, depth + 1));
    }
  };
  walk(parsed, parsed && typeof parsed === "object" ? 1 : 0);
  const rootType = Array.isArray(parsed)
    ? "array"
    : parsed === null
      ? "null"
      : typeof parsed;
  return {
    rootType,
    keyCount,
    maxDepth,
    inputBytes: new TextEncoder().encode(input).length,
  };
}

export const SAMPLE_JSON = JSON.stringify(
  {
    app: "QUICKKIT",
    private: true,
    tools: ["Word Counter", "JSON Formatter", "QR Code Generator"],
    limits: { maxCharacters: 1000000, uploads: 0 },
  },
  null,
  2,
);
