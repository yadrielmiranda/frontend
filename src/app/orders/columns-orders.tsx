"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { OrderWithRelations } from "@/app/api/types";

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
const formatCurrency = (amount: number | string) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));

export const columns: ColumnDef<OrderWithRelations>[] = [
  { accessorKey: "number", header: "Order #" },
  { accessorKey: "estimate.number", header: "Estimate #" },
  { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: "estimate.name", header: "Name" },
  { accessorKey: "user.username", header: "Created By" },
  { accessorKey: "units", header: "Units", cell: ({ row }) => <div className="text-center">{row.original.units}</div> },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.amount)}</div>,
  },
  {
    accessorKey: "status.name",
    header: "Status",
    cell: ({ row }) => {
      const statusName = row.original.status.name;
      let colorClass = "bg-gray-100 text-gray-800";
      if (statusName === 'In production') colorClass = "bg-yellow-100 text-yellow-800";
      if (statusName === 'Ready to pick up') colorClass = "bg-blue-100 text-blue-800";
      if (statusName === 'Delivered') colorClass = "bg-green-100 text-green-800";
      return <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${colorClass}`}>{statusName}</span>;
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
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/orders/${order.id}/edit`}>Edit Status</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];