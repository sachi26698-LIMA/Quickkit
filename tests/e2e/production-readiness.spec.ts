import { expect, test } from "@playwright/test";
import { tools } from "../../lib/catalog";

const toolRoutes = tools.map((tool) => `/tools/${tool.slug}`);

/**
 * Routes exercised on every browser engine.
 *
 * The exhaustive sweep below visits all of `toolRoutes`, but doing that on all
 * five projects multiplies the run by the catalogue size — 131 tools became 655
 * page loads and would have outgrown the job's 65-minute budget. Cross-engine
 * divergence is a layout and hydration property, so it is covered by one route
 * per category plus every tool on a shared shell, while the exhaustive sweep
 * (which catches 404s, missing H1s, console errors and overflow) stays on
 * chromium. Every published route is still visited at least once.
 */
const SAMPLE_SLUGS = [
  // One per legacy category, so every original engine shape is covered.
  "merge-pdf",
  "image-compressor",
  "qr-generator",
  "word-counter",
  "json-formatter",
  "emi-calculator",
  "password-generator",
  // One per launch workspace. `tool-workspace.tsx` renders eleven distinct
  // components, so one tool from each covers every new UI shape rather than
  // 75 variations of the same shell.
  "salary-calculator-india", // salary-workspace
  "gratuity-calculator", // attendance-workspace
  "salary-slip-generator", // document-studio
  "job-description-generator", // people-text-kit
  "serp-preview", // page-analyzer
  "organization-schema-generator", // schema-builder
  "robots-txt-generator", // technical-seo
  "title-generator", // content-kit
  "resume-ats-checker", // resume-studio
  "salary-converter", // job-search-kit
  "notice-period-calculator", // career-text-kit
];
const sampleRoutes = SAMPLE_SLUGS.map((slug) => `/tools/${slug}`).filter(
  (route) => toolRoutes.includes(route),
);
const responsiveRoutes = [
  "/",
  "/tools",
  "/tools/word-counter",
  "/tools/image-compressor",
  "/admin/login",
];
const responsiveWidths = [
  320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440, 1920,
];

test("the canonical catalog exposes a route for every published tool", () => {
  // Derived rather than pinned to a number: the catalogue is the source of
  // truth, and a hardcoded count turns every new tool into a red build.
  expect(toolRoutes).toHaveLength(tools.length);
  expect(new Set(toolRoutes).size).toBe(tools.length);
  for (const route of toolRoutes)
    expect(route).toMatch(/^\/tools\/[a-z0-9-]+$/);
});

test.describe("all published tool routes", () => {
  for (const route of toolRoutes) {
    test(route, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "chromium",
        "Exhaustive route sweep runs on chromium; sampleRoutes covers the other engines.",
      );
      const runtimeErrors: string[] = [];
      const failedAssets: string[] = [];
      const failedRequests: string[] = [];

      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(message.text());
      });
      page.on("requestfailed", (request) => {
        const failure = `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`;
        failedRequests.push(failure);
        if (
          ["script", "stylesheet", "font", "image"].includes(
            request.resourceType(),
          )
        ) {
          failedAssets.push(
            `${request.resourceType()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`,
          );
        }
      });
      page.on("response", (response) => {
        if (response.status() >= 400) {
          failedRequests.push(
            `${response.status()} ${response.request().method()} ${response.url()}`,
          );
        }
        if (
          response.status() >= 400 &&
          ["script", "stylesheet", "font", "image"].includes(
            response.request().resourceType(),
          )
        ) {
          failedAssets.push(
            `${response.status()} ${response.request().resourceType()} ${response.url()}`,
          );
        }
      });

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `HTTP response for ${route}`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
      await expect(page.locator("main").first()).toBeVisible();

      const geometry = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(
        geometry.document,
        `horizontal overflow at ${route}`,
      ).toBeLessThanOrEqual(geometry.viewport);
      expect(failedAssets, `failed page assets at ${route}`).toEqual([]);
      expect(failedRequests, `failed requests at ${route}`).toEqual([]);
      expect(
        runtimeErrors,
        `browser runtime/console errors at ${route}`,
      ).toEqual([]);
    });
  }
});

for (const route of responsiveRoutes) {
  test(`shared layout ${route} fits every required responsive width`, async ({
    page,
  }, testInfo) => {
    // Keep each route's 11 viewport checks together, but isolate routes so a
    // slow navigation identifies its path and cannot consume other routes' budget.
    test.setTimeout(60_000);

    for (const width of responsiveWidths) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status(), `${route} at ${width}px`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
        `visible H1 for ${route} at ${width}px`,
      ).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `${route} overflows at ${width}px`).toBe(false);

      if (route === "/" && width <= 430) {
        await page.screenshot({
          path: testInfo.outputPath(`home-${width}px.png`),
          fullPage: true,
        });
      }
    }
  });
}

test.describe("representative tool routes on every engine", () => {
  for (const route of sampleRoutes) {
    test(route, async ({ page }) => {
      const runtimeErrors: string[] = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(message.text());
      });

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `HTTP response for ${route}`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
      await expect(page.locator("main").first()).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `${route} overflows the viewport`).toBe(false);
      expect(runtimeErrors, `console errors at ${route}`).toEqual([]);
    });
  }
});
