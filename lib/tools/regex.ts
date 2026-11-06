export const MAX_REGEX_PATTERN_LENGTH = 500;
export const MAX_REGEX_TEST_LENGTH = 20_000;
export const MAX_REGEX_REPLACEMENT_LENGTH = 10_000;
export const MAX_REGEX_MATCHES = 500;
export const MAX_REGEX_REPLACEMENT_PREVIEW_LENGTH = 200_000;
export const REGEX_WORKER_TIMEOUT_MS = 300;

export type RegexOptions = {
  pattern: string;
  flags: string;
  sample: string;
  replacement: string;
};

export type RegexMatch = {
  index: number;
  text: string;
  captures: (string | undefined)[];
  groups: Record<string, string | undefined> | null;
};

export type RegexAnalysis = {
  matches: RegexMatch[];
  replacement: string;
  truncated: boolean;
  replacementTruncated: boolean;
};

type AnalysisLimits = {
  pattern: number;
  sample: number;
  replacement: number;
  matches: number;
  preview: number;
};

const ANALYSIS_LIMITS: AnalysisLimits = {
  pattern: MAX_REGEX_PATTERN_LENGTH,
  sample: MAX_REGEX_TEST_LENGTH,
  replacement: MAX_REGEX_REPLACEMENT_LENGTH,
  matches: MAX_REGEX_MATCHES,
  preview: MAX_REGEX_REPLACEMENT_PREVIEW_LENGTH,
};

function validateRegexOptions({
  pattern,
  flags,
  sample,
  replacement,
}: RegexOptions): void {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    throw new Error(
      `Pattern is too long. Keep it below ${MAX_REGEX_PATTERN_LENGTH} characters.`,
    );
  }
  if (sample.length > MAX_REGEX_TEST_LENGTH) {
    throw new Error(
      `Test text is too long. Keep it below ${MAX_REGEX_TEST_LENGTH.toLocaleString()} characters.`,
    );
  }
  if (replacement.length > MAX_REGEX_REPLACEMENT_LENGTH) {
    throw new Error(
      `Replacement is too long. Keep it below ${MAX_REGEX_REPLACEMENT_LENGTH.toLocaleString()} characters.`,
    );
  }
  if (/[^gimsu]/u.test(flags) || new Set(flags).size !== flags.length) {
    throw new Error("Use each supported flag at most once: g, i, m, s or u.");
  }
}

/**
 * The whole function is serialized into a fixed worker program below. Keep it
 * self-contained: pattern and replacement values arrive only through
 * postMessage and are never interpolated into executable source.
 */
function analyzeRegexBounded(
  options: RegexOptions,
  limits: AnalysisLimits,
): RegexAnalysis {
  const { pattern, flags, sample, replacement } = options;
  if (pattern.length > limits.pattern) {
    throw new Error(
      `Pattern is too long. Keep it below ${limits.pattern} characters.`,
    );
  }
  if (sample.length > limits.sample) {
    throw new Error(
      `Test text is too long. Keep it below ${limits.sample.toLocaleString()} characters.`,
    );
  }
  if (replacement.length > limits.replacement) {
    throw new Error(
      `Replacement is too long. Keep it below ${limits.replacement.toLocaleString()} characters.`,
    );
  }
  if (/[^gimsu]/u.test(flags) || new Set(flags).size !== flags.length) {
    throw new Error("Use each supported flag at most once: g, i, m, s or u.");
  }

  let matcher: RegExp;
  try {
    matcher = new RegExp(pattern, flags);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Invalid regular expression.",
    );
  }

  const matches: RegexMatch[] = [];
  const global = flags.includes("g");
  const unicode = flags.includes("u");
  let truncated = false;
  let replacementTruncated = false;
  let preview = "";
  let cursor = 0;

  const append = (value: string) => {
    const remaining = Math.max(0, limits.preview - preview.length);
    if (value.length > remaining) {
      preview += value.slice(0, remaining);
      replacementTruncated = true;
    } else {
      preview += value;
    }
  };

  const expandReplacement = (
    template: string,
    match: RegExpExecArray,
    limit: number,
  ): { text: string; truncated: boolean } => {
    let text = "";
    let truncated = false;
    const appendPart = (value: string) => {
      const remaining = Math.max(0, limit - text.length);
      if (value.length > remaining) {
        text += value.slice(0, remaining);
        truncated = true;
      } else {
        text += value;
      }
    };

    for (let index = 0; index < template.length && !truncated; index += 1) {
      if (template[index] !== "$" || index + 1 >= template.length) {
        appendPart(template[index] ?? "");
        continue;
      }

      const marker = template[index + 1] ?? "";
      if (marker === "$") {
        appendPart("$");
        index += 1;
        continue;
      }
      if (marker === "&") {
        appendPart(match[0]);
        index += 1;
        continue;
      }
      if (marker === "`") {
        appendPart(sample.slice(0, match.index));
        index += 1;
        continue;
      }
      if (marker === "'") {
        appendPart(sample.slice(match.index + match[0].length));
        index += 1;
        continue;
      }
      if (marker === "<" && match.groups !== undefined) {
        const close = template.indexOf(">", index + 2);
        if (close !== -1) {
          const name = template.slice(index + 2, close);
          appendPart(match.groups[name] ?? "");
          index = close;
          continue;
        }
      }
      if (/[0-9]/u.test(marker) && marker !== "0") {
        const first = Number(marker);
        const second = template[index + 2] ?? "";
        const twoDigit = /[0-9]/u.test(second)
          ? Number(`${marker}${second}`)
          : 0;
        if (twoDigit > 0 && twoDigit < match.length) {
          appendPart(match[twoDigit] ?? "");
          index += 2;
          continue;
        }
        if (first < match.length) {
          appendPart(match[first] ?? "");
          index += 1;
          continue;
        }
      }
      appendPart("$");
    }
    return { text, truncated };
  };

  while (true) {
    const match = matcher.exec(sample);
    if (!match) break;

    if (matches.length < limits.matches) {
      matches.push({
        index: match.index,
        text: match[0],
        captures: match.slice(1),
        groups: match.groups ? { ...match.groups } : null,
      });
    } else {
      truncated = true;
    }

    append(sample.slice(cursor, match.index));
    if (replacementTruncated) break;
    const expanded = expandReplacement(
      replacement,
      match,
      limits.preview - preview.length,
    );
    append(expanded.text);
    if (expanded.truncated || replacementTruncated) {
      replacementTruncated = true;
      break;
    }

    cursor = match.index + match[0].length;
    if (!global) break;
    if (match[0] === "") {
      const codePoint = sample.codePointAt(matcher.lastIndex);
      matcher.lastIndex +=
        unicode && codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
    }
  }

  if (!replacementTruncated) append(sample.slice(cursor));
  return { matches, replacement: preview, truncated, replacementTruncated };
}

