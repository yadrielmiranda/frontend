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
import { useState } from "react";
import { toast } from "sonner"; // ✅ AÑADIDO: Importación para las notificaciones
import { deleteEstimate } from "@/app/api/estimates.api";
import { EstimateWithRelations } from "@/app/api/types"; // Importamos el tipo desde el archivo central
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

// Función auxiliar para formatear la fecha a un formato legible
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Función auxiliar para formatear números como moneda USD
const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
};

// Definición de las columnas para la tabla de presupuestos
export const columns: ColumnDef<EstimateWithRelations>[] = [
  {
    accessorKey: "number",
    header: "Number",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "project",
    header: "Project",
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
    header: "Total Price",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(row.original.priceT)}
      </div>
    ),
  },
  {
    accessorKey: "netProfit",
    header: "Net Profit",
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.original.netProfit)}</div>
    ),
  },
  {
    // Accedemos a la propiedad anidada a través de la relación 'user'
    accessorKey: "user.username",
    header: "Created By",
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.active;
      return (
        <span
          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
            isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const estimate = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        try {
          await deleteEstimate(estimate.id);
          setShowDeleteConfirm(false);
          toast.success("Estimate deleted successfully.");
          router.refresh(); // Recarga los datos de la página para reflejar la eliminación
        } catch (error) {
          toast.error((error as Error).message);
          console.error("Failed to delete estimate", error);
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
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/estimates/${estimate.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/estimates/${estimate.id}/edit`}>
                  Edit Estimate
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={() => setShowDeleteConfirm(true)}
              >
                Delete Estimate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Componente de diálogo para confirmar la eliminación */}
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
