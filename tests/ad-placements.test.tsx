// @vitest-environment jsdom
import type { ReactElement } from "react";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Server components rendered in isolation still reach for App Router hooks
// through their client children (search, favourites, reveal on scroll).
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

import {
  AD_EXCLUDED_ROUTES,
  AD_PLACEMENTS,
  AD_SLOTS,
  DEFAULT_AD_SLOT,
  MAX_ADS_PER_PAGE,
  isAdEligible,
} from "../lib/ads";
import LegalPageShell from "../components/legal-page-shell";
import ToolShell from "../components/tool-shell";
import Home from "../app/page";
import HelpPage from "../app/help/page";
import AboutPage from "../app/about/page";
import FaqPage from "../app/faq/page";
import ToolsPage from "../app/tools/page";
import CategoryPage from "../app/category/[slug]/page";

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
      value: StubObserver,
      writable: true,
    });
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

/**
 * Route coverage for the advertising system.
 *
 * The site must never end up in either bad state: a public page nobody thought
 * about (silently ad-free) or advertising forced onto a page where it does not
 * belong. Both decisions are therefore explicit — a page carries an `<AdUnit>`
 * or it is listed in `AD_EXCLUDED_ROUTES` with a reason — and this suite fails
 * when a route is added without one.
 */

const SOURCE_DIRS = ["app", "components", "lib"];

function sourceFiles(dirs = SOURCE_DIRS): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
    }
  };
  for (const dir of dirs) walk(dir);
  return out;
}

/**
 * Files that mount an ad slot, i.e. the pages reviewed for advertising.
 * Matches real JSX usage only (`<AdUnit placement=…`): prose in a comment that
 * happens to name the component is not a placement.
 */
function filesRenderingAds(): string[] {
  return sourceFiles().filter((file) =>
    /<AdUnit\s+placement=/.test(readFileSync(file, "utf8")),
  );
}

async function sitemapPaths(): Promise<string[]> {
  vi.stubEnv("SITE_URL", "https://test.example");
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
  const { default: sitemap } = await import("../app/sitemap");
  return sitemap().map((entry) =>
    entry.url.replace("https://test.example", ""),
  );
}

/** Every `.ad-slot` rendered by a component, plus its placement name. */
function slotsOf(element: ReactElement) {
  const { container } = render(element);
  const slots = [...container.querySelectorAll(".ad-slot")];
  return {
    container,
    slots,
    placements: slots.map((slot) => slot.getAttribute("data-ad-placement")),
    ins: [...container.querySelectorAll("ins.adsbygoogle")],
  };
}

describe("ad unit registry", () => {
  it("only references ad slots that exist in the AdSense account", () => {
    // One unit was created for this site. Anything else would be invented, so
    // the registry stays exactly this long until a real id is created.
    expect(Object.keys(AD_SLOTS)).toEqual(["display"]);
    expect(AD_SLOTS[DEFAULT_AD_SLOT]).toBe("1553253144");
    for (const id of Object.values(AD_SLOTS)) {
      expect(id).toMatch(/^\d{10}$/);
    }
  });

  it("uses every declared placement, and nothing undeclared", () => {
    const used = new Set<string>();
    for (const file of filesRenderingAds()) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/placement="([a-z-]+)"/g)) {
        used.add(match[1]);
      }
    }
    // No page may invent a placement name…
    for (const name of used) {
      expect(AD_PLACEMENTS as readonly string[]).toContain(name);
    }
    // …and no declared placement may be left dead after a page changes.
    expect([...used].sort()).toEqual([...AD_PLACEMENTS].sort());
  });

  it("mounts ad units in a known, reviewed set of files only", () => {
    // Every one of these was reviewed on its own: the homepage, the shared tool
    // shell (all 42 tools), the two listing pages, the help centre, the shared
    // legal shell (9 policy pages) and the two bespoke editorial pages.
    expect(filesRenderingAds().sort()).toEqual([
      "app/about/page.tsx",
      "app/category/[slug]/page.tsx",
      "app/faq/page.tsx",
      "app/help/page.tsx",
      "app/page.tsx",
      "app/tools/page.tsx",
      "app/tools/word-to-pdf/page.tsx",
      "components/legal-page-shell.tsx",
      "components/tool-shell.tsx",
      "components/tools/word-to-pdf/index.tsx",
    ]);
  });
});

