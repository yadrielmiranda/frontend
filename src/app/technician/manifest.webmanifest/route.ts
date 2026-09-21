export function GET() {
  return Response.json({
    id: "/technician", name: "Authentic Evolution Technician", short_name: "AE Technician",
    description: "Internal factory collection and warehouse receipt.",
    start_url: "/technician", scope: "/technician", display: "standalone",
    background_color: "#f8fafc", theme_color: "#000000", lang: "en",
    icons: [
      { src: "/technician-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/technician-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
