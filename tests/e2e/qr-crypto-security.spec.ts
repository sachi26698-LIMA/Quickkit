/**
 * End-to-End Chromium Verification for QR Cryptographic Security:
 * - ECDSA P-256 tamper-proof digital signatures (`/qr?d=…&sg=…`)
 * - AES-256-GCM + PBKDF2-SHA256 passphrase vaults (`/qr?e=…` & Scanner inline unlock)
 * - Tamper detection & redirect blocking across `/qr` and `/tools/qr-code-scanner`
 * - Mobile (`375px`) and Desktop (`1280px`) zero-overflow verification
 */
import { expect, test } from "@playwright/test";
import { decodePng } from "./helpers/qr-decode";
import {
  downloadByButton,
  gotoStudio,
  pickType,
  setExportSize,
  trySample,
  waitVerified,
} from "./helpers/qr-studio";

test.describe.configure({ timeout: 35_000 });

test.describe("QR Cryptographic Anti-Tamper & Encryption E2E", () => {
  test("ECDSA P-256 signed Payment QR verifies on `/qr` and blocks 1-byte tampering", async ({
    page,
  }) => {
    await gotoStudio(page);
    await pickType(page, "payment");
    await trySample(page);
    await setExportSize(page, 512);
    await waitVerified(page);

    const png = await downloadByButton(page, /^PNG/);
    const signedUrl = decodePng(png.buffer);
    expect(signedUrl).toBeTruthy();
    expect(signedUrl).toContain("/qr?d=");
    expect(signedUrl).toContain("&sg=");

    // Intact signed QR verifies cleanly on `/qr`
    await page.goto(signedUrl!);
    await expect(
      page.getByText("Tamper-Proof Digital Signature Verified"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Aurora Café" }),
    ).toBeVisible();

    // Flip 1 character inside `&sg=` -> `/qr` MUST block with Tamper Alert!
    const parsed = new URL(signedUrl!);
    const origSg = parsed.searchParams.get("sg")!;
    const lastChar = origSg.slice(-1) === "A" ? "B" : "A";
    parsed.searchParams.set("sg", origSg.slice(0, -1) + lastChar);

    await page.goto(parsed.toString());
    await expect(
      page.getByRole("heading", { name: /CRITICAL TAMPER ALERT/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Aurora Café" }),
    ).toHaveCount(0);
  });

  test("AES-256-GCM Password Vault QR exports encrypted PNG and unlocks inside QR Scanner & `/qr`", async ({
    page,
  }) => {
    await gotoStudio(page);
    await pickType(page, "wifi");
    await trySample(page);

    // Open Security Shield and enable Password Vault (AES-256-GCM)
    const shield = page.locator("#qr-security-shield");
    const isOpen = await shield.evaluate(
      (el) => (el as HTMLDetailsElement).open,
    );
    if (!isOpen) await shield.locator("summary").click();

    await shield.getByRole("button", { name: /Password Vault/i }).click();
    await page.locator("#qr-security-passphrase").fill("Fortress2026!");
    await page.locator("#qr-security-hint").fill("Fortress year");

    await setExportSize(page, 512);
    await waitVerified(page);

    const encryptedPng = await downloadByButton(page, /^PNG/);
    const encryptedUrl = decodePng(encryptedPng.buffer);
    expect(encryptedUrl).toBeTruthy();
    expect(encryptedUrl).toContain("/qr?e=");
    expect(encryptedUrl).not.toContain("Café Aurora");

    // Scan the exported PNG directly in `/tools/qr-code-scanner` (Upload tab)
    await page.goto("/tools/qr-code-scanner");
    await page.getByRole("tab", { name: /Upload/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "encrypted-wifi.png",
      mimeType: "image/png",
      buffer: encryptedPng.buffer,
    });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 25_000 });
    await expect(dialog).toContainText(/Encrypted.*AES-256-GCM/i);

    await dialog.getByLabel("QR decryption passphrase").fill("Fortress2026!");
    await dialog.getByRole("button", { name: /Decrypt QR/i }).click();

    await expect(dialog).toContainText("Café Aurora Wi-Fi", {
      timeout: 15_000,
    });
    await dialog.getByRole("button", { name: /^Close$/i }).click();

    // Also verify `/qr?e=…` hosted vault unlock flow
    await page.goto(encryptedUrl!);
    await expect(
      page.getByRole("heading", { name: "Encrypted QR Vault" }),
    ).toBeVisible();
    await page.locator("#qr-vault-passphrase").fill("Fortress2026!");
    await page.getByRole("button", { name: /Unlock & Verify QR/i }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Café Aurora Wi-Fi" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("mobile (375px) and desktop (1280px) layouts have zero horizontal overflow", async ({
    page,
  }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 860 });

      await page.goto("/tools/qr-generator");
      const shield = page.locator("#qr-security-shield");
      if (!(await shield.evaluate((el) => (el as HTMLDetailsElement).open))) {
        await shield.locator("summary").click();
      }
      const genOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(genOverflow).toBeLessThanOrEqual(0);

      await page.goto("/tools/qr-code-scanner");
      await page.getByRole("tab", { name: /Upload/i }).click();
      const scanOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(scanOverflow).toBeLessThanOrEqual(0);
    }
  });
});
