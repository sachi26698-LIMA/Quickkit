import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  Flame,
  Heart,
  AtSign,
  Layers,
  PenLine,
  Quote,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";
import FontPreviewLine from "@/components/biocraft/font-preview-line";
import {
  catalogue,
  featuredFonts,
  fontFacets,
  sampleText,
} from "@/lib/fonts/catalogue";

export const dynamic = "force-dynamic";

const STUDIO_TOOLS = [
  {
    href: "/biocraft/studio#bio",
    label: "Instagram bio generator",
    description: "Hindi bios with line breaks, emoji and a live font preview.",
    icon: AtSign,
  },
  {
    href: "/biocraft/studio#shayari",
    label: "Shayari & quotes",
    description: "Mood-led Hindi lines, ready to set in the font you choose.",
    icon: Quote,
  },
  {
    href: "/biocraft/studio#caption",
    label: "Captions & hashtags",
    description: "Short Hindi captions for reels, posts and stories.",
    icon: PenLine,
  },
  {
    href: "/biocraft/studio#username",
    label: "Username & stylish text",
    description: "Handle ideas and Unicode variants, previewed in Devanagari.",
    icon: Sparkles,
  },
  {
    href: "/biocraft/studio#library",
    label: "Ready-made bio library",
    description: "Curated bios by vibe, from travel to business.",
    icon: Layers,
  },
  {
    href: "/biocraft/poster",
    label: "Poster studio",
    description: "Export a 1080 × 1350 typography poster as a PNG.",
    icon: Type,
  },
];

