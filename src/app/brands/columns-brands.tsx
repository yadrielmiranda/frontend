"use client";

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
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBrand } from "@/queries/brands.api";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Brand = {
  id: number;
  name: string;
};

export const columns: ColumnDef<Brand>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const brand = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Estado para el AlertDialog
      const router = useRouter();

      /*
        const router = useRouter();

        const handleEditClick = (event: React.MouseEvent) => {
        event.stopPropagation(); // Previene la propagación del evento, útil si la fila es clickeable
        router.push('/products/new');
      };

      */

      const handleDelete = async () => {
        // Lógica para enviar la solicitud DELETE a tu API de Next.js
        // Ejemplo con una API Route o Server Action
        await deleteBrand(brand.id);

        setShowDeleteConfirm(false); // Cierra el diálogo de confirmación
        router.refresh();
      };

      return (
        <div>
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
                <Link
                  className="text-blue-900 focus:bg-red-50 focus:text-red-600"
                  href={`/brands/${brand.id}/edit`}
                >
                  Edit
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-red-800 focus:bg-red-50 focus:text-red-600"
                onSelect={() => setShowDeleteConfirm(true)} // Evita que el DropdownMenuItem se cierre
              >
                Delete
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
