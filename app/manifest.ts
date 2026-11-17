import type { MetadataRoute } from "next";

/**
 * Web app manifest. Kept minimal and dependency-free: this makes QUICKKIT
 * installable and gives the service worker a stable start_url, without claiming
 * an app-like experience the site does not provide.
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
    background_color: "#fdf7f5",
    theme_color: "#3b1b4f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
