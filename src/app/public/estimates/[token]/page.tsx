import { notFound } from "next/navigation";
import { getPublicEstimate } from "@/app/api/estimates.api";
import { isApiError } from "@/app/api/_base";
import { EstimateReportShell } from "@/components/estimates/estimate-details/parts/estimate-report-shell";
import { EstimateViewDealerPublic } from "@/components/estimates/estimate-details/views/estimate-view-dealer-public";

export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let estimate;

  try {
    estimate = await getPublicEstimate(token);
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 400)) {
      notFound();
    }

    throw e;
  }

  if (!estimate) notFound();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <EstimateReportShell estimate={estimate}>
          <EstimateViewDealerPublic estimate={estimate} />
        </EstimateReportShell>
      </div>
    </main>
  );
}
