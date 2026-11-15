import { test, expect, type Locator, type Page } from "./helpers/tool-test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { PDFDocument, PDFName, StandardFonts, rgb } from "@cantoo/pdf-lib";

type Upload = { name: string; mimeType: string; buffer: Buffer };

/* -------------------------------- fixtures -------------------------------- */

async function imageFixture(
  page: Page,
  options: {
    width: number;
    height: number;
    name: string;
    type?: string;
    transparent?: boolean;
    quality?: number;
  },
): Promise<Upload> {
  const {
    width,
    height,
    name,
    type = "image/png",
    transparent,
    quality,
  } = options;
  const base64 = await page.evaluate(
    async ([w, h, mime, alpha, q]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      if (!alpha) {
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, "#6c35e8");
        gradient.addColorStop(0.55, "#8f7bf0");
        gradient.addColorStop(1, "#e8b04b");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.fillStyle = "#d62d20";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 3, 0, Math.PI * 2);
      ctx.fill();
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((value) => resolve(value!), mime, q),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    [width, height, type, Boolean(transparent), quality] as const,
  );
  return { name, mimeType: type, buffer: Buffer.from(base64, "base64") };
}

async function makePdf(pages: number): Promise<Upload> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawRectangle({
      x: 40,
      y: 500,
      width: 515,
      height: 280,
      color: rgb(0.42, 0.2, 0.9 - index * 0.02),
    });
    page.drawText(`Page ${index + 1}`, {
      x: 60,
      y: 610,
      size: 54,
      font,
      color: rgb(1, 1, 1),
    });
  }
  const bytes = await doc.save();
  return {
    name: "sample.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  };
}

async function browserSize(page: Page, buffer: Buffer, mimeType: string) {
  return page.evaluate(
    async ([base64, type]) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type });
      try {
        const bitmap = await createImageBitmap(blob);
        const size = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return size;
      } catch {
        return null;
      }
    },
    [buffer.toString("base64"), mimeType] as const,
  );
}

async function cornerPixel(page: Page, buffer: Buffer, mimeType: string) {
  return page.evaluate(
    async ([base64, type]) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    },
    [buffer.toString("base64"), mimeType] as const,
  );
}

/* --------------------------------- helpers -------------------------------- */

async function upload(
  page: Page,
  files: Upload[],
  expectedCount = files.length,
) {
  await page.getByTestId("images-to-pdf-input").setInputFiles(files);
  await expect(page.getByTestId("converter-item")).toHaveCount(expectedCount);
  await expect(page.getByText("Reading…")).toHaveCount(0, { timeout: 15000 });
}

async function runConversion(page: Page) {
  const button = page.getByTestId("converter-run");
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toBeEnabled({ timeout: 60000 });
}

async function downloadFrom(page: Page, target: Locator) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    target.click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("The download did not produce a file.");
  return {
    name: download.suggestedFilename(),
    buffer: await readFile(path),
  };
}

/** The single Download button on the one result card. */
function downloadButton(page: Page) {
  return page
    .getByTestId("converter-result")
    .getByRole("button", { name: /^Download / });
}

/**
 * Set a React-controlled input through the native value setter. Assigning
 * element.value directly updates React's tracker, which then swallows the
 * following input event and leaves the controlled state unchanged.
 */
