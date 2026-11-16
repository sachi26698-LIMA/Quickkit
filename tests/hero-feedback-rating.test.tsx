// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import HeroFeedback from "@/components/hero-feedback";

const KEY = "quickkit-hero-feedback-v1";

beforeEach(() => {
  // jsdom has no modal dialog implementation.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function openForm() {
  render(<HeroFeedback />);
  fireEvent.click(screen.getByRole("button", { name: /Share feedback/ }));
  return screen.getByRole("dialog");
}
const stored = () => JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
const star = (dialog: HTMLElement, name: RegExp) =>
  within(dialog).getByRole("radio", { name });

describe("homepage feedback form: star rating", () => {
  it("offers five named stars, none chosen, and no options until one is", () => {
    const dialog = openForm();
    const stars = within(dialog).getAllByRole("radio");
    expect(stars.map((input) => input.getAttribute("aria-label"))).toEqual([
      "1 star — Disappointing",
      "2 stars — Could be better",
      "3 stars — It was okay",
      "4 stars — Really good",
      "5 stars — Loved it!",
    ]);
    expect(stars.every((input) => !(input as HTMLInputElement).checked)).toBe(
      true,
    );
    expect(
      within(dialog).getByRole("group", {
        name: /How would you rate QUICKKIT/,
      }),
    ).toBeTruthy();
    expect(within(dialog).getByText("Tap a star to rate")).toBeTruthy();
    expect(
      within(dialog).queryByRole("checkbox", { name: /Easy to use/ }),
    ).toBeNull();
    expect(
      within(dialog).queryByRole("button", { name: "Clear rating" }),
    ).toBeNull();
  });

  it("shows praise options for a high rating and improvement options for a low one", () => {
    const dialog = openForm();
    fireEvent.click(star(dialog, /^5 stars/));
    expect(within(dialog).getByText("5/5 · Loved it!")).toBeTruthy();
    expect(
      within(dialog).getByRole("group", { name: /What did you like/ }),
    ).toBeTruthy();
    for (const tag of [
      "Easy to use",
      "Useful tools",
      "Fast & smooth",
      "Beautiful design",
    ])
      expect(within(dialog).getByRole("checkbox", { name: tag })).toBeTruthy();
    expect(
      within(dialog).queryByRole("checkbox", { name: "Too slow" }),
    ).toBeNull();

    fireEvent.click(star(dialog, /^2 stars/));
    expect(within(dialog).getByText("2/5 · Could be better")).toBeTruthy();
    expect(
      within(dialog).getByRole("group", { name: /What should we improve/ }),
    ).toBeTruthy();
    for (const tag of [
      "Hard to use",
      "Too slow",
      "Something broke",
      "Missing a tool",
    ])
      expect(within(dialog).getByRole("checkbox", { name: tag })).toBeTruthy();
    expect(
      within(dialog).queryByRole("checkbox", { name: "Easy to use" }),
    ).toBeNull();
  });

  it("drops ticked options that no longer fit when the rating changes group", () => {
    const dialog = openForm();
    fireEvent.click(star(dialog, /^5 stars/));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Easy to use" }),
    );
    // 5 → 4 stays in the praise group: the tick is kept.
    fireEvent.click(star(dialog, /^4 stars/));
    expect(
      (
        within(dialog).getByRole("checkbox", {
          name: "Easy to use",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    // 4 → 1 changes group: nothing from the praise group may be saved.
    fireEvent.click(star(dialog, /^1 star /));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Too slow" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(stored()).toEqual([
      { name: "", message: "", rating: 1, tags: ["Too slow"] },
    ]);
  });

  it("clears the rating and its options on request", () => {
    const dialog = openForm();
    fireEvent.click(star(dialog, /^3 stars/));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Missing a tool" }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Clear rating" }),
    );
    expect(
      within(dialog)
        .getAllByRole("radio")
        .every((input) => !(input as HTMLInputElement).checked),
    ).toBe(true);
    expect(
      within(dialog).queryByRole("checkbox", { name: "Missing a tool" }),
    ).toBeNull();
    expect(within(dialog).getByText("Tap a star to rate")).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText(/Your feedback/), {
      target: { value: "Just words." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(stored()).toEqual([
      { name: "", message: "Just words.", rating: 0, tags: [] },
    ]);
  });
});

describe("homepage feedback form: saving on this device", () => {
  it("asks for a rating or a message when neither is given, and saves nothing", () => {
    const dialog = openForm();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(within(dialog).getByRole("alert").textContent).toBe(
      "Please choose a star rating or write your feedback.",
    );
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(dialog.hasAttribute("open")).toBe(true);
    // Choosing a star is enough to clear the error.
    fireEvent.click(star(dialog, /^4 stars/));
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  it("saves a rating without any message and shows it on the laptop card", async () => {
    const dialog = openForm();
    fireEvent.click(star(dialog, /^5 stars/));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Useful tools" }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(stored()).toEqual([
      { name: "", message: "", rating: 5, tags: ["Useful tools"] },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const card = screen.getByRole("region", { name: "User Feedback" });
    expect(within(card).getByText("Anonymous")).toBeTruthy();
    expect(
      within(card).getByRole("img", { name: "5 out of 5 stars" }),
    ).toBeTruthy();
    // With no message, the card says what the rating means.
    expect(within(card).getByText("Loved it! · Useful tools")).toBeTruthy();
    expect(within(card).queryByText("No feedback yet")).toBeNull();
  });

  it("saves name, message, rating and options together, newest first", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([{ name: "Old", message: "From before ratings." }]),
    );
    const dialog = openForm();
    fireEvent.click(star(dialog, /^4 stars/));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Easy to use" }),
    );
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Beautiful design" }),
    );
    fireEvent.change(within(dialog).getByLabelText(/^Name/), {
      target: { value: "Asha" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Your feedback/), {
      target: { value: "Clear and easy to use." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(stored()).toEqual([
      {
        name: "Asha",
        message: "Clear and easy to use.",
        rating: 4,
        tags: ["Easy to use", "Beautiful design"],
      },
      { name: "Old", message: "From before ratings.", rating: 0, tags: [] },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const card = screen.getByRole("region", { name: "User Feedback" });
    expect(within(card).getByText("Clear and easy to use.")).toBeTruthy();
    expect(
      within(card).getAllByRole("img", { name: /out of 5 stars/ }),
    ).toHaveLength(1);
    expect(within(card).getByText("From before ratings.")).toBeTruthy();
  });

  it("lists saved ratings in the form and lets the visitor delete one", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([
        { name: "Asha", message: "", rating: 2, tags: ["Too slow"] },
        { name: "", message: "Plain note." },
      ]),
    );
    const dialog = openForm();
    const saved = within(dialog).getByRole("region", {
      name: "Saved feedback",
    });
    expect(
      within(saved).getByRole("img", { name: "2 out of 5 stars" }),
    ).toBeTruthy();
    expect(within(saved).getByText("Could be better")).toBeTruthy();
    expect(within(saved).getByText("Too slow")).toBeTruthy();
    expect(within(saved).getByText("Plain note.")).toBeTruthy();
    fireEvent.click(
      within(saved).getByRole("button", { name: "Delete feedback 1" }),
    );
    expect(stored()).toEqual([
      { name: "", message: "Plain note.", rating: 0, tags: [] },
    ]);
  });

  it("says so, and keeps the form open, when the browser refuses to store it", () => {
    const dialog = openForm();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "QuotaExceededError");
    });
    fireEvent.click(star(dialog, /^5 stars/));
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(within(dialog).getByRole("alert").textContent).toMatch(
      /Could not save feedback in this browser/,
    );
    expect(dialog.hasAttribute("open")).toBe(true);
  });
});

