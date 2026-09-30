import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { InitializeEstimateDialog } from "@/components/estimates/initialize-estimate-dialog";

export default async function NewEstimatePage() {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }
  if (user.networkSalesBlocked) redirect("/estimates");

  return (
    <div className="min-h-screen bg-gray-50">
      <InitializeEstimateDialog />
    </div>
  );
}
