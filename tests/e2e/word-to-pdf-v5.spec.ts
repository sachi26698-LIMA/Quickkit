import { test, expect, type Page } from "./helpers/tool-test";
import { mkdir, readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * V5 end-to-end journey against the REAL conversion API. No network mocking:
 * a real DOCX is uploaded, converted by whichever engine this installation
 * reports, previewed with PDF.js, edited, downloaded and re-parsed.
 */
const FIXTURE = "docs/word-to-pdf/v4/fixtures/complex.docx";
const OUT = "test-results/word-to-pdf-v5";

test.describe.configure({ mode: "serial" });

async function status(page: Page) {
  const response = await page.request.get("/api/word-to-pdf");
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    available: boolean;
    engine: string | null;
    maxPages: number;
  };
}

async function textOf(bytes: Uint8Array) {
  const doc = await getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= doc.numPages; index++) {
    const content = await (await doc.getPage(index)).getTextContent();
    pages.push(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
    );
  }
  return pages;
}

async function convertFixture(page: Page) {
  await page.goto("/tools/word-to-pdf");
  await page.getByLabel("Choose DOCX files").setInputFiles(FIXTURE);
  await expect(page.getByText(/Valid DOCX package/)).toBeVisible();
  await page.getByLabel("I agree to upload").check();
  await page.getByRole("button", { name: "Convert documents" }).click();
  await expect(page.getByText(/Completed/).first()).toBeVisible({
    timeout: 90_000,
  });
  // The preview canvas only exists once the real PDF has been parsed.
  await expect(
    page.getByRole("img", { name: /Converted PDF page 1/ }),
  ).toBeVisible({ timeout: 60_000 });
}

test("real journey: convert, preview, restyle, download (desktop)", async ({
  page,
}) => {
  const engine = await status(page);
  expect(engine.available).toBe(true);
  expect(["builtin", "libreoffice", "worker"]).toContain(engine.engine);

  await convertFixture(page);

  // Preview controls operate on the actual output PDF.
  await expect(page.getByText(/of 5|of —/).first()).toBeVisible();
  await page.getByRole("button", { name: "Toggle page thumbnails" }).click();
  await expect(
    page.getByRole("button", { name: "Go to page 2" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByLabel("Preview page number")).toHaveValue("2");
  await page.getByLabel("Preview zoom").selectOption("fit-width");
  await page.getByLabel("Search PDF text").fill("fixture");
  await page.getByRole("button", { name: "Search text" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /matching pages/ }),
  ).toBeVisible({
    timeout: 30_000,
  });

  // Change an export setting that must reach the generated PDF. Page controls
  // live in a collapsed section until the user opens it.
  await page.locator("summary").filter({ hasText: "Page Management" }).click();
  const format = page.getByLabel("Custom number template");
  await page.getByLabel("Add page numbers").check();
  await format.fill("Page {n} of {total}");
  await page.getByLabel("Custom header").fill("QUICKKIT E2E");
  await expect(page.getByText(/Export synchronized/).first()).toBeVisible({
    timeout: 60_000,
  });

  // Download the real PDF and inspect it.
  const download = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]).then(([event]) => event);
  const path = `${OUT}/desktop-export.pdf`;
  await mkdir(OUT, { recursive: true });
  await download.saveAs(path);
  const bytes = new Uint8Array(await readFile(path));
  expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(5);
  const text = await textOf(bytes);
  expect(text[0]).toContain("QUICKKIT E2E");
  expect(text[0]).toContain("Page 1 of 5");
  expect(text[4]).toContain("Page 5 of 5");
  expect(text[0]).toContain("Native fixture page 1 of 4");

  // ZIP batch export contains the PDF and the report.
  const zipDownload = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download all ZIP/ }).click(),
  ]).then(([event]) => event);
  const zipPath = `${OUT}/desktop-batch.zip`;
  await zipDownload.saveAs(zipPath);
  const zip = new Uint8Array(await readFile(zipPath));
  expect(zip[0]).toBe(0x50);
  expect(zip[1]).toBe(0x4b);

  await page.screenshot({
    path: `${OUT}/desktop-workspace.png`,
    fullPage: true,
    animations: "disabled",
  });

  // Mobile layout of the same journey state.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "Workspace panels" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Workspace panels" })
    .getByRole("button", { name: "Preview", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Converted PDF page/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `${OUT}/mobile-preview.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("invalid and encrypted documents are rejected before upload", async ({
  page,
}) => {
  await page.goto("/tools/word-to-pdf");
  let posts = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/word-to-pdf")
    )
      posts++;
  });
  await page.getByLabel("Choose DOCX files").setInputFiles({
    name: "notes.docx",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("not a zip package"),
  });
  await expect(page.getByText(/not a DOCX package/i)).toBeVisible();

  await page.getByLabel("Choose DOCX files").setInputFiles({
    name: "locked.docx",
    mimeType: "application/octet-stream",
    buffer: Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0,
    ]),
  });
  await expect(
    page.getByText(/password-protected or legacy binary/i),
  ).toBeVisible();
  await page.getByLabel("I agree to upload").check();
  await expect(
    page.getByRole("button", { name: "Convert documents" }),
  ).toBeDisabled();
  expect(posts).toBe(0);
});

test("page editor works on the real converted document", async ({ page }) => {
  await convertFixture(page);
  await page.getByRole("button", { name: "Open page editor" }).click();
  const editor = page.getByRole("region", {
    name: "Visual page editor",
    exact: true,
  });
  await editor.getByLabel("Select output page 2", { exact: true }).check();
  await editor.getByRole("button", { name: "Duplicate pages" }).click();
  await expect(page.getByText(/6 output pages|of 6/).first()).toBeVisible({
    timeout: 60_000,
  });
  await page.screenshot({
    path: `${OUT}/desktop-page-editor.png`,
    fullPage: true,
    animations: "disabled",
  });
});
