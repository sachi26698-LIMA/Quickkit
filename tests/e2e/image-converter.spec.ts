import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";
import { unzipSync } from "fflate";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, degrees, rgb } from "@cantoo/pdf-lib";

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

/** A minimal RC4-128 encrypted PDF (password "secret"), generated with pypdf. */
const ENCRYPTED_PDF_BASE64 =
  "JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPGQwNGQ3NmNjOWE+Cj4+CmVuZG9i" +
  "agoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovQ291bnQgMQovS2lkcyBbIDQgMCBSIF0KPj4KZW5k" +
  "b2JqCjMgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iago0IDAg" +
  "b2JqCjw8Ci9UeXBlIC9QYWdlCi9SZXNvdXJjZXMgPDwKPj4KL01lZGlhQm94IFsgMC4wIDAuMCAz" +
  "MDAgNDAwIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovViAyCi9SIDMKL0xl" +
  "bmd0aCAxMjgKL1AgNDI5NDk2NzI5MgovRmlsdGVyIC9TdGFuZGFyZAovTyA8MGU1MjI5MjVhM2U0" +
  "ZTg3NGMzY2ZhY2JlZjUxMWE3M2FjNGVjMmJkODY1ZGNkM2Q0NjI3NjE0OTE3YWJmZDdlND4KL1Ug" +
  "PDUwMzlhOTM3NTUwZTM1YjQ1OGZhNzAxM2M5NTViMjVjMjhiZjRlNWU0ZTc1OGE0MTY0MDA0ZTU2" +
  "ZmZmYTAxMDg+Cj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAw" +
  "MTUgMDAwMDAgbiAKMDAwMDAwMDA1OSAwMDAwMCBuIAowMDAwMDAwMTE4IDAwMDAwIG4gCjAwMDAw" +
  "MDAxNjcgMDAwMDAgbiAKMDAwMDAwMDI2MSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jv" +
  "b3QgMyAwIFIKL0luZm8gMSAwIFIKL0lEIFsgPDM2MzczMjY0MzYzODM0MzczMTM4NjM2MjMwMzE2" +
  "NDMzMzgzNTYyNjUzNjMyNjYzMTMwNjIzMjMwMzY2NjM3Mzk+IDwzNjM3MzI2NDM2MzgzNDM3MzEz" +
  "ODYzNjIzMDMxNjQzMzM4MzU2MjY1MzYzMjY2MzEzMDYyMzIzMDM2NjYzNzM5PiBdCi9FbmNyeXB0" +
  "IDUgMCBSCj4+CnN0YXJ0eHJlZgo0NzYKJSVFT0YK";

