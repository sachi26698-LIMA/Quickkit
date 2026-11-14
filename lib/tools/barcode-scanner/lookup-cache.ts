/**
 * Process-local cache and throttle for the GTIN lookup.
 *
 * Two independent jobs:
 *
 *  - `TtlCache` stops the same GTIN being asked twice in a row. A found record
 *    is cached for a day, a "not in the database" answer for six hours (shorter,
 *    because a volunteer can add the product at any time). Errors are never
 *    cached.
 *  - `TokenBucket` keeps this instance under Open Food Facts' published limit
 *    of 15 product reads per minute per IP. Ten per minute leaves headroom for
 *    the image proxy and for other traffic from the same egress address.
 *
 * Honest limitation: this is per server process, not shared. A serverless
 * deployment gives each warm instance its own bucket, so the bucket is a
 * politeness guard, not a global quota. Upstream 429s are still handled.
 */
import type { LookupResult } from "@/lib/tools/barcode-scanner/product-lookup";

export const LOOKUP_TTL_MS = {
  found: 24 * 60 * 60 * 1000,
  "not-found": 6 * 60 * 60 * 1000,
} as const;

export function ttlFor(result: LookupResult): number {
  if (result.status === "found") return LOOKUP_TTL_MS.found;
  if (result.status === "not-found") return LOOKUP_TTL_MS["not-found"];
  return 0;
}

type Entry<T> = { value: T; expires: number };

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(private readonly max = 500) {}

  get(key: string, now: number = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= now) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh recency so the oldest untouched key is the one evicted.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now: number = Date.now()): void {
    if (ttlMs <= 0) return;
    this.entries.delete(key);
    this.entries.set(key, { value, expires: now + ttlMs });
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}

export type BucketVerdict =
  { ok: true } | { ok: false; retryAfterSeconds: number };

export class TokenBucket {
  private tokens: number;
  private updated: number;

  constructor(
    private readonly capacity = 10,
    private readonly perMinute = 10,
  ) {
    this.tokens = capacity;
    this.updated = -1;
  }

  reset(): void {
    this.tokens = this.capacity;
    this.updated = -1;
  }

  take(now: number = Date.now()): BucketVerdict {
    if (this.updated < 0) this.updated = now;
    const elapsed = Math.max(0, now - this.updated);
    this.tokens = Math.min(
      this.capacity,
      this.tokens + (elapsed / 60_000) * this.perMinute,
    );
    this.updated = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { ok: true };
    }
    const needed = 1 - this.tokens;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((needed / this.perMinute) * 60)),
    };
  }
}

export const lookupCache = new TtlCache<LookupResult>(500);
export const lookupBucket = new TokenBucket(10, 10);

/** Test hook: drop cached answers and refill the bucket. */
export function resetLookupState(): void {
  lookupCache.clear();
  lookupBucket.reset();
}
