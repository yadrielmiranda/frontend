import type { Metadata } from "next";
import { companyV7Metadata, type CompanyV7Locale, type CompanyV7PageName } from "@/components/company-v7/company-v7-content";

export function companyPageMetadata(page: CompanyV7PageName, locale: CompanyV7Locale): Metadata {
  const source = companyV7Metadata[page][locale];
  return {
    title: source.title,
    description: source.description,
    alternates: { canonical: source.canonical, languages: source.languages },
    robots: { index: true, follow: true },
  };
}
