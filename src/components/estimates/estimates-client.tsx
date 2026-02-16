"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { getEstimateColumns } from "./estimates-columns";
import type { EstimateWithRelations } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";

interface EstimatesClientProps {
  initialEstimates: EstimateWithRelations[];
  currentUser: AuthUser | null;
}

export function EstimatesClient({ initialEstimates, currentUser }: EstimatesClientProps) {
  const columns = useMemo(() => getEstimateColumns(currentUser), [currentUser]);

  return (
    <DataTable
      columns={columns}
      data={initialEstimates}
      filterColumnId="number"
      filterPlaceholder="Filter by name..."
    />
  );
}

