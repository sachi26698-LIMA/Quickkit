import { expect, test } from "@playwright/test";
import {
  legacySecurityRedirects,
  securityGroups,
} from "../../lib/tools/security/consolidation";

test("all legacy security URLs redirect to their exact operational tab", async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);
  for (const { source, destination } of legacySecurityRedirects) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(308);
    expect(response.headers().location, source).toBe(destination);
    await page.goto(source);
    const expected = new URL(destination, "http://example.test");
    expect(new URL(page.url()).pathname, source).toBe(expected.pathname);
    await expect(
      page.locator(`#tab-${expected.searchParams.get("operation")}`),
      source,
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel"), source).toBeVisible();
  }
});

test("every tab can be selected with independent workspaces and browser history", async ({
  page,
}) => {
  test.setTimeout(180_000);
  for (const group of securityGroups) {
    await page.goto(`/tools/${group.slug}`);
    for (const operation of group.operations) {
      const tab = page.locator(`#tab-${operation}`);
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel")).toBeVisible();
      expect(new URL(page.url()).searchParams.get("operation")).toBe(operation);
    }
  }
  await page.goto(
    "/tools/password-generator?operation=password-strength-checker",
  );
  await page.getByLabel("Password to assess").fill("private sample");
  await page.locator("#tab-passphrase-generator").click();
  await page.goBack();
  await expect(page.locator("#tab-password-strength-checker")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Password to assess")).toHaveValue("");
  await page.locator("#tab-password-strength-checker").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-passphrase-generator")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#tab-passphrase-generator")).toBeFocused();
});

test("favorites migrate and old operation names remain searchable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "quickkit:saved-tools",
      JSON.stringify(["hmac-generator-verifier", "jwt-decoder", "dns-lookup"]),
    ),
  );
  await page.goto("/saved");
  await expect(
    page
      .getByRole("link", { name: /Ultimate Encryption & Cryptography/ })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ultimate DNS & Email Security/ }).first(),
  ).toBeVisible();
  await page.goto("/tools?category=security-privacy");
  await page.getByRole("searchbox").fill("HMAC Generator");
  const result = page
    .getByRole("link", { name: /Ultimate Encryption & Cryptography/ })
    .first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator("#tab-hmac-generator-verifier")).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("operation tabs stay usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tools/website-security-review");
  await page.locator("#tab-certificate-inspector").click();
  await expect(page.locator("#tab-certificate-inspector")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("all workbenches fit a phone viewport and pass an automated accessibility check", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.setViewportSize({ width: 375, height: 812 });
  for (const group of securityGroups) {
    await page.goto(`/tools/${group.slug}`);
    await expect(
      page.getByRole("tablist", { name: "Choose an operation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
      group.slug,
    ).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, group.slug).toEqual([]);
  }
});
