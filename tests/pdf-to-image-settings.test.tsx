// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PdfToImageSettings from "@/components/tools/pdf-to-image/settings";
import {
  PAGE_RENDER_DPI,
  defaultSettings,
  type ConvertSettings,
  type PdfRenderSettings,
} from "@/lib/tools/image-convert";
import type { CanvasSupport } from "@/lib/tools/image-convert-runner";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const WEBP_OK: CanvasSupport = {
  jpeg: true,
  png: true,
  webp: true,
  avif: true,
};
const WEBP_MISSING: CanvasSupport = {
  jpeg: true,
  png: true,
  webp: false,
  avif: false,
};

function setup(
  overrides: Partial<PdfRenderSettings> = {},
  options: {
    support?: CanvasSupport | null;
    pageCount?: number;
    disabled?: boolean;
  } = {},
) {
  const base = defaultSettings("pdf-to-image");
  const settings: ConvertSettings = {
    ...base,
    pdfRender: { ...base.pdfRender, ...overrides },
  };
  const onChange = vi.fn();
  const utils = render(
    <PdfToImageSettings
      settings={settings}
      onChange={onChange}
      support={options.support === undefined ? WEBP_OK : options.support}
      disabled={options.disabled}
      pageCount={options.pageCount}
    />,
  );
  return { onChange, settings, ...utils };
}

const latest = (onChange: ReturnType<typeof vi.fn>): PdfRenderSettings =>
  onChange.mock.calls.at(-1)![0].pdfRender as PdfRenderSettings;

describe("output format", () => {
  it("offers JPG, PNG and WEBP", () => {
    setup();
    const select = screen.getByLabelText("Page image format");
    for (const id of ["jpeg", "png", "webp"])
      expect(select).toContainHTML(`value="${id}"`);
  });

  it("writes the chosen format through to the settings", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Page image format"), {
      target: { value: "png" },
    });
    expect(latest(onChange).format).toBe("png");
  });

  it("disables WEBP rather than offering a format the browser cannot encode", () => {
    setup({}, { support: WEBP_MISSING });
    const webp = screen
      .getByLabelText("Page image format")
      .querySelector('option[value="webp"]')!;
    expect(webp).toBeDisabled();
    expect(webp.textContent).toContain("not supported in this browser");
  });

  it("marks quality as unused for a lossless format", () => {
    setup({ format: "png" });
    expect(screen.getByText(/Quality \(not used\)/)).toBeInTheDocument();
    expect(screen.getByLabelText("Page image quality")).toBeDisabled();
    expect(
      screen.getByText("PNG is lossless, so quality does not apply."),
    ).toBeInTheDocument();
  });

  it("keeps quality live for a lossy format", () => {
    const { onChange } = setup({ format: "jpeg", quality: 85 });
    const slider = screen.getByLabelText("Page image quality");
    expect(slider).toBeEnabled();
    fireEvent.change(slider, { target: { value: "60" } });
    expect(latest(onChange).quality).toBe(60);
  });
});

describe("resolution", () => {
  it("offers the requested DPI presets", () => {
    setup();
    const presets = screen.getByRole("group", { name: "DPI presets" });
    for (const dpi of PAGE_RENDER_DPI)
      expect(
        within(presets).getByRole("button", { name: String(dpi) }),
      ).toBeInTheDocument();
    expect([...PAGE_RENDER_DPI]).toEqual([96, 150, 200, 300, 400, 600]);
  });

  it("sets the resolution from a preset button", () => {
    const { onChange } = setup({ dpi: 96 });
    fireEvent.click(
      within(screen.getByRole("group", { name: "DPI presets" })).getByRole(
        "button",
        { name: "300" },
      ),
    );
    expect(latest(onChange).dpi).toBe(300);
  });

  it("sets the resolution from the slider and states it", () => {
    const { onChange } = setup({ dpi: 150 });
    fireEvent.change(screen.getByLabelText("Output resolution in DPI"), {
      target: { value: "200" },
    });
    expect(latest(onChange).dpi).toBe(200);
  });

  it("explains the trade-off rather than leaving DPI unexplained", () => {
    setup({ dpi: 300 });
    expect(
      screen.getByText(/higher values produce larger, sharper pages/i),
    ).toBeInTheDocument();
  });
});

