// src/app/estimates/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getEstimate } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session";
import {
  EstimateDetailsClient,
  DealerPublicView,
} from "@/components/estimates/estimate-details-client";
import { isApiError } from "@/app/api/_base";

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

  if (resolvedSearchParams.view === "public") {
    if (estimate.user.role.name === "dealer") {
      return <DealerPublicView estimate={estimate} />;
    } else {
      return redirect(`/estimates/${estimate.id}`);
    }
  }

  if (!user) {
    return notFound();
  }

  const role = user.role.name;

  const isPrivileged = role === "admin" || role === "operator";
  const isOwner = user.id === estimate.idUser;

  if (!isPrivileged && !isOwner) {
    return notFound();
  }

  // Pasamos el rol del usuario al componente cliente
  return (
    <EstimateDetailsClient estimate={estimate} userRole={user.role.name} />
  );
}
