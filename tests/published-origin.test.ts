import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PUBLIC_ORIGIN } from "../lib/tools/qr/data-template";

/**
 * The project publishes under exactly one origin. `quickkit.tools` and
 * `quickkit.online` are not owned or served by this codebase, so a URL that
 * sends a reader there is a dead link wearing our name. These tests keep the
 * generated links and the advertised identity on the real origin.
 */

const ROOT = join(__dirname, "..");

describe("published origin", () => {
  it("falls back to an origin this project actually serves", () => {
    expect(DEFAULT_PUBLIC_ORIGIN).toBe("https://quickkit-rosy.vercel.app");
    expect(() => new URL(DEFAULT_PUBLIC_ORIGIN)).not.toThrow();
    expect(new URL(DEFAULT_PUBLIC_ORIGIN).protocol).toBe("https:");
  });

  it("never generates a link on a domain the project does not own", async () => {
    const { buildDataTemplateUrl } =
      await import("../lib/tools/qr/data-template");
    const { url: link } = buildDataTemplateUrl({
      typeId: "url",
      values: { url: "https://example.com" },
    } as never);

    // Outside a browser there is no live origin, so the fallback is used.
    expect(link.startsWith(DEFAULT_PUBLIC_ORIGIN)).toBe(true);
    expect(link).not.toContain("quickkit.tools");
    expect(link).not.toContain("quickkit.online");
  });

  it("follows the live origin in the browser, not the build-time fallback", async () => {
    // A generated link must work on whatever origin actually serves the app:
    // production, a preview deployment, or localhost during development.
    const origin = "https://preview-branch-abc.vercel.app";
    vi.stubGlobal("window", { location: { origin } });
    vi.resetModules();
    try {
      const { buildDataTemplateUrl } =
        await import("../lib/tools/qr/data-template");
      const { url: link } = buildDataTemplateUrl({
        typeId: "url",
        values: { url: "https://example.com" },
      } as never);
      expect(link.startsWith(origin)).toBe(true);
      expect(link).not.toContain("quickkit.tools");
      expect(link).not.toContain("quickkit.online");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not advertise an unowned origin in the barcode user agent", async () => {
    const { userAgent } =
      await import("../lib/tools/barcode-scanner/product-lookup");
    const agent = userAgent();
    expect(agent).toMatch(/^QUICKKIT-BarcodeScanner\/[\d.]+ \(.+\)$/);
    expect(agent).not.toContain("quickkit.online");
    expect(agent).not.toContain("quickkit.tools");
  });

  it("has no production-facing source left pointing at an unowned domain", () => {
    // Deliberately narrow: user-typed sample data, placeholders and example
    // payloads are content a visitor may edit, not links the app itself
    // publishes. The two files that *publish* an origin are checked above, so
    // this guard only protects against a new hard-coded origin appearing in
    // the modules that build real links.
    const publishers = [
      join(ROOT, "lib", "tools", "qr", "data-template.ts"),
      join(ROOT, "components", "qr-data-template", "viewer.tsx"),
      join(ROOT, "lib", "tools", "barcode-scanner", "product-lookup.ts"),
    ];
    for (const file of publishers) {
      // Comments are stripped first: the files explain *why* the old origins
      // were removed, and that explanation necessarily names them. Only code
      // that can actually run may not mention them.
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(code, file).not.toContain("quickkit.tools");
      expect(code, file).not.toContain("quickkit.online");
    }
  });
});
