"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { Config } from "@/lib/types";
import { getConfigColumns } from "./columns-configs";

export function ConfigsClient({
  initialConfigs,
  canEdit,
}: {
  initialConfigs: Config[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getConfigColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialConfigs}
      filterColumnId="conf"
      filterPlaceholder="Filter configs..."
    />
  );
}
