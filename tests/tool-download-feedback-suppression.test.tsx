// @vitest-environment jsdom
/**
 * Decision (2026-11-16): once a visitor has sent a rating for a tool, that tool
 * stops inviting one — for good, not just for the 24-hour cooldown. These tests
 * drive the real dialog component so they prove the *gate*, not just the helper:
 * a library that is wired up wrongly would still re-prompt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ToolDownloadFeedback from "@/components/tool-download-feedback";
import { TOOL_FEEDBACK_REVIEWED_KEY } from "@/lib/tool-feedback";

const nav = vi.hoisted(() => ({ pathname: "/tools/case-converter" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const PROMPT_KEY = "quickkit-tool-feedback-prompted-v1";
const DAY_MS = 24 * 60 * 60 * 1000;
/** Matches the preserved 650 ms debounce in the component. */
const DEBOUNCE_MS = 650;

const store = new Map<string, string>();

function clickDownload() {
  const anchor = document.createElement("a");
  anchor.href = "blob:quickkit";
  anchor.setAttribute("download", "result.pdf");
  document.body.append(anchor);
  // The listener is registered in the capture phase on document.
  fireEvent.click(anchor);
  anchor.remove();
}

beforeEach(() => {
  store.clear();
  nav.pathname = "/tools/case-converter";
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
  // The component reads window.localStorage, so replace it on window itself.
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the rating invitation respects a tool that was already rated", () => {
  it("invites a first-time visitor who downloads a file", async () => {
    vi.useFakeTimers();
    render(<ToolDownloadFeedback />);
    clickDownload();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    const dialog = document.querySelector("dialog[data-feedback-tool]")!;
    expect(dialog.hasAttribute("open")).toBe(true);
  });

  it("stays silent after a rating was sent, even a day later", async () => {
    // A day-old invitation: the 24-hour cooldown has expired, so only the
    // reviewed record can keep the dialog shut.
    store.set(
      PROMPT_KEY,
      JSON.stringify({ "case-converter": Date.now() - DAY_MS - 1000 }),
    );
    store.set(
      TOOL_FEEDBACK_REVIEWED_KEY,
      JSON.stringify({ "case-converter": Date.now() - DAY_MS - 1000 }),
    );
    vi.useFakeTimers();
    render(<ToolDownloadFeedback />);
    clickDownload();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 200);
    });
    const dialog = document.querySelector("dialog[data-feedback-tool]")!;
    expect(dialog.hasAttribute("open")).toBe(false);
  });

  it("still invites for a different tool in the same browser", async () => {
    store.set(
      TOOL_FEEDBACK_REVIEWED_KEY,
      JSON.stringify({ "case-converter": Date.now() - DAY_MS - 1000 }),
    );
    nav.pathname = "/tools/word-counter";
    vi.useFakeTimers();
    render(<ToolDownloadFeedback />);
    clickDownload();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    const dialog = document.querySelector("dialog[data-feedback-tool]")!;
    expect(dialog.getAttribute("data-feedback-tool")).toBe("word-counter");
    expect(dialog.hasAttribute("open")).toBe(true);
  });

  it("records the review when the rating is accepted, and never again after", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);
    render(<ToolDownloadFeedback />);
    clickDownload();
    // Real timers here: waiting 650 ms keeps the genuine debounce path.
    await waitFor(
      () => expect(document.querySelector("dialog[open]")).not.toBeNull(),
      { timeout: 3000 },
    );
    const radio = screen.getByRole("radio", { name: /4 stars/ });
    fireEvent.click(radio);
    fireEvent.click(screen.getByRole("button", { name: "Send my feedback" }));
    // The card records that it finished, exactly as the E2E flow asserts.
    await waitFor(() =>
      expect(document.querySelector("[data-tool-feedback]")).toHaveAttribute(
        "data-step",
        "thanks",
      ),
    );
    // What was uploaded is unchanged by the suppression work.
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      tool: "case-converter",
      rating: 4,
      tags: [],
      comment: "",
      consent: true,
    });
    // Only the slug and a timestamp are remembered here.
    const remembered = JSON.parse(
      store.get(TOOL_FEEDBACK_REVIEWED_KEY) ?? "{}",
    );
    expect(Object.keys(remembered)).toEqual(["case-converter"]);
    expect(typeof remembered["case-converter"]).toBe("number");
  });

  it("does not record a review when the server rejects the rating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    render(<ToolDownloadFeedback />);
    clickDownload();
    await waitFor(
      () => expect(document.querySelector("dialog[open]")).not.toBeNull(),
      { timeout: 3000 },
    );
    fireEvent.click(screen.getByRole("radio", { name: /4 stars/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send my feedback" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    // Nothing was delivered, so the tool must still be able to ask again.
    expect(store.get(TOOL_FEEDBACK_REVIEWED_KEY)).toBeUndefined();
  });
});
