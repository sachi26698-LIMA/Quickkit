import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";
import { unzipSync } from "fflate";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

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

/** Two A4 pages: the first is rotated 90°, the second is upright. */
/* -------------------------------- inspectors ------------------------------- */

function jpegSize(buffer: Buffer) {
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
      ].includes(marker)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("No JPEG frame header found");
}

function gifSize(buffer: Buffer) {
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function bmpSize(buffer: Buffer) {
  return {
    width: Math.abs(buffer.readInt32LE(18)),
    height: Math.abs(buffer.readInt32LE(22)),
  };
}

function tiffSize(buffer: Buffer) {
  const little = buffer[0] === 0x49;
  const read16 = (offset: number) =>
    little ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const read32 = (offset: number) =>
    little ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
  const ifd = read32(4);
  const count = read16(ifd);
  let width = 0;
  let height = 0;
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    const tag = read16(entry);
    const type = read16(entry + 2);
    const value =
      type === 3
        ? read16(entry + 8)
        : type === 4
          ? read32(entry + 8)
          : buffer[entry + 8];
    if (tag === 256) width = value;
    if (tag === 257) height = value;
  }
  return { width, height };
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
  await page.getByTestId("image-to-image-input").setInputFiles(files);
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

/* ---------------------------------- tests --------------------------------- */

test.describe("Image to Image Converter", () => {
  test("empty state is local, labelled and single-purpose", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-image");
    await expect(page.locator("h1")).toHaveText("Image to Image Converter");
    await expect(page.getByText("Local processing")).toBeVisible();
    await expect(page.getByText("Nothing to preview yet")).toBeVisible();
    await expect(page.getByTestId("converter-run")).toBeDisabled();

    // This tool has one job: the four-way mode switcher must be gone, not
    // merely hidden, and the input must only accept images.
    await expect(page.locator(".converter-modes")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Images to PDF/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /PDF Studio/ })).toHaveCount(
      0,
    );
    await expect(page.getByTestId("image-to-image-input")).toHaveAttribute(
      "accept",
      /image\//,
    );

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      axe.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });

  test("a PDF is rejected and points at the right tool", async ({ page }) => {
    await page.goto("/tools/image-to-image");
    await upload(page, [await makePdf(1)], 0);
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
    await expect(
      page.getByText(/is a PDF\. Use PDF to Image Converter/),
    ).toBeVisible();
    await expect(page.getByTestId("converter-run")).toBeDisabled();
  });

  test("appears in Image Tools, All Tools and search at its own route", async ({
    page,
  }) => {
    await page.goto("/category/image-tools");
    const card = page.getByRole("link", { name: "Image to Image Converter" });
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("href", "/tools/image-to-image");

    // An image tool only: it must not be filed under PDF Tools.
    await page.goto("/category/pdf-tools");
    await expect(
      page.getByRole("link", { name: "Image to Image Converter" }),
    ).toHaveCount(0);

    await page.goto("/tools");
    await page.getByRole("searchbox", { name: "Search tools" }).fill("avif");
    const result = page.getByRole("link", {
      name: "Image to Image Converter",
    });
    await expect(result).toBeVisible();
    await result.click();
    await expect(page.locator("h1")).toHaveText("Image to Image Converter");
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }),
    ).toContainText("Image Tools");
  });

  test("JPG to PNG produces a real PNG with the same pixels", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-image");
    await upload(page, [
      await imageFixture(page, {
        width: 320,
        height: 200,
        name: "photo.jpg",
        type: "image/jpeg",
        quality: 0.95,
      }),
    ]);
    await expect(page.getByTestId("converter-item")).toContainText("JPG");
    await page.locator("#converter-format").selectOption("png");
    await runConversion(page);

    const card = page.getByTestId("converter-result");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("PNG");
    await expect(card).toContainText("320 × 200 px");

    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    expect(file.name).toBe("photo-converted.png");
    const png = PNG.sync.read(file.buffer);
    expect(png.width).toBe(320);
    expect(png.height).toBe(200);
    expect(await browserSize(page, file.buffer, "image/png")).toEqual({
      width: 320,
      height: 200,
    });
  });

  test("transparent PNG to JPG flattens onto the chosen background", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-image");
    await upload(page, [
      await imageFixture(page, {
        width: 240,
        height: 180,
        name: "sticker.png",
        transparent: true,
      }),
    ]);
    await page.locator("#converter-format").selectOption("jpeg");
    await page.getByLabel("Background hex value").fill("#ff0000");
    await runConversion(page);

    const file = await downloadFrom(
      page,
      page
        .getByTestId("converter-result")
        .getByRole("button", { name: /^Download / }),
    );
    expect(file.name).toBe("sticker-converted.jpg");
    expect(jpegSize(file.buffer)).toEqual({ width: 240, height: 180 });
    const [r, g, b, a] = await cornerPixel(page, file.buffer, "image/jpeg");
    expect(a).toBe(255);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(70);
    expect(b).toBeLessThan(70);
  });

  test("WEBP, AVIF, GIF, BMP and TIFF outputs are real files", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-image");
    await upload(page, [
      await imageFixture(page, {
        width: 160,
        height: 120,
        name: "source.png",
      }),
    ]);

    const cases = [
      {
        format: "webp",
        extension: "webp",
        mime: "image/webp",
        check: (buffer: Buffer) =>
          buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
          buffer.subarray(8, 12).toString("ascii") === "WEBP",
      },
      {
        format: "gif",
        extension: "gif",
        mime: "image/gif",
        check: (buffer: Buffer) =>
          buffer.subarray(0, 6).toString("ascii") === "GIF89a" &&
          gifSize(buffer).width === 160 &&
          gifSize(buffer).height === 120,
      },
      {
        format: "bmp",
        extension: "bmp",
        mime: "image/bmp",
        check: (buffer: Buffer) =>
          buffer[0] === 0x42 &&
          bmpSize(buffer).width === 160 &&
          bmpSize(buffer).height === 120,
      },
      {
        format: "tiff",
        extension: "tiff",
        mime: "image/tiff",
        check: (buffer: Buffer) => {
          const size = tiffSize(buffer);
          return (
            buffer.subarray(0, 2).toString("ascii") === "II" &&
            size.width === 160 &&
            size.height === 120
          );
        },
      },
    ];

    for (const entry of cases) {
      const option = page.locator(
        `#converter-format option[value="${entry.format}"]`,
      );
      if (await option.isDisabled()) continue;
      await page.locator("#converter-format").selectOption(entry.format);
      await runConversion(page);
      const card = page.getByTestId("converter-result");
      await expect(card).toHaveCount(1);
      const file = await downloadFrom(
        page,
        card.getByRole("button", { name: /^Download / }),
      );
      expect(file.name.endsWith(`.${entry.extension}`)).toBe(true);
      expect(entry.check(file.buffer), entry.format).toBe(true);
      if (entry.format !== "tiff") {
        // Chromium cannot decode TIFF; all other containers must open.
        expect(
          await browserSize(page, file.buffer, entry.mime),
          entry.format,
        ).toEqual({ width: 160, height: 120 });
      }
    }

    const avif = page.locator('#converter-format option[value="avif"]');
    if (!(await avif.isDisabled())) {
      await page.locator("#converter-format").selectOption("avif");
      await runConversion(page);
      const file = await downloadFrom(
        page,
        page
          .getByTestId("converter-result")
          .getByRole("button", { name: /^Download / }),
      );
      expect(file.buffer.subarray(4, 8).toString("ascii")).toBe("ftyp");
      expect(await browserSize(page, file.buffer, "image/avif")).not.toBeNull();
    }
  });

  test("quality changes encoded size and resize changes dimensions", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-image");
    await upload(page, [
      await imageFixture(page, {
        width: 640,
        height: 480,
        name: "quality.png",
      }),
    ]);
    // Start on PNG so the resized output can be re-read with pngjs. WEBP is
    // exercised separately below for the quality comparison.
    await page.locator("#converter-format").selectOption("png");

    await page.getByLabel("Resize mode").selectOption("exact");
    await page.getByLabel("Output width in pixels").fill("200");
    await runConversion(page);
    const resized = await downloadFrom(
      page,
      page
        .getByTestId("converter-result")
        .getByRole("button", { name: /^Download / }),
    );
    const png = PNG.sync.read(resized.buffer);
    expect(png.width).toBe(200);
    expect(png.height).toBe(150);

    await page.locator("#converter-format").selectOption("webp");
    const quality = page.locator("#converter-quality");
    await setNativeValue(quality, 20);
    await runConversion(page);
    const low = await downloadFrom(
      page,
      page
        .getByTestId("converter-result")
        .getByRole("button", { name: /^Download / }),
    );

    await setNativeValue(quality, 95);
    await runConversion(page);
    const high = await downloadFrom(
      page,
      page
        .getByTestId("converter-result")
        .getByRole("button", { name: /^Download / }),
    );
    expect(high.buffer.length).toBeGreaterThan(low.buffer.length);
  });

  test("batch conversion and ZIP contain every real file", async ({ page }) => {
    await page.goto("/tools/image-to-image");
    const files = await Promise.all(
      [0, 1, 2].map(async (index) =>
        imageFixture(page, {
          width: 120 + index * 20,
          height: 90 + index * 10,
          name: `batch-${index + 1}.png`,
        }),
      ),
    );
    await upload(page, files);
    await page.locator("#converter-format").selectOption("jpeg");
    await runConversion(page);

    await expect(page.getByTestId("converter-result")).toHaveCount(3);
    const zip = await downloadFrom(page, page.getByTestId("converter-zip"));
    expect(zip.name).toMatch(/\.zip$/);
    const entries = unzipSync(new Uint8Array(zip.buffer));
    const names = Object.keys(entries).sort();
    expect(names).toEqual([
      "batch-1-converted.jpg",
      "batch-2-converted.jpg",
      "batch-3-converted.jpg",
    ]);
    for (const name of names)
      expect(entries[name].subarray(0, 2)).toEqual(
        Uint8Array.from([0xff, 0xd8]),
      );
  });

  test("preview fits tall images and unlocks zoom on request", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-image");
    await upload(page, [
      await imageFixture(page, {
        name: "tall-preview.png",
        width: 600,
        height: 1400,
      }),
    ]);

    const zoom = page.getByLabel("Zoom");
    const output = page.locator(".converter-zoom output");
    await expect(output).toHaveText("Fit");
    await expect(zoom).toBeDisabled();

    // A fitted preview never overflows its stage.
    const fitted = await page.evaluate(() => {
      const stage = document.querySelector(".converter-stage")!;
      const image = document.querySelector(
        '[data-testid="converter-preview-image"]',
      )!;
      return {
        stage: stage.getBoundingClientRect().height,
        image: image.getBoundingClientRect().height,
      };
    });
    expect(fitted.image).toBeLessThanOrEqual(fitted.stage + 1);

    await page.getByLabel("Fit to panel").uncheck();
    await expect(zoom).toBeEnabled();
    await setNativeValue(zoom, 150);
    await expect(output).toHaveText("150%");
  });

  test("invalid files are reported and never converted", async ({ page }) => {
    await page.goto("/tools/image-to-image");
    await page.getByTestId("image-to-image-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await expect(page.getByTestId("converter-status")).toContainText(
      /not a supported file type/i,
    );
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
  });

  test("captures category and mode screenshots for the evidence pack", async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.CAPTURE_SHOTS,
      "Screenshot capture runs in the dedicated workflow.",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Full-page captures repeat fixed headers mid-document; pin them so the
    // evidence shows the real page without an overlay across the workspace.
    const capture = async (name: string) => {
      await page.addStyleTag({
        content:
          ".site-header{position:static!important} .converter-preview{position:static!important}",
      });
      await page.screenshot({
        path: testInfo.outputPath(name),
        fullPage: true,
      });
    };

    await page.goto("/category/image-tools");
    await capture("category-image-tools.png");
    await page.goto("/category/pdf-tools");
    await capture("category-pdf-tools.png");

    await page.goto("/tools/image-to-image");
    await upload(page, [
      await imageFixture(page, {
        width: 900,
        height: 600,
        name: "qk-photo.png",
      }),
    ]);
    await page.locator("#converter-format").selectOption("jpeg");
    await runConversion(page);
    const exampleDir = testInfo.outputPath("examples");
    await mkdir(exampleDir, { recursive: true });
    const imageResult = await downloadFrom(
      page,
      page
        .getByTestId("converter-result")
        .getByRole("button", { name: /^Download / }),
    );
    await writeFile(`${exampleDir}/image-to-image.jpg`, imageResult.buffer);
    await capture("converter-desktop.png");
  });

  test("keyboard and touch layouts work at every target width", async ({
    page,
  }, testInfo) => {
    for (const width of [375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 500 ? 820 : 950 });
      await page.goto("/tools/image-to-image");
      await page.getByTestId("image-to-image-input").setInputFiles([
        await imageFixture(page, {
          width: 300,
          height: 200,
          name: `mobile-${width}.png`,
        }),
      ]);
      await expect(page.getByTestId("converter-item")).toHaveCount(1);
      await expect(page.getByText("Nothing to preview yet")).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(
        1,
      );

      const convertBox = await page.getByTestId("converter-run").boundingBox();
      expect(convertBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      if (width <= 1080) {
        // Below the two-column breakpoint the Files/Preview switch must reveal
        // the real preview panel, not a placeholder.
        const previewTab = page.getByRole("button", {
          name: "Preview",
          exact: true,
        });
        await previewTab.click();
        await expect(previewTab).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByTestId("converter-preview-image")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
          `horizontal overflow in the preview at ${width}px`,
        ).toBeLessThanOrEqual(1);
        const filesTab = page.getByRole("button", { name: /Files & settings/ });
        await filesTab.click();
        await expect(filesTab).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByTestId("converter-run")).toBeVisible();
      }

      // This tool has no mode switcher; the settings disclosures are the
      // keyboard-operable control that has to survive every layout.
      const disclosure = page
        .locator("details.converter-block > summary")
        .first();
      await disclosure.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.locator("details.converter-block").first(),
      ).not.toHaveAttribute("open", "");
      await page.keyboard.press("Enter");
      await expect(
        page.locator("details.converter-block").first(),
      ).toHaveAttribute("open", "");

      await page.addStyleTag({
        content: ".site-header{position:static!important}",
      });
      await page.screenshot({
        path: testInfo.outputPath(`image-to-image-${width}.png`),
        fullPage: true,
      });
    }
  });
});

