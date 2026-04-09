import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#1a1d23",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: 600,
          fontFamily: "sans-serif",
          letterSpacing: "-0.5px",
          marginTop: "1px",
        }}
      >
        t
      </span>
    </div>,
    { ...size }
  );
}
