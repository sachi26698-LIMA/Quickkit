// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ToolMaintenanceGate from "@/components/tool-maintenance-gate";
import { TOOL_MAINTENANCE_DEFAULT_REASON } from "@/lib/tool-maintenance";

const nav = vi.hoisted(() => ({ pathname: "/tools/merge-pdf" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const notices = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    reason: "Adding a page-order editor. Back by 6 PM.",
    since: "2026-11-15T04:00:00.000Z",
  },
  { slug: "split-pdf", name: "Split PDF", reason: "", since: null },
];

beforeEach(() => {
  // jsdom has no modal dialog implementation.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

afterEach(() => {
  cleanup();
  nav.pathname = "/tools/merge-pdf";
  document.body.style.overflow = "";
});

describe("visitor notice for a switched-off tool", () => {
  it("opens a modal notice with the tool name and the administrator's reason", () => {
    render(<ToolMaintenanceGate notices={notices} />);
    const dialog = document.querySelector<HTMLDialogElement>(
      'dialog[data-tool-maintenance="merge-pdf"]',
    )!;
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Merge PDF is temporarily off" }),
    ).toBeTruthy();
    expect(screen.getByText("Work in progress")).toBeTruthy();
    expect(
      screen.getByText("Adding a page-order editor. Back by 6 PM."),
    ).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("offers ways out but no way to dismiss the notice for ordinary visitors", () => {
    render(<ToolMaintenanceGate notices={notices} />);
    expect(
      screen
        .getByRole("link", { name: /Browse other tools/ })
        .getAttribute("href"),
    ).toBe("/tools");
    expect(
      screen.getByRole("link", { name: /Back to home/ }).getAttribute("href"),
    ).toBe("/");
    expect(screen.queryByRole("button")).toBeNull();
    const dialog = document.querySelector("dialog")!;
    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
  });

  it("uses the default wording when no reason was written", () => {
    nav.pathname = "/tools/split-pdf";
    render(<ToolMaintenanceGate notices={notices} />);
    expect(
      screen.getByRole("heading", { name: "Split PDF is temporarily off" }),
    ).toBeTruthy();
    expect(screen.getByText(TOOL_MAINTENANCE_DEFAULT_REASON)).toBeTruthy();
  });

  it("renders nothing on tools that are on and on the tools index", () => {
    for (const pathname of ["/tools/qr-code-generator", "/tools", "/"]) {
      nav.pathname = pathname;
      const { container } = render(<ToolMaintenanceGate notices={notices} />);
      expect(container.querySelector("dialog"), pathname).toBeNull();
      cleanup();
    }
    expect(document.body.style.overflow).toBe("");
  });

  it("lets a signed-in administrator preview the tool and bring the notice back", () => {
    render(<ToolMaintenanceGate notices={notices} adminPreview />);
    fireEvent.click(
      screen.getByRole("button", { name: /Preview the tool as administrator/ }),
    );
    expect(document.querySelector("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByRole("status").textContent).toContain(
      "Merge PDF is switched off.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Show notice" }));
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  });
});
