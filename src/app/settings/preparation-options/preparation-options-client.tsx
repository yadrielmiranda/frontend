"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { PreparationOption } from "@/lib/types";
import { getPreparationOptionColumns } from "./columns-preparation-options";

export function PreparationOptionsClient({
  initialPreparationOptions,
  canEdit,
}: {
  initialPreparationOptions: PreparationOption[];
  canEdit: boolean;
}) {
  const columns = useMemo(
    () => getPreparationOptionColumns({ canEdit }),
    [canEdit]
  );

  return (
    <DataTable
      columns={columns}
      data={initialPreparationOptions}
      filterColumnId="name"
      filterPlaceholder="Filter preparation options..."
    />
  );
}