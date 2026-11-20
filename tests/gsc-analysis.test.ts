import { describe, expect, it } from "vitest";
import {
  analyse,
  bucketByTool,
  slugFromUrl,
  toolForQuery,
  THRESHOLDS,
} from "../lib/seo/gsc-analysis";
import type { GscInput } from "../lib/seo/gsc-analysis";

/**
 * These tests use **synthetic** numbers on purpose.
 *
 * Search Console is unreachable from this environment, so there is no real data
 * to assert against. Every figure below is invented *here*, inside a test, to
 * prove the arithmetic and the thresholds behave as described. None of it is a
 * claim about QUICKKIT's actual performance, and nothing here reads an export.
 */

const window = (rows: GscInput["current"]["rows"]) => ({
  startDate: "2026-01-01",
  endDate: "2026-01-28",
  rows,
});

const base: GscInput = {
  siteUrl: "https://quickkit.live/",
  current: window([
    {
      key: "merge pdf",
      clicks: 1,
      impressions: 1000,
      ctr: 0.001,
      position: 14.2,
    },
  ]),
};

describe("Search Console analysis — thresholds", () => {
  it("flags high impressions with very low CTR", () => {
    const findings = analyse(base);
    expect(findings.some((f) => f.kind === "high-impressions-low-ctr")).toBe(
      true,
    );
  });

  it("flags a position just outside the top ten as striking distance", () => {
    const findings = analyse(base);
    const striking = findings.find((f) => f.kind === "striking-distance");
    expect(striking).toBeDefined();
    expect(striking!.evidence).toContain("14.2");
  });

  it("does not flag a query below the impression floor", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "tiny query",
          clicks: 0,
          impressions: THRESHOLDS.minImpressions - 1,
          ctr: 0,
          position: 15,
        },
      ]),
    });
    expect(
      findings.filter((f) => f.kind === "high-impressions-low-ctr"),
    ).toHaveLength(0);
  });

  it("does not flag a healthy CTR", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "healthy",
          clicks: 120,
          impressions: 1000,
          ctr: 0.12,
          position: 3,
        },
      ]),
    });
    expect(
      findings.filter((f) => f.kind === "high-impressions-low-ctr"),
    ).toHaveLength(0);
  });

  it("does not call position 9 striking distance", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "near top",
          clicks: 100,
          impressions: 1000,
          ctr: 0.1,
          position: 9,
        },
      ]),
    });
    expect(findings.some((f) => f.kind === "striking-distance")).toBe(false);
  });

  it("distinguishes a click-through problem from a position problem", () => {
    const wellRanked = analyse({
      ...base,
      current: window([
        {
          key: "ranked well",
          clicks: 0,
          impressions: 500,
          ctr: 0,
          position: 4,
        },
      ]),
    }).find((f) => f.kind === "impressions-without-clicks");
    const poorlyRanked = analyse({
      ...base,
      current: window([
        {
          key: "ranked badly",
          clicks: 0,
          impressions: 500,
          ctr: 0,
          position: 45,
        },
      ]),
    }).find((f) => f.kind === "impressions-without-clicks");

    expect(wellRanked!.action).toContain("title/description");
    expect(poorlyRanked!.action).toContain("Do not rewrite copy yet");
  });
});

describe("Search Console analysis — cannibalisation", () => {
  it("detects two URLs sharing one query", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "merge pdf",
          clicks: 5,
          impressions: 400,
          ctr: 0.0125,
          position: 12,
        },
      ]),
      queryPagePairs: [
        {
          query: "merge pdf",
          page: "https://quickkit.live/tools/merge-pdf",
          impressions: 300,
          clicks: 5,
          position: 11,
        },
        {
          query: "merge pdf",
          page: "https://quickkit.live/tools/pdf-studio",
          impressions: 100,
          clicks: 0,
          position: 19,
        },
      ],
    });
    const found = findings.find((f) => f.kind === "cannibalisation");
    expect(found).toBeDefined();
    expect(found!.evidence).toContain("merge-pdf");
    expect(found!.evidence).toContain("pdf-studio");
  });

  it("ignores a shared query below the impression floor", () => {
    const findings = analyse({
      ...base,
      current: window([
        { key: "rare", clicks: 0, impressions: 5, ctr: 0, position: 30 },
      ]),
      queryPagePairs: [
        {
          query: "rare",
          page: "https://quickkit.live/tools/merge-pdf",
          impressions: 3,
          clicks: 0,
          position: 30,
        },
        {
          query: "rare",
          page: "https://quickkit.live/tools/split-pdf",
          impressions: 2,
          clicks: 0,
          position: 32,
        },
      ],
    });
    expect(findings.some((f) => f.kind === "cannibalisation")).toBe(false);
  });
});