/** The hint under "Pages to export" — the summary chip repeats its text. */
const rangeHint = () =>
  screen
    .getByLabelText("Pages to export")
    .closest(".converter-field")!
    .querySelector(".converter-hint")!;

describe("page range", () => {
  it("resolves a range against the real page count", () => {
    setup({ range: "1-3, 5" }, { pageCount: 10 });
    expect(rangeHint()).toHaveTextContent("4 of 10 pages selected");
    expect(screen.getByLabelText("Pages to export")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("says when the range covers the whole document", () => {
    setup({ range: "" }, { pageCount: 7 });
    expect(rangeHint()).toHaveTextContent("All 7 pages");
  });

  it("flags an invalid range instead of letting it fail silently", () => {
    setup({ range: "99" }, { pageCount: 5 });
    const input = screen.getByLabelText("Pages to export");
    expect(input).toHaveAttribute("aria-invalid", "true");
    // The parser's own complaint is surfaced, not a generic message.
    expect(input.closest(".converter-field")!.textContent).toMatch(
      /out of range|invalid|between/i,
    );
  });

  it("does not guess a page count before the PDF is read", () => {
    setup({ range: "1-3" });
    expect(screen.getByText(/Leave blank for every page/i)).toBeInTheDocument();
  });

  it("writes the range through to the settings", () => {
    const { onChange } = setup({ range: "" });
    fireEvent.change(screen.getByLabelText("Pages to export"), {
      target: { value: "2-4" },
    });
    expect(latest(onChange).range).toBe("2-4");
  });
});

describe("background and naming", () => {
  it("carries a page background colour in both forms", () => {
    const { onChange } = setup({ background: "#ffffff" });
    fireEvent.change(screen.getByLabelText("Page background hex value"), {
      target: { value: "#112233" },
    });
    expect(latest(onChange).background).toBe("#112233");
  });

  it("carries a custom base name and suffix for page numbering", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Custom base name for pages"), {
      target: { value: "brochure" },
    });
    expect((onChange.mock.calls.at(-1)![0] as ConvertSettings).baseName).toBe(
      "brochure",
    );
    fireEvent.change(screen.getByLabelText("Page file name suffix"), {
      target: { value: "print" },
    });
    expect((onChange.mock.calls.at(-1)![0] as ConvertSettings).suffix).toBe(
      "print",
    );
  });

  it("summarises the current settings as chips", () => {
    setup({ format: "jpeg", dpi: 150, quality: 80 }, { pageCount: 4 });
    const summary = screen.getByLabelText("Current settings summary");
    expect(summary).toHaveTextContent("JPG");
    expect(summary).toHaveTextContent("150 DPI");
    expect(summary).toHaveTextContent("q80");
    expect(summary).toHaveTextContent("All 4 pages");
  });
});

describe("collapsible settings", () => {
  it("renders the block as a disclosure that starts open", () => {
    const { container } = setup();
    const blocks = container.querySelectorAll("details.converter-block");
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toHaveAttribute("open");
  });

  it("keeps a heading inside the summary so the block stays labelled", () => {
    const { container } = setup();
    const summary = container.querySelector(
      "details.converter-block > summary",
    )!;
    expect(summary.querySelector("h3")).not.toBeNull();
  });

  it("disables every control while pages are rendering", () => {
    const base = defaultSettings("pdf-to-image");
    const { container } = render(
      <PdfToImageSettings
        settings={base}
        onChange={vi.fn()}
        support={WEBP_OK}
        disabled
      />,
    );
    const controls = container.querySelectorAll("select, input, button");
    expect(controls.length).toBeGreaterThan(4);
    for (const control of controls) expect(control).toBeDisabled();
  });
});
