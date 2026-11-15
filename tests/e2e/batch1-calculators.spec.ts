import { test, expect } from "./helpers/tool-test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import AxeBuilder from "@axe-core/playwright";
test("percentage sequential steps export PDF", async ({ page }) => {
  await page.goto("/tools/percentage-calculator");
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Compare & build changes" }),
  });
  await box.getByLabel("Starting value").fill("100");
  await box.getByLabel("Changes (%) — comma separated").fill("10,-20");
  await expect(box.getByText("Final value: 88", { exact: true })).toBeVisible();
  const event = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download percentage PDF" }).click();
  const dl = await event;
  expect(dl.suggestedFilename()).toBe("percentage-calculation.pdf");
  expect(
    (await PDFDocument.load(await readFile(await dl.path()))).getPageCount(),
  ).toBe(1);
});
test("BMI comparison supports individual age groups and safe CSV", async ({
  page,
}) => {
  await page.goto("/tools/bmi-calculator");
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Compare BMI calculations" }),
  });
  await box.getByLabel("Person 1 height in centimeters").fill("170");
  await box.getByLabel("Person 1 weight in kilograms").fill("65");
  await box.getByLabel("Person 1 age interpretation").selectOption("adult");
  await box.getByLabel("Person 2 height in centimeters").fill("150");
  await box.getByLabel("Person 2 weight in kilograms").fill("45");
  await box.getByLabel("Person 2 age interpretation").selectOption("minor");
  await expect(
    box.getByText(/BMI: 22.49 - Healthy weight \(adult\)/),
  ).toBeVisible();
  await expect(
    box.getByText(/BMI: 20 - adult categories not applied/),
  ).toBeVisible();
  const event = page.waitForEvent("download");
  await box
    .getByRole("button", { name: "Download BMI comparison CSV" })
    .click();
  expect(await readFile(await (await event).path(), "utf8")).toContain(
    "2,20,No adult category",
  );
  await page.setViewportSize({ width: 375, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