describe("route coverage", () => {
  it("covers or explicitly excludes every sitemap route", async () => {
    const paths = await sitemapPaths();
    const { securityGroups } =
      await import("../lib/tools/security/consolidation");
    expect(paths).toHaveLength(65 + securityGroups.length - 2);

    const excluded = paths.filter((path) => !isAdEligible(path));
    const covered = paths.filter((path) => isAdEligible(path));

    // Two sitemap pages are deliberately ad-free, each for a stated reason.
    expect(excluded.sort()).toEqual(["/contact", "/sitemap"]);
    expect(covered).toHaveLength(63 + securityGroups.length - 2);

    for (const path of excluded) {
      expect(AD_EXCLUDED_ROUTES[path]?.length ?? 0).toBeGreaterThan(20);
    }
    // Excluded non-sitemap routes are never advertised against either.
    expect(isAdEligible("/saved")).toBe(false);
    expect(isAdEligible("/qr")).toBe(false);
    expect(isAdEligible("/category/ai-tools")).toBe(false);
    expect(isAdEligible("/api/contact")).toBe(false);
    expect(isAdEligible("/_not-found")).toBe(false);
  });

  it("renders ads on every eligible route family", async () => {
    const { container: toolish } = slotsOf(
      <ToolShell
        slug="merge-pdf"
        content={{ steps: ["One."], faqs: [{ q: "Q?", a: "A." }] }}
      >
        <div />
      </ToolShell>,
    );
    expect(toolish.querySelectorAll(".ad-slot")).toHaveLength(3);

    for (const element of [
      <Home key="home" />,
      <HelpPage key="help" />,
      <AboutPage key="about" />,
      <FaqPage key="faq" />,
      <LegalPageShell
        key="legal"
        href="/privacy"
        title="Privacy Policy"
        intro="Intro"
        lastUpdated="7 November 2026"
        lastUpdatedIso="2026-11-07"
      >
        <p>Body</p>
      </LegalPageShell>,
    ]) {
      const { slots } = slotsOf(element);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.length).toBeLessThanOrEqual(MAX_ADS_PER_PAGE);
    }
  });

  it("keeps the excluded pages free of any ad code", () => {
    for (const file of ["app/contact/page.tsx", "app/sitemap/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("AdUnit");
      expect(source).not.toContain("adsbygoogle");
    }
  });
});

