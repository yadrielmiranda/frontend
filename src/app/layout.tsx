// app/layout.tsx

import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/top-bar"; 
import { Providers } from "./providers";

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
  description: "Gestión de Proyectos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {/* TopBar ahora está aquí y será visible en todas las páginas */}
          <TopBar />
          
          {/* El contenido específico de cada página se renderizará aquí */}
          <main className="container mx-auto p-4 md:p-8">{children}</main>
        </Providers>
        
        {/* El Toaster para notificaciones puede quedar fuera si no necesita contexto */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}