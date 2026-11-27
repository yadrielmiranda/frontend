"use client";

import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { captureCompanyCampaign, readCompanyCampaign } from "@/lib/company-campaign";
import { sendCompanyPageView } from "@/lib/registration-pixel";
import { companyDealerRegistrationHref, companyRegistrationHref, type CompanyLocale, type CompanyPageName } from "./company-content";

const RegistrationLinks = createContext<{ client: string; dealer: string } | null>(null);

export function CompanyRegistrationLinks({ page, locale, initialHref, initialDealerHref, children }: {
  page: CompanyPageName;
  locale: CompanyLocale;
  initialHref?: string;
  initialDealerHref: string;
  children: ReactNode;
}) {
  const fallback = initialHref ?? companyRegistrationHref(locale, []);
  const [links, setLinks] = useState({ client: fallback, dealer: initialDealerHref });
  useEffect(() => {
    function sync() {
      if (page === "company") {
        captureCompanyCampaign();
        sendCompanyPageView();
      }
      const query = new URLSearchParams(window.location.search);
      const hasAttribution = [...query.keys()].some(key => key === "ref" || key === "fbclid" || key.startsWith("utm_"));
      const campaign = hasAttribution ? query : readCompanyCampaign() ?? query;
      setLinks({
        client: companyRegistrationHref(locale, campaign),
        dealer: companyDealerRegistrationHref(locale, campaign),
      });
    }
    sync();
    window.addEventListener("pageshow", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [page, locale, initialHref]);
  return <RegistrationLinks.Provider value={links}>{children}</RegistrationLinks.Provider>;
}

export function CompanyRegistrationLink({ dealer = false, ...props }: Omit<ComponentProps<"a">, "href"> & { dealer?: boolean }) {
  const links = useContext(RegistrationLinks);
  if (!links) throw new Error("CompanyRegistrationLink needs CompanyRegistrationLinks");
  return <a {...props} href={dealer ? links.dealer : links.client} />;
}
