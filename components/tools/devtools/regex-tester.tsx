"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeRegexInWorker,
  MAX_REGEX_MATCHES,
  MAX_REGEX_PATTERN_LENGTH,
  MAX_REGEX_REPLACEMENT_LENGTH,
  MAX_REGEX_REPLACEMENT_PREVIEW_LENGTH,
  MAX_REGEX_TEST_LENGTH,
  REGEX_SAMPLE_TEXT,
  type RegexAnalysis,
  type RegexMatch,
} from "@/lib/tools/regex";
import { DevTextOutput, DevToolFrame, type ToolMessage } from "./shared";

type Flag = "g" | "i" | "m" | "s" | "u";
type Flags = Record<Flag, boolean>;
const DEFAULT_FLAGS: Flags = { g: true, i: true, m: false, s: false, u: false };

export default function RegexTester() {
  const [pattern, setPattern] = useState("QUICKKIT");
  const [flags, setFlags] = useState<Flags>(DEFAULT_FLAGS);
  const [sample, setSample] = useState(REGEX_SAMPLE_TEXT);
  const [replacement, setReplacement] = useState("QUICKKIT");
  const [analysis, setAnalysis] = useState<RegexAnalysis | null>(null);
  const [message, setMessage] = useState<ToolMessage | null>(null);
  const flagText = useMemo(
    () =>
      (["g", "i", "m", "s", "u"] as const)
        .filter((flag) => flags[flag])
        .join(""),
    [flags],
  );

  useEffect(() => {
    if (!pattern && !sample && !replacement) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void analyzeRegexInWorker(
        { pattern, flags: flagText, sample, replacement },
        controller.signal,
      )
        .then((result) => {
          setAnalysis(result);
          const matchStatus = result.truncated
            ? ` at least ${result.matches.length.toLocaleString()} matches shown (the list is capped at ${MAX_REGEX_MATCHES.toLocaleString()})`
            : ` ${result.matches.length.toLocaleString()} match${result.matches.length === 1 ? "" : "es"} found`;
          const replacementStatus = result.replacementTruncated
            ? ` The replacement preview is limited to ${MAX_REGEX_REPLACEMENT_PREVIEW_LENGTH.toLocaleString()} characters; reduce the input or replacement to create a complete result.`
            : " The replacement preview is ready.";
          setMessage({
            kind:
              result.truncated || result.replacementTruncated
                ? "warning"
                : "success",
            text: `${matchStatus}.${replacementStatus}`,
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          setAnalysis(null);
          setMessage({
            kind: "error",
            text:
              error instanceof Error
                ? error.message
                : "Could not test this regular expression.",
          });
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pattern, flagText, sample, replacement]);

  const clear = () => {
    setPattern("");
    setSample("");
    setReplacement("");
    setAnalysis(null);
    setMessage(null);
  };
  const reset = () => {
    setPattern("QUICKKIT");
    setFlags(DEFAULT_FLAGS);
    setSample(REGEX_SAMPLE_TEXT);
    setReplacement("QUICKKIT");
    setAnalysis(null);
    setMessage(null);
  };
  const loadSample = () => {
    setPattern("(QUICKKIT): (format|hash)");
    setFlags({ g: true, i: true, m: false, s: false, u: false });
    setSample(REGEX_SAMPLE_TEXT);
    setReplacement("$1 — $2");
    setAnalysis(null);
    setMessage(null);
  };

  return (
    <DevToolFrame
      title="See every match, safely"
      description="Live matching, capture groups and replacement preview run in a short-lived local Web Worker. Patterns are never evaluated as JavaScript."
      message={message}
      output={analysis?.replacement ?? ""}
      copyText={
        analysis?.replacementTruncated ? "" : (analysis?.replacement ?? "")
      }
      filename="quickkit-regex-replacement.txt"
      mimeType="text/plain;charset=utf-8"
      downloadLabel="Download replacement"
      canDownload={Boolean(analysis && !analysis.replacementTruncated)}
      hasContent={Boolean(pattern || sample || replacement)}
      onClear={clear}
      onReset={reset}
      help={`Patterns are limited to ${MAX_REGEX_PATTERN_LENGTH} characters, test text to ${MAX_REGEX_TEST_LENGTH.toLocaleString()} characters and replacement previews to ${MAX_REGEX_REPLACEMENT_PREVIEW_LENGTH.toLocaleString()} characters. Workers are terminated after ${300} ms to keep a pathological expression from freezing the page.`}
    >
      <div className="devtool-options">
        <label className="devtool-option-label">
          Regular expression
          <input
            type="text"
            aria-label="Regular expression"
            maxLength={MAX_REGEX_PATTERN_LENGTH}
            value={pattern}
            onChange={(event) => setPattern(event.currentTarget.value)}
            placeholder="e.g. (cat|dog)+"
            spellCheck={false}
          />
        </label>
        <div
          className="devtool-toggle-group"
          role="group"
          aria-label="Regular expression flags"
        >
          <span className="devtool-toggle-legend">Flags</span>
          <div className="regex-flags">
            {(["g", "i", "m", "s", "u"] as const).map((flag) => (
              <label key={flag} className="regex-flag">
                <input
                  type="checkbox"
                  checked={flags[flag]}
                  onChange={(event) =>
                    setFlags((current) => ({
                      ...current,
                      [flag]: event.currentTarget.checked,
                    }))
                  }
                />
                <code>{flag}</code>
                <span>
                  {flag === "g"
                    ? "global"
                    : flag === "i"
                      ? "ignore case"
                      : flag === "m"
                        ? "multiline"
                        : flag === "s"
                          ? "dot all"
                          : "Unicode"}
                </span>
              </label>
            ))}
          </div>
        </div>
        <label className="devtool-option-label">
          Replacement
          <input
            type="text"
            aria-label="Replacement"
            maxLength={MAX_REGEX_REPLACEMENT_LENGTH}
            value={replacement}
            onChange={(event) => setReplacement(event.currentTarget.value)}
            placeholder="$1 or replacement text"
          />
        </label>
        <button type="button" className="toolbar-button" onClick={loadSample}>
          Sample pattern
        </button>
      </div>
      <div className="devtool-editors">
        <div className="devtool-editor">
          <div className="devtool-editor-toolbar">
            <label htmlFor="regex-test-text">Test text</label>
            <span className="char-meter">
              {sample.length.toLocaleString()} /{" "}
              {MAX_REGEX_TEST_LENGTH.toLocaleString()}
            </span>
          </div>
          <textarea
            id="regex-test-text"
            className="code-input devtool-code-input"
            maxLength={MAX_REGEX_TEST_LENGTH}
            value={sample}
            onChange={(event) => setSample(event.currentTarget.value)}
            placeholder="Type or paste text to test…"
            spellCheck={false}
          />
          <div
            className="devtool-regex-highlights"
            role="region"
            aria-label="Highlighted matches"
          >
            <span className="field-label">Match highlights</span>
            <pre>
              {analysis ? (
                <HighlightedSample sample={sample} matches={analysis.matches} />
              ) : (
                "Waiting for a pattern…"
              )}
            </pre>
          </div>
          {analysis?.matches.length ? (
            <MatchGroups matches={analysis.matches} />
          ) : null}
        </div>
        <DevTextOutput
          id="regex-replacement-output"
          label="Replacement preview"
          value={analysis?.replacement ?? ""}
          placeholder="Replacement preview updates as you type…"
        />
      </div>
      <p className="devtool-file-note">
        Use `$1`, `$2`, `$&` or `$&lt;name&gt;` in the replacement field.
        Supported flags: g, i, m, s and u.
      </p>
    </DevToolFrame>
  );
}

function HighlightedSample({
  sample,
  matches,
}: {
  sample: string;
  matches: RegexMatch[];
}) {
  if (!matches.length) return <>{sample || "No sample text."}</>;
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const [index, match] of matches.entries()) {
    if (match.index < cursor) continue;
    if (match.index > cursor) pieces.push(sample.slice(cursor, match.index));
    if (!match.text) {
      pieces.push(
        <mark key={`empty-${index}`} aria-label="Zero-length match">
          ∅
        </mark>,
      );
      cursor = match.index;
    } else {
      pieces.push(<mark key={`match-${index}`}>{match.text}</mark>);
      cursor = match.index + match.text.length;
    }
  }
  if (cursor < sample.length) pieces.push(sample.slice(cursor));
  return <>{pieces}</>;
}

function MatchGroups({ matches }: { matches: RegexMatch[] }) {
  const shown = matches.slice(0, 50);
  return (
    <section className="devtool-regex-groups" aria-label="Match details">
      <span className="field-label">Capture groups</span>
      <ol>
        {shown.map((match, index) => (
          <li key={`${match.index}-${index}`}>
            <strong>Match {index + 1}</strong> · index {match.index} ·{" "}
            <code>{JSON.stringify(match.text)}</code>
            {match.captures.length ? (
              <ul>
                {match.captures.map((capture, captureIndex) => (
                  <li key={captureIndex}>
                    Group {captureIndex + 1}:{" "}
                    <code>
                      {capture === undefined
                        ? "undefined"
                        : JSON.stringify(capture)}
                    </code>
                  </li>
                ))}
                {match.groups
                  ? Object.entries(match.groups).map(([name, capture]) => (
                      <li key={name}>
                        Group {name}:{" "}
                        <code>
                          {capture === undefined
                            ? "undefined"
                            : JSON.stringify(capture)}
                        </code>
                      </li>
                    ))
                  : null}
              </ul>
            ) : (
              <span> · no capture groups</span>
            )}
          </li>
        ))}
      </ol>
      {matches.length > shown.length ? (
        <span>Showing the first {shown.length} detailed matches.</span>
      ) : null}
    </section>
  );
}
