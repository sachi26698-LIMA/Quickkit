#!/usr/bin/env node
/**
 * Live production smoke test for the www canonical migration.
 *
 * Verifies the REAL public HTTP behaviour of https://www.quickkit.live from a
 * network that can reach it (GitHub Actions runners, or the owner's machine).
 * The agent sandbox cannot reach the live host, so this script is the evidence
 * path for redirect/canonical/sitemap claims that cannot be proven locally.
 *
 * Usage: node scripts/live-smoke.mjs [origin]
 *        default origin: https://www.quickkit.live
 *
 * Exit code 0 = every check passed; 1 = at least one failure (details on stdout).
 */

const CANONICAL = process.argv[2] || "https://www.quickkit.live";
const APEX = "https://quickkit.live";

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

async function head(url, redirect = "manual") {
  const res = await fetch(url, {
    redirect,
    headers: { "user-agent": "QUICKKIT-LiveSmoke/1.0" },
  });
  return res;
}

async function get(url, redirect = "follow") {
  const res = await fetch(url, {
    redirect,
    headers: { "user-agent": "QUICKKIT-LiveSmoke/1.0" },
  });
  const body = await res.text();
  return { res, body };
}

function oneHop(res, finalUrl) {
  // Manual fetch exposes exactly one hop; follow the Location chain ourselves
  // so we can count hops and detect loops.
  return {
    status: res.status,
    location: res.headers.get("location"),
    finalUrl,
  };
}

async function chain(url, maxHops = 5) {
  const hops = [];
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await head(current, "manual");
    hops.push({
      url: current,
      status: res.status,
      location: res.headers.get("location"),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location"), current).href;
    } else {
      return { hops, final: current, finalStatus: res.status };
    }
  }
  return { hops, final: current, finalStatus: null, loop: true };
}

async function main() {
  // ── 1. Host/scheme variants must all land on the canonical www origin ──
  for (const start of [
    `${APEX}/`,
    `http://${APEX.slice("https://".length)}/`,
    `http://www.quickkit.live/`,
  ]) {
    const { hops, final, finalStatus, loop } = await chain(start);
    const permanent = hops
      .filter((h) => h.status >= 300 && h.status < 400)
      .every((h) => [301, 308].includes(h.status));
    const noLoop = !loop && hops.length <= 4;
    const landsOnCanonical =
      final === `${CANONICAL}` ||
      final === `${CANONICAL}/` ||
      final === CANONICAL;
    record(
      `redirect chain ${start} -> ${CANONICAL}`,
      permanent && noLoop && landsOnCanonical && finalStatus === 200,
      `${hops.map((h) => h.status).join(" -> ")} ends ${final}`,
    );
  }

  // The canonical https://www origin itself must answer 200 without redirect.
  {
    const res = await head(`${CANONICAL}/`, "manual");
    record(
      "canonical origin serves 200 without redirect",
      res.status === 200,
      `status ${res.status}`,
    );
  }

  // ── 2. Canonical tags and Open Graph URLs ──
  for (const path of [
    "/",
    "/tools",
    "/tools/merge-pdf",
    "/tools/qr-code-generator",
  ]) {
    const { res, body } = await get(`${CANONICAL}${path}`);
    const canonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const expected = path === "/" ? CANONICAL : `${CANONICAL}${path}`;
    const okCanonical = canonical === expected;
    const ogUrl = body.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
    const okOg = ogUrl === expected;
    record(
      `canonical + og:url on ${path}`,
      res.status === 200 && okCanonical && okOg,
      `canonical=${canonical} og:url=${ogUrl}`,
    );
    record(
      `no retired-alias reference in ${path} HTML`,
      !body.includes("quickkit-rosy") &&
        !body.includes(`https://quickkit.live`),
      "grep quickkit-rosy / apex",
    );
  }

  // ── 3. robots.txt ──
  {
    const { res, body } = await get(`${CANONICAL}/robots.txt`);
    record(
      "robots.txt advertises canonical sitemap",
      res.status === 200 && body.includes(`Sitemap: ${CANONICAL}/sitemap.xml`),
      body
        .split("\n")
        .find((l) => /sitemap/i.test(l))
        ?.trim(),
    );
    record(
      "robots.txt does not disallow CSS/JS or the site root",
      /Allow: \/\n/.test(body) && !/Disallow: \/_next/.test(body),
    );
  }

  // ── 4. sitemap.xml ──
  {
    const { res, body } = await get(`${CANONICAL}/sitemap.xml`);
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    // Good: the bare canonical homepage, or a path below the canonical origin.
    // Bad: anything else — apex, alias, localhost, trailing-slash homepage
    // duplicate, or a URL with no path on a different host.
    const bad = locs.filter(
      (u) =>
        u !== CANONICAL &&
        !(u.startsWith(`${CANONICAL}/`) && u !== `${CANONICAL}/`),
    );
    record(
      "sitemap.xml: 200 and only canonical www URLs",
      res.status === 200 && locs.length > 100 && bad.length === 0,
      `${locs.length} URLs, ${bad.length} non-canonical${bad.length ? ` (${bad.slice(0, 3).join(", ")})` : ""}`,
    );
    record(
      "sitemap.xml: no apex, alias or loopback URLs",
      !body.includes("quickkit-rosy") &&
        !body.includes("localhost") &&
        !body.includes("https://quickkit.live"),
    );
  }

  // ── 5. Indexing controls ──
  for (const [path, want] of [
    ["/saved", "noindex"],
    ["/qr", "noindex"],
    ["/admin", "noindex"],
    ["/auth/callback", "noindex"],
  ]) {
    const res = await head(`${CANONICAL}${path}`, "manual");
    const robots = res.headers.get("x-robots-tag") || "";
    record(
      `X-Robots-Tag on ${path}`,
      robots.includes(want),
      robots || "(missing)",
    );
  }

  // ── 6. 404 behaviour and OG image ──
  {
    const res = await head(
      `${CANONICAL}/this-route-does-not-exist-smoke`,
      "manual",
    );
    record(
      "unknown route returns 404",
      res.status === 404,
      `status ${res.status}`,
    );
  }
  {
    const res = await head(`${CANONICAL}/opengraph-image`, "manual");
    record(
      "opengraph-image resolves",
      res.status === 200 &&
        (res.headers.get("content-type") || "").startsWith("image/"),
      `${res.status} ${res.headers.get("content-type")}`,
    );
  }

  // ── 7. Legacy in-app redirects preserved ──
  for (const [from, to] of [
    ["/tools/image-converter", "/tools/image-to-image"],
    ["/tools/words-to-pdf", "/tools/word-to-pdf"],
    ["/copyright", "/intellectual-property"],
  ]) {
    const res = await head(`${CANONICAL}${from}`, "manual");
    const loc = res.headers.get("location") || "";
    record(
      `legacy redirect ${from} -> ${to}`,
      [307, 308].includes(res.status) && loc.endsWith(to),
      `${res.status} ${loc}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.`,
  );
  if (failed.length) {
    console.log("Failed checks:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("smoke test crashed:", error);
  process.exit(1);
});
