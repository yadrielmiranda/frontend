// src/app/layout.tsx
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/top-bar";
import { Providers } from "./providers";

// ✅ Montamos el modal global + el bridge de eventos
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
  title: "Impact +",
  description: "Project Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {/* ✅ Listener global: si apiFetch dispara auth:login-required, abre el login */}
          <LoginDialogBridge />

          {/* ✅ Modal global: vive siempre montado para que pueda abrirse desde cualquier lugar */}
          <GlobalLoginDialog />

          <TopBar />
          <main className="container mx-auto p-4 md:p-8">{children}</main>
        </Providers>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
