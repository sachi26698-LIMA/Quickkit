import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { unzipSync } from "fflate";
import { PDFDocument } from "@cantoo/pdf-lib";
import {
  buildQrPayload,
  defaultQrFormValues,
  type QrContentType,
  type QrFormValues,
} from "../../lib/tools/qr";

const scanPassed = "Local scan test passed";

async function waitForScanCheck(page: Page) {
  await expect(page.getByText(scanPassed, { exact: false })).toBeVisible({
    timeout: 15000,
  });
}

function compositeOnWhite(png: PNG) {
  const pixels = new Uint8ClampedArray(png.data);
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    pixels[index] = Math.round(pixels[index] * alpha + 255 * (1 - alpha));
    pixels[index + 1] = Math.round(
      pixels[index + 1] * alpha + 255 * (1 - alpha),
    );
    pixels[index + 2] = Math.round(
      pixels[index + 2] * alpha + 255 * (1 - alpha),
    );
    pixels[index + 3] = 255;
  }
  return pixels;
}

async function decodePreview(page: Page) {
  await waitForScanCheck(page);
  const source = await page
    .getByAltText("Generated QR code preview")
    .getAttribute("src");
  expect(source).toContain("data:image/png;base64,");
  const png = PNG.sync.read(Buffer.from(source!.split(",")[1], "base64"));
  const decoded = jsQR(compositeOnWhite(png), png.width, png.height);
  expect(
    decoded,
    `Expected a scannable ${png.width}px QR output`,
  ).not.toBeNull();
  return { data: decoded!.data, png };
}

async function chooseType(page: Page, typeName: RegExp) {
  await page.locator(".qr-type-card").filter({ hasText: typeName }).click();
}

async function fillQrField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: true });
  const isSelect = await field.evaluate(
    (element) => element instanceof HTMLSelectElement,
  );
  if (isSelect) await field.selectOption(value);
  else await field.fill(value);
}

async function rasterizePdfPage(page: Page, pdfBytes: Buffer, pageNumber = 1) {
  const pdfBundle = await readFile(
    new URL("../../node_modules/pdfjs-dist/build/pdf.min.mjs", import.meta.url),
    "utf8",
  );
  const pdfWorker = await readFile(
    new URL(
      "../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  await page.route("**/__qr_test_pdfjs__/pdf.mjs", (route) =>
    route.fulfill({ contentType: "text/javascript", body: pdfBundle }),
  );
  await page.route("**/__qr_test_pdfjs__/pdf.worker.mjs", (route) =>
    route.fulfill({ contentType: "text/javascript", body: pdfWorker }),
  );
  const pngDataUrl = await page.evaluate(
    async ({ base64, targetPage }) => {
      const mapPrototype = Map.prototype as Map<unknown, unknown> & {
        getOrInsertComputed?: (
          key: unknown,
          callback: (key: unknown) => unknown,
        ) => unknown;
      };
      if (typeof mapPrototype.getOrInsertComputed !== "function") {
        Object.defineProperty(mapPrototype, "getOrInsertComputed", {
          configurable: true,
          writable: true,
          value: function <K, V>(
            this: Map<K, V>,
            key: K,
            callback: (key: K) => V,
          ) {
            if (this.has(key)) return this.get(key)!;
            const value = callback(key);
            this.set(key, value);
            return value;
          },
        });
      }
      const mathWithSumPrecise = Math as Math & {
        sumPrecise?: (values: Iterable<number>) => number;
      };
      if (typeof mathWithSumPrecise.sumPrecise !== "function") {
        Object.defineProperty(Math, "sumPrecise", {
          configurable: true,
          writable: true,
          value: (values: Iterable<number>) => {
            let total = 0;
            let compensation = 0;
            let sawValue = false;
            let sawPositiveInfinity = false;
            let sawNegativeInfinity = false;
            let allNegativeZero = true;
            for (const value of values) {
              sawValue = true;
              if (Number.isNaN(value)) return Number.NaN;
              if (value === Number.POSITIVE_INFINITY) {
                sawPositiveInfinity = true;
                allNegativeZero = false;
                continue;
              }
              if (value === Number.NEGATIVE_INFINITY) {
                sawNegativeInfinity = true;
                allNegativeZero = false;
                continue;
              }
              if (!Object.is(value, -0)) allNegativeZero = false;
              const next = total + value;
              if (Math.abs(total) >= Math.abs(value))
                compensation += total - next + value;
              else compensation += value - next + total;
              total = next;
            }
            if (sawPositiveInfinity && sawNegativeInfinity) return Number.NaN;
            if (sawPositiveInfinity) return Number.POSITIVE_INFINITY;
            if (sawNegativeInfinity) return Number.NEGATIVE_INFINITY;
            if (!sawValue) return 0;
            if (allNegativeZero) return -0;
            return total + compensation;
          },
        });
      }
      const moduleUrl = "/__qr_test_pdfjs__/pdf.mjs";
      const pdfjs = await import(moduleUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = "/__qr_test_pdfjs__/pdf.worker.mjs";
      const data = Uint8Array.from(atob(base64), (character) =>
        character.charCodeAt(0),
      );
      const pdfDocument = await pdfjs.getDocument({ data }).promise;
      const pdfPage = await pdfDocument.getPage(targetPage);
      const viewport = pdfPage.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not rasterize the exported PDF.");
      await pdfPage.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/png");
    },
    { base64: pdfBytes.toString("base64"), targetPage: pageNumber },
  );
  return PNG.sync.read(Buffer.from(pngDataUrl.split(",")[1], "base64"));
}

async function decodePdfExport(page: Page, pdfBytes: Buffer) {
  const png = await rasterizePdfPage(page, pdfBytes);
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}

async function decodeJpgExport(page: Page, jpgBytes: Buffer) {
  const pngDataUrl = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    );
    const image = new Image();
    image.src = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    try {
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")!.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(image.src);
    }
  }, jpgBytes.toString("base64"));
  const png = PNG.sync.read(Buffer.from(pngDataUrl.split(",")[1], "base64"));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}

