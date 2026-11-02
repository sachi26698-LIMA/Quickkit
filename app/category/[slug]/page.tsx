import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Clock } from "lucide-react";
import CategoryIcon from "@/components/category-icon";
import ToolCard from "@/components/tool-card";
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
  return pageMetadata(
    `${meta.name} — free online tools`,
    meta.description,
    `/category/${meta.slug}`,
  );
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
          <Link href="/">Home</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href="/tools">All Tools</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{meta.name}</span>
        </nav>

        <header className={`category-hero ${meta.tint}`}>
          <span className="category-glow" aria-hidden="true" />
          <span className="category-icon large">
            <CategoryIcon meta={meta} size={34} />
          </span>
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

        {list.length ? (
          <div className="tool-grid category-tools">
            {list.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="empty coming-soon">
            <Clock size={34} aria-hidden="true" />
            <h2>Coming soon</h2>
            <p>
              We’re building {meta.name} for the toolkit. In the meantime,
              explore the tools that are ready today — every one is free and
              runs in your browser.
            </p>
            <Link className="primary" href="/tools">
              Explore All Tools <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}

        <section className="more-categories" aria-labelledby="more-cat-title">
          <h2 id="more-cat-title">Explore other categories</h2>
          <div className="more-categories-row">
            {others.map((other) => (
              <Link
                key={other.slug}
                className="more-category-chip"
                href={`/category/${other.slug}`}
              >
                <span className={`dropdown-icon ${other.tint}`}>
                  <CategoryIcon meta={other} size={16} />
                </span>
                {other.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
