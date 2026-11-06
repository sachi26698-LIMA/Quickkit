import { test, expect } from "@playwright/test";
import { tools } from "../../lib/catalog";
test("search, category filters, clear and empty state", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.locator(".tool-card")).toHaveCount(tools.length);
  await page.getByRole("searchbox").fill("json");
  await expect(page.locator(".tool-card")).toHaveCount(3);
  await expect(page.locator(".tool-card").first()).toContainText(
    "JSON Formatter",
  );
  await expect(page.locator(".tool-card").nth(1)).toContainText(
    "JSON Validator",
  );
  await expect(page.locator(".tool-card").nth(2)).toContainText(
    "QR Code Scanner",
  );
  await page
    .getByRole("button", { name: "Text & Writing", exact: true })
    .click();
  await expect(page.getByText("No tools found")).toBeVisible();
  await page.getByRole("button", { name: "Clear search & filters" }).click();
  await expect(page.locator(".tool-card")).toHaveCount(tools.length);
  await page.getByRole("searchbox").fill("crypto");
  await page.getByRole("searchbox").press("Escape");
  await expect(page.locator(".tool-card")).toHaveCount(tools.length);
  await page.getByRole("searchbox").fill("json");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(tools.length);
});
test("hero search suggests tools and opens results in All Tools", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", {
    name: "Search tools",
    exact: true,
  });
  await search.fill("json");
  await expect(
    page.locator(".search-result", { hasText: "JSON Formatter" }),
  ).toBeVisible();
  await search.press("Enter");
  await expect(page).toHaveURL(/\/tools\?q=json$/);
  await expect(page.locator(".tool-card")).toHaveCount(3);
  await expect(page.locator(".tool-card").first()).toContainText(
    "JSON Formatter",
  );
  await expect(page.locator(".tool-card").nth(1)).toContainText(
    "JSON Validator",
  );
  await expect(page.locator(".tool-card").nth(2)).toContainText(
    "QR Code Scanner",
  );
});
test("saving a tool adds it to the Saved page", async ({ page }) => {
  await page.goto("/tools");
  await page.getByRole("button", { name: "Save Word Counter" }).click();
  await page.getByRole("link", { name: /^Saved tools \(1\)/ }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Remove Word Counter from saved tools" })
    .click();
  await expect(page.getByText("No saved tools yet")).toBeVisible();
});
for (const width of [320, 375, 390, 430, 768, 1366, 1440])
  test(`responsive shell ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
test("keyboard skip link and navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