async function setNativeValue(target: Locator, value: number) {
  await target.evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(element, String(next));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

/* ---------------------------- output inspectors --------------------------- */

/**
 * pdf-lib writes both the page content stream and the image streams, and this
 * fork exposes neither through a public "get the images" helper, so read the
 * page dictionary directly. Everything below inspects the real saved bytes of
 * the downloaded PDF rather than anything the UI claims.
 */
type RawStream = {
  dict: { get: (name: unknown) => { toString(): string } };
  contents: Uint8Array;
};

/** Every image XObject on one page: its raster size and the real JPEG bytes. */
function embeddedImages(pdf: PDFDocument, pageIndex: number) {
  const context = pdf.context;
  const xObjects = pdf
    .getPage(pageIndex)
    .node.Resources()
    ?.get(PDFName.of("XObject")) as
    { entries: () => Iterable<[unknown, unknown]> } | undefined;
  if (!xObjects) throw new Error(`Page ${pageIndex + 1} has no image XObject.`);
  const found: { width: number; height: number; jpeg: Buffer }[] = [];
  for (const [, reference] of xObjects.entries()) {
    const stream = context.lookup(reference as never) as unknown as RawStream;
    found.push({
      width: Number(stream.dict.get(PDFName.of("Width")).toString()),
      height: Number(stream.dict.get(PDFName.of("Height")).toString()),
      jpeg: Buffer.from(stream.contents),
    });
  }
  return found;
}

/** The single image on a page, asserting there is exactly one per page. */
function theEmbeddedImage(pdf: PDFDocument, pageIndex: number) {
  const images = embeddedImages(pdf, pageIndex);
  expect(images).toHaveLength(1);
  return images[0];
}

/** Decompress a page's content stream into its drawing instructions. */
function pageInstructions(pdf: PDFDocument, pageIndex: number) {
  const contents = pdf.context.lookup(
    pdf.getPage(pageIndex).node.Contents() as never,
  ) as unknown as { lookup: (index: number) => RawStream };
  return inflateSync(Buffer.from(contents.lookup(0).contents)).toString(
    "latin1",
  );
}

/** The page background fill colour, as three 0-1 components. */
function pageFillColour(pdf: PDFDocument, pageIndex: number) {
  const match = /([0-9.eE+-]+) ([0-9.eE+-]+) ([0-9.eE+-]+) rg/.exec(
    pageInstructions(pdf, pageIndex),
  );
  if (!match) throw new Error("The page has no background fill colour.");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

const twoPortraits = async (page: Page) => [
  await imageFixture(page, { width: 500, height: 900, name: "tall-one.png" }),
  await imageFixture(page, { width: 500, height: 900, name: "tall-two.png" }),
];

/* ---------------------------------- tests --------------------------------- */

test.describe("Images to PDF Converter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
  });

  test("starts with an empty workspace and a disabled convert button", async ({
    page,
  }) => {
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
    await expect(page.locator("#converter-preview-panel")).toContainText(
      /add images/i,
    );
  });

  test("queues several images at once", async ({ page }) => {
    await upload(page, [
      await imageFixture(page, { width: 400, height: 300, name: "one.png" }),
      await imageFixture(page, { width: 300, height: 400, name: "two.png" }),
      await imageFixture(page, {
        width: 500,
        height: 500,
        name: "three.jpg",
        type: "image/jpeg",
        quality: 0.9,
      }),
    ]);
    await expect(page.getByTestId("converter-item")).toHaveCount(3);
    await expect(page.getByTestId("converter-item").nth(2)).toContainText(
      "three.jpg",
    );
  });

  test("rejects a PDF instead of putting a picture of a PDF on a page", async ({
    page,
  }) => {
    await page
      .getByTestId("images-to-pdf-input")
      .setInputFiles(await makePdf(2));
    await expect(page.getByTestId("converter-status")).toContainText(
      /is a PDF\. Use PDF Studio or PDF to Image Converter/i,
    );
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
  });

  test("rejects a non-image file and says why", async ({ page }) => {
    await page.getByTestId("images-to-pdf-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await expect(page.getByTestId("converter-status")).toContainText(
      /not a supported file type/i,
    );
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
  });

  test("rejects an empty file rather than writing a blank page", async ({
    page,
  }) => {
    await page.getByTestId("images-to-pdf-input").setInputFiles({
      name: "zero.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(0),
    });
    await expect(page.getByTestId("converter-status")).toContainText(
      /is empty/i,
    );
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
  });

  test("writes one A4 page per image, with real images and no text layer", async ({
    page,
  }) => {
    await upload(page, [
      await imageFixture(page, {
        width: 500,
        height: 700,
        name: "page-one.png",
      }),
      await imageFixture(page, {
        width: 800,
        height: 450,
        name: "page-two.png",
      }),
    ]);
    await page.getByLabel("PDF file name").fill("album.pdf");
    await page.getByLabel("PDF page size").selectOption("a4");
    await setNativeValue(page.getByLabel("Page margin in millimetres"), 20);
    await runConversion(page);

    const card = page.getByTestId("converter-result");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("2 pages");

    const file = await downloadFrom(page, downloadButton(page));
    expect(file.name).toBe("album.pdf");
    expect(file.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    // A raster-only PDF must not embed a text font.
    expect(file.buffer.includes(Buffer.from("/Type1"))).toBe(false);
    expect(file.buffer.includes(Buffer.from("/Type0"))).toBe(false);
    expect(file.buffer.includes(Buffer.from("Helvetica"))).toBe(false);

    const pdf = await PDFDocument.load(file.buffer);
    expect(pdf.getPageCount()).toBe(2);
    for (const index of [0, 1]) {
      const size = pdf.getPage(index).getSize();
      expect(size.width).toBeCloseTo(595.28, 0);
      expect(size.height).toBeCloseTo(841.89, 0);
    }

    // Each page really carries a decodable JPEG of the source dimensions.
    const first = theEmbeddedImage(pdf, 0);
    expect(first.width).toBe(500);
    expect(first.height).toBe(700);
    expect(first.jpeg.subarray(0, 2).toString("hex")).toBe("ffd8");
    expect(await browserSize(page, first.jpeg, "image/jpeg")).toEqual({
      width: 500,
      height: 700,
    });
    // Not a blank rectangle: the fixture's red circle reaches the corner test.
    expect(await cornerPixel(page, first.jpeg, "image/jpeg")).not.toEqual([
      0, 0, 0, 255,
    ]);

    const second = theEmbeddedImage(pdf, 1);
    expect(second.width).toBe(800);
    expect(second.height).toBe(450);
  });

  test("names the file and writes the document title", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await page.getByLabel("PDF file name").fill("holiday-2026.pdf");
    await page.getByLabel("PDF document title").fill("Holiday album");
    await runConversion(page);

    const file = await downloadFrom(page, downloadButton(page));
    expect(file.name).toBe("holiday-2026.pdf");
    const pdf = await PDFDocument.load(file.buffer);
    expect(pdf.getTitle()).toBe("Holiday album");
  });

  test("reports the real page count and file size", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await runConversion(page);

    const file = await downloadFrom(page, downloadButton(page));
    const pdf = await PDFDocument.load(file.buffer);
    const card = page.getByTestId("converter-result");
    await expect(card).toContainText(`${pdf.getPageCount()} pages`);
    // The card states the size of the file it is about to hand over, using the
    // same formatter as the rest of the app ("123.4 KB").
    await expect(card).toContainText(
      `${(file.buffer.length / 1024).toFixed(1)} KB`,
    );
  });
});

