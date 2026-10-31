"use client";
import { useMemo, useState } from "react";
import { countText, MAX_TEXT_LENGTH } from "@/lib/tools/text";
import { useHydrated } from "@/lib/use-hydrated";
import CopyButton from "./copy-button";
export default function WordCounter() {
  const ready = useHydrated();
  const [text, setText] = useState("");
  const stats = useMemo(() => countText(text), [text]);
  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <div className="workspace-heading">
        <div>
          <h2>Your words, at a glance</h2>
          <p>Start typing. The numbers take care of themselves.</p>
        </div>
        <span className="local-badge">Local processing</span>
      </div>
      <label htmlFor="word-input">Your text</label>
      <textarea
        disabled={!ready}
        id="word-input"
        maxLength={MAX_TEXT_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your essay, draft, or next big idea here…"
        rows={9}
        aria-describedby="word-limit"
      />
      <div className="input-footer">
        <span id="word-limit">Up to 1,000,000 UTF-16 code units.</span>
        <button
          className="secondary"
          onClick={() => setText("")}
          disabled={!text}
        >
          Clear text
        </button>
      </div>
      <div className="stat-grid" aria-live="polite">
        {[
          [stats.words, "Words"],
          [stats.characters, "Characters"],
          [stats.withoutSpaces, "Without whitespace"],
          [stats.sentences, "Sentences"],
          [stats.paragraphs, "Paragraphs"],
          [`${stats.readingSeconds}s`, "Reading time"],
        ].map(([value, label]) => (
          <div className="stat" key={label}>
            <strong>{value.toLocaleString()}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="workspace-foot">
        <p>
          Reading time assumes 200 words per minute. Counts are estimates, not
          linguistic analysis.
        </p>
        <CopyButton key={text} text={text} />
      </div>
    </fieldset>
  );
}
