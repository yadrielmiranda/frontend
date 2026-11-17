import type { Metadata } from "next";
import { companyMetadata, type CompanyLocale, type CompanyPageName } from "@/components/company/company-content";

export function companyPageMetadata(page: CompanyPageName, locale: CompanyLocale): Metadata {
  const source = companyMetadata[page][locale];
  return {
    title: source.title,
    description: source.description,
    alternates: { canonical: source.canonical, languages: source.languages },
    robots: { index: true, follow: true },
  };
}
