import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ timezoneId: "America/New_York" });
test("working hours, CSV and daylight saving gap", async ({ page }) => {
  await page.goto("/tools/time-converter");
  const box = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Timestamp & working hours" }),
    });
  await box.getByLabel("Start timestamp (local)").fill("2024-03-04T10:00");
  await box.getByLabel("End timestamp (local)").fill("2024-03-06T12:00");
  await expect(box.getByText(/Working time: 0 days, 18 hours/)).toBeVisible();
  await box.getByLabel("Tuesday").uncheck();
  await expect(box.getByText(/Working time: 0 days, 10 hours/)).toBeVisible();
  const download = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download working-time CSV" }).click();
  expect((await download).suggestedFilename()).toBe("working-time.csv");
  await box.getByLabel("Start timestamp (local)").fill("2024-03-10T02:30");
  await box.getByLabel("End timestamp (local)").fill("2024-03-10T04:00");
  await expect(
    box.getByText(/does not exist due to a clock change/),
  ).toBeVisible();
});
test("working-time populated responsive view and accessibility", async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tools/time-converter");
    const box = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Timestamp & working hours" }),
      });
    await box.getByLabel("Start timestamp (local)").fill("2024-03-04T10:00");
    await box.getByLabel("End timestamp (local)").fill("2024-03-06T12:00");
    await expect(box.getByText(/18 hours/)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 375 || width === 1440)
      await page.screenshot({
        path: `docs/phase-9-v2-screenshots/time-converter-working-${width}.png`,
        fullPage: true,
      });
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
