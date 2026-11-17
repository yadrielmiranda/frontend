import "./company-v7.css";
import type { CompanyV7Locale, CompanyV7PageName } from "./company-v7-content";
import { CompanyV7Shell } from "./company-v7-shell";
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

export function CompanyV7Page({ page, locale = "en" }: { page: CompanyV7PageName; locale?: CompanyV7Locale }) {
  const Content = content[page][locale];
  return <CompanyV7Shell page={page} locale={locale}><Content /></CompanyV7Shell>;
}
