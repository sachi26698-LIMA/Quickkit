import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/components/footer";
import Header from "@/components/header";
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
export const metadata: Metadata = {
  title: {
    default: "QUICKKIT — Handy tools. Zero hassle.",
    template: "%s | QUICKKIT",
  },
  description:
    "Seven useful browser tools for PDFs, text, JSON, passwords, QR codes and images. No account, no uploads, zero hassle.",
  metadataBase: new URL(
    siteOrigin ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3001"),
  ),
  robots: { index: indexingEnabled, follow: indexingEnabled },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
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
      </body>
    </html>
  );
}
