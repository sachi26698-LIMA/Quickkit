/**
 * Bounded-concurrency batch runner.
 *
 * Phase G requires chunked processing, bounded concurrency, per-file and total
 * progress, cancel, retry and skip. None of the tools had a shared primitive
 * for this, so each grew its own loop. At 1,000 items that matters: an
 * unbounded `Promise.all` over 1,000 canvas renders exhausts memory before any
 * of them finish.
 *
 * The contract that matters: `concurrency` is a hard ceiling on work in flight,
 * so peak memory stays proportional to the ceiling and not to the batch size.
 */
export type BatchOutcome<T> =
  | { status: "done"; value: T }
  | { status: "failed"; error: string }
  | { status: "skipped" }
  | { status: "cancelled" };

export type BatchProgress = {
  /** Items that have finished, whatever the outcome. */
  completed: number;
  /** Items that failed and are eligible for retry. */
  failed: number;
  /** Items currently in flight. */
  active: number;
  total: number;
};

export type RunBoundedOptions<T> = {
  items: readonly T[];
  /** Runs one item. Must throw to signal failure. */
  worker: (item: T, index: number, signal: AbortSignal) => Promise<unknown>;
  /** Hard ceiling on simultaneous workers. */
  concurrency: number;
  signal?: AbortSignal;
  onProgress?: (progress: BatchProgress) => void;
  /**
   * Called when an item fails. Return "retry" to re-run it (up to
   * `maxRetries`), "skip" to record it as skipped and move on, or "abort" to
   * cancel the rest of the batch.
   */
  onFailure?: (
    error: unknown,
    item: T,
    index: number,
  ) => "retry" | "skip" | "abort";
  /** Attempts per item before the failure is final. Defaults to 1. */
  maxRetries?: number;
};

export type RunBoundedResult<T> = {
  outcomes: BatchOutcome<T>[];
  /** True if the batch stopped early because of the signal or an "abort". */
  cancelled: boolean;
  failed: number;
  done: number;
};

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown failure";
}

export async function runBounded<T>(
  options: RunBoundedOptions<T>,
): Promise<RunBoundedResult<T>> {
  const {
    items,
    worker,
    concurrency,
    signal,
    onProgress,
    onFailure,
    maxRetries = 1,
  } = options;

  const outcomes: BatchOutcome<T>[] = items.map(() => ({ status: "skipped" }));
  let next = 0;
  let completed = 0;
  let failed = 0;
  let active = 0;
  let cancelled = false;

  const emit = () => {
    onProgress?.({ completed, failed, active, total: items.length });
  };

  const isAborted = () => cancelled || Boolean(signal?.aborted);

  const runOne = async (): Promise<void> => {
    // Each pull takes the next unstarted index, so the number of concurrent
    // runOne calls is the only thing bounding the work in flight.
    while (!isAborted()) {
      const index = next;
      if (index >= items.length) return;
      next += 1;

      const item = items[index];
      let attempt = 0;
      let settled = false;

      while (!settled) {
        attempt += 1;
        active += 1;
        emit();
        try {
          const value = await worker(
            item,
            index,
            signal ?? new AbortController().signal,
          );
          outcomes[index] = { status: "done", value: value as never };
          completed += 1;
          settled = true;
        } catch (error) {
          if (isAborted()) {
            outcomes[index] = { status: "cancelled" };
            settled = true;
          } else if (attempt < Math.max(1, maxRetries)) {
            // Still have attempts left; loop without recording a failure yet.
            active -= 1;
            emit();
            continue;
          } else {
            // Default to "failed", not "skip": a caller that does not opt into
            // skipping must still see the failure, so a broken file cannot
            // disappear from the batch unnoticed.
            const verdict = onFailure?.(error, item, index) ?? "failed";
            if (verdict === "retry" && attempt < Math.max(1, maxRetries)) {
              active -= 1;
              emit();
              continue;
            }
            if (verdict === "abort") {
              cancelled = true;
              outcomes[index] = { status: "failed", error: describe(error) };
              failed += 1;
              settled = true;
            } else if (verdict === "skip") {
              outcomes[index] = { status: "skipped" };
              completed += 1;
              settled = true;
            } else {
              outcomes[index] = { status: "failed", error: describe(error) };
              failed += 1;
              completed += 1;
              settled = true;
            }
          }
        } finally {
          if (active > 0) active -= 1;
        }
        emit();
      }
    }
  };

  // Never spawn more workers than there are items, and never fewer than 1.
  const lanes = Math.max(
    1,
    Math.min(Math.floor(concurrency) || 1, items.length),
  );
  await Promise.all(Array.from({ length: lanes }, () => runOne()));

  if (isAborted()) {
    // Anything never started is cancelled, not silently skipped — Phase J
    // forbids silent file loss.
    for (let i = 0; i < outcomes.length; i += 1) {
      if (outcomes[i].status === "skipped" && i >= next)
        outcomes[i] = { status: "cancelled" };
    }
  }

  emit();
  return {
    outcomes,
    cancelled: isAborted(),
    failed,
    done: outcomes.filter((o) => o.status === "done").length,
  };
}

/**
 * A concurrency ceiling derived from the device, for callers that have no
 * better idea. `hardwareConcurrency` is widely available; `deviceMemory` is
 * Chromium-only and capped at 8, so it is treated as a hint and never as a
 * guarantee. The floor of 1 matters: a device reporting 0 must not deadlock
 * the batch.
 */
export function suggestConcurrency(
  env: {
    hardwareConcurrency?: number;
    deviceMemory?: number;
  } = {},
): number {
  const cores = Number.isFinite(env.hardwareConcurrency)
    ? Math.max(1, Math.floor(env.hardwareConcurrency as number))
    : 2;
  // Leave headroom for the main thread, which still does layout and painting.
  const byCores = Math.max(1, Math.min(cores - 1, 6));
  if (Number.isFinite(env.deviceMemory)) {
    const memory = env.deviceMemory as number;
    // Under 4 GB reported, assume a phone and stay conservative.
    if (memory <= 2) return Math.max(1, Math.min(byCores, 2));
    if (memory <= 4) return Math.max(1, Math.min(byCores, 3));
  }
  return byCores;
}
