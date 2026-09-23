import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

/**
 * Share card. Without one, every link posted to LinkedIn, Slack or WhatsApp
 * renders as a bare line of text — a poor first impression for a site whose
 * whole pitch is that the writing has been read by a person.
 *
 * Generated rather than shipped as a file so it stays in step with the site
 * name and tagline in settings.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Inkora — every piece is read by an editor before it is published";

export default async function OpengraphImage() {
  const settings = await getSettings();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: "#FFFFFF",
          padding: "72px 80px", fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 13, background: "#376D4C",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 30, fontWeight: 700,
            }}
          >
            I
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#1A1A17" }}>
            {settings.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 62, lineHeight: 1.1, color: "#1A1A17", letterSpacing: "-0.02em" }}>
            {settings.tagline}
          </div>
          <div style={{ fontSize: 28, color: "#376D4C" }}>
            Every piece is read by an editor before it is published.
          </div>
        </div>

        <div style={{ display: "flex", height: 6, background: "#376D4C", width: 180 }} />
      </div>
    ),
    size
  );
}
