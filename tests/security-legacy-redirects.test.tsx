// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import ConsolidatedWorkspace from "../components/tools/security/consolidated-workspace";
import {
  legacySecurityRedirects,
  securityGroups,
} from "../lib/tools/security/consolidation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tools/example",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

afterEach(cleanup);

/**
 * The registry-level test in `security-consolidation.test.ts` checks that a
 * multi-operation route mounts the shared workspace. This one proves the
 * user-visible outcome end to end: for every legacy URL, the destination
 * really renders and selects the operation the redirect names.
 *
 * This is what would have caught `/tools/hash-comparison` and
 * `/tools/file-privacy-checker`, which redirected to a page that rendered a
 * single tool and had no matching tab at all.
 */
describe("legacy security URLs reach a selectable tab", () => {
  it("selects the redirected operation on the destination workspace", async () => {
    const byGroup = new Map<string, Set<string>>();
    for (const { destination } of legacySecurityRedirects) {
      const url = new URL(destination, "http://example.test");
      const slug = url.pathname.replace("/tools/", "");
      const operation = url.searchParams.get("operation")!;
      if (!byGroup.has(slug)) byGroup.set(slug, new Set());
      byGroup.get(slug)!.add(operation);
    }
    expect(byGroup.size).toBeGreaterThan(0);
    let checked = 0;
    for (const [slug, operations] of byGroup) {
      const group = securityGroups.find((item) => item.slug === slug);
      expect(group, slug).toBeDefined();
      for (const operation of operations) {
        cleanup();
        window.history.pushState(
          {},
          "",
          `/tools/${slug}?operation=${operation}`,
        );
        const { container } = render(
          <ConsolidatedWorkspace slug={group!.slug} />,
        );
        const tab = await waitFor(
          () => {
            const found = container.querySelector(`#tab-${operation}`);
            expect(found, `${slug} has no tab for ${operation}`).toBeTruthy();
            return found as HTMLElement;
          },
          { timeout: 10_000 },
        );
        expect(tab.getAttribute("aria-selected"), `${slug}/${operation}`).toBe(
          "true",
        );
        checked += 1;
      }
    }
    // Every legacy redirect was exercised, not a sample.
    expect(checked).toBe(legacySecurityRedirects.length);
  }, 120_000);
});
