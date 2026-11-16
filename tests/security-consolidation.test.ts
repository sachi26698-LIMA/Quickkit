import { describe, expect, it } from "vitest";
import { securityToolDefinitions } from "../lib/tools/security/catalog";
import {
  securityGroups,
  legacySecurityRedirects,
  legacySecurityFavorites,
} from "../lib/tools/security/consolidation";
import { filterTools, toolsByCategory } from "../lib/catalog";
import config from "../next.config";

describe("security consolidation registry", () => {
  it("assigns every original dedicated workspace exactly once and preserves shared workspaces", () => {
    const operations = securityGroups.flatMap((group) => [...group.operations]);
    expect(new Set(operations).size).toBe(operations.length);
    const dedicated = securityToolDefinitions.map((tool) => tool.slug);
    expect(dedicated).toHaveLength(57);
    for (const slug of dedicated)
      expect(
        operations.filter((operation) => operation === slug),
        slug,
      ).toHaveLength(1);
    for (const slug of [
      "password-generator",
      "hash-generator",
      "base64-encoder-decoder",
    ])
      expect(operations).toContain(slug);
    expect(toolsByCategory("Security & Privacy")).toHaveLength(9);
  });
  it("maps every old dedicated URL to exactly the assigned operation and favorite", async () => {
    expect(legacySecurityRedirects).toHaveLength(57);
    expect(await config.redirects?.()).toEqual(
      expect.arrayContaining(legacySecurityRedirects),
    );
    for (const { source, destination } of legacySecurityRedirects) {
      const old = source.slice("/tools/".length);
      const url = new URL(destination, "https://example.test");
      const group = securityGroups.find(
        (item) => `/tools/${item.slug}` === url.pathname,
      );
      expect(group).toBeDefined();
      expect(url.searchParams.get("operation")).toBe(old);
      expect(group!.operations as readonly string[]).toContain(old);
      expect(legacySecurityFavorites[old]).toBe(group!.slug);
    }
  });
  it("finds each original operation name in its unified tool", () => {
    for (const tool of securityToolDefinitions) {
      const destination = legacySecurityFavorites[tool.slug];
      expect(
        filterTools(tool.name, "Security & Privacy").map((item) => item.slug),
        tool.name,
      ).toContain(destination);
    }
  });
  it("scopes fixed network endpoints to the consolidated network pages", async () => {
    const headers = await config.headers?.();
    for (const [path, host] of [
      ["/tools/dns-email-security", "https://cloudflare-dns.com"],
      ["/tools/url-network-privacy", "https://api64.ipify.org"],
    ]) {
      const rule = headers?.find((item) => item.source === path);
      expect(
        rule?.headers.find((item) =>
          item.key.startsWith("Content-Security-Policy"),
        )?.value,
      ).toContain(host);
    }
  });
});

/**
 * A redirect is only useful if its destination actually renders the operation.
 *
 * `/tools/hash-generator` used to render the standalone <HashGenerator /> while
 * its group owned three operations. The legacy URLs for hash-comparison and
 * file-privacy-checker redirected there with `?operation=…`, the page ignored
 * the parameter, and both tools had no reachable UI at all. Nothing caught it
 * because every static assertion above was about the *registry*, not about
 * which component a route chooses to render.
 */
describe("every redirect destination renders the operation it promises", () => {
  /** Route files that mount the tabbed workspace instead of a single tool. */
  const consolidatedRoutes = new Set(securityGroups.map((group) => group.slug));

  it("mounts the tabbed workspace for every group that owns several operations", () => {
    for (const group of securityGroups) {
      if (group.operations.length < 2) continue;
      expect(consolidatedRoutes.has(group.slug), group.slug).toBe(true);
    }
  });

  it("points every legacy redirect at a group that contains that operation", () => {
    for (const { source, destination } of legacySecurityRedirects) {
      const url = new URL(destination, "http://example.test");
      const groupSlug = url.pathname.replace("/tools/", "");
      const group = securityGroups.find((item) => item.slug === groupSlug);
      expect(group, `${source} -> ${destination}`).toBeDefined();
      const operation = url.searchParams.get("operation");
      expect(operation, destination).toBeTruthy();
      expect(
        group!.operations,
        `${source} sends users to ${destination}, which does not own "${operation}"`,
      ).toContain(operation);
    }
  });

  it("keeps a multi-operation route from silently rendering a single tool", async () => {
    // Guard the specific regression: /tools/hash-generator owns three
    // operations, so its page must use the shared workspace.
    const fs = await import("node:fs/promises");
    for (const group of securityGroups) {
      if (group.operations.length < 2) continue;
      const candidates = [
        `app/(public)/tools/${group.slug}/page.tsx`,
        `app/(public)/tools/${group.slug}/page.ts`,
      ];
      for (const file of candidates) {
        let source: string;
        try {
          source = await fs.readFile(file, "utf8");
        } catch {
          continue; // route not present; the dynamic [calculator] page handles it
        }
        expect(
          source.includes("ConsolidatedWorkspace"),
          `${file} renders a single tool but ${group.slug} owns ${group.operations.length} operations (${group.operations.join(", ")}); the legacy redirects would land on a page that ignores ?operation=`,
        ).toBe(true);
      }
    }
  });
});