function decodePngCrop(
  png: PNG,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const source = ((y + row) * png.width + x) * 4;
    pixels.set(png.data.subarray(source, source + width * 4), row * width * 4);
  }
  return jsQR(pixels, width, height)?.data;
}

function pngLogo() {
  const image = new PNG({ width: 80, height: 80 });
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = (image.width * y + x) << 2;
      image.data[index] = x < 40 ? 105 : 99;
      image.data[index + 1] = y < 40 ? 80 : 87;
      image.data[index + 2] = x < 40 ? 232 : 209;
      image.data[index + 3] = 255;
    }
  }
  return {
    name: "quickkit-mark.png",
    mimeType: "image/png",
    buffer: PNG.sync.write(image),
  };
}

test("every QR content type produces a real locally decodable code", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  const cases: {
    type: QrContentType;
    select?: RegExp;
    values: Partial<QrFormValues>;
    fields: [string, string][];
  }[] = [
    {
      type: "text",
      values: { text: "QUICKKIT local scan test" },
      fields: [["Text or URL", "QUICKKIT local scan test"]],
    },
    {
      type: "url",
      select: /Website/,
      values: { url: "https://example.com/quickkit" },
      fields: [["Website URL", "https://example.com/quickkit"]],
    },
    {
      type: "wifi",
      select: /Wi-Fi/,
      values: { wifiSsid: "Studio;Guest", wifiPassword: "p;ass,word:" },
      fields: [
        ["Network name (SSID)", "Studio;Guest"],
        ["Network password", "p;ass,word:"],
      ],
    },
    {
      type: "phone",
      select: /Phone/,
      values: { phone: "+1 555 123 4567" },
      fields: [["Phone number", "+1 555 123 4567"]],
    },
    {
      type: "email",
      select: /Email/,
      values: {
        emailAddress: "hello@example.com",
        emailSubject: "Quick hello",
        emailBody: "See you soon",
      },
      fields: [
        ["To", "hello@example.com"],
        ["Subject (optional)", "Quick hello"],
        ["Message (optional)", "See you soon"],
      ],
    },
    {
      type: "sms",
      select: /SMS/,
      values: { smsNumber: "+91 98765 43210", smsMessage: "On my way" },
      fields: [
        ["Phone number", "+91 98765 43210"],
        ["Prefilled message (optional)", "On my way"],
      ],
    },
    {
      type: "vcard",
      select: /Contact/,
      values: {
        firstName: "Asha",
        lastName: "Patel",
        contactOrganization: "QUICKKIT",
        contactPhone: "+91 98765 43210",
        contactEmail: "asha@example.com",
      },
      fields: [
        ["First name", "Asha"],
        ["Last name", "Patel"],
        ["Organization", "QUICKKIT"],
        ["Phone (optional)", "+91 98765 43210"],
        ["Email (optional)", "asha@example.com"],
      ],
    },
    {
      type: "whatsapp",
      select: /WhatsApp/,
      values: {
        whatsappNumber: "+91 98765 43210",
        whatsappMessage: "Hello from QUICKKIT",
      },
      fields: [
        ["WhatsApp phone number", "+91 98765 43210"],
        ["Prefilled message (optional)", "Hello from QUICKKIT"],
      ],
    },
    {
      type: "location",
      select: /Location/,
      values: {
        latitude: "23.0225",
        longitude: "72.5714",
        locationLabel: "Ahmedabad",
        locationMapUrl: "https://maps.google.com/?q=23.0225,72.5714",
      },
      fields: [
        ["Latitude", "23.0225"],
        ["Longitude", "72.5714"],
        ["Place name (optional)", "Ahmedabad"],
        ["Map URL (optional)", "https://maps.google.com/?q=23.0225,72.5714"],
      ],
    },
    {
      type: "event",
      select: /Event/,
      values: {
        eventTitle: "QUICKKIT Demo",
        eventStart: "2026-12-01T09:00",
        eventEnd: "2026-12-01T10:00",
        eventLocation: "Ahmedabad",
        eventTimezone: "Asia/Kolkata",
      },
      fields: [
        ["Event name", "QUICKKIT Demo"],
        ["Starts", "2026-12-01T09:00"],
        ["Ends", "2026-12-01T10:00"],
        ["Time zone (IANA, optional)", "Asia/Kolkata"],
        ["Location (optional)", "Ahmedabad"],
      ],
    },
    {
      type: "upi",
      select: /UPI payment/,
      values: {
        upiId: "shop@bank",
        upiName: "Quickkit Store",
        upiAmount: "250",
        upiNote: "Order 123",
      },
      fields: [
        ["UPI ID (VPA)", "shop@bank"],
        ["Payee name (optional)", "Quickkit Store"],
        ["Amount in INR (optional)", "250"],
        ["Payment note (optional)", "Order 123"],
      ],
    },
    {
      type: "social",
      select: /Social profile/,
      values: {
        socialPlatform: "youtube",
        socialUrl: "https://youtube.com/@quickkit",
      },
      fields: [
        ["Social platform", "youtube"],
        ["Profile URL", "https://youtube.com/@quickkit"],
      ],
    },
    {
      type: "app",
      select: /App download/,
      values: {
        appName: "QUICKKIT",
        appPlatform: "ios",
        appUrl: "https://apps.apple.com/in/app/quickkit/id123",
      },
      fields: [
        ["App name (optional)", "QUICKKIT"],
        ["Link type", "ios"],
        [
          "App download or smart-link URL",
          "https://apps.apple.com/in/app/quickkit/id123",
        ],
      ],
    },
    {
      type: "business",
      select: /Business info/,
      values: {
        businessName: "Quickkit Studio",
        businessPhone: "+91 98765 43210",
        businessEmail: "hello@quickkit.dev",
        businessWebsite: "https://quickkit.dev",
        businessStreet: "1 Main Street",
        businessCity: "Ahmedabad",
        businessRegion: "Gujarat",
        businessPostalCode: "380001",
        businessCountry: "India",
        businessDescription: "Friendly local tools",
      },
      fields: [
        ["Business name", "Quickkit Studio"],
        ["Phone (optional)", "+91 98765 43210"],
        ["Email (optional)", "hello@quickkit.dev"],
        ["Website (optional)", "https://quickkit.dev"],
        ["Street address (optional)", "1 Main Street"],
        ["City (optional)", "Ahmedabad"],
        ["State / region (optional)", "Gujarat"],
        ["Postal code (optional)", "380001"],
        ["Country (optional)", "India"],
        ["Short description (optional)", "Friendly local tools"],
      ],
    },
    {
      type: "product",
      select: /Product info/,
      values: {
        productName: "Handmade Tea Set",
        productSku: "tea-01",
        productPrice: "INR 450",
        productUrl: "https://example.com/p/tea",
        productDescription: "Handmade ceramic",
      },
      fields: [
        ["Product name", "Handmade Tea Set"],
        ["SKU or product ID (optional)", "tea-01"],
        ["Price label (optional)", "INR 450"],
        ["Product page URL (optional)", "https://example.com/p/tea"],
        ["Product description (optional)", "Handmade ceramic"],
      ],
    },
  ];

  for (const item of cases) {
    if (item.select) await chooseType(page, item.select);
    for (const [label, value] of item.fields)
      await fillQrField(page, label, value);
    const expected = buildQrPayload(item.type, {
      ...defaultQrFormValues,
      ...item.values,
    });
    const actual = await decodePreview(page);
    if (item.type === "event") {
      expect(actual.data).toMatch(/^BEGIN:VCALENDAR\r\nVERSION:2\.0/);
      expect(actual.data).toContain("SUMMARY:QUICKKIT Demo");
      expect(actual.data).toContain("DTSTAMP:");
    } else {
      expect(actual.data, `Wrong decoded payload for ${item.type}`).toBe(
        expected,
      );
    }
  }
});

