import { CompanyPage } from "@/components/company/company-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";
import { companyMetadata } from "@/components/company/company-content";

export const metadata = companyPageMetadata("company", "en");

export default function Page() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(companyMetadata.company.en.organization).replace(/</g, "\\u003c") }} />
    <CompanyPage page="company" locale="en" />
  </>;
}
