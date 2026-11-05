// Mocked Docker CLI only: these tests do NOT execute LibreOffice, Docker or Linux isolation.
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { Server } from "node:http";
import { createBroker } from "../scripts/word-worker/broker.mjs";
import { workerExportOptions } from "../lib/tools/word-to-pdf/private-worker";
import { defaults } from "../lib/tools/word-to-pdf/settings";
const token = "test_only_not_a_real_secret_0123456789",
  image = `sha256:${"a".repeat(64)}`;
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  servers.length = 0;
});
async function start(
  options: Partial<Parameters<typeof createBroker>[0]> = {},
) {
  const server = createBroker({ token, image, ...options });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("address missing");
  return `http://127.0.0.1:${address.port}`;
}
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/octet-stream",
  "X-Quickkit-Export": JSON.stringify(workerExportOptions(defaults)),
};
const input = new Uint8Array([0x50, 0x4b, 3, 4]);
function fakeChild(hang = false) {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    exitCode: null as number | null,
    signalCode: null as string | null,
    kill: vi.fn(),
  });
  child.kill.mockImplementation(() => {
    child.signalCode = "SIGKILL";
    queueMicrotask(() => child.emit("close", null));
    return true;
  });
  child.stdin.on("finish", () => {
    if (hang) return;
    setImmediate(() => {
      child.stdout.emit(
        "data",
        Buffer.from("%PDF-authored-test-not-real-native"),
      );
      child.stderr.emit(
        "data",
        Buffer.from(
          'QUICKKIT_METRICS {"elapsedSeconds":1.5,"containerPeakBytes":1000,"userSeconds":0.9,"systemSeconds":0.1,"peakRssKiB":512,"containerCpuUsec":1000000}\n',
        ),
      );
      child.exitCode = 0;
      child.emit("close", 0);
    });
  });
  return child;
}
describe("private broker admission and daemon cleanup (mocked runtime)", () => {
  it("requires strong configuration and local Docker socket", () => {
    expect(() => createBroker({ token: "short", image })).toThrow();
    expect(() => createBroker({ token, image: "latest" })).toThrow();
    expect(() =>
      createBroker({ token, image, dockerHost: "tcp://remote:2375" }),
    ).toThrow();
  });
  it("authenticates health and upload before invoking Docker", async () => {
    const run = vi.fn();
    const url = await start({ run });
    expect((await fetch(`${url}/health`)).status).toBe(401);
    expect(
      (await fetch(`${url}/convert`, { method: "POST", body: input })).status,
    ).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });
  it("executes a real version probe policy rather than assuming an image exists", async () => {
    const run = vi.fn().mockImplementation(async (_file, args) => ({
      stdout: args[0] === "start" ? "LibreOffice 24.2.0" : "",
    }));
    const url = await start({ run });
    const response = await fetch(`${url}/health`, { headers });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      available: true,
      isolated: true,
      protocol: 1,
    });
    expect(run.mock.calls.map((c) => c[1][0])).toEqual([
      "ps",
      "create",
      "start",
      "rm",
      "ps",
    ]);
    expect(run.mock.calls[1][1].at(-1)).toBe("--version");
    expect(run.mock.calls[1][2].env).not.toHaveProperty("WORD_WORKER_TOKEN");
  });
  it("reports unavailable and quarantines ambiguous create failures", async () => {
    const run = vi.fn().mockImplementation(async (_file, args) => {
      if (args[0] === "create") throw new Error("mock timeout");
      return { stdout: "" };
    });
    const url = await start({ run });
    expect((await fetch(`${url}/health`, { headers })).status).toBe(503);
    const response = await fetch(`${url}/convert`, {
      method: "POST",
      headers,
      body: input,
    });
    expect(response.status).toBe(503);
    expect(await response.text()).toMatch(/quarantined/);
  });
  it("rejects invalid input/options before native launch", async () => {
    const run = vi.fn();
    const url = await start({ run });
    expect(
      (
        await fetch(`${url}/convert`, {
          method: "POST",
          headers: { ...headers, "X-Quickkit-Export": "{}" },
          body: input,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(`${url}/convert`, {
          method: "POST",
          headers,
          body: "invalid",
        })
      ).status,
    ).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });
  it("returns only PDF/number metrics and confirms daemon removal before success", async () => {
    const child = fakeChild();
    const run = vi.fn().mockResolvedValue({ stdout: "" });
    const launch = vi
      .fn()
      .mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);
    const url = await start({ run, launch });
    const response = await fetch(`${url}/convert`, {
      method: "POST",
      headers,
      body: input,
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("%PDF-authored-test-not-real-native");
    expect(
      JSON.parse(
        Buffer.from(
          response.headers.get("x-quickkit-metrics")!,
          "base64url",
        ).toString(),
      ).containerPeakBytes,
    ).toBe(1000);
    expect(run.mock.calls.map((c) => c[1][0])).toEqual([
      "ps",
      "create",
      "rm",
      "ps",
    ]);
    expect(launch.mock.calls[0][1].slice(0, 3)).toEqual([
      "start",
      "--attach",
      "--interactive",
    ]);
    expect(launch.mock.calls[0][2].env).not.toHaveProperty("WORD_WORKER_TOKEN");
  });
  it("refuses concurrent jobs, kills CLI and removes daemon container after client cancellation", async () => {
    const child = fakeChild(true);
    const run = vi.fn().mockResolvedValue({ stdout: "" });
    const launch = vi
      .fn()
      .mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);
    const url = await start({ run, launch });
    const controller = new AbortController();
    const pending = fetch(`${url}/convert`, {
      method: "POST",
      headers,
      body: input,
      signal: controller.signal,
    }).catch(() => undefined);
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(1));
    expect(
      (await fetch(`${url}/convert`, { method: "POST", headers, body: input }))
        .status,
    ).toBe(429);
    controller.abort();
    await pending;
    await vi.waitFor(() =>
      expect(run.mock.calls.some((c) => c[1][0] === "rm")).toBe(true),
    );
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });
  it("enforces the deadline with daemon removal, not CLI kill alone", async () => {
    const child = fakeChild(true),
      run = vi.fn().mockResolvedValue({ stdout: "" }),
      launch = vi
        .fn()
        .mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);
    const url = await start({ run, launch, deadlineMs: 20 });
    expect(
      (await fetch(`${url}/convert`, { method: "POST", headers, body: input }))
        .status,
    ).toBe(503);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    expect(run.mock.calls.some((c) => c[1][0] === "rm")).toBe(true);
  });
  it("cancellation during confirmed create never starts document parsing", async () => {
    let complete: () => void = () => {};
    const created = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const run = vi.fn().mockImplementation(async (_file, args) => {
      if (args[0] === "create") await created;
      return { stdout: "" };
    });
    const launch = vi.fn(),
      url = await start({ run, launch }),
      controller = new AbortController();
    const pending = fetch(`${url}/convert`, {
      method: "POST",
      headers,
      body: input,
      signal: controller.signal,
    }).catch(() => undefined);
    await vi.waitFor(() =>
      expect(run.mock.calls.some((c) => c[1][0] === "create")).toBe(true),
    );
    controller.abort();
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 30));
    complete();
    await vi.waitFor(() =>
      expect(run.mock.calls.some((c) => c[1][0] === "rm")).toBe(true),
    );
    expect(launch).not.toHaveBeenCalled();
  });
  it("quarantines on unconfirmed cleanup, never serving a PDF success", async () => {
    const run = vi.fn().mockImplementation(async (_file, args) => {
      if (args[0] === "ps" && args.includes("name=^/"))
        return { stdout: "orphan" };
      return {
        stdout:
          args[0] === "ps" && String(args.at(-1)).startsWith("name=")
            ? "orphan"
            : "",
      };
    });
    const launch = vi
      .fn()
      .mockReturnValue(
        fakeChild() as unknown as ChildProcessWithoutNullStreams,
      );
    const url = await start({ run, launch });
    expect(
      (await fetch(`${url}/convert`, { method: "POST", headers, body: input }))
        .status,
    ).toBe(503);
    expect((await fetch(`${url}/health`, { headers })).status).toBe(503);
    expect(launch).toHaveBeenCalledTimes(1);
  });
  it("refuses orphaned labelled containers on startup rather than adopting/deleting them", async () => {
    const run = vi.fn().mockResolvedValue({ stdout: "existing-container" });
    const url = await start({ run });
    expect((await fetch(`${url}/health`, { headers })).status).toBe(503);
    expect(run.mock.calls.some((c) => c[1][0] === "create")).toBe(false);
  });
});
