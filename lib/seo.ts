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
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const brandedTitle = /\bQUICKKIT\b/i.test(title)
    ? title
    : `${title} | QUICKKIT`;
  return {
    // Next.js only applies `app/layout.tsx` `title.template` to child route
    // segments, never to `app/page.tsx` (`path === "/"`), so `/` needs an
    // explicit `absolute` title to include ` | QUICKKIT` in `<title>`.
    title: path === "/" ? { absolute: brandedTitle } : title,
    description,
    alternates: siteOrigin ? { canonical: siteOrigin + path } : undefined,
    openGraph: {
      title: brandedTitle,
      description,
      type: "website",
      siteName: "QUICKKIT",
      ...(siteOrigin
        ? {
            url: siteOrigin + path,
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
      item: siteOrigin + item.path,
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
export function siteStructuredData() {
  if (!siteOrigin) return undefined;
  const origin = siteOrigin;
  const organizationId = `${origin}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "QUICKKIT",
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: `${origin}/apple-icon.png`,
          width: 180,
          height: 180,
        },
        ...(contactEmail ? { email: contactEmail } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "QUICKKIT",
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
  const url = path === "/" ? siteOrigin : `${siteOrigin}${path}`;
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
        url: item.path === "/" ? siteOrigin : `${siteOrigin}${item.path}`,
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
}: {
  name: string;
  description: string;
  path: string;
  category?: string;
  slug?: string;
  steps?: string[];
  faqs?: { q: string; a: string }[];
}) {
  const url = siteOrigin ? siteOrigin + path : undefined;
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
      browserRequirements: serverProcessed
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
