// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ImagesToPdfSettings from "@/components/tools/images-to-pdf/settings";
import {
  PDF_EMBED_DPI_OPTIONS,
  defaultSettings,
  type ConvertSettings,
  type PdfMakeSettings,
} from "@/lib/tools/image-convert";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(overrides: Partial<PdfMakeSettings> = {}) {
  const base = defaultSettings("images-to-pdf");
  const settings: ConvertSettings = {
    ...base,
    pdfMake: { ...base.pdfMake, ...overrides },
  };
  const onChange = vi.fn();
  const utils = render(
    <ImagesToPdfSettings settings={settings} onChange={onChange} />,
  );
  return { onChange, settings, ...utils };
}

const latest = (onChange: ReturnType<typeof vi.fn>): PdfMakeSettings =>
  onChange.mock.calls.at(-1)![0].pdfMake as PdfMakeSettings;

describe("page setup", () => {
  it("offers every requested paper size", () => {
    setup();
    const select = screen.getByLabelText("PDF page size");
    for (const id of ["a4", "a3", "a5", "letter", "custom"])
      expect(select).toContainHTML(`value="${id}"`);
  });

  it("states the real millimetres of the chosen paper", () => {
    setup({ pageSize: "a4" });
    // Scoped to the field hint: the A4 <option> label carries the same text.
    const field = screen
      .getByLabelText("PDF page size")
      .closest(".converter-field")!;
    expect(field.querySelector(".converter-hint")).toHaveTextContent(
      "210 × 297 mm",
    );

    cleanup();
    setup({ pageSize: "a5" });
    const a5 = screen
      .getByLabelText("PDF page size")
      .closest(".converter-field")!;
    expect(a5.querySelector(".converter-hint")).toHaveTextContent(
      "148 × 210 mm",
    );
  });

  it("switches the paper size through to the settings", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("PDF page size"), {
      target: { value: "a3" },
    });
    expect(latest(onChange).pageSize).toBe("a3");
  });

  it("offers portrait and landscape", () => {
    setup();
    const select = screen.getByLabelText("Page orientation");
    expect(select).toContainHTML('value="portrait"');
    expect(select).toContainHTML('value="landscape"');
  });

  it("keeps custom dimensions hidden until a custom size is chosen", () => {
    const preset = setup({ pageSize: "a4" });
    expect(
      preset.queryByLabelText("Custom page width in millimetres"),
    ).not.toBeInTheDocument();
    cleanup();

    const custom = setup({ pageSize: "custom" });
    expect(
      custom.getByLabelText("Custom page width in millimetres"),
    ).toBeInTheDocument();
    expect(
      custom.getByLabelText("Custom page height in millimetres"),
    ).toBeInTheDocument();
  });

  it("writes a custom width through to the settings", () => {
    const { onChange } = setup({ pageSize: "custom", customWidthMm: 200 });
    fireEvent.change(
      screen.getByLabelText("Custom page width in millimetres"),
      { target: { value: "120" } },
    );
    expect(latest(onChange).customWidthMm).toBe(120);
  });

  it("sets the margin applied to every page", () => {
    const { onChange } = setup({ marginMm: 10 });
    fireEvent.change(screen.getByLabelText("Page margin in millimetres"), {
      target: { value: "25" },
    });
    expect(latest(onChange).marginMm).toBe(25);
  });
});

describe("image placement", () => {
  it("offers contain, cover and fill", () => {
    setup();
    const select = screen.getByLabelText("Image fit on page");
    for (const id of ["contain", "cover", "fill"])
      expect(select).toContainHTML(`value="${id}"`);
  });

  it("explains what the chosen placement will do", () => {
    const contain = setup({ fit: "contain" });
    expect(
      contain.getByText("Whole image visible, centred with equal margins."),
    ).toBeInTheDocument();
    cleanup();

    const cover = setup({ fit: "cover" });
    expect(
      cover.getByText("Fills the page area and centre-crops any overflow."),
    ).toBeInTheDocument();
    cleanup();

    const fill = setup({ fit: "fill" });
    expect(
      fill.getByText("Stretches to the page area; the aspect ratio changes."),
    ).toBeInTheDocument();
  });

  it("writes the placement through to the settings", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Image fit on page"), {
      target: { value: "cover" },
    });
    expect(latest(onChange).fit).toBe("cover");
  });
});

describe("PDF output", () => {
  it("carries a page background colour in both forms", () => {
    const { onChange } = setup({ background: "#ffffff" });
    fireEvent.change(screen.getByLabelText("PDF background hex value"), {
      target: { value: "#00ff00" },
    });
    expect(latest(onChange).background).toBe("#00ff00");
  });

  it("sets the embedded image quality", () => {
    const { onChange } = setup({ imageQuality: 90 });
    fireEvent.change(screen.getByLabelText("Embedded image quality"), {
      target: { value: "60" },
    });
    expect(latest(onChange).imageQuality).toBe(60);
  });

  it("offers the requested DPI steps", () => {
    setup();
    const select = screen.getByLabelText("Embedded image resolution in DPI");
    for (const dpi of PDF_EMBED_DPI_OPTIONS)
      expect(select).toContainHTML(`value="${dpi}"`);
    // The user asked for 96, 150, 200 and 300 specifically.
    expect([...PDF_EMBED_DPI_OPTIONS]).toEqual([96, 150, 200, 300]);
  });

  it("says why 300 DPI is offered rather than leaving it unexplained", () => {
    setup();
    expect(
      screen.getByText(/300 DPI is the print standard/i),
    ).toBeInTheDocument();
  });

  it("carries a document title and file name", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("PDF document title"), {
      target: { value: "Holiday photos" },
    });
    expect(latest(onChange).title).toBe("Holiday photos");
    fireEvent.change(screen.getByLabelText("PDF file name"), {
      target: { value: "holiday.pdf" },
    });
    expect(latest(onChange).filename).toBe("holiday.pdf");
  });

  it("discloses that the output has no text layer", () => {
    setup();
    expect(screen.getByText(/no editable text layer/i)).toBeInTheDocument();
  });

  it("summarises the current settings as chips", () => {
    setup();
    const summary = screen.getByLabelText("Current settings summary");
    expect(summary.querySelectorAll(".converter-chip").length).toBeGreaterThan(
      2,
    );
  });
});

describe("collapsible settings", () => {
  it("renders both blocks as disclosures that start open", () => {
    const { container } = setup();
    const blocks = container.querySelectorAll("details.converter-block");
    // Page setup and PDF output.
    expect(blocks.length).toBe(2);
    for (const block of blocks) expect(block).toHaveAttribute("open");
  });

  it("keeps a heading inside each summary so the block stays labelled", () => {
    const { container } = setup();
    const summaries = container.querySelectorAll(
      "details.converter-block > summary",
    );
    expect(summaries.length).toBe(2);
    for (const summary of summaries)
      expect(summary.querySelector("h3")).not.toBeNull();
  });

  it("disables every control while a PDF is being written", () => {
    const base = defaultSettings("images-to-pdf");
    const { container } = render(
      <ImagesToPdfSettings settings={base} onChange={vi.fn()} disabled />,
    );
    const controls = container.querySelectorAll("select, input");
    expect(controls.length).toBeGreaterThan(4);
    for (const control of controls) expect(control).toBeDisabled();
  });
});
