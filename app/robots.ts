import type { MetadataRoute } from "next";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: indexingEnabled
      ? { userAgent: "*", allow: "/" }
      : // The site is not approved for indexing yet, so everything stays
        // disallowed — except /ads.txt. Google ignores an ads.txt file whose
        // path is disallowed by robots.txt, which is exactly how a correctly
        // deployed ads.txt still shows up as "not found" in AdSense
        // (support.google.com/adsense/answer/7679060). A specific Allow wins
        // over the broader Disallow, so this exposes the ads.txt file only.
        { userAgent: "*", allow: "/ads.txt", disallow: "/" },
    ...(indexingEnabled ? { sitemap: siteOrigin + "/sitemap.xml" } : {}),
  };
}
