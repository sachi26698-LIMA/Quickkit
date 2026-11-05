import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
// A disabled installation is simulated via the status endpoint so the
// consent gate can be verified even on a host that ships the built-in engine.
for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`V4 ${viewport.name}: a disabled installation stays consent-gated`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/word-to-pdf", async (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({
          json: {
            available: false,
            engine: null,
            label: "Conversion engine is not enabled on this installation",
            native: false,
            fidelity: "unavailable",
            notes: ["Engine disabled for this test."],
            maxPages: 1000,
          },
        });
      return route.continue();
    });
    let uploads = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/word-to-pdf") && r.method() === "POST")
        uploads++;
    });
    await page.goto("/tools/word-to-pdf");
    await expect(
      page.getByText("Conversion engine is not enabled on this installation", {
        exact: true,
      }),
    ).toBeVisible();
    const chooser = page.getByLabel("Choose DOCX files");
    await expect(chooser).toBeEnabled();
    await chooser.setInputFiles("docs/word-to-pdf/v4/fixtures/complex.docx");
    await page.getByLabel("I agree to upload").check();
    await expect(
      page.getByRole("button", { name: "Convert documents" }),
    ).toBeDisabled();
    expect(uploads).toBe(0);
    await mkdir("test-results/word-to-pdf-v4", { recursive: true });
    await page.screenshot({
      path: `test-results/word-to-pdf-v4/${viewport.name}-engine-unavailable.png`,
      fullPage: true,
    });
  });
}
