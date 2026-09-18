"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrders } from "@/app/api/orders.api";
import { DataTable, type DataTableFilter } from "@/components/data-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { OrderWithRelations } from "@/lib/types";
import { getOrderColumns } from "./columns-orders";

export function OrdersClient({
  initialOrders,
  canEdit,
  canViewFinancials,
  currentUserId,
  currentUserRole,
  initialPoFilter,
}: {
  initialOrders: OrderWithRelations[];
  canEdit: boolean;
  canViewFinancials: boolean;
  currentUserId: number;
  currentUserRole: string | null;
  initialPoFilter?: string;
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
    () => getOrderColumns({ canEdit, canViewFinancials, currentUserId, currentUserRole }),
    [canEdit, canViewFinancials, currentUserId, currentUserRole],
  );

  const initialColumnFilters = useMemo<ColumnFiltersState>(
    () => canViewFinancials && initialPoFilter
      ? [{ id: "poNumber", value: initialPoFilter }]
      : [],
    [canViewFinancials, initialPoFilter],
  );

  const filters = useMemo<DataTableFilter[]>(() => {
    const options = (values: string[]) => [...new Set(values)]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }));
    const result: DataTableFilter[] = [
      { columnId: "number", type: "text", placeholder: "Filter order #..." },
      { columnId: "estimate_number", type: "text", placeholder: "Filter estimate #..." },
      { columnId: "estimate_name", type: "text", placeholder: "Filter name..." },
      { columnId: "date", type: "date-range", placeholder: "Order date" },
      {
        columnId: "status_name", type: "select", allLabel: "All statuses",
        options: options(orders.map((order) => order.status.name)),
      },
    ];
    if (canViewFinancials) {
      result.push({
        columnId: "poNumber", type: "select", allLabel: "All factory POs",
        options: [
          { label: "Pending PO", value: "pending" },
          { label: "With PO", value: "assigned" },
          { label: "Without PO", value: "missing" },
        ],
      });
    }
    if (currentUserRole !== "client") {
      result.push({
        columnId: "user_username", type: "select", allLabel: "All users",
        options: options(orders.flatMap((order) => order.user?.username ? [order.user.username] : [])),
      });
    }
    return result;
  }, [orders, canViewFinancials, currentUserRole]);

  const syncPoFilter = (next: ColumnFiltersState) => {
    // El enlace mantiene la selección visible y deja de aplicarla al limpiar filtros.
    const url = new URL(window.location.href);
    const po = canViewFinancials ? next.find((filter) => filter.id === "poNumber")?.value : undefined;
    if (typeof po === "string") url.searchParams.set("po", po);
    else url.searchParams.delete("po");
    if (url.href !== window.location.href) {
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={orders}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey={`orders:${currentUserId}:${currentUserRole}`}
      initialColumnFilters={initialColumnFilters}
      onFiltersChange={syncPoFilter}
      pagination
      scrollMode="page"
    />
  );
}