test.describe("Images to PDF Converter — page setup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
  });

  test("honours the chosen paper size and orientation", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await page.getByLabel("PDF page size").selectOption("a5");
    await page.getByLabel("Page orientation").selectOption("landscape");
    await runConversion(page);

    const pdf = await PDFDocument.load(
      (await downloadFrom(page, downloadButton(page))).buffer,
    );
    const size = pdf.getPage(0).getSize();
    // A5 is 148 x 210 mm; landscape swaps the two.
    expect(size.width).toBeCloseTo((210 * 72) / 25.4, 0);
    expect(size.height).toBeCloseTo((148 * 72) / 25.4, 0);
  });

  test("accepts a custom page size in millimetres", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await page.getByLabel("PDF page size").selectOption("custom");
    await setNativeValue(
      page.getByLabel("Custom page width in millimetres"),
      100,
    );
    await setNativeValue(
      page.getByLabel("Custom page height in millimetres"),
      150,
    );
    await runConversion(page);

    const pdf = await PDFDocument.load(
      (await downloadFrom(page, downloadButton(page))).buffer,
    );
    const size = pdf.getPage(0).getSize();
    // 100 mm = 283.46 pt and 150 mm = 425.2 pt.
    expect(size.width).toBeCloseTo(283.46, 0);
    expect(size.height).toBeCloseTo(425.2, 0);
  });

  test("refuses margins that leave no room for an image", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await page.getByLabel("PDF page size").selectOption("custom");
    await setNativeValue(
      page.getByLabel("Custom page width in millimetres"),
      100,
    );
    await setNativeValue(
      page.getByLabel("Custom page height in millimetres"),
      100,
    );
    // 60 mm on every side of a 100 mm page leaves nothing to draw on.
    await setNativeValue(page.getByLabel("Page margin in millimetres"), 60);
    await runConversion(page);

    await expect(page.getByTestId("converter-status")).toContainText(
      /margins are too large/i,
    );
    await expect(page.getByTestId("converter-result")).toHaveCount(0);
  });

  test("keeps the whole image with contain fit", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await page.getByLabel("Image fit on page").selectOption("contain");
    await runConversion(page);

    const pdf = await PDFDocument.load(
      (await downloadFrom(page, downloadButton(page))).buffer,
    );
    const placed = theEmbeddedImage(pdf, 0);
    // Contain never crops, so the source aspect ratio survives.
    expect(placed.width / placed.height).toBeCloseTo(500 / 900, 2);
  });

  test("crops to fill when cover fit is chosen", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await setNativeValue(page.getByLabel("Page margin in millimetres"), 20);
    await page.getByLabel("Image fit on page").selectOption("cover");
    await runConversion(page);

    const pdf = await PDFDocument.load(
      (await downloadFrom(page, downloadButton(page))).buffer,
    );
    const placed = theEmbeddedImage(pdf, 0);
    // Cover takes the content box's own aspect ratio, not the source's.
    // A4 (595.28 x 841.89 pt) less 20 mm (56.69 pt) on every side.
    const boxRatio = (595.28 - 113.39) / (841.89 - 113.39);
    expect(placed.width / placed.height).toBeCloseTo(boxRatio, 1);
    expect(placed.width / placed.height).not.toBeCloseTo(500 / 900, 1);
  });

  test("paints the page background with the chosen colour", async ({
    page,
  }) => {
    await upload(page, await twoPortraits(page));
    await page.getByLabel("PDF background hex value").fill("#123456");
    await runConversion(page);

    const pdf = await PDFDocument.load(
      (await downloadFrom(page, downloadButton(page))).buffer,
    );
    const [red, green, blue] = pageFillColour(pdf, 0);
    expect(red).toBeCloseTo(0x12 / 255, 6);
    expect(green).toBeCloseTo(0x34 / 255, 6);
    expect(blue).toBeCloseTo(0x56 / 255, 6);
    // Every page gets the same background, not just the first.
    expect(pageFillColour(pdf, 1)).toEqual([red, green, blue]);
  });
});

