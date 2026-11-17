"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/app-shell";
import { GlobalLoginDialog } from "@/components/auth/global-login-dialog";
import { LoginDialogBridge } from "@/components/auth/login-dialog-bridge";
import { PortalInstallProvider } from "@/components/pwa/portal-install-provider";
import { isCompanyPublicRoute } from "@/lib/company-public-routes";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Public company pages render their server content without session requests,
  // account redirects, portal navigation, or sign-in/terms overlays.
  if (isCompanyPublicRoute(pathname)) return children;

  return (
    <Providers>
      <PortalInstallProvider>
        <LoginDialogBridge />
        <GlobalLoginDialog />
        <AppShell>{children}</AppShell>
      </PortalInstallProvider>
    </Providers>
  );
}
