// src/app/estimates/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getEstimate } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session";
import { EstimateDetailsClient, DealerPublicView } from "@/components/estimate-details-client";
import { cookies } from 'next/headers';

export default async function EstimateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const estimateId = Number(resolvedParams.id);
  if (isNaN(estimateId)) {
    notFound();
  }

  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  
  const estimate = await getEstimate(estimateId, token);

  if (!estimate) {
    notFound();
  }

  if (resolvedSearchParams.view === 'public') {
    if (estimate.user.role.name === 'dealer') {
      return <DealerPublicView estimate={estimate} />;
    } else {
      return redirect(`/estimates/${estimate.id}`);
    }
  }

  if (!user) {
    return redirect('/');
  }

  const isAdmin = user.role.name === 'admin';
  const isOwner = user.sub === estimate.idUser;

  if (!isAdmin && !isOwner) {
    return notFound(); 
  }

  // Pasamos el rol del usuario al componente cliente
  return <EstimateDetailsClient estimate={estimate} userRole={user.role.name} />;
}