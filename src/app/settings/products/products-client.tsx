"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { Product } from "@/lib/types";
import { getProductColumns } from "./columns-products";

export function ProductsClient({
  initialProducts,
  canEdit,
}: {
  initialProducts: Product[];
  canEdit: boolean;
}) {
  const columns = useMemo(() => getProductColumns({ canEdit }), [canEdit]);

  return (
    <DataTable
      columns={columns}
      data={initialProducts}
      filterColumnId="name"
      filterPlaceholder="Filter products..."
    />
  );
}
