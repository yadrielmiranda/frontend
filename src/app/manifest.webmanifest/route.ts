export function GET() {
  return Response.json({
    id: "/",
    name: "Authentic Evolution",
    short_name: "Authentic",
    description: "Authentic Evolution customer and operations portal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    lang: "en",
    icons: [
      { src: "/portal-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/portal-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
