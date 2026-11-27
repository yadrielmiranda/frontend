"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TransparentAuthLogo } from "./transparent-auth-logo";
import { useCompanyBranding } from "@/contexts/CompanyBrandingContext";

type AuthPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  locale?: "en" | "es";
  languageSwitch?: ReactNode;
  fullPageNavigation?: boolean;
  contentMaxWidth?: "max-w-md" | "max-w-lg" | "max-w-2xl";
};

export function AuthPageShell({
  title,
  description,
  children,
  locale,
  languageSwitch,
  fullPageNavigation = false,
  contentMaxWidth = "max-w-md",
}: AuthPageShellProps) {
  const { companyName } = useCompanyBranding();
  const AboutLink = fullPageNavigation ? "a" : Link;

  return (
    <div lang={locale} className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#050505] px-4 py-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,1))]" />

      <div className="absolute inset-0 opacity-[0.10]">
        <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <nav aria-label={locale === "es" ? "Información de la empresa" : "Company information"} className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-end gap-4 px-4">
        {languageSwitch}
        <AboutLink
          href={locale === "es" ? "/es/company" : locale === "en" ? "/company?lang=en" : "/company"}
          {...(!fullPageNavigation ? { prefetch: false } : {})}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-5 py-2 text-sm font-medium text-white/85 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          {locale === "es" ? "Sobre nosotros" : "About us"} <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </AboutLink>
      </nav>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_680px] lg:gap-14">
          <section className="flex flex-col items-center text-center lg:items-center lg:text-center">
            <TransparentAuthLogo companyName={companyName} />

            <div className="mt-2 lg:mt-4">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {title}
              </h1>

              <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-red-600" />

              <p className="mt-4 max-w-md text-sm text-white/55 sm:text-base">
                {description}
              </p>
            </div>
          </section>

          <section className={`mx-auto w-full ${contentMaxWidth}`}>
            {children}

            <p className="mt-5 text-center text-xs text-white/35">
              © {new Date().getFullYear()} {companyName}. {locale === "es" ? "Todos los derechos reservados." : "All rights reserved."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
