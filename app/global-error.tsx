"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandSymbol } from "@/components/brand-logo";
import { reportClientError } from "@/lib/monitoring/client-report";
import { captureHandledError } from "@/lib/monitoring/error-reporter";

/**
 * Full-page error boundary. Styled with the official brand palette
 * (docs/BRAND_GUIDELINES.md) via inline styles so it renders even when the
 * stylesheet failed to load alongside the app.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureHandledError(error, "global");
    reportClientError(error, "global");
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#FAF8FF",
          color: "#17132F",
        }}
      >
        <main
          role="alert"
          style={{
            width: "min(460px, 100%)",
            padding: "28px",
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid #F0E8FF",
            boxShadow: "0 16px 40px rgba(23, 19, 47, 0.08)",
          }}
        >
          <div style={{ width: 64, height: 64, marginBottom: 14 }}>
            <BrandSymbol width={64} height={64} />
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: "1.35rem" }}>
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "0.95rem",
              lineHeight: 1.55,
              color: "#5F5172",
            }}
          >
            QUICKKIT could not complete this view. Browser-first tool files stay
            local and were not uploaded.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: "#6420C8",
                color: "#ffffff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid #E4D8F8",
                color: "#30105F",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Return home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
