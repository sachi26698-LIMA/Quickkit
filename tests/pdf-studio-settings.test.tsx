// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import PdfStudioSettings from "@/components/tools/pdf-studio/settings";
import { defaultSettings } from "@/lib/tools/image-convert";

function setup(overrides: Partial<ReturnType<typeof defaultSettings>> = {}) {
  const onChange = vi.fn();
  const settings = { ...defaultSettings("pdf-studio"), ...overrides };
  render(
    <PdfStudioSettings
      settings={settings}
      onChange={onChange}
      studioSummary={null}
      studioProblem={null}
    />,
  );
  return { onChange, settings };
}

/** The select that picks merge / extract / split / compress. */
function actionSelect() {
  return screen.getByLabelText("PDF studio action") as HTMLSelectElement;
}

describe("PdfStudioSettings", () => {
  afterEach(cleanup);

  it("offers exactly the four documented actions", () => {
    setup();
    const options = [...actionSelect().options].map((option) => option.value);
    expect(options).toEqual(["merge", "extract", "split", "compress"]);
  });

  it("explains the selected action rather than leaving it opaque", () => {
    setup();
    expect(screen.getByText(/single document/i)).toBeTruthy();
  });

  it("hides the range field for merge, where a range would mean nothing", () => {
    setup();
    expect(screen.queryByLabelText("Page ranges")).toBeNull();
  });

  it("shows the range field for extract and split", () => {
    for (const action of ["extract", "split"] as const) {
      const { unmount } = render(
        <PdfStudioSettings
          settings={{
            ...defaultSettings("pdf-studio"),
            studio: { ...defaultSettings("pdf-studio").studio, action },
          }}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByLabelText("Page ranges")).toBeTruthy();
      unmount();
    }
  });

  it("shows compression quality only for compress", () => {
    setup();
    expect(screen.queryByLabelText("PDF compression quality")).toBeNull();

    render(
      <PdfStudioSettings
        settings={{
          ...defaultSettings("pdf-studio"),
          studio: {
            ...defaultSettings("pdf-studio").studio,
            action: "compress",
          },
        }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("PDF compression quality")).toBeTruthy();
  });

  it("tells the truth about how ranges apply across files", () => {
    setup({
      studio: { ...defaultSettings("pdf-studio").studio, action: "extract" },
    });
    const field = screen
      .getByLabelText("Page ranges")
      .closest(".converter-field")!;
    expect(
      within(field as HTMLElement).getByText(/apply to each file/i),
    ).toBeTruthy();
  });

  it("says PNG-style honesty about compression: text stays crisp", () => {
    render(
      <PdfStudioSettings
        settings={{
          ...defaultSettings("pdf-studio"),
          studio: {
            ...defaultSettings("pdf-studio").studio,
            action: "compress",
          },
        }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/text stays crisp/i)).toBeTruthy();
  });

  it("reports a change through onChange without mutating the prop", () => {
    const { onChange, settings } = setup();
    fireEvent.change(screen.getByLabelText("PDF document title"), {
      target: { value: "Quarterly report" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].studio.title).toBe("Quarterly report");
    // The incoming object must not be mutated in place.
    expect(settings.studio.title).toBe("");
  });

  it("reports an action change", () => {
    const { onChange } = setup();
    fireEvent.change(actionSelect(), { target: { value: "split" } });
    expect(onChange.mock.calls[0][0].studio.action).toBe("split");
  });

  it("keeps the other studio fields when one changes", () => {
    const { onChange } = setup({
      studio: {
        ...defaultSettings("pdf-studio").studio,
        filename: "keep-me.pdf",
      },
    });
    fireEvent.change(screen.getByLabelText("PDF document title"), {
      target: { value: "Title" },
    });
    expect(onChange.mock.calls[0][0].studio.filename).toBe("keep-me.pdf");
  });

  it("disables every control while a run is in flight", () => {
    const onChange = vi.fn();
    render(
      <PdfStudioSettings
        settings={{
          ...defaultSettings("pdf-studio"),
          studio: {
            ...defaultSettings("pdf-studio").studio,
            action: "extract",
          },
        }}
        onChange={onChange}
        disabled
      />,
    );
    // Plain DOM checks: this suite does not register jest-dom matchers.
    expect(actionSelect().disabled).toBe(true);
    expect(
      (screen.getByLabelText("Page ranges") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("PDF document title") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("PDF studio file name") as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it("surfaces the plan summary when there is one", () => {
    render(
      <PdfStudioSettings
        settings={defaultSettings("pdf-studio")}
        onChange={vi.fn()}
        studioSummary="4 of 6 pages · 1 rotated"
      />,
    );
    expect(screen.getByTestId("converter-studio-summary").textContent).toBe(
      "4 of 6 pages · 1 rotated",
    );
  });

  it("raises the plan problem as an alert, not a hint", () => {
    render(
      <PdfStudioSettings
        settings={defaultSettings("pdf-studio")}
        onChange={vi.fn()}
        studioProblem="Every page is marked as removed. Keep at least one page."
      />,
    );
    const problem = screen.getByTestId("converter-studio-problem");
    expect(problem.getAttribute("role")).toBe("alert");
    expect(problem.textContent).toContain("Keep at least one page");
  });

  it("defaults to a real file name rather than an empty one", () => {
    setup();
    expect(
      (screen.getByLabelText("PDF studio file name") as HTMLInputElement).value,
    ).toBe("quickkit-pages.pdf");
  });
});
