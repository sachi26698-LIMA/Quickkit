import type { MetadataRoute } from "next";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";

/**
 * Paths that must never be crawled, whether or not the site is indexable.
 *
 * - `/api/` is a POST-only conversion endpoint; a crawl request would only ever
 *   produce a 405 and waste crawl budget.
 * - `/saved` renders the visitor's own browser-local favourites. The page is
 *   empty for a crawler, so listing it would be thin content with no value.
 */
const PRIVATE_PATHS = ["/api/", "/saved", "/qr"];

/**
 * Crawlers that must be able to read the public pages for Google to review the
 * site: Search (`Googlebot`) and AdSense (`Mediapartners-Google`, which honours
 * robots.txt like every other well-behaved crawler).
 */
const CRAWLERS = ["*", "Googlebot", "Mediapartners-Google"];

export default function robots(): MetadataRoute.Robots {
  if (!indexingEnabled) {
    // Preview/development: nothing is crawlable except ads.txt. Google ignores
    // an ads.txt whose path robots.txt disallows, so that one exception has to
    // survive even while the rest of the site is closed.
    return {
      rules: [{ userAgent: "*", allow: "/ads.txt", disallow: "/" }],
    };
  }

  return {
    rules: CRAWLERS.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: PRIVATE_PATHS,
    })),
    // indexability implies SITE_URL is set; the guard keeps types honest.
    ...(siteOrigin ? { sitemap: siteOrigin + "/sitemap.xml" } : {}),
  };
}
