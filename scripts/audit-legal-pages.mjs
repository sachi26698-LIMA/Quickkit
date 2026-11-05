#!/usr/bin/env node
/**
 * Phase 2 legal audit — runs against a production build and reports, per route:
 * status, title/meta/canonical/OG/robots, heading outline, breadcrumbs, ToC
 * anchors, related links, footer links, placeholder markers, and a scan for
 * claims the implementation cannot support (an address that was never
 * confirmed, tracking that does not exist, certifications).
 *
 *   node scripts/audit-legal-pages.mjs [baseUrl]
 */
const base = (process.argv[2] || "http://127.0.0.1:3001").replace(/\/$/, "");

const ROUTES = [
  "/terms",
  "/privacy",
  "/cookies",
  "/disclaimer",
  "/about",
  "/contact",
  "/faq",
  "/copyright",
  "/accessibility",
  "/security",
  "/file-handling",
  "/intellectual-property",
];

const get = async (path) => {
  const res = await fetch(base + path);
  return {
    status: res.status,
    html: res.status === 200 ? await res.text() : "",
  };
};
// Accept both /g regexes and plain ones by cloning with the global flag.
const all = (html, re) => {
  const global = re.global ? re : new RegExp(re.source, re.flags + "g");
  // Without a capture group, return the whole match.
  return [...html.matchAll(global)].map((m) => m[1] ?? m[0]);
};
const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;|&#x27;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

const problems = [];
const notes = [];
const rows = [];

// Claims that must never appear, because the implementation cannot support them.
const FORBIDDEN_CLAIMS = [
  ["hello@quickkit.in", "withdrawn demo address is still published"],
  ["100% local", "absolute locality claim"],
  ["100% private", "absolute privacy claim"],
  ["completely private", "absolute privacy claim"],
  ["GDPR compliant", "compliance claim"],
  ["GDPR-compliant", "compliance claim"],
  ["CCPA compliant", "compliance claim"],
  ["ISO 27001 certified", "certification claim"],
  ["SOC 2", "certification claim"],
  ["HIPAA", "compliance claim"],
  ["military-grade", "unverifiable security claim"],
  ["bank-level", "unverifiable security claim"],
  ["we never store any data", "overbroad claim (hosting logs exist)"],
  ["we do not log", "overbroad claim (provider logs exist)"],
  ["guaranteed secure", "absolute security claim"],
];

