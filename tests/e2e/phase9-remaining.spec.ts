import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const cases: {
  slug: string;
  fill: (p: Page) => Promise<void>;
  expected: string;
}[] = [
  {
    slug: "age-calculator",
    fill: async (p) => {
      await p.getByLabel("Date of birth", { exact: true }).fill("2000-02-29");
      await p.getByLabel("Age on date").fill("2023-02-28");
    },
    expected: "23 years",
  },
  {
    slug: "date-difference-calculator",
    fill: async (p) => {
      await p.getByLabel("Start date").fill("2024-02-28");
      await p.getByLabel("End date", { exact: true }).fill("2024-03-01");
    },
    expected: "2 days",
  },
  ...["emi-calculator", "loan-calculator"].map((slug) => ({
    slug,
    fill: async (p: Page) => {
      await p.getByLabel("Principal (₹)", { exact: true }).fill("100000");
      await p.getByLabel("Annual interest rate (%)").fill("12");
      await p.getByLabel("Tenure (months)", { exact: true }).fill("12");
    },
    expected: "8,884.88",
  })),
  {
    slug: "scientific-calculator",
    fill: async (p) => {
      await p.getByLabel("Expression").fill("sin(30)+2^3");
    },
    expected: "8.5",
  },
  {
    slug: "unit-converter",
    fill: async (p) => {
      await p.getByLabel("Value", { exact: true }).fill("1000");
    },
    expected: "1 Kilometre",
  },
  {
    slug: "temperature-converter",
    fill: async (p) => {
      await p.getByLabel("Value", { exact: true }).fill("0");
    },
    expected: "32 Fahrenheit",
  },
  {
    slug: "time-converter",
    fill: async (p) => {
      await p.getByLabel("Value", { exact: true }).fill("2");
    },
    expected: "120 Minute",
  },
];
for (const item of cases)
  test(`${item.slug}: responsive calculation and accessibility`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 768, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/tools/${item.slug}`);
      await item.fill(page);
      await expect(page.locator("output")).toContainText(item.expected);
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
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
