// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

import HeroSearch from "../components/hero-search";

afterEach(cleanup);

const tools = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Combine PDFs",
    keywords: "pdf merge",
    category: "PDF Tools",
    icon: "pdf",
    color: "#000",
  },
  {
    slug: "qr-generator",
    name: "QR Generator",
    description: "Make QR",
    keywords: "qr code",
    category: "QR",
    icon: "qr",
    color: "#000",
  },
] as never;

/**
 * Regression guard for the deferred-search flash.
 *
 * `useDeferredValue` lags the typed value by a render. The filter originally
 * gated on "has the visitor typed something" (`searching`, from the *live*
 * query) while filtering by the *deferred* value. In between, the deferred
 * value is still "" — and `String.includes("")` is true for every string — so
 * the panel briefly offered the entire catalogue as "matches" before narrowing.
 *
 * The fix gates the filter on the deferred term itself, so the list is empty
 * rather than wrong during that window.
 */
describe("hero search deferred filtering", () => {
  it("never shows every tool as a match while the query is still settling", () => {
    render(<HeroSearch tools={tools} />);
    const input = screen.getByLabelText("Search tools");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zzzz" } });

    // "zzzz" matches nothing. Any result link here would have come from the
    // empty-string match, i.e. the whole catalogue.
    expect(document.querySelectorAll(".search-result")).toHaveLength(0);
    // Scope to the visible panel: the screen-reader status carries the same
    // wording, so an unscoped text query matches twice by design.
    const panel = document.querySelector(".search-panel");
    expect(panel?.textContent).toMatch(/No tools match/u);
  });

  it("narrows to the real match once settled", () => {
    render(<HeroSearch tools={tools} />);
    const input = screen.getByLabelText("Search tools");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "pdf" } });

    const links = document.querySelectorAll(".search-result");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Merge PDF");
  });

  it("keeps the typed value in the input, not the deferred one", () => {
    render(<HeroSearch tools={tools} />);
    const input = screen.getByLabelText("Search tools") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "qr" } });
    // A deferred value must never be written back into the control, or typing
    // would lag visibly behind the keyboard.
    expect(input.value).toBe("qr");
  });
});