test("custom color, size, margin and centered logo stay scan-readable; PNG SVG and PDF exports work", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  await page
    .getByLabel("Text or URL")
    .fill("https://example.com/brand/scan-check");
  await page.getByLabel("PNG size").selectOption("512");
  await page.getByLabel("Quiet-zone margin").selectOption("8");
  await page.getByLabel("Error correction").selectOption("H");
  await page.getByLabel("Code fill style").selectOption("gradient");
  await page.getByLabel("Dot style").selectOption("rounded");
  await page.getByLabel("Finder corner style").selectOption("rounded");
  await page.getByLabel("Code color").fill("#153d2a");
  await page.getByLabel("Gradient end color").fill("#6657e8");
  await page.getByLabel("Background", { exact: true }).fill("#e7f7ef");
  await page.getByLabel("Download filename").fill("quickkit-brand-demo");
  await page.getByLabel("Center logo or image").setInputFiles(pngLogo());
  await page.getByLabel("Logo size").focus();
  await page.getByLabel("Logo size").press("ArrowLeft");
  await page.getByLabel("Logo size").press("ArrowLeft");
  await expect(page.getByLabel("Logo size")).toHaveValue("16");
  const expected = "https://example.com/brand/scan-check";
  const preview = await decodePreview(page);
  expect(preview.data).toBe(expected);
  expect(preview.png.width).toBe(512);

  const pngEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PNG" }).click();
  const pngDownload = await pngEvent;
  expect(pngDownload.suggestedFilename()).toBe("quickkit-brand-demo.png");
  const png = PNG.sync.read(await readFile((await pngDownload.path())!));
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe(expected);

  const jpgEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JPG" }).click();
  const jpgDownload = await jpgEvent;
  expect(jpgDownload.suggestedFilename()).toBe("quickkit-brand-demo.jpg");
  expect(
    await decodeJpgExport(page, await readFile((await jpgDownload.path())!)),
  ).toBe(expected);

  const svgEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const svgDownload = await svgEvent;
  const svg = await readFile((await svgDownload.path())!, "utf8");
  expect(svgDownload.suggestedFilename()).toBe("quickkit-brand-demo.svg");
  expect(svg).toContain("<svg");
  expect(svg).toContain("<image");
  expect(svg).toContain("<linearGradient");
  expect(svg).toContain('rx="0.24"');
  expect(svg).toContain("#153d2a");
  const svgPngDataUrl = await page.evaluate(async (svgText) => {
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      canvas.getContext("2d")!.drawImage(image, 0, 0, 512, 512);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }, svg);
  const svgPng = PNG.sync.read(
    Buffer.from(svgPngDataUrl.split(",")[1], "base64"),
  );
  expect(
    jsQR(new Uint8ClampedArray(svgPng.data), svgPng.width, svgPng.height)?.data,
  ).toBe(expected);

  const pdfEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const pdfDownload = await pdfEvent;
  expect(pdfDownload.suggestedFilename()).toBe("quickkit-brand-demo.pdf");
  const pdfBytes = await readFile((await pdfDownload.path())!);
  expect(await decodePdfExport(page, pdfBytes)).toBe(expected);
  const pdf = await PDFDocument.load(pdfBytes);
  expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getPages()[0].getSize().width).toBeCloseTo(595.28, 0);

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy image" }).click();
  await expect(
    page.getByText("QR image copied", { exact: false }),
  ).toBeVisible();
  const copiedPixels = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return Array.from(
      new Uint8Array(await (await item.getType("image/png")).arrayBuffer()),
    );
  });
  const copiedPng = PNG.sync.read(Buffer.from(copiedPixels));
  expect(
    jsQR(
      new Uint8ClampedArray(copiedPng.data),
      copiedPng.width,
      copiedPng.height,
    )?.data,
  ).toBe(expected);
});

