import type { Metadata } from "next";
import { contactEmail } from "@/lib/site";
function productionOrigin() {
  const raw = process.env.SITE_URL;
  if (!raw) return undefined;
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "SITE_URL must be an HTTPS origin without a path or credentials.",
    );
  return url.origin;
}
export const siteOrigin = productionOrigin();

/**
 * The one absolute URL for a site-relative route, so the canonical, the Open
 * Graph URL, the sitemap and every JSON-LD node cannot disagree about it.
 *
 * **The homepage is the bare origin, with no trailing slash** — `https://host`.
 * That is not a preference, it is what Next.js can actually emit: its metadata
 * renderer collapses any same-origin URL whose pathname is `/` to
 * `url.origin` (`resolveAbsoluteUrlWithPathname` in `next/dist/lib/metadata`),
 * so a `canonical` of `https://host/` comes out of the build as `https://host`
 * regardless of what is passed in. The sitemap used to list `https://host/`
 * and the JSON-LD `@id`s used `https://host/#website`, so the site published
 * two spellings of its most important URL. Everything now routes through this
 * helper and states the bare origin, which is the spelling the canonical is
 * stuck with.
 *
 * Google treats the slash and no-slash root as one URL, so this is not a
 * ranking fix — it is removing an inconsistency between what the sitemap, the
 * structured data and the canonical claim.
 */
