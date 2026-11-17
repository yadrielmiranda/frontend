import { CompanyPage } from "@/components/company/company-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";

export const metadata = companyPageMetadata("for-ai", "en");

export default function Page() {
  return <CompanyPage page="for-ai" locale="en" />;
}