test("all dot and finder-corner styles stay locally scannable with gradient fill", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  const expected = "https://example.com/shape-style-check";
  await page.getByLabel("Text or URL").fill(expected);
  await page.getByLabel("PNG size").selectOption("512");
  await page.getByLabel("Error correction").selectOption("H");
  await page.getByLabel("Code fill style").selectOption("gradient");
  await page.getByLabel("Code color").fill("#153d2a");
  await page.getByLabel("Gradient end color").fill("#6657e8");
  await page.getByLabel("Background", { exact: true }).fill("#f0fbf7");

  for (const errorLevel of ["L", "M", "Q", "H"]) {
    await page.getByLabel("Error correction").selectOption(errorLevel);
    expect(
      (await decodePreview(page)).data,
      `error correction ${errorLevel}`,
    ).toBe(expected);
  }

  for (const dotStyle of ["square", "rounded", "dots", "diamond"]) {
    for (const cornerStyle of ["square", "rounded", "circle"]) {
      await page.getByLabel("Dot style").selectOption(dotStyle);
      await page.getByLabel("Finder corner style").selectOption(cornerStyle);
      expect(
        (await decodePreview(page)).data,
        `${dotStyle}/${cornerStyle}`,
      ).toBe(expected);
    }
  }

  await page.getByLabel("Center logo or image").setInputFiles(pngLogo());
  expect((await decodePreview(page)).data).toBe(expected);
  await page.getByRole("button", { name: "Remove logo" }).click();
  await expect(page.getByAltText("Selected logo")).toHaveCount(0);
  expect((await decodePreview(page)).data).toBe(expected);
});

