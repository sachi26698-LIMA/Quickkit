import { ImageResponse } from "next/og";
export const alt = "QUICKKIT — Handy tools. Zero hassle.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#f6f7fb",
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "sans-serif",
        color: "#171b2e",
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
            background: "#6657e8",
            color: "white",
            borderRadius: 14,
            padding: "5px 16px",
          }}
        >
          Q
        </span>
        QUICK<span style={{ color: "#6657e8", marginLeft: -14 }}>KIT</span>
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
        <span style={{ color: "#6657e8" }}>Quick solutions.</span>
      </div>
      <div style={{ fontSize: 27, color: "#62697e", marginTop: 34 }}>
        Eight browser tools. No sign-up. Zero hassle.
      </div>
    </div>,
    size,
  );
}
