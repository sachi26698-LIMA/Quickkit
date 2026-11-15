import { test, expect } from "./helpers/tool-test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
for (const slug of ["emi-calculator", "loan-calculator"])
  test(`${slug} amortization PDF`, async ({ page }) => {
    await page.goto(`/tools/${slug}`);
    await page.getByLabel("Principal (₹)", { exact: true }).fill("1200");
    await page.getByLabel("Annual interest rate (%)").fill("0");
    await page.getByLabel("Tenure (months)", { exact: true }).fill("12");
    await expect(page.locator("output")).toContainText("100.00");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download schedule PDF" }).click();
    const file = await pending;
    expect(file.suggestedFilename()).toBe("amortization.pdf");
    expect(
      (
        await PDFDocument.load(await readFile(await file.path()))
      ).getPageCount(),
    ).toBeGreaterThan(0);
  });
test("scientific export history", async ({ page }) => {
  await page.goto("/tools/scientific-calculator");
  await page.getByLabel("Expression").fill("nCr(5,2)");
  await page.getByLabel("Expression").press("Enter");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download expression history CSV" })
    .click();
  const text = await readFile(await (await pending).path(), "utf8");
  expect(text).toContain("nCr(5,2)");
  expect(text).toContain("10");
});
for (const slug of [
  "unit-converter",
  "temperature-converter",
  "time-converter",
])
  test(`${slug} comparison CSV and restorable precision`, async ({ page }) => {
    await page.goto(`/tools/${slug}`);
    await page.getByLabel("Value", { exact: true }).fill("2");
    await page
      .locator("summary")
      .filter({ hasText: "Advanced conversion settings" })
      .click();
    await page.getByLabel("Precision (significant digits)").selectOption("4");
    await page.getByLabel("Show all target units").check();
    await page
      .getByRole("button", { name: "Save conversion", exact: true })
      .click();
    await page.getByLabel("Precision (significant digits)").selectOption("15");
    await page.getByRole("button", { name: "Favorite conversion 1" }).click();
    await expect(
      page.getByRole("button", { name: "Unfavorite conversion 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    await expect(page.getByLabel("Precision (significant digits)")).toHaveValue(
      "4",
    );
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download comparison CSV" }).click();
    expect(await readFile(await (await pending).path(), "utf8")).toContain(
      "Result",
    );
  });
