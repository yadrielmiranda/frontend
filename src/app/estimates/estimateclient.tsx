"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { getColumns } from "./columns-estimates";
import { EstimateWithRelations } from "@/app/api/types";
import { AuthUser } from "@/app/types/auth";

interface EstimatesClientProps {
  initialEstimates: EstimateWithRelations[];
  currentUser: AuthUser | null;
}

export function EstimatesClient({ initialEstimates, currentUser }: EstimatesClientProps) {
  // Usamos useMemo para generar las columnas dinámicamente basadas en el usuario.
  // Esto asegura que las columnas no se recalculen en cada renderizado.
  const columns = useMemo(() => getColumns(currentUser), [currentUser]);

  return (
    <DataTable
      columns={columns}
      data={initialEstimates}
      filterColumnId="name"
      filterPlaceholder="Filter by name..."
    />
  );
}