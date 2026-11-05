/**
 * Editor model for the extracted text: selection, find/replace, undo/redo and
 * low-confidence highlighting segments. Pure functions only, so the editor
 * behaviour is unit-testable without a browser.
 */
import type { OcrLine, OcrPage } from "./types";

/* ------------------------------ undo / redo ------------------------------- */

export interface EditorState {
  text: string;
  past: string[];
  future: string[];
}

export const MAX_HISTORY = 100;

export function createEditor(text: string): EditorState {
  return { text, past: [], future: [] };
}

/** Commit a new text value (no-op when unchanged; never grows past MAX_HISTORY). */
export function commit(state: EditorState, text: string): EditorState {
  if (text === state.text) return state;
  return {
    text,
    past: [...state.past, state.text].slice(-MAX_HISTORY),
    future: [],
  };
}

export function undo(state: EditorState): EditorState {
  if (!state.past.length) return state;
  const previous = state.past[state.past.length - 1];
  return {
    text: previous,
    past: state.past.slice(0, -1),
    future: [state.text, ...state.future].slice(0, MAX_HISTORY),
  };
}

export function redo(state: EditorState): EditorState {
  if (!state.future.length) return state;
  const [next, ...rest] = state.future;
  return {
    text: next,
    past: [...state.past, state.text].slice(-MAX_HISTORY),
    future: rest,
  };
}

export function canUndo(state: EditorState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: EditorState): boolean {
  return state.future.length > 0;
}

/* ------------------------------- find/replace ----------------------------- */

export interface FindOptions {
  matchCase: boolean;
  wholeWord: boolean;
}

export interface FindMatch {
  start: number;
  end: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function findMatches(
  text: string,
  query: string,
  options: FindOptions = { matchCase: false, wholeWord: false },
): FindMatch[] {
  const needle = query.trim();
  if (!needle) return [];
  const source = options.matchCase ? text : text.toLowerCase();
  const target = options.matchCase ? needle : needle.toLowerCase();
  const matches: FindMatch[] = [];
  if (options.wholeWord) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(target)}(?![\\p{L}\\p{N}])`,
      "gu",
    );
    for (const match of source.matchAll(pattern)) {
      const start = match.index ?? 0;
      matches.push({ start, end: start + target.length });
    }
    return matches;
  }
  let index = source.indexOf(target);
  while (index !== -1) {
    matches.push({ start: index, end: index + target.length });
    index = source.indexOf(target, index + Math.max(1, target.length));
  }
  return matches;
}

export interface ReplaceResult {
  text: string;
  replaced: number;
}

export function replaceAll(
  text: string,
  query: string,
  replacement: string,
  options: FindOptions = { matchCase: false, wholeWord: false },
): ReplaceResult {
  const matches = findMatches(text, query, options);
  if (!matches.length) return { text, replaced: 0 };
  let output = "";
  let cursor = 0;
  for (const match of matches) {
    output += text.slice(cursor, match.start) + replacement;
    cursor = match.end;
  }
  output += text.slice(cursor);
  return { text: output, replaced: matches.length };
}

export function replaceOne(
  text: string,
  query: string,
  replacement: string,
  from: number,
  options: FindOptions = { matchCase: false, wholeWord: false },
): ReplaceResult {
  const match = findMatches(text, query, options).find(
    (candidate) => candidate.start >= from,
  );
  if (!match) return { text, replaced: 0 };
  return {
    text: text.slice(0, match.start) + replacement + text.slice(match.end),
    replaced: 1,
  };
}

/* --------------------------- confidence highlight ------------------------- */

export interface TextSegment {
  text: string;
  uncertain: boolean;
}

/**
 * Split any text into runs of certain and uncertain words so the editor can
 * highlight doubtful OCR output. A word is uncertain when it is below the
 * threshold *or* carries unusual characters, and the surrounding run is
 * widened by one word on each side to keep the highlight readable.
 */
export function highlightSegments(
  text: string,
  confidences: Map<string, number>,
  threshold: number,
): TextSegment[] {
  if (!text) return [];
  const tokens = text.split(/(\s+)/u);
  const uncertainIndexes = new Set<number>();
  tokens.forEach((token, index) => {
    if (!token.trim()) return;
    const normalised = token.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    if (!normalised) return;
    const confidence = confidences.get(normalised);
    if (confidence !== undefined && confidence < threshold) {
      uncertainIndexes.add(index);
      if (index > 0) uncertainIndexes.add(index - 1);
      if (index + 1 < tokens.length) uncertainIndexes.add(index + 1);
    }
  });
  const segments: TextSegment[] = [];
  tokens.forEach((token, index) => {
    const uncertain = uncertainIndexes.has(index);
    const last = segments[segments.length - 1];
    if (last && last.uncertain === uncertain) last.text += token;
    else segments.push({ text: token, uncertain });
  });
  return segments;
}

/** Word -> confidence map for a page (lowest confidence wins on duplicates). */
export function confidenceMap(page: OcrPage): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of page.lines) {
    for (const word of line.words) {
      const key = word.text.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing === undefined || word.confidence < existing)
        map.set(key, word.confidence);
    }
  }
  return map;
}

/** Lines of a page whose confidence is below the threshold. */
export function uncertainLines(page: OcrPage, threshold: number): OcrLine[] {
  return page.lines.filter((line) => line.confidence < threshold);
}

/** Word and character counts, honest about scripts without spaces. */
export function textStats(text: string): {
  characters: number;
  words: number;
  lines: number;
} {
  const words =
    text.trim().match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? [];
  return {
    characters: [...text].length,
    words: words.length,
    lines: text ? text.split("\n").length : 0,
  };
}
