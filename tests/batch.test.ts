import { describe, expect, it } from "vitest";
import {
  clearSelection,
  deselectMany,
  emptySelection,
  invertSelection,
  selectAll,
  selectByParity,
  selectByRange,
  selectMany,
  selectionOf,
  toggleSelected,
} from "../lib/tools/batch/selection";
import {
  runBounded,
  suggestConcurrency,
  type BatchProgress,
} from "../lib/tools/batch/concurrency";

const IDS = ["a", "b", "c", "d", "e", "f"];

describe("SelectionSet", () => {
  it("de-duplicates while keeping first-seen order", () => {
    const set = selectionOf(["c", "a", "c", "a", "b"]);
    expect([...set.ids]).toEqual(["c", "a", "b"]);
    expect(set.size).toBe(3);
  });

  it("ignores empty ids so a malformed caller cannot inject a phantom page", () => {
    expect(selectionOf(["a", "", "b"]).size).toBe(2);
  });

  it("toggles in and out without mutating the previous set", () => {
    const first = selectionOf(["a"]);
    const second = toggleSelected(first, "b");
    const third = toggleSelected(second, "a");
    expect([...first.ids]).toEqual(["a"]);
    expect([...second.ids]).toEqual(["a", "b"]);
    expect([...third.ids]).toEqual(["b"]);
  });

  it("adds and removes groups of ids without disturbing the rest", () => {
    const base = selectionOf(["a", "b"]);
    const added = selectMany(base, ["d", "c", "a"]);
    expect([...added.ids]).toEqual(["a", "b", "d", "c"]);
    const removed = deselectMany(added, ["b", "d"]);
    expect([...removed.ids]).toEqual(["a", "c"]);
    // The originals are untouched, so a stale reference cannot change a
    // batch already in flight.
    expect([...base.ids]).toEqual(["a", "b"]);
  });

  it("supports the bulk operations Phase C needs", () => {
    expect([...selectAll(IDS).ids]).toEqual(IDS);
    expect(clearSelection().size).toBe(0);
    expect([...invertSelection(selectionOf(["a", "c"]), IDS).ids]).toEqual([
      "b",
      "d",
      "e",
      "f",
    ]);
    expect([...invertSelection(emptySelection(), IDS).ids]).toEqual(IDS);
    expect([...invertSelection(selectAll(IDS), IDS).ids]).toEqual([]);
  });

  it("treats odd and even as 1-based document positions", () => {
    // "Print the odd pages" means pages 1, 3, 5 — not index 0, 2, 4 of a
    // selection the user has not made yet.
    expect([...selectByParity(IDS, "odd").ids]).toEqual(["a", "c", "e"]);
    expect([...selectByParity(IDS, "even").ids]).toEqual(["b", "d", "f"]);
  });

  it("parses ranges, lists and open-ended spans in document order", () => {
    expect([...selectByRange(IDS, "1-3")!.ids]).toEqual(["a", "b", "c"]);
    expect([...selectByRange(IDS, "1,3,5")!.ids]).toEqual(["a", "c", "e"]);
    expect([...selectByRange(IDS, "5-")!.ids]).toEqual(["e", "f"]);
    expect([...selectByRange(IDS, "4-2")!.ids]).toEqual(["b", "c", "d"]);
    // Ranges typed out of order still come back in document order.
    expect([...selectByRange(IDS, "5-6, 1-2")!.ids]).toEqual([
      "a",
      "b",
      "e",
      "f",
    ]);
  });

  it("rejects an unparseable range instead of silently selecting nothing", () => {
    expect(selectByRange(IDS, "abc")).toBeNull();
    expect(selectByRange(IDS, "0-2")).toBeNull();
    expect(selectByRange(IDS, "9")).toBeNull();
    expect(selectByRange(IDS, "1..3")).toBeNull();
  });

  it("clamps an over-long range to the document rather than erroring", () => {
    expect([...selectByRange(IDS, "1-99")!.ids]).toEqual(IDS);
  });

  it("selects nothing for an empty expression, and says so distinctly from an error", () => {
    expect(selectByRange(IDS, "   ")!.size).toBe(0);
  });
});

