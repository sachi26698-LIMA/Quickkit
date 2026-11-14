// @vitest-environment jsdom
/**
 * Batch code checker UI, brand directory and brand records.
 *
 * These drive the real engine through the real form: a brand must be chosen,
 * the verdict label must match the decoder that ran, and the estimate must be
 * labelled as an estimate rather than blending into the printed date.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const navState = vi.hoisted(() => ({ search: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navState.search,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tools/batch-code-checker",
}));

import BatchChecker from "../components/tools/batch-code-checker";
import BrandDirectory from "../components/tools/batch-code-checker/brand-directory";
import BrandPage, {
  generateMetadata,
  generateStaticParams,
} from "../app/tools/batch-code-checker/brand/[slug]/page";
import { BRANDS } from "../lib/tools/batch-code/brands";

beforeEach(() => {
  navState.search = new URLSearchParams();
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/tools/batch-code-checker");
});

function chooseBrand(name: string) {
  const combo = screen.getByRole("combobox", { name: "Brand" });
  fireEvent.change(combo, { target: { value: name } });
  const option = screen.getByRole("option", { name: new RegExp(`^${name}`) });
  fireEvent.mouseDown(option);
}

function fillCode(value: string) {
  fireEvent.change(screen.getByLabelText(/Batch \/ lot code/i), {
    target: { value },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /CHECK BATCH CODE/i }));
}

describe("batch code checker form", () => {
  it("fills the brand field from a ?brand= shared link", () => {
    window.history.replaceState(
      null,
      "",
      "/tools/batch-code-checker?brand=cerave",
    );
    render(<BatchChecker />);
    expect(screen.getByRole("combobox", { name: "Brand" })).toHaveValue(
      "CeraVe",
    );
  });

  it("refuses to check without a brand and explains why", () => {
    render(<BatchChecker />);
    fillCode("28H300");
    submit();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/Pick a brand from the list/i);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("refuses a code with characters a lot number does not use", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("<script>");
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(
      /characters a printed lot number does not use/i,
    );
  });

  it("rejects an inverted date range and a future opened date", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("28H300");
    fireEvent.change(screen.getByLabelText(/Printed manufacture date/i), {
      target: { value: "2026-05-01" },
    });
    fireEvent.change(screen.getByLabelText(/Printed expiry date/i), {
      target: { value: "2026-04-01" },
    });
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(
      /cannot be earlier than the manufacture date/i,
    );

    fireEvent.change(screen.getByLabelText(/Printed expiry date/i), {
      target: { value: "2027-04-01" },
    });
    fireEvent.change(screen.getByLabelText(/Opened date/i), {
      target: { value: "2030-01-01" },
    });
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(
      /cannot be in the future/i,
    );
  });

  it("returns NOT DECODABLE for an opaque lot number", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("28H300");
    submit();
    const result = screen.getByRole("status");
    expect(within(result).getByText("NOT DECODABLE")).toBeInTheDocument();
    expect(result.textContent).toMatch(/No reliable decoder/i);
    expect(
      screen.getByText(/cannot be decoded for Nivea/i),
    ).toBeInTheDocument();
    // Three separate cards, each with its own honest empty state.
    expect(
      screen.getByText(/No estimate: it needs a manufacture date/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Not calculated\. Enter the opened date/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/No governing date/i)).toBeInTheDocument();
    // The explanation block is present, including the PAO symbol.
    expect(
      screen.getByText(/Why this code cannot be decoded/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/open-jar symbol \(PAO\)/i)).toBeInTheDocument();
  });

  it("reads a GS1 element string without claiming the code cannot be decoded", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("(01)09506000134352(17)270930(10)LOT-9");
    submit();
    const result = screen.getByRole("status");
    expect(within(result).getByText("VERIFIED")).toBeInTheDocument();
    expect(result.textContent).toMatch(/GS1 element string/i);
    expect(
      screen.getByText(/Date fields carried by the code/i),
    ).toBeInTheDocument();
    // The date appears twice on purpose: once in the decoded-field list and
    // once as the date that governs.
    expect(screen.getAllByText(/30 Sep 2027/).length).toBeGreaterThan(0);
    // A brand with no published lot-code rule must not be described as
    // undecodable when its code was read as a GS1 carrier.
    expect(
      screen.queryByText(/Why this code cannot be decoded/i),
    ).not.toBeInTheDocument();
  });

  it("verifies a printed expiry and lets it govern every estimate", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("28H300");
    fireEvent.change(screen.getByLabelText(/Printed manufacture date/i), {
      target: { value: "2024-01-15" },
    });
    fireEvent.change(screen.getByLabelText(/Printed expiry date/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/Opened date/i), {
      target: { value: "2025-06-01" },
    });
    fireEvent.change(screen.getByLabelText(/PAO/i), { target: { value: "6" } });
    submit();

    expect(screen.getByText("15 Jan 2024")).toBeInTheDocument();
    expect(screen.getAllByText("1 Jan 2026").length).toBeGreaterThan(0);
    expect(screen.getByText("15 Jan 2027")).toBeInTheDocument(); // manufacture + 36 months
    expect(screen.getByText("1 Dec 2025")).toBeInTheDocument(); // opened + 6M
    expect(screen.getByText(/already passed/i)).toBeInTheDocument();
    expect(screen.getByText(/period after opening ended/i)).toBeInTheDocument();
    expect(screen.getByText("printed")).toBeInTheDocument();
    expect(
      screen.getByText(/Printed dates take precedence/i),
    ).toBeInTheDocument();
  });

  it("labels a shelf-life calculation as an estimate", () => {
    render(<BatchChecker />);
    chooseBrand("CeraVe");
    fillCode("28H300");
    fireEvent.change(screen.getByLabelText(/Printed manufacture date/i), {
      target: { value: "2024-01-15" },
    });
    submit();
    expect(screen.getAllByText("15 Jan 2027").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Manufacture date \+ 36 months/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Estimate").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/guidance, not a manufacturer statement/i),
    ).toBeInTheDocument();
  });

  it("lists every reading when the code's digits are ambiguous", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("240506");
    submit();
    expect(screen.getByRole("status").textContent).toMatch(/ESTIMATED/);
    expect(
      screen.getByText(/Every date-shaped reading in this code/i),
    ).toBeInTheDocument();
    expect(screen.getByText("6 May 2024")).toBeInTheDocument();
    expect(screen.getByText("24 May 2006")).toBeInTheDocument();
  });

  it("flags a GTIN instead of treating it as a batch", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("4006381333931");
    submit();
    expect(screen.getByText(/looks like a GTIN/i)).toBeInTheDocument();
  });

  it("preselects a brand from the brand record link", () => {
    // The preset is read from `window.location`, not `useSearchParams`, so the
    // page can render its form statically instead of inside a Suspense boundary.
    window.history.replaceState(
      null,
      "",
      "/tools/batch-code-checker?brand=cerave",
    );
    render(<BatchChecker />);
    expect(screen.getByRole("combobox", { name: "Brand" })).toHaveValue(
      "CeraVe",
    );
    expect(screen.getByText(/Brand selected/i)).toBeInTheDocument();
  });
});

describe("brand directory", () => {
  it("lists every record with a truthful decoder status", () => {
    render(<BrandDirectory />);
    expect(
      screen.getByRole("heading", { name: "Brand directory" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`${BRANDS.length} records · 0 brand-specific decoders`),
      ),
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(BRANDS.length);
    expect(screen.getByRole("link", { name: "Nivea" })).toHaveAttribute(
      "href",
      "/tools/batch-code-checker/brand/nivea",
    );
  });

  it("filters by name and by category", () => {
    render(<BrandDirectory />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "minimalist" },
    });
    expect(
      screen.getByRole("link", { name: "Minimalist" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nivea" })).toBeNull();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Fragrance \(/ }));
    expect(screen.getByRole("link", { name: "Chanel" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nivea" })).toBeNull();
  });

  it("says so when nothing matches instead of inventing a brand", () => {
    render(<BrandDirectory />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzzznotabrand" },
    });
    expect(
      screen.getByText(/No record matches that filter/i),
    ).toBeInTheDocument();
  });
});

describe("brand records", () => {
  it("builds one static page per brand record", () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(BRANDS.length);
    expect(params.map((entry) => entry.slug)).toContain("la-roche-posay");
  });

  it("states the record's decoder status and limitation", async () => {
    const element = await BrandPage({
      params: Promise.resolve({ slug: "nivea" }),
    });
    render(element);
    expect(
      screen.getByRole("heading", { level: 1, name: /Nivea batch codes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No brand-specific decoder documented/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Decoder record")).toBeInTheDocument();
    expect(
      screen.getByText(/Never reviewed against a manufacturer document/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Check a Nivea code/i }),
    ).toHaveAttribute("href", "/tools/batch-code-checker?brand=nivea");
    // The FAQ is on the page and in structured data.
    expect(
      screen.getByText(/Can I decode a Nivea batch code/i),
    ).toBeInTheDocument();
    // The visible breadcrumb is the same trail the structured data describes.
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
  });

  it("gives each brand a distinct title and description", async () => {
    const nivea = await generateMetadata({
      params: Promise.resolve({ slug: "nivea" }),
    });
    const cerave = await generateMetadata({
      params: Promise.resolve({ slug: "cerave" }),
    });
    expect(nivea.title).not.toEqual(cerave.title);
    expect(nivea.description).not.toEqual(cerave.description);
    expect(String(nivea.title)).toContain("Nivea");
  });

  it("returns not-found for a slug with no record", async () => {
    await expect(
      BrandPage({ params: Promise.resolve({ slug: "no-such-brand" }) }),
    ).rejects.toThrow();
  });
});

describe("GS1 carriers in the checker form", () => {
  it("shows every date field a GS1 element string carries", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("(01)09501101530003(11)260101(15)260630(17)270101(10)LOT-7");
    submit();
    expect(
      within(screen.getByRole("status")).getByText("VERIFIED"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Date fields carried by the code/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Production date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Best-before date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Expiration date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI 17/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 Jan 2027/).length).toBeGreaterThan(0);
  });

  it("accepts a pasted GS1 Digital Link URI", () => {
    render(<BatchChecker />);
    chooseBrand("Nivea");
    fillCode("https://id.gs1.org/01/09501101530003/17/251231/10/AB-12");
    submit();
    expect(
      within(screen.getByRole("status")).getByText("VERIFIED"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/GS1 Digital Link/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/the link itself was not opened/i),
    ).toBeInTheDocument();
  });
});
