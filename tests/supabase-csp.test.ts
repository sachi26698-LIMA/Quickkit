import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * The policy does not allow the Supabase API origin in `connect-src`, and that
 * is only correct while Supabase stays a server-side concern. These tests make
 * the claim explicit, so the change that breaks it — any browser-side contact
 * with the Supabase API — fails here with an explanation instead of failing
 * silently in a user's browser.
 *
 * The original guards only caught the *SDK* shape of that mistake
 * (`createBrowserClient`, `@supabase/*` imports). A hand-written
 * `fetch("https://<ref>.supabase.co/rest/v1/...")` in a client component would
 * have slipped through and been dead on arrival under this policy, so the scan
 * below also looks for the transport: a Supabase host literal, or an absolute
 * URL assembled from the configured base at runtime.
 *
 * If this suite fails because you *intentionally* added a browser Supabase
 * call, the fix is to add the validated origin back to `CONNECT_SRC_SOURCES`
 * in `next.config.ts` (see `getSupabaseCspOrigin` in `lib/supabase/config.ts`),
 * not to loosen these assertions.
 */

const ROOT = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const sourceFiles = [
  ...walk(join(ROOT, "app")),
  ...walk(join(ROOT, "components")),
  ...walk(join(ROOT, "lib")),
  ...walk(join(ROOT, "workers")),
];

/** Repo-relative, POSIX-style, so failure output is readable and stable. */
const rel = (file: string) => relative(ROOT, file).split("\\").join("/");

// Every file is read once. The previous revision re-read client components
// inside a nested loop (85k reads, ~1.3 GB) and took eight seconds.
const sourceCache = new Map<string, string>();
const read = (file: string): string => {
  const cached = sourceCache.get(file);
  if (cached !== undefined) return cached;
  const value = readFileSync(file, "utf8");
  sourceCache.set(file, value);
  return value;
};

const isTestFile = (file: string) => rel(file).startsWith("tests/");
const isSupabaseModule = (file: string) =>
  rel(file).startsWith("lib/supabase/");