export function analyzeRegex(options: RegexOptions): RegexAnalysis {
  validateRegexOptions(options);
  return analyzeRegexBounded(options, ANALYSIS_LIMITS);
}

const regexWorkerSource = `
  const analyze = (${analyzeRegexBounded.toString()});
  const limits = {
    pattern: ${MAX_REGEX_PATTERN_LENGTH},
    sample: ${MAX_REGEX_TEST_LENGTH},
    replacement: ${MAX_REGEX_REPLACEMENT_LENGTH},
    matches: ${MAX_REGEX_MATCHES},
    preview: ${MAX_REGEX_REPLACEMENT_PREVIEW_LENGTH}
  };
  self.onmessage = function(event) {
    try {
      self.postMessage({ ok: true, result: analyze(event.data, limits) });
    } catch (error) {
      self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Invalid regular expression.' });
    }
  };
`;

/**
 * Runs potentially expensive user-supplied regular expressions off the UI
 * thread. The worker contains only this fixed matcher; pattern input is never
 * evaluated as JavaScript and the worker is terminated after a short timeout.
 */
export function analyzeRegexInWorker(
  options: RegexOptions,
  signal?: AbortSignal,
): Promise<RegexAnalysis> {
  validateRegexOptions(options);
  if (
    typeof Worker === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return Promise.reject(
      new Error("A local regex worker is not available in this browser."),
    );
  }
  if (signal?.aborted)
    return Promise.reject(new DOMException("Aborted", "AbortError"));

  const objectUrl = URL.createObjectURL(
    new Blob([regexWorkerSource], { type: "text/javascript" }),
  );
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(objectUrl);
    } catch {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error("A local regex worker could not be started in this browser."),
      );
      return;
    }
    let settled = false;
    const timer: { current: ReturnType<typeof setTimeout> | null } = {
      current: null,
    };
    const abort = () => {
      finish(() => reject(new DOMException("Aborted", "AbortError")));
    };
    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (timer.current !== null) clearTimeout(timer.current);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      URL.revokeObjectURL(objectUrl);
    };
    const finish = (callback: () => void) => {
      cleanup();
      callback();
    };
    timer.current = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Regex took too long, so it was stopped. Shorten the pattern or test text.",
          ),
        ),
      );
    }, REGEX_WORKER_TIMEOUT_MS);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (
      event: MessageEvent<{
        ok: boolean;
        result?: RegexAnalysis;
        error?: string;
      }>,
    ) => {
      if (event.data.ok && event.data.result) {
        finish(() => resolve(event.data.result!));
      } else {
        finish(() =>
          reject(new Error(event.data.error || "Invalid regular expression.")),
        );
      }
    };
    worker.onerror = () => {
      finish(() =>
        reject(new Error("The regex worker could not process this pattern.")),
      );
    };
    worker.postMessage(options);
  });
}

export const REGEX_SAMPLE_TEXT =
  "QUICKKIT: format JSON, hash text, then format JSON again.";
