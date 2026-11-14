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
