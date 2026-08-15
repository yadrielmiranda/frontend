"use client";

import { useMemo } from "react";

import { DataTable } from "@/components/data-table";
import type { Privacy } from "@/lib/types";

import { getPrivacyColumns } from "./columns-privacies";

export function PrivaciesClient({
  initialPrivacies,
  canEdit,
}: {
  initialPrivacies: Privacy[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getPrivacyColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialPrivacies}
      filterColumnId="name"
      filterPlaceholder="Filter Privacy options..."
    />
  );
}
