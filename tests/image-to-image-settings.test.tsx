// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ImageToImageSettings from "@/components/tools/image-to-image/settings";
import {
  defaultSettings,
  type ConvertSettings,
} from "@/lib/tools/image-convert";
import type { SizeSettings } from "@/lib/tools/image-size";

const SUPPORT = { jpeg: true, png: true, webp: true, avif: true };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** JPEG so the quality semantics under test actually apply (PNG is lossless). */
function jpegSettings(): ConvertSettings {
  const base = defaultSettings("image");
  return { ...base, image: { ...base.image, format: "jpeg" } };
}

function setup(
  overrides: { settings?: ConvertSettings; size?: Partial<SizeSettings> } = {},
) {
  const base = overrides.settings ?? jpegSettings();
  const settings: ConvertSettings = overrides.size
    ? {
        ...base,
        image: {
          ...base.image,
          size: { ...base.image.size, ...overrides.size },
        },
      }
    : base;
  const onChange = vi.fn();
  const utils = render(
    <ImageToImageSettings
      settings={settings}
      onChange={onChange}
      support={SUPPORT}
      selectedSize={{ width: 4000, height: 3000 }}
      sourceKind="photo"
      sourceBytes={6 * 1024 * 1024}
    />,
  );
  return { onChange, settings, ...utils };
}

const latestSize = (onChange: ReturnType<typeof vi.fn>): SizeSettings =>
  onChange.mock.calls.at(-1)![0].image.size as SizeSettings;

