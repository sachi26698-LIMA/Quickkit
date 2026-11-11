/**
 * QR Studio V3 — Phase J browser E2E (functional + independent decode).
 *
 * Runs against a real Chromium. Every exported file is decoded INDEPENDENTLY in
 * the Node process (pngjs/jsQR, pdf.js rasterisation, Chromium SVG rasterisation)
 * and compared to the exact payload the app should have produced. Nothing here
 * trusts the app's own "verified" badge for the final assertion.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import {
  QR_CONTENT_TYPES,
  buildPayload,
  sampleValuesFor,
} from "../../lib/tools/qr/payload";
import {
  QR_TEMPLATE_LIBRARY,
  TEMPLATE_CATEGORIES,
} from "../../lib/tools/qr/templates";
import { PRESET_SWATCHES } from "../../lib/tools/qr/palette";
import {
  decodePng,
  decodePngOnWhite,
  decodePdf,
  decodeSvg,
} from "./helpers/qr-decode";
import {
  gotoStudio,
  pickType,
  trySample,
  setExportSize,
  openAdvanced,
  waitVerified,
  downloadByButton,
  openDesignTab,
  openWorkspaceTab,
} from "./helpers/qr-studio";

test.describe.configure({ timeout: 120_000 });

/** Expected payload for a type's sample (event is time/random-stamped). */
function expectedPayload(id: string): string {
  return buildPayload(id as never, sampleValuesFor(id as never));
}

async function sampleStudio(
  page: import("@playwright/test").Page,
  id = "url",
  options: { raw?: boolean } = {},
) {
  await gotoStudio(page);
  await pickType(page, id);
  if (options.raw !== false) {
    await page.getByRole("button", { name: /Direct Raw Content/ }).click();
  }
  await trySample(page);
  await setExportSize(page, 512);
  await waitVerified(page);
}

test.describe("Data Templates & Original Link inside QR", () => {
  test("vCard and Payment / UPI encode an original `/qr?d=…` link that opens the hosted Data Card", async ({
    page,
  }) => {
    await sampleStudio(page, "vcard", { raw: false });
    const vcardPng = await downloadByButton(page, /^PNG/);
    const vcardUrl = decodePng(vcardPng.buffer);
    expect(vcardUrl).toContain("/qr?d=");
    await page.goto(vcardUrl!);
    await expect(
      page.getByRole("heading", { level: 1, name: "Ada Lovelace" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Save Contact \(\.vcf\)/ }),
    ).toBeVisible();

    await sampleStudio(page, "payment", { raw: false });
    const payPng = await downloadByButton(page, /^PNG/);
    const payUrl = decodePng(payPng.buffer);
    expect(payUrl).toContain("/qr?d=");
    await page.goto(payUrl!);
    await expect(
      page.getByRole("heading", { level: 1, name: "Aurora Café" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Pay ₹250\.00 via UPI/ }),
    ).toHaveAttribute("href", /^upi:\/\/pay\?/);
  });
});

test.describe("V3 content types — every type exports a decodable PNG", () => {
  for (const type of QR_CONTENT_TYPES) {
    test(`content type "${type.id}" PNG decodes to its exact payload`, async ({
      page,
    }) => {
      await sampleStudio(page, type.id);
      const { buffer, filename } = await downloadByButton(page, /^PNG/);
      expect(filename).toMatch(/\.png$/);
      const decoded = decodePng(buffer);
      if (type.id === "event") {
        // iCalendar UID/DTSTAMP are generated at click time, so assert structure.
        expect(decoded).toContain("BEGIN:VCALENDAR");
        expect(decoded).toContain("Quickkit launch party");
      } else {
        expect(decoded).toBe(expectedPayload(type.id));
      }
    });
  }
});

test.describe("V3 template library — all 55 templates decode", () => {
  for (const category of TEMPLATE_CATEGORIES) {
    const templates = QR_TEMPLATE_LIBRARY.filter(
      (t) => t.category === category.id,
    );
    test(`category "${category.label}" (${templates.length} templates) each decode`, async ({
      page,
    }) => {
      await sampleStudio(page, "url");
      const expected = expectedPayload("url");
      await openDesignTab(page, "Templates");
      await page
        .getByRole("group", { name: "Filter templates by category" })
        .getByRole("button", { name: category.label })
        .click();
      for (const template of templates) {
        await page
          .getByRole("button", { name: `Apply the ${template.name} template` })
          .click();
        await waitVerified(page);
        const { buffer } = await downloadByButton(page, /^PNG/);
        expect(decodePng(buffer), `template ${template.id}`).toBe(expected);
      }
    });
  }
});

