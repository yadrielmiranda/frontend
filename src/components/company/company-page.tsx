import "./company.css";
import type { CompanyLocale, CompanyPageName } from "./company-content";
import { CompanyShell } from "./company-shell";
import { CompanyEnContent } from "./pages/company-en";
import { ForAiEnContent } from "./pages/for-ai-en";
import { ResourcesEnContent } from "./pages/resources-en";
import { PrepareYourQuoteEnContent } from "./pages/prepare-your-quote-en";
import { CompareImpactProductsEnContent } from "./pages/compare-impact-products-en";
import { CompanyEsContent } from "./pages/company-es";
import { ForAiEsContent } from "./pages/for-ai-es";
import { ResourcesEsContent } from "./pages/resources-es";
import { PrepareYourQuoteEsContent } from "./pages/prepare-your-quote-es";
import { CompareImpactProductsEsContent } from "./pages/compare-impact-products-es";

const content = {
  "company": { en: CompanyEnContent, es: CompanyEsContent },
  "for-ai": { en: ForAiEnContent, es: ForAiEsContent },
  "resources": { en: ResourcesEnContent, es: ResourcesEsContent },
  "prepare-your-quote": { en: PrepareYourQuoteEnContent, es: PrepareYourQuoteEsContent },
  "compare-impact-products": { en: CompareImpactProductsEnContent, es: CompareImpactProductsEsContent },
};

export function CompanyPage({ page, locale = "en" }: { page: CompanyPageName; locale?: CompanyLocale }) {
  const Content = content[page][locale];
  return <CompanyShell page={page} locale={locale}><Content /></CompanyShell>;
}
