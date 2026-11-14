import { test, expect, type Page } from "./helpers/tool-test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { readFile } from "node:fs/promises";
async function pngFixture(page: Page) {
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext("2d")!;
    for (let y = 20; y < 480; y += 8)
      for (let x = 20; x < 640; x += 8) {
        ctx.fillStyle = `rgb(${x % 255},${y % 255},${(x + y) % 255})`;
        ctx.fillRect(x, y, 8, 8);
      }
    return c.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "source.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}
test("QR generator verifies its own export and names the downloaded file", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  const text =
    "https://example.com/hello?text=\u0928\u092e\u0938\u094d\u0924\u0947";
  // The studio normalises the address through `new URL()`, so the query is
  // percent-encoded in the symbol. The payload view and the decoded PNG must
  // both agree on that exact string.
  const encoded = new URL(text).toString();
  await expect(page.getByRole("tab", { name: /Create QR/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("Waiting for valid content")).toBeVisible();
  await expect(
    page.locator("#qr-export").getByRole("button", { name: /^PNG/ }),
  ).toBeDisabled();
  await page.getByLabel(/Web address/).fill(text);
  await expect(
    page.getByText("Verified by an independent decoder"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show the exact encoded content" })
    .click();
  await expect(page.locator("#qr-payload-view pre")).toContainText("/qr?d=");

  await page.getByRole("button", { name: /Direct Raw Content/ }).click();
  await expect(
    page.getByText("Verified by an independent decoder"),
  ).toBeVisible();
  await expect(page.locator("#qr-payload-view pre")).toHaveText(encoded);
  const pending = page.waitForEvent("download");
  await page
    .locator("#qr-export")
    .getByRole("button", { name: /^PNG/ })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(
    /^quickkit-qr-url-.*768px\.png$/,
  );
  const png = PNG.sync.read(await readFile((await download.path())!));
  expect(png.width).toBe(768);
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe(encoded);
});
test("image compressor validates unsupported, oversized and corrupt inputs", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  await expect(
    page.getByRole("button", { name: /Compress images/ }),
  ).toBeDisabled();
  for (const [file, expected] of [
    [
      { name: "test.txt", mimeType: "text/plain", buffer: Buffer.from("test") },
      /JPEG, PNG, WebP or AVIF/,
    ],
    [
      {
        name: "large.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(16 * 1024 * 1024),
      },
      /smaller than 15 MB/,
    ],
    [
      {
        name: "bad.png",
        mimeType: "image/png",
        buffer: Buffer.from("broken"),
      },
      /could not be decoded|JPEG, PNG/,
    ],
  ] as const) {
    await page.getByLabel("Add images").setInputFiles(file);
    await expect(page.locator(".compressor-alert")).toContainText(expected);
    await expect(page.locator(".compressor-item")).toHaveCount(0);
  }
});

test("image compression downloads real WebP, JPEG and PNG without resizing", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  await page.getByLabel("Add images").setInputFiles(await pngFixture(page));
  await expect(page.locator(".compressor-item")).toHaveCount(1);
  for (const [format, extension] of [
    ["image/webp", "webp"],
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
  ]) {
    await page.getByLabel("Output format").selectOption(format);
    await page.getByRole("button", { name: /Compress 1 image/ }).click();
    await expect(page.locator(".compressor-status-done")).toHaveCount(1);
    await expect(page.locator(".compressor-stats")).toContainText(
      "640 × 480 px · unchanged",
    );
    const pending = page.waitForEvent("download");
    await page.locator(".compressor-download").click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(
      `source-compressed-640x480.${extension}`,
    );
    const data = await readFile((await download.path())!);
    expect(data.length).toBeGreaterThan(100);
    const pixel = await page
      .getByAltText("Compressed preview of source.png")
      .last()
      .evaluate(async (el) => {
        const image = el as HTMLImageElement;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = image.naturalWidth;
        c.height = image.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      });
    if (format === "image/jpeg") expect(pixel).toEqual([255, 255, 255, 255]);
    else expect(pixel[3]).toBe(0);
    if (format === "image/png") expect(PNG.sync.read(data).width).toBe(640);
    if (format === "image/webp")
      expect(data.subarray(8, 12).toString()).toBe("WEBP");
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".compressor-item")).toHaveCount(0);
  await expect(page.getByAltText(/preview of source.png/)).toHaveCount(0);
});

test("JPEG and WebP inputs pass preflight and preserve pixel dimensions", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  for (const mimeType of ["image/jpeg", "image/webp"]) {
    const bytes = await page.evaluate((type) => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 240;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#6657e8";
      ctx.fillRect(0, 0, 320, 240);
      return c.toDataURL(type).split(",")[1];
    }, mimeType);
    await page.getByLabel("Add images").setInputFiles({
      name: mimeType === "image/jpeg" ? "sample.jpg" : "sample.webp",
      mimeType,
      buffer: Buffer.from(bytes, "base64"),
    });
    await expect(page.locator(".compressor-item")).toHaveCount(1);
    await page.getByRole("button", { name: /Compress 1 image/ }).click();
    await expect(page.locator(".compressor-status-done")).toBeVisible();
    await expect(page.locator(".compressor-stats")).toContainText(
      "320 × 240 px · unchanged",
    );
    await page.getByRole("button", { name: "Reset", exact: true }).click();
  }
});

test("oversized decoded dimensions are rejected before preview allocation", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(100000, 16);
  bytes.writeUInt32BE(100000, 20);
  await page.getByLabel("Add images").setInputFiles({
    name: "too-many-pixels.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await expect(page.locator(".compressor-alert")).toContainText(
    "24 megapixels",
  );
  await expect(page.locator(".compressor-item")).toHaveCount(0);
});

test("image reset releases all object URLs and discards a pending encode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const urls = new Set<string>();
    Object.defineProperty(window, "quickkitTestUrls", { value: urls });
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    URL.createObjectURL = (object) => {
      const url = create(object);
      urls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      urls.delete(url);
      revoke(url);
    };
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      encode.call(
        this,
        (blob) => setTimeout(() => callback(blob), 120),
        type,
        quality,
      );
    };
  });
  await page.goto("/tools/image-compressor");
  await page.getByLabel("Add images").setInputFiles(await pngFixture(page));
  await expect(page.locator(".compressor-item")).toHaveCount(1);
  await page.getByRole("button", { name: /Compress 1 image/ }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(250);
  await expect(page.locator(".compressor-download")).toHaveCount(0);
  await expect(page.locator(".compressor-item")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { quickkitTestUrls: Set<string> })
          .quickkitTestUrls.size,
    ),
  ).toBe(0);
});