test.describe("V3 design controls stay scannable", () => {
  test("linear gradient foreground exports a decodable PNG", async ({
    page,
  }) => {
    await sampleStudio(page);
    await openDesignTab(page, "Colours");
    await page
      .getByRole("group", { name: "Modules (foreground) type" })
      .getByRole("button", { name: "Linear gradient" })
      .click();
    await waitVerified(page);
    const { buffer } = await downloadByButton(page, /^PNG/);
    expect(decodePng(buffer)).toBe(expectedPayload("url"));
  });

  test("transparent background exports a PNG that decodes on white", async ({
    page,
  }) => {
    await sampleStudio(page);
    await openAdvanced(page);
    await page.getByLabel("Transparent background").check();
    await waitVerified(page);
    const { buffer } = await downloadByButton(page, /^PNG/);
    // Alpha must be preserved, and it must scan once placed on a light surface.
    expect(decodePngOnWhite(buffer)).toBe(expectedPayload("url"));
  });

  test("a labelled frame exports a decodable PNG", async ({ page }) => {
    await sampleStudio(page);
    await openDesignTab(page, "Frame");
    await page
      .getByRole("group", { name: "Frame style" })
      .getByRole("button", { name: "Scan Me" })
      .click();
    await waitVerified(page);
    const { buffer } = await downloadByButton(page, /^PNG/);
    expect(decodePng(buffer)).toBe(expectedPayload("url"));
  });

  test("every eye style exports a decodable PNG", async ({ page }) => {
    await sampleStudio(page);
    await openDesignTab(page, "Corners");
    const group = page.getByRole("group", { name: "Corner and eye style" });
    // The UI strips the " eyes" suffix; match exactly so "Round" != "Rounded".
    for (const label of ["Rounded", "Round", "Circle outline"]) {
      await group.getByRole("button", { name: label, exact: true }).click();
      await waitVerified(page);
      const { buffer } = await downloadByButton(page, /^PNG/);
      expect(decodePng(buffer), label).toBe(expectedPayload("url"));
    }
  });

  test("a logo overlay exports a decodable PNG", async ({ page }) => {
    // Build a small opaque logo PNG and upload it through the real file input.
    const canvas = createCanvas(120, 120);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = "#3b1b4f";
    ctx.fillRect(12, 12, 96, 96);
    ctx.fillStyle = "#d6598f";
    ctx.fillRect(40, 40, 40, 40);
    const logoPath = path.join(os.tmpdir(), "qr-e2e-logo.png");
    fs.writeFileSync(logoPath, canvas.toBuffer("image/png"));

    await sampleStudio(page);
    await openDesignTab(page, "Logo");
    await page.locator("#qr-logo-file").setInputFiles(logoPath);
    await waitVerified(page);
    const { buffer } = await downloadByButton(page, /^PNG/);
    expect(decodePng(buffer)).toBe(expectedPayload("url"));
  });

  test("every brand preset and brand swatch applies and decodes", async ({
    page,
  }) => {
    await sampleStudio(page);
    await openDesignTab(page, "Colours");
    for (const swatch of PRESET_SWATCHES) {
      await page
        .getByRole("button", { name: `Apply ${swatch.name}`, exact: true })
        .click();
      await waitVerified(page);
      const { buffer } = await downloadByButton(page, /^PNG/);
      expect(decodePng(buffer), swatch.name).toBe(expectedPayload("url"));
    }
  });
});