test.describe("Images to PDF Converter — quality and resolution", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
  });

  test("a lower embedded quality produces a smaller PDF", async ({ page }) => {
    await upload(page, [
      await imageFixture(page, {
        width: 1200,
        height: 1600,
        name: "detail.png",
      }),
    ]);

    await setNativeValue(page.getByLabel("Embedded image quality"), 95);
    await runConversion(page);
    const high = (await downloadFrom(page, downloadButton(page))).buffer.length;

    await setNativeValue(page.getByLabel("Embedded image quality"), 40);
    await runConversion(page);
    const low = (await downloadFrom(page, downloadButton(page))).buffer.length;

    expect(low).toBeLessThan(high);
    // A real quality change, not rounding noise.
    expect(low).toBeLessThan(high * 0.8);
  });

  test("a higher DPI embeds a larger raster", async ({ page }) => {
    // The source has to be bigger than the 96 DPI target, otherwise both
    // settings land on the same pixels and the test proves nothing.
    const large = [
      await imageFixture(page, {
        width: 1600,
        height: 2400,
        name: "big.png",
      }),
    ];

    await upload(page, large);
    await page
      .getByLabel("Embedded image resolution in DPI")
      .selectOption("96");
    await runConversion(page);
    const at96 = theEmbeddedImage(
      await PDFDocument.load(
        (await downloadFrom(page, downloadButton(page))).buffer,
      ),
      0,
    );

    await page
      .getByLabel("Embedded image resolution in DPI")
      .selectOption("300");
    await runConversion(page);
    const at300 = theEmbeddedImage(
      await PDFDocument.load(
        (await downloadFrom(page, downloadButton(page))).buffer,
      ),
      0,
    );

    expect(at300.width * at300.height).toBeGreaterThan(
      at96.width * at96.height,
    );
    // 96 DPI over an A4 content box is well under the source resolution.
    expect(at96.width).toBeLessThan(1600);
    // 300 DPI keeps the full source, capped by the engine's 3,600 px side.
    expect(at300.width).toBe(1600);
    expect(at300.height).toBe(2400);
  });
});

