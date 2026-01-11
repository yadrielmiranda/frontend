"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { PolicyListItem } from "@/app/api/dimension-policies.api";
import { getPolicyColumns } from "./columns-policies";

export function DimensionPoliciesClient({
  initialPolicies,
  canEdit,
}: {
  initialPolicies: PolicyListItem[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getPolicyColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialPolicies}
      filterColumnId="systemName"
      filterPlaceholder="Filter by system..."
    />
  );
}
