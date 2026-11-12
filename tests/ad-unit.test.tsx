// @vitest-environment jsdom
import { StrictMode } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// The homepage renders client islands that expect the App Router (HeroSearch
// uses useRouter). Rendering a page component in isolation needs the hooks
// stubbed; the assertions below only care about where the ad slots sit.
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
import { AD_SLOTS, ADSENSE_CLIENT, MAX_ADS_PER_PAGE } from "../lib/ads";
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

beforeEach(() => {
  // A fresh queue per test so "one push per unit" is measurable.
  (window as unknown as { adsbygoogle: unknown }).adsbygoogle = [];
});

afterEach(cleanup);

/**
 * The ad integration is small, so every part of it is pinned: the ids, the fact
 * that exactly one loader exists, that each unit registers exactly once, and
 * that no slot can end up inside a tool workspace next to the controls.
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

  it("publishes the same publisher id everywhere it appears", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain(AD_CLIENT);
    expect(ADSENSE_CLIENT).toBe("ca-pub-1478767466279341");
    // The single unit that actually exists in the AdSense account.
    expect(AD_SLOTS.display).toBe("1553253144");
    expect(AD_SLOT).toBe("1553253144");
    // ads.txt must authorise the same publisher.
    expect(readFileSync("public/ads.txt", "utf8")).toBe(
      `google.com, ${ADSENSE_CLIENT.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`,
    );
  });

  it("never loads a second copy of the script from a unit", () => {
    render(<AdUnit placement="home-after-hero" />);
    render(<AdUnit placement="home-bottom" />);
    expect(
      document.querySelectorAll(`script[src*="adsbygoogle.js"]`),
    ).toHaveLength(0);
  });
});

describe("AdUnit", () => {
  it("renders one responsive slot with the configured ids", () => {
    const { container } = render(<AdUnit placement="home-after-hero" />);
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
    // Nothing that invites a click: the unit is a plain <ins>, no link/button.
    expect(container.querySelector("a, button")).toBeNull();
  });

  it("gives each ad landmark a unique accessible name", () => {
    const { container } = render(
      <>
        <AdUnit placement="tool-after-intro" />
        <AdUnit placement="tool-after-faq" />
        <AdUnit placement="tool-bottom" />
      </>,
    );
    const slots = [...container.querySelectorAll(".ad-slot")];
    const labels = slots.map((slot) => slot.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Advertisement — tool-after-intro",
      "Advertisement — tool-after-faq",
      "Advertisement — tool-bottom",
    ]);
    expect(new Set(labels).size).toBe(slots.length);
    // The visible, neutral label stays unchanged for sighted visitors.
    expect(
      [...container.querySelectorAll(".ad-slot-label")].map(
        (element) => element.textContent,
      ),
    ).toEqual(["Advertisement", "Advertisement", "Advertisement"]);
  });

  it("writes its placement onto the DOM so a duplicate is detectable", () => {
    const { container } = render(<AdUnit placement="tool-after-faq" />);
    expect(container.querySelector(".ad-slot")).toHaveAttribute(
      "data-ad-placement",
      "tool-after-faq",
    );
    expect(container.querySelector("ins.adsbygoogle")).toHaveAttribute(
      "data-ad-placement",
      "tool-after-faq",
    );
  });

  it("passes the requested responsive format through", () => {
    const { container } = render(
      <AdUnit placement="home-mid-content" format="rectangle" />,
    );
    const aside = container.querySelector(".ad-slot");
    expect(aside).toHaveAttribute("data-ad-format", "rectangle");
    expect(container.querySelector("ins.adsbygoogle")).toHaveAttribute(
      "data-ad-format",
      "rectangle",
    );
  });

  it("pushes to the existing loader rather than loading a new script", () => {
    const pushes: unknown[] = [];
    (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = {
      push: (config: unknown) => pushes.push(config),
    } as unknown as never;
    render(<AdUnit placement={"home-bottom"} />);
    expect(pushes).toHaveLength(1);
  });

  it("registers each unit once, even when React runs effects twice", () => {
    const pushes: unknown[] = [];
    (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = {
      push: (config: unknown) => pushes.push(config),
    } as unknown as never;
    render(
      <StrictMode>
        <AdUnit placement="home-after-hero" />
        <AdUnit placement="home-mid-content" />
        <AdUnit placement="home-bottom" />
      </StrictMode>,
    );
    // Three units on the page, three requests — never six.
    expect(pushes).toHaveLength(3);
  });

  it("stays blank instead of throwing when the loader never arrives", () => {
    // An ad blocker leaves `window.adsbygoogle` undefined; the unit must still
    // render, quietly, rather than break the page it sits on.
    delete (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;
    const { container } = render(<AdUnit placement="help-bottom" />);
    expect(container.querySelectorAll("ins.adsbygoogle")).toHaveLength(1);
    expect(container.querySelector(".ad-slot-label")?.textContent).toBe(
      "Advertisement",
    );
  });
});

describe("ad placement", () => {
  it("puts three slots on the homepage, each in its own content gap", () => {
    const { container } = render(<Home />);
    const slots = [...container.querySelectorAll(".ad-slot")];
    expect(slots).toHaveLength(3);
    expect(
      new Set(slots.map((s) => s.getAttribute("data-ad-placement"))).size,
    ).toBe(3);
    expect(slots.map((s) => s.getAttribute("data-ad-placement"))).toEqual([
      "home-after-hero",
      "home-mid-content",
      "home-bottom",
    ]);

    // 1 — after the hero, before the category section.
    const hero = container.querySelector(".hero");
    expect(hero).toBeTruthy();
    expect(
      hero!.compareDocumentPosition(slots[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const categories = container.querySelector("#categories");
    expect(
      slots[0].compareDocumentPosition(categories!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // 2 — between the two content sections.
    const why = container.querySelector('[aria-labelledby="why-title"]');
    expect(
      categories!.compareDocumentPosition(slots[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      slots[1].compareDocumentPosition(why!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // 3 — after the closing call to action, i.e. the page's last content block.
    const cta = container.querySelector(".cta-banner");
    expect(
      cta!.compareDocumentPosition(slots[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("puts three slots on a tool page, all outside the workspace", () => {
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

    const slots = [...container.querySelectorAll(".ad-slot")];
    expect(slots).toHaveLength(3);
    expect(slots.map((slot) => slot.getAttribute("data-ad-placement"))).toEqual(
      ["tool-after-intro", "tool-after-faq", "tool-bottom"],
    );

    const workspace = container.querySelector('[data-testid="workspace"]')!;
    const guidance = container.querySelector(".tool-guidance")!;
    const related = container.querySelector(".related")!;

    for (const slot of slots) {
      // Neither contains nor is contained by the interactive workspace, and no
      // slot may ever hold a control of its own.
      expect(slot.contains(workspace)).toBe(false);
      expect(workspace.contains(slot)).toBe(false);
      expect(
        slot.querySelector("button, a, input, textarea, select"),
      ).toBeNull();
    }

    // 1 — after the introduction, immediately before the workspace.
    const title = container.querySelector(".tool-title")!;
    expect(
      title.compareDocumentPosition(slots[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      slots[0].compareDocumentPosition(workspace) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // 2 — after the how-to steps and the FAQ block.
    expect(
      guidance.compareDocumentPosition(slots[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      slots[1].compareDocumentPosition(related) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // 3 — the last block on the page.
    expect(
      related.compareDocumentPosition(slots[2]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(slots[2].querySelector("a")).toBeNull();
  });

  it("never exceeds the per-page ceiling", () => {
    const { container } = render(
      <ToolShell
        slug="word-counter"
        content={{ steps: ["One."], faqs: [{ q: "Q?", a: "A." }] }}
      >
        <div />
      </ToolShell>,
    );
    expect(container.querySelectorAll(".ad-slot").length).toBeLessThanOrEqual(
      MAX_ADS_PER_PAGE,
    );
  });
});
