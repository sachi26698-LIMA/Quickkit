/**
 * SEO contract for the three barcode tools and the 59 brand records.
 *
 * Everything asserted here is computed from the code, not copied from a report:
 * titles are unique, descriptions fit the 120–160 character window, canonicals
 * point at the production origin, the sitemap lists every route (including all
 * 59 brand pages) exactly once, and robots.txt allows the public tools while
 * keeping `/api/` out of the crawl.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRANDS } from "@/lib/tools/batch-code/brands";

const ORIGIN = "https://quickkit.online";

const TOOL_ROUTES = [
  ["barcode-generator", () => import("@/app/tools/barcode-generator/page")],
  ["barcode-scanner", () => import("@/app/tools/barcode-scanner/page")],
  ["batch-code-checker", () => import("@/app/tools/batch-code-checker/page")],
] as const;

beforeEach(() => {
  vi.stubEnv("SITE_URL", ORIGIN);
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("barcode tool metadata", () => {
  it("gives every tool a unique title, a 120–160 character description and its own canonical", async () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const [slug, load] of TOOL_ROUTES) {
      const { metadata } = await load();
      const title = String(metadata.title);
      expect(title.length, `${slug} title`).toBeGreaterThan(10);
      expect(titles.has(title), `${slug} title unique`).toBe(false);
      titles.add(title);

      const description = metadata.description ?? "";
      expect(description.length, `${slug} description`).toBeGreaterThanOrEqual(
        120,
      );
      expect(description.length, `${slug} description`).toBeLessThanOrEqual(
        160,
      );
      expect(descriptions.has(description), `${slug} description unique`).toBe(
        false,
      );
      descriptions.add(description);

      expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/tools/${slug}`);
      expect(metadata.openGraph?.url).toBe(`${ORIGIN}/tools/${slug}`);
      expect(metadata.robots).toBeUndefined();
    }

    expect(titles.size).toBe(3);
  });

  it("names the batch-code checker as a checker, never as a decoder of every brand", async () => {
    const { metadata } = await import("@/app/tools/batch-code-checker/page");
    expect(String(metadata.title)).toMatch(/batch code/i);
    expect(String(metadata.description)).toMatch(
      /documented|verified|estimated/i,
    );
    expect(String(metadata.description)).not.toMatch(/all brands|every brand/i);
  });
});

describe("brand record metadata", () => {
  it("keeps all 59 brand descriptions inside the snippet window with a canonical", async () => {
    const { generateMetadata } =
      await import("@/app/tools/batch-code-checker/brand/[slug]/page");
    for (const brand of BRANDS) {
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: brand.slug }),
      });
      const description = meta.description ?? "";
      expect(
        description.length,
        `${brand.slug} description length`,
      ).toBeGreaterThanOrEqual(120);
      expect(
        description.length,
        `${brand.slug} description length`,
      ).toBeLessThanOrEqual(160);
      expect(meta.alternates?.canonical).toBe(
        `${ORIGIN}/tools/batch-code-checker/brand/${brand.slug}`,
      );
      expect(meta.robots).toBeUndefined();
    }
  });
});

describe("sitemap and robots", () => {
  it("lists each of the three tools and every brand page exactly once", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = sitemap().map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);

    for (const [slug] of TOOL_ROUTES)
      expect(urls).toContain(`${ORIGIN}/tools/${slug}`);

    const brandUrls = urls.filter((url) =>
      url.startsWith(`${ORIGIN}/tools/batch-code-checker/brand/`),
    );
    expect(brandUrls).toHaveLength(BRANDS.length);
  });

  it("allows the public tools and blocks only the API namespace", async () => {
    const { default: robots } = await import("@/app/robots");
    type Rule = { userAgent?: string; allow?: string; disallow?: string[] };
    const config = robots();
    const rules = (
      Array.isArray(config.rules) ? config.rules : [config.rules]
    ) as Rule[];
    expect(rules.length).toBe(3);
    expect(rules.some((rule) => rule.userAgent === "*")).toBe(true);
    for (const rule of rules) {
      expect(rule.allow).toBe("/");
      expect(rule.disallow).toEqual(["/api/"]);
    }
    expect(config.sitemap).toBe(`${ORIGIN}/sitemap.xml`);
  });
});
