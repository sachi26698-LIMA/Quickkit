// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

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

const siteSettings = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock("@/lib/supabase/public-catalog", async (original) => ({
  ...(await original<typeof import("@/lib/supabase/public-catalog")>()),
  getPublicSiteSettings: async () => siteSettings.current,
}));

import Home, { generateMetadata } from "../app/(public)/page";

const TAGLINE = "Small tasks. Quick solutions.";

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

afterEach(() => {
  cleanup();
  siteSettings.current = {};
});

/**
 * Saving Admin → Site settings stores every field, the brand tagline included.
 * The home page used to put that tagline in place of its description, both on
 * the page and in the search snippet, so one save of an unrelated field changed
 * the hero. The hero now carries the brand headline as its own fixed badge
 * copy, so the regression is stated as an equality: saving the tagline must
 * not change a single character of what the hero renders.
 */
describe("home page hero copy", () => {
  it("renders the identical hero whether or not a tagline is saved", async () => {
    const renderHeroText = async (settings: Record<string, unknown>) => {
      siteSettings.current = settings;
      const { container, unmount } = render(await Home());
      const lede = container.querySelector(".hero-lede");
      expect(lede?.textContent).toMatch(
        /^\d+ browser tools for the jobs that interrupt a working day\./,
      );
      // Compare the hero's copy, not the live status strip. HeroScreenStatus
      // renders a clock that ticks every second, so two renders that straddle a
      // second boundary differ by that digit and by nothing else. The two
      // renderings happened a moment apart by design — this test is about copy
      // staying identical, so the ticking widget is excluded rather than
      // compared, and every word of the hero is still checked.
      const hero = container.querySelector(".hero");
      // Guard the exclusion list: the only time-dependent nodes in the hero are
      // the two in the live status strip. If something else ever starts
      // rendering a <time> here, the comparison would silently stop covering
      // it, so fail loudly instead.
      const clocks = hero?.querySelectorAll("[data-laptop-status] time").length;
      expect(hero?.querySelectorAll("time").length).toBe(clocks);
      hero?.querySelectorAll("time").forEach((node) => node.remove());
      const text = hero?.textContent ?? "";
      unmount();
      return text;
    };
    const plain = await renderHeroText({});
    const withTagline = await renderHeroText({
      website_name: "QUICKKIT",
      tagline: TAGLINE,
    });
    expect(withTagline).toBe(plain);
    expect(plain).toContain("Small tasks. Quick solutions.");
  });

  it("keeps the search description when a tagline is saved in site settings", async () => {
    siteSettings.current = { website_name: "QUICKKIT", tagline: TAGLINE };
    const metadata = await generateMetadata();
    expect(metadata.description).toMatch(/^Use \d+ free online tools for PDFs/);
    expect(JSON.stringify(metadata)).not.toContain(TAGLINE);
  });

  it("shows no announcement line when the announcement is switched off", async () => {
    siteSettings.current = {
      announcement: { enabled: false, message: "Hello guys" },
    };
    const { container } = render(await Home());
    expect(container.textContent).not.toContain("Hello guys");
    expect(
      container.querySelector('.hero > p.container[role="status"]'),
    ).toBeNull();
  });

  it("still shows an announcement the admin has switched on", async () => {
    siteSettings.current = {
      announcement: { enabled: true, message: "Back on Monday" },
    };
    const { container } = render(await Home());
    expect(
      container.querySelector('.hero > p.container[role="status"]')
        ?.textContent,
    ).toBe("Back on Monday");
  });
});
