import { notFound } from "next/navigation";

import { isApiError } from "@/app/api/_base";
import { getPublicPaymentContext } from "@/app/api/payments.api";
import { PublicEstimatePaymentCard } from "@/components/estimates/public-estimate-payment-card";

export default async function PublicPaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let paymentContext;

  try {
    paymentContext = await getPublicPaymentContext(token);
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 400)) {
      notFound();
    }

    throw error;
  }

  if (!paymentContext.enabled) notFound();

  return (
    <main className="flex min-h-[calc(100vh-6rem)] items-center bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <PublicEstimatePaymentCard token={token} context={paymentContext} />
      </div>
    </main>
  );
}