describe("homepage feedback form: sending privately", () => {
  function stubSend(response: { ok: boolean; status?: number; body: unknown }) {
    const fetchMock = vi.fn(async () => ({
      ok: response.ok,
      status: response.status ?? (response.ok ? 201 : 503),
      json: async () => response.body,
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }
  const sentBody = (fetchMock: ReturnType<typeof stubSend>) => {
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    return { url, method: init.method, body: JSON.parse(String(init.body)) };
  };

  it("sends nothing to the server unless the visitor opts in", () => {
    const fetchMock = stubSend({ ok: true, body: { ok: true } });
    const dialog = openForm();
    fireEvent.click(star(dialog, /^5 stars/));
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stored()).toHaveLength(1);
  });

  it("sends the rating and options with the message once opted in", async () => {
    const fetchMock = stubSend({ ok: true, body: { ok: true } });
    const dialog = openForm();
    fireEvent.click(star(dialog, /^4 stars/));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Fast & smooth" }),
    );
    fireEvent.change(within(dialog).getByLabelText(/^Name/), {
      target: { value: "Asha" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Your feedback/), {
      target: { value: "Quick and tidy." },
    });
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: /Send this feedback privately to QUICKKIT/,
      }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Send privately/ }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock)).toEqual({
      url: "/api/feedback",
      method: "POST",
      body: {
        name: "Asha",
        message: "Quick and tidy.",
        rating: 4,
        tags: ["Fast & smooth"],
        consent: true,
      },
    });
    expect(
      await screen.findByText(
        "Feedback was sent privately to QUICKKIT and saved in this browser.",
      ),
    ).toBeTruthy();
    expect(stored()).toEqual([
      {
        name: "Asha",
        message: "Quick and tidy.",
        rating: 4,
        tags: ["Fast & smooth"],
      },
    ]);
  });

  it("sends a rating on its own, with an empty message", async () => {
    const fetchMock = stubSend({ ok: true, body: { ok: true } });
    const dialog = openForm();
    fireEvent.click(star(dialog, /^1 star /));
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: /Send this feedback privately to QUICKKIT/,
      }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Send privately/ }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock).body).toEqual({
      name: "",
      message: "",
      rating: 1,
      tags: [],
      consent: true,
    });
  });

  it("sends a plain message with no rating fields at all", async () => {
    const fetchMock = stubSend({ ok: true, body: { ok: true } });
    const dialog = openForm();
    fireEvent.change(within(dialog).getByLabelText(/Your feedback/), {
      target: { value: "Only words." },
    });
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: /Send this feedback privately to QUICKKIT/,
      }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Send privately/ }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock).body).toEqual({
      name: "",
      message: "Only words.",
      consent: true,
    });
  });

  it("shows the server's reason, saves nothing and keeps the answers when sending fails", async () => {
    const fetchMock = stubSend({
      ok: false,
      status: 503,
      body: {
        ok: false,
        error:
          "The feedback service is temporarily unavailable. Your feedback was not sent.",
      },
    });
    const dialog = openForm();
    fireEvent.click(star(dialog, /^5 stars/));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Easy to use" }),
    );
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: /Send this feedback privately to QUICKKIT/,
      }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Send privately/ }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((await within(dialog).findByRole("alert")).textContent).toBe(
      "The feedback service is temporarily unavailable. Your feedback was not sent.",
    );
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(dialog.hasAttribute("open")).toBe(true);
    expect((star(dialog, /^5 stars/) as HTMLInputElement).checked).toBe(true);
    expect(
      (
        within(dialog).getByRole("checkbox", {
          name: "Easy to use",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      screen.queryByText(/Feedback was sent privately to QUICKKIT/),
    ).toBeNull();
  });
});

