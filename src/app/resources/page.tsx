import { CompanyPage } from "@/components/company/company-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";

export const metadata = companyPageMetadata("resources", "en");

export default function Page() {
  return <CompanyPage page="resources" locale="en" />;
}
