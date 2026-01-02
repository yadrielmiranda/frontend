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
import { deleteCrystal } from "@/app/api/crystals.api";
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";

export type Crystal = {
  id: number;
  glass: string;
};

export const columns: ColumnDef<Crystal>[] = [
  {
    accessorKey: "glass",
    header: "Glass",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const crystal = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const { user } = useAuth();
      const role = user?.role?.name ?? null;

      // ✅ Operator: sin acciones (solo lectura)
      if (!isAdmin(role)) return null;

      const handleDelete = async () => {
        await deleteCrystal(crystal.id);
        setShowDeleteConfirm(false);
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
                  className="text-blue-900 focus:bg-blue-50 focus:text-blue-600"
                  href={`/settings/crystals/${crystal.id}/edit`}
                >
                  Edit
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-red-800 focus:bg-red-50 focus:text-red-600"
                onSelect={() => setShowDeleteConfirm(true)}
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
