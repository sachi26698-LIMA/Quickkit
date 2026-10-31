export const MAX_JSON_LENGTH = 1_000_000;
export function processJson(
  input: string,
  mode: "format" | "minify" | "validate",
) {
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error(
      "Invalid JSON. Check double-quoted keys and strings, missing brackets, and trailing commas.",
    );
  }
  const output = JSON.stringify(
    parsed,
    null,
    mode === "minify" ? undefined : 2,
  );
  if (output.length > 6_000_000)
    throw new Error("Formatted output is too large. Try minifying instead.");
  return output;
}
