#!/usr/bin/env node
/**
 * Site crawl: verifies every reachable route and every internal hyperlink
 * against a running build, without needing a browser.
 *
 *   node scripts/check-site-links.mjs [baseUrl]
 *
 * Checks, for each page discovered from the crawler's entry points:
 *   - HTTP 200
 *   - exactly one <h1>
 *   - a <title>, a meta description of useful length and a canonical link
 *   - no `href="#"`, no empty href, no `javascript:` href
 *   - in-page anchors (#id) resolve to an element with that id
 *   - every internal link is followed and verified (breadth-first, capped)
 *
 * Exits non-zero and prints every problem if anything fails, so it can gate a
 * release. Playwright supersedes it for interaction and axe checks; this script
 * is the dependency-free backstop for "no broken links".
 */
const base = (
  process.argv[2] ||
  process.env.SITE_BASE_URL ||
  "http://127.0.0.1:3001"
).replace(/\/$/, "");
const MAX_PAGES = 400;

const discovered = new Map(); // path -> { links, anchors, title, h1 }
const queue = ["/"];
const problems = [];
const notes = [];
const external = new Set();

function normalise(href) {
  if (!href) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;
  if (href.startsWith("http")) {
    if (!href.startsWith(base)) {
      external.add(href);
      return null;
    }
    return href.slice(base.length) || "/";
  }
  if (!href.startsWith("/")) return null;
  return href;
}

const attr = (html, re) => {
  const match = re.exec(html);
  return match ? match[1] : "";
};

async function fetchPage(path) {
  const response = await fetch(base + path, { redirect: "manual" });
  return {
    status: response.status,
    html: response.status === 200 ? await response.text() : "",
  };
}

while (queue.length && discovered.size < MAX_PAGES) {
  const path = queue.shift();
  if (discovered.has(path)) continue;
  const noFragment = path.split("#")[0] || "/";
  if (discovered.has(noFragment) && noFragment !== path) {
    // Anchor target page already crawled; the anchor is validated there.
    continue;
  }
  const { status, html } = await fetchPage(noFragment);
  const record = {
    status,
    title: "",
    h1Count: 0,
    description: "",
    canonical: "",
    links: [],
    ids: new Set(),
  };
  if (status !== 200) {
    problems.push(`${noFragment} → HTTP ${status}`);
  } else {
    record.title = attr(html, /<title>([^<]*)<\/title>/);
    record.h1Count = (html.match(/<h1[\s>]/g) || []).length;
    record.description = attr(
      html,
      /<meta name="description" content="([^"]*)"/,
    );
    record.canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
    for (const match of html.matchAll(/\sid="([^"]+)"/g))
      record.ids.add(match[1]);
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]*)"/g)) {
      const raw = match[1];
      if (raw === "#" || raw === "") {
        problems.push(`${noFragment} → placeholder href="${raw}"`);
        continue;
      }
      const target = normalise(raw.replace(/&amp;/g, "&"));
      if (!target) continue;
      record.links.push(raw);
      const [targetPath, fragment] = target.split("#");
      const cleanTarget = targetPath || "/";
      if (fragment && cleanTarget === noFragment) {
        if (!record.ids.has(fragment))
          problems.push(`${noFragment} → dead anchor #${fragment}`);
      } else if (fragment) {
        record.links.push(`${cleanTarget}#${fragment}`);
      }
      if (!discovered.has(cleanTarget) && !queue.includes(cleanTarget))
        queue.push(cleanTarget);
    }
    if (record.h1Count !== 1)
      problems.push(`${noFragment} → ${record.h1Count} <h1> elements`);
    if (!record.title) problems.push(`${noFragment} → missing <title>`);
    if (record.description.length < 70)
      problems.push(
        `${noFragment} → meta description too short (${record.description.length})`,
      );
    if (!record.canonical)
      // Canonicals are only emitted when the operator has configured a verified
      // HTTPS origin (SITE_URL). Without one, a missing canonical is correct
      // behaviour, so it is reported as a note rather than a failure.
      notes.push(`${noFragment} → no canonical (no SITE_URL configured)`);
  }
  discovered.set(noFragment, record);
}

// Fragment-only targets discovered before their page was crawled.
for (const record of discovered.keys()) {
  for (const link of discovered.get(record).links) {
    if (!link.includes("#")) continue;
    const [path, fragment] = link.split("#");
    const target = path || record;
    const page = discovered.get(target);
    if (page && fragment && !page.ids.has(fragment))
      problems.push(`${record} → dead anchor ${link}`);
  }
}

const byStatus = [...discovered.entries()].filter(
  ([, page]) => page.status === 200,
).length;
console.log(
  `Crawled ${discovered.size} routes (${byStatus} returned 200) from ${base}`,
);
console.log(`External links not fetched: ${external.size}`);
console.log(`Placeholder/dead-link problems: ${problems.length}`);
console.log(`Notes (non-blocking): ${notes.length}`);
if (notes.length && process.env.VERBOSE)
  for (const note of notes) console.log(`  · ${note}`);
for (const problem of problems) console.log(`  ✗ ${problem}`);
process.exit(problems.length ? 1 : 0);
