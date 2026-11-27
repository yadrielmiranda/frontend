"use client";

import { useEffect, useState } from "react";
import { PortalLanguageSwitch } from "@/components/portal-language-switch";
import { companyPath, type CompanyLocale, type CompanyPageName } from "./company-content";
import { announceCompanyLanguage, listenForCompanyLanguage } from "@/lib/company-public-routes";

const pendingChoiceKey = "company-language-destination";

export function CompanyLanguageLink({ page, locale }: { page: CompanyPageName; locale: CompanyLocale }) {
  const [suffix, setSuffix] = useState("");
  useEffect(() => {
    // The preference link saves the cookie before redirecting to this page.
    try {
      if (window.sessionStorage.getItem(pendingChoiceKey) === window.location.pathname) {
        window.sessionStorage.removeItem(pendingChoiceKey);
        announceCompanyLanguage(locale);
      }
    } catch { /* The preference link works without storage. */ }
    const stopListening = listenForCompanyLanguage(next => {
      if (next === locale) return;
      const destination = new URL(window.location.href);
      destination.pathname = companyPath(page, next);
      if (destination.pathname === "/company") destination.searchParams.set("lang", "en");
      else destination.searchParams.delete("lang");
      window.location.replace(destination.href);
    });
    const sync = () => setSuffix(window.location.search + window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      stopListening();
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [page, locale]);

  const alternate = locale === "en" ? "es" : "en";
  function hrefForLanguage(language: CompanyLocale) {
    const path = companyPath(page, language);
    return `${language === locale ? "" : "/company/language"}${path}${suffix}`;
  }

  function rememberDestination(language: CompanyLocale) {
    try { window.sessionStorage.setItem(pendingChoiceKey, companyPath(page, language)); } catch { /* Optional for cross-tab updates. */ }
  }

  return (
    <span className="company-language">
      <PortalLanguageSwitch locale={locale} hrefForLanguage={hrefForLanguage} onFollowLanguage={rememberDestination} />
      <noscript>
        <a href={hrefForLanguage(alternate)} hrefLang={alternate} lang={alternate} rel="nofollow">
          {alternate === "es" ? "Español" : "English"}
        </a>
      </noscript>
    </span>
  );
}
