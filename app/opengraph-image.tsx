import { ImageResponse } from "next/og";
export const alt = "QUICKKIT — Small tasks. Quick solutions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FDF7F5",
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "sans-serif",
        color: "#1A0F2E",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 700,
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#3B1B4F",
            borderRadius: 14,
            width: 52,
            height: 52,
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
        QUICK<span style={{ color: "#B93A73", marginLeft: -14 }}>KIT</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: -3,
          marginTop: 65,
        }}
      >
        <span>Small tasks.</span>
        <span style={{ color: "#B93A73" }}>Quick solutions.</span>
      </div>
      <div style={{ fontSize: 27, color: "#6A5570", marginTop: 34 }}>
        Free browser tools. No sign-up. Zero hassle.
      </div>
    </div>,
    size,
  );
}
