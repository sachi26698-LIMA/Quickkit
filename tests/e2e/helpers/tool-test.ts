import { test as base, type Page } from "@playwright/test";
export * from "@playwright/test";

/** Legacy tool/export journeys explicitly dismiss the new optional download
 * prompt when it blocks the next user action. Do not use this fixture for
 * feedback tests: those must exercise the real prompt without auto-dismissal.
 * This clicks the actual Close control; it does not suppress or remove UI. */
export async function dismissOptionalDownloadFeedback(page: Page) {
  await page.addLocatorHandler(
    page.locator("dialog[data-feedback-tool][open]"),
    async (dialog) => {
      await dialog
        .getByRole("button", { name: "Close feedback", exact: true })
        .click();
    },
  );
}
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await dismissOptionalDownloadFeedback(page);
    await runTest(page);
  },
});
