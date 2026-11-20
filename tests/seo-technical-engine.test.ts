import { describe, expect, it } from "vitest";
import {
  analyseRedirects,
  buildRobots,
  buildSitemap,
  canonicalCheck,
  checkHreflang,
  parseRobots,
  parseSitemap,
  type RobotsGroup,
} from "@/lib/tools/seo/technical";

describe("buildRobots", () => {
  const group = (overrides: Partial<RobotsGroup> = {}): RobotsGroup => ({
    userAgent: "*",
    rules: [{ type: "disallow", path: "/admin/" }],
    ...overrides,
  });

  it("writes the groups it was given", () => {
    const result = buildRobots({ groups: [group()] });
    expect(result.text).toContain("User-agent: *");
    expect(result.text).toContain("Disallow: /admin/");
  });

  it("lists the sitemap when one is given", () => {
    const result = buildRobots({
      groups: [group()],
      sitemaps: ["https://example.com/sitemap.xml"],
    });
    expect(result.text).toContain("Sitemap: https://example.com/sitemap.xml");
  });

  it("warns when the whole site is blocked", () => {
    const result = buildRobots({
      groups: [group({ rules: [{ type: "disallow", path: "/" }] })],
    });
    expect(result.issues.some((issue) => issue.severity !== "info")).toBe(true);
  });

  it("warns when CSS or JavaScript is blocked", () => {
    const result = buildRobots({
      groups: [
        group({
          rules: [{ type: "disallow", path: "/assets/app.css" }],
        }),
      ],
    });
    expect(
      result.issues.some((issue) => /css|javascript/i.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a relative sitemap URL", () => {
    const result = buildRobots({
      groups: [group()],
      sitemaps: ["/sitemap.xml"],
    });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("lists the blocked paths for a human summary", () => {
    const result = buildRobots({ groups: [group()] });
    expect(result.blockedPaths).toContain("/admin/");
  });
});

describe("parseRobots", () => {
  it("reads the groups out of a robots.txt", () => {
    const parsed = parseRobots(
      "User-agent: *\nDisallow: /private/\n\nUser-agent: Googlebot\nAllow: /\n",
    );
    expect(parsed.groups.length).toBe(2);
  });

  it("reads the sitemaps out of a robots.txt", () => {
    const parsed = parseRobots(
      "User-agent: *\nDisallow:\n\nSitemap: https://example.com/sitemap.xml\n",
    );
    expect(parsed.sitemaps).toContain("https://example.com/sitemap.xml");
  });

  it("survives an empty file", () => {
    expect(parseRobots("").groups).toEqual([]);
  });
});

describe("buildSitemap", () => {
  it("writes a urlset with the URLs given", () => {
    const result = buildSitemap([
      { loc: "https://example.com/a", lastmod: "2026-03-01" },
      { loc: "https://example.com/b" },
    ]);
    expect(result.xml).toContain("<urlset");
    expect(result.xml).toContain("https://example.com/a");
    expect(result.count).toBe(2);
  });

  it("refuses a sitemap with no URLs", () => {
    const result = buildSitemap([]);
    expect(result.issues.some((issue) => issue.severity === "error")).toBe(
      true,
    );
  });

  it("rejects a relative URL", () => {
    const result = buildSitemap([{ loc: "/relative" }]);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("rejects a duplicate URL", () => {
    const result = buildSitemap([
      { loc: "https://example.com/a" },
      { loc: "https://example.com/a" },
    ]);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("escapes XML special characters in a URL", () => {
    const result = buildSitemap([{ loc: "https://example.com/a?x=1&y=2" }]);
    expect(result.xml).toContain("&amp;");
  });
});

describe("parseSitemap", () => {
  it("reads the URLs out of a sitemap", () => {
    const parsed = parseSitemap(
      `<?xml version="1.0" encoding="UTF-8"?>
       <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
         <url><loc>https://example.com/a</loc><lastmod>2026-03-01</lastmod></url>
         <url><loc>https://example.com/b</loc></url>
       </urlset>`,
    );
    expect(parsed.urls.length).toBe(2);
    expect(parsed.urls[0].loc).toBe("https://example.com/a");
  });

  it("reports a document that is not a sitemap", () => {
    const parsed = parseSitemap("<html><body>Not a sitemap</body></html>");
    expect(parsed.issues.length).toBeGreaterThan(0);
  });
});

describe("canonicalCheck", () => {
  it("passes a self-referencing canonical", () => {
    const result = canonicalCheck({
      pageUrl: "https://example.com/page",
      canonical: "https://example.com/page",
    });
    expect(result.ok).toBe(true);
  });

  it("fails an empty canonical", () => {
    const result = canonicalCheck({
      pageUrl: "https://example.com/page",
      canonical: "",
    });
    expect(result.ok).toBe(false);
  });

  it("flags a canonical pointing at a different host", () => {
    const result = canonicalCheck({
      pageUrl: "https://example.com/page",
      canonical: "https://other.com/page",
    });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("flags a relative canonical", () => {
    const result = canonicalCheck({
      pageUrl: "https://example.com/page",
      canonical: "/page",
    });
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("checkHreflang", () => {
  it("passes a reciprocal cluster with a self-reference", () => {
    const result = checkHreflang(
      [
        { hreflang: "en", url: "https://example.com/en" },
        { hreflang: "fr", url: "https://example.com/fr" },
      ],
      "https://example.com/en",
    );
    expect(result.ok).toBe(true);
  });

  it("fails an empty cluster", () => {
    const result = checkHreflang([], "https://example.com/en");
    expect(result.ok).toBe(false);
  });

  it("flags a cluster with no self-reference", () => {
    const result = checkHreflang(
      [
        { hreflang: "en", url: "https://example.com/en" },
        { hreflang: "fr", url: "https://example.com/fr" },
      ],
      "https://example.com/de",
    );
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("flags a one-way cluster", () => {
    const result = checkHreflang(
      [{ hreflang: "en", url: "https://example.com/en" }],
      "https://example.com/en",
    );
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("analyseRedirects", () => {
  it("finds a chain longer than one hop", () => {
    const result = analyseRedirects([
      { from: "/a", to: "/b", status: 301 },
      { from: "/b", to: "/c", status: 301 },
    ]);
    expect(result.chains.length).toBeGreaterThan(0);
  });

  it("finds a redirect loop", () => {
    const result = analyseRedirects([
      { from: "/a", to: "/b", status: 301 },
      { from: "/b", to: "/a", status: 301 },
    ]);
    expect(result.loops.length).toBeGreaterThan(0);
  });

  it("flags a temporary redirect standing in for a permanent one", () => {
    const result = analyseRedirects([{ from: "/a", to: "/b", status: 302 }]);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("finds nothing wrong with a single clean redirect", () => {
    const result = analyseRedirects([{ from: "/a", to: "/b", status: 301 }]);
    expect(result.loops).toEqual([]);
  });
});
