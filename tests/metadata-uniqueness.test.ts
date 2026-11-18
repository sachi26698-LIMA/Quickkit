import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A page with no `title` of its own inherits the layout's `title.default`
 * ("… | QUICKKIT") and then the layout `title.template` appends the brand
 * again, producing "… | QUICKKIT | QUICKKIT". Five auth stubs shipped that way
 * until they were given real titles. These tests read the route files rather
 * than a build, so they fail in CI before anything is deployed.
 */

const ROOT = join(process.cwd(), "app", "(public)");

/** Routes whose metadata must stand on its own. */
const SELF_TITLED_ROUTES = [
  "login",
  "signup",
  "account",
  "forgot-password",
  "reset-password",
];

function read(route: string): string {
  return readFileSync(join(ROOT, route, "page.tsx"), "utf8");
}

describe("page metadata uniqueness", () => {
  for (const route of SELF_TITLED_ROUTES) {
    it(`/${route} declares its own title`, () => {
      const source = read(route);
      // A literal (or template) `title` inside the exported metadata object.
      expect(source, `/${route} must export metadata`).toMatch(
        /export const metadata\s*=/,
      );
      expect(source, `/${route} must declare a title`).toMatch(
        /\btitle:\s*["'`]/,
      );
    });

    it(`/${route} stays out of the index`, () => {
      expect(read(route)).toMatch(/index:\s*false/);
    });

    it(`/${route} declares a description`, () => {
      expect(read(route)).toMatch(/\bdescription:\s*\n?\s*["'`]/);
    });
  }

  it("gives the 404 page a title that is not the homepage's", () => {
    const notFound = readFileSync(
      join(process.cwd(), "app", "not-found.tsx"),
      "utf8",
    );
    const metadataBlock = notFound.slice(
      notFound.indexOf("export const metadata"),
    );
    expect(metadataBlock).toMatch(/title:\s*"Page not found"/);
    expect(metadataBlock).toMatch(/index:\s*false/);
    // It must not reuse the homepage copy that the root layout sets as default.
    expect(metadataBlock).not.toContain("Free Online PDF, Image, QR");
  });

  it("no auth stub reuses another stub's description", () => {
    const seen = new Map<string, string>();
    for (const route of SELF_TITLED_ROUTES) {
      const match = read(route).match(/description:\s*\n?\s*"([^"]+)"/);
      expect(match, `/${route} description`).toBeTruthy();
      const text = match![1];
      const previous = seen.get(text);
      expect(
        previous,
        `/${route} and /${previous} share a description`,
      ).toBeUndefined();
      seen.set(text, route);
    }
  });
});

describe("route inventory", () => {
  it("has a page for every (public) route directory", () => {
    const routes = readdirSync(ROOT).filter((entry) => {
      if (entry.startsWith("(") || entry.startsWith(".")) return false;
      const full = join(ROOT, entry);
      if (!statSync(full).isDirectory()) return false;
      try {
        return statSync(join(full, "page.tsx")).isFile();
      } catch {
        return false;
      }
    });
    expect(routes.length).toBeGreaterThan(10);
    for (const route of routes) {
      expect(read(route).length, `/${route} is empty`).toBeGreaterThan(40);
    }
  });
});
