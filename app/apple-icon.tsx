import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "#1a1d23",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: 110,
          fontWeight: 600,
          fontFamily: "sans-serif",
          letterSpacing: "-2px",
          marginTop: "4px",
        }}
      >
        t
      </span>
    </div>,
    { ...size }
  );
}
