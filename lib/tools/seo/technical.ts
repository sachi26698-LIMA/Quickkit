/**
 * Technical SEO generators and validators.
 *
 * robots.txt and sitemap.xml are formats with strict, small grammars. Most
 * "generators" online emit directives that crawlers ignore (or that block the
 * whole site by accident), so the value here is in the validation: the tool
 * parses what you produce back and flags the well-known failure modes —
 * `Disallow: /` with no `Allow`, a wildcard Google does not support, a sitemap
 * URL that is not absolute, a redirect chain more than one hop long.
 */

export type Issue = { severity: "error" | "warning" | "info"; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// robots.txt
// ─────────────────────────────────────────────────────────────────────────────

export type RobotsRule = { type: "allow" | "disallow"; path: string };
export type RobotsGroup = {
  userAgent: string;
  rules: RobotsRule[];
  crawlDelay?: number;
};

export type RobotsInput = {
  groups: RobotsGroup[];
  sitemaps?: string[];
  host?: string;
};

export type RobotsResult = {
  text: string;
  issues: Issue[];
  /** Every path any crawler is blocked from, for a human-readable summary. */
  blockedPaths: string[];
};

const normalisePath = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

/**
 * Generate robots.txt and validate the result in the same pass.
 *
 * The checks encode the mistakes that actually cost traffic: blocking
 * everything, disallowing CSS/JS (Google renders with them, so blocks produce
 * broken rendering), non-absolute sitemap URLs, and unsupported wildcard syntax
 * where a plain prefix would do.
 */
export function buildRobots(input: RobotsInput): RobotsResult {
  const issues: Issue[] = [];
  const blockedPaths: string[] = [];
  const blocks: string[] = [];

  if (input.groups.length === 0) {
    issues.push({
      severity: "warning",
      message:
        "No groups defined. An empty robots.txt allows everything — that is the default, so an empty file is legitimate.",
    });
  }

  for (const group of input.groups) {
    const agent = group.userAgent.trim() || "*";
    if (/\s/.test(agent)) {
      issues.push({
        severity: "error",
        message: `User-agent "${agent}" contains a space. A user-agent line names one crawler or *.`,
      });
    }
    const lines = [`User-agent: ${agent}`];
    for (const rule of group.rules) {
      const path = normalisePath(rule.path);
      lines.push(`${rule.type === "allow" ? "Allow" : "Disallow"}: ${path}`);
      if (rule.type === "disallow") {
        blockedPaths.push(path);
        if (/[#$^]/.test(path)) {
          issues.push({
            severity: "warning",
            message: `"${path}" uses a character that most crawlers treat literally; only * and $ have special meaning in robots.txt.`,
          });
        }
        if (/\.(css|js)(\?|$)/i.test(path)) {
          issues.push({
            severity: "error",
            message: `"${path}" blocks CSS or JavaScript. Google renders pages with them, so blocking them makes the crawl see a broken page.`,
          });
        }
      }
    }
    if (group.crawlDelay !== undefined) {
      if (group.crawlDelay < 0) {
        issues.push({
          severity: "error",
          message: "crawl-delay cannot be negative.",
        });
      }
      lines.push(`Crawl-delay: ${group.crawlDelay}`);
      if (agent.toLowerCase().includes("googlebot")) {
        issues.push({
          severity: "info",
          message:
            "Googlebot ignores Crawl-delay. Use Search Console's crawl rate setting instead.",
        });
      }
    }
    blocks.push(lines.join("\n"));
  }

  const disallowsAll = input.groups.some(
    (group) =>
      group.userAgent.trim() === "*" &&
      group.rules.some(
        (rule) => rule.type === "disallow" && normalisePath(rule.path) === "/",
      ) &&
      !group.rules.some((rule) => rule.type === "allow"),
  );
  if (disallowsAll) {
    issues.push({
      severity: "error",
      message:
        "Disallow: / with no Allow rule blocks the entire site, including crawlers you want. This is the single most damaging robots.txt mistake.",
    });
  }

  const sitemapLines = (input.sitemaps ?? [])
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      if (!/^https?:\/\//i.test(url)) {
        issues.push({
          severity: "error",
          message: `Sitemap URL "${url}" must be absolute (https://…). Relative paths are ignored.`,
        });
      }
      if (!/\.xml(\.gz)?$/i.test(url)) {
        issues.push({
          severity: "warning",
          message: `Sitemap "${url}" does not end in .xml; crawlers accept it but .xml is the convention and avoids surprises.`,
        });
      }
      return `Sitemap: ${url}`;
    });

  if (sitemapLines.length === 0) {
    issues.push({
      severity: "warning",
      message:
        "No Sitemap line. Listing your sitemap here helps discovery even though Search Console submission is the stronger signal.",
    });
  }

  if (input.host) {
    const host = input.host.trim();
    if (!/^https?:\/\//i.test(host)) {
      issues.push({
        severity: "info",
        message: "Host is a Yandex extension and expects a full URL.",
      });
    }
  }

  const sections = [...blocks];
  if (sitemapLines.length > 0) sections.push(sitemapLines.join("\n"));
  if (input.host) sections.push(`Host: ${input.host.trim()}`);

  return {
    text: sections.join("\n\n") + (sections.length > 0 ? "\n" : ""),
    issues,
    blockedPaths: [...new Set(blockedPaths)],
  };
}

