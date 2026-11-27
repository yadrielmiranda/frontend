import { redirect } from "next/navigation";
import { CompanyPage } from "@/components/company/company-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";
import { companyMetadata, type CompanySearchParams } from "@/components/company/company-content";
import { requestPublicLanguage } from "@/lib/public-language-server";

export const metadata = companyPageMetadata("company", "en");

export default async function Page({ searchParams }: {
  searchParams: Promise<CompanySearchParams>;
}) {
  const params = await searchParams;
  if (await requestPublicLanguage(params.lang) === "es") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach(item => query.append(key, item));
      else if (value !== undefined) query.append(key, value);
    }
    redirect(query.size ? `/es/company?${query}` : "/es/company");
  }

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(companyMetadata.company.en.organization).replace(/</g, "\\u003c") }} />
    <CompanyPage page="company" locale="en" searchParams={params} />
  </>;
}
