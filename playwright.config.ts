import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          },
        }
      : {}),
  },
  // A handful of journeys race real compression and cancellation work, which
  // is timing-sensitive on a two-core runner. One retry keeps a genuine break
  // visible (it still fails twice) without turning scheduler noise into red.
  retries: process.env.CI ? 1 : 0,
  // In CI, also emit GitHub annotations so failed tests are identifiable
  // from the Checks UI/API without downloading log bundles.
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm start -- --port 3001",
        url: "http://127.0.0.1:3001",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "firefox",
      use: { browserName: "firefox" },
      testMatch:
        /core.spec.ts|browser-tools.spec.ts|pdf-merger.spec.ts|pdf-splitter.spec.ts|pdf-compressor.spec.ts|pdf-to-word.spec.ts/,
    },
    {
      name: "webkit",
      use: { browserName: "webkit" },
      testMatch:
        /core.spec.ts|browser-tools.spec.ts|pdf-merger.spec.ts|pdf-splitter.spec.ts|pdf-compressor.spec.ts|pdf-to-word.spec.ts/,
    },
  ],
});
