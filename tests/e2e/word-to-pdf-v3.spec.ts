import { test, expect, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import AxeBuilder from "@axe-core/playwright";
import {
  PDFDocument,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
  rgb,
} from "@cantoo/pdf-lib";
import { Document, Packer, Paragraph, PageBreak, TextRun } from "docx";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const dir = "docs/word-to-pdf/v3";
test.setTimeout(60_000);
async function sourcePdf(count = 3) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < count; i++) {
    const w = count === 3 ? [400, 501, 602][i] : 595;
    const p = pdf.addPage([w, 842]);
    p.drawRectangle({
      x: 0,
      y: 720,
      width: w,
      height: 122,
      color: rgb(59 / 255, 27 / 255, 79 / 255),
    });
    p.drawText(`SOURCE PAGE ${i + 1}`, {
      x: 30,
      y: 788,
      size: 24,
      color: rgb(1, 1, 1),
    });
    p.drawText("AUTHORED PDF FIXTURE / native response mocked", {
      x: 30,
      y: 750,
      size: 9,
      color: rgb(1, 1, 1),
    });
    p.drawText("Real PDF pages. Real visual edits.", {
      x: 30,
      y: 665,
      size: 18,
      color: rgb(59 / 255, 27 / 255, 79 / 255),
    });
    p.drawText("This verifies editing, not DOCX conversion fidelity.", {
      x: 30,
      y: 630,
      size: 11,
    });
    p.drawText("Preview and download share the final PDF bytes.", {
      x: 30,
      y: 607,
      size: 11,
    });
    for (let j = 0; j < 4; j++) {
      p.drawRectangle({
        x: 30,
        y: 480 - j * 60,
        width: w - 60,
        height: 44,
        color: rgb(0.96, 0.93, 0.95),
      });
      p.drawText(`Review item ${j + 1} - source ${i + 1}`, {
        x: 42,
        y: 497 - j * 60,
        size: 11,
      });
    }
  }
  return Buffer.from(await pdf.save());
}
async function docx() {
  return {
    name: "v3-review.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await Packer.toBuffer(
      new Document({
        sections: [
          {
            children: Array.from({ length: 3 }, (_, i) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Actual DOCX page ${i + 1}`,
                    bold: true,
                    size: 30,
                  }),
                ],
              }),
              new Paragraph(
                "Approximate browser comparison fixture. Native transport is mocked in this test.",
              ),
              ...(i < 2
                ? [new Paragraph({ children: [new PageBreak()] })]
                : []),
            ]).flat(),
          },
        ],
      }),
    ),
  };
}
async function engine(page: Page, count = 3) {
  const bytes = await sourcePdf(count),
    posts: Record<string, unknown>[] = [];
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
        JSON.stringify({ stage: "QA: authored PDF / mocked native response" }) +
        "\n" +
        JSON.stringify({
          result: bytes.toString("base64"),
          pages: count,
          base: true,
        }) +
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
  await synced(page);
}
async function synced(page: Page) {
  await expect(
    page.getByRole("button", { name: "Export complete PDF", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
}
function contents(pdf: PDFDocument, index: number) {
  const value = pdf.getPage(index).node.Contents();
  return (
    value instanceof PDFArray
      ? value.asArray().map((v) => pdf.context.lookup(v))
      : [value]
  )
    .map((v) =>
      v instanceof PDFRawStream
        ? Buffer.from(decodePDFRawStream(v).decode()).toString("latin1")
        : "",
    )
    .join("\n");
}
async function download(page: Page, name = "Export complete PDF") {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const file = await event;
  return { file, bytes: await readFile((await file.path())!) };
}

test("V3 actual page edits, history, selected appearance, watermark and final-page extraction (mocked native)", async ({
  page,
}) => {
  const posts = await engine(page);
  await convert(page);
  await page
    .getByRole("button", { name: "Open page editor", exact: true })
    .click();
  const editor = page.getByRole("region", {
    name: "Visual page editor",
    exact: true,
  });
  await editor
    .locator('[data-page-id="source-2"] svg')
    .first()
    .dragTo(editor.locator('[data-page-id="source-1"] svg').first());
  await synced(page);
  await expect(editor.locator("[data-page-id]").first()).toContainText(
    "Source page 2",
  );
  const reordered = await download(page);
  expect(
    (await PDFDocument.load(reordered.bytes))
      .getPages()
      .map((p) => p.getWidth()),
  ).toEqual([501, 400, 602]);
  await page
    .getByRole("button", { name: "Undo settings", exact: true })
    .click();
  await synced(page);
  await editor.getByLabel("Select output page 1", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Duplicate pages", exact: true })
    .click();
  await synced(page);
  await expect(editor.getByRole("status")).toContainText("1 of 4");
  await editor
    .getByRole("button", { name: "Rotate selected", exact: true })
    .click();
  await synced(page);
  await editor
    .getByRole("button", { name: "Insert blank page", exact: true })
    .click();
  await synced(page);
  await page
    .getByLabel("Selected page header", { exact: true })
    .fill("Inserted blank - QA annotation");
  await synced(page);
  await editor
    .getByRole("button", { name: "Deselect all pages", exact: true })
    .click();
  await editor.getByLabel("Select output page 4", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await synced(page);
  const cards = editor.locator("[data-page-id]");
  for (const pageNumber of [4, 3, 2]) {
    await editor
      .getByRole("button", { name: `Move page ${pageNumber} up`, exact: true })
      .click();
    await synced(page);
  }
  await synced(page);
  await expect(cards.nth(0)).toContainText("Source page 3");
  await page
    .getByRole("button", { name: "Undo settings", exact: true })
    .click();
  await synced(page);
  await expect(cards.nth(0)).toContainText("Source page 1");
  await page.getByRole("button", { name: "Redo edits", exact: true }).click();
  await synced(page);
  await expect(cards.nth(0)).toContainText("Source page 3");
  await editor.getByLabel("Select output page 1", { exact: true }).check();
  await editor.getByLabel("Editor section", { exact: true }).fill("Appendix");
  await editor
    .getByRole("button", { name: "Move to section", exact: true })
    .click();
  await synced(page);
  await expect(cards.nth(3)).toContainText("Appendix");
  await expect(
    page.getByRole("button", { name: "Redo edits", exact: true }),
  ).toBeDisabled();
  const settings = page.getByRole("complementary", {
    name: "Export settings",
    exact: true,
  });
  await settings
    .locator("summary")
    .filter({ hasText: "Page Management" })
    .click();
  await settings.getByLabel("Add page numbers", { exact: true }).check();
  await settings
    .getByLabel("Custom number template", { exact: true })
    .fill("{section} {n}/{total}");
  await settings.getByLabel("Numbering starts at", { exact: true }).fill("4");
  await settings
    .getByRole("combobox", { name: "Number format", exact: true })
    .selectOption("roman");
  await settings.getByLabel("Number output pages", { exact: true }).fill("2-4");
  await settings.locator("summary").filter({ hasText: "06" }).click();
  await settings.getByLabel("Text watermark", { exact: true }).fill("DRAFT");
  await settings
    .getByLabel("Watermark output pages", { exact: true })
    .fill("1,4");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#D6598F";
    x.beginPath();
    x.arc(64, 64, 56, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#3B1B4F";
    x.font = "bold 40px sans-serif";
    x.fillText("QK", 32, 78);
    return c.toDataURL("image/png").split(",")[1];
  });
  await settings
    .getByLabel("Local watermark image", { exact: true })
    .setInputFiles({
      name: "local-mark.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await synced(page);
  const full = await download(page),
    pdf = await PDFDocument.load(full.bytes);
  expect(pdf.getPageCount()).toBe(4);
  expect(pdf.getPages().map((p) => p.getWidth())).toEqual([400, 400, 400, 602]);
  expect(pdf.getPages().map((p) => p.getRotation().angle)).toEqual([
    0, 90, 0, 0,
  ]);
  expect(contents(pdf, 0)).not.toContain(
    Buffer.from("Main IV/IV").toString("hex").toUpperCase(),
  );
  expect(contents(pdf, 1)).toContain(
    Buffer.from("Main V/IV").toString("hex").toUpperCase(),
  );
  expect(contents(pdf, 3)).toContain(
    Buffer.from("Appendix VII/IV").toString("hex").toUpperCase(),
  );
  expect(contents(pdf, 0)).toContain(" Do");
  expect(contents(pdf, 1)).not.toContain(" Do");
  expect(contents(pdf, 2)).toContain(
    Buffer.from("Inserted blank - QA annotation").toString("hex").toUpperCase(),
  );
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/editor-demo-authored-fixture.pdf`, full.bytes);
  await settings.locator("summary").filter({ hasText: "06" }).click();
  await settings
    .locator("summary")
    .filter({ hasText: "Page Management" })
    .click();
  await page.getByLabel("Preview page number", { exact: true }).fill("4");
  await expect(
    page.getByRole("img", { name: "Converted PDF page 4", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${dir}/desktop-page-editor-mocked-engine.png`,
    fullPage: true,
  });
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  expect(axe.violations).toEqual([]);
  await editor.getByLabel("Page range selection", { exact: true }).fill("2,4");
  await editor
    .getByRole("button", { name: "Select range", exact: true })
    .click();
  const extracted = await download(page, "Extract selected PDF");
  const selected = await PDFDocument.load(extracted.bytes);
  expect(selected.getPageCount()).toBe(2);
  expect(selected.getPages().map((p) => p.getRotation().angle)).toEqual([
    90, 0,
  ]);
  expect(contents(selected, 0)).toContain(
    Buffer.from("Main V/IV").toString("hex").toUpperCase(),
  );
  expect(contents(selected, 1)).toContain(
    Buffer.from("Appendix VII/IV").toString("hex").toUpperCase(),
  );
  await page
    .getByLabel("Comparison view", { exact: true })
    .selectOption("docx");
  await expect(
    page.getByLabel("Word document view", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Approximate DOCX: 3 pages/)).toBeVisible();
  await page.getByLabel("Preview zoom", { exact: true }).selectOption("125");
  await expect(
    page.getByLabel("Converted Word document preview", { exact: true }),
  ).toHaveCSS("zoom", "1.25");
  await expect(
    page.getByLabel("Preview page number", { exact: true }),
  ).toHaveValue("4");
  await page.screenshot({
    path: `${dir}/comparison-linked-mocked-engine.png`,
    fullPage: true,
  });
  expect(posts).toHaveLength(1);
  // Explicit native refresh sends no local plan, text/image watermark or metadata.
  await settings
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("A5");
  await page
    .getByRole("button", { name: "Refresh preview", exact: true })
    .click();
  await synced(page);
  expect(posts).toHaveLength(2);
  expect(posts[1].visualPlan).toBeNull();
  expect(posts[1].imageWatermark).toBe("");
  expect(posts[1].watermarkText).toBe("");
});

test("V3 mobile touch page reordering, edit/preview panels and accessible export", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    const posts = await engine(page);
    await convert(page);
    await page
      .getByRole("navigation", { name: "Workspace panels" })
      .getByRole("button", { name: "Edit", exact: true })
      .tap();
    const editor = page.getByRole("region", {
      name: "Visual page editor",
      exact: true,
    });
    await editor
      .getByRole("button", { name: "Move page 1 down", exact: true })
      .tap();
    await synced(page);
    await expect(editor.locator("[data-page-id]").first()).toContainText(
      "Source page 2",
    );
    await editor.getByLabel("Select output page 1", { exact: true }).tap();
    await editor
      .getByRole("button", { name: "Rotate selected", exact: true })
      .tap();
    await synced(page);
    await editor
      .getByRole("button", { name: "Duplicate pages", exact: true })
      .tap();
    await synced(page);
    const file = await download(page);
    const pdf = await PDFDocument.load(file.bytes);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([
      501, 501, 400, 602,
    ]);
    expect(pdf.getPages().map((p) => p.getRotation().angle)).toEqual([
      90, 90, 0, 0,
    ]);
    await page
      .getByRole("navigation", { name: "Workspace panels" })
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await mkdir(dir, { recursive: true });
    await page.screenshot({
      path: `${dir}/mobile-edit-controls-mocked-engine.png`,
    });
    await editor
      .getByRole("region", { name: "Scrollable PDF pages", exact: true })
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await expect(
      editor.getByRole("img", { name: "Page 1 thumbnail", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `${dir}/mobile-touch-editor-mocked-engine.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include("main").analyze()).violations,
    ).toEqual([]);
    await editor
      .getByRole("button", { name: "View output page 2", exact: true })
      .tap();
    await expect(
      page.getByRole("img", { name: "Converted PDF page 2", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Fullscreen preview", exact: true })
      .tap();
    await expect(
      page.getByRole("dialog", { name: "PDF page preview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Converted PDF page 2", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `${dir}/mobile-fullscreen-mocked-engine.png`,
    });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "PDF page preview" }),
    ).toHaveCount(0);
    expect(posts).toHaveLength(1);
  } finally {
    await context.close();
  }
});

test("V3 actual 100-page browser fixture windows/revokes thumbnails and enforces the edit cap", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const live = new Set<string>();
    let peak = 0;
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      if (blob instanceof Blob && blob.type === "image/png") {
        live.add(url);
        peak = Math.max(peak, live.size);
      }
      return url;
    };
    URL.revokeObjectURL = (url) => {
      live.delete(url);
      revoke(url);
    };
    Object.assign(window, { thumbMetrics: () => ({ live: live.size, peak }) });
  });
  const posts = await engine(page, 100);
  await convert(page);
  await page
    .getByRole("button", { name: "Open page editor", exact: true })
    .click();
  const editor = page.getByRole("region", {
    name: "Visual page editor",
    exact: true,
  });
  await expect(
    editor.getByLabel("Select output page 1", { exact: true }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Go to page 1", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    editor.getByRole("img", { name: "Page 1 thumbnail", exact: true }),
  ).toBeVisible();
  const initialMountedRows = await editor.locator("[data-page-id]").count();
  expect(initialMountedRows).toBeLessThanOrEqual(10);
  await editor
    .getByRole("region", { name: "Scrollable PDF pages", exact: true })
    .evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  await expect(
    editor.getByLabel("Select output page 100", { exact: true }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Go to page 100", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    editor.getByRole("img", { name: "Page 100 thumbnail", exact: true }),
  ).toBeVisible();
  const lastMountedRows = await editor.locator("[data-page-id]").count();
  expect(lastMountedRows).toBeLessThanOrEqual(10);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as unknown as { thumbMetrics: () => { live: number } };
        return w.thumbMetrics().live;
      }),
    )
    .toBeLessThanOrEqual(10);
  await editor
    .getByRole("button", { name: "Insert blank page", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText("1–100");
  await synced(page);
  const file = await download(page);
  expect((await PDFDocument.load(file.bytes)).getPageCount()).toBe(100);
  const metrics = await page.evaluate(() => {
    const w = window as unknown as {
      thumbMetrics: () => { live: number; peak: number };
    };
    return w.thumbMetrics();
  });
  expect(metrics.peak).toBeLessThanOrEqual(18);
  await mkdir(dir, { recursive: true });
  await writeFile(
    `${dir}/browser-100-page-fixture-metrics.json`,
    JSON.stringify(
      {
        fixture:
          "Authored PDF, mocked native response; not a DOCX conversion stress test",
        outputPages: 100,
        maximumMountedRowsBound: 10,
        initialMountedRows,
        lastMountedRows,
        ...metrics,
      },
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "File queue", exact: true }).click();
  await page.getByRole("button", { name: "Clear files", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as unknown as { thumbMetrics: () => { live: number } };
        return w.thumbMetrics().live;
      }),
    )
    .toBe(0);
  expect(posts).toHaveLength(1);
});

test("V3 unavailable installation shows setup requirements, not fake pages", async ({
  page,
}) => {
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
  await page.goto("/tools/word-to-pdf");
  await expect(
    page.getByText("Conversion engine is not enabled on this installation", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open page editor", exact: true })
    .click();
  await expect(
    page.getByText(/Convert a DOCX to unlock editing/).first(),
  ).toBeVisible();
  await mkdir(dir, { recursive: true });
  await page.screenshot({
    path: `${dir}/desktop-engine-unavailable.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Workspace panels" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.screenshot({
    path: `${dir}/mobile-engine-unavailable.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("img", { name: /Converted PDF page/ }),
  ).toHaveCount(0);
});

test("V3 changed native pagination blocks stale plans and reset recovers locally", async ({
  page,
}) => {
  const posts = await engine(page);
  await convert(page);
  await page
    .getByRole("button", { name: "Open page editor", exact: true })
    .click();
  const editor = page.getByRole("region", {
    name: "Visual page editor",
    exact: true,
  });
  await editor.getByLabel("Select output page 1", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Duplicate pages", exact: true })
    .click();
  await synced(page);
  const replacement = await sourcePdf(2);
  let refreshes = 0;
  await page.route("**/api/word-to-pdf", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    refreshes++;
    return route.fulfill({
      contentType: "application/x-ndjson",
      body:
        JSON.stringify({
          result: replacement.toString("base64"),
          pages: 2,
          base: true,
        }) + "\n",
    });
  });
  await page
    .getByRole("complementary", { name: "Export settings", exact: true })
    .getByRole("combobox", { name: "Page size", exact: true })
    .selectOption("A5");
  await page
    .getByRole("button", { name: "Refresh preview", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Native pagination changed",
  );
  await expect(
    page.getByRole("button", { name: "Export complete PDF", exact: true }),
  ).toBeDisabled();
  await editor
    .getByRole("button", { name: "Reset visual page edits", exact: true })
    .click();
  await synced(page);
  const output = await download(page);
  expect((await PDFDocument.load(output.bytes)).getPageCount()).toBe(2);
  expect(refreshes).toBe(1);
  expect(posts).toHaveLength(1);
});

test("V3 local cancellation locks export; retry after consent revocation never uploads", async ({
  page,
}) => {
  // Artificial yield latency makes the cancel control reachable; this is not a speed benchmark.
  await page.addInitScript(() => {
    const timer = window.setTimeout.bind(window);
    window.setTimeout = ((
      handler: TimerHandler,
      delay = 0,
      ...args: unknown[]
    ) =>
      timer(
        handler,
        delay === 0 ? 50 : delay,
        ...args,
      )) as typeof window.setTimeout;
  });
  const posts = await engine(page, 100);
  await convert(page);
  await page
    .getByRole("button", { name: "Open page editor", exact: true })
    .click();
  const settings = page.getByRole("complementary", {
    name: "Export settings",
    exact: true,
  });
  await settings
    .locator("summary")
    .filter({ hasText: "Page Management" })
    .click();
  await settings
    .getByLabel("Custom header", { exact: true })
    .fill("Retried local update");
  await settings
    .getByRole("button", { name: "Cancel PDF update", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Local PDF update cancelled",
  );
  await expect(
    page.getByRole("button", { name: "Export complete PDF", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("I agree to upload").uncheck();
  await settings
    .getByRole("button", { name: "Retry PDF update", exact: true })
    .click();
  await synced(page);
  const output = await download(page);
  expect(contents(await PDFDocument.load(output.bytes), 99)).toContain(
    Buffer.from("Retried local update").toString("hex").toUpperCase(),
  );
  expect(posts).toHaveLength(1);
});

test("V3 worker ZIP has real progress, cancellation, retry, custom names and unchanged PDF bytes", async ({
  page,
}) => {
  // Delay only export-worker chunk delivery, not the ZIP algorithm, to exercise cancellation reliably.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      terminated = false;
      override terminate() {
        this.terminated = true;
        super.terminate();
      }
      override postMessage(
        message: unknown,
        transfer: Transferable[] | StructuredSerializeOptions = [],
      ) {
        const m = message as { type?: string };
        if (m?.type === "chunk")
          window.setTimeout(() => {
            if (!this.terminated)
              super.postMessage(message, transfer as Transferable[]);
          }, 1000);
        else super.postMessage(message, transfer as Transferable[]);
      }
    };
  });
  const posts = await engine(page);
  await convert(page);
  const original = await download(page);
  let downloads = 0;
  page.on("download", () => downloads++);
  await page
    .getByRole("button", { name: "Download all ZIP (1)", exact: true })
    .click();
  await expect(
    page.getByRole("progressbar", {
      name: "ZIP packing progress",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel ZIP export", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "ZIP export cancelled",
  );
  await page
    .getByLabel("ZIP filename", { exact: true })
    .fill("custom review.zip");
  const zip = await download(page, "Download all ZIP (1)");
  expect(zip.file.suggestedFilename()).toBe("custom review.zip");
  const entries = unzipSync(zip.bytes);
  expect(Buffer.from(entries["1-v3-review.pdf"])).toEqual(original.bytes);
  expect(entries["conversion-report.json"]).toBeTruthy();
  expect(downloads).toBe(1);
  expect(posts).toHaveLength(1);
});
