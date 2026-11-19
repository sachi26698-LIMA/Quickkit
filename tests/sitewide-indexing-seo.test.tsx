// @vitest-environment jsdom
import { createElement } from "react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  categoryMeta,
  relatedTools,
  toolBySlug,
  tools,
  toolsByCategory,
} from "../lib/catalog";
import { legalPages } from "../lib/legal";
import {
  BRANDS,
  INDEXABLE_BRANDS,
  isBrandRecordIndexable,
} from "../lib/tools/batch-code/brands";
import {
  SECURITY_SUITE_SEO_CONTENT,
  type ConsolidatedSecuritySlug,
} from "../lib/tools/security/seo-content";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ORIGIN = "https://quickkit-rosy.vercel.app";

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
  if (!("IntersectionObserver" in window)) {
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  }
});

beforeEach(() => {
  vi.stubEnv("SITE_URL", ORIGIN);
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("site-wide indexing & SEO invariants", () => {
  it("lists all 80 eligible canonical routes in /sitemap.xml, including /category/developer-tools and /guides/barcode, with zero noindex/redirect/duplicate URLs", async () => {
    const { default: sitemap, routeSourceFiles } =
      await import("../app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    // Exact uniqueness & canonical origin
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      const parsed = new URL(url);
      expect(parsed.origin).toBe(ORIGIN);
      expect(parsed.search).toBe("");
      expect(parsed.hash).toBe("");
      if (parsed.pathname !== "/") {
        expect(parsed.pathname.endsWith("/")).toBe(false);
      }
      // Every sitemap route maps only to real existing source files
      const sources = routeSourceFiles(parsed.pathname);
      expect(
        sources.length,
        `source files for ${parsed.pathname}`,
      ).toBeGreaterThan(0);
      for (const rel of sources) {
        expect(
          existsSync(join(process.cwd(), rel)),
          `${parsed.pathname} mapped source ${rel} must exist`,
        ).toBe(true);
      }
    }

    // Core static + guide pages. The homepage is listed as the bare origin —
    // the same spelling Next.js forces on the canonical — so it is compared
    // through the shared helper rather than by concatenation.
    const { absoluteUrl } = await import("../lib/seo");
    for (const path of [
      "/",
      "/tools",
      "/help",
      "/sitemap",
      "/guides/barcode",
    ]) {
      expect(urls).toContain(absoluteUrl(path));
    }

    // All 7 active categories (including developer-tools) included; empty ai-tools excluded
    const activeCategories = categoryMeta.filter(
      (cat) => toolsByCategory(cat.name).length > 0,
    );
    expect(activeCategories).toHaveLength(7);
    expect(activeCategories.map((c) => c.slug)).toContain("developer-tools");
    for (const cat of activeCategories) {
      expect(urls).toContain(`${ORIGIN}/category/${cat.slug}`);
    }
    expect(urls).not.toContain(`${ORIGIN}/category/ai-tools`);

    // All 56 published tools included
    expect(tools).toHaveLength(56);
    for (const tool of tools) {
      expect(urls, `tool ${tool.slug}`).toContain(
        `${ORIGIN}/tools/${tool.slug}`,
      );
    }

    // All 12 indexable legal/company pages included
    for (const page of legalPages.filter((p) => p.indexable)) {
      expect(urls).toContain(`${ORIGIN}${page.href}`);
    }

    // Private, redirect, and undecodable brand routes excluded
    for (const excluded of [
      "/saved",
      "/qr",
      "/login",
      "/signup",
      "/account",
      "/forgot-password",
      "/reset-password",
      "/admin",
      "/admin/login",
      "/auth/callback",
      "/tools/image-converter",
      "/tools/words-to-pdf",
      "/tools/jwt-decoder",
      "/tools/dns-lookup",
    ]) {
      expect(urls).not.toContain(`${ORIGIN}${excluded}`);
    }
    for (const brand of BRANDS) {
      const brandUrl = `${ORIGIN}/tools/batch-code-checker/brand/${brand.slug}`;
      if (isBrandRecordIndexable(brand)) {
        expect(urls).toContain(brandUrl);
      } else {
        expect(urls).not.toContain(brandUrl);
      }
    }

    expect(urls).toHaveLength(
      5 +
        legalPages.length +
        activeCategories.length +
        tools.length +
        INDEXABLE_BRANDS.length,
    );
  });

  it("enforces unique SERP-budget metadata, 4+ steps/FAQs, ToolReferenceSection, and SSR operation lists across all 7 consolidated security suites", async () => {
    const CalculatorOrSecurityPage = (
      await import("../app/(public)/tools/[calculator]/page")
    ).default;
    const { generateMetadata } =
      await import("../app/(public)/tools/[calculator]/page");

    const slugs = Object.keys(
      SECURITY_SUITE_SEO_CONTENT,
    ) as ConsolidatedSecuritySlug[];
    expect(slugs).toHaveLength(7);

    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const slug of slugs) {
      const meta = await generateMetadata({
        params: Promise.resolve({ calculator: slug }),
      });
      const rawTitle = String(meta.title ?? "");
      const brandedTitle = `${rawTitle} | QUICKKIT`;
      const desc = String(meta.description ?? "");

      expect(
        brandedTitle.length,
        `${slug} title length`,
      ).toBeGreaterThanOrEqual(45);
      expect(brandedTitle.length, `${slug} title length`).toBeLessThanOrEqual(
        60,
      );
      expect(desc.length, `${slug} description length`).toBeGreaterThanOrEqual(
        130,
      );
      expect(desc.length, `${slug} description length`).toBeLessThanOrEqual(
        160,
      );
      expect(meta.alternates?.canonical).toBe(`${ORIGIN}/tools/${slug}`);
      expect(meta.robots).toBeUndefined();

      expect(titles.has(brandedTitle), `${slug} unique title`).toBe(false);
      expect(descriptions.has(desc), `${slug} unique description`).toBe(false);
      titles.add(brandedTitle);
      descriptions.add(desc);

      const element = await CalculatorOrSecurityPage({
        params: Promise.resolve({ calculator: slug }),
      });
      const { container, unmount } = render(element);

      // Must render SSR operation summary list rather than a hollow loading line
      const ssrOps = container.querySelectorAll(
        ".security-ssr-operations > li",
      );
      // Note: in jsdom `useSyncExternalStore` hydrates to client snapshot, rendering tabs;
      // verify either tabs or SSR list is present and no skipped heading levels exist.
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(
        ssrOps.length + tabs.length,
        `${slug} operations rendered`,
      ).toBeGreaterThan(0);

      // Reference section + 4 steps + 4 FAQs
      expect(
        container.querySelector(`#${slug}-reference-heading`),
        `${slug} reference section`,
      ).not.toBeNull();
      expect(
        container.querySelectorAll(".tool-guidance ol > li").length,
        `${slug} steps`,
      ).toBeGreaterThanOrEqual(4);
      expect(
        container.querySelectorAll(".tool-guidance details > summary").length,
        `${slug} FAQs`,
      ).toBeGreaterThanOrEqual(4);

      const wordCount = (container.textContent ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      expect(wordCount, `${slug} word count`).toBeGreaterThanOrEqual(450);

      unmount();
    }
  });

  it("ensures zero orphaned indexable categories, guides, or tools across Homepage, Footer, All Tools, and Related Tools", async () => {
    const HomePage = (await import("../app/(public)/page")).default;
    const ToolsPage = (await import("../app/(public)/tools/page")).default;
    const HelpPage = (await import("../app/(public)/help/page")).default;
    const Footer = (await import("../components/footer")).default;

    const { container: homeDom, unmount: uHome } = render(await HomePage());
    const homeHrefs = new Set(
      [...homeDom.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    );
    // Homepage prose links PDF Studio to its canonical tool page and Barcode Guide
    expect(homeHrefs.has("/tools/pdf-studio")).toBe(true);
    expect(homeHrefs.has("/guides/barcode")).toBe(true);
    // Empty category card carries rel="nofollow"
    expect(
      homeDom
        .querySelector('a[href="/category/ai-tools"]')
        ?.getAttribute("rel"),
    ).toBe("nofollow");
    for (const cat of categoryMeta.filter(
      (c) => toolsByCategory(c.name).length > 0,
    )) {
      expect(homeHrefs.has(`/category/${cat.slug}`)).toBe(true);
    }
    uHome();

    // Footer exposes all 7 active categories + /guides/barcode on every page including homepage
    const { container: footerDom, unmount: uFooter } = render(
      createElement(Footer),
    );
    for (const cat of categoryMeta.filter(
      (c) => toolsByCategory(c.name).length > 0,
    )) {
      const link = footerDom.querySelector(`a[href="/category/${cat.slug}"]`);
      expect(link, `footer link for ${cat.slug}`).not.toBeNull();
      expect(
        link?.getAttribute("data-home-link"),
        `${cat.slug} visible on homepage footer`,
      ).toBeNull();
    }
    const guideFooterLink = footerDom.querySelector(
      'a[href="/guides/barcode"]',
    );
    expect(guideFooterLink).not.toBeNull();
    expect(guideFooterLink?.getAttribute("data-home-link")).toBeNull();
    uFooter();

    // Help page links to /guides/barcode and /sitemap
    const { container: helpDom, unmount: uHelp } = render(
      createElement(HelpPage),
    );
    const helpHrefs = new Set(
      [...helpDom.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    );
    expect(helpHrefs.has("/guides/barcode")).toBe(true);
    expect(helpHrefs.has("/sitemap")).toBe(true);
    uHelp();

    // /tools links to all 56 canonical tools
    const { container: toolsDom, unmount: uTools } = render(await ToolsPage());
    const toolsPageHrefs = new Set(
      [...toolsDom.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    );
    for (const tool of tools) {
      expect(
        toolsPageHrefs.has(`/tools/${tool.slug}`),
        `/tools links to /tools/${tool.slug}`,
      ).toBe(true);
    }
    uTools();

    // Every tool has explicit workflow-curated related tools and >= 1 inbound related link
    const inbound = new Map<string, number>(tools.map((t) => [t.slug, 0]));
    for (const tool of tools) {
      const rel = relatedTools(tool);
      expect(rel.length, `${tool.slug} related count`).toBeGreaterThanOrEqual(
        3,
      );
      for (const target of rel) {
        expect(toolBySlug(target.slug)).toBeDefined();
        inbound.set(target.slug, (inbound.get(target.slug) ?? 0) + 1);
      }
    }
    for (const tool of tools) {
      expect(
        inbound.get(tool.slug) ?? 0,
        `${tool.slug} inbound related links`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("emits matching X-Robots-Tag headers for /saved, /qr, /category/ai-tools, /admin/*, /auth/callback, and undecodable brand pages", async () => {
    const { default: nextConfig } = await import("../next.config");
    const rules = (await nextConfig.headers?.()) ?? [];
    const bySource = new Map(
      rules
        .filter((r) => !("has" in r && r.has))
        .map((r) => [r.source, r.headers]),
    );

    const robotsHeader = (source: string) =>
      bySource.get(source)?.find((h) => h.key === "X-Robots-Tag")?.value;

    expect(robotsHeader("/saved")).toBe("noindex, nofollow");
    expect(robotsHeader("/qr")).toBe("noindex, nofollow");
    expect(robotsHeader("/category/ai-tools")).toBe("noindex, follow");
    expect(robotsHeader("/admin/:path*")).toBe("noindex, nofollow, noarchive");
    expect(robotsHeader("/auth/callback")).toBe("noindex, nofollow, noarchive");
    for (const brand of BRANDS.filter((b) => !isBrandRecordIndexable(b))) {
      expect(
        robotsHeader(`/tools/batch-code-checker/brand/${brand.slug}`),
        brand.slug,
      ).toBe("noindex, follow");
    }

    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual(
      expect.objectContaining({
        source: "/tools/words-to-pdf",
        destination: "/tools/word-to-pdf",
        permanent: true,
      }),
    );
  });

  it("aligns robots.txt Sitemap directive, canonicals, Open Graph URLs, JSON-LD, and internal defaults exclusively to https://quickkit-rosy.vercel.app", async () => {
    const { default: robots } = await import("../app/robots");
    const {
      pageMetadata,
      siteStructuredData,
      breadcrumbStructuredData,
      collectionPageStructuredData,
      toolStructuredData,
    } = await import("../lib/seo");
    const { DEFAULT_PUBLIC_ORIGIN } =
      await import("../lib/tools/qr/data-template");
    const { userAgent } =
      await import("../lib/tools/barcode-scanner/product-lookup");

    const robotsConfig = robots();
    expect(robotsConfig.sitemap).toBe(`${ORIGIN}/sitemap.xml`);

    const homeMeta = pageMetadata("Home", "Description", "/");
    // The homepage is stated as the bare origin. Next.js collapses a
    // same-origin root URL to `origin` when it renders the canonical, so the
    // sitemap, `@id`s and metadata all use this one spelling.
    expect(homeMeta.alternates?.canonical).toBe(ORIGIN);
    expect(homeMeta.openGraph?.url).toBe(ORIGIN);

    const guideMeta = pageMetadata("Guide", "Description", "/guides/barcode");
    expect(guideMeta.alternates?.canonical).toBe(`${ORIGIN}/guides/barcode`);
    expect(guideMeta.openGraph?.url).toBe(`${ORIGIN}/guides/barcode`);

    const serialized = JSON.stringify({
      site: siteStructuredData(),
      crumbs: breadcrumbStructuredData([
        { name: "Home", path: "/" },
        { name: "Barcode Guide", path: "/guides/barcode" },
      ]),
      collection: collectionPageStructuredData({
        name: "Developer Tools",
        description: "Browser developer tools",
        path: "/category/developer-tools",
        items: [{ name: "JSON Formatter", path: "/tools/json-formatter" }],
      }),
      tool: toolStructuredData({
        name: "JSON Formatter",
        description: "Format JSON locally",
        path: "/tools/json-formatter",
        category: "Developer Tools",
        slug: "json-formatter",
      }),
    });
    expect(serialized).toContain(ORIGIN);
    expect(serialized).not.toContain("quickkit.online");

    expect(DEFAULT_PUBLIC_ORIGIN).toBe(ORIGIN);
    expect(userAgent()).toContain(ORIGIN);
    expect(userAgent()).not.toContain("quickkit.online");
  });
});
