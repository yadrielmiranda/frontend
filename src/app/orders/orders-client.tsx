"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { OrderWithRelations } from "@/lib/types";
import { getOrderColumns } from "./columns-orders";

export function OrdersClient({
  initialOrders,
  canEdit,
  canViewFinancials,
}: {
  initialOrders: OrderWithRelations[];
  canEdit: boolean;
  canViewFinancials: boolean;
}) {
  const columns = useMemo(
    () => getOrderColumns({ canEdit, canViewFinancials }),
    [canEdit, canViewFinancials],
  );

  return (
    <DataTable
      columns={columns}
      data={initialOrders}
      filterColumnId="number"
      filterPlaceholder="Filter by order number..."
    />
  );
}
