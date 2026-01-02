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

import { deleteSystem} from "@/app/api/systems.api";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";
import { toast } from "sonner";
import { System } from "@/app/api/types";

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

      const { user } = useAuth();
      const role = user?.role?.name ?? null;
      const canEdit = isAdmin(role);

      // Si no es admin, no mostramos acciones (como Products)
      if (!canEdit) return <div className="text-right text-muted-foreground">—</div>;

      const handleDelete = async () => {
        try {
          await deleteSystem(system.id);
          toast.success("System deleted.");
          setShowDeleteConfirm(false);
          router.refresh();
        } catch (e: any) {
          toast.error(e?.message || "Delete failed");
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

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowDeleteConfirm(true);
                }}
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