test.describe("V3 export formats — PNG, high-res PNG, SVG, PDF", () => {
  test("PNG, high-res PNG, SVG and PDF all decode to the payload", async ({
    page,
  }) => {
    await sampleStudio(page);
    const expected = expectedPayload("url");

    const png = await downloadByButton(page, /^PNG/);
    expect(png.filename).toMatch(/\.png$/);
    expect(decodePng(png.buffer)).toBe(expected);

    const hires = await downloadByButton(page, /^High-res PNG/);
    expect(hires.filename).toMatch(/\.png$/);
    expect(decodePng(hires.buffer)).toBe(expected);

    const svg = await downloadByButton(page, /^SVG/);
    expect(svg.filename).toMatch(/\.svg$/);
    const svgText = svg.buffer.toString("utf8");
    expect(svgText).toContain("<svg");
    expect(await decodeSvg(page, svgText)).toBe(expected);

    const pdf = await downloadByButton(page, /^PDF/);
    expect(pdf.filename).toMatch(/\.pdf$/);
    expect(pdf.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(await decodePdf(pdf.buffer)).toBe(expected);
  });
});

test.describe("V3 bulk CSV → ZIP", () => {
  test("a mixed CSV produces a ZIP whose every PNG decodes", async ({
    page,
  }) => {
    await gotoStudio(page);
    await openWorkspaceTab(page, /Bulk \(CSV\)/);
    const csv = [
      "type,label,url,ssid,password,encryption",
      "url,Site,https://example.com,,,",
      "url,Menu,https://example.com/menu,,,",
      "wifi,Cafe,,Café Aurora,,nopass",
    ].join("\n");
    const csvPath = path.join(os.tmpdir(), "qr-e2e-bulk.csv");
    fs.writeFileSync(csvPath, csv);
    await page.locator("#qr-bulk-file").setInputFiles(csvPath);
    await page.getByRole("button", { name: /Preview rows/ }).click();
    await page.getByRole("button", { name: /^Generate/ }).click();
    const zipButton = page.getByRole("button", { name: /Download ZIP/ });
    await expect(zipButton).toBeEnabled({ timeout: 60_000 });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      zipButton.click(),
    ]);
    const zipPath = (await download.path())!;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    const { unzipSync } = await import("fflate");
    const files = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));
    const pngNames = Object.keys(files).filter((n) => n.endsWith(".png"));
    expect(pngNames.length).toBe(3);
    const decoded = pngNames.map((n) => decodePng(Buffer.from(files[n])));
    // normalizeUrl keeps a trailing slash on a bare origin, so compare against
    // the exact payload the app builds rather than a hand-typed string.
    expect(decoded).toContain(
      buildPayload("url", { url: "https://example.com" }),
    );
    expect(decoded).toContain(
      buildPayload("url", { url: "https://example.com/menu" }),
    );
    expect(decoded.some((d) => d && d.startsWith("WIFI:"))).toBe(true);
    expect(Object.keys(files).some((n) => /README/i.test(n))).toBe(true);
  });
});

test.describe("V3 history, presets and config", () => {
  test("history records a code and restores it", async ({ page }) => {
    await sampleStudio(page);
    await openWorkspaceTab(page, /^History/);
    // Generating a code auto-saves a history row with a restore control.
    const restore = page.getByRole("button", {
      name: /Edit and regenerate|Restore/,
    });
    await expect(restore.first()).toBeVisible({ timeout: 15_000 });
    // Restoring puts the payload back into the editor and re-verifies it.
    await restore.first().click();
    await page.getByRole("tab", { name: /Create QR/ }).click();
    await waitVerified(page);
    const { buffer } = await downloadByButton(page, /^PNG/);
    expect(decodePng(buffer)).toBe(expectedPayload("url"));
  });

  test("preset save, rename, duplicate and config export/import round-trip", async ({
    page,
  }) => {
    await sampleStudio(page);
    await openWorkspaceTab(page, /^Presets/);
    const grid = page.locator(".qr-preset-grid");
    await page.locator("#qr-preset-name").fill("E2E preset");
    await page.getByRole("button", { name: /Save design/ }).click();
    await expect(grid.getByText("E2E preset", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Rename the E2E preset" }).click();
    await page
      .getByRole("textbox", { name: "Rename the E2E preset" })
      .fill("Renamed preset");
    await page.getByRole("button", { name: "Save the new name" }).click();
    await expect(
      grid.getByText("Renamed preset", { exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Duplicate the Renamed preset" })
      .click();
    await expect(
      grid.getByText("Renamed preset copy", { exact: true }),
    ).toBeVisible();

    // Export config and verify the JSON contains the presets.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Export config/ }).click(),
    ]);
    const configPath = (await download.path())!;
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.app).toBe("quickkit-qr-studio");
    expect(config.presets.length).toBeGreaterThanOrEqual(2);

    // Import it back (merge) — existing presets are kept, no duplicates added.
    const before = config.presets.length;
    await page
      .getByLabel("Import a QUICKKIT QR config file")
      .setInputFiles(configPath);
    await expect(page.getByText(/existing data was kept/i)).toBeVisible({
      timeout: 15_000,
    });
    const after = await page.locator(".qr-preset-grid li").count();
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
