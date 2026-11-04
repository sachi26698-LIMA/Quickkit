import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument } from "@cantoo/pdf-lib";
import { mkdir } from "node:fs/promises";
const docx = (name = "report.docx") => ({
  name,
  mimeType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: Buffer.from("mock DOCX input — transport tests only"),
});

test("real installation fails closed and never uploads without an engine", async ({
  page,
  request,
}) => {
  const status = await request.get("/api/word-to-pdf");
  expect((await status.json()).available).toBe(false);
  let posts = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/word-to-pdf") && r.method() === "POST") posts++;
  });
  await page.goto("/tools/word-to-pdf");
  await expect(
    page.getByText("Conversion engine is not enabled on this installation", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Choose DOCX files")
    .setInputFiles([docx(), docx("unsupported.doc")]);
  await expect(
    page.getByText("Only DOCX is supported.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("I agree to upload").check();
  await expect(
    page.getByRole("button", { name: "Convert documents" }),
  ).toBeDisabled();
  expect(posts).toBe(0);
  expect(
    (
      await request.post("/api/word-to-pdf", { data: "not consented" })
    ).status(),
  ).toBe(403);
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  await mkdir("docs/word-to-pdf/screenshots", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/word-to-pdf/screenshots/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Word to PDF Converter" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/word-to-pdf/screenshots/mobile.png",
    fullPage: true,
  });
});

test("mocked transport: consent, sequential batch, individual settings, PDF preview and ZIP", async ({
  page,
}) => {
  // Native engine is NOT tested here. Known real PDF bytes exercise the UI transport/preview/export.
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]);
  pdf.addPage([420, 595]);
  const result = Buffer.from(await pdf.save()).toString("base64");
  const sent: { consent: string | undefined; settings: { paper: string } }[] =
    [];
  await page.route("**/api/word-to-pdf", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    const headers = route.request().headers();
    sent.push({
      consent: headers["x-quickkit-consent"],
      settings: JSON.parse(decodeURIComponent(headers["x-quickkit-settings"])),
    });
    return route.fulfill({
      contentType: "application/x-ndjson",
      body:
        JSON.stringify({ stage: "Validating DOCX" }) +
        "\n" +
        JSON.stringify({ result, pages: 2 }) +
        "\n",
    });
  });
  await page.goto("/tools/word-to-pdf");
  await page
    .getByLabel("Choose DOCX files")
    .setInputFiles([docx(), docx("second.docx")]);
  await expect(
    page.getByRole("button", { name: "Convert documents" }),
  ).toBeDisabled();
  expect(sent).toHaveLength(0);
  await page
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("A3");
  const first = page.locator("article").filter({ hasText: "report.docx" });
  await first.getByText("Individual page & quality settings").click();
  await first.getByLabel("Override global settings").check();
  await first
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("Letter");
  await page.getByLabel("I agree to upload").check();
  await page.getByRole("button", { name: "Convert documents" }).click();
  await expect(page.getByRole("button", { name: "Preview PDF" })).toHaveCount(
    2,
  );
  expect(sent.map((s) => s.settings.paper)).toEqual(["Letter", "A3"]);
  expect(sent.every((s) => s.consent === "server-conversion")).toBe(true);
  await first.getByRole("button", { name: "Preview PDF" }).click();
  await expect(
    page.getByRole("img", { name: "Converted PDF page 1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(
    page.getByRole("img", { name: "Converted PDF page 2" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/word-to-pdf/screenshots/preview-mocked-transport.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download all ZIP/ }).click();
  expect((await download).suggestedFilename()).toBe("quickkit-pdfs.zip");
  await page.getByRole("button", { name: "Clear files" }).click();
  await expect(page.getByRole("button", { name: "Preview PDF" })).toHaveCount(
    0,
  );
});

test("mocked transport: errors are visible and retry works", async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const result = Buffer.from(await pdf.save()).toString("base64");
  let attempt = 0;
  await page.route("**/api/word-to-pdf", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    attempt++;
    return route.fulfill({
      contentType: "application/x-ndjson",
      body:
        JSON.stringify(
          attempt === 1
            ? { error: "Corrupted DOCX XML." }
            : { result, pages: 1 },
        ) + "\n",
    });
  });
  await page.goto("/tools/word-to-pdf");
  await page.getByLabel("Choose DOCX files").setInputFiles(docx());
  await page.getByLabel("I agree to upload").check();
  await page.getByRole("button", { name: "Convert documents" }).click();
  await expect(page.locator("p[role=alert]")).toHaveText("Corrupted DOCX XML.");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Preview PDF" })).toBeVisible();
  expect(attempt).toBe(2);
});

test("mocked transport: cancel stops pending batch uploads", async ({
  page,
}) => {
  let posts = 0;
  let finish: (() => void) | undefined;
  await page.route("**/api/word-to-pdf", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    posts++;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    await route
      .fulfill({
        contentType: "application/x-ndjson",
        body: '{"error":"Cancelled"}\n',
      })
      .catch(() => undefined);
  });
  await page.goto("/tools/word-to-pdf");
  await page
    .getByLabel("Choose DOCX files")
    .setInputFiles([docx(), docx("pending.docx")]);
  await page.getByLabel("I agree to upload").check();
  await page.getByRole("button", { name: "Convert documents" }).click();
  await expect.poll(() => posts).toBe(1);
  await page.getByRole("button", { name: "Cancel batch" }).click();
  finish?.();
  await expect(
    page.getByText("Cancelled before upload", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel batch" })).toHaveCount(
    0,
  );
  expect(posts).toBe(1);
});