export default async function BioCraftHome() {
  const [featured, facets] = await Promise.all([
    featuredFonts(6),
    fontFacets(),
  ]);
  const hero = featured[0] ?? catalogue.fonts[0];
  const conjunctTests = catalogue.fonts.reduce(
    (total, font) => total + font.verification.conjunctTotal,
    0,
  );
  const shapingChecks = catalogue.fonts.reduce(
    (total, font) =>
      total +
      font.verification.conjuncts.filter((test) => test.ok).length +
      font.verification.matrasPassed +
      font.verification.nuktaPassed,
    0,
  );

  return (
    <>
      <section className="bc-hero">
        <div>
          <span className="bc-kicker">
            <ShieldCheck size={13} /> Glyph-verified Devanagari
          </span>
          <h1>
            हिंदी टाइपोग्राफी
            <span>A studio built around real Hindi letters.</span>
          </h1>
          <p className="bc-lede">
            {facets.total} Devanagari families, {catalogue.stats.files} WOFF2
            builds, every one shaped with HarfBuzz before it reached this page.
            Matras, संयुक्ताक्षर, nukta and ०–९ numerals are tested — not
            assumed from a font’s name.
          </p>
          <div className="bc-hero-actions">
            <Link className="bc-button" href="/biocraft/fonts">
              Explore the font library <ArrowRight size={16} />
            </Link>
            <Link className="bc-button secondary" href="/biocraft/studio">
              Open the Hindi preview studio
            </Link>
          </div>
          <div className="bc-stat-row">
            <div className="bc-stat">
              <strong>{facets.total}</strong>
              <span>verified families</span>
            </div>
            <div className="bc-stat">
              <strong>{catalogue.stats.files}</strong>
              <span>WOFF2 files</span>
            </div>
            <div className="bc-stat">
              <strong>{catalogue.stats.discovered}</strong>
              <span>families discovered</span>
            </div>
            <div className="bc-stat">
              <strong>{catalogue.stats.rejected}</strong>
              <span>rejected by tests</span>
            </div>
          </div>
        </div>

        <div className="bc-card bc-sample-card">
          <div className="bc-sample-label">
            <span>Live specimen</span>
            <span className="bc-verified">
              <CheckCircle2 size={11} /> HarfBuzz verified
            </span>
          </div>
          <FontPreviewLine
            font={hero}
            text={sampleText()}
            weight={400}
            className="bc-sample-text"
          />
          <div className="bc-sample-meta">
            <span>
              <strong style={{ color: "var(--bc-ink)" }}>{hero.family}</strong>{" "}
              · {hero.category} · {hero.verification.conjunctSingleGlyph}/
              {hero.verification.conjunctTotal} conjuncts as single glyphs
            </span>
            <Link href={`/biocraft/fonts/${hero.slug}`}>Open specimen →</Link>
          </div>
        </div>
      </section>

      <section className="bc-section" aria-labelledby="verification-heading">
        <div className="bc-section-head">
          <div>
            <h2 id="verification-heading">
              Proof, not a promise in the font name
            </h2>
            <p>
              The import pipeline reads every cmap, shapes the sample paragraph
              and rejects what fails. The one family that did not pass is kept
              in the admin report with its reason, rather than quietly shipped.
            </p>
          </div>
          <Link className="bc-button secondary small" href="/biocraft/licenses">
            Licensing & sources
          </Link>
        </div>
        <div className="bc-feature-row">
          <article className="bc-card bc-feature">
            <span className="bc-icon">
              <FileCheck2 size={18} />
            </span>
            <h3>{shapingChecks.toLocaleString("en-IN")} shaping assertions</h3>
            <p>
              {conjunctTests} conjunct probes across {facets.total} families,
              plus matras, nukta, danda and Devanagari numerals — checked in the
              binary that is actually served.
            </p>
          </article>
          <article className="bc-card bc-feature">
            <span className="bc-icon">
              <BookOpen size={18} />
            </span>
            <h3>Real Hindi, real paragraph</h3>
            <p>
              नमस्ते भारत… ज़िंदगी खूबसूरत है… कर्मण्येवाधिकारस्ते… क्ष, त्र,
              ज्ञ, श्र, क्र, प्र and स्त्र are all part of the gate.
            </p>
          </article>
          <article className="bc-card bc-feature">
            <span className="bc-icon">
              <Flame size={18} />
            </span>
            <h3>Scalable by design</h3>
            <p>
              Cursor pagination, lazy WOFF2 loading and hash-based duplicate
              detection mean the library can grow without loading every font
              into memory or the browser.
            </p>
          </article>
        </div>
      </section>

      <section className="bc-section" aria-labelledby="featured-heading">
        <div className="bc-section-head">
          <div>
            <h2 id="featured-heading">A first look</h2>
            <p>
              Six favourites across serif, sans, handwriting and display. Every
              card below is rendered by the font file itself.
            </p>
          </div>
          <Link className="bc-button secondary small" href="/biocraft/fonts">
            All {facets.total} families <ArrowRight size={14} />
          </Link>
        </div>
        <div className="bc-grid">
          {featured.slice(0, 4).map((font) => (
            <article key={font.slug} className="bc-font-card">
              <div className="bc-card-head">
                <div>
                  <div className="bc-family">
                    <Link href={`/biocraft/fonts/${font.slug}`}>
                      {font.family}
                    </Link>
                  </div>
                  <div className="bc-card-sub">
                    <span className="bc-tag">{font.category}</span>
                    <span className="bc-verified">
                      <CheckCircle2 size={10} /> verified
                    </span>
                    {font.variable ? (
                      <span className="bc-tag accent">variable</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <FontPreviewLine
                font={font}
                text="नमस्ते भारत, ज़िंदगी खूबसूरत है।"
                className="bc-preview"
              />
              <div className="bc-card-foot">
                <div className="meta">
                  <span>
                    {font.weightRange[0]}–{font.weightRange[1]} weight
                  </span>
                  <span>{font.styleTags.slice(0, 2).join(" · ")}</span>
                </div>
                <div className="bc-card-links">
                  <Link href={`/biocraft/fonts/${font.slug}`}>
                    Specimen <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bc-section" aria-labelledby="studio-heading">
        <div className="bc-section-head">
          <div>
            <h2 id="studio-heading">
              Every BioCraft tool, one typeface choice
            </h2>
            <p>
              Choose a Hindi font once and the bios, shayari, quotes, captions,
              usernames, stylish text and posters all render with that exact
              file — not a label above a fallback.
            </p>
          </div>
        </div>
        <div className="bc-feature-row">
          {STUDIO_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="bc-card bc-feature"
              >
                <span className="bc-icon">
                  <Icon size={18} />
                </span>
                <h3>{tool.label}</h3>
                <p>{tool.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bc-section">
        <div className="bc-card bc-feature" style={{ padding: 28 }}>
          <div
            style={{
              display: "flex",
              gap: 18,
              justifyContent: "space-between",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ maxWidth: "62ch" }}>
              <h3 style={{ fontSize: 20 }}>Open fonts, honest attribution</h3>
              <p>
                Every family here is SIL Open Font License 1.1 and distributes
                its original licence next to the WOFF2. Download links are only
                shown where the licence permits redistribution. Find the
                attribution, version and upstream source for all {facets.total}{" "}
                families on the licensing page.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="bc-button" href="/biocraft/fonts">
                <Heart size={15} /> Find your favourite
              </Link>
              <Link className="bc-button secondary" href="/biocraft/licenses">
                Licence index
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
