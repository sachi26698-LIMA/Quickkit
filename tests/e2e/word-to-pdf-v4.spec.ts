import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
// Actual unavailable engine, no mocked native success; synthetic DOCX stays local.
for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`V4 ${viewport.name}: actual unavailable engine stays consent-gated`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    expect(
      (await (await request.get("/api/word-to-pdf")).json()).available,
    ).toBe(false);
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
    await mkdir("docs/word-to-pdf/v4", { recursive: true });
    await page.screenshot({
      path: `docs/word-to-pdf/v4/${viewport.name}-engine-unavailable.png`,
      fullPage: true,
    });
  });
}
