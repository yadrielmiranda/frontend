"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSystem } from "@/app/api/systems.api";

// Definimos el tipo de dato que espera la tabla.
// Debe coincidir con la respuesta de la API (incluyendo las relaciones anidadas).
export type System = {
  id: number;
  name: string;
  brandProduct: {
    brand: { name: string };
    product: { name: string };
  };
};

export const columns: ColumnDef<System>[] = [
  {
    accessorKey: "name",
    header: "Nombre del Sistema",
  },
  {
    accessorKey: "brandProduct.brand.name",
    header: "Marca",
  },
  {
    accessorKey: "brandProduct.product.name",
    header: "Producto",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const system = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        try {
          await deleteSystem(system.id);
          setShowDeleteConfirm(false);
          router.refresh();
        } catch (error) {
          console.error("Error al eliminar el sistema", error);
        }
      };

      return (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/settings/systems/${system.id}/edit`}>Editar</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/settings/systems/${system.id}/configs`}>
                  Gestionar Configs
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={() => setShowDeleteConfirm(true)}
              >
                Eliminar
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
