import { CompanyPage } from "@/components/company/company-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";

export const dynamic = "force-static";
export const metadata = companyPageMetadata("prepare-your-quote", "es");

export default function Page() {
  return <CompanyPage page="prepare-your-quote" locale="es" />;
}
