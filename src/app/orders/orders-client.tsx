"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrders } from "@/app/api/orders.api";
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
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    setOrders(initialOrders);

    const refreshOrders = () => {
      if (!active || refreshing || document.visibilityState !== "visible") {
        return;
      }
      refreshing = true;
      void getOrders()
        .then((latest) => {
          if (active) setOrders(latest);
        })
        .catch(() => {
          // Se conserva la lista y se reintenta en la siguiente actualización.
        })
        .finally(() => {
          refreshing = false;
        });
    };

    // Al volver desde editar o desde otra pestaña, se consultan los datos actuales.
    refreshOrders();
    window.addEventListener("focus", refreshOrders);
    window.addEventListener("pageshow", refreshOrders);
    document.addEventListener("visibilitychange", refreshOrders);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshOrders);
      window.removeEventListener("pageshow", refreshOrders);
      document.removeEventListener("visibilitychange", refreshOrders);
    };
  }, [initialOrders]);

  const columns = useMemo(
    () => getOrderColumns({ canEdit, canViewFinancials }),
    [canEdit, canViewFinancials],
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      filterColumnId="number"
      filterPlaceholder="Filter by order number..."
    />
  );
}
