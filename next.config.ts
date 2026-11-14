import type { NextConfig } from "next";
import { indexingEnabled } from "./lib/launch";
import { legacySecurityRedirects } from "./lib/tools/security/consolidation";

// ─────────────────────────────────────────────────────────────────────────────
// Content-Security-Policy.
//
// One policy, enforced in production. `'wasm-unsafe-eval'` permits WebAssembly
// compilation (on-device OCR in PDF to Word) without enabling JavaScript eval.
//
// Everything is same-origin except the hosts Google AdSense actually needs. The
// AdSense loader pulls further scripts, ad iframes, creatives and beacons from a
// handful of Google hosts, so a policy that allows only the loader leaves every
// slot blank — see docs/ADSENSE_CSP.md for the reasoning and the hosts.
//
// No wildcards: every host is listed explicitly, `object-src` stays 'none',
// `base-uri` and `form-action` stay 'self', and framing *this* site stays
// forbidden (frame-ancestors 'none'). Only the resource types AdSense uses are
// widened — script, frame, img and connect.
// ─────────────────────────────────────────────────────────────────────────────
const ADSENSE_SCRIPTS = [
  "https://pagead2.googlesyndication.com", // the loader itself
  "https://tpc.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://www.googletagservices.com",
  "https://adservice.google.com",
  "https://partner.googleadservices.com",
  "https://fundingchoicesmessages.google.com", // consent message (CMP)
];

const ADSENSE_FRAMES = [
  "https://googleads.g.doubleclick.net", // the ad iframe
  "https://pagead2.googlesyndication.com", // Google-managed formats (vignette)
  "https://tpc.googlesyndication.com",
  "https://www.google.com",
  "https://ep1.adtrafficquality.google",
  "https://ep2.adtrafficquality.google",
  "https://fundingchoicesmessages.google.com", // consent message + its dismiss control
];

const ADSENSE_IMAGES = [
  "https://pagead2.googlesyndication.com",
  "https://tpc.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://www.google.com",
  "https://www.gstatic.com",
];

const ADSENSE_CONNECTIONS = [
  "https://pagead2.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://tpc.googlesyndication.com",
  "https://www.google.com",
  "https://ep1.adtrafficquality.google",
  "https://ep2.adtrafficquality.google",
  "https://fundingchoicesmessages.google.com",
  "https://csi.gstatic.com",
];

// Framing this site stays forbidden: that is the clickjacking boundary. The one
// exception is a local preview sandbox, where the app is deliberately served
// inside an iframe on `https://<port>-<sandbox>.e2b.app`. It is opt-in with
// `ALLOW_SANDBOX_PREVIEW=1` (never set in production, and never implied by the
// E2B_SANDBOX environment alone, so a test run cannot inherit it), and it names
// the preview origin rather than a bare wildcard.
const previewFraming = process.env.ALLOW_SANDBOX_PREVIEW === "1";
const FRAME_ANCESTORS = previewFraming
  ? "frame-ancestors 'self' https://*.e2b.app"
  : "frame-ancestors 'none'";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  FRAME_ANCESTORS,
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${ADSENSE_SCRIPTS.join(" ")}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${ADSENSE_IMAGES.join(" ")}`,
  "font-src 'self'",
  `connect-src 'self' ${ADSENSE_CONNECTIONS.join(" ")}`,
  `frame-src ${ADSENSE_FRAMES.join(" ")}`,
].join("; ");

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
      ...legacySecurityRedirects,
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
      // Only these explicit routes may contact the opt-in DNS/IP services.
      ...[
        {
          source: "/tools/dns-email-security",
          host: "https://cloudflare-dns.com",
        },
        {
          source: "/tools/url-network-privacy",
          host: "https://api.ipify.org https://api64.ipify.org",
        },
        { source: "/tools/dns-lookup", host: "https://cloudflare-dns.com" },
        {
          source: "/tools/dnssec-status-checker",
          host: "https://cloudflare-dns.com",
        },
        {
          source: "/tools/public-ip-information",
          host: "https://api.ipify.org https://api64.ipify.org",
        },
      ].map(({ source, host }) => ({
        source,
        headers: [
          {
            key: enforcing
              ? "Content-Security-Policy"
              : "Content-Security-Policy-Report-Only",
            value: CSP.replace(
              "connect-src 'self'",
              `connect-src 'self' ${host}`,
            ),
          },
        ],
      })),
      // Three pages can use a camera — the QR Code Scanner, the Barcode
      // Studio's scanner tab and the stand-alone Barcode Scanner. A
      // Permissions-Policy on `/:path*` would otherwise
      // be inherited by them and the browser would refuse getUserMedia even
      // after the visitor granted permission, so these rules — which win for
      // the exact paths — re-allow the camera for those pages only. Microphone
      // and location stay off everywhere. Nothing else is widened.
      {
        source: "/tools/qr-code-scanner",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/tools/barcode-generator",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/tools/barcode-scanner",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      ...(indexingEnabled
        ? [
            {
              // Crawlable in robots.txt so bots can read these headers + meta
              // tags instead of indexing link-discovered blocked URLs.
              source: "/saved",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
            {
              source: "/qr",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
            {
              source: "/category/ai-tools",
              headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
            },
            {
              // Parameterized search & category filter views on /tools stay
              // functional for users while consolidating indexing to /tools
              // and /category/[slug].
              source: "/tools",
              has: [{ type: "query" as const, key: "q" }],
              headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
            },
            {
              source: "/tools",
              has: [{ type: "query" as const, key: "category" }],
              headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
            },
            {
              // The checker accepts a ?brand= preselection from a brand
              // record. That view is a convenience, not a second page: keep the
              // canonical on the clean tool URL.
              source: "/tools/batch-code-checker",
              has: [{ type: "query" as const, key: "brand" }],
              headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
            },
          ]
        : []),
    ];
  },
};
export default config;
