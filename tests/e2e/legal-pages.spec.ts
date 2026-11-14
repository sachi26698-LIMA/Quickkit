import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { legalPages } from "../../lib/legal";

/**
 * Dedicated coverage for the legal & information section: every policy has its
 * own reachable route, its own metadata, a working table of contents, working
 * breadcrumbs, working related-page links, and a footer that exposes all of
 * them without duplicates or `#` placeholders.
 */

const REQUIRED = [
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

test("every required legal route renders independently with its own metadata", async ({
  page,
  request,
}) => {
  const titles = new Set<string>();
  for (const route of REQUIRED) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);

    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/QUICKKIT/);
    const title = await page.title();
    expect(titles.has(title), `duplicate title ${title}`).toBe(false);
    titles.add(title);

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /.{70,}/,
    );
    // Breadcrumb trail is present and its first hop returns home.
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toBeVisible();
    await expect(
      breadcrumb.getByRole("link", { name: "Home" }),
    ).toHaveAttribute("href", "/");

    // Last-updated date is marked up as a machine-readable time element.
    await expect(page.locator("time")).toHaveAttribute(
      "datetime",
      /^\d{4}-\d{2}-\d{2}$/,
    );
  }
});

test("table of contents links resolve to in-page sections", async ({
  page,
}) => {
  for (const route of REQUIRED.filter((path) => path !== "/contact")) {
    await page.goto(route);
    const toc = page.getByRole("complementary").locator(".legal-toc");
    const anchors =
      route === "/faq"
        ? await page.locator(".legal-toc a").all()
        : await toc.getByRole("link").all();
    expect(anchors.length, route).toBeGreaterThan(0);
    for (const anchor of anchors) {
      const href = await anchor.getAttribute("href");
      expect(href, route).toMatch(/^#[a-z0-9-]+$/);
      const id = href!.slice(1);
      await expect(page.locator(`#${id}`), `${route} → ${href}`).toHaveCount(1);
    }
  }
});

test("related-page links all resolve and never point at the current page", async ({
  page,
  request,
}) => {
  const seen = new Set<string>();
  for (const route of ["/privacy", "/terms", "/file-handling", "/security"]) {
    await page.goto(route);
    const hrefs = await page
      .locator(".legal-related a")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!));
    expect(hrefs.length).toBe(legalPages.length - 1);
    expect(hrefs).not.toContain(route);
    for (const href of hrefs) {
      if (seen.has(href)) continue;
      expect((await request.get(href)).status(), href).toBe(200);
      seen.add(href);
    }
  }
});

test("footer exposes all four groups and every link works", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const heading of ["Tools", "Company", "Legal", "Trust & Security"]) {
    await expect(footer.getByRole("heading", { name: heading })).toBeVisible();
  }

  const hrefs = await footer
    .locator("nav a")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!));
  expect(new Set(hrefs).size, "no duplicate footer link").toBe(hrefs.length);
  for (const href of hrefs) {
    expect(href).not.toBe("#");
    // Fragment-only routes are checked at their base page.
    const target = href.split("#")[0] || "/";
    expect((await request.get(target)).status(), href).toBe(200);
  }

  // Every legal page is reachable from the footer alone.
  for (const route of REQUIRED) {
    expect(hrefs, `${route} linked from the footer`).toContain(route);
  }
});

// Each route owns its own timeout and browser context. Twelve axe scans in a
// single 30-second test made later routes time out under normal CI contention.
for (const route of REQUIRED) {
  test(`legal page ${route} passes axe and is keyboard navigable`, async ({
    page,
  }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        route,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);

    // Skip link is the first stop, and it moves focus to the main landmark.
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();

    // Back-to-top returns to the main landmark rather than a bare '#top'.
    const backToTop = page.locator('.legal-backtotop a[href="#main"]');
    await expect(backToTop).toHaveCount(1);
  });
}

test("active navigation state is set for legal routes", async ({ page }) => {
  await page.goto("/privacy");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", {
        name: "About",
      }),
  ).toHaveAttribute("aria-current", "page");
});

test("sitemap page lists every legal route", async ({ page }) => {
  await page.goto("/sitemap");
  for (const route of REQUIRED) {
    await expect(
      page.locator(`.sitemap-grid a[href="${route}"]`),
      route,
    ).toHaveCount(1);
  }
});
