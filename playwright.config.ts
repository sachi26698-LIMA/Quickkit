import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3001",
    trace: "retain-on-failure",
  },
  reporter: "list",
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
      testMatch: /core.spec.ts|browser-tools.spec.ts|pdf-merger.spec.ts/,
    },
    {
      name: "webkit",
      use: { browserName: "webkit" },
      testMatch: /core.spec.ts|browser-tools.spec.ts|pdf-merger.spec.ts/,
    },
  ],
});
