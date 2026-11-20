import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_DEVELOPER_TEXT_LENGTH,
  compareSizes,
  utf8Size,
} from "@/lib/tools/developer-code-shared";

const ROOT = path.resolve(__dirname, "..");

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

/**
 * `lib/tools/developer-code.ts` statically imports terser, csso, @xmldom/xmldom
 * and minify-html-wasm. Importing that module for a single constant therefore
 * shipped an 805 kB chunk (226 kB gzipped) to the importing route. The JSON
 * validator did exactly that and carried a JavaScript minifier it never called.
 *
 * Measured on the production build: `json-validator` was 1222 kB of JS before
 * the split and 225 kB after. These tests keep the seam in place.
 */
describe("developer-code dependency split", () => {
  it("keeps the shared module free of minifier imports", () => {
    const source = read("lib/tools/developer-code-shared.ts");
    for (const heavy of [
      "terser",
      "csso",
      "@xmldom/xmldom",
      "minify-html-wasm",
    ]) {
      expect(source).not.toContain(`from "${heavy}"`);
    }
    // A dependency-free module has no imports at all.
    expect(source).not.toMatch(/^import\s/m);
  });

  it("still re-exports the shared helpers from the minifier module", () => {
    const source = read("lib/tools/developer-code.ts");
    for (const name of [
      "MAX_DEVELOPER_TEXT_LENGTH",
      "compareSizes",
      "utf8Size",
      "assertDeveloperInput",
    ]) {
      expect(source).toContain(name);
    }
  });

  it("does not let the JSON validator import the minifier module", () => {
    const source = read("components/tools/devtools/json-validator.tsx");
    // The exact regression: a constant imported from the module that owns terser.
    expect(source).not.toMatch(/from\s+"@\/lib\/tools\/developer-code"/);
    expect(source).toContain("@/lib/tools/developer-code-shared");
  });

  it("lets the components that actually minify keep the full module", () => {
    for (const file of [
      "components/tools/devtools/minifier.tsx",
      "components/tools/devtools/markup-tool.tsx",
    ]) {
      const source = read(file);
      expect(source).toMatch(/from\s+"@\/lib\/tools\/developer-code"/);
    }
  });

  it("keeps the published build's JSON validator route free of the minifier", () => {
    // Only assert when a production build is present; the unit runner does not
    // build one, and this must not become a build-order dependency.
    const base = path.join(ROOT, ".next", "server", "app", "(public)", "tools");
    let manifest: string;
    try {
      manifest = readFileSync(
        path.join(base, "json-validator", "page_client-reference-manifest.js"),
        "utf8",
      );
    } catch {
      return;
    }
    const chunks = new Set(
      manifest.match(/static\/chunks\/[^"\\]+\.js/g) ?? [],
    );
    expect(chunks.size).toBeGreaterThan(0);
    // No chunk on this route may contain terser's or csso's signature strings.
    for (const chunk of chunks) {
      const file = path.join(ROOT, ".next", chunk);
      let body: string;
      try {
        body = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      expect(body).not.toContain("csstree");
    }
  });
});

describe("the shared helpers still behave", () => {
  it("exports the same input limit", () => {
    expect(MAX_DEVELOPER_TEXT_LENGTH).toBe(1_000_000);
  });

  it("measures UTF-8 bytes, not code units", () => {
    expect(utf8Size("₹")).toBe(3);
    expect(utf8Size("a")).toBe(1);
  });

  it("reports a size saving", () => {
    const stats = compareSizes("a  b", "a b");
    expect(stats.savedBytes).toBe(1);
    expect(stats.savedPercent).toBe(25);
  });

  it("does not divide by zero on empty input", () => {
    expect(compareSizes("", "").savedPercent).toBe(0);
  });
});

// Guard against the split being undone by a future re-export from a component
// directory that would reintroduce the bundle coupling.
describe("no other client component imports the minifier module for a constant", () => {
  it("finds no constant-only imports", () => {
    const dir = path.join(ROOT, "components");
    const offenders: string[] = [];
    const walk = (current: string) => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".tsx")) {
          const source = readFileSync(full, "utf8");
          const match =
            /import\s*\{([^}]*)\}\s*from\s*"@\/lib\/tools\/developer-code"/.exec(
              source,
            );
          if (!match) continue;
          const callsAMinifier = /minify|format(Html|Xml)/.test(source);
          if (!callsAMinifier) offenders.push(path.relative(ROOT, full));
        }
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });
});
