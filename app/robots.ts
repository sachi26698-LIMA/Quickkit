import type { MetadataRoute } from "next";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      ...(indexingEnabled ? { allow: "/" } : { disallow: "/" }),
    },
    ...(indexingEnabled ? { sitemap: siteOrigin + "/sitemap.xml" } : {}),
  };
}
