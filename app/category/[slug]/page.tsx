import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Clock } from "lucide-react";
import { CategoryIcon3D, categoryTone } from "@/components/icon-3d";
import AdUnit from "@/components/ad-unit";
import ToolCard from "@/components/tool-card";
import CalculatorCategoryGrid from "@/components/calculator-category-grid";
import { categoryMeta, metaBySlug, toolsByCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return categoryMeta.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const meta = metaBySlug((await params).slug);
  if (!meta) return {};
  const published = toolsByCategory(meta.name).length > 0;
  return {
    ...pageMetadata(
      `${meta.name} — free online tools`,
      meta.description,
      `/category/${meta.slug}`,
    ),
    // A category with nothing in it yet is a placeholder, not a destination:
    // keep it reachable from the nav but out of the index until it ships tools.
    ...(published ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const meta = metaBySlug((await params).slug);
  if (!meta) notFound();
  const list = toolsByCategory(meta.name);
  const others = categoryMeta.filter((c) => c.slug !== meta.slug);

  return (
    <div className="home inner-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>
            Home
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href="/tools">All Tools</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{meta.name}</span>
        </nav>

        <header
          className={`category-hero ${meta.tint} cat-${categoryTone(meta.name)}`}
        >
          <span className="category-glow" aria-hidden="true" />
          <CategoryIcon3D meta={meta} size={88} />
          <div>
            <h1>{meta.name}</h1>
            <p>{meta.description}</p>
          </div>
          <span className="category-hero-count">
            {list.length
              ? `${list.length} ${list.length === 1 ? "tool" : "tools"}`
              : "Coming soon"}
          </span>
        </header>

        {list.length && meta.slug === "calculators" ? (
          <CalculatorCategoryGrid tools={list} />
        ) : list.length ? (
          <div
            className={`tool-grid category-tools cat-${categoryTone(meta.name)}`}
          >
            {list.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} category={meta.name} />
            ))}
          </div>
        ) : (
          <div className="empty coming-soon">
            <Clock size={34} aria-hidden="true" />
            <h2>Coming soon</h2>
            <p>
              We’re building {meta.name} for the toolkit. In the meantime,
              explore the tools that are ready today — tools are free, with
              processing details disclosed on each tool page.
            </p>
            <Link className="primary" href="/tools">
              Explore All Tools <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Below the tool listing and above the "other categories" links: a
            pause after the content, not between the reader and navigation.
            A category with nothing in it yet is a placeholder, not a page with
            content worth advertising against, so it gets no unit. */}
        {list.length ? (
          <AdUnit placement="category-bottom" format="auto" />
        ) : null}

        <section className="more-categories" aria-labelledby="more-cat-title">
          <h2 id="more-cat-title">Explore other categories</h2>
          <div className="more-categories-row">
            {others.map((other) => (
              <Link
                key={other.slug}
                className={`more-category-chip ${other.tint} cat-${categoryTone(other.name)}`}
                href={`/category/${other.slug}`}
              >
                <CategoryIcon3D meta={other} size={38} />
                {other.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
