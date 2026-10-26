import { ImageResponse } from "next/og";
import { MARK_PATH } from "@/lib/brandMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own rounded mask, so the background is a full square.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#41252a" }}>
        <svg width="132" height="132" viewBox="4 4 24 24">
          <path d={MARK_PATH} fill="#fbf8f6" />
        </svg>
      </div>
    ),
    size,
  );
}
