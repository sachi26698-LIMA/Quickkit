import type { MetadataRoute } from "next";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";

/**
 * Paths that must never be crawled, whether or not the site is indexable.
 *
 * - `/api/` is a conversion API namespace; crawling it only wastes crawl budget.
 * - `/saved` and `/qr` are intentionally NOT disallowed here because they emit
 *   explicit `noindex` directives (`<meta name="robots">` + `X-Robots-Tag`).
 *   Allowing crawlers to fetch them ensures search engines see `noindex` rather
 *   than indexing link-discovered blocked URLs.
 */
const PRIVATE_PATHS = ["/api/"];

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
