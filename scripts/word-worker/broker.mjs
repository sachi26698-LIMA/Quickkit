// Dedicated private host only. Never mount Docker's socket in the public web app.
import http from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { limits, exportFilter, jobArgs } from "./policy.mjs";
const exec = promisify(execFile);
export function createBroker({
  token,
  image,
  docker = "/usr/bin/docker",
  dockerHost = process.env.DOCKER_HOST,
  run = exec,
  launch = spawn,
}) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token || ""))
    throw new Error(
      "Set a random 32-128 character URL-safe WORD_WORKER_TOKEN.",
    );
  jobArgs(image, `quickkit-word-${randomUUID()}`, "{}");
  if (dockerHost && !/^unix:\/\/\/[A-Za-z0-9_./-]+$/.test(dockerHost))
    throw new Error("Only a local Unix Docker socket is supported.");
  const env = {
    PATH: "/usr/bin:/bin",
    DOCKER_CONFIG: "/var/empty/quickkit",
    ...(dockerHost ? { DOCKER_HOST: dockerHost } : {}),
  };
  let busy = false,
    quarantined = false,
    verified = false,
    reconciled = false;
  const command = (args, timeout = 10000) =>
    run(docker, args, { env, timeout, maxBuffer: 8192 });
  async function create(name, filter) {
    try {
      if (!reconciled) {
        const { stdout } = await command([
          "ps",
          "--all",
          "--quiet",
          "--filter",
          "label=quickkit.word-worker=1",
        ]);
        if (stdout.trim())
          throw new Error("Orphan jobs require operator reconciliation");
        reconciled = true;
      }
      // Never start native parsing until create has definitely completed. An ambiguous
      // daemon create cannot be disproved by a single empty ps result: quarantine it.
      await command(["create", ...jobArgs(image, name, filter).slice(1)]);
    } catch {
      quarantined = true;
      throw new Error(
        "Container creation unconfirmed; operator reconciliation required.",
      );
    }
  }
  async function cleanup(name) {
    // Killing the CLI alone does NOT kill daemon-owned containers. Always force-remove,
    // then independently confirm absence. A failed confirmation disables future jobs.
    try {
      await command(["rm", "--force", name]);
    } catch {
      /* --rm may already have removed it */
    }
    try {
      const { stdout } = await command([
        "ps",
        "--all",
        "--quiet",
        "--filter",
        `name=^/${name}$`,
      ]);
      if (stdout.trim()) throw new Error("still present");
    } catch {
      quarantined = true;
      throw new Error("Container cleanup unconfirmed; broker quarantined.");
    }
  }
  async function probe() {
    if (quarantined) return false;
    // Actual pinned image execution, under the SAME policy as conversion. No mock version.
    const name = `quickkit-word-${randomUUID()}`;
    try {
      await create(name, "--version");
      const { stdout } = await command(["start", "--attach", name], 15000);
      verified = /^LibreOffice\s+[0-9]/.test(stdout.trim());
      return verified;
    } catch {
      verified = false;
      return false;
    } finally {
      await cleanup(name);
    }
  }
  async function render(input, filter, signal) {
    const name = `quickkit-word-${randomUUID()}`;
    let child,
      timer,
      removeAbort,
      failed = false;
    try {
      signal.throwIfAborted();
      await create(name, filter);
      signal.throwIfAborted();
      return await new Promise((resolve, reject) => {
        let settled = false,
          size = 0,
          errSize = 0;
        const chunks = [],
          errors = [];
        const stop = (error) => {
          if (settled) return;
          settled = true;
          failed = true;
          child?.kill("SIGKILL");
          reject(error);
        };
        child = launch(docker, ["start", "--attach", "--interactive", name], {
          env,
          stdio: ["pipe", "pipe", "pipe"],
        });
        const abort = () => stop(new Error("Cancelled"));
        removeAbort = () => signal.removeEventListener("abort", abort);
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) {
          abort();
          return;
        }
        timer = setTimeout(
          () => stop(new Error("Native deadline exceeded")),
          limits.deadlineMs,
        );
        child.on("error", () => stop(new Error("Container runtime failed")));
        child.stdin.on("error", () =>
          stop(new Error("Container input failed")),
        );
        child.stdout.on("data", (chunk) => {
          size += chunk.length;
          if (size > limits.output) {
            stop(new Error("PDF exceeds output limit"));
            return;
          }
          chunks.push(chunk);
        });
        child.stderr.on("data", (chunk) => {
          errSize += chunk.length;
          if (errSize > 8192) {
            stop(new Error("Unexpected worker diagnostics"));
            return;
          }
          errors.push(chunk);
        });
        child.on("close", (code) => {
          if (settled) return;
          if (code !== 0 || size < 5) {
            stop(new Error("Native job failed"));
            return;
          }
          const pdf = Buffer.concat(chunks);
          if (pdf.subarray(0, 5).toString() !== "%PDF-") {
            stop(new Error("Invalid native PDF"));
            return;
          }
          let metrics = null;
          const match = Buffer.concat(errors)
            .toString()
            .match(/^QUICKKIT_METRICS (\{[^\n]+\})$/m);
          if (match) {
            try {
              const raw = JSON.parse(match[1]);
              const keys = [
                "elapsedSeconds",
                "userSeconds",
                "systemSeconds",
                "peakRssKiB",
                "containerPeakBytes",
                "containerCpuUsec",
              ];
              metrics = Object.fromEntries(
                keys.map((k) => [
                  k,
                  typeof raw[k] === "number" &&
                  Number.isFinite(raw[k]) &&
                  raw[k] >= 0
                    ? raw[k]
                    : null,
                ]),
              );
            } catch {
              /* metrics unavailable, never substitute zero */
            }
          }
          settled = true;
          resolve({ pdf, metrics });
        });
        child.stdin.end(input);
      });
    } finally {
      clearTimeout(timer);
      removeAbort?.();
      // Retry removal after the CLI has closed: closes a run/create race on cancellation.
      if (
        failed &&
        child &&
        child.exitCode === null &&
        child.signalCode === null
      ) {
        await new Promise((resolve) => {
          const wait = setTimeout(resolve, 2000);
          child.once("close", () => {
            clearTimeout(wait);
            resolve();
          });
        });
      }
      await cleanup(name);
    }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const send = (status, data) => {
      if (!res.destroyed) {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      }
    };
    const auth = req.headers.authorization || "",
      expected = `Bearer ${token}`;
    if (
      Buffer.byteLength(auth) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
    ) {
      send(401, { error: "Unauthorized" });
      req.resume();
      return;
    }
    if (quarantined) {
      send(503, {
        error: "Worker quarantined; operator reconciliation required",
      });
      req.resume();
      return;
    }
    if (req.url === "/health" && req.method === "GET") {
      if (busy) {
        send(200, {
          protocol: 1,
          available: verified,
          isolated: true,
          engine: "LibreOffice",
          busy: true,
        });
        return;
      }
      busy = true;
      try {
        const available = await probe();
        send(available ? 200 : 503, {
          protocol: 1,
          available,
          isolated: true,
          engine: "LibreOffice",
        });
      } catch {
        send(503, { available: false });
      } finally {
        busy = false;
      }
      return;
    }
    if (req.url !== "/convert" || req.method !== "POST") {
      send(404, { error: "Not found" });
      req.resume();
      return;
    }
    if (busy) {
      send(429, { error: "Worker busy; retry explicitly" });
      req.resume();
      return;
    }
    let filter;
    try {
      if (
        req.headers["content-type"] !== "application/octet-stream" ||
        String(req.headers["x-quickkit-export"] || "").length > 1024
      )
        throw new Error();
      filter = exportFilter(JSON.parse(req.headers["x-quickkit-export"] || ""));
    } catch {
      send(400, { error: "Invalid job options" });
      req.resume();
      return;
    }
    if (Number(req.headers["content-length"]) > limits.input) {
      send(413, { error: "Input too large" });
      req.resume();
      return;
    }
    busy = true;
    const controller = new AbortController();
    req.on("aborted", () => controller.abort());
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limits.input) {
          send(413, { error: "Input too large" });
          req.destroy();
          return;
        }
        chunks.push(chunk);
      }
      const input = Buffer.concat(chunks);
      if (input.length < 4 || input.readUInt32LE(0) !== 0x04034b50) {
        send(400, { error: "DOCX ZIP required" });
        return;
      }
      // The public app performs full prepareDocx validation. ZIP magic here is not a
      // substitute: this broker is private and authenticated; its parser is isolated.
      const { pdf, metrics } = await render(input, filter, controller.signal);
      if (!res.destroyed) {
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Length": pdf.length,
          ...(metrics
            ? {
                "X-Quickkit-Metrics": Buffer.from(
                  JSON.stringify(metrics),
                ).toString("base64url"),
              }
            : {}),
        });
        res.end(pdf);
      }
    } catch {
      send(503, {
        error: quarantined
          ? "Worker quarantined; cleanup unconfirmed"
          : "Native job failed or cancelled",
      });
    } finally {
      busy = false;
    }
  });
  server.headersTimeout = 10000;
  server.requestTimeout = 30000;
  server.keepAliveTimeout = 5000;
  server.maxConnections = 16;
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createBroker({
    token: process.env.WORD_WORKER_TOKEN,
    image: process.env.WORD_WORKER_IMAGE,
  });
  // Keep behind a private TLS reverse proxy/firewall, never a public endpoint.
  server.listen(Number(process.env.WORD_WORKER_PORT || 8090), "127.0.0.1", () =>
    console.error(
      "Private Word worker listening on loopback; native image validation pending health probe.",
    ),
  );
}
