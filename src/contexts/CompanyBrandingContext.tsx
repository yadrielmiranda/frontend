"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getPublicCompanyBranding,
  type Branding,
} from "@/app/api/brandings.api";

type CompanyBrandingContextValue = {
  branding: Branding | null;
  companyName: string;
  refreshCompanyBranding: () => Promise<void>;
};

const CompanyBrandingContext =
  createContext<CompanyBrandingContextValue | null>(null);

export function CompanyBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);

  const refreshCompanyBranding = useCallback(async () => {
    try {
      setBranding(await getPublicCompanyBranding());
    } catch {
      setBranding(null);
    }
  }, []);

  useEffect(() => {
    void refreshCompanyBranding();
  }, [refreshCompanyBranding]);

  const value = useMemo(
    () => ({
      branding,
      companyName: branding?.name?.trim() || "Company",
      refreshCompanyBranding,
    }),
    [branding, refreshCompanyBranding],
  );

  return (
    <CompanyBrandingContext.Provider value={value}>
      {children}
    </CompanyBrandingContext.Provider>
  );
}

export function useCompanyBranding() {
  const context = useContext(CompanyBrandingContext);

  if (!context) {
    throw new Error(
      "useCompanyBranding must be used inside CompanyBrandingProvider.",
    );
  }

  return context;
}
