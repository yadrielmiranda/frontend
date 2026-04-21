"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { ActiveOption } from "@/lib/types";
import { getActiveOptionColumns } from "./columns-active-options";

export function ActiveOptionsClient({
  initialActiveOptions,
  canEdit,
}: {
  initialActiveOptions: ActiveOption[];
  canEdit: boolean;
}) {
  const columns = useMemo(
    () => getActiveOptionColumns({ canEdit }),
    [canEdit]
  );

  return (
    <DataTable
      columns={columns}
      data={initialActiveOptions}
      filterColumnId="name"
      filterPlaceholder="Filter active options..."
    />
  );
}