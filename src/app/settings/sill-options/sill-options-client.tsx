"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { SillOption } from "@/lib/types";
import { getSillOptionColumns } from "./columns-sill-options";

export function SillOptionsClient({
  initialSillOptions,
  canEdit,
}: {
  initialSillOptions: SillOption[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getSillOptionColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialSillOptions}
      filterColumnId="name"
      filterPlaceholder="Filter sill options..."
    />
  );
}