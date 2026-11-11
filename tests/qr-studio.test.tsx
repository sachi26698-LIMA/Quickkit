// @vitest-environment jsdom
/**
 * QR studio UI wiring. These run the *real* engine (pure-JS rasteriser + jsQR)
 * inside jsdom, so they prove the panels are connected: typing produces a code,
 * the decode check drives the export buttons, and secrets stay out of storage.
 * Canvas painting is stubbed — jsdom has no 2D context, and the bitmap itself is
 * produced without one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import QrGenerator from "../components/tools/qr-generator";
import { QR_SAMPLE_URL } from "../components/tools/qr-generator/use-qr-studio";
import { HISTORY_STORAGE_KEY } from "../lib/tools/qr/storage";
import { PRESET_SWATCHES } from "../lib/tools/qr/palette";

const VERIFIED = "Verified by an independent decoder";
const BLOCKED = "Not scannable — export is blocked";
const TEST_TIMEOUT = 60_000;

/** Scope a query to one workspace card so the mobile quick-save bar can't match. */
function card(id: string) {
  return within(document.getElementById(id) as HTMLElement);
}

/** Small export size: the same verification path, a quarter of the pixels. */
function useSmallSize() {
  const group = screen.getByRole("group", { name: "Preset export sizes" });
  fireEvent.click(within(group).getByRole("button", { name: "256 px" }));
}

async function settle() {
  await waitFor(() => expect(screen.getByText(VERIFIED)).toBeInTheDocument(), {
    timeout: TEST_TIMEOUT,
  });
}

/** Some designs decode with warnings instead of a clean pass — both are fine. */
async function settleOrWarn() {
  await waitFor(
    () =>
      expect(
        screen.getByText(
          /Verified by an independent decoder|Decoded — with notes below/,
        ),
      ).toBeInTheDocument(),
    { timeout: TEST_TIMEOUT },
  );
}

function typeUrl(value: string) {
  fireEvent.change(screen.getByLabelText(/Web address/), {
    target: { value },
  });
}

/** The content type is a compact picker, not a wall of twelve buttons. */
function pickType(id: string) {
  fireEvent.change(screen.getByLabelText("QR content type"), {
    target: { value: id },
  });
}