test("batch mode downloads a ZIP containing independently decodable QR PNGs", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  await page.getByRole("tab", { name: "Batch ZIP" }).click();
  await page.getByLabel("Download filename").fill("campaign-codes");
  await page
    .getByLabel(/Batch items/)
    .fill(
      "menu | https://example.com/menu\ninstagram | https://instagram.com/quickkit\nA plain text pass",
    );
  await page.getByRole("button", { name: "Generate selected (3)" }).click();
  await expect(
    page.getByText(/3 QR codes ready and scan-checked locally/),
  ).toBeVisible({ timeout: 30000 });
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ZIP/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("campaign-codes-batch.zip");
  const zip = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(zip).sort()).toEqual([
    "instagram.png",
    "menu.png",
    "qr-03.png",
  ]);
  const expected = {
    "instagram.png": "https://instagram.com/quickkit",
    "menu.png": "https://example.com/menu",
    "qr-03.png": "A plain text pass",
  };
  for (const [name, bytes] of Object.entries(zip)) {
    const png = PNG.sync.read(Buffer.from(bytes));
    expect(
      jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
    ).toBe(expected[name as keyof typeof expected]);
  }
});

test("custom canvas, transparent output, logo placement and escaped captions stay decodable", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  const expected = "https://example.com/quickkit/custom-canvas";
  await page.getByLabel("Text or URL").fill(expected);
  await page.getByLabel("Use custom canvas dimensions").check();
  await page.getByLabel("Canvas width (px)").fill("640");
  await page.getByLabel("Canvas width (px)").press("Tab");
  await page.getByLabel("Canvas height (px)").fill("384");
  await page.getByLabel("Canvas height (px)").press("Tab");
  await page.getByLabel("Error correction").selectOption("H");
  await page.getByLabel("Code fill style").selectOption("gradient");
  await page.getByLabel("Dot style").selectOption("diamond");
  await page.getByLabel("Finder corner style").selectOption("circle");
  await page.getByLabel("Code color").fill("#173e31");
  await page.getByLabel("Gradient end color").fill("#6554ce");
  await page.getByLabel("Finder eye color").fill("#173e31");
  await page.getByLabel("Frame & caption").selectOption("poster");
  await page.getByLabel("Frame caption").fill("<script>alert(1)</script>");
  await page.getByLabel("Frame color").fill("#f4f0ff");
  await page.getByLabel("Frame text color").fill("#433187");
  await page.getByLabel("Center logo or image").setInputFiles(pngLogo());
  const logoSize = page.getByLabel("Logo size");
  await logoSize.focus();
  for (let index = 0; index < 6; index++) await logoSize.press("ArrowLeft");
  await expect(logoSize).toHaveValue("12");
  const horizontal = page.getByLabel("Logo horizontal position");
  await horizontal.focus();
  for (let index = 0; index < 5; index++) await horizontal.press("ArrowRight");
  await expect(horizontal).toHaveValue("55");
  const vertical = page.getByLabel("Logo vertical position");
  await vertical.focus();
  for (let index = 0; index < 3; index++) await vertical.press("ArrowLeft");
  const padding = page.getByLabel("Logo padding");
  await padding.focus();
  for (let index = 0; index < 4; index++) await padding.press("ArrowRight");
  await page.getByLabel("Logo background color").fill("#ffffff");
  await page.getByLabel("Transparent background").check();

  const preview = await decodePreview(page);
  expect(preview.data).toBe(expected);
  expect(preview.png.width).toBe(640);
  expect(preview.png.height).toBe(384);

  const pngEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PNG" }).click();
  const pngDownload = await pngEvent;
  const png = PNG.sync.read(await readFile((await pngDownload.path())!));
  expect([png.width, png.height]).toEqual([640, 384]);
  expect(jsQR(compositeOnWhite(png), png.width, png.height)?.data).toBe(
    expected,
  );

  const svgEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const svgDownload = await svgEvent;
  const svg = await readFile((await svgDownload.path())!, "utf8");
  expect(svg).toContain('width="640" height="384"');
  expect(svg).not.toMatch(/<script\b/i);
  expect(svg).toContain("&lt;script&gt;");
  const renderedSvg = await page.evaluate(async (svgText) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(
      new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }),
    );
    image.src = objectUrl;
    try {
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 384;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, svg);
  const svgPng = PNG.sync.read(
    Buffer.from(renderedSvg.split(",")[1], "base64"),
  );
  expect(
    jsQR(new Uint8ClampedArray(svgPng.data), svgPng.width, svgPng.height)?.data,
  ).toBe(expected);
});