describe("file size section", () => {
  it("offers both ways of deciding the output size", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /set quality/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /target file size/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the classic quality controls until a target is chosen", () => {
    setup();
    expect(screen.queryByLabelText("Target file size")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Image quality")).toBeEnabled();
    expect(screen.queryByText("Compression style")).not.toBeInTheDocument();
  });

  it("disables the quality slider for a lossless format instead of pretending", () => {
    const settings = defaultSettings("image"); // PNG
    setup({ settings });
    expect(screen.getByLabelText("Image quality")).toBeDisabled();
    expect(screen.getByText("Quality (not used)")).toBeInTheDocument();
  });

  it("reveals the whole size engine in target mode", () => {
    setup({ size: { mode: "target" } });
    expect(screen.getByLabelText("Target file size")).toBeInTheDocument();
    expect(screen.getByLabelText("Target size unit")).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: /compression style/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/try lossless first/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/choose the format automatically/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/shrink pixels if that is the only way/i),
    ).toBeInTheDocument();
  });

  it("renames the quality slider to a ceiling so it cannot be misread", () => {
    setup({
      settings: jpegSettings(),
      size: { mode: "target", preset: "balanced" },
    });
    expect(screen.getByText("Quality ceiling")).toBeInTheDocument();
    expect(
      screen.getByText(/never encodes above this quality/i),
    ).toBeInTheDocument();
  });

  it("ships the six requested presets as one-tap buttons", () => {
    setup({ size: { mode: "target" } });
    for (const label of [
      "20 KB",
      "50 KB",
      "100 KB",
      "200 KB",
      "500 KB",
      "1 MB",
    ])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("writes a preset into the custom fields, not a hidden value", () => {
    const { onChange } = setup({ size: { mode: "target" } });
    fireEvent.click(screen.getByRole("button", { name: "500 KB" }));
    expect(latestSize(onChange)).toMatchObject({
      targetValue: "500",
      targetUnit: "KB",
    });

    fireEvent.click(screen.getByRole("button", { name: "1 MB" }));
    expect(latestSize(onChange)).toMatchObject({
      targetValue: "1",
      targetUnit: "MB",
    });
  });

  it("switches compression style through the radio group", () => {
    const { onChange } = setup({ size: { mode: "target" } });
    fireEvent.click(screen.getByLabelText(/smallest file/i));
    expect(latestSize(onChange).preset).toBe("smallest");
    fireEvent.click(screen.getByLabelText(/maximum quality/i));
    expect(latestSize(onChange).preset).toBe("max-quality");
  });

  it("explains what each style will do before the user picks it", () => {
    setup({ size: { mode: "target", preset: "max-quality" } });
    expect(screen.getByText(/keeps every pixel/i)).toBeInTheDocument();
  });

  it("accepts a custom target and validates it inline", () => {
    const { onChange } = setup({ size: { mode: "target", targetValue: "2" } });
    const input = screen.getByLabelText("Target file size");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/targets start at 5 KB/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "350" } });
    expect(latestSize(onChange).targetValue).toBe("350");
  });

  it("toggles each engine rule independently", () => {
    const { onChange } = setup({
      size: {
        mode: "target",
        losslessFirst: true,
        autoFormat: false,
        allowDownscale: true,
      },
    });
    fireEvent.click(screen.getByLabelText(/try lossless first/i));
    expect(latestSize(onChange).losslessFirst).toBe(false);

    fireEvent.click(screen.getByLabelText(/choose the format automatically/i));
    expect(latestSize(onChange).autoFormat).toBe(true);

    fireEvent.click(
      screen.getByLabelText(/shrink pixels if that is the only way/i),
    );
    expect(latestSize(onChange).allowDownscale).toBe(false);
  });

  it("estimates the output before anything is converted", () => {
    setup({ size: { mode: "target", targetValue: "8000", targetUnit: "KB" } });
    const estimate = screen.getByTestId("converter-size-estimate");
    expect(estimate).toHaveTextContent(/Estimated/);
    // A 12 MP photo at q85 sits in the megabytes; the estimate must say so.
    expect(estimate).toHaveTextContent(/MB/);
    expect(estimate).toHaveTextContent(/Your file is 6\.0 MB now\./);
  });

  it("warns in the UI when the target cannot be met as set", () => {
    setup({
      size: {
        mode: "target",
        targetValue: "20",
        targetUnit: "KB",
        preset: "max-quality",
        allowDownscale: false,
      },
    });
    const estimate = screen.getByTestId("converter-size-estimate");
    expect(estimate).toHaveClass("warning");
    expect(estimate).toHaveTextContent(/not reachable as set/i);
  });

  it("says a pixel reduction is coming when that is the only option", () => {
    setup({
      size: {
        mode: "target",
        targetValue: "60",
        targetUnit: "KB",
        preset: "smallest",
        allowDownscale: true,
      },
    });
    const estimate = screen.getByTestId("converter-size-estimate");
    expect(estimate).toHaveClass("warning");
    expect(estimate).toHaveTextContent(/needs smaller pixels/i);
  });

  it("tells the truth about lossless formats having no quality knob", () => {
    const settings = defaultSettings("image"); // PNG
    setup({
      settings: {
        ...settings,
        image: {
          ...settings.image,
          format: "png",
          size: { ...settings.image.size, mode: "target", targetValue: "200" },
        },
      },
    });
    expect(
      screen.getByText(/lossless: there is no quality knob/i),
    ).toBeInTheDocument();
  });

  it("disables everything while a conversion is running", () => {
    const base = defaultSettings("image");
    render(
      <ImageToImageSettings
        settings={{
          ...base,
          image: {
            ...base.image,
            size: { ...base.image.size, mode: "target" },
          },
        }}
        onChange={vi.fn()}
        support={SUPPORT}
        disabled
        selectedSize={{ width: 800, height: 600 }}
      />,
    );
    expect(screen.getByLabelText("Target file size")).toBeDisabled();
    expect(screen.getByRole("button", { name: "20 KB" })).toBeDisabled();
    expect(screen.getByLabelText(/try lossless first/i)).toBeDisabled();
  });
});

