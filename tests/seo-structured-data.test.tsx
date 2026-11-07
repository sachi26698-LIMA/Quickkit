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
    // The AdSense loader and the Search Console meta must survive untouched.
    expect(
      holder.querySelectorAll(
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

    const problems: string[] = [];
    for (const meta of categoryMeta) {
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
