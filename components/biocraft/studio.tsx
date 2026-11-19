"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Film,
  AtSign,
  Loader2,
  PenLine,
  Quote,
  RefreshCw,
  Sparkles,
  Type,
  User,
} from "lucide-react";
import FontPicker from "./font-picker";
import FontPreviewLine from "./font-preview-line";
import { fetchFontsBySlug } from "@/lib/fonts/client-api";
import { fontFamilyName } from "@/lib/fonts/loader";
import {
  BIO_LIBRARY,
  CAPTIONS,
  QUOTES,
  SHAYARI,
  VIBES,
  generateBios,
  generateShayari,
  generateUsernames,
  stylishVariants,
  type Vibe,
} from "@/lib/fonts/studio-content";
import {
  readSelectedFont,
  rememberSelectedFont,
  trackFontUse,
} from "@/lib/fonts/preferences";
import type { FontRecord } from "@/lib/fonts/types";

type Tab =
  "bio" | "library" | "shayari" | "quotes" | "caption" | "username" | "stylish";

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "bio", label: "Bio generator", icon: AtSign },
  { id: "library", label: "Bio library", icon: Film },
  { id: "shayari", label: "Shayari", icon: Quote },
  { id: "quotes", label: "Quotes", icon: Quote },
  { id: "caption", label: "Captions", icon: PenLine },
  { id: "username", label: "Usernames", icon: User },
  { id: "stylish", label: "Stylish text", icon: Sparkles },
];

const HASH_TO_TAB: Record<string, Tab> = {
  bio: "bio",
  library: "library",
  shayari: "shayari",
  quotes: "quotes",
  caption: "caption",
  username: "username",
  stylish: "stylish",
};

