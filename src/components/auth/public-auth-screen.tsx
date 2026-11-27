"use client";

import dynamic from "next/dynamic";
import { CardLogin } from "@/components/card-login";
import { PortalLanguageSwitch } from "@/components/portal-language-switch";
import { PortalInstallButton } from "@/components/pwa/portal-install-button";
import { AuthPageShell } from "./auth-page-shell";
import { SiteFooter } from "@/components/site-footer";
import type { CompanyLocale } from "@/components/company/company-content";
import { registrationText } from "@/lib/registration-language";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";

const CardRegister = dynamic(() => import("@/components/card-register").then(module => module.CardRegister));

const copy = {
  en: {
    title: "Client Access",
    description: "Create your client account to access estimates and project details.",
  },
  es: {
    title: "Acceso de clientes",
    description: "Crea tu cuenta para acceder a tus cotizaciones y a los detalles de tu proyecto.",
  },
};

type PublicAuthProps = { initialLocale: CompanyLocale } & (
  | { mode: "register"; referralCode?: string }
  | { mode: "login"; registrationRequestId?: number; firstEstimate?: boolean }
);

export function PublicAuthScreen(props: PublicAuthProps) {
  const { isAuthenticated } = useAuth();
  const { locale, saving, changeLanguage } = usePortalLanguage(props.initialLocale);
  const registering = props.mode === "register";
  const firstEstimate = !registering && props.firstEstimate;
  const loginTitle = firstEstimate ? "Your account is ready" : "Welcome";
  const loginDescription = firstEstimate ? "Sign in to create your first estimate." : "Professional quoting for impact windows and doors.";

  return (
    <>
      <AuthPageShell
        locale={locale}
        title={registering ? copy[locale].title : registrationText(locale, loginTitle)}
        description={registering ? copy[locale].description : registrationText(locale, loginDescription)}
        contentMaxWidth={registering ? "max-w-2xl" : "max-w-md"}
        fullPageNavigation={registering}
        languageSwitch={!isAuthenticated && <PortalLanguageSwitch locale={locale} onChange={changeLanguage} saving={saving} />}
      >
        {registering ? (
          <CardRegister locale={locale} referralCode={props.referralCode} />
        ) : (
          <>
            <CardLogin appearance="dark" locale={locale} firstEstimate={props.firstEstimate} registrationRequestId={props.registrationRequestId} />
            <PortalInstallButton appearance="dark" locale={locale} />
          </>
        )}
      </AuthPageShell>
      <SiteFooter locale={locale} fullPageNavigation={registering} />
    </>
  );
}
