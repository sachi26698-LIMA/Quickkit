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
  return {
    title,
    description,
    alternates: siteOrigin ? { canonical: siteOrigin + path } : undefined,
    openGraph: {
      title,
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
      title,
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
export function toolStructuredData({
  name,
  description,
  path,
  steps,
  faqs,
}: {
  name: string;
  description: string;
  path: string;
  steps: string[];
  faqs: { q: string; a: string }[];
}) {
  const url = siteOrigin ? siteOrigin + path : undefined;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: `${name} — QUICKKIT`,
        description,
        ...(url ? { url } : {}),
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any modern browser",
        browserRequirements:
          "Requires JavaScript. Images are processed locally.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        isAccessibleForFree: true,
      },
      {
        "@type": "HowTo",
        name: `How to use the QUICKKIT ${name}`,
        step: steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text: step,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };
}
