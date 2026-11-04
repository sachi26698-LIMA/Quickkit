/**
 * A selection set over ordered item ids.
 *
 * Phase C items 9, 10, 13-16 (rotate selected/all, select all, deselect all,
 * invert, odd/even) and Phase E's "apply to selected" all need the same thing:
 * an ordered set of ids with the usual bulk operations. None of the tools had
 * one — `pdf-studio` acted strictly per page id via `setRemoved` /
 * `toggleRemoved` / `rotatePage`, which is why those six items were absent
 * together rather than individually.
 *
 * Ids are kept in insertion order so that "selected pages" processes in the
 * order the user sees them, not in set-iteration surprise order.
 */
export type SelectionSet = {
  /** Selected ids, in selection order. */
  readonly ids: readonly string[];
  has(id: string): boolean;
  readonly size: number;
};

/**
 * Every bulk operation returns a new set. Nothing mutates, so a caller holding
 * an older selection cannot have it change underneath them mid-batch.
 */
export function emptySelection(): SelectionSet {
  return make([]);
}

export function selectionOf(ids: readonly string[]): SelectionSet {
  return make(ids);
}

function make(ids: readonly string[]): SelectionSet {
  // De-duplicate while preserving first-seen order: a caller building a
  // selection from a drag range can easily pass the same id twice.
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of ids) {
    if (id === "") continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return {
    ids: ordered,
    size: ordered.length,
    has: (id: string) => seen.has(id),
  };
}

export function toggleSelected(
  current: SelectionSet,
  id: string,
): SelectionSet {
  if (current.has(id))
    return make(current.ids.filter((existing) => existing !== id));
  return make([...current.ids, id]);
}

export function selectMany(
  current: SelectionSet,
  ids: readonly string[],
): SelectionSet {
  return make([...current.ids, ...ids]);
}

export function deselectMany(
  current: SelectionSet,
  ids: readonly string[],
): SelectionSet {
  const drop = new Set(ids);
  return make(current.ids.filter((id) => !drop.has(id)));
}

export function clearSelection(): SelectionSet {
  return emptySelection();
}

export function selectAll(allIds: readonly string[]): SelectionSet {
  return make(allIds);
}

/** Everything not currently selected, in document order. */
export function invertSelection(
  current: SelectionSet,
  allIds: readonly string[],
): SelectionSet {
  return make(allIds.filter((id) => !current.has(id)));
}

/**
 * Odd and even are 1-based against the document order, because that is what
 * "print the odd pages" means to a user reading page numbers — not an index
 * into whatever happens to be selected already.
 */
export function selectByParity(
  allIds: readonly string[],
  parity: "odd" | "even",
): SelectionSet {
  const wanted = parity === "odd" ? 1 : 0;
  return make(allIds.filter((_id, index) => (index + 1) % 2 === wanted));
}

/**
 * A page-range expression such as `1-3, 5, 8-`. Indexes are 1-based and
 * inclusive. An open-ended `8-` means "8 to the end", which is what users type
 * when they mean "the rest of the document".
 *
 * Returns null for an expression that cannot be parsed at all, so the caller
 * can say so instead of silently selecting nothing.
 */
export function selectByRange(
  allIds: readonly string[],
  expression: string,
): SelectionSet | null {
  const total = allIds.length;
  const trimmed = expression.trim();
  if (trimmed === "") return emptySelection();

  const picked = new Set<string>();
  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();
    if (part === "") continue;

    const span = part.match(/^(\d+)\s*-\s*(\d+)?$/);
    if (span) {
      const from = Number.parseInt(span[1], 10);
      // An omitted end means "to the last page".
      const to = span[2] === undefined ? total : Number.parseInt(span[2], 10);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
      if (from < 1 || to < 1) return null;
      const start = Math.min(from, to);
      const end = Math.min(total, Math.max(from, to));
      for (let page = start; page <= end; page += 1) {
        const id = allIds[page - 1];
        if (id !== undefined) picked.add(id);
      }
      continue;
    }

    const single = part.match(/^\d+$/);
    if (single) {
      const page = Number.parseInt(part, 10);
      if (page < 1 || page > total) return null;
      const id = allIds[page - 1];
      if (id !== undefined) picked.add(id);
      continue;
    }

    return null;
  }

  // Preserve document order rather than the order the user typed the ranges in.
  return make(allIds.filter((id) => picked.has(id)));
}
