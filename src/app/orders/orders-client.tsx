"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { getOrders } from "@/app/api/orders.api";
import { DataTable, type DataTableFilter } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { orderStatusLabel } from "@/components/orders/order-status-badge";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
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
  const { locale } = usePortalLanguage();
  const spanish = locale === "es";
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
    () => getOrderColumns({ canEdit, canViewFinancials, currentUserId, currentUserRole, locale }),
    [canEdit, canViewFinancials, currentUserId, currentUserRole, locale],
  );

  const initialColumnFilters = useMemo<ColumnFiltersState>(
    () => canViewFinancials && initialPoFilter
      ? [{ id: "poNumber", value: initialPoFilter }]
      : [],
    [canViewFinancials, initialPoFilter],
  );

  const filters = useMemo<DataTableFilter[]>(() => {
    const options = (values: string[], labelFor: (value: string) => string = value => value) => [...new Set(values)]
      .map((value) => ({ label: labelFor(value), value }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
    const result: DataTableFilter[] = [
      { columnId: "number", type: "text", placeholder: spanish ? "Filtrar por número de orden..." : "Filter order #..." },
      { columnId: "estimate_number", type: "text", placeholder: spanish ? "Filtrar por número de cotización..." : "Filter estimate #..." },
      { columnId: "estimate_name", type: "text", placeholder: spanish ? "Filtrar por nombre..." : "Filter name..." },
      { columnId: "date", type: "date-range", placeholder: spanish ? "Fecha de la orden" : "Order date" },
      {
        columnId: "status_name", type: "select", allLabel: spanish ? "Todos los estados" : "All statuses",
        options: options(orders.map((order) => order.status.name), value => orderStatusLabel(value, locale)),
      },
    ];
    if (canViewFinancials) {
      result.push({
        columnId: "poNumber", type: "text", placeholder: spanish ? "Filtrar por PO de fábrica..." : "Filter factory PO...",
        options: [
          { label: spanish ? "PO pendiente" : "Pending PO", value: "pending" },
          { label: spanish ? "Con PO" : "With PO", value: "assigned" },
          { label: spanish ? "Sin PO" : "Without PO", value: "missing" },
        ],
      });
    }
    if (currentUserRole !== "client") {
      result.push({
        columnId: "user_username", type: "select", allLabel: spanish ? "Todos los usuarios" : "All users",
        options: options(orders.flatMap((order) => order.user?.username ? [order.user.username] : [])),
      });
    }
    return result;
  }, [orders, canViewFinancials, currentUserRole, locale, spanish]);

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
    <div lang={locale} className="w-full px-4 md:px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold">{spanish ? "Órdenes" : "Orders"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {spanish ? "Consulta y gestiona las órdenes." : "View and manage orders."}
          </p>
        </div>
        {currentUserRole === "admin" && <Button asChild variant="outline">
          <Link href="/orders/factory-payments">
            <Landmark aria-hidden="true" />{spanish ? "Pagos a fábrica" : "Factory Payments"}
          </Link>
        </Button>}
      </div>
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <DataTable
          locale={locale}
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
      </div>
    </div>
  );
}
