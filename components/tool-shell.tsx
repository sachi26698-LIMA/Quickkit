import Link from "next/link";
import { ChevronRight, ShieldCheck, ArrowUpRight } from "lucide-react";
import {
  categoryMeta,
  relatedTools,
  toolCategoriesOf,
  tools as staticTools,
} from "@/lib/catalog";
import type { PublicToolShellData } from "@/lib/supabase/public-catalog";
import { toolSurfaceStyle, toolTheme, toolThemeStyle } from "@/lib/tool-theme";
import { breadcrumbStructuredData, toolStructuredData } from "@/lib/seo";
import JsonLd from "./json-ld";
import AdUnit from "./ad-unit";
import RecentToolTracker from "./recent-tool-tracker";
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
  publicData,
  variant = "default",
  headingDescription,
  stepsHeading = "How to use it",
  faqsHeading = "A few useful answers",
  relatedHeading = "Keep the good work going",
  referenceSection,
  privacyNotice,
}: {
  slug: string;
  children: React.ReactNode;
  content: ToolContent;
  publicData?: PublicToolShellData;
  /** Compact chrome for document-workspace tools. Default preserves existing pages. */
  variant?: "default" | "compact";
  headingDescription?: string;
  stepsHeading?: string;
  faqsHeading?: string;
  relatedHeading?: string;
  referenceSection?: React.ReactNode;
  privacyNotice?: string;
}) {
  const compact = variant === "compact";
  const tool =
    publicData?.tool ?? staticTools.find((item) => item.slug === slug)!;
  const toolCategories = toolCategoriesOf(tool);
  const categories =
    publicData?.categories ??
    toolCategories
      .map((name) => categoryMeta.find((item) => item.name === name))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const primaryCategory = categories[0];
  const visibleTools = publicData?.tools ?? staticTools;
  const related = relatedTools(tool)
    .map((item) =>
      visibleTools.find((publicTool) => publicTool.slug === item.slug),
    )
    .filter((item): item is (typeof visibleTools)[number] => Boolean(item));
  const theme = toolTheme(tool.slug, tool.category);
  const publicDescription =
    publicData?.tool.publicDescription ??
    headingDescription ??
    tool.description;
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
        <Link href="/tools">All Tools</Link>
        {primaryCategory ? (
          <>
            <ChevronRight size={13} />
            <Link href={`/category/${primaryCategory.slug}`}>
              {primaryCategory.name}
            </Link>
          </>
        ) : null}
        <ChevronRight size={13} />
        <span aria-current="page">{tool.name}</span>
      </nav>
      {/* Local-only "recently used" memory for the homepage row. */}
      <RecentToolTracker slug={tool.slug} />
      {/* The same four levels the breadcrumb above shows. Every one of the 42
          tool pages gets it from here. */}
      <JsonLd
        data={breadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "All Tools", path: "/tools" },
          ...(primaryCategory
            ? [
                {
                  name: primaryCategory.name,
                  path: `/category/${primaryCategory.slug}`,
                },
              ]
            : []),
          { name: tool.name, path: `/tools/${tool.slug}` },
        ])}
      />
      <JsonLd
        data={toolStructuredData({
          name: tool.name,
          description: publicDescription,
          path: `/tools/${tool.slug}`,
          category: tool.category,
          slug: tool.slug,
          faqs: content.faqs,
          networkProcessing: Boolean(privacyNotice),
        })}
      />
      {compact ? (
        <header className="tool-title tool-title-compact">
          <ToolIcon3D tool={tool} size={64} />
          <div className="tool-title-copy">
            <h1>{tool.name}</h1>
            <p>{publicDescription}</p>
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
          <p>{publicDescription}</p>
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
      {/* 1 of 3 — directly below the introduction and above the workspace.
          It is a full-width block with its own spacing and label, so it is
          never beside Convert / Download / Reset / Upload or any other
          control the visitor is aiming at. */}
      <AdUnit placement="tool-after-intro" format="horizontal" />
      {children}
      {!compact ? (
        <p className="privacy-inline">
          <ShieldCheck size={17} />{" "}
          {privacyNotice ??
            "Processed on your device. Tool inputs are not uploaded or saved by QUICKKIT."}
        </p>
      ) : null}
      {referenceSection}
      <div
        className={`tool-guidance${compact ? " tool-guidance-compact" : ""}`}
      >
        <section>
          <span className="eyebrow">A quick walkthrough</span>
          <h2>{stepsHeading}</h2>
          <ol>
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section>
          <span className="eyebrow">Good to know</span>
          <h2>{faqsHeading}</h2>
          {content.faqs.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </div>
      {/* 2 of 3 — after the how-to steps and the FAQ, which is where a reader
          who finished the task naturally pauses. */}
      <AdUnit placement="tool-after-faq" format="auto" />
      <section className="related">
        <div className="section-heading">
          <h2>{relatedHeading}</h2>
          <Link className="text-link" href="/tools">
            All Tools <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="related-grid">
          {related.map((t) => (
            <Link
              className={`related-card cat-${toolTone(t)}`}
              style={toolSurfaceStyle(toolTheme(t.slug, t.category))}
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
      {/* 3 of 3 — the end of the page, separated from the related-tool links
          above it by the slot's own margin so the ad never reads as another
          destination to click. */}
      <AdUnit placement="tool-bottom" format="auto" />
    </div>
  );
}
