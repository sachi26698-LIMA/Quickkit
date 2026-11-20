"use client";

import { useState } from "react";
import {
  analyseStructure,
  cannibalisation,
  descriptionLength,
  descriptionPixels,
  keywordStat,
  pixelWidth,
  readability,
  repeatedPhrases,
  similarity,
  titleLength,
  titlePixels,
  toPlainText,
} from "@/lib/tools/seo/analyze";
import {
  BreakdownTable,
  Disclosure,
  EmptyState,
  Field,
  FieldGrid,
  Notice,
  ResultPanel,
  SelectField,
  Stat,
  StatRow,
  parseNumber,
} from "@/components/tools/launch/ui";

type Mode =
  | "serp-preview"
  | "keyword-analysis"
  | "readability"
  | "structure-audit"
  | "duplicate-check"
  | "cannibalisation";

export default function PageAnalyzer({ mode }: { mode: Mode }) {
  switch (mode) {
    case "keyword-analysis":
      return <KeywordTool />;
    case "readability":
      return <ReadabilityTool />;
    case "structure-audit":
      return <StructureTool />;
    case "duplicate-check":
      return <DuplicateTool />;
    case "cannibalisation":
      return <CannibalisationTool />;
    default:
      return <SerpPreview />;
  }
}

/**
 * Length meter with the truncation marked.
 *
 * The bar shows the value against the recommended maximum; the text states the
 * character count and the estimated pixel width, because Google truncates on the
 * second and the two disagree for strings of narrow letters.
 */
