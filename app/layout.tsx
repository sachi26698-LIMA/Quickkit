import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
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
    "Nine useful browser tools for PDFs, text, JSON, passwords, QR codes and images. No account, no uploads, zero hassle.",
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
              <Link href="/" className="brand">
                <span className="brand-mark">Q</span>
                <span>
                  QUICK<span className="brand-purple">KIT</span>
                </span>
              </Link>
              <p>
                Handy tools. Zero hassle.
                <br />A little help for the things you do every day.
              </p>
            </div>
            <div>
              <h2>Explore</h2>
              <Link href="/#tools">
                All tools <ArrowUpRight size={13} />
              </Link>
              <Link href="/about">About QUICKKIT</Link>
            </div>
            <div>
              <h2>The fine print</h2>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Use</Link>
            </div>
            <div className="footer-promise">
              <ShieldCheck size={23} />
              <strong>Your work stays yours.</strong>
              <p>
                Tool inputs are processed in your browser.
                <br />
                No sign-up. No tracking analytics.
              </p>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© {new Date().getFullYear()} QUICKKIT</span>
            <span>Small tasks. Thoughtfully solved.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
