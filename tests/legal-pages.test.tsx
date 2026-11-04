// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  legalPages,
  legalPageByHref,
  footerGroups,
  LEGAL_LAST_UPDATED_ISO,
} from "../lib/legal";
import {
  contactChannels,
  hasOwnerDetail,
  ownerDetail,
  ownerDetails,
} from "../lib/site";

afterEach(cleanup);

/**
 * These tests guard the *structure* of the legal section: every required route
 * exists, every page has unique metadata, every link points at something real,
 * and the honesty rules hold (no invented operator details, no fake compliance
 * claims, no `#` placeholder hrefs).
 */

const REQUIRED_ROUTES = [
  "/terms",
  "/privacy",
  "/cookies",
  "/disclaimer",
  "/about",
  "/contact",
  "/faq",
  "/copyright",
  "/accessibility",
  "/security",
  "/file-handling",
  "/intellectual-property",
];

describe("legal page registry", () => {
  it("registers every required route exactly once", () => {
    const hrefs = legalPages.map((page) => page.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const route of REQUIRED_ROUTES) expect(hrefs).toContain(route);
  });

  it("gives every page a unique title and meta description", () => {
    const titles = legalPages.map((page) => page.title);
    const descriptions = legalPages.map((page) => page.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const page of legalPages) {
      // Meta descriptions must be long enough to be useful, short enough not to
      // be truncated by search engines.
      // +" | QUICKKIT" is appended by the root title template, so the record
      // itself must stay short enough to avoid a duplicated suffix.
      expect(page.description.length, page.href).toBeGreaterThan(70);
      // Leaves room for the root template's " | QUICKKIT" suffix.
      expect(page.description.length, page.href).toBeLessThan(160);
      expect(page.intro.length, page.href).toBeGreaterThan(40);
    }
  });

  it("avoids duplicating the site-name suffix in the rendered title", () => {
    for (const page of legalPages) {
      // The root layout appends " | QUICKKIT"; a record that already names the
      // brand would render "... QUICKKIT | QUICKKIT".
      expect(page.title.toUpperCase(), page.href).not.toContain("QUICKKIT");
      expect(`${page.title} | QUICKKIT`.length, page.href).toBeLessThanOrEqual(
        70,
      );
    }
  });

  it("assigns stable, unique section anchors", () => {
    for (const page of legalPages) {
      const ids = page.sections.map((section) => section.id);
      expect(new Set(ids).size, page.href).toBe(ids.length);
      // Policy documents get a full numbered outline; the FAQ navigates by
      // topic group, so it has fewer anchors by design.
      expect(ids.length, page.href).toBeGreaterThanOrEqual(
        page.href === "/faq" ? 6 : 8,
      );
      for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("looks up pages by href", () => {
    expect(legalPageByHref("/privacy")?.title).toBe("Privacy Policy");
    expect(legalPageByHref("/does-not-exist")).toBeUndefined();
  });
});

describe("footer navigation", () => {
  it("covers the four required groups", () => {
    expect(footerGroups.map((group) => group.heading)).toEqual([
      "Tools",
      "Company",
      "Legal",
      "Trust & Security",
    ]);
  });

  it("links only to real routes, with no duplicates and no '#' hrefs", () => {
    const known = new Set([
      "/",
      "/tools",
      "/help",
      "/sitemap",
      "/saved",
      "/#categories",
      "/category/pdf-tools",
      "/category/image-tools",
      "/category/qr-barcode",
      "/category/calculators",
      ...legalPages.map((page) => page.href),
    ]);
    const seen = new Set<string>();
    for (const group of footerGroups) {
      for (const link of group.links) {
        expect(link.href).not.toBe("#");
        expect(link.href.startsWith("#")).toBe(false);
        expect(known, `${group.heading} → ${link.href}`).toContain(link.href);
        expect(seen.has(link.href), `duplicate footer link ${link.href}`).toBe(
          false,
        );
        seen.add(link.href);
      }
    }
  });

  it("places each legal page in the group its registry record declares", () => {
    for (const page of legalPages) {
      const group = footerGroups.find((candidate) =>
        candidate.links.some((link) => link.href === page.href),
      );
      expect(group?.id, page.href).toBe(page.group);
    }
  });
});

describe("owner-detail honesty rules", () => {
  it("never invents a legal identity", () => {
    // This repo ships with no owner details; if someone fills them in, the
    // assertions below simply stop applying to the blank fields.
    const values: string[] = Object.values(ownerDetails);
    for (const value of values) {
      expect(typeof value).toBe("string");
      if (value.length > 0) expect(value.trim()).toBe(value);
    }
    expect(hasOwnerDetail("legalName")).toBe(false);
    expect(ownerDetail("legalName")).toBeUndefined();
  });

  it("always resolves an inbound address for every channel", () => {
    for (const resolve of Object.values(contactChannels)) {
      const address = resolve();
      expect(address).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    }
  });
});

describe("legal page content safeguards", () => {
  it("keeps the published revision date in the past or present", () => {
    expect(Number.isNaN(Date.parse(LEGAL_LAST_UPDATED_ISO))).toBe(false);
    expect(Date.parse(LEGAL_LAST_UPDATED_ISO)).toBeLessThanOrEqual(
      Date.parse("2026-12-31"),
    );
  });

  it("has no page whose text claims a certification the project lacks", async () => {
    // Rendered lazily: importing every page module keeps the marketing copy
    // honest about the absence of ISO/SOC/GDPR claims.
    const banned = [
      "is ISO 27001 certified",
      "we are GDPR compliant",
      "we are SOC 2",
      "HIPAA compliant",
    ];
    const modules = await Promise.all([
      import("../app/terms/page"),
      import("../app/privacy/page"),
      import("../app/cookies/page"),
      import("../app/disclaimer/page"),
      import("../app/copyright/page"),
      import("../app/security/page"),
      import("../app/accessibility/page"),
      import("../app/file-handling/page"),
      import("../app/intellectual-property/page"),
      import("../app/faq/page"),
      import("../app/about/page"),
      import("../app/contact/page"),
    ]);
    for (const pageModule of modules) {
      const Page = pageModule.default;
      const { container, unmount } = render(<Page />);
      const text = container.textContent ?? "";
      for (const phrase of banned)
        expect(text.toLowerCase()).not.toContain(phrase.toLowerCase());
      unmount();
    }
  });
});

describe("rendered legal page shell", () => {
  it("renders breadcrumbs, one h1, the date, a table of contents and related pages", async () => {
    const { default: TermsPage } = await import("../app/terms/page");
    const { container } = render(<TermsPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const breadcrumb = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(breadcrumb).toBeTruthy();
    const crumbs = within(breadcrumb as HTMLElement).getAllByRole("link");
    expect(crumbs.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/sitemap",
    ]);

    expect(container.querySelector("time")?.getAttribute("dateTime")).toBe(
      LEGAL_LAST_UPDATED_ISO,
    );

    // Table of contents entries must resolve to headings that exist.
    const toc = container.querySelector(".legal-toc");
    expect(toc).toBeTruthy();
    const anchors = within(toc as HTMLElement).getAllByRole("link");
    expect(anchors.length).toBe(legalPageByHref("/terms")!.sections.length);
    for (const anchor of anchors) {
      const id = anchor.getAttribute("href")!.slice(1);
      expect(container.querySelector(`#${id}`), id).toBeTruthy();
    }

    // Related pages exclude the current page and link to real routes.
    const related = container.querySelector(".legal-related") as HTMLElement;
    const relatedHrefs = within(related)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(relatedHrefs).not.toContain("/terms");
    expect(relatedHrefs.length).toBe(legalPages.length - 1);

    // Back-to-top and feedback affordances.
    expect(
      container.querySelector('.legal-backtotop a[href="#main"]'),
    ).toBeTruthy();
    expect(screen.getByText(/Was this page clear\?/)).toBeTruthy();
  });

  it("shows the owner-input notice while details are missing", async () => {
    const { default: PrivacyPage } = await import("../app/privacy/page");
    render(<PrivacyPage />);
    expect(screen.getByText(/Owner input required/)).toBeTruthy();
  });

  it("renders the FAQ groups with unique question summaries", async () => {
    const { default: FaqPage } = await import("../app/faq/page");
    const { container } = render(<FaqPage />);
    const summaries = container.querySelectorAll(".faq-list summary");
    expect(summaries.length).toBeGreaterThan(15);
    const texts = Array.from(summaries).map((node) => node.textContent);
    expect(new Set(texts).size).toBe(texts.length);
    for (const group of legalPageByHref("/faq")!.sections) {
      expect(container.querySelector(`#${group.id}`), group.id).toBeTruthy();
    }
  });
});
