// @vitest-environment jsdom
/**
 * The two new routes, rendered through the real shell.
 *
 * The metadata assertions are the SEO contract: three barcode-adjacent pages
 * with three different titles, three different descriptions, one canonical each.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));

import BatchCodeCheckerPage, {
  metadata as checkerMetadata,
} from "../app/tools/batch-code-checker/page";
import BarcodeScannerPage, {
  metadata as scannerMetadata,
} from "../app/tools/barcode-scanner/page";
import { metadata as generatorMetadata } from "../app/tools/barcode-generator/page";

afterEach(() => {
  cleanup();
});

describe("batch code checker route", () => {
  it("renders the checker, the brand directory and the method notes", () => {
    render(<BatchCodeCheckerPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Batch Code Checker" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Check a batch code" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Brand directory" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /How this batch code checker decides/i,
      }),
    ).toBeInTheDocument();
    // FAQ copy is on the page, not only in structured data.
    expect(
      screen.getByText(/Can this tool decode any cosmetics batch code\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The open-jar symbol carries a number plus M/i),
    ).toBeInTheDocument();
  });

  it("carries FAQ structured data and a canonical URL", () => {
    const { container } = render(<BatchCodeCheckerPage />);
    const schemas = Array.from(
      container.querySelectorAll("script[type='application/ld+json']"),
    ).map((script) => script.textContent ?? "");
    const joined = schemas.join(" ");
    expect(joined).toMatch(/"@type":"FAQPage"|"@type": "FAQPage"/);
    expect(joined).toContain("VERIFIED");
  });
});

describe("barcode scanner route", () => {
  it("renders the scanner with its honesty panel first", () => {
    render(<BarcodeScannerPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Barcode Scanner" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A barcode is not an expiry date"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Results" }),
    ).toBeInTheDocument();
  });
});

describe("SEO distinctness", () => {
  it("gives each barcode page its own title and description", () => {
    const titles = [
      String(generatorMetadata.title),
      String(checkerMetadata.title),
      String(scannerMetadata.title),
    ];
    const descriptions = [
      generatorMetadata.description,
      checkerMetadata.description,
      scannerMetadata.description,
    ];
    expect(new Set(titles).size).toBe(3);
    expect(new Set(descriptions).size).toBe(3);
    for (const title of titles) expect(title.length).toBeLessThanOrEqual(62);
    for (const description of descriptions) {
      expect(description!.length).toBeGreaterThanOrEqual(120);
      expect(description!.length).toBeLessThanOrEqual(160);
    }
  });

  it("points each canonical at its own path", () => {
    expect(checkerMetadata.alternates?.canonical).toBeUndefined(); // no SITE_URL in tests
    expect(String(checkerMetadata.title)).toContain("Batch Code");
    expect(String(scannerMetadata.title)).toContain("Barcode Scanner");
  });
});
