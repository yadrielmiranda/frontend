"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { Coating } from "@/lib/types";
import { getCoatingColumns } from "./columns-coatings";

export function CoatingsClient({
  initialCoatings,
  canEdit,
}: {
  initialCoatings: Coating[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getCoatingColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialCoatings}
      filterColumnId="name"
      filterPlaceholder="Filter coatings..."
    />
  );
}
