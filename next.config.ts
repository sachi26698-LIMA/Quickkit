import type { NextConfig } from "next";
import { indexingEnabled } from "./lib/launch";
import { BRANDS, isBrandRecordIndexable } from "./lib/tools/batch-code/brands";
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
// `base-uri` and `form-action` stay 'self', and framing *this* site is refused
// (`frame-ancestors 'none'` in every deployed environment). The single,
// documented exception is the opt-in local preview sandbox described below,
// which names `https://*.e2b.app` instead; it is never enabled on a deployment.
// Only the resource types AdSense uses are widened — script, frame, img and
// connect.
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
//
// Two origins have to be named, not one. The preview document is served from
// the sandbox host, but it is framed by the agent UI that embeds it — and
// `frame-ancestors` checks the *whole* ancestor chain, not just the immediate
// parent. Allowing only `https://*.e2b.app` therefore left the real embedding
// page (`https://arena.ai`) refused, and the browser rendered an empty frame
// instead of the app: a blank preview with no console-visible error in the
// sandbox, because the block happens on the far side of the proxy.
const previewFraming = process.env.ALLOW_SANDBOX_PREVIEW === "1";
const FRAME_ANCESTORS = previewFraming
  ? "frame-ancestors 'self' https://*.e2b.app https://arena.ai https://*.arena.ai"
  : "frame-ancestors 'none'";

// Supabase is contacted only from the server: `lib/supabase/*` is `server-only`,
// every session read runs in a Server Component, Route Handler or `proxy.ts`,
// and no client component imports a browser Supabase client. `connect-src`
// therefore does not need the Supabase API origin — a browser made to respect
// this policy never issues that request, so allowing it would only widen the
// policy without buying anything.
//
// `tests/supabase-csp.test.ts` asserts both halves of that claim — that no
// client component reaches Supabase, and that the policy therefore carries no
// Supabase origin — so adding a browser-side call is a deliberate act that
// trips a test instead of failing silently in the browser.

// `connect-src` is the one directive that differs per route. It is built from
// an explicit source list and merged structurally (see `withConnectSources`)
// rather than by rewriting the finished policy string, so a route can only ever
// *add* origins — never drop one the base policy already allows.
const CONNECT_SRC_SOURCES = ["'self'", ...ADSENSE_CONNECTIONS];

const CONNECT_SRC = `connect-src ${CONNECT_SRC_SOURCES.join(" ")}`;

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
  CONNECT_SRC,
  `frame-src ${ADSENSE_FRAMES.join(" ")}`,
].join("; ");

/**
 * Return the policy with `extraSources` appended to `connect-src`, keeping
 * every origin the base policy already lists.
 *
 * The previous implementation was
 * `CSP.replace("connect-src 'self'", "connect-src 'self' " + host)`. That
 * happens to preserve the base list, but it is a string rewrite of a security
 * header: any future edit to the base spelling would silently drop origins
 * instead of failing loudly, and the intent (merge, never subtract) was not
 * expressed anywhere. Rebuilding from the source list makes the invariant
 * explicit and testable.
 */
export function withConnectSources(policy: string, extraSources: string[]) {
  if (extraSources.length === 0) return policy;
  const merged = [...CONNECT_SRC_SOURCES, ...extraSources];
  const deduped = merged.filter(
    (source, index) => merged.indexOf(source) === index,
  );
  return policy.replace(CONNECT_SRC, `connect-src ${deduped.join(" ")}`);
}

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
      {
        // Search Console reported external/user discovery of the pluralized
        // /tools/words-to-pdf path. Redirect it permanently to the canonical
        // singular Word to PDF route instead of returning 404.
        source: "/tools/words-to-pdf",
        destination: "/tools/word-to-pdf",
        permanent: true,
      },
      {
        // The stand-alone Copyright & DMCA policy was merged into the
        // Intellectual Property policy so a reader has one document to consult
        // instead of two that repeated each other. The fragment is carried over
        // by the browser on a 308, so /copyright#reporting still lands on the
        // equivalent heading, which keeps the same id on the merged page.
        source: "/copyright",
        destination: "/intellectual-property",
        permanent: true,
      },
    ];
  },
  async headers() {
    // Three pages can use a camera — the QR Code Scanner, the Barcode
    // Studio's scanner tab and the stand-alone Barcode Scanner. Excluding
    // those three exact paths from the default `camera=()` rule guarantees
    // each response emits a single Permissions-Policy header instead of two
    // overlapping headers whose intersection in Chromium/WebKit would stay
    // `camera=()`. Microphone and location stay off everywhere.
    const defaultPermissionsSource =
      "/:path((?!tools/(?:qr-code-scanner|barcode-generator|barcode-scanner)(?:/)?$).*)";

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
        ],
      },
      {
        source: defaultPermissionsSource,
        headers: [
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
            value: withConnectSources(CSP, host.split(" ").filter(Boolean)),
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
              source: "/admin/:path*",
              headers: [
                {
                  key: "X-Robots-Tag",
                  value: "noindex, nofollow, noarchive",
                },
              ],
            },
            {
              source: "/auth/callback",
              headers: [
                {
                  key: "X-Robots-Tag",
                  value: "noindex, nofollow, noarchive",
                },
              ],
            },
            ...BRANDS.filter((brand) => !isBrandRecordIndexable(brand)).map(
              (brand) => ({
                source: `/tools/batch-code-checker/brand/${brand.slug}`,
                headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
              }),
            ),
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
