// src/app/layout.tsx
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// @ts-ignore: CSS import without type declarations
import "./globals.css";
import TopBar from "@/components/top-bar";
import { Providers } from "./providers";

import { GlobalLoginDialog } from "@/components/auth/global-login-dialog";
import { LoginDialogBridge } from "@/components/auth/login-dialog-bridge";

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
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <LoginDialogBridge />
          <GlobalLoginDialog />

          <TopBar />

          {/* ✅ un poco de padding arriba para que respire bajo la barra */}
          <main className="container mx-auto p-4 md:p-8 pt-6">{children}</main>
        </Providers>

        {/* ✅ Toaster abajo para que no tape dropdowns */}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
