// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import LaptopColourControls from "../components/laptop-colour-controls";
import { laptopFinishStyle } from "../lib/laptop-finishes";
import { tools } from "../lib/catalog";
import { toolTheme } from "../lib/tool-theme";

let reducedMotion = false;
let setIntersecting: (value: boolean) => void;

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion = false;
  vi.stubGlobal("matchMedia", () => ({
    matches: reducedMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        setIntersecting = (value) => callback([{ isIntersecting: value }]);
      }
      observe() {
        setIntersecting(true);
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
function mount() {
  const view = render(
    <div>
      <div
        data-laptop-body="studio-v2"
        data-finish-phase="holding"
        data-finish-running="false"
        style={laptopFinishStyle()}
      >
        <span>Screen unchanged</span>
      </div>
      <LaptopColourControls />
    </div>,
  );
  return {
    ...view,
    laptop: view.container.querySelector<HTMLElement>("[data-finish-phase]")!,
  };
}

describe("laptop metal colour rotation", () => {
  it("holds for 30 seconds then fades for 10 seconds without a countdown", () => {
    const { laptop } = mount();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(laptop.style.getPropertyValue("--finish-from")).toBe(
      "rgb(244 63 94)",
    );
    expect(laptop.style.getPropertyValue("--finish-fade-duration")).toBe(
      "10000ms",
    );
    advance(29900);
    expect(laptop).toHaveAttribute("data-finish-phase", "holding");
    advance(100);
    expect(laptop).toHaveAttribute("data-finish-phase", "changing");
    advance(9900);
    expect(laptop).toHaveAttribute("data-finish-phase", "changing");
    advance(100);
    expect(laptop).toHaveAttribute("data-finish-phase", "holding");
    expect(laptop.style.getPropertyValue("--finish-from")).toBe(
      "rgb(109 40 217)",
    );
    expect(screen.getByText("Screen unchanged")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("pauses both elapsed time and the colour fade, then resumes", () => {
    const { laptop } = mount();
    advance(35000);
    fireEvent.click(
      screen.getByRole("button", { name: "Pause laptop colour rotation" }),
    );
    expect(laptop.style.getPropertyValue("--finish-play-state")).toBe("paused");
    advance(20000);
    expect(laptop).toHaveAttribute("data-finish-phase", "changing");
    fireEvent.click(
      screen.getByRole("button", { name: "Resume laptop colour rotation" }),
    );
    advance(4900);
    expect(laptop).toHaveAttribute("data-finish-phase", "changing");
    advance(100);
    expect(laptop).toHaveAttribute("data-finish-phase", "holding");
    expect(laptop.style.getPropertyValue("--finish-from")).toBe(
      "rgb(109 40 217)",
    );
  });

  it("suspends offscreen and in a hidden tab without skipping colours", () => {
    const { laptop } = mount();
    advance(10000);
    act(() => setIntersecting(false));
    advance(80000);
    expect(laptop).toHaveAttribute("data-finish-phase", "holding");
    act(() => setIntersecting(true));
    advance(10000);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(laptop).toHaveAttribute("data-finish-running", "false");
    advance(80000);
    expect(laptop).toHaveAttribute("data-finish-phase", "holding");
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    advance(10000);
    expect(laptop).toHaveAttribute("data-finish-phase", "changing");
    hidden.mockRestore();
  });

  it("uses only registered tool colours, covers every tool and loops", () => {
    const { laptop } = mount();
    const colours = new Set<string>();
    const expected = new Set(
      tools.map((tool) => `rgb(${toolTheme(tool.slug, tool.category).rgb})`),
    );
    for (let i = 0; i < tools.length; i++) {
      colours.add(laptop.style.getPropertyValue("--finish-from"));
      advance(40000);
    }
    expect(colours).toEqual(expected);
    expect(laptop.style.getPropertyValue("--finish-from")).toBe(
      "rgb(244 63 94)",
    );
  });

  it("respects reduced motion with a static finish and manual next-colour control", () => {
    reducedMotion = true;
    const { laptop, unmount } = mount();
    expect(laptop).toHaveAttribute("data-finish-running", "false");
    advance(80000);
    expect(laptop.style.getPropertyValue("--finish-from")).toBe(
      "rgb(244 63 94)",
    );
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next laptop colour" }));
    expect(laptop.style.getPropertyValue("--finish-from")).toBe(
      "rgb(109 40 217)",
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
