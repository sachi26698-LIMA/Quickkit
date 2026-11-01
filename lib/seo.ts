import type { Metadata } from "next";
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
        browserRequirements: "Requires JavaScript. Images are processed locally.",
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