describe("homepage feedback form: About, tool reviews and reopening", () => {
  const aboutOption = (dialog: HTMLElement, name: string) =>
    within(dialog).findByRole("option", { name });

  it("offers every tool under About and saves the chosen one", async () => {
    const dialog = openForm();
    const about = within(dialog).getByLabelText("About") as HTMLSelectElement;
    expect(about.value).toBe("");
    expect(
      within(dialog).getByRole("option", { name: "QUICKKIT overall" }),
    ).toBeTruthy();
    await aboutOption(dialog, "PDF Merger");
    fireEvent.change(about, { target: { value: "merge-pdf" } });
    fireEvent.click(star(dialog, /^5 stars/));
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(stored()).toEqual([
      { name: "", message: "", rating: 5, tags: [], tool: "merge-pdf" },
    ]);
  });

  it("leaves the tool out of the saved copy for QUICKKIT overall", () => {
    const dialog = openForm();
    fireEvent.change(within(dialog).getByLabelText(/Your feedback/), {
      target: { value: "Overall note." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Add feedback/ }),
    );
    expect(stored()).toEqual([
      { name: "", message: "Overall note.", rating: 0, tags: [] },
    ]);
  });

  it("sends the chosen tool only when one is chosen", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ ok: true }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const dialog = openForm();
    await aboutOption(dialog, "PDF Splitter");
    fireEvent.change(within(dialog).getByLabelText("About"), {
      target: { value: "split-pdf" },
    });
    fireEvent.click(star(dialog, /^2 stars/));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /^Send this/ }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Send privately/ }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(init.body))).toEqual({
      name: "",
      message: "",
      rating: 2,
      tags: [],
      tool: "split-pdf",
      consent: true,
    });
  });

  it("shows this browser's tool ratings on the laptop and in the form, read-only", async () => {
    window.localStorage.setItem(
      "quickkit-tool-feedback-v1",
      JSON.stringify([
        {
          tool: "merge-pdf",
          rating: 5,
          tags: [],
          comment: "Merged in seconds.",
          createdAt: "2026-11-15T10:00:00.000Z",
        },
      ]),
    );
    const dialog = openForm();
    const panel = screen.getByRole("region", { name: "User Feedback" });
    await waitFor(() =>
      expect(
        panel.querySelector('[data-laptop-tool-review="merge-pdf"]'),
      ).toBeTruthy(),
    );
    const card = panel.querySelector<HTMLElement>(
      '[data-laptop-tool-review="merge-pdf"]',
    )!;
    expect(within(card).getByText("PDF Merger")).toBeTruthy();
    expect(within(card).getByText("Merged in seconds.")).toBeTruthy();
    expect(
      within(card).getByRole("img", { name: "5 out of 5 stars" }),
    ).toBeTruthy();
    expect(within(panel).getByText("1 REVIEW · THIS BROWSER")).toBeTruthy();
    expect(within(panel).queryByText("No feedback yet")).toBeNull();
    const reviews = within(dialog).getByRole("region", {
      name: "Saved tool reviews",
    });
    expect(within(reviews).getByText("PDF Merger · 5/5")).toBeTruthy();
    expect(within(reviews).queryByRole("button")).toBeNull();
  });

  it("opens a fresh form every time, even if the browser never reports the close", () => {
    // A browser that closes the dialog without firing `close`.
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
    render(<HeroFeedback />);
    const trigger = screen.getByRole("button", { name: /Share feedback/ });
    for (let round = 1; round <= 4; round += 1) {
      fireEvent.click(trigger);
      const dialog = screen.getByRole("dialog");
      expect(dialog.hasAttribute("open")).toBe(true);
      // Nothing is carried over from the previous round.
      expect(within(dialog).getByText("Tap a star to rate")).toBeTruthy();
      fireEvent.click(star(dialog, /^4 stars/));
      fireEvent.click(
        within(dialog).getByRole("button", { name: /Add feedback/ }),
      );
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(stored()).toHaveLength(round);
    }
  });

  it("keeps the open form and its answers when asked to open again", () => {
    const dialog = openForm();
    fireEvent.click(star(dialog, /^3 stars/));
    fireEvent.change(within(dialog).getByLabelText(/Your feedback/), {
      target: { value: "Half written" },
    });
    window.dispatchEvent(new Event("quickkit:open-feedback"));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      (
        within(screen.getByRole("dialog")).getByLabelText(
          /Your feedback/,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("Half written");
    expect(
      within(screen.getByRole("dialog")).getByText("3/5 · It was okay"),
    ).toBeTruthy();
  });

  it("closes with the close button and with Escape's close event", () => {
    let dialog = openForm();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close feedback form" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Share feedback/ }));
    dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("close"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
