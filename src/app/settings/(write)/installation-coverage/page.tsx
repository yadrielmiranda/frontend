import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { getCompanyBranding } from "@/app/api/brandings.api";
import { getInstallationCoverage } from "@/app/api/installation-coverage.api";
import { InstallationCoverageClient } from "./installation-coverage-client";

export default async function InstallationCoveragePage() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role?.name)) notFound();

  const [coverage, company] = await Promise.all([
    getInstallationCoverage(),
    getCompanyBranding().catch(() => null),
  ]);
  const companyAddress =
    company?.street && company.city && company.state && company.postalCode
      ? {
          street: company.street,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
        }
      : null;

  return (
    <InstallationCoverageClient
      initialCoverage={coverage}
      companyAddress={companyAddress}
    />
  );
}
