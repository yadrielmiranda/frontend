import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  getInstallation,
  getInstallationServices,
} from "@/app/api/installations.api";
import { isApiError } from "@/app/api/_base";
import { InstallationDetailClient } from "./installation-detail-client";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getFColors } from "@/app/api/fcolors.api";
import { getCrystals } from "@/app/api/crystals.api";
import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getPrivacies } from "@/app/api/privacies.api";
import { getMuntinPatterns } from "@/app/api/muntin-patterns.api";
import { getMuntinTypes } from "@/app/api/muntin-types.api";

export default async function InstallationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId < 1) notFound();
  const rawReturnTo = (await searchParams).returnTo;
  const requestedReturnTo = Array.isArray(rawReturnTo)
    ? rawReturnTo[0]
    : rawReturnTo;
  let returnHref = "/installations";
  if (requestedReturnTo) {
    try {
      const parsed = new URL(requestedReturnTo, "http://installations.local");
      if (
        parsed.origin === "http://installations.local" &&
        parsed.pathname === "/installations"
      ) {
        returnHref = `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      returnHref = "/installations";
    }
  }

  try {
    const [
      job,
      services,
      productsWithBrands,
      systemsWithConfigs,
      frameColors,
      crystals,
      tints,
      coatings,
      privacies,
      muntinPatterns,
      muntinTypes,
    ] = await Promise.all([
      getInstallation(jobId),
      getInstallationServices(false),
      getProductsWithBrands(),
      getSystemsWithConfigs(),
      getFColors(),
      getCrystals(),
      getTints(),
      getCoatings(),
      getPrivacies(),
      getMuntinPatterns({ active: true }),
      getMuntinTypes({ active: true }),
    ]);
    return (
      <InstallationDetailClient
        initialJob={job}
        services={services}
        userId={user.id}
        userRole={user.role.name}
        returnHref={returnHref}
        productsWithBrands={productsWithBrands}
        systemsWithConfigs={systemsWithConfigs}
        frameColors={frameColors}
        crystals={crystals}
        tints={tints}
        coatings={coatings}
        privacies={privacies}
        muntinPatterns={muntinPatterns}
        muntinTypes={muntinTypes}
      />
    );
  } catch (error) {
    if (isApiError(error) && [403, 404].includes(error.status)) notFound();
    throw error;
  }
}
