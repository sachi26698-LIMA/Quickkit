import { beforeEach, describe, expect, it, vi } from "vitest";
import { allToolSeoRecords } from "../lib/seo/resolve";
import {
  auditKeywordClusters,
  keywordsFor,
  keywordClusters,
  keywordClusterFor,
  MAX_KEYWORDS_PER_TOOL,
  MIN_KEYWORDS_PER_TOOL,
  normaliseKeyword,
} from "../lib/seo/keyword-clusters";
import { tools } from "../lib/catalog";

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://www.quickkit.live");
  vi.stubEnv("LAUNCH_APPROVED", "true");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.resetModules();
});

/**
 * `slug` is optional on the base registry record type because the same type
 * serves non-tool pages. Every record returned by `allToolSeoRecords()` is a
 * tool route, so this narrows once rather than casting at each call site.
 */
function toolRecords() {
  return allToolSeoRecords().flatMap((record) =>
    typeof record.slug === "string" ? [{ ...record, slug: record.slug }] : [],
  );
}

function audit() {
  const records = toolRecords();
  return auditKeywordClusters({
    registrySlugs: records.map((record) => record.slug),
    registryPrimary: Object.fromEntries(
      records.map((record) => [record.slug, record.primaryKeyword]),
    ),
    registrySecondary: Object.fromEntries(
      records.map((record) => [record.slug, record.secondaryKeywords]),
    ),
  });
}

describe("keyword clusters — coverage", () => {
  it("gives every published tool exactly one cluster", () => {
    const records = toolRecords();
    expect(keywordClusters).toHaveLength(records.length);
    const clustered = new Set(keywordClusters.map((cluster) => cluster.slug));
    for (const record of records) {
      expect(clustered.has(record.slug), `${record.slug} has no cluster`).toBe(
        true,
      );
    }
  });

  it("covers the whole catalogue, not a subset of it", () => {
    const catalogSlugs = tools.map((tool) => tool.slug).sort();
    const clusterSlugs = keywordClusters.map((cluster) => cluster.slug).sort();
    expect(clusterSlugs).toEqual(catalogSlugs);
  });

  it("reports no errors at all", () => {
    const errors = audit().filter((finding) => finding.severity === "error");
    expect(errors).toEqual([]);
  });
});

describe("keyword clusters — density", () => {
  it(`maps at least ${MIN_KEYWORDS_PER_TOOL} keywords for every tool`, () => {
    for (const cluster of keywordClusters) {
      const count = keywordsFor(cluster).length;
      expect(count, `${cluster.slug} has only ${count}`).toBeGreaterThanOrEqual(
        MIN_KEYWORDS_PER_TOOL,
      );
    }
  });

  it(`stays at or below ${MAX_KEYWORDS_PER_TOOL} keywords per tool`, () => {
    for (const cluster of keywordClusters) {
      const count = keywordsFor(cluster).length;
      expect(count, `${cluster.slug} has ${count}`).toBeLessThanOrEqual(
        MAX_KEYWORDS_PER_TOOL,
      );
    }
  });

  it("maps well over a thousand keyword targets sitewide", () => {
    const total = keywordClusters.reduce(
      (sum, cluster) => sum + keywordsFor(cluster).length,
      0,
    );
    expect(total).toBeGreaterThan(1200);
  });

  it("never repeats a keyword inside one tool", () => {
    for (const cluster of keywordClusters) {
      const keys = keywordsFor(cluster).map(normaliseKeyword);
      expect(new Set(keys).size, `${cluster.slug} repeats a keyword`).toBe(
        keys.length,
      );
    }
  });

  it("avoids one-word keywords, which no single tool page can own", () => {
    for (const cluster of keywordClusters) {
      for (const keyword of keywordsFor(cluster)) {
        expect(
          normaliseKeyword(keyword).split(" ").length,
          `${cluster.slug}: "${keyword}"`,
        ).toBeGreaterThan(1);
      }
    }
  });
});

describe("keyword clusters — ownership", () => {
  it("assigns every keyword to exactly one tool", () => {
    const owners = new Map<string, string[]>();
    for (const cluster of keywordClusters) {
      for (const keyword of keywordsFor(cluster)) {
        const key = normaliseKeyword(keyword);
        owners.set(key, [...(owners.get(key) ?? []), cluster.slug]);
      }
    }
    const shared = [...owners.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([keyword, slugs]) => `${keyword}: ${slugs.join(" + ")}`);
    expect(shared).toEqual([]);
  });

  it("keeps primary keywords distinct across every tool", () => {
    const primaries = keywordClusters.map((cluster) =>
      normaliseKeyword(cluster.primary),
    );
    expect(new Set(primaries).size).toBe(primaries.length);
  });

  it("does not let a secondary keyword equal another tool's primary", () => {
    const primaries = new Map(
      keywordClusters.map((cluster) => [
        normaliseKeyword(cluster.primary),
        cluster.slug,
      ]),
    );
    for (const cluster of keywordClusters) {
      for (const keyword of cluster.secondary) {
        const owner = primaries.get(normaliseKeyword(keyword));
        expect(
          owner,
          `${cluster.slug} claims "${keyword}", which is ${owner}'s primary keyword`,
        ).toBeUndefined();
      }
    }
  });
});