describe("tool route coverage", () => {
  it("routes every one of the 42 tools through the shared shell", async () => {
    const { tools } = await import("../lib/catalog");
    const { securityGroups } =
      await import("../lib/tools/security/consolidation");
    expect(tools).toHaveLength(42 + securityGroups.length - 2);

    const pageFiles = readdirSync("app/tools").filter(
      (entry) => !entry.includes("."),
    );

    // 29 concrete tool folders + the [calculator] dynamic route + /tools itself.
    const toolDirs = pageFiles.filter((entry) => entry !== "page.tsx");
    for (const dir of toolDirs) {
      const page = join("app/tools", dir, "page.tsx");
      if (!existsSync(page)) continue;
      const source = readFileSync(page, "utf8");
      // Each tool page either mounts ToolShell or delegates to the developer
      // tool wrapper, which does — so all 42 inherit the same three slots.
      expect(
        source.includes("ToolShell") ||
          source.includes("@/components/tools/devtools/page"),
      ).toBe(true);
    }

    // Every catalogue slug has a page: either its own folder or the calculator
    // dynamic route.
    for (const tool of tools) {
      const own = existsSync(join("app/tools", tool.slug, "page.tsx"));
      const { calculatorInfo } = await import("../lib/calculator-info");
      const viaCalculator =
        existsSync("app/tools/[calculator]/page.tsx") &&
        (tool.slug in calculatorInfo ||
          securityGroups.some((entry) => entry.slug === tool.slug));
      expect(own || viaCalculator).toBe(true);
    }
  });

  it("advertises the stand-alone word-to-pdf studio only at its edges", () => {
    // This page is one continuous control surface rather than a shell page, so
    // it carries two units: one under its intro band, one after the studio.
    // Nothing is mounted between its panes, next to Convert, Download or upload.
    const page = readFileSync("app/tools/word-to-pdf/page.tsx", "utf8");
    const studio = readFileSync(
      "components/tools/word-to-pdf/index.tsx",
      "utf8",
    );
    const placements = [
      ...(page + studio).matchAll(/placement="([a-z-]+)"/g),
    ].map((match) => match[1]);
    expect(placements.sort()).toEqual(["tool-after-intro", "tool-bottom"]);
    // The page wrapper only mounts its unit after the studio component.
    expect(
      page.indexOf("<WordToPdf />") < page.indexOf('placement="tool-bottom"'),
    ).toBe(true);
    expect(page.indexOf('placement="tool-after-intro"')).toBe(-1);
  });

  it("gives a category with no published tools no advertising", () => {
    // An empty category renders a "coming soon" placeholder — there is no
    // content to support a unit, so the slot is conditional on the listing.
    const source = readFileSync("app/category/[slug]/page.tsx", "utf8");
    expect(source).toContain("{list.length ? (");
  });

  it("gives the compact studio layout the same three slots", () => {
    const { slots } = slotsOf(
      <ToolShell
        slug="pdf-lock-unlock"
        variant="compact"
        content={{ steps: ["One."], faqs: [{ q: "Q?", a: "A." }] }}
      >
        <div data-testid="studio" />
      </ToolShell>,
    );
    expect(slots).toHaveLength(3);
  });
});

describe("duplicate protection", () => {
  it("never repeats a placement or a slot identity on one page", async () => {
    const categoryElement = await CategoryPage({
      params: Promise.resolve({ slug: "pdf-tools" }),
    });
    const toolsElement = ToolsPage();
    // Elements are built lazily so a single page's slot list can be inspected
    // in isolation, and so no element sits in an array without a key.
    const pages: [string, () => ReactElement][] = [
      ["/", () => <Home />],
      ["/tools", () => toolsElement],
      ["/category/pdf-tools", () => categoryElement],
      ["/help", () => <HelpPage />],
      ["/about", () => <AboutPage />],
      ["/faq", () => <FaqPage />],
      [
        "/tools/word-counter",
        () => (
          <ToolShell
            slug="word-counter"
            content={{ steps: ["One."], faqs: [{ q: "Q?", a: "A." }] }}
          >
            <div />
          </ToolShell>
        ),
      ],
      [
        "/privacy",
        () => (
          <LegalPageShell
            href="/privacy"
            title="Privacy Policy"
            intro="Intro"
            lastUpdated="7 November 2026"
            lastUpdatedIso="2026-11-07"
          >
            <p>Body</p>
          </LegalPageShell>
        ),
      ],
    ];

    for (const [path, element] of pages) {
      const { placements, ins, slots } = slotsOf(element());
      expect(slots.length, path).toBeGreaterThan(0);
      // One placement name per unit: a copy-pasted second slot fails here.
      expect(new Set(placements).size, path).toBe(placements.length);
      // One <ins> per slot, and every <ins> points at a real unit.
      expect(ins.length, path).toBe(slots.length);
      for (const unit of ins) {
        expect(unit.getAttribute("data-ad-client")).toBe(
          "ca-pub-1478767466279341",
        );
        expect(Object.values(AD_SLOTS) as string[]).toContain(
          unit.getAttribute("data-ad-slot") ?? "",
        );
        expect(unit.getAttribute("data-full-width-responsive")).toBe("true");
        expect(unit.getAttribute("data-ad-format")).toBeTruthy();
      }
    }
  });

  it("keeps a single loader no matter how many units a page mounts", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout.split("adsbygoogle.js").length - 1).toBe(1);
    for (const file of filesRenderingAds()) {
      expect(readFileSync(file, "utf8")).not.toContain("adsbygoogle.js");
    }
  });
});
