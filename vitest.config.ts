import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/vitest.setup.ts"],
    // Encode/decode suites do real pixel and symbol work, and the CI runners
    // have two cores shared with every other test file. A spec that finishes
    // in two seconds alone can sit in the scheduler for a minute, so give the
    // default more headroom; individual specs keep their explicit timeouts.
    testTimeout: 120_000,
  },
});
