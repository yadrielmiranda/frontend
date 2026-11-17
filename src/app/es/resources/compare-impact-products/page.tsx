import { CompanyV7Page } from "@/components/company-v7/company-v7-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";

export const metadata = companyPageMetadata("compare-impact-products", "es");

export default function Page() {
  return <CompanyV7Page page="compare-impact-products" locale="es" />;
}
