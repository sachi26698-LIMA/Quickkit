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
 * the hero. The tagline belongs to the footer.
 */
describe("home page hero copy", () => {
  it("keeps its own description when a tagline is saved in site settings", async () => {
    siteSettings.current = { website_name: "QUICKKIT", tagline: TAGLINE };
    const { container } = render(await Home());
    const lede = container.querySelector(".hero-lede");
    expect(lede?.textContent).toMatch(
      /^\d+ browser tools for the jobs that interrupt a working day\./,
    );
    expect(container.querySelector(".hero")?.textContent).not.toContain(
      TAGLINE,
    );
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
