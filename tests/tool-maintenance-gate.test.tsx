// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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

function setAuthCookie(value = "session") {
  document.cookie = `quickkit-auth-token.0=${value}; path=/`;
}

async function settleSessionProbe() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function mockSessionResponse(
  body: string,
  status = 200,
  contentType = "application/json",
) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, {
      status,
      headers: { "content-type": contentType },
    }),
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response('{"authorized":false}', {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
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
  document.cookie = "quickkit-auth-token=; Max-Age=0; path=/";
  document.cookie = "quickkit-auth-token.0=; Max-Age=0; path=/";
  vi.restoreAllMocks();
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

  it("checks public visitors through the same-origin endpoint but never exposes preview controls", async () => {
    const fetchSpy = vi.mocked(globalThis.fetch);
    render(<ToolMaintenanceGate notices={notices} />);
    expect(fetchSpy).toHaveBeenCalledWith("/api/admin/session", {
      credentials: "same-origin",
    });
    await settleSessionProbe();
    expect(
      screen.queryByRole("button", {
        name: /Preview the tool as administrator/,
      }),
    ).toBeNull();
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  });

  it.each([
    ["HTTP 200 unauthorized", '{"authorized":false}', 200],
    ["missing authorization property", "{}", 200],
    ["malformed JSON", "not-json", 200],
    ["HTTP 401", '{"authorized":true}', 401],
    ["HTTP 403", '{"authorized":true}', 403],
    ["other unsuccessful response", '{"authorized":true}', 500],
  ])("fails closed for %s", async (_label, body, status) => {
    setAuthCookie();
    const fetchSpy = mockSessionResponse(body, status);
    render(<ToolMaintenanceGate notices={notices} />);

    expect(fetchSpy).toHaveBeenCalledWith("/api/admin/session", {
      credentials: "same-origin",
    });
    await settleSessionProbe();
    expect(
      screen.queryByRole("button", {
        name: /Preview the tool as administrator/,
      }),
    ).toBeNull();
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  });

  it("fails closed for forged cookies and expired admin sessions", async () => {
    for (const token of ["forged-token", "expired-token"]) {
      setAuthCookie(token);
      mockSessionResponse('{"authorized":false}');
      const { unmount } = render(<ToolMaintenanceGate notices={notices} />);
      await settleSessionProbe();
      expect(
        screen.queryByRole("button", {
          name: /Preview the tool as administrator/,
        }),
      ).toBeNull();
      expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(true);
      unmount();
      vi.restoreAllMocks();
    }
  });

  it("fails closed when the session probe has a network error", async () => {
    setAuthCookie();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<ToolMaintenanceGate notices={notices} />);
    await settleSessionProbe();
    expect(
      screen.queryByRole("button", {
        name: /Preview the tool as administrator/,
      }),
    ).toBeNull();
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  });

  it("lets a genuinely authorized administrator preview and restore the notice", async () => {
    setAuthCookie();
    const fetchSpy = mockSessionResponse('{"authorized":true}');
    render(<ToolMaintenanceGate notices={notices} />);

    expect(fetchSpy).toHaveBeenCalledWith("/api/admin/session", {
      credentials: "same-origin",
    });
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Preview the tool as administrator/,
      }),
    );
    expect(document.querySelector("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByRole("status").textContent).toContain(
      "Merge PDF is switched off.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Show notice" }));
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  });

  it("keeps ToolsLayout free of request cookie access", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const layoutSource = readFileSync(
      join(process.cwd(), "app/(public)/tools/layout.tsx"),
      "utf8",
    );
    expect(layoutSource).not.toContain("next/headers");
    expect(layoutSource).not.toContain("cookies(");
  });
});