function LengthMeter({
  lengthCheck,
  pixelCheck,
}: {
  lengthCheck: ReturnType<typeof titleLength>;
  pixelCheck: ReturnType<typeof titleLength>;
}) {
  const ratio = Math.min(1, lengthCheck.value / lengthCheck.max);
  return (
    <div style={{ margin: "12px 0" }}>
      <div
        className="qw-meter"
        data-tone={lengthCheck.status === "ok" ? "ok" : "warn"}
      >
        <div className="qw-meter-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#6e6579",
        }}
      >
        <span>
          {lengthCheck.value} characters ({lengthCheck.min}–{lengthCheck.max})
        </span>
        <span>
          ≈{pixelCheck.value}px (limit ≈{pixelCheck.max}px)
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SerpPreview() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [brand, setBrand] = useState("");

  const fullTitle = brand.trim()
    ? `${title}${title.trim() ? " | " : ""}${brand.trim()}`
    : title;
  const titleCheck = titleLength(fullTitle);
  const titlePixel = titlePixels(fullTitle);
  const descCheck = descriptionLength(description);
  const descPixel = descriptionPixels(description);

  const urlParts = (() => {
    const raw = url.trim() || "example.com/page";
    const withoutProtocol = raw.replace(/^https?:\/\//, "");
    const [host, ...rest] = withoutProtocol.split("/");
    const path = rest.join("/");
    return {
      breadcrumb: path
        ? `${host} › ${path.split("/").filter(Boolean).join(" › ")}`
        : host,
      host,
      path,
    };
  })();

  const titleDisplay =
    titlePixel.value > titlePixel.max
      ? truncateToPixels(fullTitle, titlePixel.max)
      : fullTitle || "Your page title appears here";
  const descDisplay =
    descPixel.value > descPixel.max
      ? truncateToPixels(description, descPixel.max)
      : description ||
        "Your meta description appears here. Google shows about 920 pixels, roughly 155–160 characters for average Latin text.";

  const ready = title.trim().length > 0 || description.trim().length > 0;

  const text = [
    "SERP preview",
    `Title: ${fullTitle || "(empty)"}`,
    `Title length: ${titleCheck.value} characters, ≈${titlePixel.value}px — ${titleCheck.status === "ok" ? "within budget" : titleCheck.status === "long" ? "may be truncated" : "shorter than typical"}`,
    "",
    `Description: ${description || "(empty)"}`,
    `Description length: ${descCheck.value} characters, ≈${descPixel.value}px — ${descCheck.status === "ok" ? "within budget" : descCheck.status === "long" ? "may be truncated" : "shorter than typical"}`,
    "",
    `URL: ${url.trim() || "(not set)"}`,
    "",
    "Widths are estimated from average glyph widths, not measured in a browser font. Google truncates on rendered width.",
  ].join("\n");

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">What the snippet will show</h2>
        <p className="qw-section-note">
          Google truncates on rendered pixel width, not character count, so a
          string of narrow letters fits where wide ones do not. Both are shown.
          The estimate uses average glyph widths and is labelled as an estimate
          throughout.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Page title"
            value={title}
            onChange={setTitle}
            placeholder="Merge PDF Online — Combine Pages"
          />
          <Field
            label="Brand suffix"
            value={brand}
            onChange={setBrand}
            placeholder="QUICKKIT"
            hint="Appended with a pipe. Leave blank if the title already carries the brand."
          />
          <Field
            label="URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com/tools/merge-pdf"
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="Meta description"
            value={description}
            onChange={setDescription}
            multiline
            rows={4}
            placeholder="Combine up to 25 PDFs in your browser: reorder files, pick page ranges and download a validated PDF."
          />
        </div>
      </div>

      {!ready ? (
        <EmptyState>
          Enter a title or description to preview the snippet and measure
          truncation.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Search result preview"
          show
          text={text}
          filename="serp-preview"
          onReset={() => {
            setTitle("");
            setDescription("");
            setUrl("");
          }}
        >
          <div className="qw-serp" aria-label="Search result preview">
            <div className="qw-serp-url">
              {urlParts.breadcrumb} <span>· quickkit.app</span>
            </div>
            <div className="qw-serp-title">{titleDisplay}</div>
            <div className="qw-serp-desc">{descDisplay}</div>
          </div>

          <div className="qw-split">
            <div>
              <p className="qw-label">Title</p>
              <LengthMeter lengthCheck={titleCheck} pixelCheck={titlePixel} />
              <p className="qw-hint">
                {titleCheck.status === "long"
                  ? "Likely truncated. Move the differentiator earlier — Google keeps the start."
                  : titleCheck.status === "short"
                    ? "Short for a title. There is room for one more specific detail."
                    : "Within the conventional 30–60 character window."}
                {title.includes("QUICKKIT")
                  ? " The brand appears in the title text as well as the suffix; the audit flags that as duplication."
                  : ""}
              </p>
              {titlePixel.status === "long" && titleCheck.status !== "long" ? (
                <p className="qw-hint">
                  Characters fit but pixel width does not, because this title
                  uses wide letters. Shorten it — width is what Google measures.
                </p>
              ) : null}
            </div>
            <div>
              <p className="qw-label">Description</p>
              <LengthMeter lengthCheck={descCheck} pixelCheck={descPixel} />
              <p className="qw-hint">
                {descCheck.status === "long"
                  ? "Likely truncated. The end of the sentence will not be shown."
                  : descCheck.status === "short"
                    ? "Short. Google often expands a short description with page text, which you do not control."
                    : "Within the usual 120–160 character window."}
              </p>
            </div>
          </div>

          <Disclosure summary="Why character counts and pixel widths disagree">
            <p>
              Google renders the title in a variable-width font and cuts it at
              the pixel boundary, so the cut-off character count depends on
              which letters are used. A title of 60 &ldquo;i&rdquo; and
              &ldquo;l&rdquo; characters fits comfortably; 55 &ldquo;m&rdquo;
              and &ldquo;w&rdquo; characters does not.
            </p>
            <p>
              The estimate here assigns narrow, wide and average widths per
              glyph and sums them. It is close enough to be useful and it is not
              a measurement in Google&rsquo;s actual font, so treat the boundary
              as soft: aim for a margin rather than shaving the last pixel.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

/** Cut a string at an estimated pixel budget, on a word boundary. */
function truncateToPixels(text: string, budget: number): string {
  if (pixelWidth(text) <= budget) return text;
  const words = text.split(/\s+/);
  let out = "";
  for (const word of words) {
    const candidate = out ? `${out} ${word}` : word;
    if (pixelWidth(candidate) > budget - 12) break;
    out = candidate;
  }
  return `${out || words[0]}…`;
}

// ─────────────────────────────────────────────────────────────────────────────

function KeywordTool() {
  const [keyword, setKeyword] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [headings, setHeadings] = useState("");
  const [url, setUrl] = useState("");

  const stat = keywordStat({
    keyword,
    body,
    title,
    description,
    headings,
    url,
  });
  const phrases2 = repeatedPhrases(body, { size: 2, limit: 10 });
  const phrases3 = repeatedPhrases(body, { size: 3, limit: 8 });

  const ready = keyword.trim().length > 0 && body.trim().length > 0;

  const placements = [
    { label: "In title", ok: stat.inTitle },
    { label: "In description", ok: stat.inDescription },
    { label: "In first 100 words", ok: stat.inFirstParagraph },
    { label: "In a heading", ok: stat.inHeadings },
    { label: "In URL", ok: stat.inUrl },
  ];

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Keyword and page text</h2>
        <p className="qw-section-note">
          The analyser counts what is in the text you paste. It does not fetch
          your page, query Google, or know your rankings — those need a
          server-side crawl or a paid API, and this tool says so rather than
          pretending.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Target keyword or phrase"
            value={keyword}
            onChange={setKeyword}
            placeholder="merge pdf"
          />
          <Field
            label="Page URL (optional)"
            value={url}
            onChange={setUrl}
            placeholder="/tools/merge-pdf"
          />
          <Field label="Title (optional)" value={title} onChange={setTitle} />
          <Field
            label="Meta description (optional)"
            value={description}
            onChange={setDescription}
          />
        </FieldGrid>
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <Field
            label="Headings (optional, one per line)"
            value={headings}
            onChange={setHeadings}
            multiline
            rows={3}
          />
          <Field
            label="Page body text"
            value={body}
            onChange={setBody}
            multiline
            rows={9}
            placeholder="Paste the visible text of the page."
          />
        </div>
      </div>

      {!ready ? (
        <EmptyState>
          Enter a keyword and paste the page text to analyse.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Keyword analysis"
          show
          text={[
            `Keyword: ${stat.term}`,
            `Occurrences: ${stat.count}`,
            `Density: ${stat.density.toFixed(2)}%`,
            `Placements: ${
              placements
                .filter((p) => p.ok)
                .map((p) => p.label)
                .join(", ") || "none"
            }`,
            "",
            "Repeated 2-word phrases:",
            ...phrases2.map((p) => `${p.phrase} — ${p.count}`),
            "",
            "Repeated 3-word phrases:",
            ...phrases3.map((p) => `${p.phrase} — ${p.count}`),
          ].join("\n")}
          filename="keyword-analysis"
        >
          <StatRow>
            <Stat
              label="Occurrences"
              value={String(stat.count)}
              detail="Exact phrase matches"
              emphasis
            />
            <Stat
              label="Density"
              value={`${stat.density.toFixed(2)}%`}
              detail="Count ÷ total words"
            />
            <Stat
              label="Placements"
              value={`${placements.filter((p) => p.ok).length}/5`}
              detail="Key positions"
            />
          </StatRow>

          <div className="qw-chip-row">
            {placements.map((placement) => (
              <span
                key={placement.label}
                className="qw-chip"
                data-tone={placement.ok ? "ok" : "warn"}
              >
                {placement.ok ? "✓" : "✕"} {placement.label}
              </span>
            ))}
          </div>

          <Notice tone="info">
            There is no universally correct keyword density. The number is shown
            so you can compare your own pages and spot accidental repetition; a
            specific percentage is not a target and cannot be justified from
            published guidance.
          </Notice>

          {phrases2.length > 0 ? (
            <BreakdownTable
              caption="Most repeated two-word phrases"
              head={["Phrase", "Count"]}
              rows={phrases2.map((phrase) => ({
                label: phrase.phrase,
                value: String(phrase.count),
              }))}
            />
          ) : (
            <Notice tone="success">
              No two-word phrase repeats. That is a good sign against accidental
              stuffing.
            </Notice>
          )}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ReadabilityTool() {
  const [text, setText] = useState("");
  const result = readability(text);
  const ready = text.trim().split(/\s+/).filter(Boolean).length >= 10;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Text to score</h2>
        <p className="qw-section-note">
          Flesch Reading Ease and the Flesch–Kincaid grade, both computed from
          syllables and sentence length. Both are calibrated for English; the
          score flags text in other scripts rather than pretending the numbers
          mean something.
        </p>
        <Field
          label="Text"
          value={text}
          onChange={setText}
          multiline
          rows={10}
          placeholder="Paste the copy you want to check."
        />
      </div>

      {!ready ? (
        <EmptyState>Paste at least ten words to score readability.</EmptyState>
      ) : (
        <ResultPanel
          title="Readability"
          show
          text={[
            `Words: ${result.words}`,
            `Sentences: ${result.sentences}`,
            `Average sentence length: ${result.averageSentenceLength} words`,
            `Average syllables per word: ${result.averageSyllablesPerWord}`,
            `Flesch Reading Ease: ${result.fleschReadingEase} (${result.label})`,
            `Flesch–Kincaid grade: ${result.fleschKincaidGrade}`,
          ].join("\n")}
          filename="readability"
        >
          <StatRow>
            <Stat
              label="Reading ease"
              value={String(result.fleschReadingEase)}
              detail={result.label}
              emphasis
            />
            <Stat
              label="Grade level"
              value={String(result.fleschKincaidGrade)}
              detail="US school grade"
            />
            <Stat
              label="Avg sentence"
              value={`${result.averageSentenceLength} words`}
              detail={`${result.sentences} sentences`}
            />
            <Stat
              label="Words"
              value={String(result.words)}
              detail={`${result.syllables} syllables`}
            />
          </StatRow>

          {result.notes.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <Disclosure summary="What the formula actually measures">
            <p>
              <strong>Flesch Reading Ease</strong> = 206.835 − 1.015 × (words ÷
              sentences) − 84.6 × (syllables ÷ words). Higher is easier; 60–70
              is plain English, 30–50 is difficult.
            </p>
            <p>
              <strong>Flesch–Kincaid grade</strong> = 0.39 × (words ÷ sentences)
              + 11.8 × (syllables ÷ words) − 15.59. It estimates the US school
              year needed to read the text.
            </p>
            <p>
              Both penalise long sentences and long words. Neither understands
              meaning, so a short sentence of jargon scores well and a clear
              sentence with a technical term scores badly. Use the score to find
              paragraphs worth rewriting, then decide for yourself.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StructureTool() {
  const [html, setHtml] = useState("");
  const result = html.trim() ? analyseStructure(html) : null;

  const errors =
    result?.issues.filter((issue) => issue.severity === "error") ?? [];
  const warnings =
    result?.issues.filter((issue) => issue.severity === "warning") ?? [];
  const infos =
    result?.issues.filter((issue) => issue.severity === "info") ?? [];

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Paste the page HTML</h2>
        <p className="qw-section-note">
          Paste the source of a page you control. Nothing is fetched — a browser
          cannot read another site&rsquo;s HTML without CORS permission, so the
          honest version of this tool works on what you paste.
        </p>
        <Field
          label="HTML"
          value={html}
          onChange={setHtml}
          multiline
          rows={12}
          placeholder="<!doctype html>…"
        />
      </div>

      {!result ? (
        <EmptyState>
          Paste HTML to audit its headings, links and images.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Structure audit"
          show
          text={[
            `Words: ${result.wordCount}`,
            `H1 count: ${result.h1Count}`,
            `Headings: ${result.headings.length}`,
            `Links: ${result.links.length}`,
            `Images: ${result.images.length} (${result.imagesMissingAlt} missing alt)`,
            "",
            ...result.issues.map(
              (issue) => `[${issue.severity}] ${issue.message}`,
            ),
          ].join("\n")}
          filename="structure-audit"
          csvRows={[
            ["Type", "Detail", "Text"],
            ...result.headings.map((heading) => [
              `H${heading.level}`,
              "heading",
              heading.text,
            ]),
            ...result.links.map((link) => [
              "link",
              link.external ? "external" : "internal",
              link.text || link.href,
            ]),
            ...result.images.map((image) => [
              "image",
              image.alt ? "has alt" : "missing alt",
              image.src,
            ]),
          ]}
        >
          <StatRow>
            <Stat
              label="H1 count"
              value={String(result.h1Count)}
              detail={result.h1Count === 1 ? "Correct" : "Should be exactly 1"}
              emphasis
            />
            <Stat
              label="Headings"
              value={String(result.headings.length)}
              detail="H1–H6"
            />
            <Stat
              label="Words"
              value={String(result.wordCount)}
              detail="Visible text"
            />
            <Stat
              label="Images missing alt"
              value={String(result.imagesMissingAlt)}
              detail={`of ${result.images.length}`}
            />
          </StatRow>

          {errors.length > 0 ? (
            <Notice tone="error">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {errors.map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {warnings.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {warnings.map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {infos.length > 0 ? (
            <Notice tone="info">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {infos.map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          {result.headings.length > 0 ? (
            <BreakdownTable
              caption="Heading outline"
              head={["Level", "Text"]}
              rows={result.headings.slice(0, 40).map((heading) => ({
                label: `H${heading.level}`,
                value: heading.text || "(empty)",
              }))}
            />
          ) : null}

          {result.headingSkips.length > 0 ? (
            <Disclosure
              summary={`${result.headingSkips.length} skipped heading levels`}
            >
              <ul>
                {result.headingSkips.map((skip) => (
                  <li key={skip}>{skip}</li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function DuplicateTool() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const result =
    a.trim() && b.trim() ? similarity(toPlainText(a), toPlainText(b)) : null;

  const tone = result
    ? result.verdict === "near-duplicate"
      ? "bad"
      : result.verdict === "overlapping"
        ? "warn"
        : "ok"
    : "ok";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Two versions of a page</h2>
        <p className="qw-section-note">
          Compares 3-word overlap between two texts. This is the pattern that
          catches doorway pages — the same content with the city name swapped —
          before you publish it, and it compares only what you paste.
        </p>
        <FieldGrid columns={1}>
          <Field
            label="Version A"
            value={a}
            onChange={setA}
            multiline
            rows={8}
          />
          <Field
            label="Version B"
            value={b}
            onChange={setB}
            multiline
            rows={8}
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>Paste both versions to compare them.</EmptyState>
      ) : (
        <ResultPanel
          title="Similarity"
          show
          text={[
            `Verdict: ${result.verdict}`,
            `Jaccard similarity of 3-word shingles: ${(result.score * 100).toFixed(1)}%`,
            "",
            "Shared phrases:",
            ...result.sharedPhrases.map((phrase) => `  ${phrase}`),
          ].join("\n")}
          filename="duplicate-comparison"
        >
          <StatRow>
            <Stat
              label="Similarity"
              value={`${(result.score * 100).toFixed(1)}%`}
              detail={
                result.verdict === "near-duplicate"
                  ? "Near-duplicate: consolidate or differentiate"
                  : result.verdict === "overlapping"
                    ? "Overlapping: review before publishing both"
                    : "Distinct enough to coexist"
              }
              emphasis
            />
          </StatRow>

          <div className="qw-meter" data-tone={tone}>
            <div
              className="qw-meter-fill"
              style={{ width: `${Math.min(100, result.score * 100)}%` }}
            />
          </div>

          {result.verdict === "near-duplicate" ? (
            <Notice tone="error">
              These texts share most of their three-word sequences. Publishing
              both as separate pages is the doorway-page pattern search
              guidelines treat as spam. Merge them, or make the second genuinely
              different.
            </Notice>
          ) : result.verdict === "overlapping" ? (
            <Notice tone="warning">
              Substantial overlap. Check whether the two pages target the same
              query — if they do, one will usually rank and the other will be
              ignored.
            </Notice>
          ) : (
            <Notice tone="success">
              The texts are distinct enough to stand as separate pages.
            </Notice>
          )}

          {result.sharedPhrases.length > 0 ? (
            <Disclosure
              summary={`${result.sharedPhrases.length} shared three-word sequences`}
            >
              <ul>
                {result.sharedPhrases.map((phrase) => (
                  <li key={phrase}>{phrase}</li>
                ))}
              </ul>
            </Disclosure>
          ) : null}

          <Disclosure summary="What the threshold means">
            <p>
              The score is the Jaccard index: shared three-word sequences
              divided by all three-word sequences in either text. Below 35% the
              pages are distinct; above 70% they are near-duplicates. Between
              the two it is a judgement call that depends on intent, which the
              tool cannot see.
            </p>
            <p>
              This is not the same as Google&rsquo;s duplicate detection, which
              also compares boilerplate, structure and navigational context and
              is not published.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CannibalisationTool() {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<
    { url: string; keyword: string; title: string }[]
  >([]);
  const [parseError, setParseError] = useState("");

  const parse = () => {
    setParseError("");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const pages: { url: string; keyword: string; title: string }[] = [];
    for (const line of lines) {
      // Accept "url | keyword | title", "url,keyword" or "url<TAB>keyword".
      const parts = line.split(/\s*[|\t]\s*|\s*,\s*/).filter(Boolean);
      if (parts.length < 2) {
        setParseError(
          `Could not read "${line}". Use: /page-url | target keyword | page title`,
        );
        return;
      }
      pages.push({
        url: parts[0],
        keyword: parts[1],
        title: parts[2] ?? parts[1],
      });
    }
    if (pages.length < 2) {
      setParseError("Add at least two pages to compare.");
      return;
    }
    setParsed(pages);
  };

  const findings = parsed.length >= 2 ? cannibalisation(parsed) : [];

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">
          Your pages and their target keywords
        </h2>
        <p className="qw-section-note">
          One page per line: URL, target keyword, and optionally the title.
          Paste your own list — this tool compares what you give it and never
          crawls your site.
        </p>
        <Field
          label="Pages"
          value={raw}
          onChange={setRaw}
          multiline
          rows={9}
          placeholder={
            "/blog/pdf-compress | compress pdf | How to Compress a PDF\n/tools/compress-pdf | compress pdf | Compress PDF Online"
          }
        />
        <div
          className="qw-actions"
          style={{ borderTop: "none", paddingTop: 12 }}
        >
          <button type="button" onClick={parse} className="secondary">
            {parsed.length > 0 ? "Re-run check" : "Check for overlap"}
          </button>
          {parsed.length > 0 ? (
            <span className="qw-hint" style={{ margin: 0 }}>
              {parsed.length} pages loaded · {findings.length} conflicts
            </span>
          ) : null}
        </div>
        {parseError ? <Notice tone="error">{parseError}</Notice> : null}
      </div>

      {parsed.length < 2 ? (
        <EmptyState>
          Paste at least two pages and press the check button.
        </EmptyState>
      ) : findings.length === 0 ? (
        <ResultPanel
          title="No cannibalisation found"
          show
          text="No two pages share a target keyword."
          filename="cannibalisation"
        >
          <Notice tone="success">
            Every page targets a distinct keyword. That is the normal state —
            and it means you can stop worrying about this particular problem.
          </Notice>
        </ResultPanel>
      ) : (
        <ResultPanel
          title="Keyword conflicts"
          show
          text={findings
            .map(
              (finding) =>
                `[${finding.severity}] ${finding.keyword}: ${finding.pages.join(", ")}\n  ${finding.reason}`,
            )
            .join("\n\n")}
          filename="cannibalisation"
          csvRows={[
            ["Severity", "Keyword", "Pages", "Reason"],
            ...findings.map((finding) => [
              finding.severity,
              finding.keyword,
              finding.pages.join(" "),
              finding.reason,
            ]),
          ]}
        >
          <StatRow>
            <Stat label="Conflicts" value={String(findings.length)} emphasis />
            <Stat
              label="High severity"
              value={String(
                findings.filter((f) => f.severity === "high").length,
              )}
              detail="Near-duplicate titles"
            />
            <Stat label="Pages checked" value={String(parsed.length)} />
          </StatRow>

          {findings.map((finding) => (
            <div
              key={finding.keyword}
              className="qw-workspace-panel"
              style={{ background: "#fbfafd", marginTop: 12 }}
            >
              <span
                className="qw-chip"
                data-tone={finding.severity === "high" ? "bad" : "warn"}
              >
                {finding.severity === "high" ? "High" : "Medium"}
              </span>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  margin: "9px 0 4px",
                  color: "#352a45",
                }}
              >
                “{finding.keyword}”
              </p>
              <p className="qw-hint" style={{ margin: "0 0 7px" }}>
                {finding.reason}
              </p>
              <ul className="qw-prose" style={{ margin: 0, paddingLeft: 18 }}>
                {finding.pages.map((page) => (
                  <li key={page}>
                    <code>{page}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </ResultPanel>
      )}
    </>
  );
}

export { parseNumber, BreakdownTable, SelectField };
