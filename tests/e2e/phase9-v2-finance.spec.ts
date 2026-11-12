import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
async function percentage(page: Page) {
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Compare & build changes" }),
  });
  await box.getByLabel("Starting value").fill("100");
  await box.getByLabel("Changes (%) — comma separated").fill("10, -20");
  await expect(box.getByText("Final value: 88", { exact: true })).toBeVisible();
  return box;
}
async function invoice(page: Page) {
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Multi-item GST estimate" }),
  });
  await box.getByLabel("Unit price (₹)").first().fill("1000");
  await expect(box.getByText("Invoice total: ₹1,180.00")).toBeVisible();
  return box;
}
async function discount(page: Page) {
  const box = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Buy X, get Y free" }) });
  await box.getByLabel("Unit price").fill("100");
  await box.getByLabel("Total items taken").fill("8");
  await box.getByLabel("Buy (paid items per group)").fill("2");
  await box.getByLabel("Get (free items per group)").fill("1");
  await expect(box.getByText("Total: ₹600.00", { exact: true })).toBeVisible();
  return box;
}
test("advanced percentage modes, restore and CSV", async ({ page }) => {
  await page.goto("/tools/percentage-calculator");
  const box = await percentage(page);
  await box.getByRole("button", { name: "Save calculation" }).click();
  await box.getByLabel("Advanced mode").selectOption("compare");
  await box.getByLabel("Starting value").fill("100");
  await box.getByLabel("Further values — comma separated").fill("120,90");
  await expect(box.getByText("120 → 90: -25% change")).toBeVisible();
  await box.getByRole("button", { name: "Restore" }).click();
  await expect(box.getByText("Final value: 88", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toBe(
    "percentage-calculation.csv",
  );
  await box.getByLabel("Advanced mode").selectOption("discount");
  await box.getByLabel("Discounted value").fill("80");
  await box.getByLabel("Discount (%)", { exact: true }).fill("20");
  await expect(box.getByText("Original value: 100")).toBeVisible();
});
test("GST multi-item invoice modes, discount and export", async ({ page }) => {
  await page.goto("/tools/gst-calculator");
  const box = await invoice(page);
  await box.getByLabel("Discount before GST (%)").first().fill("10");
  await expect(box.getByText("Invoice total: ₹1,062.00")).toBeVisible();
  await box.getByRole("button", { name: "Add item" }).click();
  await box.getByLabel("Unit price (₹)").nth(1).fill("100");
  await box.getByLabel("Common GST rate").nth(1).selectOption("5");
  await expect(box.getByText("Invoice total: ₹1,167.00")).toBeVisible();
  await box.getByLabel("Supply type").selectOption("inter");
  await expect(box.getByText(/IGST ₹167.00/)).toBeVisible();
  await box.getByLabel("Item name (optional)").first().fill("=1+1");
  const download = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download invoice CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("gst-invoice-estimate.csv");
  const contents = await readFile(await file.path(), "utf8");
  expect(contents).toContain('"\'=1+1"');
  expect(contents).toContain('"IGST"');
  await box.getByRole("button", { name: "Remove item 2" }).click();
  await box.getByLabel("Price basis").selectOption("inclusive");
  await expect(box.getByText("Invoice total: ₹900.00")).toBeVisible();
});
test("buy-get offer, CSV and BMI restore", async ({ page }) => {
  await page.goto("/tools/discount-calculator");
  const box = await discount(page);
  await box.getByLabel("Tax after discount (%)").fill("10");
  await expect(box.getByText("Total: ₹660.00", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download offer CSV" }).click();
  expect((await download).suggestedFilename()).toBe("discount-offer.csv");
  await page.goto("/tools/bmi-calculator");
  const basic = page.getByRole("region", { name: "Calculator workspace" });
  await basic.getByLabel("Height (cm)").fill("170");
  await basic.getByLabel("Weight (kg)", { exact: true }).fill("65");
  await basic.getByRole("button", { name: "Save to history" }).click();
  await basic.getByLabel("Weight (kg)", { exact: true }).fill("80");
  await basic.getByRole("button", { name: "Restore" }).click();
  await expect(basic.getByLabel("Weight (kg)", { exact: true })).toHaveValue(
    "65",
  );
});
for (const item of [
  { slug: "percentage-calculator", fill: percentage },
  { slug: "gst-calculator", fill: invoice },
  { slug: "discount-calculator", fill: discount },
])
  test(`${item.slug}: populated advanced views responsive and axe`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/tools/${item.slug}`);
      await item.fill(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: `docs/phase-9-v2-screenshots/${item.slug}-populated-${width}.png`,
          fullPage: true,
        });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });

test("loan down payment and affordability workflow", async ({ page }) => {
  await page.goto("/tools/loan-calculator");
  await page
    .locator("summary")
    .filter({ hasText: "Down payment & affordability estimate" })
    .click();
  await page.getByLabel("Purchase price (₹)").fill("1000000");
  await page.getByLabel("Down payment (₹)").fill("200000");
  await page.getByLabel("Monthly gross income (₹)").fill("100000");
  await page.getByLabel("Existing monthly debt payments (₹)").fill("10000");
  await expect(
    page.getByText(/Remaining for this loan: ₹26,000.00/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use as principal" }).click();
  await expect(page.getByLabel("Principal (₹)", { exact: true })).toHaveValue(
    "800000",
  );
});
