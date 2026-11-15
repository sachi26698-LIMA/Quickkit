import { test, expect, type Page, type TestInfo } from "./helpers/tool-test";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

type Upload = { name: string; mimeType: string; buffer: Buffer };

/* ------------------------------- fixtures -------------------------------- */

async function quadrants(
  page: Page,
  width: number,
  height: number,
  name: string,
  mimeType = "image/png",
): Promise<Upload> {
  const base64 = await page.evaluate(
    async ([w, h, type]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const half = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
      ctx.fillStyle = "#e02020";
      ctx.fillRect(0, 0, half.x, half.y);
      ctx.fillStyle = "#20b040";
      ctx.fillRect(half.x, 0, w - half.x, half.y);
      ctx.fillStyle = "#2040e0";
      ctx.fillRect(0, half.y, half.x, h - half.y);
      ctx.fillStyle = "#e0b000";
      ctx.fillRect(half.x, half.y, w - half.x, h - half.y);
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((value) => resolve(value!), type, 0.97),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    [width, height, mimeType] as const,
  );
  return { name, mimeType, buffer: Buffer.from(base64, "base64") };
}

async function alphaPng(page: Page, name = "sticker.png"): Promise<Upload> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 300);
    ctx.fillStyle = "#d62d20";
    ctx.beginPath();
    ctx.arc(200, 150, 110, 0, Math.PI * 2);
    ctx.fill();
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), "image/png"),
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

/** Photographic gradient: cheap to decode, realistic to encode. */
async function gradientPhoto(
  page: Page,
  width: number,
  height: number,
  name: string,
  mimeType = "image/jpeg",
  tone = 205,
): Promise<Upload> {
  const base64 = await page.evaluate(
    async ([w, h, type, hue]) => {
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
      ctx.fillStyle = "rgba(20,30,48,0.75)";
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.66);
      for (let x = 0; x <= w; x += Math.max(8, w / 24))
        ctx.lineTo(x, h * 0.66 + Math.sin((x / w) * Math.PI * 3) * h * 0.08);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((value) => resolve(value!), type, 0.94),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    [width, height, mimeType, tone] as const,
  );
  return { name, mimeType, buffer: Buffer.from(base64, "base64") };
}

/**
 * A 200 × 300 JPEG whose EXIF orientation tag is 6 (rotate 90° clockwise).
 * Stored top half red, bottom half blue → displayed 300 × 200 with red right.
 */
async function exifOriented(page: Page, name = "phone.jpg"): Promise<Upload> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e02020";
    ctx.fillRect(0, 0, 200, 150);
    ctx.fillStyle = "#2040e0";
    ctx.fillRect(0, 150, 200, 150);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), "image/jpeg", 0.98),
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const tiff = [
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01,
      0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00,
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
    let binary = "";
    for (const byte of injected) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  return {
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  };
}

/* -------------------------------- helpers -------------------------------- */

const URL_PATH = "/tools/image-cropper";

async function openPage(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(URL_PATH);
  await expect(page.getByLabel("Add images")).toBeAttached();
  return errors;
}

async function addImages(page: Page, uploads: Upload[]) {
  await page.getByLabel("Add images").setInputFiles(uploads);
  await expect(page.locator(".cropper-queue-item")).toHaveCount(uploads.length);
  await expect(page.locator(".cropper-crop-box")).toBeVisible();
}

async function crop(page: Page, count: number, timeout = 120_000) {
  await page
    .getByRole("button", { name: new RegExp(`Crop ${count} images?`) })
    .click();
  await expect(page.locator(".cropper-status-done")).toHaveCount(count, {
    timeout,
  });
}

async function outputName(page: Page): Promise<string> {
  const text = await page
    .locator(".cropper-name-preview code")
    .first()
    .innerText();
  return text.trim();
}

async function cropSize(
  page: Page,
): Promise<{ width: number; height: number }> {
  const text = await page.locator(".cropper-crop-size").first().innerText();
  const match = text.match(/(\d+)\s*×\s*(\d+)/);
  expect(match, `crop size text was ${text}`).toBeTruthy();
  return { width: Number(match![1]), height: Number(match![2]) };
}