describe("Search Console analysis — intent mismatch", () => {
  it("labels an intent mismatch as inferred, never measured", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "compress pdf",
          clicks: 4,
          impressions: 200,
          ctr: 0.02,
          position: 12,
        },
      ]),
      queryPagePairs: [
        {
          query: "compress pdf",
          page: "https://quickkit.live/tools/merge-pdf",
          impressions: 200,
          clicks: 4,
          position: 12,
        },
      ],
    });
    const mismatch = findings.find((f) => f.kind === "intent-mismatch");
    expect(mismatch).toBeDefined();
    expect(mismatch!.basis).toBe("inferred");
  });

  it("does not flag a query on its own correct page", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "merge pdf",
          clicks: 9,
          impressions: 300,
          ctr: 0.03,
          position: 6,
        },
      ]),
      queryPagePairs: [
        {
          query: "merge pdf",
          page: "https://quickkit.live/tools/merge-pdf",
          impressions: 300,
          clicks: 9,
          position: 6,
        },
      ],
    });
    expect(findings.some((f) => f.kind === "intent-mismatch")).toBe(false);
  });
});

describe("Search Console analysis — coverage gaps", () => {
  it("reports every tool with no impressions rather than staying silent", () => {
    const findings = analyse(base);
    const missing = findings.filter((f) => f.kind === "no-impressions");
    // The sample window mentions no page URL, so every tool is absent.
    expect(missing.length).toBeGreaterThan(50);
    expect(missing.every((f) => f.basis === "measured")).toBe(true);
  });

  it("stops reporting a tool once a page row mentions it", () => {
    const findings = analyse({
      ...base,
      currentPages: window([
        {
          key: "https://quickkit.live/tools/merge-pdf",
          clicks: 5,
          impressions: 500,
          ctr: 0.01,
          position: 12,
        },
      ]),
    });
    const subjects = findings
      .filter((f) => f.kind === "no-impressions")
      .map((f) => f.subject);
    expect(subjects).not.toContain("/tools/merge-pdf");
  });
});

describe("Search Console analysis — window comparison", () => {
  it("reports a large drop as lost visibility", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "merge pdf",
          clicks: 5,
          impressions: 400,
          ctr: 0.0125,
          position: 12,
        },
      ]),
      previous: window([
        {
          key: "merge pdf",
          clicks: 60,
          impressions: 2000,
          ctr: 0.03,
          position: 5,
        },
      ]),
    });
    const lost = findings.find((f) => f.kind === "lost-visibility");
    expect(lost).toBeDefined();
    expect(lost!.evidence).toContain("2,000");
    expect(lost!.evidence).toContain("400");
  });

  it("ignores a move too small to be a change", () => {
    const findings = analyse({
      ...base,
      current: window([
        {
          key: "merge pdf",
          clicks: 50,
          impressions: 1010,
          ctr: 0.05,
          position: 8,
        },
      ]),
      previous: window([
        {
          key: "merge pdf",
          clicks: 50,
          impressions: 1000,
          ctr: 0.05,
          position: 8,
        },
      ]),
    });
    expect(
      findings.some(
        (f) => f.kind === "gained-visibility" || f.kind === "lost-visibility",
      ),
    ).toBe(false);
  });
});

describe("Search Console analysis — mapping", () => {
  it("maps absolute URLs to the tool slug", () => {
    expect(slugFromUrl("https://quickkit.live/tools/merge-pdf")).toBe(
      "merge-pdf",
    );
    expect(slugFromUrl("/tools/qr-generator")).toBe("qr-generator");
  });

  it("does not invent a tool for a non-tool URL", () => {
    expect(
      slugFromUrl("https://quickkit.live/category/pdf-tools"),
    ).toBeUndefined();
    expect(slugFromUrl("/tools/not-a-real-tool")).toBeUndefined();
    expect(slugFromUrl("merge pdf")).toBeUndefined();
  });

  it("maps a researched query to its owning tool", () => {
    expect(toolForQuery("merge pdf")).toBe("merge-pdf");
    expect(toolForQuery("compress pdf to 100kb")).toBe("compress-pdf");
    expect(toolForQuery("bmi calculator in kg and cm")).toBe("bmi-calculator");
  });

  it("leaves an unrecognised query unmapped rather than guessing", () => {
    expect(toolForQuery("zzz unrelated gibberish query")).toBeUndefined();
  });

  it("buckets rows by tool and keeps unmatched rows visible", () => {
    const { byTool, unmapped } = bucketByTool([
      {
        key: "https://quickkit.live/tools/merge-pdf",
        clicks: 1,
        impressions: 10,
        ctr: 0.1,
        position: 5,
      },
      {
        key: "some random search",
        clicks: 0,
        impressions: 3,
        ctr: 0,
        position: 40,
      },
    ]);
    expect(byTool.get("merge-pdf")).toHaveLength(1);
    expect(unmapped).toHaveLength(1);
  });
});

describe("Search Console analysis — no data is ever invented", () => {
  it("returns nothing when every window is empty", () => {
    const findings = analyse({
      siteUrl: "https://quickkit.live/",
      current: window([]),
    });
    // Only the coverage report survives; no metric-bearing finding appears.
    expect(findings.every((f) => f.kind === "no-impressions")).toBe(true);
  });

  it("quotes only numbers present in the input", () => {
    const findings = analyse(base);
    for (const finding of findings) {
      if (finding.basis === "inferred") continue;
      // Every measured finding must quote one of the supplied figures.
      const quotes =
        finding.evidence.includes("1,000") ||
        finding.evidence.includes("0.10%") ||
        finding.evidence.includes("14.2") ||
        finding.kind === "no-impressions";
      expect(quotes, finding.evidence).toBe(true);
    }
  });
});
