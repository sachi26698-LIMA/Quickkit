"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Heart,
  ShieldCheck,
} from "lucide-react";
import FontPreviewLine from "./font-preview-line";
import {
  rememberFont,
  rememberSelectedFont,
  toggleFavorite,
  trackFontUse,
} from "@/lib/fonts/preferences";
import { useFavoriteSlugs } from "@/lib/fonts/use-font-preferences";
import { fontFamilyName } from "@/lib/fonts/loader";
import type { FontRecord } from "@/lib/fonts/types";

const VOWELS = "अ आ इ ई उ ऊ ऋ ए ऐ ओ औ अं अः";
const CONSONANTS =
  "क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह";
const MATRAS = "का कि की कु कू कृ के कै को कौ कं कः क्";
const NUKTA = "क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़";
const NUMERALS = "० १ २ ३ ४ ५ ६ ७ ८ ९";
const PUNCTUATION = "। ॥ , . ! ? ( ) — ₹";
const HALF_LETTERS = "क् ख् ग् च् ज् त् द् प् म् य् र् ल् व्";

export default function FontSpecimenClient({
  font,
  sampleText,
}: {
  font: FontRecord;
  sampleText: string;
}) {
  const [text, setText] = useState(sampleText);
  const [size, setSize] = useState(64);
  const [weight, setWeight] = useState(400);
  const favoriteSlugs = useFavoriteSlugs();
  const favorite = favoriteSlugs.includes(font.slug);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    rememberFont(font.slug);
  }, [font.slug]);

  useEffect(() => {
    trackFontUse(font.slug, "specimen");
  }, [font.slug]);

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  const cssSnippet = `@font-face {
  font-family: "${fontFamilyName(font.slug)}";
  src: url("${font.primaryFile.path}") format("woff2");
  font-weight: ${font.variable ? `${font.weightRange[0]} ${font.weightRange[1]}` : (font.primaryFile.weight ?? 400)};
  font-display: swap;
}
.example { font-family: "${fontFamilyName(font.slug)}", sans-serif; }`;

  return (
    <>
      <div className="bc-specimen-title">
        <div>
          <Link className="bc-back" href="/biocraft/fonts">
            <ArrowLeft size={13} /> All fonts
          </Link>
          <h1 style={{ marginTop: 10 }}>{font.family}</h1>
          <div className="bc-card-sub" style={{ marginTop: 10 }}>
            <span className="bc-tag">{font.category}</span>
            <span className="bc-verified">
              <ShieldCheck size={11} /> Devanagari verified
            </span>
            {font.variable ? (
              <span className="bc-tag accent">variable</span>
            ) : null}
            {font.styleTags.slice(0, 4).map((tag) => (
              <span key={tag} className="bc-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="bc-button secondary small"
            aria-pressed={favorite}
            onClick={() => {
              const next = toggleFavorite(font.slug);
              setCopied(next.includes(font.slug) ? "favorite" : "unfavorite");
              window.setTimeout(() => setCopied(null), 1200);
            }}
          >
            <Heart size={14} fill={favorite ? "currentColor" : "none"} />
            {favorite ? "Favourited" : "Favourite"}
          </button>
          <button
            type="button"
            className="bc-button secondary small"
            onClick={() => {
              rememberSelectedFont(font.slug);
              trackFontUse(font.slug, "specimen-select");
            }}
          >
            <Check size={14} /> Use in the studio
          </button>
          <Link className="bc-button small" href="/biocraft/studio">
            Open studio
          </Link>
        </div>
      </div>

      <FontPreviewLine
        font={font}
        text={text || sampleText}
        weight={weight}
        size={size}
        className="bc-specimen-large"
        as="div"
      />

      <section className="bc-card bc-editor" aria-label="Specimen controls">
        <div className="bc-field">
          <label htmlFor="specimen-text">Try your own text</label>
          <textarea
            id="specimen-text"
            className="bc-textarea"
            rows={2}
            maxLength={260}
            value={text}
            onChange={(event) => setText(event.target.value)}
            lang="hi"
          />
        </div>
        <div className="bc-controls-inline">
          <div className="bc-field">
            <label htmlFor="specimen-size">Size · {size}px</label>
            <input
              id="specimen-size"
              className="bc-range"
              type="range"
              min={24}
              max={120}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </div>
          <div className="bc-field">
            <label htmlFor="specimen-weight">Weight</label>
            <select
              id="specimen-weight"
              className="bc-select"
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
            >
              {[100, 200, 300, 400, 500, 600, 700, 800, 900]
                .filter(
                  (value) =>
                    value >= font.weightRange[0] &&
                    value <= font.weightRange[1],
                )
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            className="bc-button secondary small"
            onClick={() => {
              setText(sampleText);
              setSize(64);
              setWeight(400);
            }}
          >
            Reset specimen
          </button>
        </div>
      </section>

      <section className="bc-section" aria-labelledby="glyphs">
        <div className="bc-section-head">
          <div>
            <h2 id="glyphs" style={{ fontSize: 26 }}>
              Glyph test sheet
            </h2>
            <p>
              The same checks the import gate runs: vowels, consonants, matras,
              half letters, nukta, numerals, punctuation and conjuncts. Each
              line is rendered by {font.family} itself.
            </p>
          </div>
        </div>
        <div className="bc-glyph-grid">
          {[
            ["Vowels", VOWELS],
            ["Consonants", CONSONANTS],
            ["Matras", MATRAS],
            ["Half letters", HALF_LETTERS],
            ["Nukta", NUKTA],
            ["Numerals", NUMERALS],
            ["Punctuation", PUNCTUATION],
            [
              "Conjuncts",
              font.verification.conjuncts.map((item) => item.text).join("  "),
            ],
          ].map(([label, glyphs]) => (
            <div className="bc-glyph-card" key={label}>
              <h3>{label}</h3>
              <FontPreviewLine
                font={font}
                text={glyphs}
                weight={weight}
                className="glyphs"
                as="div"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="bc-section" aria-labelledby="details">
        <div className="bc-section-head">
          <div>
            <h2 id="details" style={{ fontSize: 26 }}>
              Provenance & verification
            </h2>
          </div>
        </div>
        <div className="bc-card">
          <dl className="bc-detail-list">
            <div>
              <dt>Licence</dt>
              <dd>
                {font.license.type}{" "}
                <a
                  href={font.license.licenseFile ?? font.license.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  licence text <ExternalLink size={11} />
                </a>
              </dd>
            </div>
            <div>
              <dt>Author / copyright</dt>
              <dd>{font.license.attribution}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                <a
                  href={font.source.repository}
                  target="_blank"
                  rel="noreferrer"
                >
                  {font.source.provider} <ExternalLink size={11} />
                </a>{" "}
                · {font.source.version}
              </dd>
            </div>
            <div>
              <dt>Weights</dt>
              <dd>
                {font.weightRange[0]}–{font.weightRange[1]} ·{" "}
                {font.variable
                  ? "variable wght axis"
                  : `${font.weights.length} static cuts`}
              </dd>
            </div>
            <div>
              <dt>Devanagari coverage</dt>
              <dd>
                {font.verification.devanagariCoverage}% of required Hindi
                codepoints
              </dd>
            </div>
            <div>
              <dt>Shaping checks</dt>
              <dd>
                {font.verification.conjunctSingleGlyph}/
                {font.verification.conjunctTotal} conjuncts formed a single
                glyph · {font.verification.matrasPassed}/
                {font.verification.matrasTotal} matras ·{" "}
                {font.verification.nuktaPassed}/{font.verification.nuktaTotal}{" "}
                nukta
              </dd>
            </div>
            <div>
              <dt>Verified with</dt>
              <dd>{font.verification.checkedWith}</dd>
            </div>
            <div>
              <dt>File integrity</dt>
              <dd
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11.5,
                }}
              >
                sha256 {font.filesSha256.slice(0, 24)}…
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="bc-section" aria-labelledby="downloads">
        <div className="bc-section-head">
          <div>
            <h2 id="downloads" style={{ fontSize: 26 }}>
              Download & embed
            </h2>
            <p>
              {font.license.downloadAllowed
                ? `${font.license.type} permits redistribution. Keep the bundled licence with the files.`
                : "This licence does not permit redistribution from BioCraft."}
            </p>
          </div>
          <button
            type="button"
            className="bc-button secondary small"
            onClick={() => copy(cssSnippet, "css")}
          >
            {copied === "css" ? <Check size={13} /> : <Copy size={13} />}
            {copied === "css" ? "Copied" : "Copy @font-face"}
          </button>
        </div>
        <div className="bc-card bc-downloads">
          {[...font.files.devanagari, ...font.files.latin].map((file) => (
            <div className="bc-download-row" key={file.path}>
              <span>
                {file.subset === "devanagari" ? "Devanagari" : "Latin"} ·{" "}
                {file.weight === null ? "variable" : `${file.weight}`} ·{" "}
                {(file.bytes / 1024).toFixed(1)} KB
              </span>
              <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <a href={file.path} download>
                  <Download size={12} /> WOFF2
                </a>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 10.5,
                  }}
                >
                  {file.sha256.slice(0, 10)}
                </span>
              </span>
            </div>
          ))}
          {font.license.licenseFile ? (
            <div className="bc-download-row">
              <span>Licence · {font.license.type}</span>
              <a href={font.license.licenseFile} download>
                <Download size={12} /> LICENSE.txt
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
