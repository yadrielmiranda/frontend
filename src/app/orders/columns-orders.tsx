"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Edit } from "lucide-react";

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

export function getOrderColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<OrderWithRelations>[] {
  return [
    { accessorKey: "number", header: "Order #" },
    { accessorKey: "estimate.number", header: "Estimate #" },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDateEn(row.original.date),
    },
    { accessorKey: "estimate.name", header: "Name" },
    { accessorKey: "user.username", header: "Created By" },
    { accessorKey: "units", header: "Units" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatMoney(row.original.amount)}
        </div>
      ),
    },
   {
  accessorKey: "status.name",
  header: "Status",
  cell: ({ row }) => (
    <OrderStatusBadge name={row.original.status?.name} />
  ),
},
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href={`/orders/${order.id}`}>View Details</Link>
                </DropdownMenuItem>

                {canEdit && (
                  <DropdownMenuItem asChild>
                    <Link href={`/orders/${order.id}/edit`} className="flex items-center">
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
    },
  ];
}
