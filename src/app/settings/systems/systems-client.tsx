// src/app/settings/systems/systems-client.tsx
"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { System } from "@/lib/types";
import { getSystemColumns } from "./columns-systems";

export function SystemsClient({
  initialSystems,
  canEdit,
}: {
  initialSystems: System[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getSystemColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialSystems}
      filterColumnId="name"
      filterPlaceholder="Filter systems..."
    />
  );
}
