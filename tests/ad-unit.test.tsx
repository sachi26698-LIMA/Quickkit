// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// The homepage renders client islands that expect the App Router (HeroSearch
// uses useRouter). Rendering a page component in isolation needs the hooks
// stubbed; the assertions below only care about where the ad slot sits.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
import AdUnit, { AD_CLIENT, AD_SLOT } from "../components/ad-unit";
import ToolShell from "../components/tool-shell";
import Home from "../app/page";

beforeAll(() => {
  // jsdom implements neither matchMedia nor IntersectionObserver; the hero and
  // the reveal animation use both.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
  if (!("IntersectionObserver" in window)) {
    class StubObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    Object.defineProperty(window, "IntersectionObserver", {
      value: StubObserver,
      writable: true,
    });
  }
});

afterEach(cleanup);

/**
 * The ad integration is small, so every part of it is pinned: the ids, the fact
 * that exactly one loader exists, one slot per page, and that no slot can end up
 * inside a tool workspace next to the controls.
 */

const AD_SCRIPT = "googlesyndication.com/pagead/js/adsbygoogle.js";

/** Every .tsx/.ts file under the given directories, recursively. */
function sourceFiles(dirs: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "node_modules") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(path);
      }
    }
  };
  for (const dir of dirs) walk(dir);
  return out;
}

describe("AdSense loader", () => {
  it("is loaded exactly once, in the root layout only", () => {
    const files = sourceFiles(["app", "components", "lib"]);
    const withLoader = files.filter((file) =>
      readFileSync(file, "utf8").includes(AD_SCRIPT),
    );
    // One file, and that file is the layout: no page or component may add a
    // second copy of the script.
    expect(withLoader).toEqual(["app/layout.tsx"]);

    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout.split(AD_SCRIPT)).toHaveLength(2); // one occurrence
    expect(layout).not.toMatch(/data-ad-slot/); // loader only, no unit
  });

  it("publishes the same publisher id as the ad unit", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain(AD_CLIENT);
    expect(AD_CLIENT).toBe("ca-pub-1478767466279341");
    expect(AD_SLOT).toBe("1553253144");
  });
});

describe("AdUnit", () => {
  it("renders one responsive slot with the configured ids", () => {
    const { container } = render(<AdUnit />);
    const slots = container.querySelectorAll("ins.adsbygoogle");
    expect(slots).toHaveLength(1);

    const ins = slots[0];
    expect(ins).toHaveAttribute("data-ad-client", "ca-pub-1478767466279341");
    expect(ins).toHaveAttribute("data-ad-slot", "1553253144");
    // Responsive on every breakpoint: automatic sizing, full-width allowed.
    expect(ins).toHaveAttribute("data-ad-format", "auto");
    expect(ins).toHaveAttribute("data-full-width-responsive", "true");

    // Labelled as an advertisement, and never a fake creative of our own.
    expect(container.querySelector(".ad-slot-label")?.textContent).toBe(
      "Advertisement",
    );
    expect(container.querySelector("img, svg, canvas")).toBeNull();
  });

  it("pushes to the existing loader rather than loading a new script", () => {
    const pushes: unknown[] = [];
    (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = {
      push: (config: unknown) => pushes.push(config),
    } as unknown as never;
    render(<AdUnit />);
    expect(pushes).toHaveLength(1);
    expect(
      document.querySelectorAll(`script[src*="adsbygoogle.js"]`),
    ).toHaveLength(0);
  });
});

describe("ad placement", () => {
  it("puts one slot on the homepage, below the hero and above the toolkit", () => {
    const { container } = render(<Home />);
    const slots = container.querySelectorAll(".ad-slot");
    expect(slots).toHaveLength(1);

    const hero = container.querySelector(".hero");
    expect(hero).toBeTruthy();
    // After the hero in document order, and before the category section.
    expect(
      hero!.compareDocumentPosition(slots[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const categories = container.querySelector("#categories");
    expect(
      slots[0].compareDocumentPosition(categories!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("puts one slot on a tool page, outside the workspace", () => {
    const { container } = render(
      <ToolShell
        slug="word-counter"
        content={{ steps: ["One."], faqs: [{ q: "Q?", a: "A." }] }}
      >
        <div data-testid="workspace">
          <button type="button">Convert</button>
        </div>
      </ToolShell>,
    );

    expect(container.querySelectorAll(".ad-slot")).toHaveLength(1);

    // The slot must not contain — or be contained by — the interactive workspace.
    const workspace = container.querySelector('[data-testid="workspace"]')!;
    const slot = container.querySelector(".ad-slot")!;
    expect(slot.contains(workspace)).toBe(false);
    expect(workspace.contains(slot)).toBe(false);
    expect(slot.querySelector("button")).toBeNull();

    // It comes after the workspace, in the reading flow that follows the tool.
    expect(
      workspace.compareDocumentPosition(slot) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
