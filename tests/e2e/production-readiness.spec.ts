import { expect, test } from "@playwright/test";
import { tools } from "../../lib/catalog";

const toolRoutes = tools.map((tool) => `/tools/${tool.slug}`);
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

test("the canonical catalog exposes all 56 published tool routes", () => {
  expect(toolRoutes).toHaveLength(56);
});

test.describe("all published tool routes", () => {
  for (const route of toolRoutes) {
    test(route, async ({ page }) => {
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

test("shared layouts fit every required responsive width", async ({
  page,
}, testInfo) => {
  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: 900 });

    for (const route of responsiveRoutes) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `${route} at ${width}px`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
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
  }
});
