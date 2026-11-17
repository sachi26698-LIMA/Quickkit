import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ClientTool } from "@/lib/client-tool";
import { ToolIcon3D, toolTone } from "@/components/icon-3d";
import { toolSurfaceStyle, toolTheme } from "@/lib/tool-theme";
import FavoriteButton from "@/components/favorite-button";

/**
 * Tool card with a stretched link (the title link covers the card) so the
 * save button stays a sibling — never nested interactive elements.
 */
export default function ToolCard({
  tool,
  category,
  href,
}: {
  tool: ClientTool;
  href?: string;
  /** Label for the listing the card appears in; defaults to the primary category. */
  category?: string;
}) {
  // Set on catalogue entries an administrator has switched off for an update.
  // The projection carries this as a bare boolean; see `lib/client-tool.ts`.
  const isOff = tool.maintenance === true;
  return (
    <article
      className={`tool-card cat-${toolTone(tool)}`}
      data-tool={tool.slug}
      data-maintenance={isOff ? "true" : undefined}
      style={toolSurfaceStyle(toolTheme(tool.slug, tool.category))}
    >
      <div className="card-top">
        <ToolIcon3D tool={tool} size={60} />
        <span className="card-top-right">
          <span className="category-label">{category ?? tool.category}</span>
          <FavoriteButton slug={tool.slug} name={tool.name} />
        </span>
      </div>
      <h3>
        <Link className="card-link" href={href ?? `/tools/${tool.slug}`}>
          {tool.name}
        </Link>
      </h3>
      <p>{tool.description}</p>
      <div className="card-footer">
        <span>{isOff ? "Being updated" : "Open tool"}</span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </div>
    </article>
  );
}
