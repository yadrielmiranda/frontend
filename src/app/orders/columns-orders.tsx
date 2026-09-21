"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Edit, CreditCard, FileJson } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { OrderWithRelations } from "@/lib/types";
import { formatDateEn, formatMoney } from "@/lib/formatters";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { getEstimateCostColumns } from "@/components/estimates/estimate-cost-columns";
import type { DataTableDateRangeValue } from "@/components/data-table";
import { hasFactoryPo, isPendingPoOrder } from "@/lib/order-po";

export function getOrderColumns({
  canEdit,
  canViewFinancials,
  currentUserId,
  currentUserRole,
}: {
  canEdit: boolean;
  canViewFinancials: boolean;
  currentUserId: number;
  currentUserRole: string | null;
}): ColumnDef<OrderWithRelations>[] {
  const columns: ColumnDef<OrderWithRelations>[] = [
    { accessorKey: "number", header: "Order #", filterFn: "includesString" },
    { accessorKey: "estimate.number", header: "Estimate #", filterFn: "includesString" },
    {
      accessorKey: "date",
      header: "Date",
      filterFn: (row, _columnId, range: DataTableDateRangeValue) => {
        const date = new Date(row.original.date);
        if (Number.isNaN(date.getTime())) return false;
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return (!range?.from || dateKey >= range.from) && (!range?.to || dateKey <= range.to);
      },
      cell: ({ row }) => formatDateEn(row.original.date),
    },
    { accessorKey: "estimate.name", header: "Name", filterFn: "includesString" },
    ...(currentUserRole !== "client"
      ? [
          {
            accessorKey: "user.username",
            filterFn: "equalsString",
            header: () => <div className="text-center">Created By</div>,
            cell: ({ row }) => <div className="text-center">{row.original.user?.username ?? "—"}</div>,
          } satisfies ColumnDef<OrderWithRelations>,
        ]
      : []),
    {
      accessorKey: "units",
      header: () => <div className="text-center">Units</div>,
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.units}</div>,
    },
    ...getEstimateCostColumns<OrderWithRelations>((order) => order.estimate),
    {
      accessorKey: "status.name",
      filterFn: "equalsString",
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => (
        <div className="text-center"><OrderStatusBadge name={row.original.status?.name} /></div>
      ),
    },
  ];

  if (canViewFinancials) {
    columns.splice(2, 0, {
      accessorKey: "poNumber",
      header: "Factory PO",
      cell: ({ row }) => row.original.poNumber?.trim() || "—",
      filterFn: (row, _columnId, filter: string) => {
        if (filter === "pending") return isPendingPoOrder(row.original);
        if (filter === "missing") return !hasFactoryPo(row.original);
        if (filter === "assigned") return hasFactoryPo(row.original);
        return true;
      },
    });
    columns.splice(-1, 0, {
      id: "netProfitReal",
      header: () => <div className="text-center">Real Material Profit</div>,
      cell: ({ row }) => (
        <div className="text-center tabular-nums">
          {row.original.netProfitReal == null
            ? "Pending"
            : formatMoney(Number(row.original.netProfitReal))}
        </div>
      ),
    });
  }

  columns.push({
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const order = row.original;
      const canPay = order.userId === currentUserId && order.dealerModeSnapshot !== "INTERNAL" && order.paymentAnchor;

      return (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          {canPay && (
            <Button asChild size="sm" className="h-8 px-3 shadow-sm">
              <Link href={`/orders/${order.id}#${order.paymentAnchor}`} prefetch={false}
                title="Open order payment" aria-label={`Pay order ${order.number}`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay now
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href={`/orders/${order.id}`}>View Details</Link>
              </DropdownMenuItem>

              {currentUserRole === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href={`/orders/${order.id}/factory-import`}>
                    <FileJson className="mr-2 h-4 w-4" />Import factory order
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
                    Edit Status
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