async function cropOrigin(page: Page): Promise<{ x: number; y: number }> {
  const text = await page
    .locator(".cropper-section", { hasText: "Rotate & flip" })
    .locator(".cropper-hint")
    .first()
    .innerText();
  const match = text.match(/at x (\d+), y (\d+)/);
  expect(match, `crop hint was ${text}`).toBeTruthy();
  return { x: Number(match![1]), y: Number(match![2]) };
}

async function download(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: `Download ${name}`, exact: true })
    .first()
    .click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe(name);
  return readFile((await file.path())!);
}

async function downloadZip(page: Page, testInfo: TestInfo, expected = 2) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: new RegExp(`Download ZIP \\(${expected}\\)`) })
    .click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("quickkit-cropped-images.zip");
  const target = testInfo.outputPath("quickkit-cropped-images.zip");
  await writeFile(target, await readFile((await file.path())!));
  return target;
}

async function decode(
  page: Page,
  buffer: Buffer,
  mimeType: string,
  points: [number, number][] = [],
): Promise<{ width: number; height: number; samples: number[][] }> {
  return page.evaluate(
    async ([data, type, samples]) => {
      const image = new Image();
      image.src = `data:${type};base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      return {
        width,
        height,
        samples: samples.map(([fx, fy]) =>
          Array.from(
            ctx.getImageData(
              Math.min(width - 1, Math.round(fx * (width - 1))),
              Math.min(height - 1, Math.round(fy * (height - 1))),
              1,
              1,
            ).data,
          ),
        ),
      };
    },
    [buffer.toString("base64"), mimeType, points] as const,
  );
}

function dominantColour(pixel: number[]) {
  const [r, g, b, a] = pixel;
  if (a < 40) return "transparent";
  if (r > 150 && g < 110 && b < 110) return "red";
  if (g > 120 && r < 110 && b < 110) return "green";
  if (b > 130 && r < 110 && g < 110) return "blue";
  if (r > 150 && g > 110 && b < 90) return "yellow";
  if (r < 40 && g < 40 && b < 40) return "black";
  if (r > 230 && g > 230 && b > 230) return "white";
  return `rgb(${r},${g},${b})`;
}

function signature(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg";
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a")
    return "png";
  if (buffer.subarray(0, 4).toString() === "RIFF") return "webp";
  return "unknown";
}

async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((element, next) => {
    const input = element as HTMLInputElement;
    // React tracks the native value setter, so bypass it to fire onChange.
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, String(next));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function showStage(page: Page) {
  await page.locator(".cropper-canvas").first().scrollIntoViewIfNeeded();
}

async function setBackground(page: Page, colour: string) {
  await page.locator("#cropper-background").evaluate((element, next) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, colour);
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  delta: { x: number; y: number },
  steps = 8,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + delta.x, from.y + delta.y, { steps });
  await page.mouse.up();
}

/* --------------------------------- tests --------------------------------- */

test.describe("Image Cropper", () => {
  test("empty state explains the tool and stays local", async ({ page }) => {
    test.setTimeout(60_000);
    const errors = await openPage(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Image Cropper",
    );
    await expect(page.getByText("Nothing to crop yet")).toBeVisible();
    await expect(page.getByLabel("Add images")).toBeAttached();
    await expect(page.getByText(/Freeform or locked aspect/)).toBeVisible();
    await page
      .getByRole("heading", { name: "Image cropping questions" })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByText("Are my images uploaded to a server?"),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("adds an image, shows its dimensions and crops the whole frame", async ({
    page,
  }) => {
    const errors = await openPage(page);
    await addImages(page, [await quadrants(page, 1200, 800, "landscape.png")]);
    await expect(page.locator(".cropper-summary")).toHaveText(
      "1200 × 800 px source",
    );
    expect(await outputName(page)).toBe("landscape-cropped-1200x800.webp");
    await crop(page, 1);
    const name = await outputName(page);
    expect(name).toBe("landscape-cropped-1200x800.webp");
    const bytes = await download(page, name);
    expect(signature(bytes)).toBe("webp");
    const decoded = await decode(page, bytes, "image/webp", [
      [0.05, 0.05],
      [0.95, 0.05],
      [0.05, 0.95],
    ]);
    expect([decoded.width, decoded.height]).toEqual([1200, 800]);
    expect(decoded.samples.map(dominantColour)).toEqual([
      "red",
      "green",
      "blue",
    ]);
    expect(errors).toEqual([]);
  });

  test("freeform drag moves the crop and corner drags resize it", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 1200, 800, "free.png")]);
    expect(await cropSize(page)).toEqual({ width: 1200, height: 800 });
    expect(await cropOrigin(page)).toEqual({ x: 0, y: 0 });

    await page.getByRole("button", { name: "1:1", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 800, height: 800 });

    await showStage(page);
    const handle = await page
      .getByRole("button", { name: /Resize crop from the se corner/ })
      .boundingBox();
    await drag(
      page,
      { x: handle!.x + handle!.width / 2, y: handle!.y + handle!.height / 2 },
      { x: -120, y: -80 },
    );
    const resized = await cropSize(page);
    expect(resized.width).toBeLessThan(800);
    expect(resized.height).toBeLessThan(800);

    await showStage(page);
    const box = await page.locator(".cropper-crop-box").boundingBox();
    await drag(
      page,
      { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
      { x: 60, y: 40 },
    );
    const moved = await cropOrigin(page);
    expect(moved.x).toBeGreaterThan(200);
    expect(moved.y).toBeGreaterThan(20);
    expect(await cropSize(page)).toEqual(resized);
    // The change is undoable.
    await expect(
      page.getByRole("button", { name: "Undo last crop change" }),
    ).toBeEnabled();
  });

  test("fixed ratio and Instagram/YouTube presets set the crop and export size", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 1200, 800, "social.png")]);

    await page.getByRole("button", { name: "16:9", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 675 });

    await page
      .getByLabel("Social preset")
      .selectOption("preset-instagram-story");
    expect(await cropSize(page)).toEqual({ width: 450, height: 800 });
    expect(await outputName(page)).toBe("social-cropped-1080x1920.webp");
    await expect(page.locator(".cropper-output-bar")).toContainText(
      "1080 × 1920 px",
    );
    await expect(
      page.getByRole("button", { name: "Preset", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    await page
      .getByLabel("Social preset")
      .selectOption("preset-youtube-thumbnail");
    expect(await outputName(page)).toBe("social-cropped-1280x720.webp");
    expect(await cropSize(page)).toEqual({ width: 1200, height: 675 });

    await crop(page, 1);
    const bytes = await download(page, "social-cropped-1280x720.webp");
    const decoded = await decode(page, bytes, "image/webp");
    expect([decoded.width, decoded.height]).toEqual([1280, 720]);
  });

  test("custom width and height sets both the ratio and the output", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 1600, 1200, "custom.png")]);
    await page.getByLabel("Width px").fill("640");
    await page.getByLabel("Height px").fill("480");
    await page.getByRole("button", { name: "Set custom size" }).click();
    expect(await cropSize(page)).toEqual({ width: 1600, height: 1200 });
    // 4:3 crop inside a 1600×1200 frame is the full frame.
    expect(await outputName(page)).toBe("custom-cropped-640x480.webp");
    await expect(page.locator(".cropper-output-bar")).toContainText(
      "640 × 480 px",
    );

    await page.getByLabel("Width px").fill("1000");
    await page.getByLabel("Height px").fill("1000");
    await page.getByRole("button", { name: "Set custom size" }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 1200 });
    expect(await outputName(page)).toBe("custom-cropped-1000x1000.webp");
    await crop(page, 1);
    const bytes = await download(page, "custom-cropped-1000x1000.webp");
    const decoded = await decode(page, bytes, "image/webp");
    expect([decoded.width, decoded.height]).toEqual([1000, 1000]);
  });

  test("zoom, pan and crop-to-visible-area refine large frames", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 1600, 1200, "zoom.png")]);
    await page.getByRole("button", { name: "1:1", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 1200 });

    const zoomIn = page.getByRole("button", { name: "Zoom in" });
    for (let step = 0; step < 4; step += 1) await zoomIn.click();
    await expect(page.locator(".cropper-zoom-value")).toHaveText("300%");

    const stage = page.locator(".cropper-stage");
    expect(
      await stage.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);

    await showStage(page);
    const stageBox = await stage.boundingBox();
    await drag(
      page,
      { x: stageBox!.x + 12, y: stageBox!.y + stageBox!.height / 2 },
      { x: -160, y: -60 },
    );
    expect(
      await stage.evaluate((element) => element.scrollLeft),
    ).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Crop to visible area" }).click();
    const visible = await cropSize(page);
    expect(visible.width).toBeLessThan(1200);
    expect(visible.height).toBeLessThan(1200);
    await expect(page.locator(".cropper-notice")).toContainText("visible area");

    await page.getByRole("button", { name: "Fit" }).click();
    await expect(page.locator(".cropper-zoom-value")).toHaveText("100%");
  });

  test("rotate and flip export the pixels you see", async ({ page }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 400, 300, "rotate.png")]);

    await page.getByRole("button", { name: "90° right" }).click();
    expect(await outputName(page)).toBe("rotate-cropped-300x400.webp");
    await crop(page, 1);
    let bytes = await download(page, "rotate-cropped-300x400.webp");
    let decoded = await decode(page, bytes, "image/webp", [
      [0.05, 0.05],
      [0.95, 0.05],
      [0.05, 0.95],
      [0.95, 0.95],
    ]);
    expect([decoded.width, decoded.height]).toEqual([300, 400]);
    expect(decoded.samples.map(dominantColour)).toEqual([
      "blue",
      "red",
      "yellow",
      "green",
    ]);

    await page.getByRole("button", { name: "Flip H" }).click();
    await expect(page.locator(".cropper-status-done")).toHaveCount(0);
    await crop(page, 1);
    const flippedName = await outputName(page);
    bytes = await download(page, flippedName);
    decoded = await decode(page, bytes, "image/webp", [
      [0.05, 0.05],
      [0.95, 0.05],
      [0.05, 0.95],
      [0.95, 0.95],
    ]);
    expect(decoded.samples.map(dominantColour)).toEqual([
      "red",
      "blue",
      "green",
      "yellow",
    ]);

    await page.getByRole("button", { name: "90° left" }).click();
    await page.getByRole("button", { name: "180°", exact: true }).click();
    await expect(page.locator(".cropper-summary")).toHaveText(
      "400 × 300 px source",
    );
    expect(await outputName(page)).toBe("rotate-cropped-400x300.webp");
  });

  test("circle crop keeps PNG corners transparent", async ({ page }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 400, 300, "circle.png")]);
    await page.getByRole("button", { name: "Circle", exact: true }).click();
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 300, height: 300 });
    expect(await outputName(page)).toBe("circle-cropped-300x300.png");
    await crop(page, 1);
    const bytes = await download(page, "circle-cropped-300x300.png");
    expect(signature(bytes)).toBe("png");
    const decoded = await decode(page, bytes, "image/png", [
      [0.02, 0.02],
      [0.98, 0.02],
      [0.5, 0.5],
      [0.25, 0.02],
    ]);
    expect([decoded.width, decoded.height]).toEqual([300, 300]);
    expect(decoded.samples[0][3]).toBe(0);
    expect(decoded.samples[1][3]).toBe(0);
    expect(decoded.samples[2][3]).toBeGreaterThan(200);
    // A quarter in from the left is outside the inscribed circle.
    expect(decoded.samples[3][3]).toBe(0);
    // Every corner handle is still reachable for resizing.
    await expect(
      page.getByRole("button", { name: /Resize crop from the nw corner/ }),
    ).toBeVisible();
  });

  test("square crop is 1:1 and JPEG circle fills the background", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 400, 300, "square.png")]);
    await page.getByRole("button", { name: "Square", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 300, height: 300 });
    await crop(page, 1);
    let decoded = await decode(
      page,
      await download(page, "square-cropped-300x300.webp"),
      "image/webp",
    );
    expect([decoded.width, decoded.height]).toEqual([300, 300]);

    await page.getByRole("button", { name: "Circle", exact: true }).click();
    await page.getByRole("button", { name: "JPG", exact: true }).click();
    await setBackground(page, "#000000");
    await expect(page.locator(".cropper-color-field code")).toHaveText(
      "#000000",
    );
    await crop(page, 1);
    const bytes = await download(page, "square-cropped-300x300.jpg");
    expect(signature(bytes)).toBe("jpeg");
    decoded = await decode(page, bytes, "image/jpeg", [
      [0.02, 0.02],
      [0.5, 0.5],
    ]);
    expect(decoded.samples[0][3]).toBe(255);
    expect(dominantColour(decoded.samples[0])).toBe("black");
    expect(decoded.samples[1][3]).toBe(255);
  });

  test("JPEG, PNG and WebP export with real signatures", async ({ page }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await addImages(page, [await gradientPhoto(page, 500, 400, "formats.jpg")]);
    const expected = [
      ["JPG", "jpeg", "formats-cropped-500x400.jpg"],
      ["PNG", "png", "formats-cropped-500x400.png"],
      ["WebP", "webp", "formats-cropped-500x400.webp"],
    ] as const;
    for (const [label, kind, name] of expected) {
      await page.getByRole("button", { name: label, exact: true }).click();
      expect(await outputName(page)).toBe(name);
      await crop(page, 1);
      const bytes = await download(page, name);
      expect(signature(bytes)).toBe(kind);
      const meta = await decode(
        page,
        bytes,
        kind === "jpeg" ? "image/jpeg" : `image/${kind}`,
      );
      expect([meta.width, meta.height]).toEqual([500, 400]);
    }
    // PNG is lossless: its quality control is disabled and labelled.
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    await expect(page.locator("#cropper-quality")).toBeDisabled();
    await expect(page.locator(".cropper-slider-head output")).toHaveText(
      "Lossless",
    );
    await page.getByRole("button", { name: "WebP", exact: true }).click();
    await expect(page.locator("#cropper-quality")).toBeEnabled();
  });

  test("quality and output-size controls change the exported bytes and pixels", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await addImages(page, [await gradientPhoto(page, 900, 700, "quality.jpg")]);

    await setRange(page, "#cropper-quality", 40);
    await expect(page.locator(".cropper-slider-head output")).toHaveText("40%");
    await crop(page, 1);
    const low = await download(page, "quality-cropped-900x700.webp");

    await setRange(page, "#cropper-quality", 95);
    await expect(page.locator(".cropper-slider-head output")).toHaveText("95%");
    await crop(page, 1);
    const high = await download(page, "quality-cropped-900x700.webp");
    expect(high.length).toBeGreaterThan(low.length * 1.5);

    await page.getByRole("button", { name: "Scale %", exact: true }).click();
    await setRange(page, "#cropper-scale", 50);
    await expect(page.locator(".cropper-output-bar")).toContainText(
      "450 × 350 px",
    );
    await crop(page, 1);
    let decoded = await decode(
      page,
      await download(page, "quality-cropped-450x350.webp"),
      "image/webp",
    );
    expect([decoded.width, decoded.height]).toEqual([450, 350]);

    await page.getByRole("button", { name: "Custom px", exact: true }).click();
    await page.getByLabel("Output width").fill("320");
    await page.getByLabel("Output height").fill("200");
    await crop(page, 1);
    decoded = await decode(
      page,
      await download(page, "quality-cropped-320x200.webp"),
      "image/webp",
    );
    expect([decoded.width, decoded.height]).toEqual([320, 200]);
  });

  test("compare view shows original versus cropped with a working split", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 800, 600, "compare.png")]);
    await page.getByRole("button", { name: "1:1", exact: true }).click();
    await crop(page, 1);

    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(
      page.locator(".cropper-split-tag", { hasText: "CROPPED" }),
    ).toBeVisible();
    await expect(
      page.locator(".cropper-split-tag", { hasText: "ORIGINAL" }),
    ).toBeVisible();
    await setRange(page, ".cropper-split-range input", 25);
    await expect(page.locator(".cropper-split-line")).toHaveAttribute(
      "style",
      /left: 25%/,
    );
    const clip = await page
      .locator(".cropper-split-top")
      .evaluate((element) => getComputedStyle(element).clipPath);
    expect(clip).toContain("75%");

    await page.getByRole("button", { name: "Side by side" }).click();
    await expect(page.locator(".cropper-side-by-side figure")).toHaveCount(2);
    await expect(page.locator(".cropper-side-by-side")).toContainText(
      "Original",
    );
    await expect(page.locator(".cropper-side-by-side")).toContainText(
      "Cropped",
    );

    await page.getByRole("button", { name: "Cropped", exact: true }).click();
    await expect(page.locator(".cropper-static-caption")).toContainText(
      "600 × 600",
    );
    await page.getByRole("button", { name: "Original", exact: true }).click();
    await expect(page.locator(".cropper-static-caption")).toContainText(
      "800 × 600",
    );
  });

  test("batch crops each image with its own settings", async ({ page }) => {
    test.setTimeout(150_000);
    await openPage(page);
    await addImages(page, [
      await quadrants(page, 600, 900, "portrait.png"),
      await quadrants(page, 1200, 800, "landscape.png"),
    ]);
    await expect(page.locator(".cropper-summary")).toHaveText(
      "600 × 900 px source",
    );
    await page.getByRole("button", { name: "1:1", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 600, height: 600 });

    await page.getByRole("button", { name: "Edit landscape.png" }).click();
    await expect(page.locator(".cropper-summary")).toHaveText(
      "1200 × 800 px source",
    );
    await page.getByRole("button", { name: "16:9", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 675 });
    await expect(page.locator(".cropper-name-preview code")).toHaveText(
      "landscape-cropped-1200x675.webp",
    );

    await crop(page, 2);
    const first = await decode(
      page,
      await download(page, "portrait-cropped-600x600.webp"),
      "image/webp",
    );
    expect([first.width, first.height]).toEqual([600, 600]);
    const second = await decode(
      page,
      await download(page, "landscape-cropped-1200x675.webp"),
      "image/webp",
    );
    expect([second.width, second.height]).toEqual([1200, 675]);

    await expect(page.locator(".cropper-queue-foot")).toContainText(
      "2 of 2 cropped",
    );
  });

  test("apply-to-all copies ratio, shape and export settings", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await addImages(page, [
      await quadrants(page, 900, 600, "one.png"),
      await quadrants(page, 800, 500, "two.png"),
    ]);
    await page.getByRole("button", { name: "Circle", exact: true }).click();
    await page
      .getByRole("button", { name: "Apply ratio & shape to all" })
      .click();
    await expect(page.locator(".cropper-queue-item").nth(1)).toContainText(
      "circle",
    );
    await page.getByRole("button", { name: "JPG", exact: true }).click();
    await page.getByRole("button", { name: "Apply export to all" }).click();
    await expect(page.locator(".cropper-name-preview code")).toHaveText(
      "one-cropped-600x600.jpg",
    );
    await page.getByRole("button", { name: "Edit two.png" }).click();
    await expect(page.locator(".cropper-name-preview code")).toHaveText(
      "two-cropped-500x500.jpg",
    );
    await crop(page, 2);
    await expect(page.locator(".cropper-queue-item")).toHaveCount(2);
  });

  test("custom file names, ZIP archive and unique entries", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    await openPage(page);
    await addImages(page, [
      await quadrants(page, 800, 600, "same-a.png"),
      await quadrants(page, 800, 600, "same-b.png"),
    ]);
    for (const file of ["same-a.png", "same-b.png"]) {
      await page.getByRole("button", { name: `Edit ${file}` }).click();
      await page.getByLabel("Base name").fill("same");
      await page.getByLabel("Suffix").fill("cropped");
      await page.getByRole("button", { name: "1:1", exact: true }).click();
    }
    await expect(page.locator(".cropper-name-preview code")).toHaveText(
      "same-cropped-600x600.webp",
    );
    await crop(page, 2);
    const zipPath = await downloadZip(page, testInfo);
    const listing = execFileSync("unzip", ["-t", zipPath], {
      encoding: "utf8",
    });
    expect(listing).toContain("No errors detected");
    const names = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
      .trim()
      .split("\n")
      .sort();
    expect(names).toEqual([
      "same-cropped-600x600 (2).webp",
      "same-cropped-600x600.webp",
    ]);
    const entry = execFileSync("unzip", [
      "-p",
      zipPath,
      "same-cropped-600x600.webp",
    ]);
    expect(signature(entry)).toBe("webp");
    const decoded = await decode(page, entry, "image/webp");
    expect([decoded.width, decoded.height]).toEqual([600, 600]);
  });

  test("EXIF orientation is applied before cropping and reported", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await exifOriented(page)]);
    await expect(page.locator(".cropper-summary")).toHaveText(
      "300 × 200 px source",
    );
    expect(await outputName(page)).toBe("phone-cropped-300x200.webp");
    await page.locator(".cropper-details summary").click();
    await expect(page.locator(".cropper-details-body")).toContainText(
      "EXIF orientation 6",
    );
    await expect(page.locator(".cropper-details-body")).toContainText(
      "rotated 90° clockwise",
    );
    await expect(page.locator(".cropper-details-body")).toContainText(
      "auto-corrected",
    );
    await crop(page, 1);
    const decoded = await decode(
      page,
      await download(page, "phone-cropped-300x200.webp"),
      "image/webp",
      [
        [0.9, 0.5],
        [0.1, 0.5],
      ],
    );
    expect([decoded.width, decoded.height]).toEqual([300, 200]);
    expect(decoded.samples.map(dominantColour)).toEqual(["red", "blue"]);
  });

  test("undo, redo and reset restore earlier crops", async ({ page }) => {
    test.setTimeout(60_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 1200, 800, "history.png")]);
    await page.getByRole("button", { name: "16:9", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 675 });
    await page.getByRole("button", { name: "Circle", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 800, height: 800 });

    await page.getByRole("button", { name: "Undo last crop change" }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 675 });
    await page.getByRole("button", { name: "Undo last crop change" }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 800 });
    await page.getByRole("button", { name: "Redo crop change" }).click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 675 });

    await page
      .getByRole("button", { name: "Reset crop, rotation and flips" })
      .click();
    expect(await cropSize(page)).toEqual({ width: 1200, height: 800 });
    await expect(page.locator(".cropper-name-preview code")).toHaveText(
      "history-cropped-1200x800.webp",
    );
    await expect(
      page.getByRole("button", { name: "Undo last crop change" }),
    ).toBeEnabled();
  });

  test("transparent PNG pixels survive a rectangle crop", async ({ page }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await addImages(page, [await alphaPng(page)]);
    await crop(page, 1);
    const decoded = await decode(
      page,
      await download(page, "sticker-cropped-400x300.webp"),
      "image/webp",
      [
        [0.02, 0.02],
        [0.5, 0.5],
      ],
    );
    expect(decoded.samples[0][3]).toBe(0);
    expect(decoded.samples[1][3]).toBeGreaterThan(200);
  });

  test("a large photo exports 1:1 crop pixels without quality loss", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openPage(page);
    await addImages(page, [await gradientPhoto(page, 3000, 2000, "huge.jpg")]);
    await page.getByRole("button", { name: "1:1", exact: true }).click();
    expect(await cropSize(page)).toEqual({ width: 2000, height: 2000 });
    await expect(
      page.locator(".cropper-section", { hasText: "Export" }),
    ).toContainText("1:1 crop pixels — no resampling");
    expect(await outputName(page)).toBe("huge-cropped-2000x2000.webp");
    await crop(page, 1, 180_000);
    const decoded = await decode(
      page,
      await download(page, "huge-cropped-2000x2000.webp"),
      "image/webp",
      [[0.5, 0.5]],
    );
    expect([decoded.width, decoded.height]).toEqual([2000, 2000]);
    expect(decoded.samples[0][3]).toBe(255);
  });

  test("invalid custom sizes are explained instead of exporting", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await openPage(page);
    await addImages(page, [await quadrants(page, 800, 600, "invalid.png")]);
    await page.getByLabel("Width px").fill("9000");
    await page.getByLabel("Height px").fill("100");
    await page.getByRole("button", { name: "Set custom size" }).click();
    await expect(page.locator(".cropper-field-error")).toContainText("8,192");
    expect(await cropSize(page)).toEqual({ width: 800, height: 600 });
    await page.getByLabel("Width px").fill("6000");
    await page.getByLabel("Height px").fill("5000");
    await page.getByRole("button", { name: "Set custom size" }).click();
    await expect(page.locator(".cropper-field-error")).toContainText(
      "24 megapixels",
    );
  });

  test("no image data leaves the browser", async ({ page }) => {
    test.setTimeout(90_000);
    const external: string[] = [];
    page.on("request", (request) => {
      const raw = request.url();
      if (!/^https?:/i.test(raw)) return;
      const url = new URL(raw);
      if (!["127.0.0.1", "localhost"].includes(url.hostname))
        external.push(raw);
    });
    await openPage(page);
    await addImages(page, [await quadrants(page, 600, 400, "private.png")]);
    await page.getByRole("button", { name: "Circle", exact: true }).click();
    await crop(page, 1);
    await expect(page.locator(".cropper-status-done")).toHaveCount(1);
    expect(external).toEqual([]);
  });
});
