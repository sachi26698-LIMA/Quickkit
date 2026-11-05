"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Eye,
  EyeOff,
  Redo2,
  Replace,
  Search,
  Undo2,
  X,
} from "lucide-react";
import {
  confidenceMap,
  findMatches,
  highlightSegments,
  replaceAll,
  replaceOne,
  textStats,
  type FindOptions,
} from "@/lib/tools/image-to-text/editor";
import type { OcrDocumentSection } from "@/lib/tools/image-to-text/types";
import { ConfidenceChip } from "./shared";

export interface EditorPaneProps {
  sections: OcrDocumentSection[];
  activeId: string | null;
  threshold: number;
  busy: boolean;
  onActivate: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
  onUndo: (id: string) => void;
  onRedo: (id: string) => void;
  canUndoFor: (id: string) => boolean;
  canRedoFor: (id: string) => boolean;
  onCopy: (text: string, label: string) => void;
  onRerun: (id: string) => void;
  onSelectAllPages: () => void;
  onInvertPages: () => void;
  selectedPages: Set<string>;
  onTogglePage: (id: string) => void;
}

export default function EditorPane(props: EditorPaneProps) {
  const {
    sections,
    activeId,
    threshold,
    busy,
    onActivate,
    onChangeText,
    onUndo,
    onRedo,
    canUndoFor,
    canRedoFor,
    onCopy,
    onRerun,
    onTogglePage,
    selectedPages,
  } = props;
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showFind, setShowFind] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  // A new query (or page) starts matching from the first hit: track the pair
  // the current index belongs to instead of resetting it inside an effect.
  const [matchKey, setMatchKey] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentMatchKey = `${activeId}|${query}|${matchCase}|${wholeWord}`;
  const effectiveMatchIndex = currentMatchKey === matchKey ? matchIndex : 0;
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId),
  );
  const active = sections[activeIndex];
  const options: FindOptions = { matchCase, wholeWord };

  const matches = useMemo(
    () =>
      active && query
        ? findMatches(active.text, query, { matchCase, wholeWord })
        : [],
    [active, query, matchCase, wholeWord],
  );

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const segments = useMemo(() => {
    if (!active || !highlight) return null;
    return highlightSegments(
      active.text,
      confidenceMap(active.page),
      threshold,
    );
  }, [active, highlight, threshold]);

  const stats = active
    ? textStats(active.text)
    : { characters: 0, words: 0, lines: 0 };

  const focusMatch = (index: number) => {
    if (!active || !matches.length || !textareaRef.current) return;
    const next = ((index % matches.length) + matches.length) % matches.length;
    setMatchKey(currentMatchKey);
    setMatchIndex(next);
    const target = matches[next];
    const element = textareaRef.current;
    element.focus();
    element.setSelectionRange(target.start, target.end);
    // Scroll the match into view by approximating its line position.
    const before = active.text.slice(0, target.start);
    const line = before.split("\n").length;
    const lineHeight = 24;
    element.scrollTop = Math.max(0, (line - 3) * lineHeight);
  };

  if (!sections.length) {
    return (
      <div className="i2t-editor is-empty">
        <p>
          Extracted text appears here. Add an image, choose a language and press
          <strong> Start OCR</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="i2t-editor">
      <div className="i2t-editor-head">
        <div className="i2t-page-tabs" role="tablist" aria-label="Pages">
          <button
            type="button"
            className="i2t-page-arrow"
            onClick={() =>
              onActivate(sections[Math.max(0, activeIndex - 1)].id)
            }
            disabled={activeIndex === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <div className="i2t-page-scroll">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`i2t-page-tab${section.id === active?.id ? " is-active" : ""}`}
              >
                <label className="i2t-page-check">
                  <input
                    type="checkbox"
                    checked={selectedPages.has(section.id)}
                    onChange={() => onTogglePage(section.id)}
                    aria-label={`Select ${section.title} for export`}
                  />
                </label>
                <button
                  type="button"
                  role="tab"
                  aria-selected={section.id === active?.id}
                  onClick={() => onActivate(section.id)}
                  title={section.title}
                >
                  <span className="i2t-page-index">{index + 1}</span>
                  <span className="i2t-page-label">{section.title}</span>
                  <ConfidenceChip
                    value={section.page.confidence}
                    threshold={threshold}
                  />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="i2t-page-arrow"
            onClick={() =>
              onActivate(
                sections[Math.min(sections.length - 1, activeIndex + 1)].id,
              )
            }
            disabled={activeIndex === sections.length - 1}
            aria-label="Next page"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {active && (
        <>
          <div
            className="i2t-editor-toolbar"
            role="toolbar"
            aria-label="Editor"
          >
            <div className="i2t-toolbar-group">
              <button
                type="button"
                className="i2t-tool"
                onClick={() => onUndo(active.id)}
                disabled={!canUndoFor(active.id)}
                aria-label="Undo"
                title="Undo"
              >
                <Undo2 size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="i2t-tool"
                onClick={() => onRedo(active.id)}
                disabled={!canRedoFor(active.id)}
                aria-label="Redo"
                title="Redo"
              >
                <Redo2 size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`i2t-tool${showFind ? " is-active" : ""}`}
                onClick={() => setShowFind((open) => !open)}
                aria-expanded={showFind}
                aria-label="Find and replace"
                title="Find and replace"
              >
                <Search size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`i2t-tool${highlight ? " is-active" : ""}`}
                onClick={() => setHighlight((on) => !on)}
                aria-pressed={highlight}
                aria-label="Highlight uncertain words"
                title="Highlight uncertain words"
              >
                {highlight ? (
                  <Eye size={15} aria-hidden="true" />
                ) : (
                  <EyeOff size={15} aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="i2t-toolbar-group">
              <button
                type="button"
                className="i2t-tool"
                onClick={() => {
                  const element = textareaRef.current;
                  const selected =
                    element && element.selectionEnd > element.selectionStart
                      ? element.value.slice(
                          element.selectionStart,
                          element.selectionEnd,
                        )
                      : active.text;
                  onCopy(
                    selected,
                    selected === active.text
                      ? "Copied all text"
                      : "Copied selection",
                  );
                }}
                aria-label="Copy selected text"
                title="Copy selected text (copies everything when nothing is selected)"
              >
                <ClipboardCopy size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="i2t-tool"
                onClick={() => onRerun(active.id)}
                disabled={busy}
                aria-label={`Re-run OCR on ${active.title}`}
                title="Re-run OCR on this page"
              >
                <Replace size={15} aria-hidden="true" />
              </button>
            </div>
            <p className="i2t-editor-stats">
              {stats.words.toLocaleString()} words ·{" "}
              {stats.characters.toLocaleString()} characters ·{" "}
              {active.extraction.resolvedMode} mode
            </p>
          </div>

          {showFind && (
            <div
              className="i2t-find"
              role="group"
              aria-label="Find and replace"
            >
              <input
                type="search"
                value={query}
                placeholder="Find in this page"
                aria-label="Find"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    focusMatch(
                      event.shiftKey
                        ? effectiveMatchIndex - 1
                        : effectiveMatchIndex + 1,
                    );
                  }
                }}
              />
              <input
                type="text"
                value={replacement}
                placeholder="Replace with"
                aria-label="Replace with"
                onChange={(event) => setReplacement(event.target.value)}
              />
              <div className="i2t-find-actions">
                <button
                  type="button"
                  className="i2t-tool"
                  onClick={() => focusMatch(effectiveMatchIndex - 1)}
                  disabled={!matches.length}
                  aria-label="Previous match"
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="i2t-tool"
                  onClick={() => focusMatch(effectiveMatchIndex + 1)}
                  disabled={!matches.length}
                  aria-label="Next match"
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
                <span className="i2t-find-count" aria-live="polite">
                  {matches.length
                    ? `${Math.min(effectiveMatchIndex + 1, matches.length)} of ${matches.length}`
                    : "No matches"}
                </span>
                <button
                  type="button"
                  className="i2t-mini"
                  onClick={() => {
                    const result = replaceOne(
                      active.text,
                      query,
                      replacement,
                      effectiveMatchIndex < matches.length
                        ? matches[effectiveMatchIndex].start
                        : 0,
                      options,
                    );
                    if (result.replaced) {
                      onChangeText(active.id, result.text);
                      setStatus("Replaced 1 match");
                    } else setStatus("Nothing to replace");
                  }}
                  disabled={!matches.length}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="i2t-mini"
                  onClick={() => {
                    const result = replaceAll(
                      active.text,
                      query,
                      replacement,
                      options,
                    );
                    if (result.replaced) {
                      onChangeText(active.id, result.text);
                      setStatus(`Replaced ${result.replaced} matches`);
                    } else setStatus("Nothing to replace");
                  }}
                  disabled={!matches.length}
                >
                  All
                </button>
                <button
                  type="button"
                  className="i2t-tool"
                  onClick={() => {
                    setQuery("");
                    setReplacement("");
                  }}
                  aria-label="Clear find"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="i2t-find-options">
                <label>
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(event) => setMatchCase(event.target.checked)}
                  />
                  Match case
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={wholeWord}
                    onChange={(event) => setWholeWord(event.target.checked)}
                  />
                  Whole word
                </label>
              </div>
            </div>
          )}

          {status && (
            <p className="i2t-toast" role="status">
              {status}
            </p>
          )}

          <div className="i2t-editor-body">
            {highlight && segments ? (
              <div
                className="i2t-highlight"
                aria-hidden="true"
                dir={active.page.rtl ? "rtl" : "ltr"}
              >
                {segments.map((segment, index) =>
                  segment.uncertain ? (
                    <mark key={index} title="Low OCR confidence">
                      {segment.text}
                    </mark>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </div>
            ) : null}
            <label className="sr-only" htmlFor="i2t-editor-text">
              Extracted text for {active.title}
            </label>
            <textarea
              id="i2t-editor-text"
              ref={textareaRef}
              className={highlight ? "with-highlight" : undefined}
              value={active.text}
              dir={active.page.rtl ? "rtl" : "ltr"}
              spellCheck={false}
              onChange={(event) => onChangeText(active.id, event.target.value)}
              onKeyDown={(event) => {
                const meta = event.metaKey || event.ctrlKey;
                if (!meta) return;
                if (event.key.toLowerCase() === "z" && !event.shiftKey) {
                  event.preventDefault();
                  onUndo(active.id);
                } else if (event.key.toLowerCase() === "z" && event.shiftKey) {
                  event.preventDefault();
                  onRedo(active.id);
                } else if (event.key.toLowerCase() === "f") {
                  event.preventDefault();
                  setShowFind(true);
                }
              }}
            />
          </div>

          <footer className="i2t-editor-foot">
            <span>
              {active.page.warnings.length
                ? active.page.warnings.slice(0, 2).join(" · ")
                : `${active.page.lines.length} lines · ${active.page.languages.join("+")}`}
            </span>
            {active.extraction.rationale && (
              <span className="i2t-rationale">
                {active.extraction.rationale}
              </span>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