function openDesignTab(label: string) {
  fireEvent.click(
    screen.getByRole("tab", { name: new RegExp(`^${label}`, "i") }),
  );
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal(
    "URL",
    Object.assign(window.URL, {
      createObjectURL: vi.fn(() => "blob:stub"),
      revokeObjectURL: vi.fn(),
    }),
  );
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("qr studio — empty state", () => {
  it("waits for content and refuses every export", () => {
    render(<QrGenerator />);
    expect(screen.getByText("Waiting for valid content")).toBeInTheDocument();
    for (const name of [/^PNG/, /^High-res PNG/, /^SVG/, /^PDF/])
      expect(card("qr-export").getByRole("button", { name })).toBeDisabled();
    expect(screen.getByRole("tab", { name: /Create QR/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("offers all twenty-eight content types in one compact picker", () => {
    render(<QrGenerator />);
    const select = screen.getByLabelText(
      "QR content type",
    ) as HTMLSelectElement;
    const labels = [...select.options].map((option) =>
      (option.textContent ?? "").replace(/\u2011/g, "-"),
    );
    expect(labels).toEqual([
      "Website URL",
      "Payment / UPI",
      "Plain text",
      "Email",
      "Phone number",
      "SMS",
      "WhatsApp",
      "Wi-Fi",
      "vCard contact",
      "Location",
      "Calendar event",
      "Social profile",
      "App download",
      "Instagram profile",
      "Facebook page",
      "YouTube channel",
      "Spotify / music",
      "Google Maps location",
      "Google Review link",
      "Business website + contact",
      "Product / shopping link",
      "Appointment booking",
      "Event / ticket link",
      "PDF / document link",
      "Image gallery link",
      "Video link",
      "Multi-social links",
      "Multi-link landing page",
    ]);
    expect(select.value).toBe("url");
  });

  it(
    "renders a URL with an original Data Template link by default and supports Direct Raw Content",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      typeUrl("example.com/pricing?src=qr#top");
      await settle();
      expect(
        card("qr-export").getByRole("button", { name: /^PNG/ }),
      ).toBeEnabled();
      fireEvent.click(
        screen.getByRole("button", { name: "Show the exact encoded content" }),
      );
      const templatePayload =
        document.querySelector("#qr-payload-view pre")?.textContent ?? "";
      expect(templatePayload).toContain("/qr?d=");

      // Switching to Direct Raw Content encodes the bare normalized URL.
      fireEvent.click(
        screen.getByRole("button", { name: /Direct Raw Content/ }),
      );
      await settle();
      expect(document.querySelector("#qr-payload-view pre")?.textContent).toBe(
        "https://example.com/pricing?src=qr#top",
      );
      expect(screen.getByText(/v\d+ · \d+×\d+/)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "escapes Wi-Fi punctuation and dots out the password on screen in both modes",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      pickType("wifi");
      fireEvent.change(screen.getByLabelText(/Network name/), {
        target: { value: "Café;Wi:Fi\\net" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/), {
        target: { value: "p@ss;w:ord" },
      });
      await settle();
      fireEvent.click(
        screen.getByRole("button", { name: "Show the exact encoded content" }),
      );
      const templateView =
        document.querySelector("#qr-payload-view pre")?.textContent ?? "";
      expect(templateView).toContain("/qr?d=");
      expect(templateView).toContain("#s=••••••••");
      expect(templateView).not.toContain("p@ss");

      fireEvent.click(
        screen.getByRole("button", { name: /Direct Raw Content/ }),
      );
      await settle();
      const view =
        document.querySelector("#qr-payload-view pre")?.textContent ?? "";
      expect(view.startsWith("WIFI:T:WPA;")).toBe(true);
      expect(view).toContain("S:Café\\;Wi\\:Fi\\\\net");
      expect(view).not.toContain("p@ss");
    },
    TEST_TIMEOUT,
  );

  it("shows the field error instead of a code when a field is invalid", async () => {
    render(<QrGenerator />);
    pickType("email");
    fireEvent.change(screen.getByLabelText(/Recipient/), {
      target: { value: "not-an-email" },
    });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/email/i),
    );
    expect(screen.queryByText(VERIFIED)).not.toBeInTheDocument();
    expect(
      card("qr-export").getByRole("button", { name: /^PNG/ }),
    ).toBeDisabled();
  });
});

describe("qr studio — styling can never pass silently", () => {
  it(
    "blocks the export when the ink is invisible and fixes it on request",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      typeUrl("https://example.com/style");
      await settle();
      const [foreground] = screen.getAllByLabelText("Colour hex value");
      fireEvent.change(foreground, { target: { value: "#eeeeee" } });
      await waitFor(
        () => expect(screen.getByText(BLOCKED)).toBeInTheDocument(),
        {
          timeout: TEST_TIMEOUT,
        },
      );
      expect(
        card("qr-export").getByRole("button", { name: /^PNG/ }),
      ).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Make it safe" }));
      await settle();
      expect(
        card("qr-export").getByRole("button", { name: /^PNG/ }),
      ).toBeEnabled();
    },
    TEST_TIMEOUT,
  );

  it("keeps a pristine form quiet and validates from the first real keystroke", () => {
    render(<QrGenerator />);
    const fields = within(document.getElementById("qr-content") as HTMLElement);
    expect(fields.queryByRole("alert")).not.toBeInTheDocument();
    // Whitespace is not content, so this stays a "nothing yet" state.
    fireEvent.change(screen.getByLabelText(/Web address/), {
      target: { value: "   " },
    });
    expect(fields.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Web address/), {
      target: { value: "not a url" },
    });
    expect(fields.getByRole("alert")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Web address/), {
      target: { value: "" },
    });
    expect(fields.queryByRole("alert")).not.toBeInTheDocument();
  });

  it(
    "applies a premium template and keeps the code decodable",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      typeUrl("https://example.com/template");
      await settle();
      openDesignTab("Templates");
      fireEvent.click(screen.getByRole("button", { name: /Midnight Grape/ }));
      await settle();
      expect(
        card("qr-export").getByRole("button", { name: /^PNG/ }),
      ).toBeEnabled();
    },
    TEST_TIMEOUT,
  );

  it(
    "replaces the whole look when a template is applied, instead of blending two",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      typeUrl("https://example.com/template-swap");
      await settle();
      openDesignTab("Templates");
      fireEvent.click(screen.getByRole("button", { name: /Inverted Noir/ }));
      await settleOrWarn();
      expect(
        (screen.getByLabelText(/^Invert/) as HTMLInputElement).checked,
      ).toBe(true);
      // "Clear Badge" says nothing about inversion, so applying it used to keep
      // the previous template's inverted field — an unverifiable hybrid.
      fireEvent.click(screen.getByRole("button", { name: /Clear Badge/ }));
      await settleOrWarn();
      expect(
        (screen.getByLabelText(/^Invert/) as HTMLInputElement).checked,
      ).toBe(false);
      expect(screen.queryByText(BLOCKED)).not.toBeInTheDocument();
      expect(
        card("qr-export").getByRole("button", { name: /^PNG/ }),
      ).toBeEnabled();
    },
    TEST_TIMEOUT,
  );

  it(
    "keeps the download row locked while the safety audit blocks the code",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      typeUrl("https://example.com/quiet-zone");
      await settle();
      const margin = document.getElementById("qr-margin") as HTMLInputElement;
      fireEvent.change(margin, { target: { value: "0" } });
      expect(margin.value).toBe("0");
      await waitFor(
        () => expect(screen.getByText(BLOCKED)).toBeInTheDocument(),
        { timeout: TEST_TIMEOUT },
      );
      // The preview already says the code is not scannable; the buttons cannot
      // disagree with it.
      for (const name of [/^PNG/, /^High-res PNG/, /^SVG/, /^PDF/])
        expect(card("qr-export").getByRole("button", { name })).toBeDisabled();
      expect(card("qr-export").getByRole("alert")).toHaveTextContent(
        /safety audit/i,
      );
    },
    TEST_TIMEOUT,
  );
});

