import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const inputs: Record<string, (p: Page) => Promise<void>> = {
  "percentage-calculator": async (p) => {
    await p.getByLabel("Percentage", { exact: true }).fill("20");
    await p.getByLabel("Number", { exact: true }).fill("150");
    const s = p.locator("section").filter({
      has: p.getByRole("heading", { name: "Compare & build changes" }),
    });
    await s.getByLabel("Starting value").fill("100");
    await s.getByLabel("Changes (%) — comma separated").fill("10,-20");
    await expect(s.getByText("Final value: 88", { exact: true })).toBeVisible();
  },
  "age-calculator": async (p) => {
    await p.getByLabel("Date of birth", { exact: true }).fill("2000-02-29");
    await p.getByLabel("Age on date").fill("2023-02-28");
    await p.getByText("Compare another person").click();
    await p.getByLabel("Second date of birth").fill("1998-02-28");
    await expect(
      p.getByText(/Next decade milestone: 30 years on 2030-02-28/),
    ).toBeVisible();
  },
  "date-difference-calculator": async (p) => {
    await p.getByLabel("Start date").fill("2024-03-01");
    await p.getByLabel("End date", { exact: true }).fill("2024-03-05");
    await p.getByText("Holiday exclusions").click();
    await p.getByLabel("Holiday dates", { exact: false }).fill("2024-03-04");
    await expect(p.getByText(/1 business days/)).toBeVisible();
    await p.getByText("View start-month calendar").click();
    await expect(p.getByRole("table", { name: "March 2024" })).toBeVisible();
  },
  "bmi-calculator": async (p) => {
    await p.getByLabel("Height (cm)").fill("170");
    await p.getByLabel("Weight (kg)", { exact: true }).fill("65");
    await p.getByText("Compare previous weight").click();
    await p.getByLabel("Previous weight (kg)").fill("70");
    await expect(p.getByText(/Previous BMI: 24.2215/)).toBeVisible();
  },
  "gst-calculator": async (p) => {
    await p.getByLabel("Amount (₹)", { exact: true }).fill("1000");
    await p.getByLabel("GST rate (%)", { exact: true }).first().fill("18");
    const s = p.locator("section").filter({
      has: p.getByRole("heading", { name: "Multi-item GST estimate" }),
    });
    await s.getByLabel("Unit price (₹)").first().fill("1000");
    await expect(s.getByText("Invoice total: ₹1,180.00")).toBeVisible();
  },
  "discount-calculator": async (p) => {
    await p.getByLabel("Price (INR)").fill("100");
    await p.getByLabel("Discounts (%) — comma separated").fill("10,20");
    const s = p.locator("section").filter({
      has: p.getByRole("heading", { name: "Compare discount offers" }),
    });
    await s.getByLabel("Original price").fill("100");
    await s.getByLabel("Discount rates (%) — comma separated").fill("10,20");
    await expect(s.getByText("20%: ₹80.00")).toBeVisible();
  },
  "emi-calculator": loan,
  "loan-calculator": loan,
  "scientific-calculator": async (p) => {
    await p.getByLabel("Expression").fill("nCr(5,2)+sin(30)");
    await p.getByLabel("Expression").press("Enter");
    await p.getByText("More functions").click();
    await expect(p.locator("output")).toHaveText("10.5");
  },
  "unit-converter": async (p) => {
    await p.getByLabel("Value", { exact: true }).fill("1000");
    await p.getByText("Advanced conversion settings").click();
    await p.getByLabel("Show all target units").check();
    await expect(p.locator("output")).toContainText("1 Kilometre");
  },
  "temperature-converter": async (p) => {
    await p.getByLabel("Value", { exact: true }).fill("0");
    await p.getByText("Advanced conversion settings").click();
    await p.getByLabel("Show all target units").check();
    await expect(p.locator("output")).toContainText("32 Fahrenheit");
    await p.getByText("Compare another temperature").click();
    await p.getByLabel("Comparison temperature").fill("50");
    await p.getByLabel("Comparison unit").selectOption("Fahrenheit");
    await expect(
      p.getByText(
        "Difference (current − comparison): -10 °C (same magnitude in K).",
      ),
    ).toBeVisible();
  },
  "time-converter": async (p) => {
    await p.getByLabel("Value", { exact: true }).fill("2");
    await p.getByText("Advanced conversion settings").click();
    await p.getByLabel("Show all target units").check();
    await p.getByLabel("Starting local date and time").fill("2024-01-31T10:30");
    await p.getByLabel("Calendar duration (negative to subtract)").fill("1");
    await expect(p.getByText("2024-02-29 10:30")).toBeVisible();
  },
};
async function loan(p: Page) {
  await p.getByLabel("Principal (₹)", { exact: true }).fill("1200");
  await p.getByLabel("Annual interest rate (%)").fill("0");
  await p.getByLabel("Tenure (months)", { exact: true }).fill("12");
  const s = p.locator("section").filter({
    has: p.getByRole("heading", {
      name: "Variable rate & payment frequency",
    }),
  });
  await s.getByLabel("Scenario principal (₹)").fill("1200");
  await s.getByLabel("Scenario tenure (months)").fill("12");
  await s.getByLabel("Initial annual rate (%)").fill("0");
  await s.getByLabel("Rate changes (payment period:annual rate)").fill("7:12");
  await expect(s.getByText(/Total interest: ₹21.17/)).toBeVisible();
}
for (const [slug, fill] of Object.entries(inputs))
  test(`${slug}: populated desktop and mobile evidence`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/tools/${slug}`);
      await fill(page);
      const basic = page.getByRole("region", { name: "Calculator workspace" });
      await basic.getByRole("button", { name: "Save to history" }).click();
      await expect(basic.getByText("Session history")).toBeVisible();
      await basic.getByRole("button", { name: "Copy result" }).click();
      await expect(
        basic.locator("p[role=status]").filter({ hasText: "Copied" }),
      ).toContainText("Copied");
      const dl = page.waitForEvent("download");
      await basic.getByRole("button", { name: "Export history CSV" }).click();
      expect(await readFile(await (await dl).path(), "utf8")).toContain(
        "Result",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `docs/phase-9-v2-final-evidence/${slug}-${width}.png`,
        fullPage: true,
      });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
test("restorable date, BMI, invoice and loan scenarios", async ({ page }) => {
  await page.goto("/tools/age-calculator");
  await inputs["age-calculator"](page);
  const basic = page.getByRole("region", { name: "Calculator workspace" });
  await basic.getByRole("button", { name: "Save to history" }).click();
  await page.getByLabel("Date of birth", { exact: true }).fill("2001-01-01");
  await basic.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByLabel("Date of birth", { exact: true })).toHaveValue(
    "2000-02-29",
  );
  await page.goto("/tools/bmi-calculator");
  await inputs["bmi-calculator"](page);
  const bmi = page.getByRole("region", { name: "Calculator workspace" });
  await bmi.getByRole("button", { name: "Save to history" }).click();
  await page.getByLabel("Previous weight (kg)").fill("80");
  await bmi.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByLabel("Previous weight (kg)")).toHaveValue("70");
  await page.goto("/tools/gst-calculator");
  await inputs["gst-calculator"](page);
  await page.getByRole("button", { name: "Save invoice" }).click();
  await page.getByLabel("Unit price (₹)").first().fill("500");
  await page.getByRole("button", { name: "Restore invoice 1" }).click();
  await expect(page.getByText("Invoice total: ₹1,180.00")).toBeVisible();
  await page.goto("/tools/loan-calculator");
  await loan(page);
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await page.getByLabel("Scenario principal (₹)").fill("500");
  await page.getByRole("button", { name: "Restore scenario 1" }).click();
  await expect(page.getByLabel("Scenario principal (₹)")).toHaveValue("1200");
});
