import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Technician | Authentic Evolution",
  description: "Internal factory collection and warehouse receipt.",
  manifest: "/technician/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AE Technician", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  return children;
}
