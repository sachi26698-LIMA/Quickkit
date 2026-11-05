// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Document, Packer, Paragraph } from "docx";
import { PDFDocument } from "@cantoo/pdf-lib";
import WordToPdf from "../components/tools/word-to-pdf";

/**
 * Browser-level checks for the V5 workspace states that a headless Node test
 * cannot reach: engine identity, upload validation, live stage reporting,
 * fidelity notes and the export gate. PDF.js rendering itself is covered by the
 * Playwright suite (a real browser is required for canvas).
 */
const ENGINE = {
  available: true,
  engine: "builtin",
  label: "QUICKKIT DOCX renderer (built-in)",
  native: false,
  fidelity: "quickkit-renderer",
  notes: ["Pure-JS conversion with embedded Noto fonts."],
  maxPages: 1000,
};

function streamOf(events: object[]) {
  const body = events.map((event) => JSON.stringify(event) + "\n").join("");
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
}

async function docxFile(name = "report.docx") {
  const bytes = await Packer.toBuffer(
    new Document({
      sections: [{ children: [new Paragraph("Hello QUICKKIT")] }],
    }),
  );
  return new File([new Uint8Array(bytes)], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

async function pdfBase64(pages = 2) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) pdf.addPage([595, 842]);
  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockServer(post: () => Promise<Response> | Response) {
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (!url.includes("/api/word-to-pdf"))
        throw new Error(`unexpected ${url}`);
      if (init?.method === "POST") return post();
      return new Response(JSON.stringify(ENGINE), {
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("Word to PDF V5 workspace", () => {
  it("shows the real engine identity instead of a disabled placeholder", async () => {
    mockServer(() => new Response("{}", { status: 500 }));
    render(<WordToPdf />);
    expect(
      await screen.findByText("QUICKKIT DOCX renderer (built-in)"),
    ).toBeInTheDocument();
    expect(screen.getByText(/up to 1,000 pages/)).toBeInTheDocument();
    expect(
      screen.getByText(/Built-in DOCX renderer · selectable text · real PDF/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Convert documents" }),
    ).toBeDisabled();
  });

  it("validates the local file before enabling conversion", async () => {
    const fetcher = mockServer(() => new Response("{}", { status: 500 }));
    render(<WordToPdf />);
    const input = screen.getByLabelText(
      "Choose DOCX files",
    ) as HTMLInputElement;
    const file = await docxFile();
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      await screen.findByText(/Valid DOCX package · not yet uploaded/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Page count after conversion/)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects a password-protected/legacy binary before any upload", async () => {
    const fetcher = mockServer(() => new Response("{}", { status: 500 }));
    render(<WordToPdf />);
    const input = screen.getByLabelText(
      "Choose DOCX files",
    ) as HTMLInputElement;
    const locked = new File(
      [new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])],
      "locked.docx",
    );
    Object.defineProperty(input, "files", { value: [locked] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      await screen.findByText(/password-protected or legacy binary Word file/i),
    ).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports real conversion stages and surfaces engine warnings", async () => {
    const base = await pdfBase64(2);
    mockServer(
      () =>
        new Response(
          streamOf([
            { stage: "Reading DOCX package" },
            { stage: "Rendering document pages", done: 3, total: 10 },
            { stage: "Rendering document pages", done: 10, total: 10 },
            {
              result: base,
              pages: 2,
              base: true,
              engine: "builtin",
              native: false,
              warnings: ["Footnotes are not rendered by the built-in engine."],
            },
          ]),
          { headers: { "Content-Type": "application/x-ndjson" } },
        ),
    );
    const { container } = render(<WordToPdf />);
    const input = screen.getByLabelText(
      "Choose DOCX files",
    ) as HTMLInputElement;
    const file = await docxFile();
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await screen.findByText(/Valid DOCX package/);
    const consent = screen.getByLabelText(
      /I agree to upload/,
    ) as HTMLInputElement;
    consent.click();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Convert documents" }),
      ).toBeEnabled(),
    );
    screen.getByRole("button", { name: "Convert documents" }).click();
    await waitFor(
      () =>
        expect(
          screen.getByText(/Completed with 1 fidelity note/),
        ).toBeInTheDocument(),
      { timeout: 6000 },
    );
    expect(
      screen.getByText("Footnotes are not rendered by the built-in engine."),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("2 output pages");
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) =>
          button.textContent?.includes("Download") && !button.disabled,
      ),
    ).toBe(true);
  });

  it("shows the server refusal verbatim and keeps export locked", async () => {
    mockServer(
      () =>
        new Response(
          streamOf([
            { stage: "Validating DOCX package" },
            { error: "This DOCX contains macros. Remove them and retry." },
          ]),
          { headers: { "Content-Type": "application/x-ndjson" } },
        ),
    );
    render(<WordToPdf />);
    const input = screen.getByLabelText(
      "Choose DOCX files",
    ) as HTMLInputElement;
    const file = await docxFile();
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await screen.findByText(/Valid DOCX package/);
    (screen.getByLabelText(/I agree to upload/) as HTMLInputElement).click();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Convert documents" }),
      ).toBeEnabled(),
    );
    screen.getByRole("button", { name: "Convert documents" }).click();
    await waitFor(
      () => expect(screen.getByText(/contains macros/)).toBeInTheDocument(),
      { timeout: 6000 },
    );
    expect(
      screen.getByRole("button", { name: "Download all ZIP (0)" }),
    ).toBeDisabled();
  });
});
