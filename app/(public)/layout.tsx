import type { Metadata } from "next";
import AdSenseLoader from "@/components/adsense-loader";
import CommandPalette from "@/components/command-palette";
import Footer from "@/components/footer";
import Header from "@/components/header";
import IconMotionGate from "@/components/icon-motion-gate";
import JsonLd from "@/components/json-ld";
import { isAdsEnabled } from "@/lib/ads";
import { getClientCatalog } from "@/lib/client-catalog";
import { siteStructuredData } from "@/lib/seo";
import { contactEmail as defaultContactEmail } from "@/lib/site";
import {
  getPublicCatalog,
  getPublicSiteSettings,
} from "@/lib/supabase/public-catalog";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  const siteName = settings.website_name ?? "QUICKKIT";
  return {
    title: {
      default: `Free Online PDF, Image, QR, Code & Math Tools | ${siteName}`,
      template: `%s | ${siteName}`,
    },
    applicationName: siteName,
    openGraph: { siteName },
  };
}

const ADSENSE_CLIENT_ID = "ca-pub-1478767466279341";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ categories, tools }, settings, clientTools] = await Promise.all([
    getPublicCatalog(),
    getPublicSiteSettings(),
    // Same projected array the homepage consumes — one flight encoding.
    getClientCatalog(),
  ]);
  const siteName = settings.website_name ?? "QUICKKIT";
  const maintenance = settings.maintenance;
  // The header only needs to know which categories have no published tool (so
  // the link is `nofollow`). Computing it here keeps the full catalogue on the
  // server instead of serialising it into every page's RSC payload.
  const emptyCategorySlugs = categories
    .filter(
      (category) =>
        !tools.some((tool) => {
          // Only two tools carry a secondary category, so the field is absent
          // from most members of the union and has to be read defensively.
          const secondary = (tool as { categories?: readonly string[] })
            .categories;
          return (
            tool.category === category.name ||
            (Array.isArray(secondary) && secondary.includes(category.name))
          );
        }),
    )
    .map((category) => category.slug);
  return (
    <>
      <JsonLd
        data={siteStructuredData(
          siteName,
          settings.contact_email ?? defaultContactEmail,
        )}
      />
      <AdSenseLoader
        enabled={isAdsEnabled()}
        scriptSrc={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {maintenance?.enabled ? (
        <p className="container status" role="status">
          {maintenance.message}
        </p>
      ) : null}
      <Header
        categories={categories}
        emptyCategorySlugs={emptyCategorySlugs}
        siteName={siteName}
      />
      <noscript>
        <p className="container status">
          These tools need JavaScript to run in your browser. Enable JavaScript
          to use the interactive workspaces.
        </p>
      </noscript>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer
        siteName={siteName}
        tagline={settings.tagline}
        contactEmail={settings.contact_email}
        socialLinks={settings.social_links}
        extraLinks={settings.footer_links}
      />
      {/* Global Ctrl/⌘ K search for every public page except the two that
          already mount an inline search box (/, /tools). */}
      <CommandPalette tools={clientTools} categories={categories} />
      <IconMotionGate />
    </>
  );
}
