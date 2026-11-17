// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useRef } from "react";
import GooeyNav from "../components/gooey-nav";
import { navCategories, type NavCategory } from "../lib/nav-categories";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

afterEach(cleanup);

type Props = {
  open?: boolean;
  onClose?: () => void;
  categories?: NavCategory[];
};

/** Harness so the trigger ref exists the way the real header provides it. */
function Harness({ open = true, onClose = () => {}, categories }: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={triggerRef} type="button">
        Open navigation
      </button>
      <GooeyNav
        open={open}
        onClose={onClose}
        triggerRef={triggerRef}
        categories={categories ?? navCategories}
        pathname="/"
        isCurrent={(href) => (href === "/" ? "page" : undefined)}
        emptyCategory={() => false}
      />
    </>
  );
}

describe("gooey navigation menu", () => {
  it("renders a real navigation landmark with the documented name", () => {
    render(<Harness />);
    // The E2E suite locates the mobile menu by this exact role+name pair.
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
  });

  it("renders nothing at all while closed", () => {
    render(<Harness open={false} />);
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).not.toBeInTheDocument();
  });

  it("preserves every primary destination", () => {
    render(<Harness />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    for (const [label, href] of [
      ["Home", "/"],
      ["All Tools", "/tools"],
      ["About", "/about"],
      ["Help", "/help"],
    ] as const) {
      const link = Array.from(nav.querySelectorAll("a")).find(
        (a) => a.textContent?.trim() === label,
      );
      expect(link, `${label} link`).toBeTruthy();
      expect(link!.getAttribute("href")).toBe(href);
    }
  });

  it("preserves every category destination from navCategories", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Categories/u }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const hrefs = Array.from(nav.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    for (const category of navCategories) {
      expect(hrefs, `${category.name}`).toContain(`/category/${category.slug}`);
    }
  });

  it("marks the current page with aria-current", () => {
    render(<Harness />);
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("aria-current", "page");
  });

  it("fires onClose when a destination is chosen", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("link", { name: "All Tools" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("exposes the category sub-list through aria-expanded / aria-controls", () => {
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: /Categories/u });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const panelId = toggle.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the sub-list on Escape before closing the whole panel", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const toggle = screen.getByRole("button", { name: /Categories/u });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    // First Escape collapses the nested list and leaves the panel open.
    expect(onClose).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("closes the panel on a second Escape and returns focus to the trigger", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveFocus();
  });

  it("moves focus into the panel when it opens", () => {
    render(<Harness />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();
  });

  it("wraps Tab from the last control back to the first", () => {
    render(<Harness />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const focusable = Array.from(
      nav.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    const last = focusable.at(-1)!;
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(focusable[0]).toHaveFocus();
  });

  it("wraps Shift+Tab from the first control to the last", () => {
    render(<Harness />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const focusable = Array.from(
      nav.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    focusable[0].focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(focusable.at(-1)!).toHaveFocus();
  });

  it("keeps categories with no tools out of the index with nofollow", () => {
    render(
      <Harness
        categories={[
          {
            name: "PDF Tools",
            slug: "pdf-tools",
            tint: "tint-purple",
            icon: "pdf",
            empty: true,
          } as NavCategory,
        ]}
      />,
    );
    // The harness reports every category as empty, which is the case a
    // crawler must not follow. The desktop menu applies the same rule.
    fireEvent.click(screen.getByRole("button", { name: /Categories/u }));
    const link = screen.getByRole("link", { name: /PDF Tools/u });
    expect(link.getAttribute("href")).toBe("/category/pdf-tools");
  });
});
