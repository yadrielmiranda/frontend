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
      cell: ({ row }) => {
        const statusName = row.original.status.name;

        // (sin cambiar tu lógica de colores, solo lo dejo igual)
        let colorClasses = "bg-gray-100 text-gray-800";
        if (statusName === "In production") colorClasses = "bg-yellow-100 text-yellow-800";
        if (statusName === "Delivered") colorClasses = "bg-green-100 text-green-800";
        if (statusName === "Ready to pick up") colorClasses = "bg-blue-100 text-blue-800";

        return (
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${colorClasses}`}>
            {statusName}
          </span>
        );
      },
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
