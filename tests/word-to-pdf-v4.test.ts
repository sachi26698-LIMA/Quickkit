// Transport/policy tests use authored PDFs and mocked HTTP, NOT native rendering.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "@cantoo/pdf-lib";
import { Document, Packer, Paragraph } from "docx";
import { convert, engineAvailable } from "../lib/tools/word-to-pdf/engine";
import { prepareDocx } from "../lib/tools/word-to-pdf/docx";
import { buildFixture } from "../scripts/word-to-pdf-v4-fixtures.mjs";
import { unzipSync, strFromU8 } from "fflate";
import { defaults } from "../lib/tools/word-to-pdf/settings";
import {
  workerConfig,
  workerConfigured,
  renderWithPrivateWorker,
  privateWorkerAvailable,
  workerExportOptions,
} from "../lib/tools/word-to-pdf/private-worker";
import { exportFilter, jobArgs } from "../scripts/word-worker/policy.mjs";
const token = "test_only_not_a_real_secret_0123456789";
beforeEach(() => {
  vi.stubEnv("WORD_TO_PDF_ENABLED", "true");
  vi.stubEnv("WORD_TO_PDF_ENGINE", "worker");
  vi.stubEnv("WORD_TO_PDF_WORKER_URL", "https://private.invalid/");
  vi.stubEnv("WORD_TO_PDF_WORKER_TOKEN", token);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function pdf(pages = 2) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage();
  return await doc.save();
}
const upload = async () =>
  new Uint8Array(
    await Packer.toBuffer(
      new Document({
        sections: [
          { children: [new Paragraph("Transport test, not native fidelity")] },
        ],
      }),
    ),
  );
const signal = () => new AbortController().signal;
describe("private native worker transport", () => {
  it.each([
    "http://private.invalid/",
    "http://localhost/",
    "https://user:password@private.invalid/",
    "https://private.invalid/path",
    "https://private.invalid/?query=yes",
    "https://private.invalid/#hash",
    "file:///tmp/",
  ])("rejects unsafe configuration %s", (url) => {
    vi.stubEnv("WORD_TO_PDF_WORKER_URL", url);
    expect(() => workerConfig()).toThrow();
  });
  it("accepts explicit loopback HTTP and HTTPS only, token is required", () => {
    vi.stubEnv("WORD_TO_PDF_WORKER_URL", "http://127.0.0.1:8090/");
    expect(workerConfig().url.port).toBe("8090");
    vi.stubEnv("WORD_TO_PDF_WORKER_TOKEN", "");
    expect(workerConfigured()).toBe(true);
    expect(() => workerConfig()).toThrow(/credentials/);
  });
  it("fails closed on invalid credentials without local fallback", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("WORD_TO_PDF_WORKER_TOKEN", "too-short");
    expect(await engineAvailable()).toBe(false);
    await expect(
      convert(await upload(), defaults, signal(), () => {}),
    ).rejects.toThrow(/credentials/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires actual authenticated health protocol and isolation policy", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          protocol: 1,
          available: true,
          engine: "LibreOffice",
          isolated: true,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await privateWorkerAvailable()).toBe(true);
    expect(fetcher.mock.calls[0][0].pathname).toBe("/health");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: "error",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ available: true })),
    );
    expect(await privateWorkerAvailable()).toBe(false);
    fetcher.mockRejectedValue(new Error("offline"));
    expect(await privateWorkerAvailable()).toBe(false);
  });
  it("validates DOCX before forwarding and keeps base/final real PDF pipeline", async () => {
    const native = await pdf();
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Response(native, {
          headers: { "Content-Type": "application/pdf" },
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      convert(new Uint8Array([1, 2]), defaults, signal(), () => {}),
    ).rejects.toThrow(/DOCX/);
    expect(fetcher).not.toHaveBeenCalled();
    const result = await convert(
      await upload(),
      { ...defaults, pages: "2", header: "Actual overlay", numbering: true },
      signal(),
      () => {},
    );
    expect(result.pages).toBe(1);
    expect((await PDFDocument.load(result.source)).getPageCount()).toBe(2);
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(1);
    expect(Buffer.from(result.bytes).equals(Buffer.from(native))).toBe(false);
    expect(fetcher.mock.calls[0][1].headers["X-Quickkit-Export"]).toBe(
      JSON.stringify(
        workerExportOptions({
          ...defaults,
          pages: "2",
          header: "Actual overlay",
          numbering: true,
        }),
      ),
    );
  });
  it("retains the downstream page guard on worker output", async () => {
    const bytes = await pdf(1001);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Response(bytes, {
            headers: { "Content-Type": "application/pdf" },
          }),
      ),
    );
    await expect(
      convert(await upload(), defaults, signal(), () => {}),
    ).rejects.toThrow(/1000-page/);
  }, 120_000);
  it.each([429, 503, 302])(
    "does not retry/fallback on worker status %s",
    async (status) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response("private diagnostics must not leak", { status }),
        );
      vi.stubGlobal("fetch", fetcher);
      await expect(
        renderWithPrivateWorker(new Uint8Array(), defaults, signal()),
      ).rejects.toThrow(status === 429 ? /busy/ : /failed/);
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("bounds declared and streaming output and rejects non-PDF bytes", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    fetcher.mockResolvedValue(
      new Response("%PDF-", {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(51 * 1024 * 1024),
        },
      }),
    );
    await expect(
      renderWithPrivateWorker(new Uint8Array(), defaults, signal()),
    ).rejects.toThrow(/limit/);
    fetcher.mockResolvedValue(
      new Response("not PDF", {
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    await expect(
      renderWithPrivateWorker(new Uint8Array(), defaults, signal()),
    ).rejects.toThrow(/invalid PDF/);
    fetcher.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(50 * 1024 * 1024));
            c.enqueue(new Uint8Array(1));
            c.close();
          },
        }),
        { headers: { "Content-Type": "application/pdf" } },
      ),
    );
    await expect(
      renderWithPrivateWorker(new Uint8Array(), defaults, signal()),
    ).rejects.toThrow(/limit/);
  });
  it("propagates cancellation to fetch without background retry", async () => {
    const controller = new AbortController();
    const fetcher = vi
      .fn()
      .mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          ),
      );
    vi.stubGlobal("fetch", fetcher);
    const pending = renderWithPrivateWorker(
      new Uint8Array(),
      defaults,
      controller.signal,
    );
    controller.abort();
    await expect(pending).rejects.toThrow(/cancelled/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
describe("fixed native container policy (not a sandbox execution test)", () => {
  it("pins image and resource/privilege boundaries with no mounts/secrets", () => {
    const args = jobArgs(
      `sha256:${"a".repeat(64)}`,
      "quickkit-word-12345678-1234-1234-1234-123456789012",
      exportFilter(workerExportOptions(defaults)),
    );
    for (const flag of [
      "--network=none",
      "--read-only",
      "--user=65532:65532",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges:true",
      "--memory=1g",
      "--memory-swap=1g",
      "--cpus=1",
      "--pids-limit=128",
      "--log-driver=none",
      "--pull=never",
      "--cgroupns=private",
    ])
      expect(args).toContain(flag);
    expect(
      args.some((a) =>
        a.startsWith("--tmpfs=/work:rw,noexec,nosuid,nodev,size=512m"),
      ),
    ).toBe(true);
    expect(args.join(" ")).not.toMatch(
      /--privileged|--volume|--mount|--env|--publish|docker.sock/,
    );
    expect(() => jobArgs("mutable:latest", "bad", "{}")).toThrow();
  });
  it("restricts export options to typed allowlist, not arbitrary CLI arguments", () => {
    expect(() =>
      exportFilter({ ...workerExportOptions(defaults), extra: "--privileged" }),
    ).toThrow();
    expect(() =>
      exportFilter({ ...workerExportOptions(defaults), jpegQuality: 101 }),
    ).toThrow();
    expect(() =>
      exportFilter({ ...workerExportOptions(defaults), maxDpi: NaN }),
    ).toThrow();
    expect(
      JSON.parse(exportFilter(workerExportOptions(defaults))).UseTaggedPDF
        .value,
    ).toBe("false");
  });
});

describe("synthetic native inputs (not native output)", () => {
  it("keeps complex cached-chart/image/table/mixed-section fixture inside shared validation", async () => {
    const bytes = await buildFixture(4, true);
    const prepared = prepareDocx(bytes, defaults);
    const files = unzipSync(prepared);
    const xml = strFromU8(files["word/document.xml"]);
    expect(xml).toContain("rIdQuickkitChart");
    expect(xml).toContain("landscape");
    expect(xml).toContain("Quickkit Operator Test Font");
    expect(xml).toContain("gridSpan");
    expect(Object.keys(files).some((k) => k.startsWith("word/media/"))).toBe(
      true,
    );
    expect(files["word/charts/chart1.xml"]).toBeDefined();
    expect(Object.keys(files).some((k) => k.includes("embeddings/"))).toBe(
      false,
    );
  });
  it.each([100, 500, 1000])(
    "validates %s-page-intent DOCX without claiming actual rendered count",
    async (pages) => {
      const files = unzipSync(prepareDocx(await buildFixture(pages), defaults));
      expect(
        strFromU8(files["word/document.xml"]).match(/w:type="page"/g),
      ).toHaveLength(pages - 1);
    },
  );
});
