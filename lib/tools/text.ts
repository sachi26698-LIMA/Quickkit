export const MAX_TEXT_LENGTH = 1_000_000;
export function countText(text: string) {
  const trimmed = text.trim();
  const words = trimmed
    ? trimmed.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
    : 0;
  return {
    words,
    characters: Array.from(text).length,
    withoutSpaces: Array.from(text.replace(/\s/gu, "")).length,
    sentences: trimmed
      ? (
          trimmed.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/gu) || []
        ).filter((s) => /[\p{L}\p{N}]/u.test(s)).length
      : 0,
    paragraphs: trimmed
      ? trimmed.split(/\n\s*\n/u).filter((p) => p.trim()).length
      : 0,
    readingSeconds: Math.ceil((words / 200) * 60),
  };
}
export type CaseMode =
  | "UPPERCASE"
  | "lowercase"
  | "Title Case"
  | "Sentence case"
  | "camelCase"
  | "PascalCase"
  | "snake_case"
  | "kebab-case"
  | "aLtErNaTiNg"
  | "InVeRtEd";

function splitWords(text: string) {
  return text
    .replace(/([\p{Ll}])([\p{Lu}])/gu, "$1 $2") // camel humps
    .split(/[_\-\s]+/u)
    .map((w) => w.toLocaleLowerCase())
    .filter(Boolean);
}
function capitalize(word: string) {
  const [first, ...rest] = Array.from(word);
  return first ? first.toLocaleUpperCase() + rest.join("") : "";
}
export function convertCase(text: string, mode: CaseMode) {
  if (mode === "UPPERCASE") return text.toLocaleUpperCase();
  if (mode === "lowercase") return text.toLocaleLowerCase();
  if (mode === "aLtErNaTiNg") {
    let upper = false;
    return Array.from(text, (char) => {
      if (!/\p{L}/u.test(char)) return char;
      upper = !upper;
      return upper ? char.toLocaleLowerCase() : char.toLocaleUpperCase();
    }).join("");
  }
  if (mode === "InVeRtEd")
    return Array.from(text, (char) =>
      char === char.toLocaleUpperCase()
        ? char.toLocaleLowerCase()
        : char.toLocaleUpperCase(),
    ).join("");
  const lower = text.toLocaleLowerCase();
  if (mode === "Title Case")
    return lower.replace(
      /(^|[^\p{L}\p{N}'’])(\p{L})/gu,
      (_, prefix: string, letter: string) =>
        prefix + letter.toLocaleUpperCase(),
    );
  if (mode === "Sentence case")
    return lower.replace(
      /(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu,
      (_, prefix: string, letter: string) =>
        prefix + letter.toLocaleUpperCase(),
    );
  // Identifier styles operate per line so structure is preserved.
  return text
    .split("\n")
    .map((line) => {
      const words = splitWords(line);
      if (mode === "snake_case") return words.join("_");
      if (mode === "kebab-case") return words.join("-");
      if (mode === "PascalCase") return words.map(capitalize).join("");
      return words.map((w, i) => (i === 0 ? w : capitalize(w))).join(""); // camelCase
    })
    .join("\n");
}

export type WordInsight = { word: string; count: number; percent: number };
export type TextAnalysis = {
  lines: number;
  speakingSeconds: number;
  averageWordLength: number;
  longestWord: string;
  uniqueWords: number;
  topWords: WordInsight[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "i",
  "is",
  "it",
  "to",
  "of",
  "in",
  "on",
  "as",
  "at",
  "by",
  "be",
  "or",
  "we",
  "he",
  "she",
  "my",
  "me",
  "so",
  "if",
  "do",
  "no",
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "any",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "have",
  "been",
  "some",
  "them",
  "than",
  "its",
  "over",
  "such",
  "with",
  "this",
  "that",
  "from",
  "they",
  "will",
  "would",
  "there",
  "their",
  "what",
  "about",
  "which",
  "when",
  "your",
  "into",
  "more",
  "also",
  "just",
  "like",
  "very",
]);

/** Richer, premium insights layered on top of the core counts. */
export function analyzeText(text: string): TextAnalysis {
  const core = countText(text);
  const tokens = text.trim()
    ? text
        .trim()
        .split(/\s+/u)
        .filter((w) => /[\p{L}\p{N}]/u.test(w))
    : [];
  const cleaned = tokens.map((w) =>
    w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLocaleLowerCase(),
  );
  const lengths = cleaned.filter(Boolean).map((w) => Array.from(w).length);
  const averageWordLength = lengths.length
    ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) /
      10
    : 0;
  let longestWord = "";
  for (const w of cleaned)
    if (Array.from(w).length > Array.from(longestWord).length) longestWord = w;
  const frequency = new Map<string, number>();
  for (const w of cleaned) {
    if (!w || STOP_WORDS.has(w)) continue;
    frequency.set(w, (frequency.get(w) ?? 0) + 1);
  }
  const topWords = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word, count]) => ({
      word,
      count,
      percent: core.words ? Math.round((count / core.words) * 1000) / 10 : 0,
    }));
  return {
    lines: text ? text.split("\n").length : 0,
    speakingSeconds: Math.ceil((core.words / 150) * 60),
    averageWordLength,
    longestWord,
    uniqueWords: new Set(cleaned.filter(Boolean)).size,
    topWords,
  };
}

export const SAMPLE_TEXT =
  "Great writing is clear writing. It respects the reader, chooses simple words, and makes every sentence earn its place.\n\nPaste your own draft here to count words, estimate reading time, and spot the words you use most — all without uploading a single character.";
