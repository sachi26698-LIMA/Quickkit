import type { Metadata } from "next";
import AdSenseLoader from "@/components/adsense-loader";
import Footer from "@/components/footer";
import Header from "@/components/header";
import IconMotionGate from "@/components/icon-motion-gate";
import JsonLd from "@/components/json-ld";
import { isAdsEnabled } from "@/lib/ads";
import { siteStructuredData } from "@/lib/seo";
import { contactEmail as defaultContactEmail } from "@/lib/site";
import {
  getPublicCatalog,
  getPublicSiteSettings,
} from "@/lib/supabase/public-catalog";

export const dynamic = "force-dynamic";

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
  const [{ categories, tools }, settings] = await Promise.all([
    getPublicCatalog(),
    getPublicSiteSettings(),
  ]);
  const siteName = settings.website_name ?? "QUICKKIT";
  const maintenance = settings.maintenance;
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
      <Header categories={categories} tools={tools} siteName={siteName} />
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
      <IconMotionGate />
    </>
  );
}
