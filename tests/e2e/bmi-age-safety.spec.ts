import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("BMI shows adult categories only when age 20+ is confirmed", async ({
  page,
}) => {
  await page.goto("/tools/bmi-calculator");
  await page.getByLabel("Height (cm)").fill("170");
  await page.getByLabel("Weight (kg)", { exact: true }).fill("65");
  await expect(page.locator("output")).toHaveText("22.4913");
  await page.getByLabel("Age group").selectOption("minor");
  await expect(page.locator("output")).toHaveText("22.4913");
  await expect(
    page
      .getByRole("region", { name: "Calculator workspace" })
      .getByText(/age- and sex-specific growth charts/),
  ).toBeVisible();
  await expect(page.getByText("Target BMI", { exact: true })).toHaveCount(0);
  await page.getByLabel("Age group").selectOption("adult");
  await expect(page.locator("output")).toHaveText("22.4913 · Healthy weight");
  await page.getByRole("button", { name: "Save to history" }).click();
  await page.getByLabel("Age group").selectOption("minor");
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByLabel("Age group")).toHaveValue("adult");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
