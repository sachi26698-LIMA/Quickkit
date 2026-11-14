/**
 * QR Studio V3 — Phase J responsive visual + health checks.
 *
 * Captures genuine Chromium screenshots at five widths, asserts there is no
 * horizontal overflow or clipped primary control, and verifies the browser
 * console, network and React hydration are clean. Also checks the key routes
 * return the expected HTTP status.
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  gotoStudio,
  trySample,
  waitVerified,
  openDesignTab,
} from "./helpers/qr-studio";

const SHOT_DIR = path.join(process.cwd(), "test-results/evidence/qr-studio-v3");

const WIDTHS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-375", width: 375, height: 812 },
];

type Health = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
};

function watchHealth(page: Page): Health {
  const health: Health = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };
  page.on("console", (msg) => {
    if (msg.type() === "error") health.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => health.pageErrors.push(String(err)));
  page.on("requestfailed", (req) => {
    const reason = req.failure()?.errorText ?? "";
    // Next.js App Router prefetches RSC payloads for visible <Link>s and aborts
    // them on navigation/scroll. A cancelled prefetch is not a network failure;
    // genuine failures (refused, DNS, non-aborted errors) still count.
    if (reason === "net::ERR_ABORTED") return;
    health.failedRequests.push(`${req.method()} ${req.url()} — ${reason}`);
  });
  return health;
}

function expectClean(health: Health) {
  expect(health.pageErrors, "uncaught page errors").toEqual([]);
  expect(health.consoleErrors, "console errors").toEqual([]);
  expect(health.failedRequests, "failed network requests").toEqual([]);
}

test.beforeAll(() => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
});

test.describe("V3 responsive layout — genuine screenshots, no overflow", () => {
  for (const vp of WIDTHS) {
    test(`${vp.name}: no horizontal overflow, controls intact, screenshot captured`, async ({
      page,
    }) => {
      const health = watchHealth(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoStudio(page);
      await trySample(page);
      await waitVerified(page);

      // No horizontal overflow on the document.
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }));
      expect(
        overflow.scrollWidth,
        `document scrollWidth ${overflow.scrollWidth} > innerWidth ${overflow.innerWidth}`,
      ).toBeLessThanOrEqual(overflow.innerWidth + 1);

      // Primary controls are present and not clipped beyond the viewport.
      const typeSelect = page.getByLabel("QR content type");
      await expect(typeSelect).toBeVisible();
      const box = await typeSelect.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);

      const pngButton = page
        .locator("#qr-export")
        .getByRole("button", { name: /^PNG/ });
      await expect(pngButton).toBeVisible();
      const pngBox = await pngButton.boundingBox();
      expect(pngBox!.x + pngBox!.width).toBeLessThanOrEqual(vp.width + 1);

      // Genuine full-page screenshot.
      await page.screenshot({
        path: path.join(SHOT_DIR, `${vp.name}.png`),
        fullPage: true,
      });

      expectClean(health);
    });
  }

  test("mobile-375: design controls reachable and screenshot captured", async ({
    page,
  }) => {
    const health = watchHealth(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoStudio(page);
    await trySample(page);
    await waitVerified(page);
    await openDesignTab(page, "Colours");
    await expect(
      page.getByRole("group", { name: "Modules (foreground) type" }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(SHOT_DIR, "mobile-375-design.png"),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(overflow).toBe(true);
    expectClean(health);
  });
});

test.describe("V3 console / network / hydration health", () => {
  test("studio loads and interacts with zero console, network or hydration errors", async ({
    page,
  }) => {
    const health = watchHealth(page);
    await gotoStudio(page);
    await trySample(page);
    await waitVerified(page);
    // Exercise a few tabs and a design change to surface hydration/runtime issues.
    await openDesignTab(page, "Pattern");
    await openDesignTab(page, "Frame");
    await page.getByRole("tab", { name: /^History/ }).click();
    await page.getByRole("tab", { name: /^Presets/ }).click();
    await page.getByRole("tab", { name: /Create QR/ }).click();
    // Reload to exercise SSR hydration of the persisted state.
    await page.reload();
    await expect(page.getByLabel("QR content type")).toBeVisible();
    await page.waitForTimeout(500);
    expectClean(health);
  });
});

test.describe("V3 routes return expected HTTP responses", () => {
  const routes = [
    "/",
    "/tools/qr-generator",
    "/qr",
    "/category/qr-barcode",
    "/saved",
    "/about",
    "/help",
    "/privacy",
    "/terms",
    "/contact",
    "/cookies",
    "/sitemap",
  ];
  for (const route of routes) {
    test(`GET ${route} → 200`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `${route} status`).toBe(200);
    });
  }
});
