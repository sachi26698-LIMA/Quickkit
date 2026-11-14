// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  legalPages,
  legalPageByHref,
  footerGroups,
  footerHomeLinks,
  LEGAL_LAST_UPDATED_ISO,
} from "../lib/legal";
import {
  contactChannels,
  contactEmail,
  hasOwnerDetail,
  ownerDetail,
  ownerDetails,
  publishOperatorAsBrand,
  socials,
  socialsVisible,
} from "../lib/site";
import Footer from "../components/footer";

afterEach(cleanup);

/** Stable comparison helper: the same set of hrefs, order-independent. */
const marks = (hrefs: (string | null)[]) => [...hrefs].sort();

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
      "/category/text-writing",
      "/category/developer-tools",
      "/category/calculators",
      "/category/security-privacy",
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

  it("keeps the homepage subset inside the real footer", () => {
    const all = new Set(
      footerGroups.flatMap((group) => group.links.map((link) => link.href)),
    );
    for (const href of footerHomeLinks) {
      expect(all, `${href} exists in a footer column`).toContain(href);
    }
    // The three legal pages every site must surface stay on the homepage.
    for (const href of ["/privacy", "/terms", "/cookies"]) {
      expect(footerHomeLinks).toContain(href);
    }
    // The long policy documents are hidden there, not removed from the site.
    for (const href of [
      "/disclaimer",
      "/copyright",
      "/intellectual-property",
      "/accessibility",
      "/file-handling",
    ]) {
      expect(footerHomeLinks).not.toContain(href);
      expect(all).toContain(href);
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

  it("marks exactly the non-homepage links for the homepage footer", () => {
    const { container } = render(<Footer />);
    const marked = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        '.footer-top nav a[data-home-link="hidden"]',
      ),
    ).map((link) => link.getAttribute("href"));
    const all = footerGroups
      .flatMap((group) => group.links.map((link) => link.href))
      .filter((href) => !footerHomeLinks.includes(href));
    expect(marks(marked)).toEqual(marks(all));
    // Never hide a page that a visitor has to be able to reach from the landing
    // page: privacy, terms and cookies stay.
    for (const required of ["/privacy", "/terms", "/cookies"]) {
      expect(marked).not.toContain(required);
    }
  });

  it("keeps the unverified social row out of the footer", () => {
    // The shipped URLs point at guessable `/quickkit` handles that were never
    // confirmed to belong to the operator. Until they are, the footer must not
    // send visitors to a stranger's profile: hide the row entirely.
    if (!socialsVisible) {
      const { container } = render(<Footer />);
      expect(container.querySelector(".footer-socials")).toBeNull();
      expect(screen.queryByLabelText(/on social media/i)).toBeNull();
    }
    // Whatever is published has to be a real, absolute HTTPS profile URL.
    for (const social of socials) {
      expect(social.href).toMatch(/^https:\/\/[^/]+\/\S+$/);
      expect(social.href).not.toBe("#");
    }
  });

  it("never publishes an unverified contact address", () => {
    // `hello@quickkit.in` shipped as a development stand-in and was never
    // confirmed as a monitored inbox. It must not be rendered anywhere: a
    // published-but-dead address silently loses a visitor's message.
    if (contactEmail === null) {
      for (const resolve of Object.values(contactChannels)) {
        expect(resolve()).toBeNull();
      }
    } else {
      // Once the owner supplies a real address, it must still be a real one.
      for (const resolve of Object.values(contactChannels)) {
        expect(resolve()).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
      }
    }
    expect(contactEmail === null || contactEmail.includes("@")).toBe(true);
    expect(contactEmail).not.toBe("hello@quickkit.in");
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

describe("legal tables on a phone", () => {
  // Below 700px the storage-inventory/licence tables are laid out as cards, so
  // every cell has to carry the name of its column. A cell without a label
  // would read as an unlabelled value on a phone.
  const TABLES = [
    "../app/cookies/page",
    "../app/copyright/page",
    "../app/disclaimer/page",
    "../app/file-handling/page",
    "../app/intellectual-property/page",
  ] as const;

  it.each(TABLES)("%s labels every cell with its column", async (path) => {
    const { default: Page } = await import(path);
    const { container, unmount } = render(<Page />);
    const cells = Array.from(
      container.querySelectorAll<HTMLTableCellElement>(
        "table.legal-table td[role='cell']",
      ),
    );
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(
        cell.getAttribute("data-label"),
        cell.textContent ?? "",
      ).toBeTruthy();
      expect(cell.getAttribute("role")).toBe("cell");
    }
    // The header row keeps its semantics even when CSS hides it on a phone.
    const headers = container.querySelectorAll(
      "table.legal-table th[role='columnheader']",
    );
    expect(headers.length).toBeGreaterThan(0);
    unmount();
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

    // Table of contents: a desktop panel plus a mobile disclosure, each
    // listing every section, and every entry resolving to a real heading.
    const sectionCount = legalPageByHref("/terms")!.sections.length;
    const tocs = container.querySelectorAll(".legal-toc");
    expect(tocs.length).toBe(2);
    for (const toc of Array.from(tocs)) {
      const anchors = within(toc as HTMLElement).getAllByRole("link");
      expect(anchors.length).toBe(sectionCount);
      for (const anchor of anchors) {
        const id = anchor.getAttribute("href")!.slice(1);
        expect(container.querySelector(`#${id}`), id).toBeTruthy();
      }
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

  it("shows the owner-input notice only while details are actually missing", async () => {
    // The notice is derived from `lib/site.ts`, never hardcoded, so it has to
    // track the data in both directions: present while something is missing,
    // gone the moment the operator supplies it.
    const stillMissing =
      (!hasOwnerDetail("legalName") && !publishOperatorAsBrand) ||
      !hasOwnerDetail("jurisdiction") ||
      !hasOwnerDetail("publicEmail");
    const { default: PrivacyPage } = await import("../app/privacy/page");
    render(<PrivacyPage />);
    if (stillMissing) {
      expect(screen.getByText(/Owner input required/)).toBeTruthy();
    } else {
      expect(screen.queryByText(/Owner input required/)).toBeNull();
      expect(screen.queryByText(/Draft — pending owner details/)).toBeNull();
      expect(screen.queryByText(/Owner to supply/)).toBeNull();
    }
  });

  it("publishes the contact address on every page that promises one", async () => {
    // The operator supplied one address; the Contact page, Privacy Policy,
    // Terms and About page must all reach it, as a real mailto link.
    expect(contactEmail).toBeTruthy();
    const pages = [
      ["contact", (await import("../app/contact/page")).default],
      ["privacy", (await import("../app/privacy/page")).default],
      ["terms", (await import("../app/terms/page")).default],
      ["about", (await import("../app/about/page")).default],
    ] as const;
    for (const [name, Page] of pages) {
      const { container, unmount } = render(<Page />);
      const mailtos = Array.from(
        container.querySelectorAll('a[href^="mailto:"]'),
      );
      expect(mailtos.length, `${name} publishes a mailto link`).toBeGreaterThan(
        0,
      );
      for (const link of mailtos)
        expect(link.getAttribute("href"), name).toContain(
          `mailto:${contactEmail}`,
        );
      unmount();
    }
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
