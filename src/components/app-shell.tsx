"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
import { isLocalizedPortalPage } from "@/lib/portal-language-routes";
import TopBar from "@/components/top-bar";
import { SiteFooter } from "@/components/site-footer";
import { PlatformTermsGate } from '@/components/platform-terms/platform-terms-gate';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { locale } = usePortalLanguage();
  const router = useRouter();
  const companyPath = pathname === "/company";
  const hasPublicAuthScreen = pathname === "/login/register" || pathname === "/login" || (pathname === "/" && !isAuthenticated);
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
    !isPublicDocumentPage && ((!hasPublicAuthScreen && isLoading) || isAuthenticated || !isPublicAuthPage);

  return (
    <PlatformTermsGate>
      {showTopBar && <TopBar />}

      <main
        lang={isLocalizedPortalPage(pathname) ? locale : "en"}
        className={
          showTopBar
            ? "w-full px-4 py-6 sm:px-6 lg:px-8"
            : "w-full"
        }
      >
        {children}
      </main>
      {!isPublicDocumentPage && !hasPublicAuthScreen && (
        <SiteFooter locale={locale} />
      )}
    </PlatformTermsGate>
  );
}
