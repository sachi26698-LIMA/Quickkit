import { test, expect } from "@playwright/test";

/**
 * Camera lifecycle in a real browser, using Chromium's fake capture device.
 *
 * This file owns its launch arguments, so it runs as its own worker: the rest of
 * the suite must never be handed a fake camera. A physical camera is still not
 * tested, and that is stated in the readiness report.
 */
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

test("starts on click, stops on demand, and releases tracks when the tool is left", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __streams?: MediaStream[] };
    w.__streams = [];
    const media = navigator.mediaDevices;
    const original = media.getUserMedia.bind(media);
    media.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      const stream = await original(constraints);
      w.__streams!.push(stream);
      return stream;
    };
  });

  await page.goto("/tools/barcode-scanner");
  await expect(page.getByText("Camera off")).toBeVisible();

  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByText("Scanning continuously")).toBeVisible({
    timeout: 20_000,
  });

  const liveState = await page.evaluate(() => {
    const w = window as unknown as { __streams?: MediaStream[] };
    const video = document.querySelector("video");
    return {
      streams: w.__streams?.length ?? 0,
      videoVisible: Boolean(video && video.style.display !== "none"),
      tracksLive: (w.__streams ?? [])
        .flatMap((stream) => stream.getTracks())
        .every((track) => track.readyState === "live"),
    };
  });
  expect(liveState.streams).toBeGreaterThan(0);
  expect(liveState.videoVisible).toBe(true);
  expect(liveState.tracksLive).toBe(true);

  await page.getByRole("button", { name: "Stop camera" }).click();
  await expect(page.getByText("Camera off")).toBeVisible();
  const stopped = await page.evaluate(() => {
    const w = window as unknown as { __streams?: MediaStream[] };
    return (w.__streams ?? [])
      .flatMap((stream) => stream.getTracks())
      .every((track) => track.readyState === "ended");
  });
  expect(stopped).toBe(true);

  // Start again, then leave through an in-app link: React unmounts the tool,
  // so every track must be ended without a page unload hiding the answer.
  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByText("Scanning continuously")).toBeVisible({
    timeout: 20_000,
  });
  await page
    .getByRole("link", { name: /batch code checker/i })
    .first()
    .click();
  await expect(page).toHaveURL(/batch-code-checker/);
  const afterLeaving = await page.evaluate(() => {
    const w = window as unknown as { __streams?: MediaStream[] };
    return {
      streams: w.__streams?.length ?? 0,
      ended: (w.__streams ?? [])
        .flatMap((stream) => stream.getTracks())
        .every((track) => track.readyState === "ended"),
    };
  });
  expect(afterLeaving.streams).toBeGreaterThan(0);
  expect(afterLeaving.ended).toBe(true);
});
