import type { MetadataRoute } from "next";

/**
 * Web app manifest. Kept minimal and dependency-free: this makes QUICKKIT
 * installable and gives the service worker a stable start_url, without claiming
 * an app-like experience the site does not provide.
 *
 * Colours and icons follow docs/BRAND_GUIDELINES.md; the raster set lives in
 * `public/brand/` (see docs/BRAND_ASSET_INVENTORY.md).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QUICKKIT — Free online PDF, image, QR and code tools",
    short_name: "QUICKKIT",
    description:
      "Free browser-first tools for PDFs, images, OCR, QR codes, code formatting and calculators. Your files are processed on your device.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8FF",
    theme_color: "#30105F",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
