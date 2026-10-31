import { test, expect } from "@playwright/test";
test("search, category filters, clear and empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".tool-card")).toHaveCount(6);
  await page.getByRole("searchbox").fill("json");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(page.getByText("No tools found")).toBeVisible();
  await page.getByRole("button", { name: "Clear search & filters" }).click();
  await expect(page.locator(".tool-card")).toHaveCount(6);
  await page.getByRole("searchbox").fill("crypto");
  await page.getByRole("searchbox").press("Escape");
  await expect(page.locator(".tool-card")).toHaveCount(6);
  await page.getByRole("searchbox").fill("json");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(6);
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

test("tool directory page lists and filters every tool", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".tool-card")).toHaveCount(6);
  await page.getByRole("searchbox").fill("image");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await expect(page.locator(".tool-card").first()).toHaveAttribute(
    "href",
    "/tools/image-compressor",
  );
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".tool-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Security", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(1);
});

test("desktop tools menu opens, closes on Escape and navigates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Tools", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const menu = page.locator("#tools-menu");
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.getByRole("link", { name: /JSON Formatter/ }).click();
  await expect(page).toHaveURL(/\/tools\/json-formatter$/);
  await expect(page.locator("h1")).toHaveText("JSON Formatter");
});

test("home hero calls to action reach the catalog and directory", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Small tasks. Quick solutions.",
    }),
  ).toBeVisible();

  const hero = page.locator("section:has(#hero-title)");
  await hero.getByRole("link", { name: "View all tools", exact: true }).click();
  await expect(page).toHaveURL(/\/tools$/);

  await page.goBack();
  await hero.getByRole("link", { name: "Explore tools", exact: true }).click();
  await expect(page).toHaveURL(/#tools$/);
});
