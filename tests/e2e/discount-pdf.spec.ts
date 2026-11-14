import { test, expect } from "./helpers/tool-test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
test("download the actual discount calculation as a local PDF", async ({
  page,
}) => {
  await page.goto("/tools/discount-calculator");
  const basic = page.getByRole("region", { name: "Calculator workspace" });
  await basic.getByLabel("Price (INR)").fill("1250");
  await basic.getByLabel("Discounts (%) — comma separated").fill("12,7.5");
  await basic.getByLabel("Tax after discount (%)").fill("18");
  await expect(basic.locator("output")).toHaveText("₹1,200.65");
  const pending = page.waitForEvent("download");
  await basic.getByRole("button", { name: "Download discount PDF" }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("discount-calculation.pdf");
  const data = await readFile(await file.path());
  expect((await PDFDocument.load(data)).getPageCount()).toBeGreaterThan(0);
  await expect(basic.getByText("PDF downloaded.")).toBeVisible();
});
