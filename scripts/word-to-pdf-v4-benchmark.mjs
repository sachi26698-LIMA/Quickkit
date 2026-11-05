// OPERATOR ONLY. Real private worker; never mock a native success or upload silently.
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { buildFixture } from "./word-to-pdf-v4-fixtures.mjs";
const output =
  process.env.WORD_TO_PDF_BENCHMARK_REPORT ||
  "test-results/word-to-pdf-v4-native.json";
const report = {
  date: new Date().toISOString(),
  status: "BLOCKED",
  reason: null,
  kind: "Real private-worker DOCX conversion only; no browser/native fallback",
  cap: 100,
  results: ["complex", 100, 500, 1000].map((input) => ({
    input,
    status: "NOT_RUN",
    wallMs: null,
    outputBytes: null,
    actualPages: null,
    elapsedSeconds: null,
    userSeconds: null,
    systemSeconds: null,
    peakRssKiB: null,
    containerPeakBytes: null,
    containerCpuUsec: null,
    previewMs: null,
    editingMs: null,
  })),
  notes: [
    "500/1000 are raw native capacity probes, not supported browser editing sizes. App cap remains 100.",
    "peakRssKiB is maximum child-process RSS, NOT simultaneous aggregate job RAM. containerPeakBytes includes tmpfs and all processes when cgroup v2 memory.peak is readable.",
    "CPU usec is container usage observed after native conversion; wallMs includes upload, startup and cleanup. Native elapsedSeconds excludes container startup.",
    "Browser preview/edit metrics require a separate consented real-native browser run and are never inferred from PDF parse time.",
  ],
};
try {
  if (
    !process.argv.includes("--isolated-host") ||
    !process.argv.includes("--consent-server-processing")
  )
    throw new Error(
      "Explicit --isolated-host --consent-server-processing flags required; no upload attempted.",
    );
  const url = new URL(process.env.WORD_TO_PDF_WORKER_URL || "");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error(
      "Use an operator-owned private HTTPS or loopback worker root URL.",
    );
  const token = process.env.WORD_TO_PDF_WORKER_TOKEN || "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token))
    throw new Error("Private worker token is not configured.");
  const auth = { Authorization: `Bearer ${token}` };
  const health = await fetch(new URL("health", url), {
    headers: auth,
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!health.ok) throw new Error("Real native worker health probe failed.");
  const info = await health.json();
  if (
    info.protocol !== 1 ||
    !info.available ||
    !info.isolated ||
    info.engine !== "LibreOffice"
  )
    throw new Error("Native worker unavailable; no upload attempted.");
  report.status = "RUNNING";
  for (const item of report.results) {
    const input = await buildFixture(
      item.input === "complex" ? 4 : item.input,
      item.input === "complex",
    );
    const start = performance.now();
    try {
      const response = await fetch(new URL("convert", url), {
        method: "POST",
        headers: {
          ...auth,
          "Content-Type": "application/octet-stream",
          "X-Quickkit-Export": JSON.stringify({
            lossless: false,
            jpegQuality: 90,
            reduceResolution: false,
            maxDpi: 300,
            tagged: false,
          }),
        },
        body: input,
        redirect: "error",
        signal: AbortSignal.timeout(140000),
      });
      if (
        !response.ok ||
        response.headers.get("content-type") !== "application/pdf"
      )
        throw new Error(`Native worker HTTP ${response.status}`);
      const reader = response.body.getReader(),
        chunks = [];
      let length = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 50 * 1024 * 1024)
            throw new Error("Native output above 50 MiB");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = Buffer.concat(chunks);
      item.wallMs = performance.now() - start;
      item.outputBytes = bytes.length;
      item.actualPages = (await PDFDocument.load(bytes)).getPageCount();
      const header = response.headers.get("x-quickkit-metrics");
      if (header && header.length < 2048) {
        const raw = JSON.parse(Buffer.from(header, "base64url").toString());
        for (const key of [
          "elapsedSeconds",
          "userSeconds",
          "systemSeconds",
          "peakRssKiB",
          "containerPeakBytes",
          "containerCpuUsec",
        ])
          if (
            typeof raw[key] === "number" &&
            Number.isFinite(raw[key]) &&
            raw[key] >= 0
          )
            item[key] = raw[key];
      }
      item.status = "NATIVE_CONVERTED_NOT_FIDELITY_CERTIFIED";
      if (item.input === "complex" && process.argv.includes("--retain-demo")) {
        await mkdir("test-results", { recursive: true });
        await writeFile(
          "test-results/word-to-pdf-v4-real-native-demo.pdf",
          bytes,
        );
      }
    } catch {
      item.wallMs = performance.now() - start;
      item.status = "FAILED_NATIVE_JOB";
    }
  }
  report.status = report.results.every(
    (r) => r.status === "NATIVE_CONVERTED_NOT_FIDELITY_CERTIFIED",
  )
    ? "NATIVE_CONVERSIONS_RECORDED_REVIEW_REQUIRED"
    : "NATIVE_FAILURES";
} catch (error) {
  report.reason = error.message;
}
await mkdir(new URL(".", new URL(output, `file://${process.cwd()}/`)), {
  recursive: true,
});
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  `${report.status}; report: ${output}. No native/browser fidelity or production-readiness claim.`,
);
if (report.status === "BLOCKED") process.exitCode = 2;
else if (report.status === "NATIVE_FAILURES") process.exitCode = 1;
