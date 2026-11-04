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
  await page.getByText("Down payment & affordability estimate").click();
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
