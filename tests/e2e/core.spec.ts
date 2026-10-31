import { test, expect } from "@playwright/test";
test("word counter normal, large and clear", async ({ page }) => {
  await page.goto("/tools/word-counter");
  await page
    .getByLabel("Your text", { exact: true })
    .fill("Hello world.\n\nAnother paragraph!");
  await expect(page.locator(".stat").first()).toHaveText("4Words");
  await page
    .getByLabel("Your text", { exact: true })
    .fill("word ".repeat(200000));
  await expect(page.locator(".stat").first()).toHaveText("200,000Words");
  await page.getByRole("button", { name: "Clear text" }).click();
  await expect(page.locator(".stat").first()).toHaveText("0Words");
});
test("case conversion and clipboard fallback", async ({ page }) => {
  await page.goto("/tools/case-converter");
  await page.getByRole("button", { name: "UPPERCASE", exact: true }).click();
  await expect(page.locator(".status")).toContainText("Enter some text");
  await page.getByLabel("Original text").fill("Hello\nWorld");
  await page.getByRole("button", { name: "UPPERCASE", exact: true }).click();
  await expect(page.getByLabel("Converted text")).toHaveValue("HELLO\nWORLD");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(Error()) },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(
    page.getByText("Copy unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Converted text")).toHaveValue("");
});
test("JSON validation, format, minify and clear", async ({ page }) => {
  await page.goto("/tools/json-formatter");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".status")).toContainText("Enter JSON");
  await page.getByLabel("JSON input").fill("{bad}");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".status")).toContainText("Invalid JSON");
  await page.getByLabel("JSON input").fill('{"hello":"世界"}');
  await page.getByRole("button", { name: "Format JSON", exact: true }).click();
  await expect(page.getByLabel("JSON result")).toHaveValue(
    '{\n  "hello": "世界"\n}',
  );
  await page.getByRole("button", { name: "Minify", exact: true }).click();
  await expect(page.getByLabel("JSON result")).toHaveValue('{"hello":"世界"}');
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("JSON input")).toHaveValue("");
});
test("password options, generation and real clipboard", async ({
  page,
  context,
  browserName,
}) => {
  await page.goto("/tools/password-generator");
  for (const label of [
    "Uppercase (A–Z)",
    "Lowercase (a–z)",
    "Numbers (0–9)",
    "Symbols (!@#$…)",
  ])
    await page.getByLabel(label, { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await expect(page.locator(".status.error")).toContainText("Select at least");
  await page.getByLabel("Numbers (0–9)", { exact: true }).check();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  const password = await page
    .getByLabel("Generated password", { exact: true })
    .inputValue();
  expect(password).toMatch(/^\d{20}$/);
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(
      page.getByText("Copied to clipboard.", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      password,
    );
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByLabel("Generated password", { exact: true }),
  ).toHaveValue("");
});

test("word, case and JSON copy actions write the actual current output", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Real clipboard readback is restricted to Chromium permissions in this test runner.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const tool of ["word-counter", "case-converter", "json-formatter"]) {
    await page.goto(`/tools/${tool}`);
    let expected = "";
    if (tool === "word-counter") {
      expected = "Hello 世界";
      await page.getByLabel("Your text", { exact: true }).fill(expected);
    }
    if (tool === "case-converter") {
      await page.getByLabel("Original text").fill("Hello");
      await page
        .getByRole("button", { name: "UPPERCASE", exact: true })
        .click();
      expected = "HELLO";
    }
    if (tool === "json-formatter") {
      await page.getByLabel("JSON input").fill('{"x":1}');
      await page.getByRole("button", { name: "Minify", exact: true }).click();
      expected = '{"x":1}';
    }
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(
      page.getByText("Copied to clipboard.", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      expected,
    );
    if (tool === "word-counter") {
      await page.getByLabel("Your text", { exact: true }).fill("Changed");
      await expect(
        page.getByText("Copied to clipboard.", { exact: true }),
      ).toHaveCount(0);
    }
  }
});
