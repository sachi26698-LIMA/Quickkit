import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import Header from "@/components/header";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";
import "@fontsource-variable/geist";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "QUICKKIT — Handy tools. Zero hassle.",
    template: "%s | QUICKKIT",
  },
  description:
    "Six useful browser tools for text, JSON, passwords, QR codes and images. No account, no uploads, zero hassle.",
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
    <html lang="en">
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
