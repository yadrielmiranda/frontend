"use client";

import { ColumnDef } from "@tanstack/react-table";
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
import Link from "next/link";
import { OrderWithRelations } from "@/app/api/types";
import { useAuth } from "@/contexts/AuthContext"; // <-- 1. Importa el hook useAuth

// (Si tienes funciones de formato aquí, déjalas como están)
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });
};

const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(Number(amount));
};

export const columns: ColumnDef<OrderWithRelations>[] = [
  { accessorKey: "number", header: "Order #" },
  { accessorKey: "estimate.number", header: "Estimate #" },
  { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: "estimate.name", header: "Name" },
  { accessorKey: "user.username", header: "Created By" },
  { accessorKey: "units", header: "Units" },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.amount)}</div> },
  {
    accessorKey: "status.name",
    header: "Status",
    cell: ({ row }) => {
      const statusName = row.original.status.name;
      let colorClasses = "bg-gray-100 text-gray-800"; // Default
      if (statusName === "In production") colorClasses = "bg-yellow-100 text-yellow-800";
      if (statusName === "Delivered") colorClasses = "bg-green-100 text-green-800";
      if (statusName === "Ready to pick up") colorClasses = "bg-blue-100 text-blue-800";
      
      return <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${colorClasses}`}>{statusName}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;
      const { user } = useAuth(); // <-- 2. Obtiene el usuario actual del contexto

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/orders/${order.id}`}>View Details</Link>
              </DropdownMenuItem>

              {/* --- LÓGICA CONDICIONAL AQUÍ --- */}
              {/* 3. Muestra el botón SOLO si el rol del usuario es 'admin' */}
              {user?.role.name === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link href={`/orders/${order.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit Status</span>
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