test("editable template, undo/redo, saved design and safe local history controls work", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  await page.getByRole("button", { name: /Business card/ }).click();
  await expect(
    page.getByRole("heading", { name: "Business info details" }),
  ).toBeVisible();
  await expect(page.getByLabel("Frame & caption")).toHaveValue("caption");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Frame & caption")).toHaveValue("none");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Frame & caption")).toHaveValue("caption");
  await page.getByLabel("Business name").fill("Quickkit Local Studio");
  expect((await decodePreview(page)).data).toContain("Quickkit Local Studio");
  await page.getByRole("button", { name: "Compare presets" }).click();
  await expect(
    page.getByText("Compare color, shape and frame styles"),
  ).toBeVisible();

  await page.locator(".qr-local-saves > summary").click();
  await page.getByLabel("Design name").fill("Studio contact design");
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(
    page.getByRole("button", {
      name: "Studio contact design",
      exact: true,
    }),
  ).toBeVisible();
  const savedDesign = await page.evaluate(() =>
    localStorage.getItem("quickkit.qr.saved-designs.v1"),
  );
  expect(savedDesign).toContain("Studio contact design");

  await page.getByLabel("Save recent QR history locally").check();
  await page.waitForFunction(() =>
    localStorage
      .getItem("quickkit.qr.recent-projects.v1")
      ?.includes("Quickkit Local Studio"),
  );
  const storedHistory = await page.evaluate(() =>
    localStorage.getItem("quickkit.qr.recent-projects.v1"),
  );
  await page.getByLabel("Save recent QR history locally").uncheck();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("quickkit.qr.recent-projects.v1"),
    ),
  ).toBe(storedHistory);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Clear saved history/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("quickkit.qr.recent-projects.v1"),
      ),
    )
    .toBeNull();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("quickkit.qr.saved-designs.v1"),
    ),
  ).toBe(savedDesign);
});

