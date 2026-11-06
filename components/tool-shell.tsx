import Link from "next/link";
import { ChevronRight, ShieldCheck, ArrowUpRight } from "lucide-react";
import {
  categoryMeta,
  relatedTools,
  toolCategoriesOf,
  tools,
} from "@/lib/catalog";
import { toolTheme, toolThemeStyle } from "@/lib/tool-theme";
import { ToolIcon3D, toolTone } from "./icon-3d";
// Tool-page-only styling (scoped to .tool-page[data-tool]); the generated
// sheet carries the lifted type scale, the hand-written one the glass UI.
import "@/app/tool-pages.generated.css";
import "@/app/tool-pages.css";
import "@/app/devtools.css";
export type ToolContent = { steps: string[]; faqs: { q: string; a: string }[] };
export default function ToolShell({
  slug,
  children,
  content,
  variant = "default",
  headingDescription,
}: {
  slug: string;
  children: React.ReactNode;
  content: ToolContent;
  /** Compact chrome for document-workspace tools. Default preserves existing pages. */
  variant?: "default" | "compact";
  headingDescription?: string;
}) {
  const compact = variant === "compact";
  const tool = tools.find((t) => t.slug === slug)!;
  const toolCategories = toolCategoriesOf(tool);
  const primaryCategory =
    categoryMeta.find((c) => c.name === toolCategories[0]) ?? categoryMeta[0];
  const categories = toolCategories
    .map((name) => categoryMeta.find((c) => c.name === name))
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta));
  const related = relatedTools(tool);
  const theme = toolTheme(tool.slug, tool.category);
  return (
    <div
      className={`container tool-page${compact ? " tool-page-compact" : ""}`}
      data-tool={tool.slug}
      style={toolThemeStyle(theme)}
    >
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/" prefetch={false}>
          Home
        </Link>
        <ChevronRight size={13} />
        <Link href="/tools">Tools</Link>
        <ChevronRight size={13} />
        <Link href={`/category/${primaryCategory.slug}`}>
          {primaryCategory.name}
        </Link>
        <ChevronRight size={13} />
        <span>{tool.name}</span>
      </nav>
      {compact ? (
        <header className="tool-title tool-title-compact">
          <ToolIcon3D tool={tool} size={64} />
          <div className="tool-title-copy">
            <h1>{tool.name}</h1>
            <p>{headingDescription ?? tool.description}</p>
          </div>
          <span className="local-badge">Local processing</span>
        </header>
      ) : (
        <header className="tool-title">
          <ToolIcon3D tool={tool} size={64} />
          <span className="eyebrow">
            {toolCategories.join(" · ")} · Free browser tool
          </span>
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
        </header>
      )}
      {categories.length > 1 ? (
        <nav className="tool-categories" aria-label="Tool categories">
          <span>Filed under</span>
          {categories.map((meta) => (
            <Link
              key={meta.slug}
              className="tool-category-chip"
              href={`/category/${meta.slug}`}
            >
              {meta.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {children}
      {!compact ? (
        <p className="privacy-inline">
          <ShieldCheck size={17} /> Processed on your device. Tool inputs are
          not uploaded or saved by QUICKKIT.
        </p>
      ) : null}
      <div
        className={`tool-guidance${compact ? " tool-guidance-compact" : ""}`}
      >
        <section>
          <span className="eyebrow">A quick walkthrough</span>
          <h2>How to use it</h2>
          <ol>
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section>
          <span className="eyebrow">Good to know</span>
          <h2>A few useful answers</h2>
          {content.faqs.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </div>
      <section className="related">
        <div className="section-heading">
          <h2>Keep the good work going</h2>
          <Link className="text-link" href="/tools">
            All tools <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="related-grid">
          {related.map((t) => (
            <Link
              className={`related-card cat-${toolTone(t)}`}
              key={t.slug}
              href={`/tools/${t.slug}`}
            >
              <ToolIcon3D tool={t} size={48} />
              <span>
                <strong>{t.name}</strong>
                <small>{t.category}</small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
