import { test, expect } from "@playwright/test";

/**
 * Desktop and mobile layout checks for the three barcode tools.
 *
 * The assertion is deliberately mechanical: the document must never be wider
 * than the viewport (no horizontal scrollbar), the heading must be visible, and
 * the tool's primary control must be on screen with a usable height. That is
 * what a real browser can prove about layout; pixel-perfect screenshots are not
 * claimed here.
 */
const ROUTES = [
  {
    path: "/tools/barcode-generator",
    heading: /Barcode/i,
    control: (page: import("@playwright/test").Page) =>
      page.locator("#bc-panel-generate").getByRole("button", { name: /^PNG$/ }),
  },
  {
    path: "/tools/batch-code-checker",
    heading: /Batch code/i,
    control: (page: import("@playwright/test").Page) =>
      page.getByRole("button", { name: /CHECK BATCH CODE/i }),
  },
  {
    path: "/tools/barcode-scanner",
    heading: /Barcode scanner/i,
    control: (page: import("@playwright/test").Page) =>
      page.getByRole("button", { name: /Start camera/i }),
  },
] as const;

const VIEWPORTS = [
  { name: "small phone", width: 320, height: 640 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route.path} fits the viewport and keeps its primary control usable`, async ({
        page,
      }) => {
        await page.goto(route.path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          route.heading,
        );

        const control = route.control(page);
        await expect(control).toBeVisible();

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(
          overflow,
          `${route.path} overflows by ${overflow}px at ${viewport.width}px`,
        ).toBeLessThanOrEqual(0);

        const box = await control.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(38);
        // Inside the viewport horizontally, and reachable by scrolling: a tool
        // page is legitimately taller than a phone.
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeInViewport();
      });
    }
  });
}