describe("qr studio — history, tabs and bulk", () => {
  it(
    "stores the design but never the secret content",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      pickType("wifi");
      fireEvent.change(screen.getByLabelText(/Network name/), {
        target: { value: "StudioNet" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/), {
        target: { value: "s3cr3t-passphrase" },
      });
      await settle();
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY) ?? "";
      expect(raw).toContain("wifi");
      expect(raw).not.toContain("s3cr3t-passphrase");
    },
    TEST_TIMEOUT,
  );

  it("switches tabs with the keyboard and opens the bulk workspace", () => {
    render(<QrGenerator />);
    const create = screen.getByRole("tab", { name: /Create QR/ });
    create.focus();
    fireEvent.keyDown(create, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /Bulk \(CSV\)/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Drop a CSV/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("tab", { name: /Bulk \(CSV\)/ }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: /^History/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it(
    "renders one verified code per CSV row",
    async () => {
      render(<QrGenerator />);
      fireEvent.click(screen.getByRole("tab", { name: /Bulk \(CSV\)/ }));
      fireEvent.click(
        screen.getByRole("button", { name: "Load the sample file" }),
      );
      expect(screen.getByText("Column mapping")).toBeInTheDocument();
      fireEvent.click(
        within(document.getElementById("qr-bulk") as HTMLElement).getByRole(
          "button",
          { name: /Generate 3 codes/ },
        ),
      );
      await waitFor(
        () =>
          expect(document.querySelector(".qr-bulk-summary")).toHaveTextContent(
            /3 rendered/,
          ),
        { timeout: TEST_TIMEOUT },
      );
      expect(
        within(document.getElementById("qr-bulk") as HTMLElement).getByRole(
          "button",
          {
            name: /Download ZIP \(3\)/,
          },
        ),
      ).toBeEnabled();
      expect(document.querySelector(".qr-row-status.verified")).not.toBeNull();
    },
    TEST_TIMEOUT * 2,
  );
});

describe("qr studio — reference layout (tabs, cards, folds, sample)", () => {
  it("names every panel with words, never with step numbers", () => {
    render(<QrGenerator />);
    const titles = [
      ...document.querySelectorAll(
        ".qr-studio h3, .qr-studio .qr-acc-titles strong",
      ),
    ].map((node) => (node.textContent ?? "").trim());
    expect(titles).toEqual([
      "Content",
      "Design & Customize",
      "Advanced Settings",
      "Preview",
    ]);
    for (const label of titles) expect(label).not.toMatch(/^\s*\d+\s*[.·]/);
    // The download row is a labelled block inside the preview card, not a card.
    expect(
      (
        document.querySelector("#qr-export .qr-block-label")?.textContent ?? ""
      ).trim(),
    ).toBe("Download");
  });

  it("splits the workspace into four tabs and the design card into six", () => {
    render(<QrGenerator />);
    expect(screen.getAllByRole("tab")).toHaveLength(10);
    for (const name of [/Create QR/, /Bulk \(CSV\)/, /^History/, /^Presets/])
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    for (const name of [
      /^Colours/,
      /^Pattern/,
      /^Corners/,
      /^Logo/,
      /^Frame/,
      /^Templates/,
    ])
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
  });

  it("keeps the code, its verdict and its files in one right-hand card", () => {
    render(<QrGenerator />);
    const preview = document.getElementById("qr-preview") as HTMLElement;
    const exportBlock = document.getElementById("qr-export") as HTMLElement;
    expect(preview.contains(exportBlock)).toBe(true);
    const form = document.querySelector(".qr-col-form") as HTMLElement;
    for (const id of ["qr-content", "qr-design", "qr-advanced"])
      expect(form.contains(document.getElementById(id) as Node)).toBe(true);
    for (const name of [/^PNG/, /^High-res PNG/, /^SVG/, /^PDF/])
      expect(
        within(exportBlock).getByRole("button", { name }),
      ).toBeInTheDocument();
  });

  it("folds Advanced Settings, opens it on request and keeps content open", () => {
    render(<QrGenerator />);
    const advanced = document.getElementById(
      "qr-advanced",
    ) as HTMLDetailsElement;
    const content = document.getElementById("qr-content") as HTMLDetailsElement;
    const design = document.getElementById("qr-design") as HTMLDetailsElement;
    expect(advanced.open).toBe(false);
    expect(content.open).toBe(true);
    expect(design.open).toBe(true);
    fireEvent.click(advanced.querySelector("summary") as HTMLElement);
    expect(advanced.open).toBe(true);
  });

  it("shows one design tab at a time", () => {
    render(<QrGenerator />);
    expect(
      screen.getByRole("group", { name: "Modules (foreground) type" }),
    ).toBeInTheDocument();
    openDesignTab("Corners");
    expect(
      screen.getByRole("group", { name: "Corner and eye style" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Modules (foreground) type" }),
    ).toBeNull();
  });

  it("gives History and Presets their own tabs", () => {
    render(<QrGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /^History/ }));
    expect(document.getElementById("qr-history")).not.toBeNull();
    expect(screen.getByText(/Nothing recorded yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /^Presets/ }));
    expect(document.getElementById("qr-presets")).not.toBeNull();
    expect(screen.getByText(/No presets yet/)).toBeInTheDocument();
  });

  it(
    "offers a sample in the empty state that renders a real verified code",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      const empty = document.querySelector(".qr-preview-empty") as HTMLElement;
      expect(empty).toBeInTheDocument();
      expect(document.querySelector(".qr-empty-art")).not.toBeNull();
      expect(empty.textContent).not.toMatch(/verified/i);
      expect(screen.getByText("Waiting for valid content")).toBeInTheDocument();
      fireEvent.click(
        within(empty).getByRole("button", { name: /Try sample/ }),
      );
      expect(screen.getByLabelText(/Web address/)).toHaveValue(QR_SAMPLE_URL);
      expect(screen.queryByText(/left alone/i)).toBeNull();
      await settle();
      expect(document.querySelector(".qr-preview-empty")).toBeNull();
      expect(screen.getByText(VERIFIED)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it("leaves a value you typed alone when the sample is requested", () => {
    render(<QrGenerator />);
    typeUrl("https://keep-me.example");
    // Move to a type with nothing filled in: that is when the sample is offered.
    pickType("email");
    expect(screen.getByText(/Nothing to encode yet/)).toBeInTheDocument();
    fireEvent.click(
      card("qr-content").getByRole("button", { name: /Try sample/ }),
    );
    expect(screen.getByLabelText(/Web address/)).toHaveValue(
      "https://keep-me.example",
    );
    expect(screen.getByText(/left alone/i)).toBeInTheDocument();
  });
});

describe("qr studio — V3 design controls (frame, finder colours)", () => {
  it(
    "applies a labelled frame from the Frame tab and stays verified",
    async () => {
      render(<QrGenerator />);
      fireEvent.click(screen.getByRole("button", { name: "512 px" }));
      typeUrl("https://example.com/menu");
      await settle();
      openDesignTab("Frame");
      const group = screen.getByRole("group", { name: "Frame style" });
      fireEvent.click(within(group).getByRole("button", { name: "Scan Me" }));
      expect(screen.getByLabelText("Banner text")).toHaveValue("SCAN ME");
      await settle();
      expect(screen.getByText(VERIFIED)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "custom frame text is editable and re-verifies",
    async () => {
      render(<QrGenerator />);
      fireEvent.click(screen.getByRole("button", { name: "512 px" }));
      typeUrl("https://example.com");
      await settle();
      openDesignTab("Frame");
      fireEvent.click(
        within(screen.getByRole("group", { name: "Frame style" })).getByRole(
          "button",
          { name: "Custom" },
        ),
      );
      const input = screen.getByLabelText("Banner text");
      fireEvent.change(input, { target: { value: "ORDER HERE" } });
      expect(input).toHaveValue("ORDER HERE");
      await settle();
      expect(screen.getByText(VERIFIED)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "enables an independent finder colour from the Colours tab",
    async () => {
      render(<QrGenerator />);
      typeUrl("https://example.com");
      await settle();
      openDesignTab("Colours");
      fireEvent.click(screen.getByLabelText("Ring override"));
      expect(
        screen.getByLabelText("Ring colour hex value"),
      ).toBeInTheDocument();
      await settle();
      expect(screen.getByText(VERIFIED)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );
});

describe("qr studio — V3 export controls (DPI, custom px, print layouts)", () => {
  function openExportMore() {
    const summary = document.querySelector("#qr-export-more summary");
    fireEvent.click(summary as HTMLElement);
  }

  it("exposes DPI, custom-size and print-layout controls", () => {
    render(<QrGenerator />);
    openExportMore();
    const dpi = screen.getByLabelText("Print resolution (DPI metadata)");
    expect(dpi).toHaveValue("300");
    fireEvent.change(dpi, { target: { value: "600" } });
    expect(dpi).toHaveValue("600");
    expect(screen.getByLabelText("Custom size (px)")).toBeInTheDocument();
    expect(screen.getByLabelText("PDF layout")).toHaveValue("single");
  });

  it("reveals the grid controls for the A4 cut sheet and hides the paper picker", () => {
    render(<QrGenerator />);
    openExportMore();
    fireEvent.change(screen.getByLabelText("PDF layout"), {
      target: { value: "a4-sheet" },
    });
    expect(screen.getByRole("slider", { name: /Columns/ })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Rows/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Paper")).toBeNull();
  });

  it("a fixed layout hides the paper picker and explains its size", () => {
    render(<QrGenerator />);
    openExportMore();
    fireEvent.change(screen.getByLabelText("PDF layout"), {
      target: { value: "business-card" },
    });
    expect(screen.queryByLabelText("Paper")).toBeNull();
    expect(
      screen.getByText(/prints on a fixed 85 × 55 mm/),
    ).toBeInTheDocument();
  });

  it("guards the custom-size export button against an out-of-range value", () => {
    render(<QrGenerator />);
    typeUrl("https://example.com");
    openExportMore();
    const input = screen.getByLabelText("Custom size (px)");
    const button = screen.getByRole("button", { name: /Export/ });
    fireEvent.change(input, { target: { value: "10" } });
    expect(button).toBeDisabled();
    fireEvent.change(input, { target: { value: "1024" } });
    expect(button).not.toBeDisabled();
  });
});

describe("qr studio — V3 bulk upgrades (preview, per-row type, retry)", () => {
  function openBulk() {
    fireEvent.click(screen.getByRole("tab", { name: /Bulk \(CSV\)/ }));
  }
  function bulkCard() {
    return within(document.getElementById("qr-bulk") as HTMLElement);
  }
  async function loadCsv(text: string, name = "test.csv") {
    const file = new File([text], name, { type: "text/csv" });
    const input = document.getElementById("qr-bulk-file") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText("Column mapping")).toBeInTheDocument(),
    );
  }

  it(
    "previews rows without rendering any pixels",
    async () => {
      render(<QrGenerator />);
      openBulk();
      fireEvent.click(
        screen.getByRole("button", { name: "Load the sample file" }),
      );
      fireEvent.click(bulkCard().getByRole("button", { name: /Preview rows/ }));
      await waitFor(() =>
        expect(document.querySelector(".qr-bulk-summary")).toHaveTextContent(
          /0 rendered/,
        ),
      );
      expect(document.querySelector(".qr-row-status.queued")).not.toBeNull();
      expect(
        bulkCard().getByRole("button", { name: /Download ZIP/ }),
      ).toBeDisabled();
      expect(screen.getByText(/Preview only/)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "a per-row type column reveals a Type column in the results",
    async () => {
      render(<QrGenerator />);
      openBulk();
      await loadCsv(
        "type,url\nurl,https://quickkit.tools\nurl,https://example.com",
      );
      fireEvent.change(
        screen.getByLabelText("Per-row type column (optional)"),
        {
          target: { value: "0" },
        },
      );
      fireEvent.click(bulkCard().getByRole("button", { name: /Preview rows/ }));
      await waitFor(() =>
        expect(document.querySelector(".qr-bulk-rows")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("columnheader", { name: "Type" }),
      ).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "offers Retry failed when a row is invalid and re-runs on click",
    async () => {
      render(<QrGenerator />);
      openBulk();
      await loadCsv("name,url\nBad,not-a-valid-url\nGood,https://example.com");
      fireEvent.click(
        bulkCard().getByRole("button", { name: /Generate 2 codes/ }),
      );
      await waitFor(
        () =>
          expect(document.querySelector(".qr-bulk-summary")).toHaveTextContent(
            /1 failed/,
          ),
        { timeout: TEST_TIMEOUT },
      );
      await waitFor(
        () =>
          expect(
            bulkCard().getByRole("button", { name: /Retry failed \(1\)/ }),
          ).toBeEnabled(),
        { timeout: TEST_TIMEOUT },
      );
      fireEvent.click(
        bulkCard().getByRole("button", { name: /Retry failed \(1\)/ }),
      );
      await waitFor(
        () =>
          expect(document.querySelector(".qr-bulk-summary")).toHaveTextContent(
            /1 rendered/,
          ),
        { timeout: TEST_TIMEOUT },
      );
      // The good row is kept; the bad row still fails (data unchanged).
      expect(document.querySelector(".qr-bulk-summary")).toHaveTextContent(
        /1 failed/,
      );
    },
    TEST_TIMEOUT * 2,
  );
});

describe("qr studio — V3 history & preset management (Phase H)", () => {
  it("renames and duplicates a preset from the Presets tab", () => {
    render(<QrGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /^Presets/ }));
    fireEvent.change(screen.getByLabelText("Save the design you have now"), {
      target: { value: "Cafe look" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save design/ }));
    expect(screen.getByText("Cafe look")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Rename the Cafe look preset" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Rename the Cafe look preset",
    });
    fireEvent.change(input, { target: { value: "Menu look" } });
    fireEvent.click(screen.getByRole("button", { name: "Save the new name" }));
    expect(screen.getByText("Menu look")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Duplicate the Menu look preset" }),
    );
    expect(screen.getByText("Menu look copy")).toBeInTheDocument();
    expect(screen.getByText("Menu look")).toBeInTheDocument();
  });

  it(
    "renames a history entry from the History tab",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      typeUrl("https://example.com");
      await settle();
      fireEvent.click(screen.getByRole("tab", { name: /^History/ }));
      const renameButtons = screen.getAllByRole("button", {
        name: /Rename the/,
      });
      fireEvent.click(renameButtons[0]);
      const input = screen.getByRole("textbox", {
        name: /Rename the .* entry/,
      });
      fireEvent.change(input, { target: { value: "My renamed code" } });
      fireEvent.click(
        screen.getByRole("button", { name: "Save the new label" }),
      );
      expect(screen.getByText("My renamed code")).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it("offers config export and import on the Presets tab", () => {
    render(<QrGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /^Presets/ }));
    expect(
      screen.getByRole("button", { name: /Export config/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Import config/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Import a QUICKKIT QR config file"),
    ).toBeInTheDocument();
  });
});

describe("qr studio — V3 Smart Link landing builder (Phase E)", () => {
  function openLandingBuilder() {
    pickType("landing");
    const summary = screen
      .getByText("Build a Smart Link page")
      .closest("summary") as HTMLElement;
    fireEvent.click(summary);
  }

  it("shows the static-page limitation notice for the landing type", () => {
    render(<QrGenerator />);
    openLandingBuilder();
    expect(
      screen.getByText(/static HTML page you host yourself/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no dynamic redirect/i)).toBeInTheDocument();
  });

  it(
    "builds and downloads a self-contained HTML page from the builder",
    async () => {
      let captured: Blob | null = null;
      vi.stubGlobal(
        "URL",
        Object.assign(window.URL, {
          createObjectURL: vi.fn((blob: Blob) => {
            captured = blob;
            return "blob:stub";
          }),
          revokeObjectURL: vi.fn(),
        }),
      );
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});

      render(<QrGenerator />);
      openLandingBuilder();
      fireEvent.change(screen.getByLabelText("Page title"), {
        target: { value: "Cafe Aroma" },
      });
      fireEvent.change(screen.getByLabelText("Link 1 label"), {
        target: { value: "Menu" },
      });
      fireEvent.change(screen.getByLabelText("Link 1 URL"), {
        target: { value: "https://example.com/menu" },
      });

      const download = screen.getByRole("button", {
        name: /Download HTML page/,
      });
      expect(download).toBeEnabled();
      fireEvent.click(download);

      expect(clickSpy).toHaveBeenCalled();
      expect(captured).not.toBeNull();
      const html = await (captured as unknown as Blob).text();
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Cafe Aroma");
      expect(html).toContain('href="https://example.com/menu"');
      expect(html).not.toContain("<script");
    },
    TEST_TIMEOUT,
  );

  it("keeps download disabled until a valid link is present, and caps links at 8", () => {
    render(<QrGenerator />);
    openLandingBuilder();
    // Default config has one empty link -> invalid -> disabled.
    expect(
      screen.getByRole("button", { name: /Download HTML page/ }),
    ).toBeDisabled();

    // Add links up to the cap; the Add link button then disables.
    for (let i = 0; i < 10; i++) {
      const add = screen.getByRole("button", { name: /Add link/ });
      if ((add as HTMLButtonElement).disabled) break;
      fireEvent.click(add);
    }
    expect(screen.getByLabelText("Link 8 label")).toBeInTheDocument();
    expect(screen.queryByLabelText("Link 9 label")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add link/ })).toBeDisabled();
  });
});

describe("qr studio — V3 brand colour presets (Phase I)", () => {
  it(
    "every quick preset applies and still decodes to the exact payload",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      typeUrl("https://example.com/brand");
      await settle();
      openDesignTab("Colours");
      for (const swatch of PRESET_SWATCHES) {
        fireEvent.click(
          screen.getByRole("button", { name: `Apply ${swatch.name}` }),
        );
        // Each preset must keep the code independently verified — including the
        // light-on-dark rose/coral pairs.
        await settle();
        expect(screen.getByText(VERIFIED)).toBeInTheDocument();
      }
    },
    TEST_TIMEOUT,
  );
});

describe("qr studio — Data Templates, Original Links & Payment QR", () => {
  it(
    "creates a verified Payment / UPI QR with an original Data Template link inside the symbol",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      pickType("payment");
      fireEvent.change(screen.getByLabelText(/Payee \/ business name/), {
        target: { value: "Aurora Café" },
      });
      fireEvent.change(screen.getByLabelText(/UPI ID/), {
        target: { value: "auroracafe@upi" },
      });
      fireEvent.change(screen.getByLabelText(/Amount/), {
        target: { value: "499" },
      });
      await settle();

      const linkAnchor = document.querySelector(
        "#qr-original-link .qr-dt-link-url",
      ) as HTMLAnchorElement;
      expect(linkAnchor).not.toBeNull();
      expect(linkAnchor.getAttribute("href")).toContain("/qr?d=");
      expect(screen.getByText("encoded inside QR")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Open Data Template/ }),
      ).toHaveAttribute("href", linkAnchor.getAttribute("href"));
    },
    TEST_TIMEOUT,
  );

  it(
    "generates an original Data Template link for non-link types (vCard) and switches template themes",
    async () => {
      render(<QrGenerator />);
      useSmallSize();
      pickType("vcard");
      expect(
        screen.getByText(/Auto link for vCard contact/),
      ).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/First name/), {
        target: { value: "Ada" },
      });
      fireEvent.change(screen.getByLabelText(/Last name/), {
        target: { value: "Lovelace" },
      });
      fireEvent.change(screen.getByLabelText(/Mobile/), {
        target: { value: "+91 98765 43210" },
      });
      await settle();

      const summary = document.querySelector(
        "#qr-data-template-picker summary",
      ) as HTMLElement;
      fireEvent.click(summary);
      fireEvent.click(
        screen.getByRole("button", { name: "Use Midnight Luxe data template" }),
      );
      await settle();
      expect(
        document.querySelector('[data-qr-template-theme="midnight"]'),
      ).not.toBeNull();
      expect(screen.getByText(VERIFIED)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );
});
