"use client";
import { useMemo, useState } from "react";
import { Eraser, FileText, Sparkles, Target } from "lucide-react";
import {
  analyzeText,
  countText,
  MAX_TEXT_LENGTH,
  SAMPLE_TEXT,
} from "@/lib/tools/text";
import { formatDuration } from "@/lib/tools/download";
import { useHydrated } from "@/lib/use-hydrated";
import CopyButton from "./copy-button";
import { CharMeter, DownloadTextButton, WorkspaceHeading } from "./tool-ui";

export default function WordCounter() {
  const ready = useHydrated();
  const [text, setText] = useState("");
  const [goal, setGoal] = useState("");
  const stats = useMemo(() => countText(text), [text]);
  const insight = useMemo(() => analyzeText(text), [text]);
  const goalWords = Math.max(0, Math.floor(Number(goal) || 0));
  const goalPercent = goalWords
    ? Math.min(100, Math.round((stats.words / goalWords) * 100))
    : 0;
  const maxTop = insight.topWords[0]?.count ?? 1;

  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <WorkspaceHeading
        title="Your words, at a glance"
        description="Start typing. The numbers take care of themselves — live, as you write."
      />

      <div className="tool-toolbar">
        <label htmlFor="word-input">Your text</label>
        <div className="toolbar-actions">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => setText(SAMPLE_TEXT)}
          >
            <Sparkles size={14} /> Try sample text
          </button>
          <CharMeter value={text.length} max={MAX_TEXT_LENGTH} />
        </div>
      </div>
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
        <span id="word-limit">
          Up to 1,000,000 UTF-16 code units. Nothing leaves your browser.
        </span>
        <button
          className="secondary"
          onClick={() => setText("")}
          disabled={!text}
        >
          <Eraser size={15} /> Clear text
        </button>
      </div>

      <div className="stat-grid" aria-live="polite">
        {[
          [stats.words.toLocaleString(), "Words"],
          [stats.characters.toLocaleString(), "Characters"],
          [stats.withoutSpaces.toLocaleString(), "Without whitespace"],
          [stats.sentences.toLocaleString(), "Sentences"],
          [stats.paragraphs.toLocaleString(), "Paragraphs"],
          [formatDuration(stats.readingSeconds), "Reading time"],
        ].map(([value, label]) => (
          <div className="stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="insight-grid" aria-live="polite">
        {[
          [formatDuration(insight.speakingSeconds), "Speaking time · 150 wpm"],
          [insight.lines.toLocaleString(), "Lines"],
          [insight.uniqueWords.toLocaleString(), "Unique words"],
          [
            insight.averageWordLength ? String(insight.averageWordLength) : "0",
            "Avg. word length",
          ],
        ].map(([value, label]) => (
          <div className="insight" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="panel-split">
        <section className="mini-panel" aria-labelledby="goal-title">
          <h3 id="goal-title">
            <Target size={16} /> Word goal
          </h3>
          <div className="goal-row">
            <label className="sr-only" htmlFor="word-goal">
              Word goal (optional)
            </label>
            <input
              id="word-goal"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 500"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <span className="goal-text" role="status">
              {goalWords
                ? stats.words >= goalWords
                  ? `Goal reached — ${stats.words.toLocaleString()} of ${goalWords.toLocaleString()} words`
                  : `${stats.words.toLocaleString()} of ${goalWords.toLocaleString()} words · ${(goalWords - stats.words).toLocaleString()} to go`
                : "Set a target to track your progress."}
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goalPercent}
            aria-label="Progress toward word goal"
          >
            <div
              className="progress-fill"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          {insight.longestWord && (
            <p className="help">
              Longest word: <strong>{insight.longestWord}</strong> (
              {Array.from(insight.longestWord).length} letters)
            </p>
          )}
        </section>

        <section className="mini-panel" aria-labelledby="density-title">
          <h3 id="density-title">
            <FileText size={16} /> Most used words
          </h3>
          {insight.topWords.length ? (
            <ul className="density-list">
              {insight.topWords.map(({ word, count, percent }) => (
                <li key={word}>
                  <span className="density-word">{word}</span>
                  <span className="density-bar" aria-hidden="true">
                    <span style={{ width: `${(count / maxTop) * 100}%` }} />
                  </span>
                  <span className="density-count">
                    {count}× · {percent}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="help">
              Type a few sentences and your most-used words will appear here
              (common filler words are ignored).
            </p>
          )}
        </section>
      </div>

      <div className="workspace-foot">
        <p>
          Reading time assumes 200 words per minute, speaking time 150. Counts
          are estimates, not linguistic analysis.
        </p>
        <div className="foot-actions">
          <DownloadTextButton text={text} filename="quickkit-text.txt" />
          <CopyButton key={text} text={text} />
        </div>
      </div>
    </fieldset>
  );
}