test("CSV bulk studio reports invalid and duplicate rows, ZIP decodes, and sheet PDF is scan-checked", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  await page.getByRole("tab", { name: "Batch ZIP" }).click();
  const csv = [
    "type,content,filename,ssid,password,security",
    "url,https://example.com/csv/menu,menu,,,",
    "url,https://example.com/csv/menu,duplicate-menu,,,",
    "url,javascript://malicious.example,bad-link,,,",
    "wifi,,guest-wifi,Studio Guest,guestpass123,WPA",
  ].join("\n");
  await page.getByLabel("Import CSV file").setInputFiles({
    name: "quickkit-batch.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(
    page.getByRole("status").filter({
      hasText: /Imported 4 spreadsheet rows locally/,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Duplicate of row 2", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Invalid row", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate selected (2)" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Generate selected (2)" }).click();
  await expect(
    page.getByText(/2 QR codes ready and scan-checked locally/),
  ).toBeVisible({ timeout: 30000 });

  const zipEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ZIP/ }).click();
  const zipDownload = await zipEvent;
  const zip = unzipSync(await readFile((await zipDownload.path())!));
  expect(Object.keys(zip).sort()).toEqual(["guest-wifi.png", "menu.png"]);
  const expected = {
    "menu.png": "https://example.com/csv/menu",
    "guest-wifi.png": "WIFI:T:WPA;S:Studio Guest;P:guestpass123;;",
  };
  for (const [name, bytes] of Object.entries(zip)) {
    const png = PNG.sync.read(Buffer.from(bytes));
    expect(
      jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
    ).toBe(expected[name as keyof typeof expected]);
  }

  await page.getByLabel("Columns").selectOption("1");
  const sheetEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /Download A4 print sheet PDF/ })
    .click();
  const sheetDownload = await sheetEvent;
  expect(sheetDownload.suggestedFilename()).toBe(
    "quickkit-qr-code-a4-qr-sheet.pdf",
  );
  const sheetBytes = await readFile((await sheetDownload.path())!);
  const sheetPdf = await PDFDocument.load(sheetBytes);
  expect(sheetPdf.getPageCount()).toBe(1);
  expect(sheetPdf.getPages()[0].getSize().width).toBeCloseTo(595.28, 0);
  const sheetPng = await rasterizePdfPage(page, sheetBytes);
  const scale = 2;
  const pointsPerMm = 72 / 25.4;
  const marginPx = Math.round(12 * pointsPerMm * scale);
  const cellPx = 240 * scale;
  const rowPitchPx = Math.round((240 + 14 + 6 * pointsPerMm) * scale);
  expect(decodePngCrop(sheetPng, marginPx, marginPx, cellPx, cellPx)).toBe(
    expected["menu.png"],
  );
  expect(
    decodePngCrop(sheetPng, marginPx, marginPx + rowPitchPx, cellPx, cellPx),
  ).toBe(expected["guest-wifi.png"]);
});

test("desktop, tablet and mobile workspace screenshots stay within viewport width", async ({
  page,
}) => {
  await mkdir("docs/qr-generator/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/tools/qr-generator");
  await page
    .getByLabel("Text or URL")
    .fill("https://quickkit.dev/qr-generator-preview");
  await page.getByRole("button", { name: /Lavender studio/ }).click();
  await decodePreview(page);
  for (const [label, width, height] of [
    ["desktop", 1440, 1100],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    expect(
      await page.locator("body").evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.locator(".qr-workspace").screenshot({
      path: `docs/qr-generator/screenshots/qr-generator-v2-${label}.png`,
      animations: "disabled",
    });
  }
});

test("QR workflows remain usable on a narrow phone viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/qr-generator");
  await page.getByLabel("Text or URL").fill("mobile-preview");
  expect(
    await page.locator("body").evaluate((body) => body.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(page.getByAltText("Generated QR code preview")).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("tab", { name: "Batch ZIP" }).click();
  await expect(page.getByLabel(/Batch items/)).toBeVisible();
  expect(
    await page.locator("body").evaluate((body) => body.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
