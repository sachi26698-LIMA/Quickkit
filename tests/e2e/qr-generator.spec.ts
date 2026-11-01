import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
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

async function decodePreview(page: Page) {
  await waitForScanCheck(page);
  const source = await page
    .getByAltText("Generated QR code preview")
    .getAttribute("src");
  expect(source).toContain("data:image/png;base64,");
  const png = PNG.sync.read(Buffer.from(source!.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(
    decoded,
    `Expected a scannable ${png.width}px QR output`,
  ).not.toBeNull();
  return { data: decoded!.data, png };
}

async function chooseType(page: Page, typeName: RegExp) {
  await page.getByRole("button", { name: typeName }).click();
}

async function decodePdfExport(page: Page, pdfBytes: Buffer) {
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
  const pngDataUrl = await page.evaluate(async (base64) => {
    const moduleUrl = "/__qr_test_pdfjs__/pdf.mjs";
    const pdfjs = await import(moduleUrl);
    pdfjs.GlobalWorkerOptions.workerSrc = "/__qr_test_pdfjs__/pdf.worker.mjs";
    const data = Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    );
    const pdfDocument = await pdfjs.getDocument({ data }).promise;
    const pdfPage = await pdfDocument.getPage(1);
    const viewport = pdfPage.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not rasterize the exported PDF.");
    await pdfPage.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/png");
  }, pdfBytes.toString("base64"));
  const png = PNG.sync.read(Buffer.from(pngDataUrl.split(",")[1], "base64"));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
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
      },
      fields: [
        ["Latitude", "23.0225"],
        ["Longitude", "72.5714"],
        ["Place name (optional)", "Ahmedabad"],
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
      },
      fields: [
        ["Event name", "QUICKKIT Demo"],
        ["Starts", "2026-12-01T09:00"],
        ["Ends", "2026-12-01T10:00"],
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
  ];

  for (const item of cases) {
    if (item.select) await chooseType(page, item.select);
    for (const [label, value] of item.fields)
      await page.getByLabel(label, { exact: true }).fill(value);
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
  await page.getByLabel("Background").fill("#e7f7ef");
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
  await page.getByLabel("Background").fill("#f0fbf7");

  for (const errorLevel of ["L", "M", "Q", "H"]) {
    await page.getByLabel("Error correction").selectOption(errorLevel);
    expect(
      (await decodePreview(page)).data,
      `error correction ${errorLevel}`,
    ).toBe(expected);
  }

  for (const dotStyle of ["square", "rounded", "dots"]) {
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
  await page.getByRole("button", { name: "Generate batch ZIP" }).click();
  await expect(
    page.getByText(/3 QR codes generated and scan-checked locally/),
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
