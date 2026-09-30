import { PromotionBanner } from "@/components/promotions/promotion-banner";
// src/app/estimates/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getEstimates } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session";
import { EstimatesClient } from "@/components/estimates/estimates-client";
import { EstimatesLoadError } from "@/components/estimates/estimates-load-error";
import { isApiError } from "@/app/api/_base";
import { canCreateEstimate } from "@/lib/rbac";
import { notFound, unstable_rethrow } from "next/navigation";

export default async function EstimatesPage({ searchParams }: { searchParams: Promise<{ owner?: string }> }) {
  const ownerId = Number((await searchParams).owner) || undefined;
  const user = await getCurrentUser();
  if (!user) notFound();
  let estimates: Awaited<ReturnType<typeof getEstimates>> | null = null;
  try {
    estimates = await getEstimates();
  } catch (error) {
    unstable_rethrow(error);
    if (isApiError(error) && error.status < 500) throw error;
  }

  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Estimates</h1>
        {canCreateEstimate(user.role?.name) && (
          user.networkSalesBlocked ? <Button variant="green" disabled>+ New Estimate</Button> :
          <Button variant="green" asChild>
            <Link href="/estimates/new">+ New Estimate</Link>
          </Button>
        )}
      </div>

      <PromotionBanner />
      {estimates === null ? (
        <EstimatesLoadError />
      ) : (
        <EstimatesClient initialEstimates={estimates} currentUser={user} ownerId={ownerId} />
      )}
    </div>
  );
}