export default function BioCraftStudio({
  initialFonts,
  sampleText,
}: {
  initialFonts: FontRecord[];
  sampleText: string;
}) {
  const [tab, setTab] = useState<Tab>("bio");
  const [font, setFont] = useState<FontRecord | null>(initialFonts[0] ?? null);
  const [size, setSize] = useState(38);
  const [weight, setWeight] = useState(400);

  const [name, setName] = useState("");
  const [vibe, setVibe] = useState<Vibe>("Attitude");
  const [emoji, setEmoji] = useState(true);
  const [libraryVibe, setLibraryVibe] = useState<Vibe | "All">("All");
  const [mood, setMood] = useState<Vibe>("Love");
  const [quoteTheme, setQuoteTheme] = useState<Vibe>("Attitude");
  const [captionVibe, setCaptionVibe] = useState<Vibe>("Love");
  const [showTags, setShowTags] = useState(true);
  const [styleInput, setStyleInput] = useState("BioCraft Studio");
  const [seed, setSeed] = useState(0);

  const [output, setOutput] = useState(
    () => generateBios("Attitude", "", true)[0] ?? BIO_LIBRARY[0].text,
  );
  const [candidates, setCandidates] = useState<string[]>(() =>
    generateBios("Attitude", "", true),
  );
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (HASH_TO_TAB[hash]) queueMicrotask(() => setTab(HASH_TO_TAB[hash]));
    const stored = readSelectedFont();
    if (stored && stored !== initialFonts[0]?.slug) {
      const controller = new AbortController();
      void fetchFontsBySlug([stored], controller.signal).then((fonts) => {
        if (!controller.signal.aborted && fonts[0]) setFont(fonts[0]);
      });
      return () => controller.abort();
    }
    return undefined;
  }, [initialFonts]);

  const chooseFont = (next: FontRecord) => {
    setFont(next);
    rememberSelectedFont(next.slug);
    trackFontUse(next.slug, "studio");
  };

  const copy = async (value = output) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const bioOptions = useMemo(
    () => generateBios(vibe, name, emoji),
    [vibe, name, emoji],
  );

  const shayariOptions = useMemo(
    () => generateShayari(mood, seed),
    [mood, seed],
  );

  const quotes = useMemo(
    () =>
      QUOTES.filter((item) => item.theme === quoteTheme).map(
        (item) => item.text,
      ),
    [quoteTheme],
  );

  const captions = useMemo(
    () => CAPTIONS.filter((item) => item.vibe === captionVibe),
    [captionVibe],
  );

  const usernames = useMemo(() => generateUsernames(name || "sachin"), [name]);

  const styles = useMemo(
    () => stylishVariants(styleInput || "BioCraft"),
    [styleInput],
  );

  const libraryItems = useMemo(
    () =>
      BIO_LIBRARY.filter(
        (item) => libraryVibe === "All" || item.vibe === libraryVibe,
      ),
    [libraryVibe],
  );

  const generate = () => {
    setBusy(true);
    window.setTimeout(() => {
      if (tab === "bio") {
        setCandidates(bioOptions);
        setOutput(bioOptions[0] ?? "");
      } else if (tab === "shayari") {
        setCandidates(shayariOptions);
        setOutput(shayariOptions[0] ?? "");
      } else if (tab === "quotes") {
        setCandidates(quotes);
        setOutput(quotes[0] ?? "");
      } else if (tab === "caption") {
        const next = captions.map((item) =>
          showTags ? `${item.text}\n\n${item.tags.join(" ")}` : item.text,
        );
        setCandidates(next);
        setOutput(next[0] ?? "");
      } else if (tab === "username") {
        setCandidates(usernames);
        setOutput(usernames[0] ?? "");
      } else if (tab === "stylish") {
        const next = styles.map((style) => style.value);
        setCandidates(next);
        setOutput(next[0] ?? "");
      } else {
        const next = libraryItems.map((item) => item.text);
        setCandidates(next);
        setOutput(next[0] ?? "");
      }
      setBusy(false);
    }, 120);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setCandidates([]);
    const first =
      next === "bio"
        ? bioOptions[0]
        : next === "shayari"
          ? shayariOptions[0]
          : next === "quotes"
            ? quotes[0]
            : next === "caption"
              ? `${captions[0]?.text ?? ""}${showTags && captions[0] ? `\n\n${captions[0].tags.join(" ")}` : ""}`
              : next === "username"
                ? usernames[0]
                : next === "stylish"
                  ? styles[0]?.value
                  : libraryItems[0]?.text;
    if (first) setOutput(first);
  };

  const charCount = [...output.replace(/\s/g, "")].length;
  const lineCount = output.split("\n").length;

  return (
    <>
      <header style={{ padding: "42px 0 10px" }}>
        <span className="bc-kicker">
          <Type size={13} /> Hindi preview & bio studio
        </span>
        <h1
          style={{
            fontSize: "clamp(32px, 4.4vw, 50px)",
            letterSpacing: "-0.04em",
            margin: "16px 0 8px",
            fontWeight: 600,
          }}
        >
          लिखें, फ़ॉन्ट चुनें, निखारें।
        </h1>
        <p className="bc-lede" style={{ marginTop: 0 }}>
          The output below is rendered by the selected Devanagari file. Copy the
          text, take it to Instagram, or send it straight to the poster studio.
        </p>
      </header>

      <div className="bc-tabs" role="tablist" aria-label="BioCraft tools">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              id={item.id}
              role="tab"
              className="bc-tab"
              aria-selected={tab === item.id}
              onClick={() => {
                switchTab(item.id);
                window.history.replaceState(null, "", `#${item.id}`);
              }}
            >
              <Icon size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className="bc-studio"
        style={
          font
            ? ({
                "--bc-studio-font": `"${fontFamilyName(font.slug)}"`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <section className="bc-card bc-panel" aria-label="Generator controls">
          {tab === "bio" ? (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                Instagram bio generator
              </h2>
              <p className="bc-hint" style={{ marginTop: 0 }}>
                A Hindi bio with a line break, built around your name.
              </p>
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <div className="bc-field">
                  <label htmlFor="bio-name">Your name</label>
                  <input
                    id="bio-name"
                    className="bc-textarea"
                    style={{ minHeight: 42, padding: "9px 12px" }}
                    value={name}
                    maxLength={30}
                    placeholder="सचिन"
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="bc-field">
                  <label htmlFor="bio-vibe">Vibe</label>
                  <select
                    id="bio-vibe"
                    className="bc-select"
                    value={vibe}
                    onChange={(event) => setVibe(event.target.value as Vibe)}
                  >
                    {VIBES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <label
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 13,
                    color: "var(--bc-ink-soft)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={emoji}
                    onChange={(event) => setEmoji(event.target.checked)}
                  />
                  Add a small emoji accent
                </label>
                <button type="button" className="bc-button" onClick={generate}>
                  <Sparkles size={14} /> Generate bios
                </button>
              </div>
              <div className="bc-output-list" aria-live="polite">
                {(candidates.length ? candidates : bioOptions).map(
                  (value, index) => (
                    <button
                      key={`${value}-${index}`}
                      type="button"
                      className="bc-output-item"
                      aria-pressed={output === value}
                      onClick={() => setOutput(value)}
                    >
                      {value}
                    </button>
                  ),
                )}
              </div>
            </>
          ) : null}

          {tab === "library" ? (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                Ready-made bio library
              </h2>
              <p className="bc-hint" style={{ marginTop: 0 }}>
                Short Hindi bios grouped by mood. Pick one and change the type
                on the right.
              </p>
              <div className="bc-chips" style={{ paddingTop: 12 }}>
                <button
                  type="button"
                  className="bc-chip"
                  aria-pressed={libraryVibe === "All"}
                  onClick={() => setLibraryVibe("All")}
                >
                  All
                </button>
                {VIBES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="bc-chip"
                    aria-pressed={libraryVibe === item}
                    onClick={() => setLibraryVibe(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="bc-output-list" style={{ maxHeight: 460 }}>
                {(candidates.length
                  ? candidates.map((text) => ({ text }))
                  : libraryItems
                ).map((item, index) => (
                  <button
                    key={`${item.text}-${index}`}
                    type="button"
                    className="bc-output-item"
                    aria-pressed={output === item.text}
                    onClick={() => setOutput(item.text)}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {tab === "shayari" ? (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                Shayari generator
              </h2>
              <p className="bc-hint" style={{ marginTop: 0 }}>
                Curated two-line Hindi verses, plus a few fresh pairings from
                the same collection. These lines were written for this studio;
                no author is attributed.
              </p>
              <div className="bc-field" style={{ marginTop: 14 }}>
                <label htmlFor="shayari-mood">Mood</label>
                <select
                  id="shayari-mood"
                  className="bc-select"
                  value={mood}
                  onChange={(event) => setMood(event.target.value as Vibe)}
                >
                  {VIBES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="bc-button"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setSeed((value) => value + 1);
                  generate();
                }}
              >
                <RefreshCw size={14} /> New pairing
              </button>
              <div className="bc-output-list">
                {(candidates.length ? candidates : shayariOptions).map(
                  (value, index) => (
                    <button
                      key={`${value}-${index}`}
                      type="button"
                      className="bc-output-item"
                      aria-pressed={output === value}
                      onClick={() => setOutput(value)}
                    >
                      {value}
                    </button>
                  ),
                )}
              </div>
              <p className="bc-hint">
                {SHAYARI.length} curated lines across {VIBES.length} moods.
              </p>
            </>
          ) : null}

          {tab === "quotes" ? (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                Quotes generator
              </h2>
              <p className="bc-hint" style={{ marginTop: 0 }}>
                One-line Hindi thoughts for cards, stories and headlines.
              </p>
              <div className="bc-field" style={{ marginTop: 14 }}>
                <label htmlFor="quote-theme">Theme</label>
                <select
                  id="quote-theme"
                  className="bc-select"
                  value={quoteTheme}
                  onChange={(event) =>
                    setQuoteTheme(event.target.value as Vibe)
                  }
                >
                  {VIBES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bc-output-list">
                {(candidates.length ? candidates : quotes).map(
                  (value, index) => (
                    <button
                      key={`${value}-${index}`}
                      type="button"
                      className="bc-output-item"
                      aria-pressed={output === value}
                      onClick={() => setOutput(value)}
                    >
                      {value}
                    </button>
                  ),
                )}
              </div>
            </>
          ) : null}

          {tab === "caption" ? (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                Caption generator
              </h2>
              <p className="bc-hint" style={{ marginTop: 0 }}>
                Short Hindi captions with hashtag sets for reels and posts.
              </p>
              <div className="bc-field" style={{ marginTop: 14 }}>
                <label htmlFor="caption-vibe">Vibe</label>
                <select
                  id="caption-vibe"
                  className="bc-select"
                  value={captionVibe}
                  onChange={(event) =>
                    setCaptionVibe(event.target.value as Vibe)
                  }
                >
                  {VIBES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 12,
                  fontSize: 13,
                  color: "var(--bc-ink-soft)",
                }}
              >
                <input
                  type="checkbox"
                  checked={showTags}
                  onChange={(event) => setShowTags(event.target.checked)}
                />
                Include hashtags
              </label>
              <div className="bc-output-list">
                {(candidates.length
                  ? candidates
                  : captions.map((item) =>
                      showTags
                        ? `${item.text}\n\n${item.tags.join(" ")}`
                        : item.text,
                    )
                ).map((value, index) => (
                  <button
                    key={`${value}-${index}`}
                    type="button"
                    className="bc-output-item"
                    aria-pressed={output === value}
                    onClick={() => setOutput(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {tab === "username" ? (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                Username generator
              </h2>
              <p className="bc-hint" style={{ marginTop: 0 }}>
                Handle ideas using the letters Instagram allows (a–z, 0–9, dot
                and underscore). The preview on the right sets the Hindi part in
                your chosen font.
              </p>
              <div className="bc-field" style={{ marginTop: 14 }}>
                <label htmlFor="username-name">Name or word</label>
                <input
                  id="username-name"
                  className="bc-textarea"
                  style={{ minHeight: 42, padding: "9px 12px" }}
                  value={name}
                  maxLength={24}
                  placeholder="sachin"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <button
                type="button"
                className="bc-button"
                style={{ marginTop: 12 }}
                onClick={generate}
              >
                <User size={14} /> Generate handles
              </button>
              <div className="bc-output-list">
                {(candidates.length ? candidates : usernames).map(
                  (value, index) => (
                    <button
                      key={`${value}-${index}`}
                      type="button"
                      className="bc-output-item"
                      aria-pressed={output === value}
                      onClick={() => setOutput(value)}
                    >
                      {value}
                    </button>
                  ),
                )}
              </div>
            </>
          ) : null}

          {tab === "stylish" ? (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                Stylish text generator
              </h2>
              <p className="bc-hint" style={{ marginTop: 0 }}>
                Unicode variants for Latin text. Devanagari has no legitimate
                look-alike alphabets, so the Hindi preview uses the font you
                choose — a real typeface, not symbols.
              </p>
              <div className="bc-field" style={{ marginTop: 14 }}>
                <label htmlFor="stylish-input">Text</label>
                <input
                  id="stylish-input"
                  className="bc-textarea"
                  style={{ minHeight: 42, padding: "9px 12px" }}
                  value={styleInput}
                  maxLength={40}
                  onChange={(event) => setStyleInput(event.target.value)}
                />
              </div>
              <div className="bc-output-list">
                {styles.map((style) => (
                  <button
                    key={style.name}
                    type="button"
                    className="bc-output-item"
                    aria-pressed={output === style.value}
                    onClick={() => setOutput(style.value)}
                  >
                    <strong
                      style={{
                        fontSize: 11,
                        display: "block",
                        color: "var(--bc-ink-faint)",
                      }}
                    >
                      {style.name}
                    </strong>
                    {style.value}
                  </button>
                ))}
                {!styles.length ? (
                  <p className="bc-hint">Type something first.</p>
                ) : null}
              </div>
            </>
          ) : null}
        </section>

        <section className="bc-card bc-panel" aria-label="Live preview">
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <FontPicker
              selected={font}
              initialFonts={initialFonts}
              onChange={chooseFont}
            />
            <div className="bc-controls-inline">
              <div className="bc-field">
                <label htmlFor="studio-size">Size · {size}px</label>
                <input
                  id="studio-size"
                  className="bc-range"
                  type="range"
                  min={20}
                  max={72}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                />
              </div>
              <div className="bc-field">
                <label htmlFor="studio-weight">Weight</label>
                <select
                  id="studio-weight"
                  className="bc-select"
                  value={weight}
                  onChange={(event) => setWeight(Number(event.target.value))}
                >
                  {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </div>

          {font ? (
            <FontPreviewLine
              font={font}
              text={output || sampleText}
              weight={weight}
              size={size}
              className="bc-output"
              as="div"
            />
          ) : (
            <div className="bc-loading">
              <Loader2 size={16} className="spin" /> Loading fonts
            </div>
          )}

          <div className="bc-meta-row">
            <span>
              {charCount} characters · {lineCount} line
              {lineCount === 1 ? "" : "s"} · {font?.family ?? "—"}
            </span>
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="bc-button secondary small"
                onClick={() => copy()}
                disabled={!output}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy text"}
              </button>
              <Link
                className="bc-button small"
                href={`/biocraft/poster?font=${font?.slug ?? ""}&text=${encodeURIComponent(output.slice(0, 160))}`}
              >
                <Download size={13} /> Poster
              </Link>
            </span>
          </div>

          <div className="bc-note" style={{ marginTop: 14 }}>
            The preview is a real WOFF2 download from{" "}
            {font?.files.devanagari.length ?? 0} Devanagari file
            {(font?.files.devanagari.length ?? 0) === 1 ? "" : "s"} for this
            family. Switching families loads only the new file; nothing is
            uploaded.
          </div>

          <p className="bc-hint" style={{ marginTop: 12 }} aria-live="polite">
            {busy ? "Generating…" : copied ? "Copied to the clipboard." : ""}
          </p>
        </section>
      </div>
    </>
  );
}
