"use client";

import Link from "next/link";
import { createContext, useContext, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { companyRegistrationHref, type CompanyLocale } from "./company-content";

const RegistrationHref = createContext<string | null>(null);

function subscribeToLocation(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}

export function CompanyRegistrationLinks({ locale, initialHref, children }: {
  locale: CompanyLocale;
  initialHref?: string;
  children: ReactNode;
}) {
  // Editorial pages have static HTML. Their links pick up the current query on hydration.
  const search = useSyncExternalStore(subscribeToLocation, () => window.location.search, () => "");
  const href = initialHref ?? companyRegistrationHref(locale, new URLSearchParams(search));
  return <RegistrationHref.Provider value={href}>{children}</RegistrationHref.Provider>;
}

export function CompanyRegistrationLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const href = useContext(RegistrationHref);
  if (!href) throw new Error("CompanyRegistrationLink needs CompanyRegistrationLinks");
  return <Link {...props} href={href} />;
}
