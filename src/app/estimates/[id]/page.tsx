// src/app/estimates/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getEstimate } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session";
import { EstimateDetails } from "@/components/estimates/estimate-details";
import { isApiError } from "@/app/api/_base";
import { isAdminRole, isOperatorRole, isDealerRole } from "@/lib/rbac";

export default async function EstimateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const estimateId = Number(resolvedParams.id);
  if (isNaN(estimateId)) {
    notFound();
  }

  let estimate;
  try {
    estimate = await getEstimate(estimateId);
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 403)) {
      notFound();
    }
    throw e; // otros errores (500, etc.) que sigan saliendo
  }

  if (!estimate) {
    notFound();
  }
 
  const role = user.role.name;

  const isPrivileged = isAdminRole(role) || isOperatorRole(role);
  const isOwner = user.id === estimate.idUser;

  if (!isPrivileged && !isOwner) {
    return notFound();
  }

  const initialPublicView = resolvedSearchParams.view === "public";

  if (initialPublicView && !isDealerRole(estimate.user.role.name)) {
    return redirect(`/estimates/${estimate.id}`);
  }

  return (
    <EstimateDetails
      estimate={estimate}
      userRole={user.role.name}
      initialPublicView={initialPublicView}
    />
  );
}
