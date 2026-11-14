// @vitest-environment jsdom
import { createElement } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Pages render client islands that expect the App Router (search, reveals).
// Those hooks are stubbed here; nothing below depends on real navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// The root layout loads a self-hosted font through next/font/local; outside
// Next's compiler that helper needs a stand-in.
vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-geist", variable: "--font-geist" }),
}));

const ORIGIN = "https://quickkit.example";

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
    class StubObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      value: StubObserver,
    });
  }
});

beforeEach(() => {
  vi.stubEnv("SITE_URL", ORIGIN);
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** Every JSON-LD block in a rendered tree, parsed. */
function jsonLd(root: ParentNode): Record<string, unknown>[] {
  return [...root.querySelectorAll('script[type="application/ld+json"]')].map(
    (node) => JSON.parse(node.textContent || "{}"),
  );
}

function breadcrumbs(root: ParentNode) {
  return jsonLd(root).filter((block) => block["@type"] === "BreadcrumbList");
}

function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── site-wide structured data ───────────────────────────────────────────────
describe("Organization and WebSite JSON-LD", () => {
  it("describes the publisher and the site in one graph", async () => {
    const { siteStructuredData } = await import("../lib/seo");
    const data = siteStructuredData() as {
      "@graph": Record<string, unknown>[];
    };

    const organization = data["@graph"].find(
      (node) => node["@type"] === "Organization",
    ) as Record<string, unknown>;
    const website = data["@graph"].find(
      (node) => node["@type"] === "WebSite",
    ) as Record<string, unknown>;

    expect(organization).toBeDefined();
    expect(website).toBeDefined();
    expect(organization.name).toBe("QUICKKIT");
    expect(organization.url).toBe(ORIGIN);
    expect(website.url).toBe(ORIGIN);
    expect(website.inLanguage).toBe("en");
    // The site is published by that organization, by reference — not by a copy.
    expect(website.publisher).toEqual({ "@id": organization["@id"] });
    expect(organization["@id"]).toBe(`${ORIGIN}/#organization`);
  });

  it("points the site's search action at the search the site really has", async () => {
    const { siteStructuredData } = await import("../lib/seo");
    const website = (
      siteStructuredData() as { "@graph": Record<string, unknown>[] }
    )["@graph"].find((node) => node["@type"] === "WebSite") as Record<
      string,
      unknown
    >;
    const action = website.potentialAction as Record<string, unknown>;

    expect(action["@type"]).toBe("SearchAction");
    expect(action.target).toEqual({
      "@type": "EntryPoint",
      urlTemplate: `${ORIGIN}/tools?q={search_term_string}`,
    });
    expect(action["query-input"]).toBe("required name=search_term_string");
  });

  it("invents no rating, review, address, price or social profile", async () => {
    const { siteStructuredData } = await import("../lib/seo");
    const serialised = JSON.stringify(siteStructuredData());

    for (const forbidden of [
      "aggregateRating",
      "review",
      "ratingValue",
      "address",
      "telephone",
      "sameAs",
      "priceRange",
      "vatID",
      "taxID",
    ]) {
      expect(serialised).not.toContain(forbidden);
    }
    // A logo is stated and must be an absolute URL on the site's own origin.
    const organization = (
      siteStructuredData() as { "@graph": Record<string, unknown>[] }
    )["@graph"].find((node) => node["@type"] === "Organization") as {
      logo: { url: string; width: number; height: number };
    };
    expect(organization.logo.url.startsWith(`${ORIGIN}/`)).toBe(true);
    expect(organization.logo.width).toBeGreaterThanOrEqual(112);
    expect(organization.logo.height).toBeGreaterThanOrEqual(112);
  });

  it("emits the contact inbox only when the operator configured one", async () => {
    const { siteStructuredData } = await import("../lib/seo");
    const { contactEmail } = await import("../lib/site");
    const organization = (
      siteStructuredData() as { "@graph": Record<string, unknown>[] }
    )["@graph"].find((node) => node["@type"] === "Organization") as Record<
      string,
      unknown
    >;

    if (contactEmail) expect(organization.email).toBe(contactEmail);
    else expect(organization.email).toBeUndefined();
  });

  it("emits nothing at all without a production origin", async () => {
    vi.stubEnv("SITE_URL", "");
    vi.resetModules();
    const { siteStructuredData, breadcrumbStructuredData } =
      await import("../lib/seo");
    expect(siteStructuredData()).toBeUndefined();
    expect(
      breadcrumbStructuredData([{ name: "Home", path: "/" }]),
    ).toBeUndefined();
  });
});

// ── breadcrumb structured data ──────────────────────────────────────────────
describe("BreadcrumbList JSON-LD", () => {
  it("numbers positions from 1 and resolves every path absolutely", async () => {
    const { breadcrumbStructuredData } = await import("../lib/seo");
    const data = breadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Tools", path: "/tools" },
      { name: "Word Counter", path: "/tools/word-counter" },
    ]) as { itemListElement: Record<string, unknown>[] };

    expect(data.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tools",
        item: `${ORIGIN}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Word Counter",
        item: `${ORIGIN}/tools/word-counter`,
      },
    ]);
  });

  it("returns nothing for an empty trail rather than an empty list", async () => {
    const { breadcrumbStructuredData } = await import("../lib/seo");
    expect(breadcrumbStructuredData([])).toBeUndefined();
  });

  it("mirrors the breadcrumb a tool page actually shows", async () => {
    // Imported here, not at the top, so lib/seo sees the stubbed origin.
    const { default: ToolShellShell } =
      await import("../components/tool-shell");
    const { container } = render(
      <ToolShellShell
        slug="word-counter"
        content={{ steps: ["One."], faqs: [{ q: "Q?", a: "A." }] }}
      >
        <div />
      </ToolShellShell>,
    );

    // What the reader sees…
    const nav = container.querySelector('nav[aria-label="Breadcrumb"]')!;
    const visible = [...nav.querySelectorAll("a, span")]
      .map((node) => node.textContent?.trim())
      .filter((text): text is string => Boolean(text));

    // …and what the markup claims, level for level.
    const [block] = breadcrumbs(container);
    expect(block).toBeDefined();
    const items = (block.itemListElement as Record<string, unknown>[]).map(
      (item) => item.name,
    );
    expect(items).toEqual(["Home", "Tools", "Text & Writing", "Word Counter"]);
    expect(items).toEqual(visible);
    expect(
      (block.itemListElement as Record<string, unknown>[]).map(
        (item) => item.position,
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it("is emitted on the pages that visibly show a trail, and not elsewhere", async () => {
    const SitemapPage = (await import("../app/sitemap/page")).default;
    const AboutPage = (await import("../app/about/page")).default;
    const Home = (await import("../app/page")).default;

    const sitemap = render(createElement(SitemapPage)).container;
    const about = render(createElement(AboutPage)).container;
    const home = render(createElement(Home)).container;

    for (const container of [sitemap, about]) {
      expect(
        container.querySelector('nav[aria-label="Breadcrumb"]'),
      ).not.toBeNull();
      const [block] = breadcrumbs(container);
      expect(block).toBeDefined();
      const items = block.itemListElement as Record<string, unknown>[];
      expect(items[0].name).toBe("Home");
      expect(items.map((item) => item.position)).toEqual(
        items.map((_, index) => index + 1),
      );
    }

    // The homepage and the two hubs that use PageHero have no breadcrumb on
    // screen, so they must not claim one in structured data either.
    expect(home.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
    expect(breadcrumbs(home)).toHaveLength(0);
  });

  it("is rendered once per page, not duplicated by the layout", async () => {
    const { default: Layout } = await import("../app/layout");
    const markup = renderToStaticMarkup(
      createElement(Layout, null, createElement("main", null, "x")),
    );
    const holder = document.createElement("div");
    holder.innerHTML = markup;

    expect(breadcrumbs(holder)).toHaveLength(0);
    const types = jsonLd(holder).flatMap((block) =>
      Array.isArray(block["@graph"])
        ? (block["@graph"] as Record<string, unknown>[]).map(
            (node) => node["@type"],
          )
        : [block["@type"]],
    );
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    // The AdSense loader stays absent by default, keeping this build local-only.
    expect(
      holder.querySelectorAll(
        'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
      ),
    ).toHaveLength(0);

    // Only an explicit opt-in adds the external advertising script.
    vi.stubEnv("ADS_ENABLED", "true");
    vi.resetModules();
    const { default: EnabledLayout } = await import("../app/layout");
    const enabledMarkup = renderToStaticMarkup(
      createElement(EnabledLayout, null, createElement("main", null, "x")),
    );
    const enabledHolder = document.createElement("div");
    enabledHolder.innerHTML = enabledMarkup;
    expect(
      enabledHolder.querySelectorAll(
        'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
      ),
    ).toHaveLength(1);
  });
});

// ── homepage headline and copy ──────────────────────────────────────────────
describe("homepage H1 and original copy", () => {
  it("has one visible, descriptive H1 instead of a screen-reader label", async () => {
    const Home = (await import("../app/page")).default;
    const { container } = render(createElement(Home));

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    const h1 = headings[0];
    expect(h1.className).not.toContain("sr-only");
    expect(h1.textContent?.trim()).not.toBe("QUICKKIT tools");
    // Names what the site covers, in the words a person would search for.
    expect(h1.textContent).toMatch(/PDF/i);
    expect(h1.textContent).toMatch(/image/i);
  });

  it("explains the toolkit in 250–400 words of real text", async () => {
    const Home = (await import("../app/page")).default;
    const { container } = render(createElement(Home));
    const copy = container.querySelector(".home-copy");

    expect(copy).not.toBeNull();
    const count = words(copy!.textContent || "");
    expect(count).toBeGreaterThanOrEqual(250);
    expect(count).toBeLessThanOrEqual(400);
    // It is prose with headings and links, not a wall of keywords.
    expect(copy!.querySelectorAll("p").length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector("#what-title")?.tagName.toLowerCase()).toBe(
      "h2",
    );
  });
});

// ── category copy ───────────────────────────────────────────────────────────
describe("category page copy", () => {
  it("covers every published category with 300–500 words", async () => {
    const { categoryContent } = await import("../lib/category-content");
    const { categoryMeta, toolsByCategory } = await import("../lib/catalog");

    // ai-tools is a "coming soon" placeholder and is noindex, so it is not a
    // published category: no page of copy is written for it.
    const published = categoryMeta.filter(
      (meta) => toolsByCategory(meta.name).length > 0,
    );
    expect(Object.keys(categoryContent).sort()).toEqual(
      published.map((meta) => meta.slug).sort(),
    );

    for (const meta of published) {
      const entry = categoryContent[meta.slug];
      expect(entry, meta.slug).toBeDefined();
      const text = [entry.intro, ...entry.paragraphs].join(" ");
      const count = words(text);
      expect(count, `${meta.slug} has ${count} words`).toBeGreaterThanOrEqual(
        300,
      );
      expect(count, `${meta.slug} has ${count} words`).toBeLessThanOrEqual(500);
      expect(entry.heading.length).toBeGreaterThan(10);
      expect(entry.paragraphs.length).toBeGreaterThanOrEqual(3);
      // Nothing generic enough to fit any category.
      expect(text.toLowerCase()).not.toContain("lorem ipsum");
      expect(text.toLowerCase()).not.toContain("in today's digital age");
    }
  });

  it("shares no five-word run between two categories", async () => {
    const { categoryContent } = await import("../lib/category-content");
    const shingles = (text: string) => {
      const tokens = text.toLowerCase().match(/[a-z0-9’']+/g) || [];
      return new Set(
        tokens.map((_, index) => tokens.slice(index, index + 5).join(" ")),
      );
    };
    const entries = Object.entries(categoryContent).map(([slug, entry]) => ({
      slug,
      set: shingles([entry.intro, ...entry.paragraphs].join(" ")),
    }));

    for (let a = 0; a < entries.length; a += 1) {
      for (let b = a + 1; b < entries.length; b += 1) {
        const shared = [...entries[a].set].filter((shingle) =>
          entries[b].set.has(shingle),
        );
        expect(shared, `${entries[a].slug} vs ${entries[b].slug}`).toEqual([]);
      }
    }
  });
});

// ── metadata budget, checked against the source of every page ───────────────
describe("page metadata lengths", () => {
  const TITLE_BUDGET = 60; // rendered, including " | QUICKKIT"
  const DESC_BUDGET = 160;

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return walk(path);
      return path.endsWith("page.tsx") ? [path] : [];
    });
  }

  const files = walk(join(process.cwd(), "app"));

  it("keeps every literal title inside the SERP budget and the brand unique", () => {
    const problems: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const noindex =
        source.includes("noindex") || source.includes("index: false");
      for (const match of source.matchAll(
        /pageMetadata\(\s*"((?:[^"\\]|\\.)*)",\s*"(?:[^"\\]|\\.)*",\s*"([^"]*)"/g,
      )) {
        const [, title, path] = match;
        const rendered = title.length + " | QUICKKIT".length;
        if (rendered > TITLE_BUDGET) {
          problems.push(`${path}: title renders ${rendered} chars`);
        }
        // The root layout template already appends the brand; repeating it in
        // the page title prints "… QUICKKIT | QUICKKIT" in search results.
        if (!noindex && /QUICKKIT/i.test(title)) {
          problems.push(`${path}: title repeats the brand`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps registry-driven titles and descriptions inside the same budget", async () => {
    const { categoryMeta } = await import("../lib/catalog");
    const { legalPages } = await import("../lib/legal");
    const { calculatorInfo } = await import("../lib/calculator-info");

    const problems: string[] = [];
    for (const [slug, info] of Object.entries(calculatorInfo)) {
      const renderedTitle = info.seoTitle.length + " | QUICKKIT".length;
      if (renderedTitle > TITLE_BUDGET || renderedTitle < 45) {
        problems.push(
          `/tools/${slug}: seoTitle renders ${renderedTitle} chars`,
        );
      }
      if (/QUICKKIT/i.test(info.seoTitle)) {
        problems.push(`/tools/${slug}: seoTitle repeats the brand`);
      }
      if (
        info.description.length > DESC_BUDGET ||
        info.description.length < 120
      ) {
        problems.push(
          `/tools/${slug}: description is ${info.description.length} chars`,
        );
      }
    }
    for (const meta of categoryMeta) {
      const renderedTitle = meta.seoTitle.length + " | QUICKKIT".length;
      if (renderedTitle > TITLE_BUDGET) {
        problems.push(
          `/category/${meta.slug}: seoTitle renders ${renderedTitle} chars`,
        );
      }
      if (/QUICKKIT/i.test(meta.seoTitle)) {
        problems.push(`/category/${meta.slug}: seoTitle repeats the brand`);
      }
      if (meta.description.length > DESC_BUDGET) {
        problems.push(
          `/category/${meta.slug}: description is ${meta.description.length} chars`,
        );
      }
    }
    for (const page of legalPages) {
      const rendered = page.title.length + " | QUICKKIT".length;
      if (rendered > TITLE_BUDGET) {
        problems.push(`${page.href}: title renders ${rendered} chars`);
      }
      if (page.title.length > 49) {
        problems.push(`${page.href}: raw title is ${page.title.length} chars`);
      }
      if (page.description.length >= DESC_BUDGET) {
        problems.push(
          `${page.href}: description is ${page.description.length} chars`,
        );
      }
      if (/QUICKKIT/i.test(page.title)) {
        problems.push(`${page.href}: title repeats the brand`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps every literal description inside the SERP budget", () => {
    const problems: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /pageMetadata\(\s*"(?:[^"\\]|\\.)*",\s*"((?:[^"\\]|\\.)*)",\s*"([^"]*)"/g,
      )) {
        const [, description, path] = match;
        if (description.length > DESC_BUDGET) {
          problems.push(`${path}: description is ${description.length} chars`);
        }
        if (description.length < 70) {
          problems.push(`${path}: description is only ${description.length}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

// ── Phase 2 technical SEO contracts ─────────────────────────────────────────
describe("Phase 2 technical SEO contracts", () => {
  beforeEach(() => {
    vi.stubEnv("SITE_URL", "https://quickkit.example");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emits accurate WebApplication schema without deprecated HowTo across tool types", async () => {
    const { toolStructuredData } = await import("../lib/seo");

    const pdfApp = toolStructuredData({
      name: "Merge PDF",
      description: "Combine PDFs locally.",
      path: "/tools/merge-pdf",
      category: "PDF Tools",
      slug: "merge-pdf",
      faqs: [{ q: "Free?", a: "Yes." }],
    });
    const pdfTypes = pdfApp["@graph"].map((node) => node["@type"]);
    expect(pdfTypes).toEqual(["WebApplication", "FAQPage"]);
    expect(pdfTypes).not.toContain("HowTo");
    expect(pdfApp["@graph"][0]).toMatchObject({
      "@type": "WebApplication",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
    });
    expect(String(pdfApp["@graph"][0].browserRequirements)).toMatch(/locally/i);

    const financeApp = toolStructuredData({
      name: "EMI Calculator",
      description: "Calculate monthly EMI.",
      path: "/tools/emi-calculator",
      category: "Calculators",
      slug: "emi-calculator",
      faqs: [],
    });
    expect(financeApp["@graph"]).toHaveLength(1);
    expect(financeApp["@graph"][0].applicationCategory).toBe(
      "FinanceApplication",
    );

    const wordToPdfApp = toolStructuredData({
      name: "Word to PDF Converter",
      description: "Convert DOCX to PDF.",
      path: "/tools/word-to-pdf",
      category: "PDF Tools",
      slug: "word-to-pdf",
      faqs: [],
    });
    expect(String(wordToPdfApp["@graph"][0].browserRequirements)).toMatch(
      /explicit-consent server processing/i,
    );
  });

  it("emits CollectionPage on /tools and active categories, but not on empty noindex categories", async () => {
    const ToolsPage = (await import("../app/tools/page")).default;
    const CategoryPage = (await import("../app/category/[slug]/page")).default;

    const { container: toolsDom } = render(createElement(ToolsPage));
    const toolsSchemas = jsonLd(toolsDom);
    const toolsCollection = toolsSchemas.find(
      (b) => b["@type"] === "CollectionPage",
    );
    expect(toolsCollection).toBeDefined();
    expect(
      (toolsCollection?.mainEntity as { numberOfItems: number }).numberOfItems,
    ).toBe((await import("../lib/catalog")).tools.length);
    expect(breadcrumbs(toolsDom)).toHaveLength(1);

    const activeCatEl = await CategoryPage({
      params: Promise.resolve({ slug: "pdf-tools" }),
    });
    const { container: activeCatDom } = render(activeCatEl);
    expect(
      jsonLd(activeCatDom).some((b) => b["@type"] === "CollectionPage"),
    ).toBe(true);
    expect(breadcrumbs(activeCatDom)).toHaveLength(1);

    const emptyCatEl = await CategoryPage({
      params: Promise.resolve({ slug: "ai-tools" }),
    });
    const { container: emptyCatDom } = render(emptyCatEl);
    expect(
      jsonLd(emptyCatDom).some((b) => b["@type"] === "CollectionPage"),
    ).toBe(false);
    expect(breadcrumbs(emptyCatDom)).toHaveLength(0);
  });

  it("exposes crawlable category links in both Header (SSR hidden dropdown) and Footer", async () => {
    const Header = (await import("../components/header")).default;
    const Footer = (await import("../components/footer")).default;
    const { categoryMeta, toolsByCategory } = await import("../lib/catalog");

    const activeSlugs = categoryMeta
      .filter((c) => toolsByCategory(c.name).length > 0)
      .map((c) => `/category/${c.slug}`);

    const { container: headerDom } = render(createElement(Header));
    const panel = headerDom.querySelector("#header-categories-panel");
    expect(panel).not.toBeNull();
    expect(panel?.hasAttribute("hidden")).toBe(true);
    const headerHrefs = [...headerDom.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    for (const href of activeSlugs) {
      expect(headerHrefs, `Header links to ${href}`).toContain(href);
    }
    expect(
      headerDom.querySelector('a[href="/saved"]')?.getAttribute("rel"),
    ).toBe("nofollow");
    expect(
      headerDom
        .querySelector('a[href="/category/ai-tools"]')
        ?.getAttribute("rel"),
    ).toBe("nofollow");

    const { container: footerDom } = render(createElement(Footer));
    const footerHrefs = [...footerDom.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    for (const href of activeSlugs) {
      expect(footerHrefs, `Footer links to ${href}`).toContain(href);
    }
  });

  it("suppresses adsbygoogle.js when ADS_ENABLED=false or on excluded routes", async () => {
    const AdSenseLoader = (await import("../components/adsense-loader"))
      .default;
    const { isAdsEnabled } = await import("../lib/ads");

    vi.stubEnv("ADS_ENABLED", "false");
    expect(isAdsEnabled()).toBe(false);

    const { container: disabledDom } = render(
      createElement(AdSenseLoader, {
        enabled: isAdsEnabled(),
        scriptSrc:
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1478767466279341",
      }),
    );
    expect(disabledDom.querySelector("script")).toBeNull();
  });

  it("maintains strict H1->H2->H3 hierarchy without level skips across Batch A pages", async () => {
    const HomePage = (await import("../app/page")).default;
    const ToolsPage = (await import("../app/tools/page")).default;
    const CategoryPage = (await import("../app/category/[slug]/page")).default;
    const HelpPage = (await import("../app/help/page")).default;
    const SitemapPage = (await import("../app/sitemap/page")).default;
    const ContactPage = (await import("../app/contact/page")).default;
    const FileHandlingPage = (await import("../app/file-handling/page"))
      .default;
    const { legalPageByHref } = await import("../lib/legal");

    const samples: Array<[string, React.ReactElement]> = [
      ["/", createElement(HomePage)],
      ["/tools", createElement(ToolsPage)],
      [
        "/category/pdf-tools",
        await CategoryPage({ params: Promise.resolve({ slug: "pdf-tools" }) }),
      ],
      [
        "/category/ai-tools",
        await CategoryPage({ params: Promise.resolve({ slug: "ai-tools" }) }),
      ],
      ["/help", createElement(HelpPage)],
      ["/sitemap", createElement(SitemapPage)],
      ["/contact", createElement(ContactPage)],
      ["/file-handling", createElement(FileHandlingPage)],
    ];

    for (const [route, element] of samples) {
      const { container, unmount } = render(element);
      const levels = [
        ...container.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      ].map((el) => Number(el.tagName.slice(1)));
      expect(
        levels.filter((l) => l === 1),
        `${route} must have exactly one H1`,
      ).toHaveLength(1);
      for (let i = 1; i < levels.length; i++) {
        expect(
          levels[i] - levels[i - 1],
          `${route} skipped heading level H${levels[i - 1]} -> H${levels[i]}`,
        ).toBeLessThanOrEqual(1);
      }
      if (route === "/contact") {
        const h3Texts = [...container.querySelectorAll("h3")].map((el) =>
          el.textContent?.trim(),
        );
        expect(new Set(h3Texts).size).toBe(h3Texts.length);
      }
      if (route === "/file-handling") {
        for (const section of legalPageByHref("/file-handling")!.sections ??
          []) {
          expect(
            container.querySelector(`#${CSS.escape(section.id)}`),
            `/file-handling missing #${section.id}`,
          ).not.toBeNull();
        }
      }
      unmount();
    }
  });
});