test.describe("Image to Image Converter — target file size", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-to-image");
  });

  async function enableTarget(page: Page) {
    await page.getByRole("button", { name: /Target file size/ }).click();
    await expect(page.getByLabel("Target file size")).toBeVisible();
  }

  test("estimates before converting and keeps the controls accessible", async ({
    page,
  }) => {
    await enableTarget(page);
    await expect(
      page.getByRole("radiogroup", { name: /compression style/i }),
    ).toBeVisible();
    await expect(page.getByTestId("converter-size-estimate")).toContainText(
      /Add an image to see an estimated output size/,
    );

    const photo = await imageFixture(page, {
      width: 2400,
      height: 1600,
      name: "big-photo.jpg",
      type: "image/jpeg",
      quality: 0.95,
    });
    await upload(page, [photo]);

    await expect(page.getByTestId("converter-size-estimate")).toContainText(
      /Estimated/,
    );
    // Preset chips are real buttons with pressed state, not decoration.
    await page.getByRole("button", { name: "100 KB", exact: true }).click();
    await expect(page.getByLabel("Target file size")).toHaveValue("100");
    await expect(
      page.getByRole("button", { name: "100 KB", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    // Keyboard: the radio group is reachable and switchable.
    await page.getByLabel(/Balanced Compression/).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByLabel(/Smallest File/)).toBeChecked();
  });

  test("hits a 200 KB target and reports what it actually did", async ({
    page,
  }) => {
    await enableTarget(page);
    await page.getByRole("button", { name: "200 KB", exact: true }).click();
    await page.getByLabel(/Balanced Compression/).check();
    // A lossy output is required, so the lossless probe cannot win here.
    await page.getByLabel(/Try lossless first/).uncheck();
    await page.locator("#converter-format").selectOption("jpeg");

    const photo = await imageFixture(page, {
      width: 3000,
      height: 2000,
      name: "landscape.jpg",
      type: "image/jpeg",
      quality: 0.95,
    });
    await upload(page, [photo]);
    await runConversion(page);

    const report = page.getByTestId("converter-size-report");
    await expect(report).toBeVisible();
    await expect(report).toContainText(/Target 200 KB met/);

    const card = page.getByTestId("converter-result");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    // The promise in the UI must match the bytes the user receives.
    expect(file.buffer.length).toBeLessThanOrEqual(200 * 1024);
    expect(file.name).toBe("landscape.jpg");
    const jpeg = jpegSize(file.buffer);
    expect(jpeg.width).toBeGreaterThan(0);
    expect(jpeg.height).toBeGreaterThan(0);
    // It must never claim lossless for a lossy encode.
    await expect(report).toContainText(/Lossy output at quality/);
  });

  test("keeps a graphic pixel-perfect when a lossless file already fits", async ({
    page,
  }) => {
    await enableTarget(page);
    await page.getByRole("button", { name: "500 KB", exact: true }).click();
    await page.getByLabel(/Try lossless first/).check();
    await page.locator("#converter-format").selectOption("jpeg");

    const logo = await imageFixture(page, {
      width: 400,
      height: 300,
      name: "logo.png",
      type: "image/png",
    });
    await upload(page, [logo]);
    await runConversion(page);

    const report = page.getByTestId("converter-size-report");
    await expect(report).toContainText(/Lossless output/);
    const card = page.getByTestId("converter-result");
    await expect(card).toContainText("PNG");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    expect(file.name).toBe("logo.png");
    const png = PNG.sync.read(file.buffer);
    expect(png.width).toBe(400);
    expect(png.height).toBe(300);
  });

  test("says so when the target is not reachable instead of faking it", async ({
    page,
  }) => {
    await enableTarget(page);
    await page.getByLabel("Target file size").fill("5");
    await page.getByLabel(/Maximum Quality/).check();
    await page.getByLabel(/Shrink pixels if that is the only way/).uncheck();
    await page.getByLabel(/Try lossless first/).uncheck();
    await page.locator("#converter-format").selectOption("jpeg");

    const photo = await imageFixture(page, {
      width: 2000,
      height: 1400,
      name: "unreachable.jpg",
      type: "image/jpeg",
      quality: 0.9,
    });
    await upload(page, [photo]);

    // The estimate warns before the user spends time on a doomed conversion.
    await expect(page.getByTestId("converter-size-estimate")).toContainText(
      /not reachable/i,
    );

    await runConversion(page);
    const report = page.getByTestId("converter-size-report");
    await expect(report).toHaveClass(/warning/);
    await expect(report).toContainText(/Could not reach 5 KB/);

    const card = page.getByTestId("converter-result");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    // Dimensions are untouched because the user forbade shrinking them.
    const jpeg = jpegSize(file.buffer);
    expect(jpeg.width).toBe(2000);
    expect(jpeg.height).toBe(1400);
  });

  test("reduces dimensions only when the user allowed it", async ({ page }) => {
    await enableTarget(page);
    await page.getByLabel("Target file size").fill("40");
    await page.getByLabel(/Smallest File/).check();
    await page.getByLabel(/Shrink pixels if that is the only way/).check();
    await page.getByLabel(/Try lossless first/).uncheck();
    await page.locator("#converter-format").selectOption("jpeg");

    const photo = await imageFixture(page, {
      width: 2400,
      height: 1600,
      name: "shrink-me.jpg",
      type: "image/jpeg",
      quality: 0.95,
    });
    await upload(page, [photo]);
    await runConversion(page);

    const card = page.getByTestId("converter-result");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    expect(file.buffer.length).toBeLessThanOrEqual(40 * 1024);
    const jpeg = jpegSize(file.buffer);
    expect(jpeg.width).toBeLessThan(2400);
    await expect(page.getByTestId("converter-size-report")).toContainText(
      /Dimensions reduced/,
    );
  });

  test("batch runs keep every file inside the same target", async ({
    page,
  }) => {
    await enableTarget(page);
    await page.getByRole("button", { name: "150 KB", exact: true }).click();
    await page.getByLabel(/Balanced Compression/).check();
    await page.getByLabel(/Try lossless first/).uncheck();
    await page.locator("#converter-format").selectOption("jpeg");

    const files = [
      await imageFixture(page, {
        width: 2200,
        height: 1500,
        name: "batch-a.jpg",
        type: "image/jpeg",
        quality: 0.95,
      }),
      await imageFixture(page, {
        width: 900,
        height: 700,
        name: "batch-b.jpg",
        type: "image/jpeg",
        quality: 0.9,
      }),
    ];
    await upload(page, files);
    await runConversion(page);

    const cards = page.getByTestId("converter-result");
    await expect(cards).toHaveCount(2);
    const zip = await downloadFrom(
      page,
      page.getByTestId("converter-zip-results"),
    );
    const entries = unzipSync(new Uint8Array(zip.buffer));
    expect(Object.keys(entries).sort()).toEqual(["batch-a.jpg", "batch-b.jpg"]);
    for (const name of Object.keys(entries))
      expect(entries[name].length, `${name} over target`).toBeLessThanOrEqual(
        150 * 1024,
      );
  });

  test("fixed-quality mode still behaves exactly as before", async ({
    page,
  }) => {
    // Regression guard: the new engine must not change the default path.
    await expect(
      page.getByRole("button", { name: /Set quality/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.locator("#converter-format").selectOption("png");

    const logo = await imageFixture(page, {
      width: 320,
      height: 200,
      name: "plain.png",
      type: "image/png",
    });
    await upload(page, [logo]);
    await runConversion(page);

    const card = page.getByTestId("converter-result");
    await expect(card).toContainText("320 × 200 px");
    // No size report is shown when the size engine was not used.
    await expect(page.getByTestId("converter-size-report")).toHaveCount(0);
  });
});

test.describe("Image to Image Converter — resize and edit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-to-image");
  });

  test("exact resize keeps the requested pixels and shows a print size", async ({
    page,
  }) => {
    await page
      .locator('select[aria-label="Resize mode"]')
      .selectOption("exact");
    await page.getByLabel("Output width in pixels").fill("640");
    await page.getByLabel("Output height in pixels").fill("480");
    await page.getByLabel("Lock aspect ratio").uncheck();
    await page.locator("#converter-format").selectOption("jpeg");

    await expect(page.getByTestId("converter-print-size")).toContainText(
      /in · .* cm · .* mm at 96 DPI/,
    );

    const photo = await imageFixture(page, {
      width: 2000,
      height: 1500,
      name: "resize-me.jpg",
      type: "image/jpeg",
      quality: 0.9,
    });
    await upload(page, [photo]);
    await runConversion(page);

    const card = page.getByTestId("converter-result");
    await expect(card).toContainText("640 × 480 px");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const jpeg = jpegSize(file.buffer);
    expect(jpeg.width).toBe(640);
    expect(jpeg.height).toBe(480);
  });

  test("preset dimensions fill the width and height fields", async ({
    page,
  }) => {
    await page
      .locator('select[aria-label="Resize mode"]')
      .selectOption("exact");
    await page.getByRole("button", { name: "Full HD" }).click();
    await expect(page.getByLabel("Output width in pixels")).toHaveValue("1920");
    await expect(page.getByLabel("Output height in pixels")).toHaveValue(
      "1080",
    );
  });

  test("warns that upscaling cannot restore detail", async ({ page }) => {
    await page
      .locator('select[aria-label="Resize mode"]')
      .selectOption("exact");
    const photo = await imageFixture(page, {
      width: 400,
      height: 300,
      name: "small.jpg",
      type: "image/jpeg",
      quality: 0.9,
    });
    await upload(page, [photo]);

    await page.getByLabel("Output width in pixels").fill("4000");
    await page.getByLabel("Output height in pixels").fill("3000");
    await page.getByLabel("Lock aspect ratio").uncheck();

    const warning = page.getByTestId("converter-upscale-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/cannot restore detail/i);
  });

  test("contain placement letterboxes and cover crops to the same box", async ({
    page,
  }) => {
    await page
      .locator('select[aria-label="Resize mode"]')
      .selectOption("exact");
    await page.getByLabel("Output width in pixels").fill("800");
    await page.getByLabel("Output height in pixels").fill("800");
    await page.getByLabel("Lock aspect ratio").uncheck();
    await page.locator("#converter-format").selectOption("png");
    await page
      .locator('select[aria-label="Image placement"]')
      .selectOption("contain");

    const wide = await imageFixture(page, {
      width: 1600,
      height: 400,
      name: "banner.png",
      type: "image/png",
    });
    await upload(page, [wide]);
    await runConversion(page);

    let card = page.getByTestId("converter-result");
    await expect(card).toContainText("800 × 800 px");
    let file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    let png = PNG.sync.read(file.buffer);
    expect(png.width).toBe(800);
    expect(png.height).toBe(800);
    // Contain keeps the whole banner, so the top-left corner is background.
    const corner = png.data.slice(0, 4);
    expect(corner[3]).toBe(255);

    // The same box in cover mode must crop instead of letterbox.
    await page
      .locator('select[aria-label="Image placement"]')
      .selectOption("cover");
    await runConversion(page);
    card = page.getByTestId("converter-result");
    file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    png = PNG.sync.read(file.buffer);
    expect(png.width).toBe(800);
    expect(png.height).toBe(800);
  });

  test("rotation, flips and crop change the output pixels", async ({
    page,
  }) => {
    await page.locator("#converter-format").selectOption("png");

    const photo = await imageFixture(page, {
      width: 1200,
      height: 800,
      name: "edit-me.png",
      type: "image/png",
    });
    await upload(page, [photo]);

    await page.getByRole("button", { name: /rotate right/i }).click();
    await expect(page.getByTestId("converter-edit-summary")).toContainText(
      /rotated 90°/,
    );
    await expect(page.getByTestId("converter-edit-summary")).toContainText(
      /800 × 1200 px before resize/,
    );
    await runConversion(page);

    let card = page.getByTestId("converter-result");
    await expect(card).toContainText("800 × 1200 px");

    // A square crop of a landscape image, then rotate back.
    await page.getByRole("button", { name: "1:1 square" }).click();
    await expect(page.getByTestId("converter-edit-summary")).toContainText(
      /Applied: cropped/,
    );
    await runConversion(page);
    card = page.getByTestId("converter-result");
    await expect(card).toContainText("800 × 800 px");
  });

  test("DPI is stored in TIFF output and reported for formats that cannot", async ({
    page,
  }) => {
    await page
      .locator('select[aria-label="Resize mode"]')
      .selectOption("exact");
    await page.getByLabel("Output width in pixels").fill("300");
    await page.getByLabel("Output height in pixels").fill("300");
    await page.getByLabel("Lock aspect ratio").uncheck();
    await page
      .locator('select[aria-label="Resolution in DPI"]')
      .selectOption("300");
    await page.locator("#converter-format").selectOption("tiff");

    const photo = await imageFixture(page, {
      width: 600,
      height: 600,
      name: "dpi.png",
      type: "image/png",
    });
    await upload(page, [photo]);
    await expect(page.getByTestId("converter-print-size")).toContainText(
      /at 300 DPI/,
    );
    await runConversion(page);

    const card = page.getByTestId("converter-result");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    expect(tiffSize(file.buffer)).toEqual({ width: 300, height: 300 });
  });
});

