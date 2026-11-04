import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("scientific functions, keyboard answer and restore", async ({ page }) => {
  await page.goto("/tools/scientific-calculator");
  const input = page.getByLabel("Expression");
  await input.fill("nCr(5,2)");
  await input.press("Enter");
  await expect(page.locator("output")).toHaveText("10");
  await input.fill("ans+2");
  await expect(page.locator("output")).toHaveText("12");
  await input.press("Enter");
  await page.getByRole("button", { name: "Restore" }).last().click();
  await expect(input).toHaveValue("nCr(5,2)");
  await page.getByText("More functions").click();
  await page.getByRole("button", { name: "Backspace" }).click();
  await expect(input).toHaveValue("nCr(5,2");
});
test("date holiday and calendar shifts", async ({ page }) => {
  await page.goto("/tools/date-difference-calculator");
  await page.getByLabel("Start date").fill("2024-03-01");
  await page.getByLabel("End date", { exact: true }).fill("2024-03-05");
  await page.getByText("Holiday exclusions").click();
  await page.getByLabel("Holiday dates", { exact: false }).fill("2024-03-04");
  await expect(page.getByText(/1 business days/)).toBeVisible();
  await page.getByLabel("Add or subtract duration", { exact: false }).fill("1");
  await page.getByLabel("Duration unit").selectOption("months");
  await expect(page.getByText(/Shifted date: 2024-04-01/)).toBeVisible();
});
test("conversion comparison and session restore", async ({ page }) => {
  await page.goto("/tools/unit-converter");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Force");
  await page.getByLabel("Value", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Save conversion", exact: true })
    .click();
  await page.getByText("Advanced conversion settings").click();
  await page.getByLabel("Show all target units").check();
  await expect(
    page.getByText("4.448221615 Newton", { exact: false }),
  ).toHaveCount(0);
  await page.getByLabel("Value", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByLabel("Value", { exact: true })).toHaveValue("1");
});
test("loan prepayment and CSV download", async ({ page }) => {
  await page.goto("/tools/emi-calculator");
  await page.getByLabel("Principal (₹)", { exact: true }).fill("1200");
  await page.getByLabel("Annual interest rate (%)").fill("0");
  await page.getByLabel("Tenure (months)", { exact: true }).fill("12");
  await page.getByText("One-time prepayment").click();
  await page.getByLabel("Extra amount (₹)").fill("500");
  await page.getByLabel("Payment month").fill("2");
  await expect(page.getByText(/Paid off in 7 months/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download schedule CSV" }).click();
  expect((await download).suggestedFilename()).toBe("amortization.csv");
});
test("BMI target and discount currency", async ({ page }) => {
  await page.goto("/tools/bmi-calculator");
  await page.getByLabel("Height (cm)").fill("170");
  await page.getByLabel("Weight (kg)", { exact: true }).fill("65");
  await page.getByLabel("Age group").selectOption("adult");
  await page.getByText("Target BMI", { exact: true }).click();
  await page.getByLabel("Target BMI (optional)").fill("22");
  await expect(page.getByText(/Weight at target BMI: 63.58 kg/)).toBeVisible();
  await page.goto("/tools/discount-calculator");
  await page.getByLabel("Price (INR)").fill("100");
  await page
    .getByRole("textbox", { name: "Discounts (%) — comma separated" })
    .fill("10");
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("USD");
  await expect(page.locator("output")).toContainText("$90");
});
for (const slug of [
  "scientific-calculator",
  "unit-converter",
  "temperature-converter",
  "time-converter",
  "age-calculator",
  "date-difference-calculator",
  "emi-calculator",
  "loan-calculator",
  "bmi-calculator",
  "discount-calculator",
]) {
  test(`${slug} V2 responsive and axe`, async ({ page }) => {
    for (const width of [375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/tools/${slug}`);
      if (slug === "scientific-calculator")
        await page.getByText("More functions").click();
      if (
        ["unit-converter", "temperature-converter", "time-converter"].includes(
          slug,
        )
      )
        await page.getByText("Advanced conversion settings").click();
      if (slug === "date-difference-calculator")
        await page.getByText("Holiday exclusions").click();
      if (slug === "age-calculator")
        await page.getByText("Compare another person").click();
      if (["loan-calculator", "emi-calculator"].includes(slug))
        await page.getByText("One-time prepayment").click();
      if (slug === "bmi-calculator") {
        await page.getByLabel("Age group").selectOption("adult");
        await page.getByText("Target BMI", { exact: true }).click();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: `docs/phase-9-v2-screenshots/${slug}-${width}.png`,
          fullPage: true,
        });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
