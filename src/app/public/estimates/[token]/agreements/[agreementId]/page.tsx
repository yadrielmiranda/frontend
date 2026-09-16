import { notFound } from "next/navigation";
import {
  getAgreementSnapshot,
  getPublicAgreement,
} from "@/app/api/contracts.api";
import { PublicAgreementPanel } from "@/components/estimates/agreements/public-agreement-panel";
import { isApiError } from "@/app/api/_base";
import { EstimateReportShell } from "@/components/estimates/estimate-details/parts/estimate-report-shell";
import { EstimateViewDealerPublic } from "@/components/estimates/estimate-details/views/estimate-view-dealer-public";
import { getPublicPaymentContext } from "@/app/api/payments.api";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AgreementSnapshotPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; agreementId: string }>;
  searchParams: Promise<{ render?: string }>;
}) {
  const { token, agreementId } = await params;
  const renderOnly = (await searchParams).render === "1";
  let estimate;
  let status;
  let paymentContext;
  try {
    estimate = await getAgreementSnapshot(token, agreementId);
    if (!renderOnly) status = await getPublicAgreement(token, agreementId);
    if (status?.paymentsEnabled && !status.current?.invalidatedAt)
      paymentContext = await getPublicPaymentContext(token);
  } catch (error) {
    if (isApiError(error) && [400, 404].includes(error.status)) notFound();
    throw error;
  }
  return (
    <main
      className="mx-auto max-w-6xl px-4 py-8"
      data-agreement-snapshot={agreementId}
    >
      <EstimateReportShell estimate={estimate}>
        {status ? (
          <PublicAgreementPanel
            estimate={estimate}
            token={token}
            initialStatus={status}
            paymentContext={paymentContext}
          />
        ) : (
          <EstimateViewDealerPublic
            estimate={estimate}
            pricingMode={estimate.publicPricingMode ?? "detailed"}
          />
        )}
      </EstimateReportShell>
    </main>
  );
}
