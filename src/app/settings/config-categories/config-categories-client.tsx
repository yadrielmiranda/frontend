"use client";

import { useMemo } from "react";

import {
  DataTable,
  type DataTableFilter,
  type DataTableFilterOption,
} from "@/components/data-table";
import type { ConfigCategory } from "@/lib/types";

import { getConfigCategoryColumns } from "./columns-config-categories";

function createOptions(values: string[]): DataTableFilterOption[] {
  return Array.from(new Set(values))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      label: value,
      value,
    }));
}

export function ConfigCategoriesClient({
  initialCategories,
  canEdit,
}: {
  initialCategories: ConfigCategory[];
  canEdit: boolean;
}) {
  const columns = useMemo(
    () => getConfigCategoryColumns({ canEdit }),
    [canEdit],
  );

  const filters = useMemo<DataTableFilter[]>(() => {
    return [
      {
        columnId: "name",
        type: "text",
        placeholder: "Filter categories...",
      },
      {
        columnId: "product",
        type: "select",
        allLabel: "All products",
        options: createOptions(
          initialCategories.map((category) => category.product?.name ?? "—"),
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
  }, [initialCategories]);

  return (
    <DataTable
      columns={columns}
      data={initialCategories}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey="config-categories"
    />
  );
}
