import { CompanyPage } from "@/components/company/company-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";

export const metadata = companyPageMetadata("compare-impact-products", "en");

export default function Page() {
  return <CompanyPage page="compare-impact-products" locale="en" />;
}
