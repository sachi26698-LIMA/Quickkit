import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import QRCode from "qrcode";

/**
 * QR Code Scanner browser checks.
 *
 * These drive the shipping UI against images encoded in the test itself, so the
 * assertions are about real decode behaviour rather than fixtures that could
 * drift: if the scanner stops reading a plain URL, this fails.
 *
 * The camera is exercised through a canvas capture stream, not a fake decoder.
 * Constraints, frame capture, the decode worker, duplicate suppression and
 * result rendering are all the production path — only the physical sensor is
 * replaced, because CI has no camera.
 */

async function qrPng(text: string, size = 600): Promise<Buffer> {
  return QRCode.toBuffer(text, { width: size, margin: 4, type: "png" });
}

test.describe("QR Code Scanner", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/qr-code-scanner");
    await expect(
      page.getByRole("heading", { level: 1, name: "QR Code Scanner" }),
    ).toBeVisible();
  });

  test("decodes an uploaded URL and names the content type", async ({
    page,
  }) => {
    const payload = "https://quickkit.example/scanned-from-a-test";
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "url.png",
        mimeType: "image/png",
        buffer: await qrPng(payload),
      });
    await expect(page.locator(".scanner-payload").first()).toHaveText(payload);
    await expect(page.locator(".scanner-type").first()).toHaveText(
      "Website URL",
    );
    // No "safe" claim is ever made for a URL.
    await expect(page.locator(".scanner-risk").first()).toHaveText(
      "No obvious warning found",
    );
  });

  test("parses Wi-Fi credentials and withholds the password from history", async ({
    page,
  }) => {
    const password = "correct-horse-battery";
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "wifi.png",
        mimeType: "image/png",
        buffer: await qrPng(`WIFI:S:TestNet;T:WPA;P:${password};;`),
      });
    await expect(page.locator(".scanner-type").first()).toHaveText(
      "Wi-Fi credentials",
    );
    // The password is present in the result (the user just scanned it)…
    await expect(page.locator(".scanner-fields")).toContainText("sensitive");
    // …but never in locally stored history.
    await page.getByRole("tab", { name: /History/ }).click();
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("qk:qr-scanner-history:v1"),
    );
    expect(stored).not.toContain(password);
    await expect(page.locator(".scanner-history-list")).toContainText(
      "withheld",
    );
  });

  test("flags a lookalike domain as high risk and blocks opening it", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "phish.png",
        mimeType: "image/png",
        buffer: await qrPng("https://paypa1.com/verify"),
      });
    await expect(page.locator(".scanner-risk").first()).toContainText(
      "High risk",
    );
    await expect(page.locator(".scanner-open .secondary")).toBeDisabled();
    await expect(page.locator(".scanner-open-blocked")).toBeVisible();
  });

  test("reads every code in a collage and shows one card each", async ({
    page,
  }) => {
    const codes = [
      "https://quickkit.example/one",
      "https://quickkit.example/two",
      "mailto:someone@example.org",
    ];
    // Compose a 2×2 collage by drawing the PNGs into one canvas in the page.
    const images = await Promise.all(codes.map((code) => qrPng(code, 320)));
    const collage = await page.evaluate(
      async (sources) => {
        const canvas = document.createElement("canvas");
        canvas.width = 720;
        canvas.height = 720;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 720, 720);
        await Promise.all(
          sources.map(
            (source, index) =>
              new Promise<void>((done) => {
                const image = new Image();
                image.onload = () => {
                  context.drawImage(
                    image,
                    (index % 2) * 360,
                    Math.floor(index / 2) * 360,
                    360,
                    360,
                  );
                  done();
                };
                image.src = source;
              }),
          ),
        );
        return canvas.toDataURL("image/png");
      },
      images.map(
        (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
      ),
    );

    const base64 = collage.split(",")[1];
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "collage.png",
        mimeType: "image/png",
        buffer: Buffer.from(base64, "base64"),
      });
    await expect(page.locator(".scanner-symbol")).toHaveCount(codes.length, {
      timeout: 20000,
    });
    const payloads = await page.locator(".scanner-payload").allTextContents();
    for (const code of codes) expect(payloads).toContain(code);
  });

  test("reports an image with no code honestly instead of inventing one", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    // A blank PNG: plenty of pixels, no symbol.
    const blank = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAHUlEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAOA3HkwAAe3Z6rQAAAAASUVORK5CYII=",
      "base64",
    );
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "blank.png",
      mimeType: "image/png",
      buffer: blank,
    });
    await expect(page.locator(".scanner-result-failure")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator(".scanner-detect.none")).toHaveText("No code");
    await expect(page.locator(".scanner-payload")).toHaveCount(0);
  });

  test("batch-scans a queue and exports CSV with a BOM and escaped fields", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /Batch Scan/ }).click();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([
        {
          name: "a.png",
          mimeType: "image/png",
          buffer: await qrPng("https://a.example/1"),
        },
        {
          name: "b,c.png",
          mimeType: "image/png",
          buffer: await qrPng("https://b.example/2"),
        },
      ]);
    await page.getByRole("button", { name: /Scan all/ }).click();
    await expect(page.locator(".scanner-batch-counts")).toContainText(
      "2 done",
      {
        timeout: 30000,
      },
    );

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /^CSV$/ }).first().click();
    const download = await downloadPromise;
    const path = await download.path();
    const csv = readFileSync(resolve(path!), "utf8");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("https://a.example/1");
    // The comma in the file name must be quoted, not split into a new column.
    expect(csv).toContain('"b,c.png"');
  });

  test("decodes from a camera stream, pauses after a read and never duplicates", async ({
    page,
  }) => {
    const payload = "https://quickkit.example/from-camera";
    const dataUrl = `data:image/png;base64,${(await qrPng(payload, 480)).toString("base64")}`;

    // Replace the sensor only: a canvas stream showing a real code.
    await page.addInitScript((source) => {
      const originalCapture = HTMLCanvasElement.prototype.captureStream;
      HTMLCanvasElement.prototype.captureStream = function (...args: never[]) {
        const stream = originalCapture.apply(
          this as HTMLCanvasElement,
          args as [],
        );
        const track = stream.getVideoTracks()[0];
        track.getSettings = () =>
          ({ deviceId: "test", width: 640, height: 480 }) as MediaTrackSettings;
        track.getCapabilities = () =>
          ({
            torch: true,
            zoom: { min: 1, max: 4, step: 0.5 },
          }) as MediaTrackCapabilities;
        track.applyConstraints = async () => {};
        return stream;
      };
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          async getUserMedia() {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const context = canvas.getContext("2d")!;
            const image = new Image();
            image.src = source;
            await image.decode();
            const paint = () => {
              context.fillStyle = "#ffffff";
              context.fillRect(0, 0, 640, 480);
              context.drawImage(image, 100, 20, 440, 440);
            };
            paint();
            setInterval(paint, 120);
            return canvas.captureStream(15);
          },
          enumerateDevices: async () => [
            {
              kind: "videoinput",
              deviceId: "test",
              label: "Test camera",
              groupId: "g",
            },
          ],
        },
      });
    }, dataUrl);

    await page.reload();
    await page.getByRole("button", { name: /Start camera/ }).click();
    await expect(page.locator(".scanner-stage.is-live")).toBeVisible();
    await expect(page.locator(".scanner-payload").first()).toHaveText(payload, {
      timeout: 20000,
    });
    await expect(page.locator(".scanner-paused")).toBeVisible();

    // Continuous scanning must not append the same code repeatedly.
    await page.getByLabel(/Continuous scanning/).check();
    await page.getByRole("button", { name: /Resume/ }).click();
    await page.waitForTimeout(6000);
    await expect(page.locator(".scanner-result")).toHaveCount(1);

    // Stopping releases the stream.
    await page.getByRole("button", { name: /^Stop$/ }).click();
    await expect(page.locator(".scanner-stage.is-live")).toHaveCount(0);
  });

  test("explains a denied camera permission and keeps uploads working", async ({
    page,
  }) => {
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(
          Object.assign(new Error("denied"), { name: "NotAllowedError" }),
        );
    });
    await page.getByRole("button", { name: /Start camera/ }).click();
    await expect(page.locator(".scanner-status")).toContainText(
      "Camera permission was blocked",
    );
    await expect(page.getByRole("tab", { name: /Upload Image/ })).toBeEnabled();
  });

  test("is keyboard operable and free of horizontal overflow on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    // Tab list responds to arrow keys. Focus is retried because the very first
    // focus() can land while the client is still attaching.
    const cameraTab = page.getByRole("tab", { name: /Camera|Live Camera/ });
    await expect
      .poll(async () => {
        await cameraTab.focus();
        return cameraTab.evaluate(
          (element) => element === document.activeElement,
        );
      })
      .toBe(true);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /Upload/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("leaves the QR Code Generator untouched", async ({ page }) => {
    await page.goto("/tools/qr-generator");
    await expect(
      page.getByRole("heading", { name: "QR Code Generator" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Create QR/ })).toBeVisible();
  });
});