describe("runBounded", () => {
  it("processes every item exactly once", async () => {
    const seen: number[] = [];
    const result = await runBounded({
      items: [1, 2, 3, 4, 5],
      concurrency: 2,
      worker: async (n) => {
        seen.push(n);
        return n * 2;
      },
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(result.done).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.cancelled).toBe(false);
  });

  it("never exceeds the concurrency ceiling — the property that bounds memory", async () => {
    let active = 0;
    let peak = 0;
    const items = Array.from({ length: 40 }, (_, i) => i);
    await runBounded({
      items,
      concurrency: 3,
      worker: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 1));
        active -= 1;
      },
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1); // and it really is concurrent
  });

  it("reports progress that ends at the total", async () => {
    const seen: BatchProgress[] = [];
    await runBounded({
      items: [1, 2, 3],
      concurrency: 1,
      worker: async () => undefined,
      onProgress: (p) => seen.push({ ...p }),
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1].completed).toBe(3);
    expect(seen[seen.length - 1].total).toBe(3);
    expect(seen[seen.length - 1].active).toBe(0);
  });

  it("records a failure with a real message rather than swallowing it", async () => {
    const result = await runBounded({
      items: ["ok", "bad"],
      concurrency: 1,
      worker: async (item) => {
        if (item === "bad") throw new Error("decode failed");
        return item;
      },
    });
    expect(result.failed).toBe(1);
    expect(result.done).toBe(1);
    const failed = result.outcomes[1];
    expect(failed.status).toBe("failed");
    if (failed.status === "failed") expect(failed.error).toBe("decode failed");
  });

  it("skips a failed item and still finishes the rest of the batch", async () => {
    const result = await runBounded({
      items: ["a", "bad", "c"],
      concurrency: 1,
      worker: async (item) => {
        if (item === "bad") throw new Error("nope");
        return item;
      },
      onFailure: () => "skip",
    });
    expect(result.outcomes[1].status).toBe("skipped");
    expect(result.outcomes[2].status).toBe("done");
    expect(result.done).toBe(2);
  });

  it("retries up to maxRetries then gives up", async () => {
    let attempts = 0;
    const result = await runBounded({
      items: ["flaky"],
      concurrency: 1,
      maxRetries: 3,
      worker: async () => {
        attempts += 1;
        throw new Error("always");
      },
    });
    expect(attempts).toBe(3);
    expect(result.failed).toBe(1);
  });

  it("succeeds on a later attempt when the failure was transient", async () => {
    let attempts = 0;
    const result = await runBounded({
      items: ["flaky"],
      concurrency: 1,
      maxRetries: 3,
      worker: async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("transient");
        return "recovered";
      },
    });
    expect(result.done).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("aborts the remaining batch when onFailure says so", async () => {
    const started: string[] = [];
    const result = await runBounded({
      items: ["a", "b", "c", "d"],
      concurrency: 1,
      worker: async (item) => {
        started.push(item);
        if (item === "b") throw new Error("fatal");
        return item;
      },
      onFailure: () => "abort",
    });
    expect(result.cancelled).toBe(true);
    expect(started).not.toContain("d");
  });

  it("stops on an external cancel and marks untouched items cancelled, not skipped", async () => {
    const controller = new AbortController();
    const started: number[] = [];
    const result = await runBounded({
      items: Array.from({ length: 20 }, (_, i) => i),
      concurrency: 1,
      signal: controller.signal,
      worker: async (n) => {
        started.push(n);
        if (started.length === 2) controller.abort();
        return n;
      },
    });
    expect(result.cancelled).toBe(true);
    expect(started.length).toBeLessThan(20);
    // Phase J forbids silent file loss: the unprocessed tail must be visible.
    const cancelled = result.outcomes.filter((o) => o.status === "cancelled");
    expect(cancelled.length).toBeGreaterThan(0);
  });

  it("handles an empty batch without spawning a worker", async () => {
    let calls = 0;
    const result = await runBounded({
      items: [],
      concurrency: 4,
      worker: async () => {
        calls += 1;
      },
    });
    expect(calls).toBe(0);
    expect(result.done).toBe(0);
    expect(result.cancelled).toBe(false);
  });

  it("treats a nonsense concurrency as 1 rather than deadlocking or going unbounded", async () => {
    let peak = 0;
    let active = 0;
    await runBounded({
      items: [1, 2, 3],
      concurrency: 0,
      worker: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 1));
        active -= 1;
      },
    });
    expect(peak).toBe(1);
  });
});

describe("suggestConcurrency", () => {
  it("never returns 0, which would stall the batch forever", () => {
    expect(
      suggestConcurrency({ hardwareConcurrency: 1 }),
    ).toBeGreaterThanOrEqual(1);
    expect(
      suggestConcurrency({ hardwareConcurrency: 0 }),
    ).toBeGreaterThanOrEqual(1);
    expect(suggestConcurrency({})).toBeGreaterThanOrEqual(1);
  });

  it("stays conservative on low-memory devices", () => {
    const low = suggestConcurrency({ hardwareConcurrency: 8, deviceMemory: 2 });
    const high = suggestConcurrency({
      hardwareConcurrency: 8,
      deviceMemory: 8,
    });
    expect(low).toBeLessThanOrEqual(2);
    expect(high).toBeGreaterThan(low);
  });

  it("works when deviceMemory is absent, as on Safari and Firefox", () => {
    expect(suggestConcurrency({ hardwareConcurrency: 4 })).toBe(3);
  });

  it("caps the ceiling so a many-core machine does not open 64 canvases", () => {
    expect(suggestConcurrency({ hardwareConcurrency: 64 })).toBeLessThanOrEqual(
      6,
    );
  });
});
