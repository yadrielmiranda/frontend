import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { InitializeEstimateDialog } from "@/components/estimates/initialize-estimate-dialog";
import { getClientDeliveryCoverage } from "@/app/api/client-delivery.api";
import { isClientRole } from "@/lib/rbac";
import { requestPortalLanguage } from "@/lib/public-language-server";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string | string[]; lang?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }
  if (user.networkSalesBlocked) redirect("/estimates");

  // Delivery coverage is optional while quoting. An unavailable check must not block a draft.
  const isClient = isClientRole(user.role.name);
  const params = await searchParams;
  const showWelcome = isClient && params.welcome === "1";
  const [locale, coverage] = await Promise.all([
    requestPortalLanguage(params.lang),
    isClient ? getClientDeliveryCoverage().catch(() => null) : null,
  ]);
  return (
    <div className="min-h-screen bg-gray-50">
      <InitializeEstimateDialog
        initialLocale={locale}
        coverage={coverage?.canAddProfileAddress ? coverage : null}
        showWelcome={showWelcome}
      />
    </div>
  );
}
