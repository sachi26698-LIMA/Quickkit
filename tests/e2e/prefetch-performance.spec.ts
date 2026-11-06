import { test, expect } from "@playwright/test";

// These checks exercise a production build: Next disables automatic prefetch
// in development. Downloads are recorded only until the user chooses a link.
for (const route of [
  "/tools/merge-pdf",
  "/category/pdf-tools",
  "/about",
  "/privacy",
]) {
  test(`${route} does not prefetch the homepage artwork`, async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto(route, { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    expect(
      requested.some((url) =>
        new URL(url).pathname.endsWith("/hero-laptop-reference.webp"),
      ),
    ).toBe(false);

    // Suppressing speculation must not suppress the actual navigation.
    await page.getByRole("link", { name: "QUICKKIT home" }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.locator('img[src="/hero-laptop-reference.webp"]'),
    ).toBeVisible();
  });
}

test("popular tools wait for user navigation rather than prefetching", async ({
  page,
}) => {
  const toolPaths = new Set([
    "/tools/merge-pdf",
    "/tools/pdf-lock-unlock",
    "/tools/image-compressor",
    "/tools/qr-generator",
    "/tools/word-counter",
  ]);
  const prefetched: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (toolPaths.has(url.pathname) && url.searchParams.has("_rsc")) {
      prefetched.push(url.pathname);
    }
  });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  expect(prefetched).toEqual([]);

  await page.locator('.popular-chip[href="/tools/merge-pdf"]').click();
  await expect(page).toHaveURL(/\/tools\/merge-pdf$/);
  await expect(
    page.getByRole("heading", { name: "PDF Merger", level: 1 }),
  ).toBeVisible();
});

test("popular and home links work by keyboard on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const tool = page.locator('.popular-chip[href="/tools/merge-pdf"]');
  await tool.focus();
  await expect(tool).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/tools\/merge-pdf$/);
  const home = page.getByRole("link", { name: "QUICKKIT home" }).first();
  await home.focus();
  await expect(home).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
});