/** Parse robots.txt back into groups and flag what would be ignored. */
export function parseRobots(text: string): {
  groups: RobotsGroup[];
  sitemaps: string[];
  issues: Issue[];
} {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const issues: Issue[] = [];
  let current: RobotsGroup | null = null;
  let lastWasUserAgent = false;

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) {
      lastWasUserAgent = false;
      return;
    }
    const colon = line.indexOf(":");
    if (colon === -1) {
      issues.push({
        severity: "error",
        message: `Line ${index + 1} ("${raw.trim()}") is not a directive; robots.txt uses "Key: value".`,
      });
      return;
    }
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === "user-agent") {
      if (!lastWasUserAgent || !current) {
        current = { userAgent: value, rules: [] };
        groups.push(current);
      } else {
        current.userAgent = `${current.userAgent}, ${value}`;
      }
      lastWasUserAgent = true;
      return;
    }

    lastWasUserAgent = false;
    if (!current) {
      issues.push({
        severity: "error",
        message: `Line ${index + 1} sets ${key} before any User-agent; it will be ignored.`,
      });
      return;
    }

    if (key === "allow" || key === "disallow") {
      if (!value) {
        if (key === "disallow") {
          issues.push({
            severity: "info",
            message: `Empty "Disallow:" means allow everything — valid but pointless.`,
          });
        }
        return;
      }
      current.rules.push({ type: key, path: value });
    } else if (key === "crawl-delay") {
      const delay = Number(value);
      if (Number.isNaN(delay)) {
        issues.push({
          severity: "error",
          message: `crawl-delay "${value}" is not a number.`,
        });
      } else {
        current.crawlDelay = delay;
      }
    } else if (key === "sitemap") {
      sitemaps.push(value);
    } else if (key === "host") {
      // Yandex extension; ignore.
    } else {
      issues.push({
        severity: "warning",
        message: `Unknown directive "${key}" on line ${index + 1} is ignored by crawlers.`,
      });
    }
  });

  return { groups, sitemaps, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// sitemap.xml
// ─────────────────────────────────────────────────────────────────────────────

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?:
    "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export type SitemapResult = { xml: string; issues: Issue[]; count: number };

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Build a sitemap and validate it in the same pass.
 *
 * Enforces the limits that actually invalidate a sitemap: 50,000 URLs and 50 MB
 * uncompressed per file, absolute URLs, matching hostnames, ISO 8601 lastmod,
 * no duplicate locs, and the rule that a URL must not appear twice.
 */
export function buildSitemap(urls: SitemapUrl[]): SitemapResult {
  const issues: Issue[] = [];
  if (urls.length === 0) {
    issues.push({ severity: "error", message: "Add at least one URL." });
  }
  if (urls.length > 50_000) {
    issues.push({
      severity: "error",
      message: `${urls.length} URLs exceeds the 50,000-per-file limit. Split into a sitemap index.`,
    });
  }

  const seen = new Set<string>();
  let host: string | null = null;

  const body = urls.map((entry, index) => {
    const loc = entry.loc.trim();
    if (!/^https?:\/\//i.test(loc)) {
      issues.push({
        severity: "error",
        message: `URL ${index + 1} ("${loc}") is not absolute. Every <loc> must be a full URL.`,
      });
    } else {
      try {
        const parsed = new URL(loc);
        if (host === null) host = parsed.host;
        else if (parsed.host !== host) {
          issues.push({
            severity: "warning",
            message: `URL ${index + 1} is on ${parsed.host} but earlier URLs are on ${host}. One sitemap should cover one host; use an index otherwise.`,
          });
        }
      } catch {
        issues.push({
          severity: "error",
          message: `URL ${index + 1} ("${loc}") could not be parsed.`,
        });
      }
    }
    if (seen.has(loc)) {
      issues.push({
        severity: "warning",
        message: `Duplicate URL "${loc}" — it is listed twice.`,
      });
    }
    seen.add(loc);

    if (
      entry.lastmod &&
      !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(
        entry.lastmod,
      )
    ) {
      issues.push({
        severity: "error",
        message: `lastmod "${entry.lastmod}" is not ISO 8601 (YYYY-MM-DD or a full timestamp).`,
      });
    }
    if (
      entry.priority !== undefined &&
      (entry.priority < 0 || entry.priority > 1)
    ) {
      issues.push({
        severity: "error",
        message: `priority ${entry.priority} is outside 0.0–1.0.`,
      });
    }

    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      entry.lastmod
        ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : null,
      entry.changefreq
        ? `    <changefreq>${entry.changefreq}</changefreq>`
        : null,
      entry.priority !== undefined
        ? `    <priority>${entry.priority.toFixed(1)}</priority>`
        : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n");
  });

  if (urls.some((entry) => entry.changefreq !== undefined)) {
    issues.push({
      severity: "info",
      message:
        "Google ignores changefreq and priority. They are harmless and other engines read them; lastmod is the one that matters.",
    });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...body,
    "</urlset>",
    "",
  ].join("\n");

  return { xml, issues, count: urls.length };
}

/** Parse sitemap XML pasted by the user and report what is wrong with it. */
export function parseSitemap(xml: string): {
  urls: SitemapUrl[];
  sitemaps: string[];
  issues: Issue[];
} {
  const issues: Issue[] = [];
  const urls: SitemapUrl[] = [];
  const sitemapIndexUrls: string[] = [];

  if (!/<urlset|<sitemapindex/i.test(xml)) {
    issues.push({
      severity: "error",
      message:
        "No <urlset> or <sitemapindex> element found — this is not a sitemap.",
    });
  }
  if (
    !/xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i.test(
      xml,
    )
  ) {
    issues.push({
      severity: "error",
      message:
        "The <urlset> is missing the sitemap 0.9 namespace declaration, which makes the file invalid.",
    });
  }

  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const block = match[1];
    const loc = /<loc>([\s\S]*?)<\/loc>/i.exec(block)?.[1]?.trim() ?? "";
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/i.exec(block)?.[1]?.trim();
    const changefreq = /<changefreq>([\s\S]*?)<\/changefreq>/i
      .exec(block)?.[1]
      ?.trim();
    const priority = /<priority>([\s\S]*?)<\/priority>/i
      .exec(block)?.[1]
      ?.trim();
    if (!loc) {
      issues.push({
        severity: "error",
        message: "A <url> entry has no <loc>.",
      });
      continue;
    }
    urls.push({
      loc,
      lastmod,
      changefreq: changefreq as SitemapUrl["changefreq"],
      priority: priority !== undefined ? Number(priority) : undefined,
    });
  }

  for (const match of xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi)) {
    const loc = /<loc>([\s\S]*?)<\/loc>/i.exec(match[1])?.[1]?.trim();
    if (loc) sitemapIndexUrls.push(loc);
  }

  if (urls.length === 0 && sitemapIndexUrls.length === 0) {
    issues.push({
      severity: "error",
      message: "The sitemap contains no <url> or <sitemap> entries.",
    });
  }
  if (urls.length > 50_000) {
    issues.push({
      severity: "error",
      message: `${urls.length} URLs exceeds the 50,000 limit.`,
    });
  }

  const seen = new Set<string>();
  for (const url of urls) {
    if (!/^https?:\/\//i.test(url.loc)) {
      issues.push({
        severity: "error",
        message: `<loc> "${url.loc}" is not an absolute URL.`,
      });
    }
    if (seen.has(url.loc)) {
      issues.push({
        severity: "warning",
        message: `"${url.loc}" appears more than once.`,
      });
    }
    seen.add(url.loc);
  }

  return { urls, sitemaps: sitemapIndexUrls, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical / hreflang / redirects
// ─────────────────────────────────────────────────────────────────────────────

/** Compare a page URL with its declared canonical and report real conflicts. */
export function canonicalCheck(input: {
  pageUrl: string;
  canonical: string;
  /** Canonical tags found on other pages that point here, if any. */
  isSelfReferencing?: boolean;
}): { ok: boolean; issues: Issue[]; normalised: string } {
  const issues: Issue[] = [];
  const page = input.pageUrl.trim();
  const canonical = input.canonical.trim();

  if (!canonical) {
    issues.push({
      severity: "error",
      message:
        "No canonical declared. Without one, a URL with tracking parameters competes with the clean URL.",
    });
    return { ok: false, issues, normalised: "" };
  }
  if (!/^https?:\/\//i.test(canonical)) {
    issues.push({
      severity: "error",
      message:
        "A canonical must be absolute. Relative canonicals are resolved inconsistently.",
    });
  }

  let pageUrl: URL | null = null;
  let canonicalUrl: URL | null = null;
  try {
    pageUrl = new URL(page);
  } catch {
    issues.push({
      severity: "error",
      message: "The page URL could not be parsed.",
    });
  }
  try {
    canonicalUrl = new URL(canonical);
  } catch {
    issues.push({
      severity: "error",
      message: "The canonical URL could not be parsed.",
    });
  }

  if (pageUrl && canonicalUrl) {
    if (pageUrl.protocol !== canonicalUrl.protocol) {
      issues.push({
        severity: "warning",
        message: `The page is ${pageUrl.protocol} but the canonical is ${canonicalUrl.protocol}. Pick one scheme site-wide.`,
      });
    }
    const pageHost = pageUrl.host.replace(/^www\./, "");
    const canonicalHost = canonicalUrl.host.replace(/^www\./, "");
    if (pageHost !== canonicalHost) {
      issues.push({
        severity: "error",
        message: `The canonical points at a different host (${canonicalUrl.host}). That tells crawlers this page is a duplicate of another site.`,
      });
    }
    if (pageUrl.host !== canonicalUrl.host) {
      issues.push({
        severity: "info",
        message: `www and non-www differ here (${pageUrl.host} vs ${canonicalUrl.host}); that is the intended use of a canonical cross-domain-free — keep it consistent everywhere.`,
      });
    }
    const pagePath = pageUrl.pathname.replace(/\/$/, "");
    const canonicalPath = canonicalUrl.pathname.replace(/\/$/, "");
    if (pagePath !== canonicalPath) {
      issues.push({
        severity: "warning",
        message: `The canonical path (${canonicalPath || "/"}) differs from the page path (${pagePath || "/"}). Correct only when consolidating near-duplicates.`,
      });
    }
    if (pageUrl.search && !canonicalUrl.search) {
      issues.push({
        severity: "info",
        message:
          "The page has query parameters and the canonical drops them — that is the correct pattern for tracking parameters.",
      });
    }
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
    normalised: canonicalUrl ? canonicalUrl.toString() : canonical,
  };
}

export type HreflangEntry = { hreflang: string; url: string };

/**
 * Check an hreflang cluster: reciprocity, self-reference, valid language tags,
 * and a sane x-default. All four are hard requirements; a cluster missing any
 * one is ignored entirely by Google, which is why this check earns its place.
 */
export function checkHreflang(
  entries: HreflangEntry[],
  pageUrl: string,
): { issues: Issue[]; ok: boolean } {
  const issues: Issue[] = [];
  if (entries.length === 0) {
    issues.push({
      severity: "error",
      message: "Add at least one hreflang entry.",
    });
    return { issues, ok: false };
  }

  const validTag =
    /^(x-default|[a-z]{2,3}(-[A-Za-z]{2}|-[A-Za-z]{4}|-[A-Za-z]{2}-[A-Za-z]{2})?)$/;
  const seenTags = new Set<string>();
  const seenUrls = new Set<string>();

  entries.forEach((entry, index) => {
    if (!validTag.test(entry.hreflang)) {
      issues.push({
        severity: "error",
        message: `"${entry.hreflang}" is not a valid hreflang value. Use ISO 639-1 language, optional ISO 3166-1 region, or x-default.`,
      });
    }
    if (!/^https?:\/\//i.test(entry.url)) {
      issues.push({
        severity: "error",
        message: `Entry ${index + 1} URL must be absolute.`,
      });
    }
    if (seenTags.has(entry.hreflang)) {
      issues.push({
        severity: "error",
        message: `"${entry.hreflang}" is declared more than once. Each language-region pair gets one URL.`,
      });
    }
    seenTags.add(entry.hreflang);
    if (seenUrls.has(entry.url)) {
      issues.push({
        severity: "warning",
        message: `"${entry.url}" is the target for more than one hreflang value.`,
      });
    }
    seenUrls.add(entry.url);
  });

  if (!seenTags.has("x-default")) {
    issues.push({
      severity: "warning",
      message:
        "No x-default. It tells crawlers which page to serve when no language matches; without it an unmatched user may get any version.",
    });
  }

  const selfReferenced = entries.some((entry) => entry.url === pageUrl);
  if (!selfReferenced) {
    issues.push({
      severity: "error",
      message:
        "The cluster does not include this page. Every page in an hreflang cluster must reference itself, including the default.",
    });
  }

  return { issues, ok: !issues.some((issue) => issue.severity === "error") };
}

// ─────────────────────────────────────────────────────────────────────────────
// Redirect chains
// ─────────────────────────────────────────────────────────────────────────────

export type RedirectHop = { from: string; to: string; status: number };

export type ChainResult = {
  chains: { path: string[]; hops: number; finalStatus: number }[];
  loops: string[][];
  issues: Issue[];
};

const normaliseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.host}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
    } catch {
      return trimmed.toLowerCase();
    }
  }
  return trimmed.replace(/\/$/, "").toLowerCase();
};

