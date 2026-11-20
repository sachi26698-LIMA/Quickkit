/**
 * The dependency-free part of the developer tools.
 *
 * ## Why this file exists
 *
 * `lib/tools/developer-code.ts` implements the HTML, CSS, JavaScript and XML
 * minifiers, so it imports `terser`, `csso`, `@xmldom/xmldom` and
 * `minify-html-wasm` — together a 805 kB chunk. `json-validator.tsx` imported
 * exactly one **constant** (`MAX_DEVELOPER_TEXT_LENGTH`) from that module and
 * therefore shipped the whole minifier toolchain on its own route: a JSON
 * validator that downloads a JavaScript minifier it never calls.
 *
 * Meaured on the production build: the 805 kB chunk (225 kB gzipped) was
 * present on five routes — `css-minifier`, `html-formatter`,
 * `javascript-minifier`, `json-validator` and `xml-formatter`. Only three of
 * those actually minify anything; `json-validator` and `html-formatter` were
 * pure overhead.
 *
 * The constants and the two trivial helpers live here, import nothing, and are
 * re-exported from `developer-code.ts` so existing call sites keep working.
 * A component that only needs a limit must import it from this module.
 */

export const MAX_DEVELOPER_TEXT_LENGTH = 1_000_000;
export const MAX_MARKUP_FILE_BYTES = 1_000_000;

export function assertDeveloperInput(
  input: string,
  label = "Input",
  maxLength = MAX_DEVELOPER_TEXT_LENGTH,
): void {
  if (!input.trim()) throw new Error(`Enter ${label.toLowerCase()} first.`);
  if (input.length > maxLength) {
    throw new Error(
      `${label} is too large. Keep it below ${maxLength.toLocaleString()} characters.`,
    );
  }
}

export function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export type SizeStats = {
  beforeBytes: number;
  afterBytes: number;
  savedBytes: number;
  savedPercent: number;
};

export function compareSizes(before: string, after: string): SizeStats {
  const beforeBytes = utf8Size(before);
  const afterBytes = utf8Size(after);
  const savedBytes = beforeBytes - afterBytes;
  return {
    beforeBytes,
    afterBytes,
    savedBytes,
    savedPercent: beforeBytes ? (savedBytes / beforeBytes) * 100 : 0,
  };
}
