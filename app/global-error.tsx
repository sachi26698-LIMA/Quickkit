"use client";

import Link from "next/link";
import { useEffect } from "react";
import { captureHandledError } from "@/lib/monitoring/error-reporter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureHandledError(error, "global");
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
          background: "#f7f5fc",
          color: "#221638",
        }}
      >
        <main
          role="alert"
          style={{
            width: "min(460px, 100%)",
            padding: "28px",
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid #e3daf2",
            boxShadow: "0 16px 40px rgba(34, 22, 56, 0.08)",
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: "1.35rem" }}>
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "0.95rem",
              lineHeight: 1.55,
              color: "#574a6e",
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
                background: "#6b28d6",
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
                border: "1px solid #d7cceb",
                color: "#221638",
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
