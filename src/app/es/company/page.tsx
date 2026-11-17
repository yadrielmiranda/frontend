import { CompanyV7Page } from "@/components/company-v7/company-v7-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";
import { companyV7Metadata } from "@/components/company-v7/company-v7-content";

export const metadata = companyPageMetadata("company", "es");

export default function Page() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(companyV7Metadata.company.es.organization).replace(/</g, "\\u003c") }} />
    <CompanyV7Page page="company" locale="es" />
  </>;
}
