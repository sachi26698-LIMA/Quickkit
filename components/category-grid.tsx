import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import type { CategoryMeta, Tool } from "@/lib/catalog";
import { CategoryIcon3D, categoryTone } from "@/components/icon-3d";
import TiltGrid from "@/components/tilt-grid";

/** Server-rendered cards from the published catalog; TiltGrid owns pointer behavior. */
export default function CategoryGrid({
  categories,
  tools,
  cards,
}: {
  categories?: CategoryMeta[];
  tools?: Tool[];
  cards?: { meta: CategoryMeta; count: number }[];
}) {
  const categoryCards =
    cards ?? (categories ?? []).map((meta) => ({ meta, count: 0 }));
  return (
    <TiltGrid className="category-grid">
      {categoryCards.map(({ meta, count: cardCount }) => {
        const count = tools
          ? tools.filter(
              (tool) =>
                tool.category === meta.name ||
                ("categories" in tool &&
                  Array.isArray(tool.categories) &&
                  (tool.categories as readonly string[]).includes(meta.name)),
            ).length
          : cardCount;
        const comingSoon = count === 0;
        return (
          <Link
            key={meta.slug}
            href={`/category/${meta.slug}`}
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