function encryptedPdf(): Upload {
  return {
    name: "locked.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(ENCRYPTED_PDF_BASE64, "base64"),
  };
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
      y: 420,
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
async function makeRotatedPdf(): Promise<Upload> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const first = doc.addPage([595.28, 841.89]);
  first.drawRectangle({
    x: 40,
    y: 500,
    width: 515,
    height: 280,
    color: rgb(0.42, 0.2, 0.9),
  });
  first.drawText("Rotated", {
    x: 60,
    y: 420,
    size: 54,
    font,
    color: rgb(1, 1, 1),
  });
  first.setRotation(degrees(90));
  const second = doc.addPage([595.28, 841.89]);
  second.drawRectangle({
    x: 40,
    y: 500,
    width: 515,
    height: 280,
    color: rgb(0.9, 0.4, 0.2),
  });
  second.drawText("Upright", {
    x: 60,
    y: 420,
    size: 54,
    font,
    color: rgb(1, 1, 1),
  });
  return {
    name: "rotated.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  };
}

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
  await page.getByTestId("image-converter-input").setInputFiles(files);
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

test.describe("Image & PDF Converter", () => {
  test("empty state is local, labelled and usable", async ({ page }) => {
    await page.goto("/tools/image-converter");
    await expect(page.locator("h1")).toHaveText("Image & PDF Converter");
    await expect(page.getByText("Local processing")).toBeVisible();
    await expect(page.getByText("Nothing to preview yet")).toBeVisible();
    await expect(page.getByTestId("converter-run")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /Image to image/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("image-converter-input")).toHaveAttribute(
      "accept",
      /image\//,
    );
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await expect(page.getByTestId("image-converter-input")).toHaveAttribute(
      "accept",
      /application\/pdf/,
    );
    await page.getByRole("button", { name: /Image to image/ }).click();

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

  test("JPG to PNG produces a real PNG with the same pixels", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
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
    await page.goto("/tools/image-converter");
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
    await page.goto("/tools/image-converter");
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
    await page.goto("/tools/image-converter");
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
    await page.goto("/tools/image-converter");
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

  test("images to PDF creates a multi-page PDF with real page sizes", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
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
    await page.getByRole("button", { name: /Images to PDF/ }).click();

    // Page order follows the queue; the reorder controls must be real.
    await page
      .getByRole("button", { name: "Move page-two.png earlier" })
      .click();
    let order = await page
      .getByTestId("converter-item")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
    expect(order[0]).toContain("page-two.png");
    await page.getByRole("button", { name: "Move page-two.png later" }).click();
    order = await page
      .getByTestId("converter-item")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
    expect(order[0]).toContain("page-one.png");

    await page.getByLabel("PDF file name").fill("album.pdf");
    await page.getByLabel("PDF page size").selectOption("a4");
    await setNativeValue(page.getByLabel("Page margin in millimetres"), 20);
    await runConversion(page);

    const card = page.getByTestId("converter-result");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("2 pages");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    expect(file.name).toBe("album.pdf");
    expect(file.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // A raster-only PDF must not embed a text font; pdf-lib still writes an
    // empty /Font resource dictionary, so check for real font objects instead.
    expect(file.buffer.includes(Buffer.from("/Type1"))).toBe(false);
    expect(file.buffer.includes(Buffer.from("/Type0"))).toBe(false);
    expect(file.buffer.includes(Buffer.from("Helvetica"))).toBe(false);

    const pdf = await PDFDocument.load(file.buffer);
    expect(pdf.getPageCount()).toBe(2);
    const size = pdf.getPage(0).getSize();
    expect(size.width).toBeCloseTo(595.28, 0);
    expect(size.height).toBeCloseTo(841.89, 0);

    await expect(page.getByTestId("converter-pdf-page")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByLabel("Page number")).toHaveValue("2");
  });

  test("PDF to image exports selected pages, previews and ZIP", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await upload(page, [await makePdf(3)]);
    await expect(page.getByTestId("converter-item")).toContainText("3 pages");
    await page.getByLabel("Page image format").selectOption("png");
    await page.getByLabel("Pages to export").fill("1, 3");
    await page.getByRole("button", { name: "96", exact: true }).click();
    await runConversion(page);

    const cards = page.getByTestId("converter-result");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("sample-page-001.png");
    await expect(cards.nth(1)).toContainText("sample-page-003.png");

    const single = await downloadFrom(
      page,
      cards.nth(0).getByRole("button", { name: /^Download / }),
    );
    const png = PNG.sync.read(single.buffer);
    expect(png.width).toBeGreaterThan(780);
    expect(png.width).toBeLessThan(810);
    expect(png.height).toBeGreaterThan(1110);
    expect(png.height).toBeLessThan(1140);

    const zip = await downloadFrom(
      page,
      page.getByTestId("converter-zip-results"),
    );
    const entries = unzipSync(new Uint8Array(zip.buffer));
    expect(Object.keys(entries).sort()).toEqual([
      "sample-page-001.png",
      "sample-page-003.png",
    ]);
    await expect(page.getByTestId("converter-result-image")).toBeVisible();
  });

  test("an out-of-range PDF page selection is rejected without output", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await upload(page, [await makePdf(2)]);
    await page.getByLabel("Pages to export").fill("9-12");
    await page.getByTestId("converter-run").click();
    await expect(page.getByTestId("converter-status")).toContainText(
      /out of range/i,
    );
    await expect(page.getByTestId("converter-result")).toHaveCount(0);
  });

  test("rotated PDF pages render at their rotated size and keep page order", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await upload(page, [await makeRotatedPdf()]);
    await page.getByLabel("Page image format").selectOption("png");
    await page.getByRole("button", { name: "96", exact: true }).click();
    await runConversion(page);

    const cards = page.getByTestId("converter-result");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("rotated-page-001.png");
    await expect(cards.nth(1)).toContainText("rotated-page-002.png");
    const rotated = PNG.sync.read(
      (
        await downloadFrom(
          page,
          cards.nth(0).getByRole("button", { name: /^Download / }),
        )
      ).buffer,
    );
    const upright = PNG.sync.read(
      (
        await downloadFrom(
          page,
          cards.nth(1).getByRole("button", { name: /^Download / }),
        )
      ).buffer,
    );
    // /Rotate 90 turns the A4 portrait page into a landscape bitmap.
    expect(rotated.width).toBeGreaterThan(rotated.height);
    expect(upright.width).toBeLessThan(upright.height);
    expect(rotated.width).toBeGreaterThan(1100);
    expect(rotated.width).toBeLessThan(1140);

    const zip = await downloadFrom(
      page,
      page.getByTestId("converter-zip-results"),
    );
    const entries = unzipSync(new Uint8Array(zip.buffer));
    expect(Object.keys(entries).sort()).toEqual([
      "rotated-page-001.png",
      "rotated-page-002.png",
    ]);
    expect(entries["rotated-page-002.png"].subarray(0, 8)).toEqual(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  test("a password-protected PDF is rejected without producing output", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await upload(page, [encryptedPdf()]);
    await expect(page.getByTestId("converter-item")).toContainText(/password/i);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
    await expect(page.getByTestId("converter-result")).toHaveCount(0);
  });

  test("a corrupt PDF is rejected without producing output", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await upload(page, [
      {
        name: "broken.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("this is definitely not a PDF file"),
      },
    ]);
    await expect(page.getByTestId("converter-item")).toContainText(
      /could not be opened|corrupt|password/i,
    );
    await expect(page.getByTestId("converter-run")).toBeDisabled();
    await expect(page.getByTestId("converter-result")).toHaveCount(0);
  });

  test("preview fits tall images and unlocks zoom on request", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
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

  test("appears in Image Tools, PDF Tools and search at the same route", async ({
    page,
  }) => {
    for (const slug of ["image-tools", "pdf-tools"]) {
      await page.goto(`/category/${slug}`);
      const card = page.getByRole("link", { name: "Image & PDF Converter" });
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("href", "/tools/image-converter");
    }

    await page.goto("/tools");
    await page
      .getByRole("searchbox", { name: "Search tools" })
      .fill("pdf to image");
    const result = page.getByRole("link", { name: "Image & PDF Converter" });
    await expect(result).toBeVisible();
    await result.click();
    await expect(page.locator("h1")).toHaveText("Image & PDF Converter");
    const categories = page.getByRole("navigation", {
      name: "Tool categories",
    });
    await expect(
      categories.getByRole("link", { name: "Image Tools" }),
    ).toBeVisible();
    await expect(
      categories.getByRole("link", { name: "PDF Tools" }),
    ).toBeVisible();
  });

  test("cancel stops a long PDF export and keeps the UI usable", async ({
    page,
  }) => {
    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await upload(page, [await makePdf(30)]);
    await page.getByLabel("Page image format").selectOption("jpeg");
    await setNativeValue(page.getByLabel("Output resolution in DPI"), 300);
    await page.getByTestId("converter-run").click();
    const cancel = page.getByTestId("converter-cancel");
    await expect(cancel).toBeVisible({ timeout: 15000 });
    await cancel.click();
    await expect(page.getByTestId("converter-status")).toContainText(
      /cancel/i,
      {
        timeout: 30000,
      },
    );
    await expect(page.getByTestId("converter-run")).toBeEnabled({
      timeout: 30000,
    });
    await expect(page.getByTestId("image-converter-input")).toBeEnabled();
  });

  test("invalid files are reported and never converted", async ({ page }) => {
    await page.goto("/tools/image-converter");
    await page.getByTestId("image-converter-input").setInputFiles({
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

    await page.goto("/tools/image-converter");
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

    await page.getByRole("button", { name: /Images to PDF/ }).click();
    await upload(
      page,
      [
        await imageFixture(page, {
          width: 600,
          height: 800,
          name: "qk-page-two.png",
        }),
      ],
      2,
    );
    await runConversion(page);
    await expect(page.getByTestId("converter-pdf-page")).toBeVisible({
      timeout: 20000,
    });
    const pdfExample = await downloadFrom(
      page,
      page
        .getByTestId("converter-result")
        .getByRole("button", { name: /^Download / }),
    );
    await writeFile(`${exampleDir}/images-to-pdf.pdf`, pdfExample.buffer);
    await capture("converter-images-to-pdf.png");

    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /PDF to image/ }).click();
    await upload(page, [await makePdf(3)]);
    await page.getByRole("button", { name: "96", exact: true }).click();
    await runConversion(page);
    await expect(page.getByTestId("converter-result-image")).toBeVisible();
    const pageExample = await downloadFrom(
      page,
      page
        .getByTestId("converter-result")
        .first()
        .getByRole("button", { name: /^Download / }),
    );
    await writeFile(`${exampleDir}/pdf-to-image.png`, pageExample.buffer);
    await capture("converter-pdf-to-image.png");
  });

  test("keyboard and touch layouts work at every target width", async ({
    page,
  }, testInfo) => {
    for (const width of [375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 500 ? 820 : 950 });
      await page.goto("/tools/image-converter");
      await page.getByTestId("image-converter-input").setInputFiles([
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

      const mode = page.getByRole("button", { name: /Image to image/ });
      await mode.focus();
      await page.keyboard.press("Enter");
      await expect(mode).toHaveAttribute("aria-pressed", "true");

      await page.addStyleTag({
        content: ".site-header{position:static!important}",
      });
      await page.screenshot({
        path: testInfo.outputPath(`image-converter-${width}.png`),
        fullPage: true,
      });
    }
  });
});