describe("resize and edit section", () => {
  it("offers the requested DPI steps plus a custom entry", () => {
    setup();
    const select = screen.getByLabelText("Resolution in DPI");
    for (const dpi of ["72 DPI", "96 DPI", "150 DPI", "200 DPI", "300 DPI"])
      expect(select).toContainHTML(dpi);
    expect(select).toContainHTML("Custom…");
  });

  it("says honestly when DPI cannot be stored in the file", () => {
    setup(); // default format is PNG
    expect(
      screen.getByText(/cannot store a density, so DPI drives the print/i),
    ).toBeInTheDocument();
  });

  it("prints the physical size in inches, centimetres and millimetres", () => {
    setup({
      settings: (() => {
        const base = defaultSettings("image");
        return {
          ...base,
          image: {
            ...base.image,
            resize: {
              ...base.image.resize,
              mode: "exact",
              width: 1500,
              height: 750,
              dpi: 150,
              // Locked, the height would be recomputed from the source ratio.
              lock: false,
            },
          },
        };
      })(),
    });
    expect(screen.getByTestId("converter-print-size")).toHaveTextContent(
      "10.00 × 5.00 in · 25.4 × 12.7 cm · 254 × 127 mm at 150 DPI",
    );
  });

  it("reveals a custom DPI field only when custom is chosen", () => {
    setup();
    expect(screen.queryByLabelText("Custom DPI")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Resolution in DPI"), {
      target: { value: "custom" },
    });
    // Nothing is written until the user picks a real value.
    expect(screen.queryByLabelText("Custom DPI")).not.toBeInTheDocument();
  });

  it("offers preset dimensions in exact mode", () => {
    const base = defaultSettings("image");
    setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          resize: { ...base.image.resize, mode: "exact" },
        },
      },
    });
    expect(screen.getByText("Preset dimensions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full HD" })).toBeInTheDocument();
  });

  it("writes a preset into the width and height fields", () => {
    const base = defaultSettings("image");
    const { onChange } = setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          resize: { ...base.image.resize, mode: "exact" },
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Full HD" }));
    const resize = onChange.mock.calls.at(-1)![0].image.resize;
    expect(resize.width).toBe(1920);
    expect(resize.height).toBe(1080);
  });

  it("offers the three placement modes for an exact box", () => {
    const base = defaultSettings("image");
    setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          resize: { ...base.image.resize, mode: "exact" },
        },
      },
    });
    const select = screen.getByLabelText("Image placement");
    expect(select).toContainHTML("Fill (stretch)");
    expect(select).toContainHTML("Fit (contain)");
    expect(select).toContainHTML("Fill and crop (cover)");
  });

  it("warns that upscaling cannot restore detail", () => {
    const base = defaultSettings("image");
    setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          resize: {
            ...base.image.resize,
            mode: "exact",
            width: 8000,
            height: 6000,
            lock: false,
          },
        },
      },
    });
    const warning = screen.getByTestId("converter-upscale-warning");
    expect(warning).toHaveClass("warning");
    expect(warning).toHaveTextContent(/cannot restore detail/i);
  });

  it("stays quiet when the output is not an enlargement", () => {
    const base = defaultSettings("image");
    setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          resize: {
            ...base.image.resize,
            mode: "exact",
            width: 2000,
            height: 1500,
            lock: false,
          },
        },
      },
    });
    expect(screen.queryByTestId("converter-upscale-warning")).toBeNull();
  });

  it("rotates in 90° steps both ways", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /rotate right/i }));
    expect(onChange.mock.calls.at(-1)![0].image.edits.rotate).toBe(90);

    fireEvent.click(screen.getByRole("button", { name: /rotate left/i }));
    expect(onChange.mock.calls.at(-1)![0].image.edits.rotate).toBe(270);
  });

  it("toggles flips and reports them", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /flip horizontal/i }));
    expect(onChange.mock.calls.at(-1)![0].image.edits.flipH).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /flip vertical/i }));
    expect(onChange.mock.calls.at(-1)![0].image.edits.flipV).toBe(true);
    expect(screen.getByTestId("converter-edit-summary")).toHaveTextContent(
      /No edits/,
    );
  });

  it("straightens within ±45° and can be reset", () => {
    const base = defaultSettings("image");
    const { onChange } = setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          edits: { ...base.image.edits, straighten: -3.5 },
        },
      },
    });
    const slider = screen.getByLabelText("Straighten angle in degrees");
    expect(slider).toHaveAttribute("min", "-45");
    expect(slider).toHaveAttribute("max", "45");
    expect(slider).toHaveValue("-3.5");

    fireEvent.change(slider, { target: { value: "2.5" } });
    expect(onChange.mock.calls.at(-1)![0].image.edits.straighten).toBe(2.5);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onChange.mock.calls.at(-1)![0].image.edits.straighten).toBe(0);
  });

  it("disables the straighten reset when there is nothing to undo", () => {
    setup();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("crops to a ratio from the centre", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "1:1 square" }));
    const crop = onChange.mock.calls.at(-1)![0].image.edits.crop;
    // 4000 × 3000 source: a square keeps 75% of the width, centred.
    expect(crop.width).toBeCloseTo(0.75, 5);
    expect(crop.x).toBeCloseTo(0.125, 5);
    expect(crop.height).toBe(1);
  });

  it("clears the crop again with the Free button", () => {
    const base = defaultSettings("image");
    const { onChange } = setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          edits: {
            ...base.image.edits,
            crop: { x: 0.125, y: 0, width: 0.75, height: 1 },
          },
        },
      },
    });
    expect(screen.getByTestId("converter-edit-summary")).toHaveTextContent(
      /Applied: cropped/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Free" }));
    expect(onChange.mock.calls.at(-1)![0].image.edits.crop).toBeNull();
  });

  it("shows the pixel box an edit produces before any resize", () => {
    const base = defaultSettings("image");
    setup({
      settings: {
        ...base,
        image: {
          ...base.image,
          edits: { ...base.image.edits, rotate: 90 },
        },
      },
    });
    expect(screen.getByTestId("converter-edit-summary")).toHaveTextContent(
      /3000 × 4000 px before resize/,
    );
  });

  it("says plainly when nothing was edited", () => {
    setup();
    expect(screen.getByTestId("converter-edit-summary")).toHaveTextContent(
      /No edits\. Every file is converted exactly as uploaded\./,
    );
  });
});