test.describe("Images to PDF Converter — order and rotation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
  });

  test("reordering with the buttons changes the queue order", async ({
    page,
  }) => {
    await upload(page, await twoPortraits(page));
    await page
      .getByRole("button", { name: "Move tall-two.png earlier" })
      .click();
    await expect(page.getByTestId("converter-item").first()).toContainText(
      "tall-two.png",
    );
    await page.getByRole("button", { name: "Move tall-two.png later" }).click();
    await expect(page.getByTestId("converter-item").first()).toContainText(
      "tall-one.png",
    );
  });

  test("duplicating a page inserts a copy directly after it", async ({
    page,
  }) => {
    await upload(page, await twoPortraits(page));
    await expect(page.getByTestId("converter-item")).toHaveCount(2);

    await page.getByRole("button", { name: "Duplicate tall-one.png" }).click();

    await expect(page.getByTestId("converter-item")).toHaveCount(3);
    // The copy lands immediately after its source, not at the end.
    await expect(page.getByTestId("converter-item").nth(0)).toContainText(
      "tall-one.png",
    );
    await expect(page.getByTestId("converter-item").nth(1)).toContainText(
      "tall-one.png",
    );
    await expect(page.getByTestId("converter-item").nth(2)).toContainText(
      "tall-two.png",
    );
  });

  test("removing a duplicate leaves the original preview intact", async ({
    page,
  }) => {
    await upload(page, await twoPortraits(page));
    await page.getByRole("button", { name: "Duplicate tall-one.png" }).click();
    await expect(page.getByTestId("converter-item")).toHaveCount(3);

    // Each row owns its own object URL, so revoking one must not blank the
    // other. The surviving original keeps a real preview image.
    await page
      .getByRole("button", { name: "Remove tall-one.png" })
      .first()
      .click();
    await expect(page.getByTestId("converter-item")).toHaveCount(2);
    await expect(
      page.getByTestId("converter-item").first().locator("img"),
    ).toHaveAttribute("src", /^blob:/);
  });

  test("duplicating carries the page rotation across", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await page
      .getByRole("button", {
        name: "Rotate tall-one.png 90 degrees clockwise",
      })
      .click();
    await page.getByRole("button", { name: "Duplicate tall-one.png" }).click();

    await expect(page.getByTestId("converter-item").nth(0)).toContainText(/90/);
    await expect(page.getByTestId("converter-item").nth(1)).toContainText(/90/);
  });

  test("dragging one page onto another reorders the queue", async ({
    page,
  }) => {
    await upload(page, await twoPortraits(page));
    const items = page.getByTestId("converter-item");
    await items.first().dragTo(items.nth(1));
    await expect(items.first()).toContainText("tall-two.png");
  });

  test("turning a page rotates that page and only that page", async ({
    page,
  }) => {
    await upload(page, await twoPortraits(page));
    await page
      .getByRole("button", {
        name: "Rotate tall-one.png 90 degrees clockwise",
      })
      .click();

    // The angle is visible in the row, never an invisible state.
    await expect(page.getByTestId("converter-item").first()).toContainText(
      "turned 90°",
    );
    await expect(page.getByTestId("converter-item").nth(1)).not.toContainText(
      "turned",
    );

    await runConversion(page);
    const pdf = await PDFDocument.load(
      (await downloadFrom(page, downloadButton(page))).buffer,
    );
    expect(pdf.getPageCount()).toBe(2);

    // Page one came from a 500 x 900 portrait source turned a quarter turn, so
    // its embedded raster is landscape. Page two was left upright.
    const turned = theEmbeddedImage(pdf, 0);
    const upright = theEmbeddedImage(pdf, 1);
    expect(turned.width).toBe(900);
    expect(turned.height).toBe(500);
    expect(upright.width).toBe(500);
    expect(upright.height).toBe(900);
  });

  test("four quarter turns put the page back upright", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    const rotate = page.getByRole("button", {
      name: "Rotate tall-one.png 90 degrees clockwise",
    });
    for (let index = 0; index < 4; index += 1) await rotate.click();
    // The label wraps back to zero rather than reading "turned 360°".
    await expect(page.getByTestId("converter-item").first()).not.toContainText(
      "turned",
    );

    await runConversion(page);
    const placed = theEmbeddedImage(
      await PDFDocument.load(
        (await downloadFrom(page, downloadButton(page))).buffer,
      ),
      0,
    );
    expect(placed.width).toBe(500);
    expect(placed.height).toBe(900);
  });

  test("removing an image removes its page", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await page.getByRole("button", { name: "Remove tall-one.png" }).click();
    await expect(page.getByTestId("converter-item")).toHaveCount(1);
    await runConversion(page);

    const pdf = await PDFDocument.load(
      (await downloadFrom(page, downloadButton(page))).buffer,
    );
    expect(pdf.getPageCount()).toBe(1);
  });
});

