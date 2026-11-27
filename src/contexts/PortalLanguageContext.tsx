"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import type { CompanyLocale } from "@/components/company/company-content";
import { listenForCompanyLanguage, persistPortalLanguage, preferredCompanyLanguage } from "@/lib/company-public-routes";
import { documentLanguageForRoute } from "@/lib/portal-language-routes";
import { useAuth } from "./AuthContext";

type PortalLanguage = {
  locale: CompanyLocale | null;
  applyPageLocale: (locale: CompanyLocale) => void;
  saving: boolean;
  changeLanguage: (locale: CompanyLocale) => Promise<void>;
};

const LanguageContext = createContext<PortalLanguage | null>(null);
// A client-side transition through the public site can remount the portal with cached layout props.
let lastPortalInstance: object | undefined;

export function PortalLanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: CompanyLocale }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [locale, setLocale] = useState<CompanyLocale | null>(initialLocale ?? null);
  const [saving, setSaving] = useState(false);
  const manualChoice = useRef<"saving" | "saved" | "session" | null>(null);
  const preferenceKnown = useRef(Boolean(initialLocale));
  const revision = useRef(0);
  const instance = useRef({});
  const verifyRestoredPortal = useRef(false);

  const applyPageLocale = useCallback((pageLocale: CompanyLocale) => {
    if (manualChoice.current) return;
    preferenceKnown.current = true;
    setLocale(pageLocale);
  }, []);

  useEffect(() => {
    if (locale) document.documentElement.lang = documentLanguageForRoute(pathname, locale);
  }, [locale, pathname]);

  useEffect(() => {
    if (lastPortalInstance && lastPortalInstance !== instance.current) verifyRestoredPortal.current = true;
    lastPortalInstance = instance.current;
    let reading: AbortController | undefined;
    async function readPreference() {
      if (reading || manualChoice.current === "saving" || manualChoice.current === "session") return;
      const request = new AbortController();
      reading = request;
      const started = revision.current;
      const hints = new URL(window.location.href).searchParams.getAll("lang");
      const hint = hints.length === 1 ? hints[0] : undefined;
      const url = hint === "en" || hint === "es" ? `/company/language?lang=${hint}` : "/company/language";
      try {
        const response = await fetch(url, { cache: "no-store", signal: request.signal });
        if (!response.ok) return;
        const { locale: stored, hasPreference } = await response.json();
        if (request.signal.aborted || started !== revision.current || (stored !== "en" && stored !== "es")) return;
        verifyRestoredPortal.current = false;
        if (!hasPreference && preferenceKnown.current && manualChoice.current !== "saved") return;
        manualChoice.current = hasPreference ? "saved" : null;
        preferenceKnown.current = true;
        setLocale(stored);
      } catch {
        // Keep the current language when the browser is offline.
      } finally {
        reading = undefined;
      }
    }
    if (verifyRestoredPortal.current) {
      void readPreference();
    } else if (isAuthenticated && !preferenceKnown.current) {
      setLocale(preferredCompanyLanguage(undefined, navigator.languages.join(",")));
      void readPreference();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void readPreference();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) void readPreference();
    }
    const stopListening = listenForCompanyLanguage(next => {
      if (manualChoice.current === "saving") return;
      revision.current++;
      manualChoice.current = "saved";
      preferenceKnown.current = true;
      setLocale(next);
    });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      reading?.abort();
      stopListening();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [isAuthenticated]);

  async function changeLanguage(next: CompanyLocale) {
    if (manualChoice.current === "saving") return;
    revision.current++;
    manualChoice.current = "saving";
    preferenceKnown.current = true;
    setLocale(next);
    setSaving(true);
    const url = new URL(window.location.href);
    const publicAuthPage = url.pathname === "/login" || url.pathname === "/login/register"
      || (url.pathname === "/" && !isAuthenticated);
    if ((publicAuthPage || url.searchParams.has("lang")) && url.searchParams.get("lang") !== next) {
      url.searchParams.set("lang", next);
      window.history.replaceState(window.history.state, "", url);
    }
    try {
      await persistPortalLanguage(next);
      manualChoice.current = "saved";
    } catch {
      manualChoice.current = "session";
      toast.error(next === "es"
        ? "El idioma cambió para esta visita. No pudimos guardarlo para la próxima."
        : "Your language changed for this visit. We couldn't save it for next time.");
    } finally {
      setSaving(false);
    }
  }

  return <LanguageContext.Provider value={{ locale, saving, changeLanguage, applyPageLocale }}>{children}</LanguageContext.Provider>;
}

export function usePortalLanguage(initialLocale?: CompanyLocale) {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("usePortalLanguage requires PortalLanguageProvider");
  const { applyPageLocale } = value;
  useEffect(() => {
    if (initialLocale) applyPageLocale(initialLocale);
  }, [initialLocale, applyPageLocale]);
  return { locale: value.locale ?? initialLocale ?? "en", saving: value.saving, changeLanguage: value.changeLanguage };
}
