"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { ReinforcementOption } from "@/lib/types";
import { getReinforcementOptionColumns } from "./columns-reinforcement-options";

export function ReinforcementOptionsClient({
  initialReinforcementOptions,
  canEdit,
}: {
  initialReinforcementOptions: ReinforcementOption[];
  canEdit: boolean;
}) {
  const columns = useMemo(
    () => getReinforcementOptionColumns({ canEdit }),
    [canEdit]
  );

  return (
    <DataTable
      columns={columns}
      data={initialReinforcementOptions}
      filterColumnId="name"
      filterPlaceholder="Filter reinforcement options..."
    />
  );
}