import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";
import { indexingEnabled } from "@/lib/launch";
import { categoryMeta, tools } from "@/lib/catalog";
export default function sitemap(): MetadataRoute.Sitemap {
  return indexingEnabled && siteOrigin
    ? [
        "/",
        "/tools",
        "/saved",
        "/about",
        "/contact",
        "/help",
        "/privacy",
        "/terms",
        "/cookies",
        "/sitemap",
        ...categoryMeta.map((c) => `/category/${c.slug}`),
        ...tools.map((t) => `/tools/${t.slug}`),
      ].map((path) => ({ url: siteOrigin + path }))
    : [];
}
