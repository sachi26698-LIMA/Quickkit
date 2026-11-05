import type { NextConfig } from "next";
import { indexingEnabled } from "./lib/launch";

/**
 * One policy, enforced in production. `'wasm-unsafe-eval'` permits WebAssembly
 * compilation (on-device OCR in PDF to Word) without enabling JavaScript eval.
 */
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; " +
  "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; " +
  "frame-src 'none'; frame-ancestors 'none'";

// `next dev` cannot run under this policy: React's development runtime calls
// eval() (to reconstruct component stacks across realms) and the dev server's
// hot-reload socket is `ws:`, which `connect-src 'self'` does not match. With
// enforcement on, hydration aborts and every client tool — QR Code Studio
// included — stays mounted inside its disabled pre-hydration fieldset, i.e. a
// frozen grey form.
//
// The fix is not `'unsafe-eval'`: a policy can only protect users where the
// artifact they receive is the one that was built, which is production. During
// development the identical policy is still delivered, but in
// `Content-Security-Policy-Report-Only` mode — real violations keep appearing in
// the console so a mistake is still caught locally, nothing is blocked, and no
// eval allowance is granted in either mode.
const enforcing = process.env.NODE_ENV === "production";

// The dev server also guards its own endpoints (/_next/hmr, RSC payloads)
// against cross-site requests, trusting `localhost` and the *bound* hostname.
// This app binds to 0.0.0.0 so a phone or a preview proxy can reach it, which
// means `http://127.0.0.1:<port>` was never on that trust list and hot reload
// silently died. Loopback is added back, plus the sandbox's preview domain only
// when running inside such a sandbox — a normal `npm run dev` elsewhere keeps
// Next's default protection untouched.
const devAllowedOrigins = [
  "127.0.0.1",
  "::1",
  ...(process.env.E2B_SANDBOX ? ["*.e2b.app"] : []),
];

const config: NextConfig = {
  poweredByHeader: false,
  // The built-in DOCX renderer reads its bundled Noto fonts from disk at
  // request time. Without this the fonts are missing from a traced/standalone
  // deployment and every conversion would fail its engine health check.
  outputFileTracingIncludes: {
    "/api/word-to-pdf": ["./assets/noto/**"],
  },
  ...(enforcing ? {} : { allowedDevOrigins: devAllowedOrigins }),
  async redirects() {
    return [
      {
        // The combined Image & PDF Converter was split into four separate
        // tools. Existing bookmarks, saved cards and inbound links keep
        // working instead of hitting a 404.
        source: "/tools/image-converter",
        destination: "/tools/image-to-image",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...(!indexingEnabled
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
            : []),
          {
            key: enforcing
              ? "Content-Security-Policy"
              : "Content-Security-Policy-Report-Only",
            value: CSP,
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
