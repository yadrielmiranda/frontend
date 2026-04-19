"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { MuntinPattern } from "@/lib/types";
import { getMuntinPatternColumns } from "./columns-muntin-patterns";


export function MuntinPatternsClient({
  initialPatterns,
  canEdit,
}: {
  initialPatterns: MuntinPattern[];
  canEdit: boolean;
}) {
  const columns = useMemo(
    () => getMuntinPatternColumns({ canEdit }),
    [canEdit],
  );

  return (
    <DataTable
      columns={columns}
      data={initialPatterns}
      filterColumnId="name"
      filterPlaceholder="Filter muntin patterns..."
    />
  );
}