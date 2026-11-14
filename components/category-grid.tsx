import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { categoryMeta, toolsByCategory } from "@/lib/catalog";
import { CategoryIcon3D, categoryTone } from "@/components/icon-3d";
import TiltGrid from "@/components/tilt-grid";

/**
 * Homepage category cards.
 *
 * Server-rendered on purpose: the catalogue and the 3D icon set are large
 * modules, and shipping them to the browser only to attach a pointer handler
 * made the landing page's JavaScript several times bigger than the page itself.
 * The tilt is delegated by `<TiltGrid />`, the only client code here.
 */
export default function CategoryGrid() {
  return (
    <TiltGrid className="category-grid">
      {categoryMeta.map((meta) => {
        const count = toolsByCategory(meta.name).length;
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
