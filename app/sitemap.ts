import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";
import { indexingEnabled } from "@/lib/launch";
import { categoryMeta, tools } from "@/lib/catalog";
import { legalPages } from "@/lib/legal";

/**
 * Only routes that are finished, public and approved for indexing are listed.
 * The list is derived from the catalog and the legal registry rather than
 * hand-maintained, so a page cannot be published without appearing here, and a
 * page cannot appear here without existing.
 *
 * While `indexingEnabled` is false the sitemap is empty and `robots.txt`
 * disallows everything — a preview build must never leak draft pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingEnabled || !siteOrigin) return [];

  // `/saved` is deliberately absent: it renders the visitor's own browser-local
  // favourites, so a crawler only ever sees an empty shell. It also carries a
  // noindex tag and is disallowed in robots.txt.
  const staticRoutes = ["/", "/tools", "/help", "/sitemap"];
  const legalRoutes = legalPages
    .filter((page) => page.indexable)
    .map((page) => page.href);

  const paths = [
    ...new Set([
      ...staticRoutes,
      ...legalRoutes,
      ...categoryMeta
        // A category with no published tools is an empty page; keep it out
        // until it actually ships.
        .filter((category) =>
          tools.some(
            (tool) =>
              tool.category === category.name ||
              ("categories" in tool &&
                Array.isArray(tool.categories) &&
                (tool.categories as readonly string[]).includes(category.name)),
          ),
        )
        .map((category) => `/category/${category.slug}`),
      ...tools.map((tool) => `/tools/${tool.slug}`),
    ]),
  ];

  return paths.map((path) => ({ url: siteOrigin + path }));
}
