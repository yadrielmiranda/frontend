"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/top-bar";
import Link from 'next/link';
import { PlatformTermsGate } from '@/components/platform-terms/platform-terms-gate';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const companyPath = pathname === "/company";
  const technicianPath = pathname === "/technician" || pathname.startsWith("/technician/");
  const technicianAccount = user?.role?.name === "technician";
  useEffect(() => {
    if (technicianAccount && !technicianPath && !companyPath) router.replace("/technician");
  }, [technicianAccount, technicianPath, companyPath, router]);

  // La información comercial se muestra desde el HTML inicial, sin esperar la sesión.
  if (companyPath) return <main className="min-h-dvh bg-white">{children}</main>;

  if (technicianPath) return <main className="min-h-dvh bg-slate-50">{children}</main>;
  if (technicianAccount) return <main className="p-8 text-center" role="status">Opening technician workspace…</main>;

  const isPublicAuthPage = pathname === "/" || pathname.startsWith("/login") || pathname === "/terms" || pathname.startsWith("/terms/") || pathname === "/sms" || pathname.startsWith("/sms/");

  // Los enlaces compartidos muestran el documento sin la navegación del portal.
  const isPublicDocumentPage = pathname.startsWith("/public/");
  const showTopBar =
    !isPublicDocumentPage && (isLoading || isAuthenticated || !isPublicAuthPage);

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
      {!isPublicDocumentPage && (
        <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-4 py-5 text-center text-xs text-slate-500">
          <Link href="/company" className="underline underline-offset-4">Company</Link>
          <Link href="/terms" className="underline underline-offset-4">Terms and Conditions</Link>
        </footer>
      )}
    </PlatformTermsGate>
  );
}
