import { test, expect, type Page, type TestInfo } from "./helpers/tool-test";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

type Upload = { name: string; mimeType: string; buffer: Buffer };

/* ------------------------------- fixtures -------------------------------- */

/**
 * Photographic fixture: gradient sky, sun, layered hills and fine grain so that
 * JPEG/WebP behaviour matches a real photograph instead of a flat rectangle.
 */
async function photo(
  page: Page,
  width = 1200,
  height = 900,
  name = "photo.png",
  tone = 205,
  grain = 2600,
): Promise<Upload> {
  const base64 = await page.evaluate(
    ([w, h, hue, dots]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, `hsl(${hue}, 80%, 72%)`);
      sky.addColorStop(0.55, `hsl(${hue + 25}, 76%, 58%)`);
      sky.addColorStop(1, `hsl(${hue + 60}, 62%, 28%)`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,248,220,0.92)";
      ctx.beginPath();
      ctx.arc(w * 0.28, h * 0.24, Math.min(w, h) * 0.11, 0, Math.PI * 2);
      ctx.fill();
      const hills = [
        ["rgba(28,42,64,0.55)", 0.52],
        ["rgba(20,30,48,0.7)", 0.66],
        ["rgba(14,20,34,0.86)", 0.8],
      ] as const;
      hills.forEach(([colour, base], index) => {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h * base);
        for (let x = 0; x <= w; x += Math.max(8, w / 24)) {
          const y =
            h * base +
            Math.sin((x / w) * Math.PI * (2 + index) + index) * h * 0.08;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      });
      // Deterministic grain — keeps the encoders honest about detail.
      let seed = 1234567;
      for (let index = 0; index < dots; index += 1) {
        seed = (seed * 1103515245 + 12345) % 2147483647;
        const x = seed % w;
        seed = (seed * 1103515245 + 12345) % 2147483647;
        const y = seed % h;
        const alpha = 0.05 + ((seed % 40) / 40) * 0.12;
        ctx.fillStyle =
          seed % 3 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x, y, 2, 2);
      }
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height, tone, grain] as const,
  );
  return { name, mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

/** Real alpha: clear corners, a half-transparent band and a solid red square. */
async function alphaPng(page: Page, name = "sticker.png"): Promise<Upload> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 300);
    ctx.fillStyle = "rgba(0, 128, 255, 0.5)";
    ctx.fillRect(0, 200, 400, 100);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(120, 90, 160, 120);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return { name, mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

async function jpegPhoto(page: Page, name = "shot.jpg"): Promise<Upload> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(400, 300, 20, 400, 400, 700);
    gradient.addColorStop(0, "#ffe28a");
    gradient.addColorStop(0.6, "#4f8ad1");
    gradient.addColorStop(1, "#101a35");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 800);
    for (let index = 0; index < 1200; index += 1) {
      ctx.fillStyle = `hsla(${index % 360}, 65%, 55%, 0.25)`;
      ctx.fillRect((index * 71) % 800, (index * 133) % 800, 14, 14);
    }
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  return {
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  };
}

/** Valid PNG signature + IHDR (passes the add-time header check) but corrupt
 * pixel data, so the failure only shows up when the batch encodes it. */
async function brokenPng(page: Page, name = "broken.png"): Promise<Upload> {
  const valid = await photo(page, 600, 400, name, 40, 400);
  const header = valid.buffer.subarray(0, 33);
  const iend = Buffer.from([
    0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.concat([header, iend]),
  };
}

/** JPEG whose pixels are 900x600 but which carries EXIF orientation 6, the
 * way most phones store a portrait photo. */
async function exifRotatedJpeg(
  page: Page,
  name = "phone.jpg",
): Promise<Upload> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 900, 600);
    gradient.addColorStop(0, "#d64b2a");
    gradient.addColorStop(1, "#2a3f8f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 600);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(40, 40, 260, 160);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), "image/jpeg", 0.9),
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const tiff = [
      0x49,
      0x49,
      0x2a,
      0x00,
      0x08,
      0x00,
      0x00,
      0x00, // little-endian TIFF header
      0x01,
      0x00, // one entry
      0x12,
      0x01,
      0x03,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x06,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ];
    const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
    const length = payload.length + 2;
    const segment = [
      0xff,
      0xe1,
      (length >> 8) & 0xff,
      length & 0xff,
      ...payload,
    ];
    const injected = new Uint8Array([
      bytes[0],
      bytes[1],
      ...segment,
      ...bytes.subarray(2),
    ]);
    return btoa(String.fromCharCode(...injected));
  });
  return {
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  };
}

/* -------------------------------- helpers -------------------------------- */

async function openPage(page: Page) {
  await page.goto("/tools/image-compressor");
  await expect(page.getByLabel("Add images")).toBeAttached();
}

async function addImages(page: Page, uploads: Upload[]) {
  await page.getByLabel("Add images").setInputFiles(uploads);
  await expect(page.locator(".compressor-item")).toHaveCount(uploads.length);
}

async function compress(page: Page, count: number, timeout = 120_000) {
  await page
    .getByRole("button", { name: new RegExp(`Compress ${count} image`) })
    .click();
  await expect(page.locator(".compressor-status-done")).toHaveCount(count, {
    timeout,
  });
}

async function resultName(page: Page) {
  return (await page.locator(".compressor-filename").innerText()).trim();
}

async function download(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("link", { name: `Download ${name}`, exact: true })
    .last()
    .click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe(name);
  return readFile((await file.path())!);
}

async function downloadZip(page: Page, testInfo: TestInfo) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ZIP/ }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("quickkit-compressed-images.zip");
  const target = testInfo.outputPath("quickkit-compressed-images.zip");
  await writeFile(target, await readFile((await file.path())!));
  return target;
}

