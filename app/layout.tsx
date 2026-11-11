import type { Metadata } from "next";
import localFont from "next/font/local";
import AdSenseLoader from "@/components/adsense-loader";
import Footer from "@/components/footer";
import Header from "@/components/header";
import IconMotionGate from "@/components/icon-motion-gate";
import JsonLd from "@/components/json-ld";
import { isAdsEnabled } from "@/lib/ads";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin, siteStructuredData } from "@/lib/seo";
import "./globals.css";

// Self-hosted Geist (OFL, see app/fonts/LICENSE-geist.txt). next/font/local
// preloads the file and generates a metric-matched fallback so the swap
// does not shift layout (CLS) on slow connections.
const geist = localFont({
  src: "./fonts/geist-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
/** Public AdSense publisher id; the same value is in the loader URL and ads.txt. */
const ADSENSE_CLIENT_ID = "ca-pub-1478767466279341";

/**
 * Google Search Console ownership token (Search Console → Settings → Ownership
 * verification → HTML tag). Next renders it as
 * `<meta name="google-site-verification" content="…">` in the document head.
 *
 * It lives in the root layout rather than on the homepage so ownership stays
 * verified no matter how the homepage is edited, and it is a public string with
 * no security value — removing it only un-verifies the property.
 */
const GOOGLE_SITE_VERIFICATION = "Ws39VaIkLt8aOvlE5k6mABJfBxFOHuyzIU4bgERImCY";

export const metadata: Metadata = {
  title: {
    default: "Free Online PDF, Image, QR, Code & Math Tools | QUICKKIT",
    template: "%s | QUICKKIT",
  },
  description:
    "Use 42 free online tools for PDFs, images, OCR, QR codes, JSON/code formatting and calculators. Fast browser-first utilities with no account or signup.",
  metadataBase: new URL(
    siteOrigin ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3001"),
  ),
  robots: { index: indexingEnabled, follow: indexingEnabled },
  verification: { google: GOOGLE_SITE_VERIFICATION },
  // Tells AdSense which account owns the site even before an ad unit is placed
  // (it is what the AdSense "site verification" check looks for). The value is
  // already public in the loader URL below, so nothing is disclosed here.
  other: { "google-adsense-account": ADSENSE_CLIENT_ID },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        {/* Who publishes the site and what it is. One block for the whole site,
            generated from lib/seo.ts — no ratings, no address, nothing guessed. */}
        <JsonLd data={siteStructuredData()} />
        {isAdsEnabled() ? (
          <AdSenseLoader
            enabled
            scriptSrc="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1478767466279341"
          />
        ) : null}
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <noscript>
          <p className="container status">
            These tools need JavaScript to run in your browser. Enable
            JavaScript to use the interactive workspaces.
          </p>
        </noscript>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <IconMotionGate />
      </body>
    </html>
  );
}