describe("keyword clusters — agreement with the registry", () => {
  it("quotes each registry primary keyword exactly", () => {
    for (const record of toolRecords()) {
      const cluster = keywordClusterFor(record.slug);
      expect(cluster, `${record.slug} has no cluster`).toBeDefined();
      expect(normaliseKeyword(cluster!.primary)).toBe(
        normaliseKeyword(record.primaryKeyword),
      );
    }
  });

  it("contains every registry secondary keyword", () => {
    for (const record of toolRecords()) {
      const cluster = keywordClusterFor(record.slug)!;
      const present = new Set(cluster.secondary.map(normaliseKeyword));
      for (const keyword of record.secondaryKeywords) {
        expect(
          present.has(normaliseKeyword(keyword)),
          `${record.slug} is missing "${keyword}"`,
        ).toBe(true);
      }
    }
  });

  it("does not drift when a registry keyword is removed", () => {
    // The guard above only proves the cluster contains what the registry has.
    // This proves the two lists are the same length in the other direction, so
    // a cluster entry cannot silently become documentation for nothing.
    for (const record of toolRecords()) {
      const cluster = keywordClusterFor(record.slug)!;
      expect(cluster.secondary.length).toBe(record.secondaryKeywords.length);
    }
  });
});

describe("keyword clusters — intent coverage", () => {
  it("gives every tool question-based queries", () => {
    for (const cluster of keywordClusters) {
      expect(
        cluster.groups.question?.length ?? 0,
        `${cluster.slug} has no question keywords`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives every tool long-tail queries", () => {
    for (const cluster of keywordClusters) {
      expect(
        cluster.groups.longTail?.length ?? 0,
        `${cluster.slug} has no long-tail keywords`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives every tool alternative names and action queries", () => {
    for (const cluster of keywordClusters) {
      expect(
        cluster.groups.alternativeName?.length ?? 0,
      ).toBeGreaterThanOrEqual(1);
      expect(cluster.groups.action?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives every tool at least one free/online qualifier", () => {
    for (const cluster of keywordClusters) {
      expect(
        cluster.groups.qualifier?.length ?? 0,
        `${cluster.slug} has no qualifier keywords`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("adds Indian-language keywords only where the tool genuinely serves them", () => {
    const withIndia = keywordClusters.filter(
      (cluster) => (cluster.groups.india?.length ?? 0) > 0,
    );
    // Not every tool gets Hinglish — inventing it for "minify css" would be
    // noise. But the tools whose audience really does search that way
    // (calculator, PDF, QR, OCR) must have it.
    for (const slug of [
      "gst-calculator",
      "emi-calculator",
      "merge-pdf",
      "qr-generator",
      "image-to-text",
    ]) {
      const cluster = keywordClusterFor(slug)!;
      expect(
        cluster.groups.india?.length ?? 0,
        `${slug} should carry Indian-language keywords`,
      ).toBeGreaterThan(0);
    }
    expect(withIndia.length).toBeGreaterThan(20);
  });
});

describe("keyword clusters — truthfulness guards", () => {
  it("never claims a consented-network tool works offline", () => {
    // These three make a network call after explicit consent, so any
    // "offline"/"no network"/"never leaves" phrasing would be a false claim.
    for (const slug of [
      "word-to-pdf",
      "dns-email-security",
      "product-lookup",
      "url-network-privacy",
    ]) {
      const cluster = keywordClusterFor(slug)!;
      for (const keyword of keywordsFor(cluster)) {
        expect(keyword, `${slug}: "${keyword}"`).not.toMatch(
          /\boffline\b|\bno internet\b|\bnever leaves your device\b/i,
        );
      }
    }
  });

  it("never claims word-to-pdf works without uploading", () => {
    const keywordText = keywordsFor(keywordClusterFor("word-to-pdf")!)
      .join(" | ")
      .toLowerCase();
    expect(keywordText).not.toContain("without uploading");
    // It may honestly promise no account is needed.
    expect(keywordText).toContain("without an account");
  });

  it("never claims the header reviewer scans a live website", () => {
    const keywordText = keywordsFor(
      keywordClusterFor("website-security-review")!,
    )
      .join(" | ")
      .toLowerCase();
    expect(keywordText).not.toMatch(
      /\bscan (a|any|my|your) (live )?(site|website)\b/,
    );
  });

  it("never claims a legal guarantee from the policy workbench", () => {
    const keywordText = keywordsFor(
      keywordClusterFor("privacy-policy-workbench")!,
    )
      .join(" | ")
      .toLowerCase();
    expect(keywordText).not.toMatch(
      /\bcompliant\b|\bcertified\b|\bguaranteed\b/,
    );
  });

  it("never claims the URL reviewer follows redirects or strips parameters", () => {
    // `analyzeUrl` in lib/tools/security/url-review.ts parses syntax and never
    // requests the URL — its own doc comment says the destination "is never
    // requested". So it cannot observe redirect hops, and it reports tracking
    // parameters rather than removing them. Both were previously promised in
    // the registry title/description and in this cluster; the audit caught the
    // cluster but could not see the rendered title.
    const keywordText = keywordsFor(keywordClusterFor("url-network-privacy")!)
      .join(" | ")
      .toLowerCase();
    // Broad on purpose: the first version matched only "redirect checker" and
    // missed "Links, Redirects & IP" in a title mutation, so it had no teeth.
    expect(keywordText).not.toMatch(/\bredirect/);
    expect(keywordText).not.toMatch(/\bremove (tracking|utm)/);
    expect(keywordText).not.toMatch(/\bfingerprint (test|scan)\b/);
  });

  it("keeps the rendered url-network-privacy snippet free of unsupported claims", () => {
    // The cluster audit only sees keywords, not the title/description a searcher
    // actually reads. This pins the rendered copy for the same false claims, so
    // a future rewrite of the snippet cannot reintroduce them.
    const record = allToolSeoRecords().find(
      (item) => item.slug === "url-network-privacy",
    );
    expect(record).toBeDefined();
    const rendered = [
      record!.title,
      record!.description,
      ...(record!.alternativeTitles ?? []),
      record!.alternativeDescription,
    ]
      .join(" | ")
      .toLowerCase();
    expect(rendered).not.toMatch(/\bredirect/);
    expect(rendered).not.toMatch(/\bremove (tracking|utm)/);
    expect(rendered).not.toMatch(/\bfingerprint (test|scan)\b/);
  });

  it("never targets a city or region", () => {
    const cityWords =
      /\b(mumbai|delhi|bangalore|bengaluru|ahmedabad|surat|pune|chennai|kolkata|hyderabad|jaipur|london|new york)\b/i;
    for (const cluster of keywordClusters) {
      for (const keyword of keywordsFor(cluster)) {
        expect(keyword, `${cluster.slug}: "${keyword}"`).not.toMatch(cityWords);
      }
    }
  });
});

describe("keyword clusters — audit teeth", () => {
  it("detects a tool that has no cluster", () => {
    const findings = auditKeywordClusters(
      {
        registrySlugs: ["merge-pdf", "invented-tool"],
        registryPrimary: { "merge-pdf": "merge pdf" },
        registrySecondary: { "merge-pdf": ["combine pdf files"] },
      },
      [
        {
          slug: "merge-pdf",
          primary: "merge pdf",
          secondary: ["combine pdf files"],
          groups: { question: ["how to merge pdf"] },
        },
      ],
    );
    expect(
      findings.some((finding) => finding.code === "tool-without-cluster"),
    ).toBe(true);
  });

  it("detects a keyword shared by two tools", () => {
    const findings = auditKeywordClusters(
      { registrySlugs: [], registryPrimary: {}, registrySecondary: {} },
      [
        {
          slug: "a",
          primary: "alpha tool",
          secondary: [],
          groups: { longTail: ["shared phrase here"] },
        },
        {
          slug: "b",
          primary: "beta tool",
          secondary: [],
          groups: { longTail: ["shared phrase here"] },
        },
      ],
    );
    expect(findings.some((finding) => finding.code === "shared-keyword")).toBe(
      true,
    );
  });

  it("detects a cluster that contradicts the registry primary keyword", () => {
    const findings = auditKeywordClusters(
      {
        registrySlugs: ["merge-pdf"],
        registryPrimary: { "merge-pdf": "merge pdf" },
        registrySecondary: { "merge-pdf": [] },
      },
      [
        {
          slug: "merge-pdf",
          primary: "combine pdf",
          secondary: [],
          groups: {},
        },
      ],
    );
    expect(
      findings.some((finding) => finding.code === "primary-mismatch"),
    ).toBe(true);
  });
});
