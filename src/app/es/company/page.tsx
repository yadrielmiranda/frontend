import { CompanyPage } from "@/components/company/company-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";
import { companyMetadata, type CompanySearchParams } from "@/components/company/company-content";

export const metadata = companyPageMetadata("company", "es");

export default async function Page({ searchParams }: { searchParams: Promise<CompanySearchParams> }) {
  const params = await searchParams;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(companyMetadata.company.es.organization).replace(/</g, "\\u003c") }} />
    <CompanyPage page="company" locale="es" searchParams={params} />
  </>;
}
