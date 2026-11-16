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
/** Await the delayed prompt before continuing focus-sensitive legacy journeys.
 * The prompt is shown at most once per tool in 24 hours, so a later download
 * in the same journey has nothing to close. */
export async function closeDownloadFeedback(page: Page) {
  const dialog = page.locator("dialog[data-feedback-tool][open]");
  await page.removeLocatorHandler(dialog);
  const alreadyInvited = await page.evaluate(() => {
    try {
      const slug = location.pathname.split("/")[2] ?? "";
      const log = JSON.parse(
        localStorage.getItem("quickkit-tool-feedback-prompted-v1") ?? "{}",
      ) as Record<string, unknown>;
      return typeof log[slug] === "number";
    } catch {
      return false;
    }
  });
  // Recorded just before the dialog opens: give an invitation that is on its
  // way a moment to appear, otherwise there is nothing to close.
  const showing =
    !alreadyInvited ||
    (await dialog.waitFor({ state: "visible", timeout: 1500 }).then(
      () => true,
      () => false,
    ));
  if (showing)
    await page
      .getByRole("button", { name: "Close feedback", exact: true })
      .click();
  await dismissOptionalDownloadFeedback(page);
}
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await dismissOptionalDownloadFeedback(page);
    await runTest(page);
  },
});
