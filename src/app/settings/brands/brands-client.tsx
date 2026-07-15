"use client";

import { useMemo } from "react";

import { DataTable, type DataTableFilter } from "@/components/data-table";
import type { Brand } from "@/lib/types";

import { getBrandColumns } from "./columns-brands";

export function BrandsClient({
  initialBrands,
  canEdit,
}: {
  initialBrands: Brand[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getBrandColumns({ canEdit }), [canEdit]);

  const filters = useMemo<DataTableFilter[]>(
    () => [
      {
        columnId: "name",
        type: "text",
        placeholder: "Filter brands...",
      },
      {
        columnId: "isActive",
        type: "select",
        allLabel: "All statuses",
        options: [
          {
            label: "Active",
            value: true,
          },
          {
            label: "Inactive",
            value: false,
          },
        ],
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={initialBrands}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
    />
  );
}
