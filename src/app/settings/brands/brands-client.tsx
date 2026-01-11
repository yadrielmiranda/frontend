// src/app/settings/brands/brands-client.tsx
"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
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

  return (
    <DataTable
      columns={columns}
      data={initialBrands}
      filterColumnId="name"
      filterPlaceholder="Filter brands..."
    />
  );
}
