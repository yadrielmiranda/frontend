"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/app-shell";
import { GlobalLoginDialog } from "@/components/auth/global-login-dialog";
import { LoginDialogBridge } from "@/components/auth/login-dialog-bridge";
import { PortalInstallProvider } from "@/components/pwa/portal-install-provider";
import { isCompanyPublicRoute } from "@/lib/company-public-routes";
import { CompanyBrandingProvider } from "@/contexts/CompanyBrandingContext";
import { PortalLanguageProvider } from "@/contexts/PortalLanguageContext";

export function SiteShell({ children, initialLocale }: {
  children: ReactNode;
  initialLocale?: "en" | "es";
}) {
  const pathname = usePathname();

  // Public company pages render their server content without session requests,
  // account redirects, portal navigation, or sign-in/terms overlays.
  if (isCompanyPublicRoute(pathname)) return children;
  if (pathname.startsWith("/login/dealer-registration/")) {
    return <CompanyBrandingProvider>
      <PortalLanguageProvider initialLocale={initialLocale}>{children}</PortalLanguageProvider>
    </CompanyBrandingProvider>;
  }

  return (
    <Providers initialLocale={initialLocale}>
      <PortalInstallProvider>
        <LoginDialogBridge />
        <GlobalLoginDialog />
        <AppShell>{children}</AppShell>
      </PortalInstallProvider>
    </Providers>
  );
}
