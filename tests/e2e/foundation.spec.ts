import { test, expect } from "@playwright/test";
test("search, category filters, clear and empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".tool-card")).toHaveCount(9);
  await page.getByRole("searchbox").fill("json");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(page.getByText("No tools found")).toBeVisible();
  await page.getByRole("button", { name: "Clear search & filters" }).click();
  await expect(page.locator(".tool-card")).toHaveCount(9);
  await page.getByRole("searchbox").fill("crypto");
  await page.getByRole("searchbox").press("Escape");
  await expect(page.locator(".tool-card")).toHaveCount(9);
  await page.getByRole("searchbox").fill("json");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(9);
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
