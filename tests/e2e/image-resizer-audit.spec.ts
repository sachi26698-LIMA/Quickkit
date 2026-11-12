import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { readFile } from "node:fs/promises";

/**
 * Final functionality audit for the Image Resizer.
 * Covers every control that the editing suite does not already exercise:
 * percentage chips, swap/match, custom angle, filter chips, background colour,
 * quality, format matrix, crop overlay (pointer + reset), cancellation,
 * retry-failed, mixed-batch error recovery and mobile/touch behaviour.
 */

type Upload = { name: string; mimeType: string; buffer: Buffer };

async function fixture(
  page: Page,
  width: number,
  height: number,
  name = "audit.png",
  background = "#3a7f6a",
): Promise<Upload> {
  const base64 = await page.evaluate(
    ([w, h, colour]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, colour);
      gradient.addColorStop(1, "#101426");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(w * 0.34, h * 0.36, Math.min(w, h) * 0.2, 0, Math.PI * 2);
      ctx.fill();
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height, background] as const,
  );
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

/** Solid-transparent PNG: fully transparent background, solid red centre. */
async function alphaFixture(page: Page, name = "alpha.png"): Promise<Upload> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 240, 240);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(60, 60, 120, 120);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

/** Valid PNG header + IHDR, garbage body: passes preflight, fails decode. */
async function corruptFixture(page: Page): Promise<Upload> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    canvas.getContext("2d")!.fillRect(0, 0, 320, 240);
    const binary = atob(canvas.toDataURL("image/png").split(",")[1]);
    const header = binary.slice(0, 33);
    let junk = "";
    for (let index = 0; index < 600; index += 1)
      junk += String.fromCharCode((index * 97) % 256);
    return btoa(header + junk);
  });
  return {
    name: "damaged-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

async function addImages(page: Page, uploads: Upload[]) {
  await page.getByLabel("Add images").setInputFiles(uploads);
  await expect(page.locator(".resizer-item")).toHaveCount(uploads.length);
}

async function setExactSize(page: Page, width: number, height: number) {
  await page.getByRole("tab", { name: /Resize/ }).click();
  const unlock = page.getByRole("button", { name: "Unlock aspect ratio" });
  if (await unlock.count()) await unlock.click();
  await page.getByLabel("Width (px)").fill(String(width));
  await page.getByLabel("Height (px)").fill(String(height));
}

/** Decode a downloaded buffer in the browser and sample its corner pixel. */
async function inspect(
  page: Page,
  buffer: Buffer,
  mimeType: string,
): Promise<{ width: number; height: number; corner: number[] }> {
  const base64 = buffer.toString("base64");
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
      const pixel = ctx.getImageData(1, 1, 1, 1).data;
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        corner: [pixel[0], pixel[1], pixel[2], pixel[3]],
      };
    },
    [base64, mimeType] as const,
  );
}

async function downloadResult(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: `Download ${name}` }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(name);
  return readFile((await download.path())!);
}

async function processBatch(page: Page, count: number) {
  await page
    .getByRole("button", { name: new RegExp(`Resize ${count} image`) })
    .click();
  await expect(page.locator(".resizer-status-done")).toHaveCount(count, {
    timeout: 45_000,
  });
}

