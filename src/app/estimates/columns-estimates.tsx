// src/app/estimates/columns-estimates.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Send } from "lucide-react";
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
import { useState } from "react";
import { toast } from "sonner";
import { deleteEstimate } from "@/app/api/estimates.api";
import { createOrder } from "@/app/api/orders.api";
import { EstimateWithRelations } from "@/app/api/types";
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { AuthUser } from "@/app/types/auth";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
};

// --- FUNCIÓN MODIFICADA ---
// Ahora exportamos una función que genera las columnas
export const getColumns = (currentUser: AuthUser | null): ColumnDef<EstimateWithRelations>[] => [
  {
    accessorKey: "number",
    header: "Number",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: "units",
    header: "Units",
    cell: ({ row }) => <div className="text-center">{row.original.units}</div>,
  },
  {
    accessorKey: "priceT",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(row.original.priceT)}
      </div>
    ),
  },
  {
    accessorKey: "netProfitD",
    header: () => <div className="text-right">Net Profit ($)</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.original.netProfitD)}</div>
    ),
  },
  {
    accessorKey: "user.username",
    header: "Created By",
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.active;
      
      if (isActive) {
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        );
      } else {
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            Ordered
          </span>
        );
      }
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const estimate = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const [isCreatingOrder, setIsCreatingOrder] = useState(false);
      const router = useRouter();

      // --- LÓGICA DE PERMISOS ---
      const isOwner = currentUser?.id === estimate.idUser;

      const handleDelete = async () => {
        try {
          await deleteEstimate(estimate.id);
          setShowDeleteConfirm(false);
          toast.success("Estimate deleted successfully.");
          router.refresh();
        } catch (error) {
          toast.error((error as Error).message);
        }
      };
      
      const handleCreateOrder = async () => {
        setIsCreatingOrder(true);
        try {
          const newOrder = await createOrder(estimate.id);
          toast.success(`Order #${newOrder.number} created successfully!`);
          router.refresh(); 
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsCreatingOrder(false);
        }
      };

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
              <DropdownMenuItem asChild>
                <Link href={`/estimates/${estimate.id}`}>View Details</Link>
              </DropdownMenuItem>

              {/* Solo el dueño puede editar */}
              <DropdownMenuItem asChild disabled={!estimate.active || !isOwner}>
                <Link href={`/estimates/${estimate.id}/edit`}>Edit Estimate</Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              {/* Solo el dueño puede crear una orden */}
              <DropdownMenuItem
                onSelect={handleCreateOrder}
                disabled={isCreatingOrder || !estimate.active || !isOwner}
                className="text-blue-600 focus:bg-blue-50 focus:text-blue-700"
              >
                <Send className="mr-2 h-4 w-4" />
                {isCreatingOrder ? "Creating Order..." : (!estimate.active ? "Order Created" : "Create Order")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              {/* Solo el dueño puede borrar */}
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={() => setShowDeleteConfirm(true)}
                disabled={!estimate.active || !isOwner}
              >
                Delete Estimate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DeleteConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
          />
        </div>
      );
    },
  },
];