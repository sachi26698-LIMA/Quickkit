import PageHero from "@/components/page-hero";
import ToolExplorer from "@/components/tool-explorer";
import { categories, metaBySlug, type Category } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "All Tools — every QUICKKIT utility in one place",
  "Browse all QUICKKIT browser tools, including PDF and image utilities, text tools, JSON and HTML formatters, CSS and JavaScript minifiers, Base64 and URL encoders, regex testing, UUID generation and hashes.",
  "/tools",
);

function resolveCategory(value: string | undefined): Category {
  if (!value) return "All tools";
  const bySlug = metaBySlug(value);
  if (bySlug) return bySlug.name;
  return (categories as readonly string[]).includes(value)
    ? (value as Category)
    : "All tools";
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="home inner-page">
      <div className="container">
        <PageHero
          eyebrow="THE FULL TOOLKIT"
          title="All"
          titleAccent="Tools"
          lede="Every QUICKKIT utility, ready to use. Search, filter by category, and tap the heart to save your favourites."
        />
        <ToolExplorer
          initialQuery={params.q ?? ""}
          initialCategory={resolveCategory(params.category)}
        />
      </div>
    </div>
  );
}
