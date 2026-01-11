"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { Tint } from "@/lib/types";
import { getTintColumns } from "./columns-tints";

export function TintsClient({
  initialTints,
  canEdit,
}: {
  initialTints: Tint[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getTintColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialTints}
      filterColumnId="color"
      filterPlaceholder="Filter colors..."
    />
  );
}
