import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      ...(siteOrigin ? { allow: "/" } : { disallow: "/" }),
    },
    ...(siteOrigin ? { sitemap: siteOrigin + "/sitemap.xml" } : {}),
  };
}
