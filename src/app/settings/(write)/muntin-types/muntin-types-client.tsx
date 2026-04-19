"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { MuntinType } from "@/lib/types";
import { getMuntinTypeColumns } from "./columns-muntin-types";

export function MuntinTypesClient({
  initialTypes,
  canEdit,
}: {
  initialTypes: MuntinType[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getMuntinTypeColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialTypes}
      filterColumnId="name"
      filterPlaceholder="Filter muntin types..."
    />
  );
}