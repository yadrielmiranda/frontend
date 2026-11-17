import { CompanyV7Page } from "@/components/company-v7/company-v7-page";
import { companyPageMetadata } from "@/lib/company-page-metadata";

export const metadata = companyPageMetadata("for-ai", "es");

export default function Page() {
  return <CompanyV7Page page="for-ai" locale="es" />;
}
