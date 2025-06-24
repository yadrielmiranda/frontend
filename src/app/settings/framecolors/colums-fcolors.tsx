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
import { deleteFColor } from "@/app/api/framecolors.api";
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Fcolor = {
  id: number;
  color: string;
};

export const columns: ColumnDef<Fcolor>[] = [
  {
    accessorKey: "color",
    header: "Color",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const fcolor = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Estado para el AlertDialog
      const router = useRouter();

      const handleDelete = async () => {
        // Lógica para enviar la solicitud DELETE a tu API de Next.js
        // Ejemplo con una API Route o Server Action
        await deleteFColor(fcolor.id);

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
                  href={`/settings/framecolors/${fcolor.id}/edit`}
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
