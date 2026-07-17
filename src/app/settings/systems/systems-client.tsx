"use client";

import { useMemo } from "react";

import { DataTable, type DataTableFilter } from "@/components/data-table";
import type { System } from "@/lib/types";

import { getSystemColumns } from "./columns-systems";

export function SystemsClient({
  initialSystems,
  canEdit,
}: {
  initialSystems: System[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getSystemColumns({ canEdit }), [canEdit]);

  const filters = useMemo<DataTableFilter[]>(() => {
    const brands = Array.from(
      new Set(
        initialSystems
          .map((system) => system.brandProduct?.brand?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const products = Array.from(
      new Set(
        initialSystems
          .map((system) => system.brandProduct?.product?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return [
      {
        columnId: "name",
        type: "text",
        placeholder: "Filter by system...",
      },
      {
        columnId: "brand",
        type: "select",
        faceted: true,
        allLabel: "All brands",
        options: brands.map((brand) => ({
          label: brand,
          value: brand,
        })),
      },
      {
        columnId: "product",
        type: "select",
        faceted: true,
        allLabel: "All products",
        options: products.map((product) => ({
          label: product,
          value: product,
        })),
      },
      {
        columnId: "allowHighBottom",
        type: "select",
        faceted: true,
        allLabel: "All high bottom",
        options: [
          {
            label: "Allowed",
            value: true,
          },
          {
            label: "Not Allowed",
            value: false,
          },
        ],
      },
      {
        columnId: "isActive",
        type: "select",
        faceted: true,
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
  }, [initialSystems]);

  return (
    <DataTable
      columns={columns}
      data={initialSystems}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey="systems"
    />
  );
}
