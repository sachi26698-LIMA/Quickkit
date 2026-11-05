import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("meeting planner rejects DST gaps and chooses repeated instant", async ({
  page,
}) => {
  await page.goto("/tools/time-converter");
  const box = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Compare time zones" }) });
  await box.getByLabel("Source IANA time zone").fill("America/New_York");
  await box
    .getByLabel("Destination IANA time zones (comma separated)")
    .fill("Asia/Kolkata, Europe/London");
  await box.getByLabel("Meeting local date and time").fill("2024-03-10T02:30");
  await expect(box.getByText(/does not exist/)).toBeVisible();
  await box.getByLabel("Meeting local date and time").fill("2024-11-03T01:30");
  await expect(box.getByText(/occurs twice/)).toBeVisible();
  await box.getByLabel("Repeated time occurrence").selectOption("later");
  await expect(box.getByText(/2024-11-03T06:30:00.000Z/)).toBeVisible();
  await expect(box.getByText(/03 Nov 2024, 12:00/)).toBeVisible();
  const dl = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download meeting CSV" }).click();
  expect((await dl).suggestedFilename()).toBe("meeting-times.csv");
  await page.setViewportSize({ width: 375, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
