"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/top-bar";
import Link from 'next/link';
import { PlatformTermsGate } from '@/components/platform-terms/platform-terms-gate';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicAuthPage = pathname === "/" || pathname.startsWith("/login") || pathname === "/terms" || pathname.startsWith("/terms/") || pathname === "/sms" || pathname.startsWith("/sms/");

  const showTopBar = isLoading || isAuthenticated || !isPublicAuthPage;

  return (
    <PlatformTermsGate>
      {showTopBar && <TopBar />}

      <main
        className={
          showTopBar
            ? "w-full px-4 py-6 sm:px-6 lg:px-8"
            : "w-full"
        }
      >
        {children}
      </main>
      {!pathname.startsWith('/public/') && (
        <footer className="px-4 py-5 text-center text-xs text-slate-500">
          <Link href="/terms" className="underline underline-offset-4">Terms and Conditions</Link>
        </footer>
      )}
    </PlatformTermsGate>
  );
}
