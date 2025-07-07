import { cookies } from "next/headers";
import { getEstimate } from "@/app/api/estimates.api";
import { notFound } from "next/navigation";

import { EstimateWithRelations } from "@/app/api/types";
import { EstimateDetailsClient } from "@/components/estimate-details-client";

// Esta página del servidor obtiene los datos y los pasa al componente del cliente.
export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // Se usa el 'id' ya resuelto de la promesa.
  const estimateId = Number(id);
  if (isNaN(estimateId)) {
    notFound();
  }

  // Se llama a la API para obtener el presupuesto con todos sus detalles.
  const estimate = await getEstimate(estimateId, token);

  // Si no se encuentra el presupuesto, se muestra una página 404.
  if (!estimate) {
    notFound();
  }

  return <EstimateDetailsClient estimate={estimate as EstimateWithRelations} />;
}