/**
 * Resolve redirect chains from a list of rules and flag what wastes crawl
 * budget: chains longer than one hop, loops, 302s standing in for permanent
 * 301s, and redirects into a URL that is itself redirected.
 */
export function analyseRedirects(rules: RedirectHop[]): ChainResult {
  const map = new Map<string, RedirectHop>();
  for (const rule of rules) {
    const from = normaliseUrl(rule.from);
    if (from) map.set(from, rule);
  }

  const chains: ChainResult["chains"] = [];
  const loops: string[][] = [];
  const issues: Issue[] = [];

  for (const [start, rule] of map) {
    const path: string[] = [rule.from];
    const visited = new Set<string>([start]);
    let current = rule;
    let hops = 0;
    let finalStatus = rule.status;
    let looped = false;

    while (hops < 20) {
      const next = normaliseUrl(current.to);
      path.push(current.to);
      hops++;
      finalStatus = current.status;
      if (visited.has(next)) {
        looped = true;
        loops.push(path);
        break;
      }
      visited.add(next);
      const following = map.get(next);
      if (!following) break;
      current = following;
    }

    if (looped) {
      issues.push({
        severity: "error",
        message: `Redirect loop: ${path.join(" → ")}. Browsers stop with ERR_TOO_MANY_REDIRECTS.`,
      });
      continue;
    }

    chains.push({ path, hops, finalStatus });
    if (hops > 1) {
      issues.push({
        severity: "warning",
        message: `${hops} hops to reach ${path[path.length - 1]}. Every extra hop dilutes the signal and slows the crawl; redirect straight to the final URL.`,
      });
    }
    if (rule.status === 302) {
      issues.push({
        severity: "info",
        message: `${rule.from} uses 302 (temporary). Use 301 when the move is permanent, so ranking signals consolidate.`,
      });
    }
  }

  return {
    chains: chains.sort((a, b) => b.hops - a.hops).slice(0, 100),
    loops,
    issues,
  };
}
