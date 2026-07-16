"use client";

import { useMemo } from "react";

import {
  DataTable,
  type DataTableFilter,
  type DataTableFilterOption,
} from "@/components/data-table";
import type { Config } from "@/lib/types";

import { getConfigColumns } from "./columns-configs";

function createOptions(values: string[]): DataTableFilterOption[] {
  return Array.from(new Set(values))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      label: value,
      value,
    }));
}

export function ConfigsClient({
  initialConfigs,
  canEdit,
}: {
  initialConfigs: Config[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getConfigColumns({ canEdit }), [canEdit]);

  const filters = useMemo<DataTableFilter[]>(() => {
    return [
      {
        columnId: "conf",
        type: "text",
        placeholder: "Filter configs...",
      },
      {
        columnId: "category",
        type: "select",
        allLabel: "All categories",
        options: createOptions(
          initialConfigs.map(
            (config) => config.category?.name ?? "No category",
          ),
        ),
      },
      {
        columnId: "product",
        type: "select",
        allLabel: "All products",
        options: createOptions(
          initialConfigs.map((config) => config.prod?.name ?? "No product"),
        ),
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
    ];
  }, [initialConfigs]);

  return (
    <DataTable
      columns={columns}
      data={initialConfigs}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey="configs"
    />
  );
}