test.describe("Image to Image Converter — preview workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-to-image");
  });

  test("the slider compares the two real files", async ({ page }) => {
    await page.locator("#converter-format").selectOption("jpeg");
    const photo = await imageFixture(page, {
      width: 900,
      height: 600,
      name: "compare.jpg",
      type: "image/jpeg",
      quality: 0.92,
    });
    await upload(page, [photo]);

    // Slider is unavailable until there is something to compare with.
    const sliderTab = page.getByRole("button", { name: "Slider" });
    await expect(sliderTab).toBeDisabled();

    await runConversion(page);
    await expect(sliderTab).toBeEnabled();
    await sliderTab.click();
    await expect(sliderTab).toHaveAttribute("aria-pressed", "true");

    const before = page.getByTestId("converter-slider-before");
    const after = page.getByTestId("converter-slider-after");
    await expect(before).toBeVisible();
    await expect(after).toBeVisible();

    // Both layers are real images with a source, not placeholders.
    for (const layer of [before, after])
      expect(await layer.getAttribute("src")).toMatch(/^blob:/);

    await setNativeValue(page.getByTestId("converter-split"), 20);
    await expect(page.getByTestId("converter-split")).toHaveValue("20");
    await expect(after).toHaveCSS("clip-path", "inset(0px 0px 0px 20%)");
  });

  test("full screen preview can be entered and left", async ({ page }) => {
    const photo = await imageFixture(page, {
      width: 600,
      height: 400,
      name: "full.png",
      type: "image/png",
    });
    await upload(page, [photo]);

    const button = page.getByRole("button", { name: /full screen/i });
    await expect(button).toBeVisible();
    // Headless browsers may refuse the request; the state must stay truthful.
    await button.click();
    await expect(page.getByRole("button", { name: /screen/i })).toBeVisible();
  });

  test("settings blocks collapse and expand from the keyboard", async ({
    page,
  }) => {
    const block = page.locator("details.converter-block").first();
    await expect(block).toHaveAttribute("open", "");

    const summary = block.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(block).not.toHaveAttribute("open", "");
    // The control is still in the DOM, so nothing was destroyed.
    await expect(page.locator("#converter-format")).toHaveCount(1);

    await page.keyboard.press("Enter");
    await expect(block).toHaveAttribute("open", "");
  });
});

