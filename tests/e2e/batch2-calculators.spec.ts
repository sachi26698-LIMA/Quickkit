import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
test("GST invoice local PDF and unsupported name warning", async ({ page }) => {
  await page.goto("/tools/gst-calculator");
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Multi-item GST estimate" }),
  });
  await box.getByLabel("Unit price (₹)").first().fill("1000");
  await expect(box.getByText("Invoice total: ₹1,180.00")).toBeVisible();
  const dl = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download invoice PDF" }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe("gst-invoice-estimate.pdf");
  expect(
    (await PDFDocument.load(await readFile(await file.path()))).getPageCount(),
  ).toBe(1);
  await box.getByLabel("Item name (optional)").first().fill("ચા");
  await box.getByRole("button", { name: "Download invoice PDF" }).click();
  await expect(
    box.getByText(/PDF item names must use basic Latin/),
  ).toBeVisible();
});
test("age zodiac is optional and restored; result CSV", async ({ page }) => {
  await page.goto("/tools/age-calculator");
  const box = page.getByRole("region", { name: "Calculator workspace" });
  await box.getByLabel("Date of birth", { exact: true }).fill("2000-02-29");
  await box.getByLabel("Age on date").fill("2023-02-28");
  await expect(box.getByText(/Zodiac by conventional/)).toHaveCount(0);
  await box.getByLabel("Show zodiac date range", { exact: false }).check();
  await expect(box.getByText(/Pisces \(entertainment only\)/)).toBeVisible();
  await box.getByRole("button", { name: "Save to history" }).click();
  await box.getByLabel("Show zodiac date range", { exact: false }).uncheck();
  await box.getByRole("button", { name: "Restore" }).click();
  await expect(
    box.getByLabel("Show zodiac date range", { exact: false }),
  ).toBeChecked();
  const dl = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download result CSV" }).click();
  expect(await readFile(await (await dl).path(), "utf8")).toContain(
    "2000-02-29",
  );
});
test("date difference exports selected interval and holidays", async ({
  page,
}) => {
  await page.goto("/tools/date-difference-calculator");
  const box = page.getByRole("region", { name: "Calculator workspace" });
  await box.getByLabel("Start date").fill("2024-03-01");
  await box.getByLabel("End date", { exact: true }).fill("2024-03-05");
  await box.getByText("Holiday exclusions").click();
  await box.getByLabel("Holiday dates", { exact: false }).fill("2024-03-04");
  await expect(box.getByText(/1 business days/)).toBeVisible();
  const dl = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download result CSV" }).click();
  const text = await readFile(await (await dl).path(), "utf8");
  expect(text).toContain("2024-03-05");
  expect(text).toContain("1 business days");
});
