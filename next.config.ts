import type { NextConfig } from "next";
import { indexingEnabled } from "./lib/launch";
const config: NextConfig = {
  poweredByHeader: false,
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
            key: "Content-Security-Policy",
            // 'wasm-unsafe-eval' permits WebAssembly compilation (on-device
            // OCR in PDF to Word) without enabling JavaScript eval.
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'",
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
