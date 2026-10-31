import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { indexingEnabled } from "@/lib/launch";
import { siteOrigin } from "@/lib/seo";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "QUICKKIT — Handy tools. Zero hassle.",
    template: "%s | QUICKKIT",
  },
  description:
    "Six free browser tools for text, JSON, passwords, QR codes and images. No account, no uploads, zero hassle.",
  metadataBase: new URL(
    siteOrigin ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3001"),
  ),
  robots: { index: indexingEnabled, follow: indexingEnabled },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-canvas text-ink">
        <a
          href="#main"
          className="focus:shadow-lift sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-brand-700"
        >
          Skip to content
        </a>
        <SiteHeader />
        <noscript>
          <p className="container my-4 rounded-xl border border-brand-100 bg-lavender-50 px-4 py-3 text-sm text-ink-soft">
            These tools need JavaScript to process your inputs locally. Enable
            JavaScript to use the workspaces; no server upload is required.
          </p>
        </noscript>
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
