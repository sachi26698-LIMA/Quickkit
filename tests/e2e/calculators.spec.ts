import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const cases = [
  { slug: "percentage-calculator", first: "20", second: "150", result: "30" },
  { slug: "bmi-calculator", first: "170", second: "65", result: "22.4913" },
  {
    slug: "discount-calculator",
    first: "1000",
    second: "10, 20",
    result: "720",
  },
  { slug: "gst-calculator", first: "1000", second: "18", result: "1,180" },
];
for (const item of cases) {
  test(`${item.slug} responds and fits on desktop and mobile`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 768, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/tools/${item.slug}`);
      const workspace = page.getByRole("region", {
        name: "Calculator workspace",
      });
      const inputs = workspace.locator('input:not([type="checkbox"])');
      await inputs.nth(0).fill(item.first);
      await inputs.nth(1).fill(item.second);
      await expect(workspace.locator("output")).toContainText(item.result);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 1440 || width === 375)
        await page.screenshot({
          path: `docs/phase-9-screenshots/${item.slug}-${width}.png`,
          fullPage: true,
        });
    }
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