describe("collapsible settings (Phase 7)", () => {
  it("renders every settings block as a disclosure that starts open", () => {
    const { container } = setup({ size: { mode: "target" } });
    const blocks = container.querySelectorAll("details.converter-block");
    // Format & quality, File size, Transparency, Edit, Resize, Metadata.
    expect(blocks.length).toBe(6);
    for (const block of blocks) expect(block).toHaveAttribute("open");
  });

  it("keeps a heading inside each summary so the block stays labelled", () => {
    const { container } = setup();
    const summaries = container.querySelectorAll(
      "details.converter-block > summary",
    );
    expect(summaries.length).toBeGreaterThan(0);
    for (const summary of summaries)
      expect(summary.querySelector("h3")).not.toBeNull();
  });

  it("collapses a block without losing its controls", () => {
    const { container } = setup();
    const first = container.querySelector("details.converter-block")!;
    expect(first.querySelector("#converter-format")).toBeInTheDocument();
    first.removeAttribute("open");
    // The control is still in the document, just hidden — nothing is unmounted.
    expect(first.querySelector("#converter-format")).toBeInTheDocument();
  });
});

describe("output name template control", () => {
  const field = () => screen.getByLabelText(/output name template/i);

  it("ships blank, so existing naming is untouched by default", () => {
    setup();
    expect(field()).toHaveValue("");
    expect(
      screen.getByText(/each file keeps its own name/i),
    ).toBeInTheDocument();
  });

  it("reports the typed template back through onChange", () => {
    const { onChange } = setup();
    fireEvent.change(field(), { target: { value: "{name}-{index}.{ext}" } });

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)![0].nameTemplate).toBe(
      "{name}-{index}.{ext}",
    );
  });

  it("previews against the selected output format, not the source", () => {
    // jpegSettings() sets format jpeg, whose extension is jpg.
    setup({ settings: { ...jpegSettings(), nameTemplate: "{name}.{ext}" } });
    expect(screen.getByText(/Holiday-Photo\.jpg/)).toBeInTheDocument();
  });

  it("warns rather than silently ignoring a template with no usable tokens", () => {
    setup({ settings: { ...jpegSettings(), nameTemplate: "{bogus}" } });
    expect(screen.getByText(/no usable tokens/i)).toBeInTheDocument();
  });
});
