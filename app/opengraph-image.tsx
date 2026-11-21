import { ImageResponse } from "next/og";
import { BrandSymbol, BrandWordmarkFull } from "@/components/brand-logo";
import { totalToolsLabel } from "@/lib/catalog-counts";

/**
 * Social preview card. Renders the official QUICKKIT identity
 * (docs/BRAND_GUIDELINES.md) with the same vector artwork as the site chrome —
 * the symbol and wordmark are shared React components, so the preview can
 * never drift from the real logo.
 */
export const alt = "QUICKKIT — Small tasks. Quick solutions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        background:
          "linear-gradient(135deg, #FAF8FF 0%, #F0E8FF 55%, #FAF8FF 100%)",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -110,
          right: -110,
          width: 420,
          height: 420,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(139,32,245,0.14) 0%, rgba(139,32,245,0) 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 56,
        }}
      >
        <BrandSymbol width={218} height={218} />
        <BrandWordmarkFull width={556} height={274} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 30,
          color: "#5F5172",
          letterSpacing: 2,
        }}
      >
        PDF · IMAGE · QR &amp; BARCODE · TEXT · CODE · CALCULATORS
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 46,
          display: "flex",
          fontSize: 26,
          color: "#6420C8",
          fontWeight: 700,
        }}
      >
        {`${totalToolsLabel} free tools — private by design`}
      </div>
    </div>,
    size,
  );
}
