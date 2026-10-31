import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";
import { tools } from "@/lib/catalog";
export default function sitemap(): MetadataRoute.Sitemap {
  return siteOrigin
    ? [
        "/",
        "/about",
        "/privacy",
        "/terms",
        ...tools.map((t) => `/tools/${t.slug}`),
      ].map((path) => ({ url: siteOrigin + path }))
    : [];
}