export function absoluteUrl(path: string): string | undefined {
  if (!siteOrigin) return undefined;
  if (path === "/" || path === "") return siteOrigin;
  return siteOrigin + (path.startsWith("/") ? path : `/${path}`);
}

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  brand = "QUICKKIT",
): Metadata {
  const brandedTitle = title
    .toLocaleLowerCase()
    .includes(brand.toLocaleLowerCase())
    ? title
    : `${title} | ${brand}`;
  return {
    // Next.js only applies `app/layout.tsx` `title.template` to child route
    // segments, never to `app/page.tsx` (`path === "/"`), so `/` needs an
    // explicit `absolute` title to include ` | QUICKKIT` in `<title>`.
    title: path === "/" ? { absolute: brandedTitle } : title,
    description,
    alternates: siteOrigin ? { canonical: absoluteUrl(path) } : undefined,
    openGraph: {
      title: brandedTitle,
      description,
      type: "website",
      siteName: brand,
      ...(siteOrigin
        ? {
            url: absoluteUrl(path),
            images: [
              {
                url: siteOrigin + "/opengraph-image",
                width: 1200,
                height: 630,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      ...(siteOrigin ? { images: [siteOrigin + "/opengraph-image"] } : {}),
    },
  };
}

/** One step of a visible breadcrumb trail. `path` is a site-relative route. */
export type Crumb = { name: string; path: string };

/**
 * JSON-LD for the trail a page already shows on screen.
 *
 * Only pages that render a visible `<nav aria-label="Breadcrumb">` call this, and
 * the list passed in is the same list the reader sees — no invented levels, no
 * "Home" on a page that does not show one. Positions are sequential from 1, as
 * the schema requires.
 *
 * Returns `undefined` when no production origin is configured, so a preview
 * build never emits absolute URLs that do not exist yet.
 */
export function breadcrumbStructuredData(items: Crumb[]) {
  if (!siteOrigin || items.length === 0) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Site-wide JSON-LD: who publishes the site (`Organization`) and what the site
 * is (`WebSite`, with the internal search QUICKKIT actually has at `/tools?q=`).
 *
 * Nothing here is guessed. `email` is only emitted when the operator has
 * configured a real inbox, there is no address, no founding date, no rating and
 * no `sameAs` list — the social accounts are deliberately not published.
 */
export function siteStructuredData(
  siteName = "QUICKKIT",
  publicContactEmail: string | null = contactEmail,
) {
  if (!siteOrigin) return undefined;
  const origin = siteOrigin;
  const organizationId = `${origin}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        // "QuickKit" is the same brand typed in mixed case — a real spelling
        // people use, not a second identity. It is the only alias stated:
        // there is no legal entity, trading name or acronym to declare.
        alternateName: "QuickKit",
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: `${origin}/apple-icon.png`,
          width: 180,
          height: 180,
        },
        ...(publicContactEmail ? { email: publicContactEmail } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: siteName,
        alternateName: "QuickKit",
        url: origin,
        inLanguage: "en",
        publisher: { "@id": organizationId },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${origin}/tools?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/**
 * `WebPage` for the homepage.
 *
 * Rendered by the homepage only. The site-wide graph lives in the public
 * layout and therefore appears on every public page, so a `WebPage` node with
 * the homepage's URL cannot go in there — that would tell Google `/tools` is
 * `/`. This builds the node for the page it is actually rendered on, and
 * points back at the `WebSite` and `Organization` nodes by `@id` rather than
 * repeating them (no duplicate entities).
 */
export function webPageStructuredData({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  const url = absoluteUrl(path);
  if (!siteOrigin || !url) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteOrigin}/#webpage`,
    url,
    name,
    description,
    inLanguage: "en",
    isPartOf: { "@id": `${siteOrigin}/#website` },
    about: { "@id": `${siteOrigin}/#organization` },
    publisher: { "@id": `${siteOrigin}/#organization` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${siteOrigin}/opengraph-image`,
      width: 1200,
      height: 630,
    },
  };
}

/**
 * JSON-LD for a tool page: WebApplication + HowTo + FAQPage.
 * Static content only; no user input is serialised.
 */
const FINANCE_CALCULATOR_SLUGS = new Set([
  "emi-calculator",
  "loan-calculator",
  "gst-calculator",
  "discount-calculator",
  "percentage-calculator",
]);

function resolveApplicationCategory(category?: string, slug?: string): string {
  if (slug && FINANCE_CALCULATOR_SLUGS.has(slug)) return "FinanceApplication";
  switch (category) {
    case "Image Tools":
      return "MultimediaApplication";
    case "PDF Tools":
      return "BusinessApplication";
    case "Developer Tools":
      return "DeveloperApplication";
    case "Security & Privacy":
      return "SecurityApplication";
    case "Calculators":
    case "QR & Barcode":
    case "Text & Writing":
    default:
      return "UtilitiesApplication";
  }
}

/**
 * Schema.org CollectionPage + ItemList for tool index hubs (`/tools` and
 * published `/category/[slug]` pages). Returns `undefined` when `SITE_URL` is
 * unset or the collection has no published items (e.g. Coming Soon categories).
 */
export function collectionPageStructuredData({
  name,
  description,
  path,
  items,
}: {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string }[];
}) {
  if (!siteOrigin || items.length === 0) return undefined;
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name,
    description,
    url,
    inLanguage: "en",
    isPartOf: { "@id": `${siteOrigin}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  };
}

/**
 * Schema.org structured data for a live tool page (`WebApplication` plus an
 * optional `FAQPage` when visible FAQs are rendered on the page).
 *
 * Deprecated `HowTo` markup is intentionally omitted, and `applicationCategory`
 * + `browserRequirements` reflect each tool's real behaviour.
 */
export function toolStructuredData({
  name,
  description,
  path,
  category,
  slug,
  faqs = [],
  networkProcessing = false,
}: {
  name: string;
  description: string;
  path: string;
  category?: string;
  slug?: string;
  steps?: string[];
  faqs?: { q: string; a: string }[];
  networkProcessing?: boolean;
}) {
  const url = absoluteUrl(path);
  const serverProcessed =
    slug === "word-to-pdf" || path === "/tools/word-to-pdf";
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebApplication",
      ...(url ? { "@id": `${url}#app`, url } : {}),
      name: `${name} — QUICKKIT`,
      description,
      inLanguage: "en",
      applicationCategory: resolveApplicationCategory(category, slug),
      operatingSystem: "Any",
      browserRequirements: networkProcessing
        ? "Requires JavaScript and a network connection to a third-party lookup service."
        : serverProcessed
          ? "Requires JavaScript. Converts DOCX documents via explicit-consent server processing."
          : "Requires JavaScript. Runs locally in modern browsers without uploading tool inputs.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isAccessibleForFree: true,
      ...(siteOrigin
        ? {
            isPartOf: { "@id": `${siteOrigin}/#website` },
            publisher: { "@id": `${siteOrigin}/#organization` },
          }
        : {}),
    },
  ];

  if (url) {
    // The page itself, appended after the application so existing graph order
    // is unchanged. Homepage has `WebPage`, `/tools` and category hubs have
    // `CollectionPage`; a tool page had no page-level entity, leaving search
    // engines to infer the page type from `WebApplication` alone. `mainEntity`
    // points at the tool, so the nodes are connected rather than co-located.
    graph.push({
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: `${name} — QUICKKIT`,
      description,
      inLanguage: "en",
      ...(siteOrigin
        ? {
            isPartOf: { "@id": `${siteOrigin}/#website` },
            about: { "@id": `${siteOrigin}/#organization` },
          }
        : {}),
      mainEntity: { "@id": `${url}#app` },
    });
  }

  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      ...(url ? { "@id": `${url}#faq` } : {}),
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