test.describe("Images to PDF Converter — preview workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
  });

  test("shows a live layout preview, then the rendered PDF pages", async ({
    page,
  }) => {
    await upload(page, await twoPortraits(page));
    await expect(
      page.getByAltText("Page layout preview for tall-one.png"),
    ).toBeVisible();
    await expect(page.getByText(/Live layout preview/)).toContainText(
      /A4 portrait/,
    );

    await runConversion(page);
    await page.getByRole("button", { name: "PDF", exact: true }).click();
    // The gallery renders the file that was actually written.
    await expect(page.getByTestId("converter-pdf-page")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByLabel("Page number")).toHaveValue("2");
  });

  test("the layout preview turns with the page", async ({ page }) => {
    await upload(page, await twoPortraits(page));
    await expect(page.getByText(/Live layout preview/)).not.toContainText(
      /turned/,
    );
    await page
      .getByRole("button", {
        name: "Rotate tall-one.png 90 degrees clockwise",
      })
      .click();
    // The preview must agree with the PDF rather than keep showing the
    // upright image.
    await expect(page.getByText(/Live layout preview/)).toContainText(
      /turned 90°/,
    );
  });
});

test.describe("Images to PDF Converter — access and evidence", () => {
  test("stays accessible from a 375px phone to a desktop", async ({ page }) => {
    for (const [width, height] of [
      [375, 812],
      [768, 1024],
      [1440, 1000],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/tools/images-to-pdf");
      await upload(page, [
        await imageFixture(page, {
          width: 400,
          height: 300,
          name: `shot-${width}.png`,
        }),
      ]);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.map((violation) => violation.id),
        `axe violations at ${width}px`,
      ).toEqual([]);
    }
  });

  test("captures workspace screenshots for the evidence pack", async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.CAPTURE_SHOTS,
      "Screenshot capture runs in the dedicated workflow.",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/tools/images-to-pdf");
    await upload(page, await twoPortraits(page));
    await page
      .getByRole("button", {
        name: "Rotate tall-one.png 90 degrees clockwise",
      })
      .click();
    // Full-page captures repeat fixed headers mid-document; pin them so the
    // evidence shows the real page without an overlay across the workspace.
    await page.addStyleTag({
      content:
        ".site-header{position:static!important} .converter-preview{position:static!important}",
    });
    await page.screenshot({
      path: testInfo.outputPath("images-to-pdf-workspace.png"),
      fullPage: true,
    });
  });
});
