/**
 * Duplicate suppression for continuous scanning.
 *
 * Two different questions, deliberately answered by two rules:
 *
 *  1. Is this payload *already in the results list*? If so, adding it again is
 *     pure noise — a camera pointed at one code would otherwise append a row
 *     every second. The code is already there; the user can see it.
 *  2. Was this payload read *a moment ago* even though it is not listed (for
 *     example after the list was cleared)? Then it is the same code still in
 *     frame, not a new one.
 *
 * Suppression is never permanent: clearing the results (or removing that row)
 * makes the payload scannable again, which is what "allows intentional
 * rescanning" has to mean. Without that release valve the tool would ignore a
 * code the user explicitly asked to scan again.
 */
import { symbolKey } from "./decoder";

export type DuplicateContext = {
  payload: string;
  /** Payloads currently shown in the results list. */
  listed: readonly string[];
  /** Last time each payload key was accepted, epoch ms. */
  lastSeen: ReadonlyMap<string, number>;
  now: number;
  windowMs: number;
  enabled: boolean;
};

export type DuplicateVerdict = {
  suppress: boolean;
  /** Why, in a form the UI can show without inventing anything. */
  reason: "disabled" | "listed" | "recent" | "new";
  key: string;
};

export function evaluateDuplicate(context: DuplicateContext): DuplicateVerdict {
  const key = symbolKey(context.payload);
  if (!context.enabled) return { suppress: false, reason: "disabled", key };
  if (context.listed.includes(context.payload))
    return { suppress: true, reason: "listed", key };
  const last = context.lastSeen.get(key);
  if (typeof last === "number" && context.now - last < context.windowMs)
    return { suppress: true, reason: "recent", key };
  return { suppress: false, reason: "new", key };
}
