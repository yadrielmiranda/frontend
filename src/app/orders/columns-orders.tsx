"use client";

import { filterFns, type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Edit, CreditCard, FileJson } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { OrderWithRelations } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { formatDateEn, formatDateEs, formatMoney } from "@/lib/formatters";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { getEstimateCostColumns } from "@/components/estimates/estimate-cost-columns";
import type { DataTableDateRangeValue, DataTableTextSearch } from "@/components/data-table";
import { hasFactoryPo, isPendingPoOrder } from "@/lib/order-po";

export function getOrderColumns({
  canEdit,
  canViewFinancials,
  currentUserId,
  currentUserRole,
  locale = "en",
}: {
  canEdit: boolean;
  canViewFinancials: boolean;
  currentUserId: number;
  currentUserRole: string | null;
  locale?: CompanyLocale;
}): ColumnDef<OrderWithRelations>[] {
  const spanish = locale === "es";
  const viewDetails = spanish ? "Ver detalles" : "View Details";
  const actions = spanish ? "Acciones" : "Actions";
  const columns: ColumnDef<OrderWithRelations>[] = [
    {
      accessorKey: "number",
      header: spanish ? "N.º de orden" : "Order #",
      filterFn: "includesString",
      cell: ({ row }) => (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Link
              href={`/orders/${row.original.id}`}
              prefetch={false}
              aria-label={`${viewDetails}: ${row.original.number}`}
              className="inline-block cursor-pointer rounded-sm underline-offset-4 transition-colors duration-150 hover:text-teal-700 hover:underline focus-visible:text-teal-700 focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:text-teal-400 dark:focus-visible:text-teal-400 motion-reduce:transition-none"
            >
              {row.original.number}
            </Link>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={8}
            className="rounded-lg px-3 py-2 font-medium shadow-lg"
          >
            {viewDetails}
          </TooltipContent>
        </Tooltip>
      ),
    },
    { accessorKey: "estimate.number", header: spanish ? "N.º de cotización" : "Estimate #", filterFn: "includesString" },
    {
      accessorKey: "date",
      header: spanish ? "Fecha" : "Date",
      filterFn: (row, _columnId, range: DataTableDateRangeValue) => {
        const date = new Date(row.original.date);
        if (Number.isNaN(date.getTime())) return false;
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return (!range?.from || dateKey >= range.from) && (!range?.to || dateKey <= range.to);
      },
      cell: ({ row }) => spanish ? formatDateEs(row.original.date) : formatDateEn(row.original.date),
    },
    { accessorKey: "estimate.name", header: spanish ? "Nombre" : "Name", filterFn: "includesString" },
    ...(currentUserRole !== "client"
      ? [
          {
            accessorKey: "user.username",
            filterFn: "equalsString",
            header: () => <div className="text-center">{spanish ? "Creada por" : "Created By"}</div>,
            cell: ({ row }) => <div className="text-center">{row.original.user?.username ?? "—"}</div>,
          } satisfies ColumnDef<OrderWithRelations>,
        ]
      : []),
    {
      accessorKey: "units",
      header: () => <div className="text-center">{spanish ? "Unidades" : "Units"}</div>,
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.units}</div>,
    },
    ...getEstimateCostColumns<OrderWithRelations>((order) => order.estimate, locale),
    {
      accessorKey: "status.name",
      filterFn: "equalsString",
      header: () => <div className="text-center">{spanish ? "Estado" : "Status"}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <OrderStatusBadge name={row.original.status?.name} locale={locale} />
          {currentUserRole === "admin" && row.original.earningsReview && (
            <p className="mt-1 text-xs font-medium text-amber-700" title={spanish && row.original.earningsReview.code === "INVALID_SAVED_EARNINGS_PLAN"
              ? "Falta el plan de ganancias guardado o el plan no es válido." : row.original.earningsReview.message}>
              {spanish ? "Ganancias pendientes de revisión" : "Earnings pending review"}
            </p>
          )}
        </div>
      ),
    },
  ];

  if (canViewFinancials) {
    columns.splice(2, 0, {
      accessorKey: "poNumber",
      header: spanish ? "PO de fábrica" : "Factory PO",
      cell: ({ row }) => row.original.poNumber?.trim() || "—",
      filterFn: (row, columnId, filter: string | DataTableTextSearch, addMeta) => {
        if (filter === "pending") return isPendingPoOrder(row.original);
        if (filter === "missing") return !hasFactoryPo(row.original);
        if (filter === "assigned") return hasFactoryPo(row.original);
        return typeof filter === "object" && filterFns.includesString(row, columnId, filter.text, addMeta);
      },
    });
    columns.splice(-1, 0, {
      id: "netProfitReal",
      header: () => <div className="text-center">{spanish ? "Ganancia real de materiales" : "Real Material Profit"}</div>,
      cell: ({ row }) => (
        <div className="text-center tabular-nums">
          {row.original.netProfitReal == null
            ? (spanish ? "Pendiente" : "Pending")
            : formatMoney(Number(row.original.netProfitReal))}
        </div>
      ),
    });
  }

  columns.push({
    id: "actions",
    header: () => <div className="text-right">{actions}</div>,
    cell: ({ row }) => {
      const order = row.original;
      const canPay = (order.estimate.dealerNetwork ? order.estimate.dealerNetwork.canPay : order.userId === currentUserId && order.dealerModeSnapshot !== "INTERNAL") && order.paymentAnchor;

      return (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          {canPay && (
            <Button asChild size="sm" className="h-8 px-3 shadow-sm">
              <Link href={`/orders/${order.id}#${order.paymentAnchor}`} prefetch={false}
                title={spanish ? "Abrir el pago de la orden" : "Open order payment"}
                aria-label={spanish ? `Pagar la orden ${order.number}` : `Pay order ${order.number}`}>
                <CreditCard className="mr-2 h-4 w-4" />
                {spanish ? "Pagar ahora" : "Pay now"}
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label={actions}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" lang={locale}>
              <DropdownMenuLabel>{actions}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href={`/orders/${order.id}`}>{viewDetails}</Link>
              </DropdownMenuItem>

              {currentUserRole === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href={`/orders/${order.id}/factory-import`}>
                    <FileJson className="mr-2 h-4 w-4" />{spanish ? "Importar orden de fábrica" : "Import factory order"}
                  </Link>
                </DropdownMenuItem>
              )}

              {canEdit && (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/orders/${order.id}/edit`}
                    className="flex items-center"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {spanish ? "Editar estado" : "Edit Status"}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  });

  return columns;
}
