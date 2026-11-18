import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import type { CategoryMeta } from "@/lib/catalog";
import type { ClientTool } from "@/lib/client-tool";
import { CategoryIcon3D, categoryTone } from "@/components/icon-3d";
import TiltGrid from "@/components/tilt-grid";

/**
 * Server-rendered cards from the published catalog; TiltGrid owns pointer
 * behavior.
 *
 * The `tools` array is used here, on the server, only to count tools per
 * category. It is deliberately never forwarded to `TiltGrid` — that component
 * is a client component, so anything passed through its props is serialised
 * into the RSC payload and shipped to every visitor. Earlier revisions passed
 * the array down for the child to count with, which sent the whole display
 * catalogue to the browser to render eleven numbers. The counts are computed
 * here instead and only `{ meta, count }` crosses the boundary.
 */
export default function CategoryGrid({
  categories,
  tools,
  cards,
}: {
  categories?: CategoryMeta[];
  /** Server-only: read to count tools per category, never forwarded. */
  tools?: ClientTool[];
  cards?: { meta: CategoryMeta; count: number }[];
}) {
  const categoryCards =
    cards ??
    (categories ?? []).map((meta) => ({
      meta,
      count: tools
        ? tools.filter(
            (tool) =>
              tool.category === meta.name ||
              (Array.isArray(tool.categories) &&
                tool.categories.includes(meta.name)),
          ).length
        : 0,
    }));
  return (
    <TiltGrid className="category-grid">
      {categoryCards.map(({ meta, count }) => {
        const comingSoon = count === 0;
        return (
          <Link
            key={meta.slug}
            href={`/category/${meta.slug}`}
            rel={comingSoon ? "nofollow" : undefined}
            className={`category-card ${meta.tint} cat-${categoryTone(meta.name)}`}
          >
            <span className="category-glow" aria-hidden="true" />
            <span className="category-card-top">
              <CategoryIcon3D meta={meta} size={72} />
              {comingSoon ? (
                <span className="soon-badge">
                  <Clock size={11} aria-hidden="true" /> Soon
                </span>
              ) : (
                <span className="category-arrow">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              )}
            </span>
            <h3>{meta.name}</h3>
            <p>{meta.blurb}</p>
            <span className="category-count">
              {comingSoon
                ? "Coming soon"
                : `${count} ${count === 1 ? "tool" : "tools"}`}
            </span>
          </Link>
        );
      })}
    </TiltGrid>
  );
}
