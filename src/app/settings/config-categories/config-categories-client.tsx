"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { ConfigCategory } from "@/lib/types";
import { getConfigCategoryColumns } from "./columns-config-categories";

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

  return (
    <DataTable
      columns={columns}
      data={initialCategories}
      filterColumnId="name"
      filterPlaceholder="Filter categories..."
    />
  );
}
