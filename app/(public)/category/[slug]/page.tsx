import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Clock } from "lucide-react";
import { CategoryIcon3D, categoryTone } from "@/components/icon-3d";
import AdUnit from "@/components/ad-unit";
import ToolCard from "@/components/tool-card";
import JsonLd from "@/components/json-ld";
import CalculatorCategoryGrid from "@/components/calculator-category-grid";
import { categoryMeta } from "@/lib/catalog";
import { getPublicCatalog } from "@/lib/supabase/public-catalog";

export const revalidate = 300;
import {
  breadcrumbStructuredData,
  collectionPageStructuredData,
  pageMetadata,
} from "@/lib/seo";
import { categoryContent } from "@/lib/category-content";

export function generateStaticParams() {
  return categoryMeta.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ categories, tools }, { slug }] = await Promise.all([
    getPublicCatalog(),
    params,
  ]);
  const meta = categories.find((category) => category.slug === slug);
  if (!meta) return {};
  const published = tools.some(
    (tool) =>
      tool.category === meta.name ||
      ("categories" in tool &&
        Array.isArray(tool.categories) &&
        (tool.categories as readonly string[]).includes(meta.name)),
  );
  return {
    ...pageMetadata(meta.seoTitle, meta.description, `/category/${meta.slug}`),
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
  const [{ categories, tools }, routeParams] = await Promise.all([
    getPublicCatalog(),
    params,
  ]);
  const meta = categories.find(
    (category) => category.slug === routeParams.slug,
  );
  if (!meta) notFound();
  const copy = categoryContent[meta.slug];
  const list = tools.filter(
    (tool) =>
      tool.category === meta.name ||
      ("categories" in tool &&
        Array.isArray(tool.categories) &&
        (tool.categories as readonly string[]).includes(meta.name)),
  );
  const others = categories.filter((category) => category.slug !== meta.slug);

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
        {/* Mirrors the trail above, level for level. Only emitted because this
            page shows a breadcrumb to the reader. */}
        {list.length > 0 ? (
          <>
            <JsonLd
              data={breadcrumbStructuredData([
                { name: "Home", path: "/" },
                { name: "All Tools", path: "/tools" },
                { name: meta.name, path: `/category/${meta.slug}` },
              ])}
            />
            <JsonLd
              data={collectionPageStructuredData({
                name: `${meta.name} — QUICKKIT`,
                description: meta.description,
                path: `/category/${meta.slug}`,
                items: list.map((tool) => ({
                  name: tool.name,
                  path: `/tools/${tool.slug}`,
                })),
              })}
            />
          </>
        ) : null}

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
          <>
            <h2 className="sr-only">Available {meta.name}</h2>
            <div
              className={`tool-grid category-tools cat-${categoryTone(meta.name)}`}
            >
              {list.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} category={meta.name} />
              ))}
            </div>
          </>
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

        {/* The category's own explanation: what these tools do, how they fit
            together and where the limits are. It sits between the listing and
            the ad so the page is content first, advertising second. */}
        {copy ? (
          <section
            className="home-section category-about"
            aria-labelledby="category-about-title"
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">About this category</span>
                <h2 id="category-about-title">{copy.heading}</h2>
              </div>
            </div>
            <div className="home-copy">
              <p>{copy.intro}</p>
              {copy.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
              {meta.slug === "qr-barcode" ? (
                <p>
                  New to symbologies, quiet zones or GS1 identifiers? Read the{" "}
                  <Link href="/guides/barcode">Barcode Guide</Link> before
                  sending labels to print.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Below the content: a pause after the reading, not between the reader
            and navigation. A category with nothing in it yet is a placeholder,
            not a page with content worth advertising against, so it gets no
            unit. */}
        {list.length ? (
          <AdUnit placement="category-bottom" format="auto" />
        ) : null}

        <section className="more-categories" aria-labelledby="more-cat-title">
          <h2 id="more-cat-title">Explore other categories</h2>
          <div className="more-categories-row">
            {others.map((other) => {
              const empty = !tools.some(
                (tool) =>
                  tool.category === other.name ||
                  ("categories" in tool &&
                    Array.isArray(tool.categories) &&
                    (tool.categories as readonly string[]).includes(
                      other.name,
                    )),
              );
              return (
                <Link
                  key={other.slug}
                  className={`more-category-chip ${other.tint} cat-${categoryTone(other.name)}`}
                  href={`/category/${other.slug}`}
                  rel={empty ? "nofollow" : undefined}
                >
                  <CategoryIcon3D meta={other} size={38} />
                  {other.name}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
