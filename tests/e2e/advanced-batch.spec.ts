import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("discount profit margin and markup, losses and reset", async ({
  page,
}) => {
  await page.goto("/tools/discount-calculator");
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Profit, margin & markup" }),
  });
  await box.getByLabel("Cost price").fill("80");
  await box.getByLabel("Selling price before tax").fill("100");
  await expect(
    box.getByText("Profit: 20; margin: 20%; markup: 25%."),
  ).toBeVisible();
  await box.getByLabel("Selling price before tax").fill("0");
  await expect(box.getByText(/undefined \(zero selling price\)/)).toBeVisible();
  await box.getByRole("button", { name: "Reset profit analysis" }).click();
  await expect(box.getByLabel("Cost price")).toHaveValue("");
});
test("unit category temperature and Rankine", async ({ page }) => {
  await page.goto("/tools/unit-converter");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Temperature");
  await page.getByLabel("Value", { exact: true }).fill("0");
  await page
    .getByRole("combobox", { name: "To", exact: true })
    .selectOption("Rankine");
  await expect(page.locator("output")).toHaveText("491.67 Rankine");
  await page.goto("/tools/temperature-converter");
  await page.getByLabel("Value", { exact: true }).fill("0");
  await page
    .getByRole("combobox", { name: "From", exact: true })
    .selectOption("Rankine");
  await page
    .getByRole("combobox", { name: "To", exact: true })
    .selectOption("Celsius");
  await expect(page.locator("output")).toHaveText("-273.15 Celsius");
});
test("loan affordability and LTV", async ({ page }) => {
  await page.goto("/tools/loan-calculator");
  await page.getByLabel("Annual interest rate (%)").fill("0");
  await page.getByLabel("Tenure (months)", { exact: true }).fill("12");
  await page
    .locator("summary")
    .filter({ hasText: "Down payment & affordability estimate" })
    .click();
  await page.getByLabel("Purchase price (₹)").fill("1000000");
  await page.getByLabel("Down payment (₹)").fill("200000");
  await page.getByLabel("Monthly gross income (₹)").fill("100000");
  await page.getByLabel("Existing monthly debt payments (₹)").fill("10000");
  await expect(page.getByText(/Loan-to-value ratio: 80.00%/)).toBeVisible();
  await expect(
    page.getByText(/maximum affordable loan: ₹3,12,000.00/),
  ).toBeVisible();
});
test("calculator category searches and filters catalog and fits", async ({
  page,
}) => {
  await page.goto("/category/calculators");
  await expect(page.getByText("Showing 12 of 12 calculators")).toBeVisible();
  await page.getByLabel("Calculator type").selectOption("financial");
  await expect(page.getByText("Showing 4 of 12 calculators")).toBeVisible();
  await page.getByLabel("Search calculators").fill("gst");
  await expect(page.getByText("Showing 1 of 12 calculators")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "GST Calculator" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
// Search and the type picker used to exist on the Calculators page only.
for (const category of [
  {
    path: "/category/pdf-tools",
    noun: "PDF tools",
    typeLabel: "PDF tool type",
    total: 9,
    type: "convert",
    typeCount: 4,
    search: "word to pdf",
    link: "Word to PDF Converter",
  },
  {
    path: "/category/image-tools",
    noun: "image tools",
    typeLabel: "Image tool type",
    total: 4,
    type: "size",
    typeCount: 2,
    search: "crop",
    link: "Image Cropper",
  },
  {
    path: "/category/qr-barcode",
    noun: "QR and barcode tools",
    typeLabel: "Code tool type",
    total: 9,
    type: "qr",
    typeCount: 2,
    search: "scanner",
    link: "QR Code Scanner",
  },
  {
    path: "/category/text-writing",
    noun: "text tools",
    typeLabel: "Text tool type",
    total: 3,
    type: "write",
    typeCount: 2,
    search: "case",
    link: "Case Converter",
  },
  {
    path: "/category/developer-tools",
    noun: "developer tools",
    typeLabel: "Developer tool type",
    total: 11,
    type: "minify",
    typeCount: 2,
    search: "css",
    link: "CSS Minifier",
  },
  {
    path: "/category/security-privacy",
    noun: "security tools",
    typeLabel: "Security tool type",
    total: 9,
    type: "secrets",
    typeCount: 4,
    search: "password",
    link: "Password Generator",
  },
]) {
  test(`${category.path} searches, filters by type and fits a phone`, async ({
    page,
  }) => {
    await page.goto(category.path);
    const status = page.locator(".category-filter-status");
    await expect(status).toHaveText(
      `Showing ${category.total} of ${category.total} ${category.noun}`,
    );
    await page.getByLabel(category.typeLabel).selectOption(category.type);
    await expect(status).toHaveText(
      `Showing ${category.typeCount} of ${category.total} ${category.noun}`,
    );
    await expect(page.locator(".category-tools .tool-card")).toHaveCount(
      category.typeCount,
    );
    await page.getByLabel(`Search ${category.noun}`).fill(category.search);
    await expect(
      page.getByRole("link", { name: category.link, exact: true }),
    ).toBeVisible();
    // Nothing matches: the page says so and one press brings every tool back.
    await page.getByLabel(`Search ${category.noun}`).fill("zzzz-no-such-tool");
    await expect(status).toHaveText(
      `Showing 0 of ${category.total} ${category.noun}`,
    );
    await page
      .getByRole("button", { name: `Show all ${category.noun}` })
      .click();
    await expect(page.locator(".category-tools .tool-card")).toHaveCount(
      category.total,
    );
    await page.setViewportSize({ width: 375, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
