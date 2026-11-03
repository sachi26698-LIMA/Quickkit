import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ timezoneId: "America/New_York" });
async function offer(page: Page) {
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Compare discount offers" }),
  });
  await box.getByLabel("Original price").fill("100");
  await box.getByLabel("Discount rates (%) — comma separated").fill("10,20");
  await box.getByLabel("Tax rate (%)").fill("10");
  await expect(box.getByText("20%: ₹88.00")).toBeVisible();
  return box;
}
async function loan(page: Page) {
  const box = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Variable rate & payment frequency",
    }),
  });
  await box.getByLabel("Scenario principal (₹)").fill("1200");
  await box.getByLabel("Scenario tenure (months)").fill("12");
  await box.getByLabel("Initial annual rate (%)").fill("0");
  await box
    .getByLabel("Rate changes (payment period:annual rate)")
    .fill("7:12");
  await expect(box.getByText(/Total interest: ₹21.17/)).toBeVisible();
  return box;
}
async function calendar(page: Page) {
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Add calendar durations" }),
  });
  await box.getByLabel("Starting local date and time").fill("2024-01-31T10:30");
  await box.getByLabel("Calendar duration (negative to subtract)").fill("1");
  await expect(box.getByText("2024-02-29 10:30")).toBeVisible();
  return box;
}
test("offer price basis, reverse discount and export", async ({ page }) => {
  await page.goto("/tools/discount-calculator");
  const box = await offer(page);
  await box.getByLabel("Price basis").selectOption("inclusive");
  await box.getByLabel("Original price").fill("110");
  await expect(box.getByText("20%: ₹88.00")).toBeVisible();
  await box.getByText("Find discount percentage").click();
  await box.getByLabel("Final price on same tax basis").fill("88");
  await expect(box.getByText("Discount percentage: 20%")).toBeVisible();
  await box.getByLabel("Final price on same tax basis").fill("120");
  await expect(box.getByText(/final price must be between/)).toBeVisible();
  await expect(box.getByText("20%: ₹88.00")).toBeVisible();
  await box.getByLabel("Final price on same tax basis").fill("88");
  await box.getByLabel("Discount rates (%) — comma separated").fill("0x10,20");
  await expect(box.getByText(/decimal discount rates/)).toBeVisible();
  await box.getByLabel("Discount rates (%) — comma separated").fill("10,20");
  const download = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download comparison CSV" }).click();
  expect((await download).suggestedFilename()).toBe("discount-comparison.csv");
});
test("loan variable and quarterly scenario with schedule export", async ({
  page,
}) => {
  await page.goto("/tools/loan-calculator");
  const box = await loan(page);
  await box.getByText("View scenario schedule").click();
  await expect(box.getByRole("row", { name: /^7 12% ₹103\.53/ })).toBeVisible();
  await box.getByLabel("Rate changes (payment period:annual rate)").fill("");
  await box.getByLabel("Initial annual rate (%)").fill("12");
  await box.getByLabel("Payment frequency").selectOption("4");
  await expect(
    box.getByText(/Initial scheduled payment: ₹322.83/),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download scenario CSV" }).click();
  expect((await download).suggestedFilename()).toBe("loan-scenario.csv");
});
test("calendar month clamp and DST gap", async ({ page }) => {
  await page.goto("/tools/time-converter");
  const box = await calendar(page);
  await box.getByLabel("Starting local date and time").fill("2024-02-10T02:30");
  await expect(
    box.getByText(/does not exist due to a clock change/),
  ).toBeVisible();
});
for (const item of [
  { slug: "discount-calculator", fill: offer },
  { slug: "loan-calculator", fill: loan },
  { slug: "emi-calculator", fill: loan },
  { slug: "time-converter", fill: calendar },
])
  test(`${item.slug} populated scenario responsive and accessible`, async ({
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
      if (width === 375 || width === 1440) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `docs/phase-9-v2-screenshots/${item.slug}-scenario-${width}.png`,
          fullPage: true,
        });
      }
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
