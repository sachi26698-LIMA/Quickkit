import { test, expect } from "./helpers/tool-test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
test("discount calculations, validated input and session history controls", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tools/discount-calculator");
  const basic = page.getByRole("region", { name: "Calculator workspace" });
  const price = basic.getByLabel("Price (INR)");
  const rates = basic.getByLabel("Discounts (%) — comma separated");
  await price.fill("1250");
  await rates.fill("12,7.5");
  await basic.getByLabel("Tax after discount (%)").fill("18");
  await expect(basic.locator("output")).toHaveText("₹1,200.65");
  await expect(basic.getByText(/Saved: ₹232.50/)).toBeVisible();
  await basic.getByRole("button", { name: "Copy result" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("₹1,200.65");
  await basic.getByRole("button", { name: "Save to history" }).click();
  await basic.getByRole("button", { name: "Favorite calculation 1" }).click();
  await expect(
    basic.getByRole("button", { name: "Unfavorite calculation 1" }),
  ).toHaveAttribute("aria-pressed", "true");
  await price.fill("500");
  await basic.getByRole("button", { name: "Save to history" }).click();
  await basic.getByRole("button", { name: "Delete calculation 1" }).click();
  await basic.getByRole("button", { name: "Restore" }).click();
  await expect(price).toHaveValue("1250");
  await expect(rates).toHaveValue("12,7.5");
  const pending = page.waitForEvent("download");
  await basic.getByRole("button", { name: "Export history CSV" }).click();
  const file = await pending;
  expect(await readFile(await file.path(), "utf8")).toContain("1,200.65");
  await basic.getByRole("button", { name: "Clear history" }).click();
  await basic.getByRole("button", { name: "Cancel clear history" }).click();
  await expect(basic.getByText("Session history")).toBeVisible();
  await basic.getByRole("button", { name: "Clear history" }).click();
  await basic.getByRole("button", { name: "Confirm clear history" }).click();
  await expect(basic.getByText("Session history")).toHaveCount(0);
  await rates.fill("0x10");
  await expect(basic.getByText(/decimal discount rates/)).toBeVisible();
  await rates.fill("100");
  await basic
    .getByLabel("Reverse: price is after discounts, before tax")
    .check();
  await expect(
    basic.getByText(/100% discount cannot be reversed/),
  ).toBeVisible();
  await basic.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(price).toHaveValue("");
});
test("discount populated responsive and keyboard accessibility", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tools/discount-calculator");
    const basic = page.getByRole("region", { name: "Calculator workspace" });
    await basic.getByLabel("Price (INR)").fill("1250");
    await basic.getByLabel("Discounts (%) — comma separated").fill("12,7.5");
    await basic.getByLabel("Tax after discount (%)").fill("18");
    await expect(basic.locator("output")).toHaveText("₹1,200.65");
    const offer = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Compare discount offers" }),
    });
    await offer.getByLabel("Original price").fill("100");
    await offer
      .getByLabel("Discount rates (%) — comma separated")
      .fill("10,20");
    await expect(offer.getByText("20%: ₹80.00")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/evidence/phase-9-discount-qa/discount-${width}.png`,
      fullPage: true,
    });
  }
  const reset = page
    .getByRole("region", { name: "Calculator workspace" })
    .getByRole("button", { name: "Reset", exact: true });
  await reset.focus();
  await expect(reset).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Price (INR)")).toHaveValue("");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
