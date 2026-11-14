import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`all four UI corners follow the physical display at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1200 });
    await page.goto("/");
    await expect(page.locator("#tool-search")).toBeEnabled();
    const plane = page.locator('[data-screen-alignment="four-corner-v1"]');
    await expect(plane).toBeVisible();
    const samples = await plane.evaluate(async (el) => {
      const laptop = document.querySelector<HTMLElement>("[data-laptop-body]")!;
      const motion = laptop.getAnimations()[0];
      motion.pause();
      await motion.ready;
      const screen = el.parentElement!;
      const targetCorners = [
        [22.95, 11.09],
        [96.38, 4.89],
        [93.6, 72.4],
        [19.96, 71.2],
      ];
      const sourceCorners = [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ];
      return [0, 0.5].map((phase) => {
        motion.currentTime =
          Number(motion.effect!.getTiming().duration) * phase;
        return sourceCorners.map(([x, y], index) => {
          const source = document.createElement("span");
          const target = document.createElement("span");
          for (const node of [source, target])
            Object.assign(node.style, {
              position: "absolute",
              width: "0px",
              height: "0px",
              pointerEvents: "none",
            });
          Object.assign(source.style, { left: `${x}%`, top: `${y}%` });
          Object.assign(target.style, {
            left: `${targetCorners[index][0]}%`,
            top: `${targetCorners[index][1]}%`,
          });
          el.append(source);
          screen.append(target);
          const a = source.getBoundingClientRect(),
            b = target.getBoundingClientRect();
          source.remove();
          target.remove();
          return Math.hypot(a.left - b.left, a.top - b.top);
        });
      });
    });
    for (const sample of samples)
      for (const distance of sample) expect(distance).toBeLessThan(1);
    for (const selector of ['[class*="_miniMain"]', '[class*="_miniBrand"]']) {
      await expect(plane.locator(selector)).toHaveCSS("transform", "none");
    }
    await expect(plane.locator('[class*="_miniMain"]')).toHaveCSS(
      "animation-name",
      "none",
    );
    // Search and feedback must still be real controls after perspective mapping.
    await plane.getByRole("searchbox").fill("image");
    await expect(
      plane.getByRole("link", { name: "Image Resizer", exact: true }),
    ).toBeVisible();
    await plane.getByRole("searchbox").fill("");
    const button = plane.getByRole("button", { name: "Share feedback" });
    await button.hover({ force: true });
    await button.click();
    await expect(
      page.getByRole("dialog", { name: "Share your experience" }),
    ).toBeVisible();
  });
}