for (const route of ROUTES) {
  const { status, html } = await get(route);
  const row = { route, status, issues: [] };
  if (status !== 200) {
    problems.push(`${route} → HTTP ${status}`);
    rows.push(row);
    continue;
  }

  // ---- structure -----------------------------------------------------------
  const h1 = all(html, /<h1[^>]*>([\s\S]*?)<\/h1>/g).map(text);
  const h2 = all(html, /<h2[^>]*>([\s\S]*?)<\/h2>/g).map(text);
  const h3 = all(html, /<h3[^>]*>([\s\S]*?)<\/h3>/g).map(text);
  row.h1 = h1[0] ?? "(none)";
  row.h2Count = h2.length;
  row.h3Count = h3.length;
  const mainHtml = html.slice(
    html.indexOf('<main id="main"'),
    html.lastIndexOf("</main>"),
  );
  const mainH2 = all(mainHtml, /<h2[^>]*>([\s\S]*?)<\/h2>/g).map(text);
  const mainH1 = all(mainHtml, /<h1[^>]*>([\s\S]*?)<\/h1>/g).length;
  if (mainH1 !== 1) problems.push(`${route} → ${mainH1} h1 inside <main>`);
  if (mainH2.length === 0) problems.push(`${route} → no h2 inside <main>`);

  // ---- metadata ------------------------------------------------------------
  row.title = all(html, /<title>([\s\S]*?)<\/title>/)[0] ?? "";
  row.description =
    all(html, /<meta name="description" content="([^"]*)"/)[0] ?? "";
  row.robots =
    all(html, /<meta name="robots" content="([^"]*)"/)[0] ?? "(none)";
  row.ogTitle =
    all(html, /<meta property="og:title" content="([^"]*)"/)[0] ?? "";
  row.ogImage =
    all(html, /<meta property="og:image" content="([^"]*)"/)[0] ?? "";
  row.canonical = all(html, /<link rel="canonical" href="([^"]*)"/)[0] ?? "";
  if (!row.title.includes("QUICKKIT"))
    problems.push(`${route} → title lacks site name`);
  if (row.title.length > 75)
    problems.push(`${route} → title too long (${row.title.length})`);
  if (row.description.length < 70 || row.description.length > 175)
    problems.push(
      `${route} → meta description length ${row.description.length}`,
    );
  if (!row.ogTitle) problems.push(`${route} → missing og:title`);
  if (!row.robots) problems.push(`${route} → missing robots meta`);
  row.hasTimes = /<time datetime="\d{4}-\d{2}-\d{2}"/.test(html);

  // ---- navigation ----------------------------------------------------------
  const breadcrumb = html.slice(html.indexOf('aria-label="Breadcrumb"'));
  row.breadcrumb =
    breadcrumb.includes('href="/"') && breadcrumb.includes("aria-current");
  if (!row.breadcrumb)
    problems.push(`${route} → breadcrumb missing or incomplete`);

  const tocIds = all(
    html,
    /class="legal-toc-list"[^>]*>([\s\S]*?)<\/ol>/g,
  ).flatMap((block) => all(block, /href="#([a-z0-9-]+)"/g));
  // ToC targets may be headings *or* the <section> that wraps them; both are
  // valid scroll targets, so accept either.
  const headingIds = [
    ...all(html, /<h[2-4] id="([a-z0-9-]+)"/g),
    ...all(html, /<section id="([a-z0-9-]+)"/g),
    ...all(html, /<div id="([a-z0-9-]+)"/g),
  ];
  const deadToc = [...new Set(tocIds)].filter((id) => !headingIds.includes(id));
  row.tocEntries = new Set(tocIds).size;
  if (deadToc.length)
    problems.push(
      `${route} → ToC anchors with no heading: ${deadToc.join(", ")}`,
    );
  if (row.tocEntries === 0) problems.push(`${route} → no table of contents`);

  const related = all(html, /class="legal-related"[\s\S]*?<\/nav>/g).flatMap(
    (block) => all(block, /href="(\/[a-z-]+)"/g),
  );
  row.related = new Set(related).size;
  if (related.includes(route))
    problems.push(`${route} → links to itself under related`);

  // ---- footer --------------------------------------------------------------
  const footer = html.slice(html.indexOf("<footer"));
  const groups = all(footer, /<nav aria-label="([^"]+)"/g);
  row.footerGroups = groups.length;
  if (groups.length !== 4)
    problems.push(`${route} → ${groups.length} footer groups`);
  const footerLinks = all(footer, /href="([^"]+)"/g).filter((h) =>
    h.startsWith("/"),
  );
  if (footerLinks.includes("#"))
    problems.push(`${route} → footer contains a "#" href`);
  row.footerLinks = new Set(footerLinks).size;

  // ---- placeholder / honesty markers --------------------------------------
  const body = text(mainHtml);
  row.placeholders = (
    mainHtml.match(/class="owner-placeholder"/g) || []
  ).length;
  row.ownerNotice = mainHtml.includes("Owner input required");
  row.draftNote =
    mainHtml.includes("Draft") || mainHtml.includes("pending owner details");

  for (const [needle, why] of FORBIDDEN_CLAIMS) {
    const haystack = body.toLowerCase();
    const target = needle.toLowerCase();
    let at = haystack.indexOf(target);
    while (at !== -1) {
      // A mention inside an explicit disclaimer ("not SOC 2 attested", "no
      // claim of ... HIPAA") is the honest case, not a violation. Judge the
      // whole sentence, so a negation earlier in a long sentence still counts.
      let start = at;
      while (start > 0 && !/[.!?]/.test(haystack[start - 1])) start -= 1;
      let end = at;
      while (end < haystack.length && !/[.!?]/.test(haystack[end])) end += 1;
      const context = haystack.slice(start, end);
      const negated = /\b(no|not|never|without|neither|none|nor)\b/.test(
        context,
      );
      if (!negated) {
        problems.push(`${route} → "${needle}" (${why})`);
        row.issues.push(needle);
        break;
      }
      at = haystack.indexOf(target, at + 1);
    }
  }
  // A published address must be a real one — verified live by the owner, not
  // taken on faith from the repository.
  const mailtos = [...new Set(all(mainHtml, /href="mailto:([^"?]+)/g))];
  row.mailtos = mailtos;
  for (const address of mailtos) {
    if (address === "hello@quickkit.in")
      problems.push(`${route} → live mailto to the withdrawn demo address`);
  }
  if (mailtos.length === 0 && route !== "/about" && route !== "/faq")
    notes.push(`${route} → no published address (placeholder shown instead)`);

  rows.push(row);
}

// ---- site-level -------------------------------------------------------------
const sitemapXml = await (await fetch(base + "/sitemap.xml")).text();
const robotsTxt = await (await fetch(base + "/robots.txt")).text();
const locs = all(sitemapXml, /<loc>([^<]*)<\/loc>/g);

console.log("=".repeat(78));
console.log(`LEGAL PAGE AUDIT — ${base}`);
console.log("=".repeat(78));
for (const row of rows) {
  console.log(
    [
      row.route.padEnd(24),
      `h1=${String(row.h1).slice(0, 34).padEnd(34)}`,
      `h2=${String(row.h2Count).padStart(2)}`,
      `h3=${String(row.h3Count).padStart(2)}`,
      `toc=${String(row.tocEntries).padStart(2)}`,
      `rel=${String(row.related).padStart(2)}`,
      `ph=${String(row.placeholders).padStart(2)}`,
      `time=${row.hasTimes ? "y" : "n"}`,
      `desc=${String(row.description.length).padStart(3)}`,
    ].join(" "),
  );
}

console.log("\n--- metadata ---");
for (const row of rows) {
  console.log(
    `${row.route.padEnd(24)} robots=${row.robots.padEnd(16)} canonical=${row.canonical || "(none — SITE_URL unset)"}`,
  );
}

console.log("\n--- site level ---");
console.log(
  `sitemap.xml url entries: ${locs.length} (expected 0 while indexing is blocked)`,
);
console.log(`robots.txt: ${robotsTxt.trim().split("\n").join(" | ")}`);
if (robotsTxt.includes("Disallow: /")) {
  notes.push(
    "indexing is blocked (SITE_URL/LAUNCH_APPROVED unset) — expected pre-launch",
  );
} else if (!robotsTxt.includes("Sitemap:")) {
  problems.push("robots.txt allows crawling but advertises no sitemap");
}

console.log(`\n--- problems: ${problems.length} ---`);
for (const p of problems) console.log(`  ✗ ${p}`);
console.log(`\n--- notes: ${notes.length} ---`);
for (const n of notes) console.log(`  · ${n}`);

process.exit(problems.length ? 1 : 0);
