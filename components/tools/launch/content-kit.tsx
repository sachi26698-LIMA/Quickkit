"use client";

import { useState } from "react";
import {
  altText,
  buildContentBrief,
  buildTopicClusters,
  descriptionSuggestions,
  headlineSuggestions,
  suggestInternalLinks,
  titleSuggestions,
} from "@/lib/tools/seo/text-kit";
import {
  pixelWidth,
  titleLength as _titleLength,
  descriptionLength as _descriptionLength,
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
} from "@/components/tools/launch/ui";

type Mode =
  | "title-generator"
  | "meta-description-generator"
  | "content-brief"
  | "headline-generator"
  | "alt-text-generator"
  | "internal-link-suggestions"
  | "topic-clusters";

export default function ContentKit({ mode }: { mode: Mode }) {
  switch (mode) {
    case "meta-description-generator":
      return <DescriptionTool />;
    case "content-brief":
      return <BriefTool />;
    case "headline-generator":
      return <HeadlineTool />;
    case "alt-text-generator":
      return <AltTextTool />;
    case "internal-link-suggestions":
      return <InternalLinkTool />;
    case "topic-clusters":
      return <ClusterTool />;
    default:
      return <TitleTool />;
  }
}

function SuggestionList({
  items,
}: {
  items: { text: string; length: number; note: string }[];
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => {
        const fits = item.length <= 60;
        return (
          <div
            key={item.text}
            style={{
              padding: "12px 14px",
              border: "1px solid #ece7f5",
              borderRadius: 11,
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  fontWeight: 550,
                  color: "#352a45",
                }}
              >
                {item.text}
              </p>
              <span className="qw-chip" data-tone={fits ? "ok" : "warn"}>
                {item.length}
              </span>
            </div>
            <p className="qw-hint" style={{ margin: "5px 0 0" }}>
              {item.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TitleTool() {
  const [keyword, setKeyword] = useState("");
  const [brand, setBrand] = useState("");
  const [differentiator, setDifferentiator] = useState("none");
  const [modifier, setModifier] = useState("none");
  const [year, setYear] = useState("");

  const suggestions = titleSuggestions({
    keyword,
    brand,
    differentiator: differentiator as "free",
    modifier: modifier as "how-to",
    year: year.trim() ? Number(year) : undefined,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">The page&rsquo;s subject</h2>
        <p className="qw-section-note">
          Drafts, not final copy. Each variant is built from your keyword plus
          one concrete differentiator — the generator contributes structure and
          length, not a claim.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Primary keyword"
            value={keyword}
            onChange={setKeyword}
            placeholder="merge pdf"
          />
          <Field
            label="Brand"
            value={brand}
            onChange={setBrand}
            placeholder="QUICKKIT"
          />
          <SelectField
            label="Differentiator"
            value={differentiator}
            onChange={setDifferentiator}
            options={[
              { value: "none", label: "None" },
              { value: "free", label: "Free" },
              { value: "fast", label: "Fast" },
              { value: "local", label: "In your browser" },
              { value: "detailed", label: "Step by step" },
              { value: "no-signup", label: "No sign-up" },
            ]}
          />
          <SelectField
            label="Modifier"
            value={modifier}
            onChange={setModifier}
            options={[
              { value: "none", label: "None" },
              { value: "how-to", label: "How to" },
              { value: "best", label: "Best" },
              { value: "guide", label: "Practical guide" },
            ]}
          />
          <Field
            label="Year (optional)"
            value={year}
            onChange={setYear}
            placeholder="2026"
            inputMode="numeric"
            hint="Only if the content is genuinely updated this year."
          />
        </FieldGrid>
      </div>

      {!keyword.trim() ? (
        <EmptyState>Enter a primary keyword to draft titles.</EmptyState>
      ) : (
        <ResultPanel
          title="Title drafts"
          show
          text={suggestions
            .map((item) => `${item.text}  (${item.length} chars)`)
            .join("\n")}
          filename="title-drafts"
        >
          <StatRow>
            <Stat label="Drafts" value={String(suggestions.length)} emphasis />
            <Stat
              label="Within 60 chars"
              value={String(
                suggestions.filter((item) => item.length <= 60).length,
              )}
              detail="May avoid truncation"
            />
          </StatRow>
          <SuggestionList items={suggestions} />
          <Notice tone="info">
            Character count is a proxy for pixel width. Use the SERP preview
            tool to check the actual estimated truncation for the one you
            choose.
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function DescriptionTool() {
  const [keyword, setKeyword] = useState("");
  const [benefit, setBenefit] = useState("");
  const [mechanism, setMechanism] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [cta, setCta] = useState("try");

  const suggestions = descriptionSuggestions({
    keyword,
    benefit,
    mechanism,
    differentiator,
    callToAction: cta as "try",
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">What the reader gets</h2>
        <p className="qw-section-note">
          The benefit sentence is yours to write, because only you know what the
          page actually delivers. The generator orders it, keeps it inside the
          display window and adds a call to action.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Keyword"
            value={keyword}
            onChange={setKeyword}
            placeholder="merge pdf"
          />
          <SelectField
            label="Call to action"
            value={cta}
            onChange={setCta}
            options={[
              { value: "try", label: "Try it free" },
              { value: "calculate", label: "Calculate it now" },
              { value: "download", label: "Download the result" },
              { value: "compare", label: "Compare the options" },
              { value: "learn", label: "Here is how it works" },
            ]}
          />
        </FieldGrid>
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <Field
            label="What the reader gets"
            value={benefit}
            onChange={setBenefit}
            placeholder="Combine several PDFs in the order you choose"
          />
          <Field
            label="How it works"
            value={mechanism}
            onChange={setMechanism}
            placeholder="Reorder files, pick page ranges, download a validated PDF"
          />
          <Field
            label="Differentiator"
            value={differentiator}
            onChange={setDifferentiator}
            placeholder="Nothing is uploaded"
          />
        </div>
      </div>

      {!benefit.trim() ? (
        <EmptyState>
          Enter the benefit sentence — the generator will not invent it.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Description drafts"
          show
          text={suggestions
            .map((item) => `${item.text}\n(${item.length} chars)`)
            .join("\n\n")}
          filename="meta-description-drafts"
        >
          <StatRow>
            <Stat label="Drafts" value={String(suggestions.length)} emphasis />
            <Stat
              label="In window"
              value={String(
                suggestions.filter(
                  (item) => item.length >= 120 && item.length <= 160,
                ).length,
              )}
              detail="120–160 characters"
            />
          </StatRow>
          <SuggestionList items={suggestions} />
          <Disclosure summary="Why a short description can be worse than a long one">
            <p>
              Google may replace a short meta description with text it extracts
              from the page, which you do not control. A description long enough
              to state the benefit and the mechanism usually survives intact.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BriefTool() {
  const [topic, setTopic] = useState("");
  const [intent, setIntent] = useState("informational");
  const [audience, setAudience] = useState("");
  const [knownPoints, setKnownPoints] = useState("");
  const [targetWords, setTargetWords] = useState("1200");

  const result = buildContentBrief({
    topic,
    intent: intent as "informational",
    audience,
    knownPoints: knownPoints
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    targetWords: Number(targetWords) || undefined,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Brief inputs</h2>
        <p className="qw-section-note">
          The questions in the brief are what a reader at this stage of the
          decision will have — a taxonomy of intent applied to your topic, not
          real &ldquo;People Also Ask&rdquo; data, which needs a live SERP
          source.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Topic"
            value={topic}
            onChange={setTopic}
            placeholder="Compressing a PDF without losing text quality"
          />
          <SelectField
            label="Search intent"
            value={intent}
            onChange={setIntent}
            options={[
              { value: "informational", label: "Informational — learning" },
              { value: "commercial", label: "Commercial — choosing" },
              { value: "transactional", label: "Transactional — doing" },
              { value: "navigational", label: "Navigational — finding" },
            ]}
          />
          <Field
            label="Audience"
            value={audience}
            onChange={setAudience}
            placeholder="Someone emailing a large PDF to a client"
          />
          <Field
            label="Target words"
            value={targetWords}
            onChange={setTargetWords}
            inputMode="numeric"
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="Facts you already have (one per line)"
            value={knownPoints}
            onChange={setKnownPoints}
            multiline
            rows={4}
            placeholder={
              "The 100 MB upload limit on the client portal\nThat text stays selectable above 150 DPI"
            }
          />
        </div>
      </div>

      {!topic.trim() ? (
        <EmptyState>Enter a topic to generate the brief.</EmptyState>
      ) : (
        <ResultPanel
          title="Content brief"
          show
          text={result.markdown}
          filename="content-brief"
        >
          <StatRow>
            <Stat
              label="Outline sections"
              value={String(result.sections)}
              emphasis
            />
            <Stat
              label="Issues"
              value={String(result.issues.length)}
              detail="Shown below"
            />
          </StatRow>
          {result.issues.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          <div className="qw-mono" aria-label="Content brief">
            {result.markdown}
          </div>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HeadlineTool() {
  const [subject, setSubject] = useState("");
  const [angle, setAngle] = useState("how-to");

  const suggestions = headlineSuggestions({
    subject,
    angle: angle as "how-to",
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Subject and angle</h2>
        <FieldGrid columns={2}>
          <Field
            label="Subject"
            value={subject}
            onChange={setSubject}
            placeholder="compressing a PDF"
          />
          <SelectField
            label="Angle"
            value={angle}
            onChange={setAngle}
            options={[
              { value: "how-to", label: "How to" },
              { value: "comparison", label: "Comparison" },
              { value: "explainer", label: "Explainer" },
              { value: "data", label: "Data" },
              { value: "mistake", label: "Mistakes" },
            ]}
          />
        </FieldGrid>
      </div>

      {!subject.trim() ? (
        <EmptyState>Enter a subject to draft headlines.</EmptyState>
      ) : (
        <ResultPanel
          title="Headline drafts"
          show
          text={suggestions.map((item) => item.text).join("\n")}
          filename="headline-drafts"
        >
          <SuggestionList items={suggestions} />
          <Notice tone="info">
            Each headline promises only what the page can support. A headline
            that makes a claim the copy does not prove is the fastest way to
            lose a reader&rsquo;s trust.
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AltTextTool() {
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("informational");
  const [detail, setDetail] = useState("");

  const result = altText({
    subject,
    context: context as "informational",
    detail,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Image context</h2>
        <p className="qw-section-note">
          What the image is for determines what the alt text should say. A
          decorative image needs an empty alt, not a description — and the tool
          will tell you that rather than inventing words.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="What the image shows"
            value={subject}
            onChange={setSubject}
            placeholder="A three-step merge workflow ordered by filename"
          />
          <SelectField
            label="Role of the image"
            value={context}
            onChange={setContext}
            options={[
              {
                value: "informational",
                label: "Informational — conveys content",
              },
              { value: "functional", label: "Functional — a link or button" },
              { value: "chart", label: "Chart or graph" },
              { value: "decorative", label: "Decorative — no meaning" },
            ]}
          />
          <Field
            label="Key detail"
            value={detail}
            onChange={setDetail}
            placeholder="with each step labelled"
          />
        </FieldGrid>
      </div>

      <ResultPanel
        title="Alt text"
        show
        text={
          result.value
            ? `alt="${result.value}"\n\n${result.note}`
            : `alt=""\n\n${result.note}`
        }
        filename="alt-text"
      >
        <StatRow>
          <Stat
            label="Alt value"
            value={result.value || "(empty — decorative)"}
            detail={
              result.value
                ? `${result.value.length} characters`
                : "Correct for a decorative image"
            }
            emphasis
          />
        </StatRow>
        <div className="qw-mono">
          {result.value ? `alt="${result.value}"` : 'alt=""'}
        </div>
        <Notice tone="info">{result.note}</Notice>
        <Disclosure summary="The four kinds of image alt text">
          <p>
            <strong>Informational</strong> — describe the content the sighted
            user learns from the image.
          </p>
          <p>
            <strong>Functional</strong> — describe the destination or the
            action, not the picture. A magnifier icon that opens search is
            &ldquo;Search&rdquo;, not &ldquo;magnifying glass&rdquo;.
          </p>
          <p>
            <strong>Chart</strong> — state the finding, not the chart title. A
            screen-reader user needs the trend and the range.
          </p>
          <p>
            <strong>Decorative</strong> — an empty alt attribute. Words here
            make the reader listen to noise.
          </p>
        </Disclosure>
      </ResultPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function InternalLinkTool() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof suggestInternalLinks
  > | null>(null);
  const [error, setError] = useState("");

  const run = () => {
    setError("");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const pages: {
      url: string;
      keyword: string;
      text?: string;
      links?: string[];
    }[] = [];
    for (const line of lines) {
      const parts = line.split(/\s*\|\s*/).filter(Boolean);
      if (parts.length < 2) {
        setError(
          `Could not read "${line}". Use: url | keyword | [excerpt] | [existing links, comma separated]`,
        );
        return;
      }
      pages.push({
        url: parts[0],
        keyword: parts[1],
        text: parts[2] ?? "",
        links: parts[3] ? parts[3].split(",").map((link) => link.trim()) : [],
      });
    }
    if (pages.length < 2) {
      setError("Add at least two pages.");
      return;
    }
    setResult(suggestInternalLinks(pages));
  };

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Your pages</h2>
        <p className="qw-section-note">
          One page per line:{" "}
          <code>url | keyword | excerpt | existing links</code>. A link is
          suggested when another page&rsquo;s keyword appears in the excerpt but
          is not already linked — a rule you can verify.
        </p>
        <Field
          label="Pages"
          value={raw}
          onChange={setRaw}
          multiline
          rows={8}
          placeholder={
            "/tools/merge-pdf | merge pdf | Combine PDFs in your browser with page ranges and bookmarks\n/tools/split-pdf | split pdf | Divide one PDF into separate files | /tools/merge-pdf"
          }
        />
        <div
          className="qw-actions"
          style={{ borderTop: "none", paddingTop: 12 }}
        >
          <button type="button" className="secondary" onClick={run}>
            Suggest links
          </button>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      {!result ? (
        <EmptyState>Paste your page list and run the suggestion.</EmptyState>
      ) : result.length === 0 ? (
        <ResultPanel
          title="No link gaps found"
          show
          text="Every keyword that appears in an excerpt is already linked."
          filename="internal-links"
        >
          <Notice tone="success">
            Every page already links to the pages whose keywords it mentions.
            Nothing to add.
          </Notice>
        </ResultPanel>
      ) : (
        <ResultPanel
          title="Suggested internal links"
          show
          text={result
            .map(
              (item) =>
                `${item.from} → ${item.to}\n  anchor: "${item.anchor}"\n  ${item.reason}`,
            )
            .join("\n\n")}
          filename="internal-links"
          csvRows={[
            ["From", "To", "Suggested anchor", "Reason"],
            ...result.map((item) => [
              item.from,
              item.to,
              item.anchor,
              item.reason,
            ]),
          ]}
        >
          <StatRow>
            <Stat label="Suggestions" value={String(result.length)} emphasis />
            <Stat
              label="Distinct targets"
              value={String(new Set(result.map((item) => item.to)).size)}
            />
          </StatRow>
          <BreakdownTable
            caption="Suggested links"
            head={["Link", "Anchor"]}
            rows={result.map((item) => ({
              label: `${item.from} → ${item.to}`,
              value: item.anchor,
            }))}
          />
          <Notice tone="info">
            These are mechanical gaps in your own link graph. Nothing here
            estimates how much link equity a page has — that requires a crawl
            with a link-graph model, not a browser.
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ClusterTool() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof buildTopicClusters
  > | null>(null);
  const [error, setError] = useState("");

  const run = () => {
    setError("");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const pages: { url: string; keyword: string; links?: string[] }[] = [];
    for (const line of lines) {
      const parts = line.split(/\s*\|\s*/).filter(Boolean);
      if (parts.length < 2) {
        setError(
          `Could not read "${line}". Use: url | keyword | [links, comma separated]`,
        );
        return;
      }
      pages.push({
        url: parts[0],
        keyword: parts[1],
        links: parts[2] ? parts[2].split(",").map((link) => link.trim()) : [],
      });
    }
    if (pages.length < 2) {
      setError("Add at least two pages.");
      return;
    }
    setResult(buildTopicClusters(pages));
  };

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Pages and keywords</h2>
        <p className="qw-section-note">
          Groups pages that share significant words and lists the pages nothing
          links to. Orphan pages are the finding that matters most here — they
          are crawled rarely and rank poorly for structural reasons.
        </p>
        <Field
          label="Pages"
          value={raw}
          onChange={setRaw}
          multiline
          rows={8}
          placeholder={
            "/tools/merge-pdf | merge pdf | /tools/split-pdf\n/tools/split-pdf | split pdf | /tools/merge-pdf\n/blog/pdf-tips | pdf tips"
          }
        />
        <div
          className="qw-actions"
          style={{ borderTop: "none", paddingTop: 12 }}
        >
          <button type="button" className="secondary" onClick={run}>
            Build clusters
          </button>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      {!result ? (
        <EmptyState>Paste your pages and build the clusters.</EmptyState>
      ) : (
        <ResultPanel
          title="Clusters and orphans"
          show
          text={[
            `Clusters: ${result.clusters.length}`,
            ...result.clusters.map(
              (cluster) =>
                `\nPillar: ${cluster.pillar}\n  shared: ${cluster.shared.join(", ")}\n  members: ${cluster.members.join(", ")}`,
            ),
            "",
            `Orphan pages (nothing links to them): ${result.orphans.length}`,
            ...result.orphans.map((orphan) => `  ${orphan}`),
          ].join("\n")}
          filename="topic-clusters"
        >
          <StatRow>
            <Stat
              label="Clusters"
              value={String(result.clusters.length)}
              emphasis
            />
            <Stat
              label="Orphan pages"
              value={String(result.orphans.length)}
              detail="No inbound internal links"
            />
          </StatRow>

          {result.orphans.length > 0 ? (
            <Notice tone="warning">
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Orphan pages</p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.orphans.map((orphan) => (
                  <li key={orphan}>
                    <code>{orphan}</code>
                  </li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="success">
              Every page has at least one inbound internal link.
            </Notice>
          )}

          {result.clusters.map((cluster) => (
            <div
              key={cluster.pillar}
              className="qw-workspace-panel"
              style={{ background: "#fbfafd", marginTop: 12 }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#352a45",
                }}
              >
                Pillar: <code>{cluster.pillar}</code>
              </p>
              <p className="qw-hint" style={{ margin: "0 0 6px" }}>
                Shares: {cluster.shared.join(", ") || "—"}
              </p>
              <p className="qw-hint" style={{ margin: 0 }}>
                Members: {cluster.members.join(", ")}
              </p>
            </div>
          ))}
        </ResultPanel>
      )}
    </>
  );
}

export { _titleLength, _descriptionLength, pixelWidth };
