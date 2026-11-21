import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You are offline",
  description:
    "QUICKKIT is offline. Pages you have already visited still open.",
  robots: { index: false, follow: false },
};

/**
 * Served by the service worker when a navigation fails and nothing matching is
 * cached. Kept dependency-free and tiny so it precaches in a single request.
 *
 * A route of its own (`/`, not inside `(public)`) on purpose: it must render
 * without the header's catalogue read, because that read needs the network the
 * visitor has just lost.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--font-geist), Arial, sans-serif",
        color: "var(--ink, #17132F)",
        background: "var(--background, #FAF8FF)",
      }}
    >
      <div style={{ maxWidth: "34rem" }}>
        <p
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--rose-deep, #B31277)",
            margin: 0,
          }}
        >
          No connection
        </p>
        <h1 style={{ fontSize: "1.9rem", margin: "0.6rem 0 0.8rem" }}>
          You are offline
        </h1>
        <p style={{ lineHeight: 1.6, color: "var(--ink-soft, #554866)" }}>
          This page was not saved for offline use. Pages you have already
          visited — the homepage, All Tools, About and the legal pages — still
          open, and every tool that has already loaded keeps working because
          your files are processed on this device and never uploaded.
        </p>
        <p style={{ marginTop: "1.6rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "0.7rem 1.2rem",
              borderRadius: "12px",
              background: "var(--plum, #30105F)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Try the homepage
          </Link>
        </p>
        <p
          style={{
            marginTop: "1.4rem",
            fontSize: "0.85rem",
            color: "var(--secondary, #5F5172)",
          }}
        >
          <Link href="/tools" style={{ color: "inherit" }}>
            All tools
          </Link>
          {" · "}
          <Link href="/about" style={{ color: "inherit" }}>
            About
          </Link>
          {" · "}
          <Link href="/privacy" style={{ color: "inherit" }}>
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
