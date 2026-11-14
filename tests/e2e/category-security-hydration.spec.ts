import { expect, test } from "@playwright/test";
import { securityGroups } from "../../lib/tools/security/consolidation";

test("homepage, category page, navigation and explorer agree after hydration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match|hydrated/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto("/");
  const card = page.locator(
    'a.category-card[href="/category/security-privacy"]',
  );
  await expect(card.locator(".category-count")).toHaveText("9 tools");
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  await expect(
    page.locator(
      '#header-categories-panel a[href="/category/security-privacy"]',
    ),
  ).toBeVisible();
  await card.click();
  await expect(page.locator("main")).toContainText("9 tools");
  await page.goto("/tools?category=security-privacy");
  await expect(page.getByRole("status")).toContainText("9 tools found");
  expect(errors).toEqual([]);
});

test("all unique security category routes render in Chromium", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const routes = securityGroups.map((x) => x.slug);
  expect(new Set(routes).size).toBe(9);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  for (const slug of routes) {
    const response = await page.goto(`/tools/${slug}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), slug).toBe(200);
    await expect(page.locator("main h1"), slug).toBeVisible();
  }
  expect(errors).toEqual([]);
});
