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

const VERIFIED = "Verified by an independent decoder";
const BLOCKED = "Not scannable — export is blocked";
const TEST_TIMEOUT = 30_000;

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

  it("offers all twenty-seven content types in one compact picker", () => {
    render(<QrGenerator />);
    const select = screen.getByLabelText(
      "QR content type",
    ) as HTMLSelectElement;
    const labels = [...select.options].map((option) =>
      (option.textContent ?? "").replace(/\u2011/g, "-"),
    );
    expect(labels).toEqual([
      "Website URL",
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
    "renders a URL and decodes it back to the same text",
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
      expect(
        screen.getByText("https://example.com/pricing?src=qr#top"),
      ).toBeInTheDocument();
      expect(screen.getByText(/v\d+ · \d+×\d+/)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    "escapes Wi-Fi punctuation and dots out the password on screen",
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

  it("splits the workspace into four tabs and the design card into five", () => {
    render(<QrGenerator />);
    expect(screen.getAllByRole("tab")).toHaveLength(9);
    for (const name of [/Create QR/, /Bulk \(CSV\)/, /^History/, /^Presets/])
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    for (const name of [
      /^Colours/,
      /^Pattern/,
      /^Corners/,
      /^Logo/,
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
