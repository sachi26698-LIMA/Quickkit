import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Tool } from "@/lib/catalog";
import ToolIcon from "@/components/tool-icon";
import FavoriteButton from "@/components/favorite-button";

/**
 * Tool card with a stretched link (the title link covers the card) so the
 * save button stays a sibling — never nested interactive elements.
 */
export default function ToolCard({
  tool,
  category,
}: {
  tool: Tool;
  /** Label for the listing the card appears in; defaults to the primary category. */
  category?: string;
}) {
  return (
    <article className="tool-card">
      <div className="card-top">
        <ToolIcon icon={tool.icon} color={tool.color} />
        <span className="card-top-right">
          <span className="category-label">{category ?? tool.category}</span>
          <FavoriteButton slug={tool.slug} name={tool.name} />
        </span>
      </div>
      <h3>
        <Link className="card-link" href={`/tools/${tool.slug}`}>
          {tool.name}
        </Link>
      </h3>
      <p>{tool.description}</p>
      <div className="card-footer">
        <span>Open tool</span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </div>
    </article>
  );
}
