import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/components/footer";
import Header from "@/components/header";
import IconMotionGate from "@/components/icon-motion-gate";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";
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
    default: "QUICKKIT — Handy tools. Zero hassle.",
    template: "%s | QUICKKIT",
  },
  description:
    "Useful browser tools for PDFs, images, text, JSON, code, hashes, passwords and QR codes. No account, no uploads, zero hassle.",
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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1478767466279341"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <noscript>
          <p className="container status">
            These tools need JavaScript to process your inputs locally. Enable
            JavaScript to use the workspaces; no server upload is required.
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