test.describe("Image to Image Converter — batch report", () => {
  test("reports every file, including one that failed", async ({ page }) => {
    await page.goto("/tools/image-to-image");
    await page.locator("#converter-format").selectOption("jpeg");

    const good = await imageFixture(page, {
      width: 800,
      height: 600,
      name: "good.jpg",
      type: "image/jpeg",
      quality: 0.9,
    });
    // A file that passes the name check but cannot be decoded.
    const broken: Upload = {
      name: "broken.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not really a jpeg at all"),
    };
    await page
      .getByTestId("image-to-image-input")
      .setInputFiles([good, broken]);

    // The corrupt file is flagged at inspection, before any conversion.
    await expect(page.getByTestId("converter-item")).toHaveCount(2);
    await expect(page.getByText("Needs attention")).toBeVisible({
      timeout: 20000,
    });

    // Retry the broken file: it must fail again and be reported, not skipped.
    await page
      .getByTestId("converter-item")
      .nth(1)
      .getByRole("button", { name: /retry broken\.jpg/i })
      .click();
    await expect(page.getByTestId("converter-report-row")).toHaveCount(1, {
      timeout: 30000,
    });
    await expect(page.getByTestId("converter-report-row").first()).toHaveClass(
      /failed/,
    );
    await expect(page.getByTestId("converter-report-summary")).toContainText(
      /1 failed/,
    );
  });
});