test.describe("image resizer audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-resizer");
    await expect(page.getByLabel("Add images")).toBeAttached();
  });

  test("percentage chips, swap and match original drive the target", async ({
    page,
  }) => {
    await addImages(page, [await fixture(page, 800, 600)]);
    await page.getByRole("radio", { name: /Percentage/ }).check();
    const summary = page.locator(".resizer-summary");

    for (const [chip, expected] of [
      ["25%", "200 × 150 px"],
      ["50%", "400 × 300 px"],
      ["75%", "600 × 450 px"],
      ["100%", "800 × 600 px"],
    ] as const) {
      await page.getByRole("button", { name: chip, exact: true }).click();
      await expect(page.getByLabel("Scale percentage")).toHaveValue(
        chip.replace("%", ""),
      );
      await expect(summary).toHaveText(expected);
    }

    await page.getByRole("radio", { name: /Dimensions/ }).check();
    await setExactSize(page, 400, 300);
    await page.getByRole("button", { name: "Swap width and height" }).click();
    await expect(page.getByLabel("Width (px)")).toHaveValue("300");
    await expect(page.getByLabel("Height (px)")).toHaveValue("400");

    await page.getByRole("button", { name: "Match original" }).click();
    await expect(summary).toHaveText("800 × 600 px");
  });

  test("every visible control in every state has an accessible name", async ({
    page,
  }) => {
    const unnamed = async () =>
      page.evaluate(() => {
        const root =
          document.querySelector(".resizer-workspace") ?? document.body;
        const nodes = [
          ...root.querySelectorAll(
            "button, a[href], select, input:not([type=hidden]), [role=tab], [role=radio]",
          ),
        ];
        return nodes
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .filter((el) => {
            const label =
              el.getAttribute("aria-label") ||
              (el as HTMLInputElement).labels?.[0]?.textContent ||
              el.textContent ||
              el.getAttribute("title") ||
              "";
            return label.trim().length === 0;
          })
          .map((el) => el.outerHTML.slice(0, 120));
      });

    expect(await unnamed()).toEqual([]);
    await addImages(page, [await fixture(page, 640, 480)]);
    expect(await unnamed()).toEqual([]);
    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByRole("button", { name: /Crop on preview/ }).click();
    expect(await unnamed()).toEqual([]);
    await processBatch(page, 1);
    expect(await unnamed()).toEqual([]);
  });

  test("zoom keeps the fitted preview inside the stage and pans when larger", async ({
    page,
  }) => {
    await addImages(page, [await fixture(page, 900, 1200, "tall-preview.png")]);
    const stage = page.locator(".resizer-preview-stage");
    const image = page.locator(".resizer-main-image");
    const read = async () => ({
      stage: await stage.evaluate((el) => el.clientHeight),
      image: await image.evaluate((el) => el.getBoundingClientRect().height),
    });

    // The stage is measured by ResizeObserver after the upload. Wait for the
    // decoded, correctly sized image and its fitted layout rather than reading
    // the transient initial 320px stage estimate on the first render.
    await expect
      .poll(async () =>
        image.evaluate((el: HTMLImageElement) => [
          el.naturalWidth,
          el.naturalHeight,
        ]),
      )
      .toEqual([900, 1200]);
    await expect
      .poll(async () => {
        const { stage: height, image: rendered } = await read();
        return rendered <= height;
      })
      .toBe(true);
    const fitted = await read();
    expect(fitted.image).toBeLessThanOrEqual(fitted.stage);

    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.locator(".resizer-zoom-value")).toHaveText("150%");
    const zoomed = await image.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(zoomed).toBeGreaterThan(fitted.image);
    expect(
      await stage.evaluate(
        (el) =>
          el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth,
      ),
    ).toBe(true);

    await page.getByRole("button", { name: "Fit to screen" }).click();
    await expect(page.locator(".resizer-zoom-value")).toHaveText("100%");
    const refit = await read();
    expect(refit.image).toBeLessThanOrEqual(refit.stage);
  });

  test("structured data and guidance are published for the route", async ({
    page,
  }) => {
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const graph = blocks
      .flatMap((block) => {
        try {
          return JSON.parse(block)["@graph"] ?? [];
        } catch {
          return [];
        }
      })
      .map((node: { "@type": string }) => node["@type"]);
    expect(graph).toContain("WebApplication");
    expect(graph).not.toContain("HowTo");
    expect(graph).toContain("FAQPage");
    await expect(
      page.getByRole("heading", { name: /Resize and export images/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Image resizing questions/i }),
    ).toBeVisible();
    const faqs = await page
      .locator(".tool-guidance section")
      .nth(1)
      .locator("details")
      .count();
    expect(faqs).toBeGreaterThanOrEqual(7);
    const steps = await page
      .locator(".tool-guidance section")
      .first()
      .locator("ol li")
      .count();
    expect(steps).toBeGreaterThanOrEqual(5);
  });

  test("custom angle rotates through a full bounding box", async ({ page }) => {
    test.setTimeout(60_000);
    await addImages(page, [await fixture(page, 400, 300)]);
    await page.getByRole("radio", { name: /Percentage/ }).check();
    await page.getByRole("button", { name: "100%", exact: true }).click();
    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByLabel("Custom angle").fill("37");
    const expected = {
      width: Math.round(
        Math.abs(400 * Math.cos((37 * Math.PI) / 180)) +
          Math.abs(300 * Math.sin((37 * Math.PI) / 180)),
      ),
      height: Math.round(
        Math.abs(400 * Math.sin((37 * Math.PI) / 180)) +
          Math.abs(300 * Math.cos((37 * Math.PI) / 180)),
      ),
    };
    await expect(page.locator(".resizer-summary")).toHaveText(
      `${expected.width.toLocaleString("en-US")} × ${expected.height.toLocaleString("en-US")} px`,
    );

    await page.getByLabel("Output format").selectOption("image/png");
    await processBatch(page, 1);
    const buffer = await downloadResult(
      page,
      `audit-${expected.width}x${expected.height}.png`,
    );
    const png = PNG.sync.read(buffer);
    expect([png.width, png.height]).toEqual([expected.width, expected.height]);
    // Content is painted (centre opaque) and the rotated corners are empty,
    // which is correct for an alpha format: no clipped or squashed pixels.
    const middle = ((png.height >> 1) * png.width + (png.width >> 1)) * 4;
    expect(png.data[middle + 3]).toBe(255);
    expect(png.data[3]).toBe(0);
  });

  test("each filter chip changes the exported pixels", async ({ page }) => {
    test.setTimeout(120_000);
    await addImages(page, [await fixture(page, 320, 240, "filter-source.png")]);
    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("tab", { name: /Edit/ }).click();

    const signatures: number[][] = [];
    for (const filter of ["Grayscale", "Sepia", "Warm", "Cool", "Invert"]) {
      await page.getByRole("button", { name: filter, exact: true }).click();
      await expect(page.locator(".resizer-status-done")).toHaveCount(0);
      await page.getByRole("button", { name: /^Resize 1 image/ }).click();
      await expect(page.locator(".resizer-status-done")).toHaveCount(1, {
        timeout: 30_000,
      });
      const pending = page.waitForEvent("download");
      await page
        .getByRole("link", { name: /^Download filter-source-/ })
        .click();
      const download = await pending;
      const png = PNG.sync.read(await readFile((await download.path())!));
      const middle = ((png.height >> 1) * png.width + (png.width >> 1)) * 4;
      signatures.push([
        png.data[middle],
        png.data[middle + 1],
        png.data[middle + 2],
      ]);
    }

    const keys = signatures.map((rgb) => rgb.join(","));
    expect(new Set(keys).size).toBe(5);
    const [gray, sepia, , , invert] = signatures;
    expect(Math.abs(gray[0] - gray[1])).toBeLessThan(3); // grayscale: r≈g
    expect(sepia[0]).toBeGreaterThan(sepia[2]); // sepia is warm
    expect(invert[0]).toBeGreaterThan(gray[0]); // inverting a dark tone brightens it
  });

  test("contrast, saturation, split position and auto-orient controls respond", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [await fixture(page, 480, 360, "adjust-source.png")]);
    await page.getByRole("tab", { name: /Edit/ }).click();

    const stage = page.locator(".resizer-main-image");
    await page.getByLabel("Contrast").fill("160");
    await expect(stage).toHaveCSS("filter", /contrast/);
    await expect(stage).toHaveCSS("filter", /1\.6/);
    await page.getByLabel("Saturation").fill("40");
    await expect(stage).toHaveCSS("filter", /saturate/);

    // Auto-orient is a real, per-image toggle.
    await page.locator(".resizer-metadata summary").click();
    const autoOrient = page.getByLabel("Auto-rotate using EXIF orientation");
    await expect(autoOrient).toBeChecked();
    await autoOrient.uncheck();
    await expect(autoOrient).not.toBeChecked();

    await page.getByLabel("Output format").selectOption("image/png");
    await processBatch(page, 1);
    await page.getByRole("button", { name: /Split/ }).click();
    await page.locator("#resizer-split").fill("25");
    await expect(page.locator(".resizer-split-line")).toHaveAttribute(
      "style",
      /left: 25%/,
    );
    await expect(page.locator(".resizer-split-label-left")).toHaveText(
      "Before",
    );
    await page.getByRole("button", { name: /Side by side/ }).click();
    await expect(page.locator(".resizer-compare figure")).toHaveCount(2);
    await expect(
      page.locator(".resizer-compare figcaption").first(),
    ).toContainText("Original");
    await page.getByRole("button", { name: /Single/ }).click();
    await expect(
      page.getByRole("button", { name: /^Original$/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Original$/ }).click();
    await expect(page.locator(".resizer-preview-tag")).toContainText(
      "480 × 360 px",
    );
  });

  test("JPEG background colour replaces transparency", async ({ page }) => {
    test.setTimeout(60_000);
    await addImages(page, [await alphaFixture(page, "alpha-source.png")]);
    await page.getByLabel("Output format").selectOption("image/jpeg");
    await page.locator("#resizer-background").fill("#ff0000");
    await processBatch(page, 1);
    const buffer = await downloadResult(page, "alpha-source-240x240.jpg");
    expect(buffer.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    const meta = await inspect(page, buffer, "image/jpeg");
    expect(meta.corner[0]).toBeGreaterThan(230);
    expect(meta.corner[1]).toBeLessThan(30);
    expect(meta.corner[2]).toBeLessThan(30);
  });

  test("quality slider changes encoded size and stays decodable", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await addImages(page, [
      await fixture(page, 720, 540, "quality-source.png"),
    ]);
    await page.getByLabel("Output format").selectOption("image/jpeg");
    await setExactSize(page, 720, 540);

    await page.locator("#resizer-quality").fill("20");
    await processBatch(page, 1);
    const low = await downloadResult(page, "quality-source-720x540.jpg");
    await page.locator("#resizer-quality").fill("95");
    await expect(page.locator(".resizer-status-done")).toHaveCount(0);
    await processBatch(page, 1);
    const high = await downloadResult(page, "quality-source-720x540.jpg");

    expect(low.length).toBeLessThan(high.length);
    const meta = await inspect(page, high, "image/jpeg");
    expect([meta.width, meta.height]).toEqual([720, 540]);
  });

  test("format matrix keeps dimensions and transparency where supported", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [await alphaFixture(page, "matrix-source.png")]);
    const cases = [
      { format: "image/png", ext: "png", alpha: true },
      { format: "image/webp", ext: "webp", alpha: true },
      { format: "image/jpeg", ext: "jpg", alpha: false },
    ] as const;

    for (const item of cases) {
      await page.getByLabel("Output format").selectOption(item.format);
      await processBatch(page, 1);
      const buffer = await downloadResult(
        page,
        `matrix-source-240x240.${item.ext}`,
      );
      if (item.format === "image/png") {
        const png = PNG.sync.read(buffer);
        expect([png.width, png.height]).toEqual([240, 240]);
        expect(png.data[3]).toBe(0); // transparent corner preserved
      } else if (item.format === "image/webp") {
        expect(buffer.subarray(0, 4).toString("latin1")).toBe("RIFF");
        expect(buffer.subarray(8, 12).toString("latin1")).toBe("WEBP");
        const meta = await inspect(page, buffer, "image/webp");
        expect([meta.width, meta.height]).toEqual([240, 240]);
        expect(meta.corner[3]).toBe(item.alpha ? 0 : 255);
      } else {
        expect(buffer.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
        const meta = await inspect(page, buffer, "image/jpeg");
        expect([meta.width, meta.height]).toEqual([240, 240]);
        expect(meta.corner[3]).toBe(255);
      }
      await expect(page.locator(".resizer-status-done")).toHaveCount(1);
    }

    const avif = page.locator('#resizer-format option[value="image/avif"]');
    if (await avif.isDisabled())
      await expect(avif).toHaveText(/unsupported|newer browsers/i);
  });

  test("crop overlay drags with the pointer and resets", async ({ page }) => {
    await addImages(page, [await fixture(page, 800, 600)]);
    await page.getByRole("tab", { name: /Edit/ }).click();
    await expect(page.locator(".resizer-crop-box")).toHaveCount(0);
    await page.getByRole("button", { name: /Crop on preview/ }).click();

    const box = page.locator(".resizer-crop-box");
    await expect(box).toBeVisible();
    await expect(page.getByLabel("Crop X")).toHaveValue("0");

    const handle = page.locator(".resizer-crop-nw");
    const start = (await handle.boundingBox())!;
    await page.mouse.move(start.x + 8, start.y + 8);
    await page.mouse.down();
    await page.mouse.move(start.x + 120, start.y + 90, { steps: 12 });
    await page.mouse.up();

    const x = Number(await page.getByLabel("Crop X").inputValue());
    const y = Number(await page.getByLabel("Crop Y").inputValue());
    const width = Number(await page.getByLabel("Crop width").inputValue());
    expect(x).toBeGreaterThan(40);
    expect(y).toBeGreaterThan(20);
    expect(width).toBeLessThan(800);
    await expect(
      page.locator(".resizer-hint").filter({ hasText: "Crop area" }),
    ).toContainText("px");

    // Keyboard nudge moves the frame and the fields stay in sync.
    await box.focus();
    await expect(box).toBeFocused();
    const before = Number(await page.getByLabel("Crop X").inputValue());
    await page.keyboard.press("ArrowLeft");
    expect(Number(await page.getByLabel("Crop X").inputValue())).toBe(
      before - 2,
    );

    await page.getByRole("button", { name: "Reset crop" }).click();
    await expect(page.getByLabel("Crop X")).toHaveValue("0");
    await expect(page.getByLabel("Crop width")).toHaveValue("800");
    await page.getByRole("button", { name: "Close crop tool" }).click();
    await expect(page.locator(".resizer-crop-box")).toHaveCount(0);
  });

  test("Stop cancels a running batch and keeps finished output", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const uploads: Upload[] = [];
    for (let index = 0; index < 4; index += 1)
      uploads.push(
        await fixture(page, 3600, 2400, `batch-${index + 1}.png`, "#2f7f9a"),
      );
    await addImages(page, uploads);

    await page.getByRole("button", { name: /Resize 4 images/ }).click();
    const stop = page.getByRole("button", { name: "Stop" });
    await expect(stop).toBeVisible();
    const progress = page.locator(".resizer-progress progress");
    await expect(progress).toBeVisible();
    await expect(page.locator(".resizer-progress")).toContainText("finished");
    await expect
      .poll(() => page.locator(".resizer-status-done").count(), {
        timeout: 30_000,
      })
      .toBeGreaterThan(0);
    await expect(stop).toBeVisible();
    await stop.click();

    await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0);
    await expect(page.locator(".resizer-status-working")).toHaveCount(0);
    await expect(page.locator(".resizer-progress")).toHaveCount(0);
    await expect(page.locator(".resizer-notice")).toContainText(
      "Processing stopped",
    );
    await expect(
      page.getByRole("button", { name: /Resize 4 images/ }),
    ).toBeEnabled();
    const done = await page.locator(".resizer-status-done").count();
    expect(done).toBeGreaterThan(0);
    expect(done).toBeLessThan(4);
    await expect(
      page.getByRole("button", {
        name: new RegExp(`Download ZIP \\(${done}\\)`),
      }),
    ).toBeEnabled();

    // The queue can be started again and completes this time.
    await processBatch(page, 4);
    await expect(page.locator(".resizer-notice")).toContainText(
      "processed locally",
    );
  });

  test("Retry failed reruns only the damaged image", async ({ page }) => {
    test.setTimeout(90_000);
    await addImages(page, [await corruptFixture(page)]);
    await expect(page.locator(".resizer-alert")).toHaveCount(0);
    await page.getByRole("button", { name: /Resize 1 image/ }).click();

    await expect(page.locator(".resizer-item-error")).toContainText(
      "could not be decoded",
    );
    await expect(page.locator(".resizer-status-error")).toHaveText("Failed");
    await expect(page.locator(".resizer-alert")).toContainText(
      "None of the images could be processed",
    );

    const retry = page.getByRole("button", { name: /Retry failed \(1\)/ });
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect(page.locator(".resizer-status-error")).toHaveText("Failed");
    await expect(page.locator(".resizer-item-error")).toContainText(
      "could not be decoded",
    );

    // Replacing the damaged file recovers the queue without a reload.
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await addImages(page, [await fixture(page, 300, 200, "recovered.png")]);
    await page.getByLabel("Output format").selectOption("image/png");
    await processBatch(page, 1);
    await expect(page.locator(".resizer-status-done")).toHaveCount(1);
  });

  test("mixed batch keeps the good image and ZIPs only valid entries", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [
      await fixture(page, 400, 300, "good-one.png"),
      await corruptFixture(page),
      await fixture(page, 200, 200, "good-two.png"),
    ]);
    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("button", { name: /Resize 3 images/ }).click();

    await expect(page.locator(".resizer-status-done")).toHaveCount(2, {
      timeout: 45_000,
    });
    await expect(page.locator(".resizer-status-error")).toHaveCount(1);
    await expect(page.locator(".resizer-notice")).toContainText(
      "2 processed successfully. 1 could not be processed",
    );

    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ZIP \(2\)/ }).click();
    const zip = await readFile((await (await pending).path())!);
    const text = zip.toString("latin1");
    const names = [...text.matchAll(/good-[a-z]+-\d+x\d+\.png/g)].map(
      (match) => match[0],
    );
    expect(new Set(names).size).toBe(2);
    expect(names.some((name) => name.startsWith("good-one-"))).toBe(true);
    expect(names.some((name) => name.startsWith("good-two-"))).toBe(true);
    expect(text).not.toContain("damaged-photo");
  });
});

