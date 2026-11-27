// src/app/layout.tsx
import { Toaster } from "sonner";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// @ts-ignore: CSS import without type declarations
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { SiteDocument } from "@/components/site-document";
import { headers } from "next/headers";
import { requestPortalLanguage } from "@/lib/public-language-server";
import { PORTAL_LANGUAGE_HINT_HEADER } from "@/lib/portal-language-routes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Authentic Evolution",
  description: "Project Management",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Authentic Evolution", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hint = (await headers()).get(PORTAL_LANGUAGE_HINT_HEADER);
  const initialLocale = await requestPortalLanguage(hint ?? undefined);
  return (
    <SiteDocument initialLocale={initialLocale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SiteShell initialLocale={initialLocale}>{children}</SiteShell>

        {/* Toaster abajo para que no tape dropdowns */}
        <Toaster richColors position="bottom-left" />
      </body>
    </SiteDocument>
  );
}
