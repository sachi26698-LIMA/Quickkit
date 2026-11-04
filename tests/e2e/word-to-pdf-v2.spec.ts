import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument, rgb } from "@cantoo/pdf-lib";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
} from "docx";
import { readFile, mkdir } from "node:fs/promises";

async function docx(name = "review-notes.docx") {
  return {
    name,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await Packer.toBuffer(
      new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Original DOCX review notes",
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              new Paragraph(
                "Actual DOCX browser comparison fixture. This does not certify native conversion.",
              ),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph("Item")] }),
                      new TableCell({ children: [new Paragraph("Status")] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph("Design review")],
                      }),
                      new TableCell({
                        children: [new Paragraph("For discussion")],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      }),
    ),
  };
}
async function pdfFixture() {
  const pdf = await PDFDocument.create();
  for (const [i, width] of [595, 500, 600].entries()) {
    const page = pdf.addPage([width, 842]);
    page.drawRectangle({
      x: 0,
      y: 740,
      width,
      height: 102,
      color: rgb(59 / 255, 27 / 255, 79 / 255),
    });
    page.drawText(["Project review", "Decision log", "Next steps"][i], {
      x: 40,
      y: 781,
      size: 24,
      color: rgb(1, 1, 1),
    });
    page.drawText("Synthetic PDF fixture - engine response mocked", {
      x: 40,
      y: 757,
      size: 10,
      color: rgb(1, 1, 1),
    });
    page.drawText("QUICKKIT  /  DOCUMENT WORKSPACE QA", {
      x: 40,
      y: 700,
      size: 10,
      color: rgb(59 / 255, 27 / 255, 79 / 255),
    });
    const lines = [
      "A real PDF rendered by PDF.js.",
      "This fixture tests preview, editing and exact export bytes.",
      "It is not evidence of LibreOffice DOCX fidelity.",
    ];
    lines.forEach((text, j) =>
      page.drawText(text, { x: 40, y: 650 - j * 25, size: 11 }),
    );
    for (let row = 0; row < 5; row++) {
      page.drawRectangle({
        x: 40,
        y: 480 - row * 40,
        width: width - 80,
        height: 40,
        color: row % 2 ? rgb(1, 1, 1) : rgb(244 / 255, 215 / 255, 212 / 255),
        borderWidth: 0.3,
        borderColor: rgb(59 / 255, 27 / 255, 79 / 255),
      });
      page.drawText(
        [
          "Document review",
          "Page layout",
          "Tables and images",
          "Typography",
          "Final export",
        ][row],
        { x: 52, y: 495 - row * 40, size: 11 },
      );
      page.drawText("QA fixture", {
        x: width - 130,
        y: 495 - row * 40,
        size: 10,
      });
    }
    page.drawText(`Source page ${i + 1}`, { x: 40, y: 45, size: 10 });
  }
  return Buffer.from(await pdf.save()).toString("base64");
}
async function engine(page: Page) {
  const result = await pdfFixture();
  const posts: Record<string, unknown>[] = [];
  await page.route("**/api/word-to-pdf", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    posts.push(
      JSON.parse(
        decodeURIComponent(route.request().headers()["x-quickkit-settings"]),
      ),
    );
    return route.fulfill({
      contentType: "application/x-ndjson",
      body:
        JSON.stringify({ stage: "Native response mocked for UI QA" }) +
        "\n" +
        JSON.stringify({ result, pages: 3, base: true }) +
        "\n",
    });
  });
  return posts;
}
async function convert(page: Page) {
  await page.goto("/tools/word-to-pdf");
  await page.getByLabel("Choose DOCX files").setInputFiles(await docx());
  await page.getByLabel("I agree to upload").check();
  await page
    .getByRole("button", { name: "Convert documents", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Converted PDF page 1", exact: true }),
  ).toBeVisible();
}
async function finalPdf(page: Page) {
  const download = page.waitForEvent("download");
  await page
    .locator("article")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  const file = await download;
  const path = await file.path();
  expect(path).toBeTruthy();
  return {
    pdf: await PDFDocument.load(await readFile(path!)),
    name: file.suggestedFilename(),
  };
}

test("V2 mocked native base: live local editing, exact exports, search and comparisons", async ({
  page,
}) => {
  test.setTimeout(60000);
  const posts = await engine(page);
  await convert(page);
  const settings = page.getByRole("complementary", {
    name: "Export settings",
    exact: true,
  });
  await settings.getByText("Page Management", { exact: false }).click();
  await settings.getByLabel("Output page order", { exact: true }).fill("3,1-2");
  await settings
    .getByLabel("Custom header", { exact: true })
    .fill("REVIEW COPY");
  await settings.getByLabel("Add page numbers", { exact: true }).check();
  await settings.getByLabel("Numbering starts at", { exact: true }).fill("4");
  await settings
    .getByRole("combobox", { name: "Number format", exact: true })
    .selectOption("roman");
  await settings.getByText("PDF Metadata", { exact: false }).click();
  await settings.getByLabel("PDF title", { exact: true }).fill("Final review");
  await settings.getByLabel("PDF author", { exact: true }).fill("QA team");
  await expect(
    page.getByText("Live preview and export are synchronized", { exact: true }),
  ).toBeVisible();
  const exported = await finalPdf(page);
  expect(exported.pdf.getPages().map((p) => p.getWidth())).toEqual([
    600, 595, 500,
  ]);
  expect(exported.pdf.getTitle()).toBe("Final review");
  expect(exported.pdf.getAuthor()).toBe("QA team");
  expect(posts).toHaveLength(1);
  await page
    .getByRole("button", { name: "Toggle page thumbnails", exact: true })
    .click();
  await page.getByRole("button", { name: "Go to page 2", exact: true }).click();
  await expect(
    page.getByLabel("Preview page number", { exact: true }),
  ).toHaveValue("2");
  await page.getByLabel("Preview zoom", { exact: true }).selectOption("150");
  await page
    .getByLabel("Preview zoom", { exact: true })
    .selectOption("fit-width");
  await page
    .getByRole("button", { name: "Rotate output pages clockwise", exact: true })
    .click();
  await expect
    .poll(async () => (await finalPdf(page)).pdf.getPage(0).getRotation().angle)
    .toBe(90);
  expect(posts).toHaveLength(1);
  await page
    .getByLabel("Search PDF text", { exact: true })
    .fill("Decision log");
  await page.getByRole("button", { name: "Search text", exact: true }).click();
  await expect(
    page.getByText("1 matching pages", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Preview page number", { exact: true }),
  ).toHaveValue("3");
  await page
    .getByLabel("Comparison view", { exact: true })
    .selectOption("before");
  await expect(
    page.getByRole("img", { name: "Before PDF page 2", exact: true }),
  ).toBeVisible();
  await mkdir("test-results/word-to-pdf-v2", { recursive: true });
  await page.screenshot({
    path: "test-results/word-to-pdf-v2/before-after-mocked-engine.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByLabel("Comparison view", { exact: true })
    .selectOption("docx");
  await expect(
    page.getByText("Original DOCX review notes", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/word-to-pdf-v2/docx-comparison-mocked-engine.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByLabel("Comparison view", { exact: true }).selectOption("pdf");
  await page
    .getByRole("button", { name: "Fullscreen preview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Exit fullscreen", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Fullscreen preview", exact: true }),
  ).toBeVisible();
  await settings
    .getByRole("combobox", { name: "Output rotation", exact: true })
    .selectOption("0");
  await expect(
    page.getByText("Live preview and export are synchronized", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Preview zoom", { exact: true })
    .selectOption("fit-page");
  await page.getByLabel("Preview page number", { exact: true }).fill("1");
  await expect(
    page.getByRole("img", { name: "Converted PDF page 1", exact: true }),
  ).toBeVisible();
  await settings.getByText("Page Management", { exact: false }).click();
  await settings.getByText("PDF Metadata", { exact: false }).click();
  await settings.evaluate((el) => {
    el.scrollTop = 0;
  });
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  await mkdir("test-results/word-to-pdf-v2", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/word-to-pdf-v2/desktop-live-mocked-engine.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Workspace panels" })
    .getByRole("button", { name: "Preview", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Converted PDF page 1", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("region", { name: "PDF page preview", exact: true })
    .scrollIntoViewIfNeeded();
  const mobileA11y = await new AxeBuilder({ page }).analyze();
  expect(mobileA11y.violations).toEqual([]);
  await page.screenshot({
    path: "test-results/word-to-pdf-v2/mobile-live-mocked-engine.png",
    fullPage: false,
    animations: "disabled",
  });
});

test("V2 native changes never silently upload; auto re-upload is a separate opt-in", async ({
  page,
}) => {
  const posts = await engine(page);
  await convert(page);
  const settings = page.getByRole("complementary", {
    name: "Export settings",
    exact: true,
  });
  await settings
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("A3");
  await expect(
    page.getByText("Update required", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("article")
      .getByRole("button", { name: "Download", exact: true }),
  ).toBeDisabled();
  await page.waitForTimeout(1300);
  expect(posts).toHaveLength(1);
  await page
    .getByRole("button", { name: "Refresh preview", exact: true })
    .click();
  await expect.poll(() => posts.length).toBe(2);
  await expect(
    page.getByText("Export synchronized", { exact: true }),
  ).toBeVisible();
  await settings.locator("summary").filter({ hasText: "Quality" }).click();
  await settings
    .getByRole("combobox", { name: "PDF quality", exact: true })
    .selectOption("high");
  await settings
    .getByRole("combobox", { name: "Image compression", exact: true })
    .selectOption("jpeg");
  await settings.getByRole("spinbutton", { name: /^JPEG quality/ }).fill("75");
  await settings
    .getByLabel("Preserve image resolution", { exact: true })
    .uncheck();
  await settings.getByLabel("Maximum image DPI", { exact: true }).fill("150");
  await page
    .getByRole("button", { name: "Refresh preview", exact: true })
    .click();
  await expect.poll(() => posts.length).toBe(3);
  expect(posts[2]).toMatchObject({
    quality: "high",
    compression: "jpeg",
    jpegQuality: 75,
    preserveResolution: false,
    imageDpi: 150,
  });
  await expect(
    page.getByText("Export synchronized", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Automatically re-upload active DOCX", { exact: false })
    .check();
  await settings
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("Letter");
  await settings
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("Legal");
  await expect.poll(() => posts.length).toBe(4);
  expect(posts[3].paper).toBe("Legal");
  await expect(
    page.getByText("Export synchronized", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("I agree to upload").uncheck();
  await settings
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("A4");
  await page.waitForTimeout(1300);
  expect(posts).toHaveLength(4);
});

test("V2 queue replacement/reorder and settings undo/reset stay on the existing route", async ({
  page,
}) => {
  await page.goto("/tools/word-to-pdf");
  await page
    .getByLabel("Choose DOCX files")
    .setInputFiles([await docx("first.docx"), await docx("second.docx")]);
  await page
    .getByRole("button", { name: "Move first.docx down", exact: true })
    .click();
  await expect(page.locator("article").first()).toContainText("second.docx");
  await page
    .getByLabel("Replace first.docx", { exact: true })
    .setInputFiles(await docx("replacement.docx"));
  await expect(page.locator("article").nth(1)).toContainText(
    "replacement.docx",
  );
  await page
    .locator("article")
    .nth(1)
    .getByLabel("Output filename", { exact: true })
    .fill("custom-result.pdf");
  const paper = page
    .getByRole("complementary", { name: "Export settings", exact: true })
    .getByRole("combobox", { name: "Page size", exact: true });
  await paper.selectOption("A5");
  await page
    .getByRole("button", { name: "Undo settings", exact: true })
    .click();
  await expect(paper).toHaveValue("Original");
  await paper.selectOption("Legal");
  await page
    .getByRole("button", { name: "Reset settings", exact: true })
    .click();
  await expect(paper).toHaveValue("Original");
  await page
    .getByRole("button", { name: "Remove second.docx", exact: true })
    .click();
  await expect(page.locator("article")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Toggle files panel", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Document queue", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toggle files panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Toggle settings panel", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Export settings", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toggle settings panel", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["Edit", "Preview", "Files"]) {
    await page
      .getByRole("navigation", { name: "Workspace panels" })
      .getByRole("button", { name, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("V2 invalid live settings block export and recover without native re-upload", async ({
  page,
}) => {
  const posts = await engine(page);
  await convert(page);
  const settings = page.getByRole("complementary", {
    name: "Export settings",
    exact: true,
  });
  await settings.getByText("Page Management", { exact: false }).click();
  await settings.getByLabel("Output page order", { exact: true }).fill("1,1");
  await expect(page.locator("article p[role=alert]")).toContainText(
    "exactly once",
  );
  await expect(
    page
      .locator("article")
      .getByRole("button", { name: "Download", exact: true }),
  ).toBeDisabled();
  await settings.getByLabel("Output page order", { exact: true }).fill("3,2,1");
  await expect(
    page.getByText("Live preview and export are synchronized", { exact: true }),
  ).toBeVisible();
  const result = await finalPdf(page);
  expect(result.pdf.getPages().map((p) => p.getWidth())).toEqual([
    600, 500, 595,
  ]);
  expect(posts).toHaveLength(1);
});
