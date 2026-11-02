import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
const cases = [
  { mode: "of", a: "20", b: "150", expected: "30" },
  { mode: "of", a: "-10", b: "200", expected: "-20" },
  { mode: "of", a: "0", b: "500", expected: "0" },
  { mode: "of", a: "50", b: "1000000000000", expected: "5,00,00,00,00,000" },
  { mode: "of", a: "1e-8", b: "100", expected: "1.000000e-8" },
  { mode: "is", a: "25", b: "200", expected: "12.5%" },
  { mode: "is", a: "-25", b: "200", expected: "-12.5%" },
  { mode: "is", a: "25", b: "-200", expected: "-12.5%" },
  { mode: "is", a: "1", b: "3", expected: "33.3333%" },
  { mode: "increase", a: "80", b: "25", expected: "100" },
  { mode: "increase", a: "-100", b: "20", expected: "-120" },
  { mode: "increase", a: "100", b: "-20", expected: "80" },
  { mode: "decrease", a: "100", b: "25", expected: "75" },
  { mode: "decrease", a: "-100", b: "20", expected: "-80" },
  { mode: "decrease", a: "100", b: "-20", expected: "120" },
  { mode: "difference", a: "100", b: "120", expected: "18.1818%" },
  { mode: "difference", a: "-100", b: "100", expected: "200%" },
  { mode: "reverse", a: "80", b: "-20", expected: "100" },
  { mode: "reverse", a: "120", b: "20", expected: "100" },
  { mode: "reverse", a: "-120", b: "20", expected: "-100" },
  { mode: "reverse", a: "0", b: "50", expected: "0" },
];
test("basic modes show independently calculated results and reject undefined inputs", async ({
  page,
}) => {
  await page.goto("/tools/percentage-calculator");
  const basic = page.getByRole("region", { name: "Calculator workspace" });
  const mode = basic.getByRole("combobox", { name: "Calculation" });
  const input = basic.locator('input[type="number"]');
  for (const c of cases) {
    await mode.selectOption(c.mode);
    await input.nth(0).fill(c.a);
    await input.nth(1).fill(c.b);
    await expect(basic.locator("output"), JSON.stringify(c)).toHaveText(
      c.expected,
    );
  }
  await mode.selectOption("is");
  await input.nth(0).fill("1");
  await input.nth(1).fill("0");
  await expect(
    basic.getByText("The reference value cannot be zero."),
  ).toBeVisible();
  await input.nth(1).fill("1e-320");
  await expect(
    basic.getByText("Result is outside the supported numeric range."),
  ).toBeVisible();
  await mode.selectOption("difference");
  await input.nth(0).fill("0");
  await input.nth(1).fill("0");
  await expect(
    basic.getByText("The average magnitude cannot be zero."),
  ).toBeVisible();
  await mode.selectOption("reverse");
  await input.nth(0).fill("0");
  await input.nth(1).fill("-100");
  await expect(
    basic.getByText("A −100% change cannot be reversed."),
  ).toBeVisible();
  await mode.selectOption("of");
  await input.nth(0).fill("1000000000001");
  await input.nth(1).fill("1");
  await expect(
    basic.getByText(/between −1 trillion and 1 trillion/),
  ).toBeVisible();
  await input.nth(0).fill("1e-999");
  await expect(
    basic.getByText("Number is too small to represent accurately."),
  ).toBeVisible();
  await input.nth(0).fill("");
  await expect(
    basic.getByText("Enter both values to see your result."),
  ).toBeVisible();
});
test("keyboard, basic history, restore, reset and copy", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tools/percentage-calculator");
  const basic = page.getByRole("region", { name: "Calculator workspace" });
  const mode = basic.getByRole("combobox", { name: "Calculation" });
  await mode.focus();
  await page.keyboard.press("ArrowDown");
  await expect(mode).toHaveValue("is");
  const input = basic.locator('input[type="number"]');
  await input.nth(0).focus();
  await page.keyboard.type("25");
  await input.nth(1).focus();
  await page.keyboard.type("200");
  await expect(basic.locator("output")).toHaveText("12.5%");
  await basic.getByRole("button", { name: "Save to history" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    basic.getByRole("heading", { name: "Session history" }),
  ).toBeVisible();
  await basic.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(input.nth(0)).toHaveValue("");
  await expect(mode).toHaveValue("of");
  await basic.getByRole("button", { name: "Restore" }).click();
  await expect(mode).toHaveValue("is");
  await expect(basic.locator("output")).toHaveText("12.5%");
  await basic.getByRole("button", { name: "Copy result" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "12.5%",
  );
  await basic.getByRole("button", { name: "Clear history" }).click();
  await expect(
    basic.getByRole("heading", { name: "Session history" }),
  ).toHaveCount(0);
  await basic.getByRole("button", { name: "Save to history" }).click();
  await page.reload();
  await expect(
    basic.getByRole("heading", { name: "Session history" }),
  ).toHaveCount(0);
});
test("advanced sequences, comparisons, reverse discount, history and export", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tools/percentage-calculator");
  const box = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Compare & build changes" }),
  });
  const mode = box.getByRole("combobox", { name: "Advanced mode" });
  await box.getByLabel("Starting value").fill("100");
  await box.getByLabel("Changes (%) — comma separated").fill("10,-20");
  await expect(box.getByText("Final value: 88", { exact: true })).toBeVisible();
  await expect(box.getByText(/Step 2: 110 ×/)).toBeVisible();
  await box.getByRole("button", { name: "Copy summary" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Final value: 88",
  );
  await box.getByRole("button", { name: "Save calculation" }).click();
  await mode.selectOption("compare");
  await box.getByLabel("Starting value").fill("-100");
  await box.getByLabel("Further values — comma separated").fill("-50,-150");
  await expect(box.getByText("-100 → -50: 50% change")).toBeVisible();
  await expect(box.getByText("-50 → -150: -200% change")).toBeVisible();
  await box.getByLabel("Starting value").fill("0");
  await expect(
    box.getByText(/undefined \(starting value is zero\)/),
  ).toBeVisible();
  await box.getByLabel("Further values — comma separated").fill("0x10");
  await expect(box.getByText(/Enter a valid decimal number/)).toBeVisible();
  await box.getByRole("button", { name: "Restore" }).click();
  await expect(box.getByText("Final value: 88", { exact: true })).toBeVisible();
  const dl = page.waitForEvent("download");
  await box.getByRole("button", { name: "Download CSV" }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe("percentage-calculation.csv");
  expect(await readFile(await file.path(), "utf8")).toContain(
    "Final value: 88",
  );
  await mode.selectOption("discount");
  await box.getByLabel("Discounted value").fill("80");
  await box.getByLabel("Discount (%)", { exact: true }).fill("20");
  await expect(box.getByText("Original value: 100")).toBeVisible();
  await box.getByLabel("Discount (%)", { exact: true }).fill("100");
  await expect(box.getByText(/up to, but not including, 100%/)).toBeVisible();
  await box.getByRole("button", { name: "Clear saved calculations" }).click();
  await expect(box.getByText("Stored only for this page session.")).toHaveCount(
    0,
  );
  await box.getByRole("button", { name: "Clear inputs" }).click();
  await expect(box.getByLabel("Discounted value")).toHaveValue("");
});
test("populated responsive layout, axe, console and screenshots", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tools/percentage-calculator");
    const basic = page.getByRole("region", { name: "Calculator workspace" });
    await basic.locator('input[type="number"]').nth(0).fill("20");
    await basic.locator('input[type="number"]').nth(1).fill("150");
    await expect(basic.locator("output")).toHaveText("30");
    const box = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Compare & build changes" }),
    });
    await box.getByLabel("Starting value").fill("100");
    await box.getByLabel("Changes (%) — comma separated").fill("10,-20");
    await expect(
      box.getByText("Final value: 88", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (width === 375 || width === 1440)
      await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `docs/percentage-qa/percentage-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
