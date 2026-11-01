import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Brand from "@/components/brand";
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
        <footer className="site-footer">
          <div className="container footer-top">
            <div>
              <Brand />
              <p>
                Handy tools. Zero hassle.
                <br />A little help for the things you do every day.
              </p>
              <p className="footer-promise-line">
                <ShieldCheck size={19} aria-hidden="true" />
                <span>
                  <strong>Your work stays yours.</strong>
                  <br />
                  Processed on your device. No sign-up, no tracking analytics.
                </span>
              </p>
            </div>
            <div>
              <h2>Tools</h2>
              <Link href="/#tools">All tools</Link>
              <Link href="/tools/merge-pdf">PDF Merger</Link>
              <Link href="/tools/word-counter">Word Counter</Link>
              <Link href="/tools/case-converter">Case Converter</Link>
              <Link href="/tools/json-formatter">JSON Formatter</Link>
            </div>
            <div>
              <h2>More tools</h2>
              <Link href="/tools/password-generator">Password Generator</Link>
              <Link href="/tools/qr-generator">QR Code Generator</Link>
              <Link href="/tools/image-compressor">Image Compressor</Link>
              <Link href="/#categories">Browse categories</Link>
            </div>
            <div>
              <h2>QUICKKIT</h2>
              <Link href="/about">About QUICKKIT</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Use</Link>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>
              © {new Date().getFullYear()} QUICKKIT. All rights reserved.
            </span>
            <span>Small tasks. Thoughtfully solved.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
