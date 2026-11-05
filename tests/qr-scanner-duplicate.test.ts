/**
 * Duplicate suppression.
 *
 * The behaviour that matters is symmetric: continuous scanning must not append
 * the same code over and over, and it must still allow a deliberate rescan. Both
 * halves are pinned here, because a scanner that is too strict silently ignores
 * codes the user asked for.
 */
import { describe, expect, it } from "vitest";
import {
  evaluateDuplicate,
  type DuplicateContext,
} from "../lib/tools/qr-scanner/duplicate";
import { symbolKey } from "../lib/tools/qr-scanner/decoder";

const base = (overrides: Partial<DuplicateContext> = {}): DuplicateContext => ({
  payload: "https://example.com",
  listed: [],
  lastSeen: new Map(),
  now: 1_000_000,
  windowMs: 3000,
  enabled: true,
  ...overrides,
});

describe("duplicate suppression", () => {
  it("accepts a payload it has never seen", () => {
    expect(evaluateDuplicate(base())).toMatchObject({
      suppress: false,
      reason: "new",
    });
  });

  it("suppresses a payload already shown in the results", () => {
    const verdict = evaluateDuplicate(
      base({ listed: ["https://example.com"] }),
    );
    expect(verdict.suppress).toBe(true);
    expect(verdict.reason).toBe("listed");
  });

  it("suppresses a payload read inside the window", () => {
    const lastSeen = new Map([[symbolKey("https://example.com"), 999_000]]);
    expect(
      evaluateDuplicate(base({ lastSeen, now: 1_000_000, windowMs: 3000 })),
    ).toMatchObject({ suppress: true, reason: "recent" });
  });

  it("accepts the same payload once the window has passed", () => {
    const lastSeen = new Map([[symbolKey("https://example.com"), 990_000]]);
    expect(
      evaluateDuplicate(base({ lastSeen, now: 1_000_000, windowMs: 3000 })),
    ).toMatchObject({ suppress: false, reason: "new" });
  });

  it("allows an intentional rescan after the result list is cleared", () => {
    // Cleared list, but the payload was read moments ago: still blocked…
    const lastSeen = new Map([[symbolKey("https://example.com"), 999_500]]);
    expect(
      evaluateDuplicate(base({ listed: [], lastSeen, now: 1_000_000 })),
    ).toMatchObject({ suppress: true, reason: "recent" });
    // …until the window elapses, at which point it scans again.
    expect(
      evaluateDuplicate(base({ listed: [], lastSeen, now: 1_004_000 })),
    ).toMatchObject({ suppress: false, reason: "new" });
  });

  it("does nothing at all when duplicate detection is off", () => {
    const verdict = evaluateDuplicate(
      base({
        enabled: false,
        listed: ["https://example.com"],
        lastSeen: new Map([[symbolKey("https://example.com"), 999_999]]),
      }),
    );
    expect(verdict.suppress).toBe(false);
    expect(verdict.reason).toBe("disabled");
  });

  it("treats different payloads as different codes", () => {
    const listed = ["https://example.com/a"];
    expect(
      evaluateDuplicate(base({ payload: "https://example.com/b", listed }))
        .suppress,
    ).toBe(false);
  });

  it("never suppresses based on a prefix or a near-miss", () => {
    const listed = ["https://example.com/long-path"];
    expect(
      evaluateDuplicate(
        base({ payload: "https://example.com/long-pat", listed }),
      ).suppress,
    ).toBe(false);
  });

  it("returns the key it used, so callers can record it", () => {
    const verdict = evaluateDuplicate(base({ payload: "abc" }));
    expect(verdict.key).toBe(symbolKey("abc"));
  });
});
