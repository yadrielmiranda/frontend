"use client";

import { useMemo } from "react";

import { DataTable, type DataTableFilter } from "@/components/data-table";
import type { Product } from "@/lib/types";

import { DIAGRAM_FAMILY_LABELS, getProductColumns } from "./columns-products";

export function ProductsClient({
  initialProducts,
  canEdit,
}: {
  initialProducts: Product[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getProductColumns({ canEdit }), [canEdit]);

  const filters = useMemo<DataTableFilter[]>(() => {
    const diagramFamilies = Array.from(
      new Set(initialProducts.map((product) => product.diagramFamily)),
    )
      .sort((a, b) =>
        DIAGRAM_FAMILY_LABELS[a].localeCompare(DIAGRAM_FAMILY_LABELS[b]),
      )
      .map((diagramFamily) => ({
        label: DIAGRAM_FAMILY_LABELS[diagramFamily] ?? diagramFamily,
        value: diagramFamily,
      }));

    return [
      {
        columnId: "name",
        type: "text",
        placeholder: "Filter products...",
      },
      {
        columnId: "diagramFamily",
        type: "select",
        faceted: true,
        allLabel: "All diagram families",
        options: diagramFamilies,
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
  }, [initialProducts]);

  return (
    <DataTable
      columns={columns}
      data={initialProducts}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey="products"
    />
  );
}
