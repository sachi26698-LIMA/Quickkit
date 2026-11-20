"use client";

import { useState } from "react";
import {
  analyseRedirects,
  buildRobots,
  buildSitemap,
  canonicalCheck,
  checkHreflang,
  parseRobots,
  parseSitemap,
} from "@/lib/tools/seo/technical";
import {
  BreakdownTable,
  CodePreview,
  Disclosure,
  EmptyState,
  Field,
  FieldGrid,
  Notice,
  ResultPanel,
  SelectField,
  Stat,
  StatRow,
} from "@/components/tools/launch/ui";

type Mode =
  | "robots-txt-generator"
  | "sitemap-generator"
  | "canonical-checker"
  | "hreflang-checker"
  | "redirect-checker"
  | "robots-validator"
  | "sitemap-validator";

export default function TechnicalSeo({ mode }: { mode: Mode }) {
  switch (mode) {
    case "sitemap-generator":
      return <SitemapTool />;
    case "canonical-checker":
      return <CanonicalTool />;
    case "hreflang-checker":
      return <HreflangTool />;
    case "redirect-checker":
      return <RedirectTool />;
    case "robots-validator":
      return <RobotsValidator />;
    case "sitemap-validator":
      return <SitemapValidator />;
    default:
      return <RobotsTool />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const USER_AGENTS = [
  { value: "*", label: "All crawlers" },
  { value: "Googlebot", label: "Googlebot" },
  { value: "Bingbot", label: "Bingbot" },
  { value: "Twitterbot", label: "Twitterbot" },
];

function RobotsTool() {
  const [userAgent, setUserAgent] = useState("*");
  const [allow, setAllow] = useState("");
  const [disallow, setDisallow] = useState("/admin/\n/cart/\n/api/");
  const [sitemap, setSitemap] = useState("");
  const [crawlDelay, setCrawlDelay] = useState("");

  const result = buildRobots({
    groups: [
      {
        userAgent,
        rules: [
          ...allow
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((path) => ({ type: "allow" as const, path })),
          ...disallow
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((path) => ({ type: "disallow" as const, path })),
        ],
        crawlDelay: crawlDelay.trim() ? Number(crawlDelay) : undefined,
      },
    ],
    sitemaps: sitemap.trim() ? [sitemap] : [],
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Rules</h2>
        <p className="qw-section-note">
          One path per line. Allow rules are checked before Disallow on most
          crawlers, which is why an Allow can rescue a path inside a blocked
          directory — that is the advanced technique, and the validator flags it
          either way.
        </p>
        <FieldGrid columns={2}>
          <SelectField
            label="User agent"
            value={userAgent}
            onChange={setUserAgent}
            options={USER_AGENTS}
          />
          <Field
            label="Sitemap URL"
            value={sitemap}
            onChange={setSitemap}
            placeholder="https://example.com/sitemap.xml"
            hint="Must be absolute."
          />
          <Field
            label="Crawl delay (seconds)"
            value={crawlDelay}
            onChange={setCrawlDelay}
            inputMode="numeric"
            hint="Googlebot ignores this; other crawlers honour it."
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <FieldGrid columns={2}>
            <Field
              label="Allow paths"
              value={allow}
              onChange={setAllow}
              multiline
              rows={4}
              placeholder="/public/"
            />
            <Field
              label="Disallow paths"
              value={disallow}
              onChange={setDisallow}
              multiline
              rows={4}
            />
          </FieldGrid>
        </div>
      </div>

      <ResultPanel
        title="robots.txt"
        show
        text={result.text}
        filename="robots"
        textExtension="txt"
        textType="text/plain;charset=utf-8"
        onReset={() => {
          setDisallow("/admin/");
          setAllow("");
          setSitemap("");
        }}
      >
        <StatRow>
          <Stat
            label="Rules"
            value={String(
              allow.split("\n").filter(Boolean).length +
                disallow.split("\n").filter(Boolean).length,
            )}
            emphasis
          />
          <Stat
            label="Blocked paths"
            value={String(result.blockedPaths.length)}
          />
          <Stat
            label="Issues"
            value={String(result.issues.length)}
            detail="Shown below"
          />
        </StatRow>

        {result.issues.filter((issue) => issue.severity === "error").length >
        0 ? (
          <Notice tone="error">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.issues
                .filter((issue) => issue.severity === "error")
                .map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
            </ul>
          </Notice>
        ) : null}
        {result.issues.filter((issue) => issue.severity !== "error").length >
        0 ? (
          <Notice tone="warning">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.issues
                .filter((issue) => issue.severity !== "error")
                .map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
            </ul>
          </Notice>
        ) : null}

        <div className="qw-mono" aria-label="Generated robots.txt">
          {result.text}
        </div>

        <Disclosure summary="Copy this straight to your server">
          <p>
            The file must be served from <code>/robots.txt</code> at the root of
            the domain, in plain text. A robots.txt under a subdirectory is
            ignored.
          </p>
        </Disclosure>

        <Disclosure summary="The mistakes that cost the most traffic">
          <p>
            <strong>Disallow: /</strong> with no Allow blocks everything,
            including your homepage. It usually happens when a staging file is
            deployed to production.
          </p>
          <p>
            <strong>Blocking CSS and JavaScript.</strong> Google renders pages
            using them. A blocked stylesheet makes the crawl see a broken
            layout, which affects how the page is assessed. Only the old,
            now-retired rules recommended doing this.
          </p>
          <p>
            <strong>Assuming robots.txt removes a page from the index.</strong>{" "}
            It prevents crawling, not indexing. To remove a page use noindex or
            a removal request; robots plus noindex is a trap, because the
            noindex tag is never seen if the page is never crawled.
          </p>
        </Disclosure>
      </ResultPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RobotsValidator() {
  const [input, setInput] = useState("");
  const result = input.trim() ? parseRobots(input) : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Paste robots.txt</h2>
        <p className="qw-section-note">
          The parser reports directives that will be ignored: unknown keys,
          rules set before any User-agent line, and non-numeric crawl delays.
        </p>
        <Field
          label="robots.txt"
          value={input}
          onChange={setInput}
          multiline
          rows={12}
          placeholder={
            "User-agent: *\nDisallow: /admin/\n\nSitemap: https://example.com/sitemap.xml"
          }
        />
      </div>

      {!result ? (
        <EmptyState>Paste a robots.txt file to check it.</EmptyState>
      ) : (
        <ResultPanel
          title="Parse result"
          show
          text={[
            `Groups: ${result.groups.length}`,
            `Sitemaps: ${result.sitemaps.join(", ") || "none"}`,
            "",
            ...result.issues.map(
              (issue) => `[${issue.severity}] ${issue.message}`,
            ),
          ].join("\n")}
          filename="robots-parse"
        >
          <StatRow>
            <Stat
              label="Groups"
              value={String(result.groups.length)}
              emphasis
            />
            <Stat label="Sitemaps" value={String(result.sitemaps.length)} />
            <Stat label="Issues" value={String(result.issues.length)} />
          </StatRow>

          {result.issues.length > 0 ? (
            <Notice
              tone={
                result.issues.some((i) => i.severity === "error")
                  ? "error"
                  : "warning"
              }
            >
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue, index) => (
                  <li key={index}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="success">No directives that would be ignored.</Notice>
          )}

          {result.groups.map((group) => (
            <div
              key={group.userAgent}
              className="qw-workspace-panel"
              style={{ background: "#fbfafd", marginTop: 12 }}
            >
              <span className="qw-chip">{group.userAgent}</span>
              <p className="qw-hint" style={{ margin: "8px 0 0" }}>
                {group.rules.length} rule{group.rules.length === 1 ? "" : "s"}
                {group.crawlDelay !== undefined
                  ? ` · crawl-delay ${group.crawlDelay}s`
                  : ""}
              </p>
            </div>
          ))}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SitemapTool() {
  const [urls, setUrls] = useState("");
  const [lastmod, setLastmod] = useState("");
  const [changefreq, setChangefreq] = useState("none");

  const entries = urls
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((loc) => ({
      loc,
      lastmod: lastmod.trim() || undefined,
      changefreq: changefreq === "none" ? undefined : (changefreq as "daily"),
    }));

  const result = buildSitemap(entries);
  const ready = entries.length > 0;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">URLs</h2>
        <p className="qw-section-note">
          One absolute URL per line, up to 50,000. lastmod matters; changefreq
          and priority are ignored by Google and kept only because other engines
          still read them.
        </p>
        <Field
          label="URLs"
          value={urls}
          onChange={setUrls}
          multiline
          rows={10}
          placeholder={
            "https://example.com/\nhttps://example.com/tools\nhttps://example.com/about"
          }
        />
        <div style={{ marginTop: 14 }}>
          <FieldGrid columns={2}>
            <Field
              label="lastmod (optional)"
              value={lastmod}
              onChange={setLastmod}
              placeholder="2026-03-01"
              hint="ISO 8601. Use the date content actually changed."
            />
            <SelectField
              label="changefreq (optional)"
              value={changefreq}
              onChange={setChangefreq}
              options={[
                { value: "none", label: "Omit" },
                { value: "daily", label: "daily" },
                { value: "weekly", label: "weekly" },
                { value: "monthly", label: "monthly" },
              ]}
            />
          </FieldGrid>
        </div>
      </div>

      {!ready ? (
        <EmptyState>
          Add at least one absolute URL to build the sitemap.
        </EmptyState>
      ) : (
        <ResultPanel
          title="sitemap.xml"
          show
          text={result.xml}
          filename="sitemap"
          textExtension="xml"
          textType="application/xml;charset=utf-8"
          onReset={() => {
            setUrls("");
            setLastmod("");
          }}
        >
          <StatRow>
            <Stat
              label="URLs"
              value={String(result.count)}
              detail="Limit 50,000 per file"
              emphasis
            />
            <Stat label="Issues" value={String(result.issues.length)} />
            <Stat label="Max size" value="50 MB" detail="Uncompressed" />
          </StatRow>

          {result.issues.filter((i) => i.severity === "error").length > 0 ? (
            <Notice tone="error">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues
                  .filter((i) => i.severity === "error")
                  .map((issue) => (
                    <li key={issue.message}>{issue.message}</li>
                  ))}
              </ul>
            </Notice>
          ) : null}
          {result.issues.filter((i) => i.severity !== "error").length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues
                  .filter((i) => i.severity !== "error")
                  .map((issue) => (
                    <li key={issue.message}>{issue.message}</li>
                  ))}
              </ul>
            </Notice>
          ) : null}

          <CodePreview
            value={result.xml}
            language="xml"
            label="Generated sitemap.xml"
          />

          <Disclosure summary="What a sitemap does and does not do">
            <p>
              A sitemap is a discovery hint. It does not guarantee crawling,
              indexing or ranking, and a page omitted from it can still be
              indexed if it is linked.
            </p>
            <p>
              Only include canonical URLs that should be indexed. A sitemap full
              of redirects, 404s or noindexed pages wastes crawl budget and
              sends mixed signals about which URLs matter.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SitemapValidator() {
  const [input, setInput] = useState("");
  const result = input.trim() ? parseSitemap(input) : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Paste sitemap XML</h2>
        <p className="qw-section-note">
          Checks the namespace declaration, the 50,000-URL limit, absolute URLs,
          duplicates and whether the file is a urlset or an index.
        </p>
        <Field
          label="Sitemap XML"
          value={input}
          onChange={setInput}
          multiline
          rows={12}
          placeholder={
            '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">…'
          }
        />
      </div>

      {!result ? (
        <EmptyState>Paste a sitemap to check it.</EmptyState>
      ) : (
        <ResultPanel
          title="Sitemap check"
          show
          text={[
            `URLs: ${result.urls.length}`,
            `Sitemap index entries: ${result.sitemaps.length}`,
            "",
            ...result.issues.map(
              (issue) => `[${issue.severity}] ${issue.message}`,
            ),
          ].join("\n")}
          filename="sitemap-check"
        >
          <StatRow>
            <Stat label="URLs" value={String(result.urls.length)} emphasis />
            <Stat
              label="Index entries"
              value={String(result.sitemaps.length)}
            />
            <Stat label="Issues" value={String(result.issues.length)} />
          </StatRow>
          {result.issues.length > 0 ? (
            <Notice
              tone={
                result.issues.some((i) => i.severity === "error")
                  ? "error"
                  : "warning"
              }
            >
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue, index) => (
                  <li key={index}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="success">The sitemap is structurally valid.</Notice>
          )}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CanonicalTool() {
  const [pageUrl, setPageUrl] = useState("");
  const [canonical, setCanonical] = useState("");

  const result = canonicalCheck({ pageUrl, canonical });
  const ready = pageUrl.trim() && canonical.trim();

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Page and canonical</h2>
        <p className="qw-section-note">
          Compares the URL a page is served at against the canonical it
          declares. Relative canonicals, a different host and a mismatched path
          are the three conflicts that actually de-index pages.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Page URL"
            value={pageUrl}
            onChange={setPageUrl}
            placeholder="https://example.com/tools/pdf?utm_source=x"
          />
          <Field
            label="Declared canonical"
            value={canonical}
            onChange={setCanonical}
            placeholder="https://example.com/tools/pdf"
          />
        </FieldGrid>
      </div>

      {!ready ? (
        <EmptyState>Enter both URLs to compare them.</EmptyState>
      ) : (
        <ResultPanel
          title="Canonical check"
          show
          text={[
            `Page: ${pageUrl}`,
            `Canonical: ${canonical}`,
            `Normalised: ${result.normalised}`,
            result.ok ? "No blocking conflicts." : "Conflicts found.",
            "",
            ...result.issues.map(
              (issue) => `[${issue.severity}] ${issue.message}`,
            ),
          ].join("\n")}
          filename="canonical-check"
        >
          <StatRow>
            <Stat
              label="Status"
              value={result.ok ? "No conflicts" : "Conflicts"}
              detail="Blocking errors only"
              emphasis
            />
            <Stat
              label="Normalised canonical"
              value={result.normalised || "—"}
            />
          </StatRow>
          {result.issues.length > 0 ? (
            <Notice tone={result.ok ? "warning" : "error"}>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue, index) => (
                  <li key={index}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="success">
              The canonical points at this page on the same host with a
              consistent path.
            </Notice>
          )}

          <Disclosure summary="When a non-self canonical is correct">
            <p>
              A canonical pointing elsewhere is right when this URL is a genuine
              duplicate — a print view, a filtered listing, a tracking-parameter
              variant. It is wrong when it consolidates two pages that answer
              different questions, because the second page then never ranks for
              its own query.
            </p>
            <p>
              Canonical is a hint, not a directive. Google may ignore it when
              the signals disagree, which is why the redirect is the stronger
              tool for a permanent move.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HreflangTool() {
  const [pageUrl, setPageUrl] = useState("");
  const [rows, setRows] = useState<{ hreflang: string; url: string }[]>([
    { hreflang: "en-IN", url: "" },
    { hreflang: "x-default", url: "" },
  ]);

  const result = checkHreflang(rows, pageUrl);
  const ready = rows.some((row) => row.url.trim());

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">hreflang cluster</h2>
        <p className="qw-section-note">
          Every page in a cluster must reference every other page, including
          itself, plus an x-default. A cluster missing any of those is ignored
          entirely — which is why this check exists.
        </p>
        <div style={{ marginBottom: 14 }}>
          <Field
            label="This page's URL"
            value={pageUrl}
            onChange={setPageUrl}
            placeholder="https://example.com/en-in/"
            hint="Must appear in the cluster below."
          />
        </div>
        <div style={{ display: "grid", gap: 9 }}>
          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "0 1 130px", minWidth: 110 }}>
                <label className="qw-sr-only" htmlFor={`hl-tag-${index}`}>
                  Language tag {index + 1}
                </label>
                <input
                  id={`hl-tag-${index}`}
                  className="qw-input"
                  value={row.hreflang}
                  placeholder="en-IN"
                  onChange={(event) =>
                    setRows(
                      rows.map((item, position) =>
                        position === index
                          ? { ...item, hreflang: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                <label className="qw-sr-only" htmlFor={`hl-url-${index}`}>
                  URL {index + 1}
                </label>
                <input
                  id={`hl-url-${index}`}
                  className="qw-input"
                  value={row.url}
                  placeholder="https://example.com/en-in/"
                  onChange={(event) =>
                    setRows(
                      rows.map((item, position) =>
                        position === index
                          ? { ...item, url: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="secondary"
                aria-label={`Remove entry ${index + 1}`}
                onClick={() =>
                  setRows(rows.filter((_, position) => position !== index))
                }
                disabled={rows.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 12 }}
          onClick={() => setRows([...rows, { hreflang: "", url: "" }])}
        >
          Add language
        </button>
      </div>

      {!ready ? (
        <EmptyState>Add at least one URL to check the cluster.</EmptyState>
      ) : (
        <ResultPanel
          title="hreflang check"
          show
          text={[
            result.ok ? "Cluster is valid." : "Cluster has blocking errors.",
            "",
            ...result.issues.map(
              (issue) => `[${issue.severity}] ${issue.message}`,
            ),
          ].join("\n")}
          filename="hreflang-check"
        >
          <StatRow>
            <Stat
              label="Status"
              value={result.ok ? "Valid" : "Invalid"}
              detail="Blocking errors only"
              emphasis
            />
            <Stat label="Entries" value={String(rows.length)} />
            <Stat label="Issues" value={String(result.issues.length)} />
          </StatRow>
          {result.issues.length > 0 ? (
            <Notice tone={result.ok ? "warning" : "error"}>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue, index) => (
                  <li key={index}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="success">
              Reciprocal, self-referencing, with a valid x-default.
            </Notice>
          )}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RedirectTool() {
  const [input, setInput] = useState("");

  const rules = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*[|,\s]\s*/).filter(Boolean);
      return parts.length >= 2
        ? {
            from: parts[0],
            to: parts[1],
            status: parts[2] ? Number(parts[2]) : 301,
          }
        : null;
    })
    .filter(
      (rule): rule is { from: string; to: string; status: number } => !!rule,
    );

  const result = analyseRedirects(rules);
  const ready = rules.length > 0;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Redirect rules</h2>
        <p className="qw-section-note">
          One rule per line: <code>from | to | status</code>. Resolves chains
          and loops — the two defects that waste crawl budget and break links
          silently.
        </p>
        <Field
          label="Rules"
          value={input}
          onChange={setInput}
          multiline
          rows={9}
          placeholder={
            "/old-page | /new-page | 301\n/tools/pdf | /tools/merge-pdf | 301"
          }
        />
      </div>

      {!ready ? (
        <EmptyState>Add redirect rules to analyse the chains.</EmptyState>
      ) : (
        <ResultPanel
          title="Chain analysis"
          show
          text={[
            `Chains: ${result.chains.length}`,
            `Loops: ${result.loops.length}`,
            "",
            ...result.issues.map(
              (issue) => `[${issue.severity}] ${issue.message}`,
            ),
            "",
            "Resolved chains:",
            ...result.chains.map(
              (chain) =>
                `${chain.path.join(" → ")} (${chain.hops} hop${chain.hops === 1 ? "" : "s"})`,
            ),
          ].join("\n")}
          filename="redirect-analysis"
          csvRows={[
            ["Chain", "Hops", "Final status"],
            ...result.chains.map((chain) => [
              chain.path.join(" -> "),
              chain.hops,
              chain.finalStatus,
            ]),
          ]}
        >
          <StatRow>
            <Stat
              label="Longest chain"
              value={`${Math.max(0, ...result.chains.map((chain) => chain.hops))} hops`}
              detail="One hop is ideal"
              emphasis
            />
            <Stat
              label="Loops"
              value={String(result.loops.length)}
              detail="Break the site"
            />
            <Stat
              label="Multi-hop"
              value={String(
                result.chains.filter((chain) => chain.hops > 1).length,
              )}
            />
          </StatRow>

          {result.issues.filter((i) => i.severity === "error").length > 0 ? (
            <Notice tone="error">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues
                  .filter((i) => i.severity === "error")
                  .map((issue, index) => (
                    <li key={index}>{issue.message}</li>
                  ))}
              </ul>
            </Notice>
          ) : null}

          {result.chains.length > 0 ? (
            <BreakdownTable
              caption="Resolved chains"
              head={["Path", "Hops"]}
              rows={result.chains.map((chain) => ({
                label: chain.path.join(" → "),
                value: String(chain.hops),
                tone: chain.hops > 1 ? "deduction" : "neutral",
              }))}
            />
          ) : null}

          <Disclosure summary="Why one hop matters">
            <p>
              Each redirect is a small delay and a small loss of signal. A chain
              of five means a crawler fetches five URLs to reach a page it could
              have reached in one. Flatten every chain to point directly at the
              final destination.
            </p>
            <p>
              301 passes the strongest signal for a permanent move. 302 is for
              temporary moves and should never be used where a 301 is correct —
              it tells crawlers the original URL will return.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}
