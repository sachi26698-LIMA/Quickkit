/**
 * Shared navigation / interaction helpers for the QR Studio V3 browser E2E.
 * All locators mirror the real, accessible controls in the studio.
 */
import { expect, type Page } from "@playwright/test";
import fs from "node:fs";

export const STUDIO_PATH = "/tools/qr-generator";
export const VERIFIED = "Verified by an independent decoder";

export async function gotoStudio(page: Page) {
  await page.goto(STUDIO_PATH);
  await expect(page.getByLabel("QR content type")).toBeVisible();
}

export async function pickType(page: Page, id: string) {
  await page.getByLabel("QR content type").selectOption(id);
}

/** Load the working sample for the current type (only offered when empty). */
export async function trySample(page: Page) {
  // The preview card also offers a sample button; use the content card's one.
  await page
    .locator("#qr-content")
    .getByRole("button", { name: "Try sample" })
    .click();
}

/** Open the Advanced Settings fold (a real browser hides closed <details>). */
export async function openAdvanced(page: Page) {
  const advanced = page.locator("#qr-advanced");
  const isOpen = await advanced.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  if (!isOpen) await advanced.locator("summary").click();
}

/** A modest export size keeps decodes fast while staying crisp for dense codes. */
export async function setExportSize(page: Page, px: number) {
  await openAdvanced(page);
  await page
    .locator("#qr-advanced")
    .getByRole("group", { name: "Preset export sizes" })
    .getByRole("button", { name: `${px} px` })
    .click();
}

/**
 * Wait until the independent decode check passes and exports unlock. The PNG
 * button is the true export gate: it enables both for a clean "Verified" pass
 * and for a "Decoded — with notes" pass, so this accepts warned-but-scannable
 * designs (frames, gradients, transparency) without false failures.
 */
export async function waitVerified(page: Page) {
  await expect(
    page.locator("#qr-export").getByRole("button", { name: /^PNG/ }),
  ).toBeEnabled({ timeout: 30_000 });
}

export type Download = { buffer: Buffer; filename: string };

/** Click an export button by accessible name and capture the downloaded file. */
export async function downloadByButton(
  page: Page,
  name: RegExp | string,
  scope = "#qr-export",
): Promise<Download> {
  const button = page.locator(scope).getByRole("button", { name });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    button.click(),
  ]);
  const path = (await download.path())!;
  return {
    buffer: fs.readFileSync(path),
    filename: download.suggestedFilename(),
  };
}

/** Open one of the Design card's tabs (Colours, Pattern, Corners, Logo, Frame, Templates). */
export async function openDesignTab(page: Page, label: string) {
  await page.getByRole("tab", { name: new RegExp(`^${label}`, "i") }).click();
}

/** Open a workspace tab (Create QR, Bulk (CSV), History, Presets). */
export async function openWorkspaceTab(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).click();
}
