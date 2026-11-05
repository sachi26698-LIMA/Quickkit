/**
 * Worker wiring.
 *
 * The decode worker is an optimisation, so a broken path is silent: the client
 * falls back to the main thread and everything still works, just slower and
 * with a janky camera. That is exactly the kind of regression nobody notices,
 * so the path is asserted here instead of trusted.
 *
 * This is a static check by necessity — a bundler path is resolved by Next, not
 * by Vitest — and the real proof is the production run recorded in
 * docs/qr-scanner/README.md, where the worker request is visible in the network
 * log. Both are needed: this test catches the mistake being typed again.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = resolve(__dirname, "..");
const clientPath = resolve(root, "lib/tools/qr-scanner/scan-client.ts");
const client = readFileSync(clientPath, "utf8");

describe("decode worker wiring", () => {
  it("points at a worker file that exists, relative to the client", () => {
    const match = /new URL\("([^"]+\.worker\.ts)",\s*import\.meta\.url\)/.exec(
      client,
    );
    expect(match, "the client creates its worker from a URL").not.toBeNull();
    const specifier = match![1];
    const resolved = resolve(dirname(clientPath), specifier);
    expect(
      existsSync(resolved),
      `${specifier} must resolve to a real file (from ${relative(root, clientPath)})`,
    ).toBe(true);
  });

  it("uses a module worker, which is what the worker code expects", () => {
    expect(client).toContain('{ type: "module" }');
  });

  it("transfers the pixel buffer rather than copying it", () => {
    expect(client).toMatch(/postMessage\(request,\s*\[buffer\]\)/);
  });

  it("never mutates the caller's pixels when handing bytes to the worker", () => {
    // A copy is taken; without it the worker would own the UI's raster.
    expect(client).toContain("new Uint8ClampedArray(raster.rgba).buffer");
  });

  it("keeps a main-thread fallback for browsers without module workers", () => {
    expect(client).toContain("workerBroken");
    expect(client).toContain("fallbackFor");
  });

  it("declares the same request shape on both sides of the boundary", () => {
    const worker = readFileSync(
      resolve(root, "workers/qr-scan.worker.ts"),
      "utf8",
    );
    for (const field of [
      "id",
      "width",
      "height",
      "buffer",
      "profile",
      "adjustments",
    ])
      expect(worker, `worker request declares ${field}`).toContain(field);
    expect(worker).toContain('self.addEventListener("message"');
    // The worker must decode through the same engine the tests exercise.
    expect(worker).toContain('from "@/lib/tools/qr-scanner/decoder"');
  });
});