const isClientComponent = (file: string) =>
  /^\s*["']use client["']/.test(read(file));

/** A file no browser ever receives: route handlers, the proxy, server-only modules. */
const isServerOnlyModule = (file: string) => {
  const source = read(file);
  return (
    /^\s*import\s+["']server-only["']/m.test(source) ||
    rel(file).endsWith("proxy.ts") ||
    /^\s*export\s+const\s+runtime\s*=\s*["']nodejs["']/m.test(source)
  );
};

/* ------------------------------------------------------------ text passes --- */

/**
 * Remove everything a browser never executes.
 *
 * Comment stripping matters because this repository *documents* the rule in
 * prose — `lib/supabase/config.ts` explains the `.supabase.co` check, the
 * security page names Google hosts. Those mentions are not code and must not
 * trip the guard. String literals are deliberately preserved: a host written
 * inside a string is exactly what the literal scan below is looking for.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** Every single-quoted, double-quoted and template-literal body in the file. */
function stringLiteralsOf(source: string): string[] {
  const literals: string[] = [];
  for (const match of stripComments(source).matchAll(
    /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g,
  )) {
    literals.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return literals;
}

/* --------------------------------------------------------------- patterns --- */

/** A literal Supabase API host: `xxx.supabase.co` / `xxx.supabase.in`. */
const SUPABASE_HOST = /\b[\w-]+\.supabase\.(?:co|in)\b/;

/**
 * A template literal that interpolates a host suffix, e.g.
 * `` `https://${ref}.supabase.co/auth/v1/token` ``. `SUPABASE_HOST` cannot see
 * this because the subdomain is not literal text.
 */
const SUPABASE_HOST_FROM_TEMPLATE = /\$\{[^}]*\}\.supabase\.(?:co|in)\b/;

/** Code that builds a Supabase URL from the configured base at runtime. */
const SUPABASE_BASE_IN_URL = /new\s+URL\s*\(/;

const mentionsSupabaseEnv = (source: string) =>
  /NEXT_PUBLIC_SUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY)/.test(source);

/**
 * The detection used by both the real scan and the self-tests. Returns a list
 * of human-readable reasons the source looks like browser-side Supabase
 * traffic; an empty list means nothing was found.
 */
function supabaseTrafficIn(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  if (SUPABASE_HOST.test(code)) found.push("hard-coded Supabase API host");
  if (SUPABASE_HOST_FROM_TEMPLATE.test(code))
    found.push("Supabase host interpolated into a template literal");
  if (mentionsSupabaseEnv(code) && SUPABASE_BASE_IN_URL.test(code))
    found.push("URL built from NEXT_PUBLIC_SUPABASE_* at runtime");
  return found;
}

/* ------------------------------------------------------- client reachability --- */

/**
 * Every module a browser can end up executing.
 *
 * Starting from each `"use client"` entry point, follow its relative and `@/`
 * imports. This is the honest definition of "could a browser run this?" — a
 * shared helper is only a problem once a client component imports it, which is
 * exactly the transitive case a per-file `"use client"` check misses.
 */
function clientReachableModules(): Map<string, string> {
  const byModuleSpecifier = new Map<string, string>();
  for (const file of sourceFiles) {
    const noExt = rel(file).replace(/\.tsx?$/, "");
    byModuleSpecifier.set(noExt, file);
    byModuleSpecifier.set(noExt.replace(/^lib\//, "@/lib/"), file);
    byModuleSpecifier.set(
      noExt.replace(/^components\//, "@/components/"),
      file,
    );
  }

  const reachable = new Map<string, string>(); // file -> first client entry
  const queue: [string, string][] = sourceFiles
    .filter(isClientComponent)
    .map((file) => [file, rel(file)]);

  while (queue.length > 0) {
    const [file, entry] = queue.shift()!;
    if (reachable.has(file)) continue;

    // A `server-only` module is a hard boundary: importing one from a client
    // component fails the Next.js build, so its contents can never be bundled
    // for a browser and nothing behind it is client-reachable.
    if (isServerOnlyModule(file)) continue;

    reachable.set(file, entry);

    // `import type` is erased by the compiler and cannot carry runtime code,
    // so those specifiers are dropped before the graph is walked. Without this
    // the walk reaches type-only leaves such as `lib/supabase/admin-data.ts`
    // and reports a violation for an import that emits nothing.
    const imports = read(file)
      .replace(/^\s*import\s+type\s[\s\S]*?from\s+["'][^"']+["'];?/gm, "")
      .replace(/^\s*export\s+type\s[\s\S]*?from\s+["'][^"']+["'];?/gm, "");

    for (const match of imports.matchAll(
      /from\s+["']((?:\.{1,2}\/|@\/)[^"']+)["']/g,
    )) {
      const specifier = match[1].replace(/^@\//, "").replace(/^\.{1,2}\//, "");
      for (const suffix of ["", "/index"]) {
        const target =
          byModuleSpecifier.get(specifier + suffix) ??
          byModuleSpecifier.get(
            `${rel(file).split("/").slice(0, -1).join("/")}/${specifier}${suffix}`,
          );
        if (target && !reachable.has(target)) queue.push([target, entry]);
      }
    }
  }
  return reachable;
}

/* ------------------------------------------------------------------ tests --- */

describe("Supabase stays server-side", () => {
  it("never constructs a browser Supabase client", () => {
    const offenders = sourceFiles
      .filter((file) => /\bcreateBrowserClient\b/.test(read(file)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("only imports the Supabase SDK from server-only modules or the proxy", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      if (isSupabaseModule(file)) continue;
      const source = read(file);
      const importsSupabaseSdk =
        /from\s+"@supabase\/supabase-js"/.test(source) ||
        /from\s+"@supabase\/ssr"/.test(source);
      if (!importsSupabaseSdk) continue;
      if (rel(file).endsWith("proxy.ts")) continue;
      offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
  });

  it("keeps every Supabase API host out of browser-reachable code", () => {
    const offenders: string[] = [];
    for (const [file, entry] of clientReachableModules()) {
      if (isTestFile(file)) continue;
      const reasons = supabaseTrafficIn(read(file));
      if (reasons.length > 0)
        offenders.push(
          `${rel(file)} (reached from ${entry}): ${reasons.join("; ")}`,
        );
    }
    expect(offenders).toEqual([]);
  });

  it("keeps a Supabase host out of every literal in a client component", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      if (!isClientComponent(file) || isTestFile(file)) continue;
      for (const literal of stringLiteralsOf(read(file))) {
        if (
          SUPABASE_HOST.test(literal) ||
          SUPABASE_HOST_FROM_TEMPLATE.test(literal)
        ) {
          offenders.push(`${rel(file)} — literal ${JSON.stringify(literal)}`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  /* ------------------------------------------------- allowed server usage --- */

  it("still allows every real server-side use of Supabase", () => {
    // These are the modules that legitimately reach Supabase. Assert the
    // allowance is earned rather than assumed: if one lost its `server-only`
    // marker, the browser could suddenly load it.
    const serverModules = sourceFiles.filter(
      (file) =>
        isSupabaseModule(file) &&
        /createClient|createServerClient/.test(read(file)),
    );
    expect(serverModules.length).toBeGreaterThan(0);
    for (const file of serverModules) {
      expect(
        /^\s*import\s+["']server-only["']/m.test(read(file)),
        `${rel(file)} must keep "import server-only"`,
      ).toBe(true);
    }
  });

  it("classifies real server code as server-only, and client code as not", () => {
    // Positive proof the classifier recognises both sides: `proxy.ts` and the
    // server Supabase client are sanctioned entry points; a client component is
    // not one, and none of them is reachable *as* a browser module through the
    // server files.
    expect(isServerOnlyModule(join(ROOT, "proxy.ts"))).toBe(true);
    expect(isServerOnlyModule(join(ROOT, "lib", "supabase", "server.ts"))).toBe(
      true,
    );
    expect(isClientComponent(join(ROOT, "lib", "supabase", "server.ts"))).toBe(
      false,
    );
    const reachable = clientReachableModules();
    expect(reachable.has(join(ROOT, "lib", "supabase", "server.ts"))).toBe(
      false,
    );
    expect(reachable.has(join(ROOT, "lib", "supabase", "admin-data.ts"))).toBe(
      false,
    );
    // And at least one real client component is in the set, so the walk is not
    // silently returning nothing.
    expect(reachable.size).toBeGreaterThan(0);
  });

  /* ---------------------------------------------------- the policy itself --- */

  it("does not carry the Supabase origin in the Content-Security-Policy", async () => {
    // NODE_ENV is typed read-only by Next's augmentation; stub it instead.
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { default: config } = await import("../next.config");
    const rules = (await config.headers?.()) ?? [];
    const policies = rules.flatMap((rule) =>
      (rule.headers as { key: string; value: string }[])
        .filter((header) => /^Content-Security-Policy/.test(header.key))
        .map((header) => header.value),
    );
    try {
      expect(policies.length).toBeGreaterThan(0);
      for (const policy of policies) {
        const connect = (policy.match(/connect-src([^;]*)/)?.[1] ?? "").trim();
        expect(connect).not.toMatch(/supabase\.(co|in)/);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

/**
 * The guards above are only worth having if they actually fail. These tests run
 * the same detection over synthetic sources — proving both the rejected
 * browser-side shapes and the accepted server-side shapes — so a future
 * refactor that neuters a regex is caught here rather than by a production CSP
 * violation.
 */
describe("the guard itself rejects browser-side Supabase usage", () => {
  it("rejects a direct fetch to a hard-coded project host", () => {
    expect(
      supabaseTrafficIn(
        `"use client";
         export async function load() {
           return fetch("https://abcdefghijkl.supabase.co/rest/v1/tools");
         }`,
      ),
    ).toContain("hard-coded Supabase API host");
  });

  it("rejects a URL assembled from the configured base", () => {
    expect(
      supabaseTrafficIn(
        `"use client";
         const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
         export const rest = new URL("/rest/v1/tools", base!).toString();`,
      ),
    ).toContain("URL built from NEXT_PUBLIC_SUPABASE_* at runtime");
  });

  it("rejects a template literal that interpolates the project host", () => {
    expect(
      supabaseTrafficIn(
        "const url = `https://${ref}.supabase.co/auth/v1/token`;",
      ),
    ).toContain("Supabase host interpolated into a template literal");
  });

  it("accepts the same host inside a comment", () => {
    expect(
      supabaseTrafficIn(
        `"use client";
         // PostgREST lives at <ref>.supabase.co; never call it from here.
         /* https://abcdefghijkl.supabase.co */
         export const ok = true;`,
      ),
    ).toEqual([]);
  });

  it("leaves ordinary server configuration alone", () => {
    // Reading the public config is not traffic; only building a URL from it is.
    expect(
      supabaseTrafficIn(
        `const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();`,
      ),
    ).toEqual([]);
  });
});
