import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { InitializeEstimateDialog } from "@/components/estimates/initialize-estimate-dialog";
import { getClientDeliveryCoverage } from "@/app/api/client-delivery.api";
import { isClientRole } from "@/lib/rbac";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }
  if (user.networkSalesBlocked) redirect("/estimates");

  // Delivery coverage is optional while quoting. An unavailable check must not block a draft.
  const isClient = isClientRole(user.role.name);
  const showWelcome = isClient && (await searchParams).welcome === "1";
  const coverage = isClient
    ? await getClientDeliveryCoverage().catch(() => null)
    : null;
  return (
    <div className="min-h-screen bg-gray-50">
      <InitializeEstimateDialog
        coverage={coverage?.canAddProfileAddress ? coverage : null}
        showWelcome={showWelcome}
      />
    </div>
  );
}
