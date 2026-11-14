import { expect, type Page } from "@playwright/test";

/** Verify the real mobile performance policy, then sample the existing motion
 * at the same viewport as a geometry stress test. This changes only this test
 * page's CSSOM, not the shipped styles or the user's reduced-motion setting. */
export async function enableMotionForGeometryTest(page: Page, width: number) {
  if (width > 860) return;
  const laptop = page.locator("[data-laptop-body]");
  const tiles = page.locator('[class*="_tile"]');
  await expect(laptop).toHaveCSS("animation-name", "none");
  await expect(tiles.first()).toHaveCSS("animation-name", "none");
  const removed = await page.evaluate(() => {
    let count = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (
          !(rule instanceof CSSMediaRule) ||
          !/(?:max-width\s*:\s*860px|width\s*<=\s*860px)/i.test(
            rule.conditionText,
          )
        )
          continue;
        for (const child of Array.from(rule.cssRules)) {
          if (
            child instanceof CSSStyleRule &&
            child.selectorText.includes("_laptop") &&
            child.selectorText.includes("_tile") &&
            child.style.animationName === "none"
          ) {
            child.style.removeProperty("animation");
            count++;
          }
        }
      }
    }
    return count;
  });
  expect(
    removed,
    "mobile motion override must be found and removed for geometry sampling",
  ).toBe(1);
  await expect(laptop).not.toHaveCSS("animation-name", "none");
  await expect(tiles.first()).not.toHaveCSS("animation-name", "none");
}
