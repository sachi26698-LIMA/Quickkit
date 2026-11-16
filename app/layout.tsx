import type { Metadata } from "next";
import localFont from "next/font/local";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";
import "./globals.css";

const geist = localFont({
  src: "./fonts/geist-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const GOOGLE_SITE_VERIFICATION = "Ws39VaIkLt8aOvlE5k6mABJfBxFOHuyzIU4bgERImCY";

export const metadata: Metadata = {
  title: {
    default: "Free Online PDF, Image, QR, Code & Math Tools | QUICKKIT",
    template: "%s | QUICKKIT",
  },
  description:
    "Use free online tools for PDFs, images, OCR, QR codes, JSON/code formatting and calculators. Fast browser-first utilities; saved tools stay in your browser.",
  metadataBase: new URL(
    siteOrigin ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3001"),
  ),
  // Large image previews are requested explicitly for the pages that are meant
  // to be indexed: the OG card and the tool screenshots should be usable in
  // Discover and in image results, and Google otherwise caps previews at a
  // thumbnail. A noindex build keeps `index: false` so previews stay closed.
  robots: {
    index: indexingEnabled,
    follow: indexingEnabled,
    ...(indexingEnabled ? { "max-image-preview": "large" as const } : {}),
  },
  verification: { google: GOOGLE_SITE_VERIFICATION },
  other: { "google-adsense-account": "ca-pub-1478767466279341" },
};

/** Global document shell only. Public chrome lives in the public route group;
 * private /admin routes therefore never render the public header/footer. */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
