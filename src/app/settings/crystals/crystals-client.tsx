"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { Crystal } from "@/lib/types";
import { getCrystalColumns } from "./columns-crystals";

export function CrystalsClient({
  initialCrystals,
  canEdit,
}: {
  initialCrystals: Crystal[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getCrystalColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialCrystals}
      filterColumnId="glass"
      filterPlaceholder="Filter crystals..."
    />
  );
}
