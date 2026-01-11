"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { FrameColor } from "@/lib/types";
import { getFrameColorColumns } from "./columns-framecolors";

export function FrameColorsClient({
  initialFColors,
  canEdit,
}: {
  initialFColors: FrameColor[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getFrameColorColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialFColors}
      filterColumnId="color"
      filterPlaceholder="Filter colors..."
    />
  );
}