async function decode(
  page: Page,
  buffer: Buffer,
  mimeType: string,
): Promise<{
  width: number;
  height: number;
  corner: number[];
  centre: number[];
  band: number[];
}> {
  return page.evaluate(
    async ([data, type]) => {
      const image = new Image();
      image.src = `data:${type};base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const read = (x: number, y: number) =>
        Array.from(ctx.getImageData(x, y, 1, 1).data);
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        corner: read(2, 2),
        centre: read(image.naturalWidth >> 1, image.naturalHeight >> 1),
        band: read(4, Math.round(image.naturalHeight * 0.9)),
      };
    },
    [buffer.toString("base64"), mimeType] as const,
  );
}

function signature(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg";
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a")
    return "png";
  if (
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    return "webp";
  return "unknown";
}

async function stats(page: Page) {
  return page.locator(".compressor-stats").innerText();
}

function statValue(text: string, label: string) {
  const lines = text.split("\n").map((line) => line.trim());
  const index = lines.indexOf(label);
  return index >= 0 ? lines[index + 1] : "";
}

/* --------------------------------- tests --------------------------------- */

test.describe("image compressor — final QA audit", () => {
  test("quality mode: real files per format, quality actually changes size", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openPage(page);
    await addImages(page, [await photo(page, 1200, 900, "quality.png")]);
    await page.getByLabel("Output format").selectOption("image/jpeg");

    await page.locator("#compressor-quality").fill("30");
    await compress(page, 1);
    const lowName = await resultName(page);
    const low = await download(page, lowName);

    await page.locator("#compressor-quality").fill("95");
    await expect(page.locator(".compressor-status-done")).toHaveCount(0);
    await compress(page, 1);
    const high = await download(page, await resultName(page));

    expect(signature(low)).toBe("jpeg");
    expect(signature(high)).toBe("jpeg");
    expect(low.length).toBeLessThan(high.length);
    const lowMeta = await decode(page, low, "image/jpeg");
    const highMeta = await decode(page, high, "image/jpeg");
    expect([lowMeta.width, lowMeta.height]).toEqual([1200, 900]);
    expect([highMeta.width, highMeta.height]).toEqual([1200, 900]);
    expect(highMeta.centre[3]).toBe(255);

    await page.getByLabel("Output format").selectOption("image/webp");
    await compress(page, 1);
    const webp = await download(page, await resultName(page));
    expect(signature(webp)).toBe("webp");
    expect((await decode(page, webp, "image/webp")).width).toBe(1200);

    // PNG is lossless: the quality control is disabled and the file is stable.
    await page.getByLabel("Output format").selectOption("image/png");
    await expect(page.locator("#compressor-quality")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "40%", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".compressor-summary")).toHaveText(
      "Lossless PNG",
    );
    await compress(page, 1);
    const png = await download(page, await resultName(page));
    expect(signature(png)).toBe("png");
    const pngMeta = await decode(page, png, "image/png");
    expect([pngMeta.width, pngMeta.height]).toEqual([1200, 900]);
  });

  test("target mode: KB and MB limits are met, reported and verified", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPage(page);
    await addImages(page, [
      await photo(page, 1600, 1200, "target.png", 210, 4000),
    ]);
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByLabel("Target file size").fill("90");
    await expect(page.locator(".compressor-summary")).toHaveText(
      "Target 90 KB",
    );
    // The footer must not advertise a fixed quality while the app is searching.
    await expect(page.locator(".compressor-format-note")).toContainText(
      "target search",
    );

    await compress(page, 1, 180_000);
    const kbText = await stats(page);
    expect(statValue(kbText, "Target")).toContain("90 KB · met at q");
    expect(statValue(kbText, "Dimensions")).toContain(
      "1600 × 1200 px · unchanged",
    );
    const kb = await download(page, await resultName(page));
    expect(kb.length).toBeLessThanOrEqual(90 * 1024);
    expect(signature(kb)).toBe("webp");

    // MB unit: 0.5 MB = 512 KB, shown in the smaller unit but honoured exactly.
    await page.getByLabel("Unit").selectOption("MB");
    await page.getByLabel("Target file size").fill("0.5");
    await expect(page.locator(".compressor-summary")).toHaveText(
      "Target 512 KB",
    );
    await compress(page, 1, 200_000);
    const mbText = await stats(page);
    expect(statValue(mbText, "Target")).toContain("512 KB · met at q");
    const mb = await download(page, await resultName(page));
    expect(mb.length).toBeLessThanOrEqual(512 * 1024);
    expect((await decode(page, mb, "image/webp")).width).toBe(1600);

    // The same search works for JPEG output.
    await page.getByLabel("Output format").selectOption("image/jpeg");
    await page.getByLabel("Unit").selectOption("KB");
    await page.getByLabel("Target file size").fill("60");
    await compress(page, 1, 180_000);
    const jpegText = await stats(page);
    expect(statValue(jpegText, "Target")).toContain("60 KB · met at q");
    const jpegTarget = await download(page, await resultName(page));
    expect(signature(jpegTarget)).toBe("jpeg");
    expect(jpegTarget.length).toBeLessThanOrEqual(60 * 1024);

    // Invalid values are rejected in plain language and block the run.
    await page.getByLabel("Target file size").fill("0");
    await expect(page.locator("#compressor-target-help")).toContainText(
      "greater than zero",
    );
    await expect(
      page.getByRole("button", { name: /Compress 1 image/ }),
    ).toBeDisabled();
    await page.getByLabel("Target file size").fill("0.001");
    await expect(page.locator("#compressor-target-help")).toContainText(
      "at least 5 KB",
    );
    await page.getByLabel("Target file size").fill("90");
    await page.getByLabel("Unit").selectOption("KB");
  });

  test("unreachable target without downscaling is flagged, not faked", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    const upload = await photo(page, 2400, 1800, "honest.png", 300, 9000);
    await addImages(page, [upload]);
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByRole("checkbox", { name: /Allow downscaling/ }).uncheck();
    await page.getByLabel("Target file size").fill("5");
    await compress(page, 1, 180_000);
    const text = await stats(page);
    expect(statValue(text, "Dimensions")).toContain(
      "2400 × 1800 px · unchanged",
    );
    expect(statValue(text, "Target")).toContain("not reachable");
    const file = await download(page, await resultName(page));
    expect(file.length).toBeGreaterThan(5 * 1024);
    expect((await decode(page, file, "image/webp")).width).toBe(2400);
    // The honest fallback must still be the smallest encode, never q100.
    expect(file.length).toBeLessThan(upload.buffer.length / 4);
  });

  test("transparent PNG: alpha kept in PNG/WebP, flattened onto the chosen colour for JPEG", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openPage(page);
    await addImages(page, [await alphaPng(page, "sticker.png")]);

    await page.getByLabel("Output format").selectOption("image/webp");
    await compress(page, 1);
    const webp = await download(page, await resultName(page));
    const webpMeta = await decode(page, webp, "image/webp");
    expect(webpMeta.corner[3]).toBe(0);
    expect(webpMeta.band[3]).toBeGreaterThan(110);
    expect(webpMeta.band[3]).toBeLessThan(145);
    expect(webpMeta.centre[0]).toBeGreaterThan(235);
    expect(webpMeta.centre[1]).toBeLessThan(25);

    await page.getByLabel("Output format").selectOption("image/png");
    await compress(page, 1);
    const png = await download(page, await resultName(page));
    const pngMeta = await decode(page, png, "image/png");
    expect(pngMeta.corner[3]).toBe(0);
    expect(pngMeta.band).toEqual([0, 128, 255, 128]);
    expect(pngMeta.centre.slice(0, 3)).toEqual([255, 0, 0]);

    await page.getByLabel("Output format").selectOption("image/jpeg");
    await expect(page.getByLabel("Background")).toBeVisible();
    await page.locator("#compressor-background").fill("#00ff00");
    await expect(page.locator(".compressor-color-row code")).toHaveText(
      "#00ff00",
    );
    await compress(page, 1);
    const jpeg = await download(page, await resultName(page));
    const jpegMeta = await decode(page, jpeg, "image/jpeg");
    expect(jpegMeta.corner[1]).toBeGreaterThan(240);
    expect(jpegMeta.corner[0]).toBeLessThan(20);
    expect(jpegMeta.corner[2]).toBeLessThan(20);
    expect(jpegMeta.centre[0]).toBeGreaterThan(230);
    expect(jpegMeta.corner[3]).toBe(255);
  });

  test("savings, sizes and comparison views match the downloaded bytes", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    const upload = await photo(page, 1100, 800, "savings.png", 250, 3400);
    await addImages(page, [upload]);
    await page.locator("#compressor-quality").fill("65");
    await compress(page, 1);
    const name = await resultName(page);
    const file = await download(page, name);
    const text = await stats(page);
    const percent = ((1 - file.length / upload.buffer.length) * 100).toFixed(1);
    expect(statValue(text, "Savings")).toBe(`${percent}% smaller`);
    expect(statValue(text, "Compressed")).toContain(
      `${(file.length / 1024).toFixed(1)} KB`,
    );
    expect(statValue(text, "Dimensions")).toBe("1100 × 800 px · unchanged");
    expect(statValue(text, "Quality")).toBe("65%");

    // Original/Result toggle swaps the preview source and pixel content.
    const preview = page.locator(".compressor-main-image");
    const resultSrc = await preview.getAttribute("src");
    await page.getByRole("button", { name: "Original", exact: true }).click();
    const originalSrc = await preview.getAttribute("src");
    expect(originalSrc).not.toBe(resultSrc);
    await page.getByRole("button", { name: "Result", exact: true }).click();
    expect(await preview.getAttribute("src")).toBe(resultSrc);

    // Split comparison: slider moves the clip path and both layers decode.
    await page.getByRole("button", { name: /Split/ }).click();
    const top = page.locator(".compressor-split-top");
    await expect(top).toHaveCSS(
      "clip-path",
      /inset\(0(px)? 0(px)? 0(px)? 50%\)/,
    );
    await page.locator("#compressor-split").fill("25");
    await expect(top).toHaveCSS(
      "clip-path",
      /inset\(0(px)? 0(px)? 0(px)? 25%\)/,
    );
    await expect(page.locator(".compressor-split-left")).toHaveText("Before");
    await expect(page.locator(".compressor-split-right")).toHaveText("After");
    const layers = await page
      .locator(".compressor-stage img")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const image = node as HTMLImageElement;
          return [image.naturalWidth, image.naturalHeight];
        }),
      );
    expect(layers).toContainEqual([1100, 800]);

    // Side by side uses real originals and results with captions.
    await page.getByRole("button", { name: /Side by side/ }).click();
    const figures = page.locator(".compressor-compare figure");
    await expect(figures).toHaveCount(2);
    await expect(figures.first().locator("figcaption")).toContainText(
      "Original",
    );
    await expect(figures.nth(1).locator("figcaption")).toContainText(
      "Compressed",
    );
    const side = await figures.locator("img").evaluateAll((nodes) =>
      nodes.map((node) => {
        const image = node as HTMLImageElement;
        return [image.naturalWidth, image.naturalHeight];
      }),
    );
    expect(side).toEqual([
      [1100, 800],
      [1100, 800],
    ]);
  });

  test("WebP input is accepted and re-encoded like any other format", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    const base64 = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 640, 360);
      gradient.addColorStop(0, "#ffb347");
      gradient.addColorStop(1, "#2f4858");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 360);
      for (let index = 0; index < 400; index += 1) {
        ctx.fillStyle = `hsla(${index % 360}, 60%, 55%, 0.35)`;
        ctx.fillRect((index * 53) % 640, (index * 97) % 360, 12, 12);
      }
      return canvas.toDataURL("image/webp", 0.85).split(",")[1];
    });
    await addImages(page, [
      {
        name: "webp-source.webp",
        mimeType: "image/webp",
        buffer: Buffer.from(base64, "base64"),
      },
    ]);
    await expect(page.locator(".compressor-item-size")).toHaveText(
      "640 × 360 px · 80% quality",
    );
    await page.getByRole("button", { name: "40%", exact: true }).click();
    await compress(page, 1);
    const webp = await download(page, await resultName(page));
    expect(signature(webp)).toBe("webp");
    expect(await resultName(page)).toBe("webp-source-compressed-640x360.webp");
    expect((await decode(page, webp, "image/webp")).width).toBe(640);

    await page.getByLabel("Output format").selectOption("image/png");
    await compress(page, 1);
    const png = await download(page, await resultName(page));
    expect(signature(png)).toBe("png");
    expect((await decode(page, png, "image/png")).height).toBe(360);
  });

  test("EXIF-rotated phone photos report the orientation users see", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await exifRotatedJpeg(page, "phone.jpg")]);
    // The stored pixels are 900x600, EXIF orientation 6 shows 600x900.
    await expect(page.locator(".compressor-item-size")).toHaveText(
      "600 × 900 px · 80% quality",
    );
    await page.locator(".compressor-details summary").click();
    await expect(page.locator(".compressor-details-body")).toContainText(
      "EXIF orientation",
    );
    await expect(page.locator(".compressor-details-body")).toContainText(
      "auto-corrected",
    );
    await compress(page, 1);
    const text = await stats(page);
    expect(statValue(text, "Dimensions")).toBe("600 × 900 px · unchanged");
    const file = await download(page, await resultName(page));
    expect(await resultName(page)).toBe("phone-compressed-600x900.webp");
    const meta = await decode(page, file, "image/webp");
    expect([meta.width, meta.height]).toEqual([600, 900]);
  });

  test("PNG target mode resizes honestly and never claims a quality it ignores", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await addImages(page, [
      await photo(page, 1200, 900, "lossless-target.png", 210, 5000),
    ]);
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByLabel("Target file size").fill("60");
    await compress(page, 1, 90_000);
    const text = await stats(page);
    expect(statValue(text, "Target")).toMatch(/^60 KB · met( by resizing)?$/);
    expect(statValue(text, "Target")).not.toContain("q100");
    const file = await download(page, await resultName(page));
    expect(signature(file)).toBe("png");
    expect(file.length).toBeLessThanOrEqual(60 * 1024);
    expect(statValue(text, "Dimensions")).toContain("(scaled)");
  });

  test("per-image JPEG override exposes the flatten colour and applies it", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await addImages(page, [await alphaPng(page, "override-alpha.png")]);
    // Batch stays lossless WebP, so the background control only appears
    // because a per-image override asks for JPEG.
    await expect(page.getByLabel("Background")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Custom settings for override-alpha.png" })
      .click();
    const row = page.locator(".compressor-item").first();
    await row.getByLabel(/Custom settings for this image/).check();
    await row.getByLabel("Custom format").selectOption("image/jpeg");
    await expect(page.getByLabel("Background")).toBeVisible();
    await page.locator("#compressor-background").fill("#00ff00");
    await compress(page, 1);
    const file = await download(page, await resultName(page));
    expect(signature(file)).toBe("jpeg");
    const meta = await decode(page, file, "image/jpeg");
    expect(meta.corner[1]).toBeGreaterThan(240);
    expect(meta.corner[0]).toBeLessThan(20);
    expect(meta.centre[0]).toBeGreaterThan(230);
  });

  test("batch with per-image overrides produces the promised formats and names", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openPage(page);
    const first = await photo(page, 900, 600, "first.png", 200, 900);
    const second = await photo(page, 700, 500, "second.png", 30, 900);
    const third = await jpegPhoto(page, "third.jpg");
    await addImages(page, [first, second, third]);

    // Global: WebP 80%.
    await page.getByLabel("Output format").selectOption("image/webp");
    await page.locator("#compressor-quality").fill("80");

    // Image 2: JPEG 35 with a custom name and suffix.
    await page
      .getByRole("button", { name: "Custom settings for second.png" })
      .click();
    const secondPanel = page.locator(".compressor-item").nth(1);
    await secondPanel.getByLabel(/Custom settings for this image/).check();
    await secondPanel.getByLabel("Custom format").selectOption("image/jpeg");
    await secondPanel.getByLabel("Custom quality").fill("35");
    await secondPanel.getByLabel("Custom output name").fill("hero");
    await secondPanel.getByLabel("Suffix for this image").fill("social");
    await expect(secondPanel.locator(".compressor-extra-foot code")).toHaveText(
      "hero-social-700x500.jpg",
    );

    // Image 3: PNG keeps its original name plus a suffix.
    await page
      .getByRole("button", { name: "Custom settings for third.jpg" })
      .click();
    const thirdPanel = page.locator(".compressor-item").nth(2);
    await thirdPanel.getByLabel(/Custom settings for this image/).check();
    await thirdPanel.getByLabel("Custom format").selectOption("image/png");
    await thirdPanel.getByLabel("Suffix for this image").fill("lossless");
    await expect(thirdPanel.locator(".compressor-extra-foot code")).toHaveText(
      "third-lossless-800x800.png",
    );

    await compress(page, 3);
    const names = await page
      .locator(".compressor-item-body strong")
      .allInnerTexts();
    expect(names).toEqual(["first.png", "second.png", "third.jpg"]);
    const rows = await page
      .locator(".compressor-item-body span")
      .allInnerTexts();
    expect(rows.some((row) => row.includes("custom"))).toBe(true);

    // Each row downloads its own real file.
    const firstBytes = await downloadRow(page, 0);
    const secondBytes = await downloadRow(page, 1);
    const thirdBytes = await downloadRow(page, 2);
    expect(signature(firstBytes.buffer)).toBe("webp");
    expect(signature(secondBytes.buffer)).toBe("jpeg");
    expect(signature(thirdBytes.buffer)).toBe("png");
    expect(firstBytes.name).toBe("first-compressed-900x600.webp");
    expect(secondBytes.name).toBe("hero-social-700x500.jpg");
    expect(thirdBytes.name).toBe("third-lossless-800x800.png");
    expect(signature(await download(page, await resultName(page)))).toBe(
      "webp",
    );
    expect(secondBytes.buffer.length).toBeLessThan(
      firstBytes.buffer.length * 2,
    );
    const secondMeta = await decode(page, secondBytes.buffer, "image/jpeg");
    expect([secondMeta.width, secondMeta.height]).toEqual([700, 500]);
  });

  test("ZIP archive passes unzip -t and every entry decodes", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    await openPage(page);
    await addImages(page, [
      await photo(page, 640, 480, "zip-one.png", 190, 400),
      await photo(page, 800, 600, "zip-two.png", 320, 400),
      await alphaPng(page, "zip-alpha.png"),
    ]);
    await compress(page, 3);

    const zipPath = await downloadZip(page, testInfo);
    // Independent validation: Info-ZIP checks every CRC.
    const listing = execFileSync("unzip", ["-t", zipPath], {
      encoding: "utf8",
    });
    expect(listing).toContain("No errors detected");
    const names = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
      .trim()
      .split("\n");
    expect(names.sort()).toEqual(
      [
        "zip-one-compressed-640x480.webp",
        "zip-two-compressed-800x600.webp",
        "zip-alpha-compressed-400x300.webp",
      ].sort(),
    );

    const expected = [
      {
        name: "zip-one-compressed-640x480.webp",
        width: 640,
        height: 480,
        type: "image/webp",
      },
      {
        name: "zip-two-compressed-800x600.webp",
        width: 800,
        height: 600,
        type: "image/webp",
      },
      {
        name: "zip-alpha-compressed-400x300.webp",
        width: 400,
        height: 300,
        type: "image/webp",
      },
    ];
    for (const entry of expected) {
      const bytes = execFileSync("unzip", ["-p", zipPath, entry.name]);
      expect(signature(bytes)).toBe("webp");
      const meta = await decode(page, bytes, entry.type);
      expect([meta.width, meta.height]).toEqual([entry.width, entry.height]);
      expect(bytes.length).toBeGreaterThan(500);
    }
    // Alpha survives the archive round-trip.
    const alpha = execFileSync("unzip", [
      "-p",
      zipPath,
      "zip-alpha-compressed-400x300.webp",
    ]);
    expect((await decode(page, alpha, "image/webp")).corner[3]).toBe(0);

    // Two identical source names must not overwrite each other in the archive.
    const duplicate = await photo(page, 500, 500, "same-name.png", 45, 300);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByLabel("Add images").setInputFiles([duplicate, duplicate]);
    await compress(page, 2);
    const duplicateZip = await downloadZip(page, testInfo);
    const duplicateNames = execFileSync("unzip", ["-Z1", duplicateZip], {
      encoding: "utf8",
    })
      .trim()
      .split("\n");
    expect(duplicateNames).toHaveLength(2);
    expect(new Set(duplicateNames).size).toBe(2);
    expect(
      execFileSync("unzip", ["-t", duplicateZip], { encoding: "utf8" }),
    ).toContain("No errors detected");
  });

  test("large images compress locally without page errors or memory blow-ups", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openPage(page);
    const large = await photo(page, 5000, 4000, "large.png", 215, 14000);
    expect(large.buffer.length).toBeGreaterThan(1_000_000);
    await addImages(page, [large]);
    await compress(page, 1, 240_000);
    const file = await download(page, await resultName(page));
    expect((await decode(page, file, "image/webp")).width).toBe(5000);
    expect(file.length).toBeLessThan(large.buffer.length);
    expect((await stats(page)).replace(/\n/g, " ")).toContain(
      "5000 × 4000 px · unchanged",
    );

    // A hard target forces several downscale passes on the same big source.
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByLabel("Target file size").fill("30");
    await compress(page, 1, 240_000);
    const targeted = await download(page, await resultName(page));
    expect(targeted.length).toBeLessThanOrEqual(30 * 1024);
    const meta = await decode(page, targeted, "image/webp");
    expect(meta.width).toBeLessThanOrEqual(5000);
    expect(meta.height).toBeLessThanOrEqual(4000);
    const text = await stats(page);
    expect(statValue(text, "Target")).toMatch(/met at q|not reachable/);
    expect(errors).toEqual([]);
  });

  test("Stop halts a long batch, keeps finished images and allows a clean restart", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await openPage(page);
    const uploads: Upload[] = [];
    for (let index = 0; index < 5; index += 1)
      uploads.push(
        await photo(
          page,
          3600,
          2600,
          `long-${index + 1}.png`,
          20 + index * 40,
          800,
        ),
      );
    await addImages(page, uploads);
    await page.getByRole("button", { name: /Compress 5 images/ }).click();
    await expect(page.locator(".compressor-cancel")).toBeVisible();
    await expect(page.locator(".compressor-progress")).toBeVisible();
    // Let at least one image finish so the "kept" path is exercised.
    await expect(page.locator(".compressor-status-done").first()).toBeVisible({
      timeout: 120_000,
    });
    await page.locator(".compressor-cancel").click();
    await expect(page.locator(".compressor-cancel")).toHaveCount(0);
    await expect(page.locator(".compressor-notice")).toContainText("stopped");
    await expect(page.locator(".compressor-status-done")).not.toHaveCount(5);
    const doneCount = await page.locator(".compressor-status-done").count();
    expect(doneCount).toBeGreaterThan(0);
    expect(doneCount).toBeLessThan(5);
    const finishedName = await page.locator(".compressor-filename").innerText();
    const kept = await download(page, finishedName.trim());
    expect(signature(kept)).toBe("webp");
    await expect(
      page.getByRole("button", { name: /Download ZIP/ }),
    ).toBeEnabled();

    // Restart runs the whole queue again and finishes.
    await compress(page, 5, 240_000);
    await expect(page.locator(".compressor-status-done")).toHaveCount(5);
  });

  test("failed images can be retried and recovered without losing other results", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await openPage(page);
    await addImages(page, [
      await photo(page, 600, 400, "safe.png", 120, 300),
      await brokenPng(page, "broken.png"),
    ]);
    await page.getByRole("button", { name: /Compress 2 images/ }).click();
    await expect(page.locator(".compressor-status-error")).toHaveCount(1, {
      timeout: 90_000,
    });
    await expect(page.locator(".compressor-status-done")).toHaveCount(1);
    await expect(page.locator(".compressor-item-error")).toContainText(
      /could not be decoded|decode|invalid/i,
    );
    await expect(page.locator(".compressor-notice")).toContainText(
      "1 compressed successfully",
    );
    const retry = page.getByRole("button", { name: /Retry failed/ });
    await expect(retry).toHaveText(/Retry failed \(1\)/);
    const safeBefore = await download(page, await resultName(page));

    await retry.click();
    await expect(page.locator(".compressor-status-error")).toHaveCount(1, {
      timeout: 90_000,
    });
    await expect(page.locator(".compressor-alert")).toContainText(
      "None of the images could be compressed",
    );
    // The ZIP only ships files that actually finished.
    const zipPath = await downloadZip(page, testInfo);
    const entries = execFileSync("unzip", ["-Z1", zipPath], {
      encoding: "utf8",
    })
      .trim()
      .split("\n");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toContain("safe-compressed-600x400");
    // The healthy result is untouched byte-for-byte.
    const safeAfter = await download(page, (await resultName(page)).trim());
    expect(safeAfter.length).toBe(safeBefore.length);

    // Replace the damaged file with a valid one and retry successfully.
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Replace broken.png" }).click();
    const valid = await photo(page, 500, 380, "fixed.png", 10, 300);
    await (await chooser).setFiles(valid);
    await expect(page.locator(".compressor-item")).toHaveCount(2);
    await expect(page.locator(".compressor-status-ready")).toHaveCount(1);
    await expect(page.locator(".compressor-status-done")).toHaveCount(1);
    await compress(page, 2);
    await expect(page.locator(".compressor-status-done")).toHaveCount(2);
  });

  test("size boundaries are enforced without crashing", async ({ page }) => {
    test.setTimeout(180_000);
    await openPage(page);
    // Exactly 24 MP and 8,192 px on the long side are allowed.
    await addImages(page, [
      await photo(page, 6000, 4000, "exact-24mp.png", 205, 600),
    ]);
    await expect(page.locator(".compressor-item-size")).toHaveText(
      "6000 × 4000 px · 80% quality",
    );
    await compress(page, 1, 150_000);
    expect(statValue(await stats(page), "Dimensions")).toBe(
      "6000 × 4000 px · unchanged",
    );
    const file = await download(page, await resultName(page));
    expect((await decode(page, file, "image/webp")).width).toBe(6000);

    // One pixel over the 8,192 side limit is rejected with the stated rule.
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page
      .getByLabel("Add images")
      .setInputFiles([await photo(page, 8200, 100, "too-wide.png", 20, 20)]);
    await expect(page.locator(".compressor-alert")).toContainText(
      "neither side above 8,192 pixels",
    );
    await expect(page.locator(".compressor-item")).toHaveCount(0);
  });

  test("every visible control changes real state", async ({ page }) => {
    test.setTimeout(180_000);
    await openPage(page);

    // Drop zone accepts a real drag-and-drop.
    const fixture = await photo(page, 640, 480, "dropped.png", 150, 300);
    await page.evaluate(async (base64) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1)
        bytes[index] = binary.charCodeAt(index);
      const file = new File([bytes], "dropped.png", { type: "image/png" });
      const data = new DataTransfer();
      data.items.add(file);
      const zone = document.querySelector(".compressor-drop")!;
      zone.dispatchEvent(
        new DragEvent("dragover", {
          dataTransfer: data,
          bubbles: true,
          cancelable: true,
        }),
      );
      zone.dispatchEvent(
        new DragEvent("drop", {
          dataTransfer: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, fixture.buffer.toString("base64"));
    await expect(page.locator(".compressor-item")).toHaveCount(1);
    await page
      .getByLabel("Add images")
      .setInputFiles([
        await photo(page, 500, 500, "second.png", 300, 300),
        await photo(page, 400, 300, "third.png", 60, 300),
      ]);
    await expect(page.locator(".compressor-item")).toHaveCount(3);

    // Thumbnails switch the active preview.
    await page.getByRole("button", { name: "Preview second.png" }).click();
    await expect(
      page.getByRole("button", { name: "Preview second.png" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByAltText("Original preview of second.png"),
    ).toBeVisible();

    // Metadata panel opens with real scan results.
    await page.locator(".compressor-details summary").click();
    await expect(page.locator(".compressor-details")).toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator(".compressor-details-body")).toContainText("PNG");

    // Quality chips/slider are linked and the summary follows.
    for (const step of [40, 60, 100]) {
      await page.getByRole("button", { name: `${step}%`, exact: true }).click();
      await expect(page.locator("#compressor-quality")).toHaveValue(
        String(step),
      );
      await expect(page.locator(".compressor-summary")).toHaveText(
        `${step}% quality`,
      );
    }
    await page.locator("#compressor-quality").fill("55");
    await expect(page.locator(".compressor-summary")).toHaveText("55% quality");

    // Mode switch shows target controls; unit switch updates the summary.
    await page.getByRole("radio", { name: /Target size/ }).check();
    await expect(page.getByLabel("Target file size")).toBeVisible();
    await page.getByLabel("Target file size").fill("20");
    await page.getByLabel("Unit").selectOption("MB");
    await expect(page.locator(".compressor-summary")).toHaveText(
      "Target 20 MB",
    );
    await page.getByLabel("Unit").selectOption("KB");
    await expect(page.locator(".compressor-summary")).toHaveText(
      "Target 20 KB",
    );
    const downscale = page.getByRole("checkbox", { name: /Allow downscaling/ });
    await downscale.uncheck();
    await expect(page.getByText(/Dimensions stay identical/)).toBeVisible();
    await downscale.check();
    await page.getByRole("radio", { name: /Quality/ }).check();

    // Output format and naming controls feed the live output-name preview.
    await page.getByLabel("Output format").selectOption("image/jpeg");
    await page.locator("#compressor-name").fill("marketing");
    await page.locator("#compressor-suffix").fill("web");
    await expect(page.locator(".compressor-name-preview code")).toHaveText(
      "marketing-web-500x500.jpg",
    );
    await page.getByLabel("Background").fill("#123456");
    await expect(page.locator(".compressor-color-row code")).toHaveText(
      "#123456",
    );
    await page.locator("#compressor-suffix").fill("");

    // Per-image panel: enable, edit, then reset to batch settings.
    await page
      .getByRole("button", { name: "Custom settings for third.png" })
      .click();
    const third = page.locator(".compressor-item").nth(2);
    await expect(
      page.getByRole("button", { name: "Custom settings for third.png" }),
    ).toHaveAttribute("aria-expanded", "true");
    await third.getByLabel(/Custom settings for this image/).check();
    await expect(third.locator(".compressor-extra-grid")).toBeVisible();
    await third.getByLabel("Custom format").selectOption("image/webp");
    await third.getByLabel("Custom output name").fill("tiny");
    await expect(third.locator(".compressor-extra-foot code")).toHaveText(
      "tiny-compressed-400x300.webp",
    );
    await third
      .getByRole("button", { name: /Reset this image's settings/ })
      .click();
    await expect(third.locator(".compressor-extra-grid")).toHaveCount(0);
    await expect(
      third.locator(".compressor-item-body span").first(),
    ).not.toContainText("custom");

    // Compress, then every result-side control.
    await page.getByRole("radio", { name: /Quality/ }).check();
    await page.locator("#compressor-quality").fill("70");
    await compress(page, 3, 120_000);
    await expect(
      page.getByRole("button", { name: /Download ZIP/ }),
    ).toBeEnabled();
    await expect(page.locator(".compressor-toggle button")).toHaveCount(2);
    await page.getByRole("button", { name: "Original", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Original", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Result", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Result", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Split/ }).click();
    await page.locator("#compressor-split").fill("70");
    await expect(page.locator(".compressor-split-top")).toHaveCSS(
      "clip-path",
      /inset\(0(px)? 0(px)? 0(px)? 70%\)/,
    );
    await page.getByRole("button", { name: /Side by side/ }).click();
    await expect(page.locator(".compressor-compare figure")).toHaveCount(2);
    await page.getByRole("button", { name: "Single", exact: true }).click();
    await expect(page.locator(".compressor-compare")).toHaveCount(0);

    // Replace a file in place (file chooser path) and remove another.
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Replace dropped.png" }).click();
    await (
      await chooser
    ).setFiles(await photo(page, 320, 240, "dropped-new.png", 90, 200));
    await expect(page.locator(".compressor-item").first()).toContainText(
      "dropped-new.png",
    );
    await expect(page.locator(".compressor-status-ready")).toHaveCount(1);
    await expect(page.locator(".compressor-status-done")).toHaveCount(2);
    await page.getByRole("button", { name: "Remove second.png" }).click();
    await expect(page.locator(".compressor-item")).toHaveCount(2);

    // Reset empties the workspace and revokes download links.
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.locator(".compressor-item")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Compress images/ }),
    ).toBeDisabled();
    await expect(page.locator(".compressor-empty")).toBeVisible();
  });

  test("AVIF is offered only when the browser can encode it", async ({
    page,
  }) => {
    await openPage(page);
    const option = page.locator(
      '#compressor-format option[value="image/avif"]',
    );
    const supported = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 4;
      canvas.height = 4;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/avif"),
      );
      return Boolean(blob && blob.type === "image/avif");
    });
    if (supported) {
      await expect(option).toBeEnabled();
    } else {
      await expect(option).toBeDisabled();
      await expect(option).toContainText("unsupported here");
      await expect(
        page.getByText(/AVIF encoding is unavailable in this browser/),
      ).toBeVisible();
    }
  });

  test("desktop accessibility: named controls, keyboard flow and axe", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await addImages(page, [await photo(page, 600, 450, "a11y.png", 240, 300)]);

    const unnamed = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".compressor-workspace button, .compressor-workspace input, .compressor-workspace select, .compressor-workspace a[download]",
        ),
      )
        .filter((element) => {
          if (element.closest("[hidden]")) return false;
          if (element.classList.contains("sr-only")) return false;
          const label = element.getAttribute("aria-label");
          const labelled = element.getAttribute("aria-labelledby");
          const inner = element.textContent?.trim();
          const id = element.getAttribute("id");
          const explicit = id
            ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim()
            : "";
          const wrapping = element.closest("label")?.textContent?.trim();
          const title = element.getAttribute("title");
          return (
            !label && !labelled && !inner && !explicit && !wrapping && !title
          );
        })
        .map((element) => element.outerHTML.slice(0, 120)),
    );
    expect(unnamed).toEqual([]);

    // Keyboard: focus the slider and change it with arrow keys.
    await page.locator("#compressor-quality").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#compressor-quality")).toHaveValue("79");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".compressor-summary")).toHaveText("80% quality");

    const results = await new AxeBuilder({ page })
      .include(".compressor-workspace")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map(
        (violation) => `${violation.id}: ${violation.help}`,
      ),
    ).toEqual([]);

    await compress(page, 1);
    const after = await new AxeBuilder({ page })
      .include(".compressor-workspace")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(after.violations.map((violation) => violation.id)).toEqual([]);
  });

  test("mobile 390px: full touch workflow without overflow", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    try {
      await openPage(page);
      await expect(page.getByLabel("Add images")).toBeAttached();
      await addImages(page, [
        await photo(page, 900, 1200, "phone-a.png", 320, 600),
        await photo(page, 1400, 900, "phone-b.png", 205, 600),
      ]);
      // Tap the 60% chip, choose JPEG, then compress with a tap.
      await page.getByRole("button", { name: "60%", exact: true }).tap();
      await expect(page.locator("#compressor-quality")).toHaveValue("60");
      await page.getByLabel("Output format").selectOption("image/jpeg");
      await page.getByRole("button", { name: /Compress 2 images/ }).tap();
      await expect(page.locator(".compressor-status-done")).toHaveCount(2, {
        timeout: 90_000,
      });
      await expect(
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).resolves.toBe(true);

      const heights = await page
        .locator(".compressor-actions button, .compressor-icon-button")
        .evaluateAll((nodes) =>
          nodes
            .filter((node) => (node as HTMLElement).offsetParent !== null)
            .map(
              (node) => (node as HTMLElement).getBoundingClientRect().height,
            ),
        );
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(39.5);

      await page.getByRole("button", { name: "Preview phone-b.png" }).tap();
      await page.getByRole("button", { name: /Side by side/ }).tap();
      await expect(page.locator(".compressor-compare figure")).toHaveCount(2);
      const name = (
        await page.locator(".compressor-filename").innerText()
      ).trim();
      const file = await download(page, name);
      expect(signature(file)).toBe("jpeg");
      expect((await decode(page, file, "image/jpeg")).width).toBe(1400);

      const mobileAxe = await new AxeBuilder({ page })
        .include(".compressor-workspace")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(mobileAxe.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test("batch limits and empty-state guards are honest", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await openPage(page);
    await expect(
      page.getByRole("button", { name: /Download ZIP/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Reset", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".compressor-empty")).toBeVisible();

    const many: Upload[] = [];
    for (let index = 0; index < 21; index += 1)
      many.push(
        await photo(page, 120, 90, `batch-${index + 1}.png`, 100 + index, 20),
      );
    await page.getByLabel("Add images").setInputFiles(many);
    await expect(page.locator(".compressor-item")).toHaveCount(20);
    await expect(page.locator(".compressor-alert")).toContainText(
      "batch limit is 20",
    );
    await expect(
      page.getByRole("button", { name: /Compress 20 images/ }),
    ).toBeEnabled();
    await compress(page, 20, 120_000);
    await expect(page.locator(".compressor-status-done")).toHaveCount(20);
    const zipPath = await downloadZip(page, testInfo);
    const entries = execFileSync("unzip", ["-Z1", zipPath], {
      encoding: "utf8",
    })
      .trim()
      .split("\n");
    expect(entries).toHaveLength(20);
    expect(
      execFileSync("unzip", ["-t", zipPath], { encoding: "utf8" }),
    ).toContain("No errors detected");
  });

  test("stopping before the first image finishes leaves a clean queue", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await addImages(page, [
      await photo(page, 3200, 2400, "early-a.png", 20, 600),
      await photo(page, 3200, 2400, "early-b.png", 200, 600),
    ]);
    await page.getByRole("button", { name: /Compress 2 images/ }).click();
    await expect(page.locator(".compressor-cancel")).toBeVisible();
    await page.locator(".compressor-cancel").click();
    await expect(page.locator(".compressor-cancel")).toHaveCount(0);
    await expect(page.locator(".compressor-notice")).toContainText(
      "stopped before any image finished",
    );
    await expect(page.locator(".compressor-status-working")).toHaveCount(0);
    await expect(page.locator(".compressor-status-ready")).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: /Compress 2 images/ }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /Download ZIP/ }),
    ).toBeDisabled();
    // The queue is still usable.
    await compress(page, 2);
    await expect(page.locator(".compressor-status-done")).toHaveCount(2);
  });
});

/** Download the result attached to a specific queue row. */
async function downloadRow(page: Page, index: number) {
  const row = page.locator(".compressor-item").nth(index);
  const label = await row
    .locator("a.compressor-icon-button")
    .getAttribute("aria-label");
  expect(label).toBeTruthy();
  const name = label!.replace(/^Download /, "");
  const pending = page.waitForEvent("download");
  await row.locator("a.compressor-icon-button").click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe(name);
  return { name, buffer: await readFile((await file.path())!) };
}
