import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`laptop preserves its server DOM during delayed hydration and reload at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const hydrationErrors: string[] = [];
    page.on("pageerror", (error) => hydrationErrors.push(error.message));
    page.on("console", (message) => {
      if (
        /hydration|hydrated|didn't match|server rendered HTML/i.test(
          message.text(),
        )
      ) {
        hydrationErrors.push(message.text());
      }
    });

    let releaseScripts!: () => void;
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async (route) => {
      await scriptsReady;
      await route.continue();
    });
    await page.goto("/", { waitUntil: "commit" });
    const laptop = page.locator("[data-finish-phase]");
    await expect(laptop).toBeVisible();
    await expect(laptop).toHaveAttribute("data-laptop-body", "studio-v2");
    await expect(
      page.locator('[data-colour-controls="studio-v2"]'),
    ).toHaveCount(1);
    await expect(laptop).toHaveAttribute("data-finish-running", "false");
    await expect(laptop.locator('[class*="_tint"]')).toHaveCount(1);
    await expect(laptop.locator('[class*="_reflection"]')).toHaveCount(1);
    await expect(
      laptop.getByRole("group", { name: "Laptop colour rotation" }),
    ).toHaveCount(0);
    await page.evaluate(() => {
      const root = document.querySelector("[data-finish-phase]")!;
      // A React recovery replaces this node. Hydration must reuse it instead.
      (window as Window & { ssrLaptop?: Element }).ssrLaptop = root;
    });
    releaseScripts();
    await expect(page.locator("#tool-search")).toBeEnabled();
    await expect(laptop).toHaveAttribute("data-finish-running", "true");
    expect(
      await page.evaluate(
        () =>
          (window as Window & { ssrLaptop?: Element }).ssrLaptop ===
          document.querySelector("[data-finish-phase]"),
      ),
    ).toBe(true);
    await expect(page.getByRole("timer")).toHaveCount(0);

    await page.reload();
    await expect(page.locator("#tool-search")).toBeEnabled();
    await expect(laptop).toHaveAttribute("data-finish-running", "true");
    await page
      .getByRole("link", { name: "Explore All Tools", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tools$/);
    await page.goBack();
    await expect(page.locator("#tool-search")).toBeEnabled();
    await expect(laptop.locator('[class*="_reflection"]')).toHaveCount(1);
    expect(hydrationErrors).toEqual([]);
  });
}