test.describe("image resizer audit — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-resizer");
    await expect(page.getByLabel("Add images")).toBeAttached();
  });

  test("touch selection, tabs and crop drag work without horizontal overflow", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [
      await fixture(page, 900, 700, "phone-a.png"),
      await fixture(page, 700, 900, "phone-b.png"),
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const thumb = page.getByRole("button", { name: "Preview phone-b.png" });
    await thumb.scrollIntoViewIfNeeded();
    const thumbBox = (await thumb.boundingBox())!;
    await page.touchscreen.tap(
      thumbBox.x + thumbBox.width / 2,
      thumbBox.y + thumbBox.height / 2,
    );
    await expect(thumb).toHaveAttribute("aria-pressed", "true");

    const editTab = page.getByRole("tab", { name: /Edit/ });
    await editTab.scrollIntoViewIfNeeded();
    const tabBox = (await editTab.boundingBox())!;
    await page.touchscreen.tap(tabBox.x + tabBox.width / 2, tabBox.y + 12);
    await expect(editTab).toHaveAttribute("aria-selected", "true");

    await page.getByRole("button", { name: /Crop on preview/ }).click();
    const handle = page.locator(".resizer-crop-nw");
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    await handle.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: box.x + 8,
      clientY: box.y + 8,
    });
    await handle.dispatchEvent("pointermove", {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: box.x + 60,
      clientY: box.y + 48,
    });
    await handle.dispatchEvent("pointerup", {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: box.x + 60,
      clientY: box.y + 48,
    });
    await expect
      .poll(async () => Number(await page.getByLabel("Crop X").inputValue()))
      .toBeGreaterThan(0);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const targets = await page.evaluate(() => {
      const nodes = document.querySelectorAll(
        ".resizer-actions button, .resizer-tabs button, .resizer-icon-button",
      );
      return [...nodes]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) =>
          Math.round((el as HTMLElement).getBoundingClientRect().height),
        );
    });
    expect(Math.min(...targets)).toBeGreaterThanOrEqual(36);
  });

  test("mobile batch processes and downloads a valid PNG", async ({ page }) => {
    test.setTimeout(90_000);
    await addImages(page, [await fixture(page, 600, 400, "mobile-batch.png")]);
    await page.getByLabel("Output format").selectOption("image/png");
    await processBatch(page, 1);
    const buffer = await downloadResult(page, "mobile-batch-600x400.png");
    const png = PNG.sync.read(buffer);
    expect([png.width, png.height]).toEqual([600, 400]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
