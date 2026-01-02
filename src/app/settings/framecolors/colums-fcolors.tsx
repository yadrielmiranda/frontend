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
import { deleteFColor } from "@/app/api/fcolors.api";
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";
import { toast } from "sonner";

export type Fcolor = {
  id: number;
  color: string;
};

export const columns: ColumnDef<Fcolor>[] = [
  { accessorKey: "color", header: "Color" },
  {
    id: "actions",
    cell: ({ row }) => {
      const fcolor = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const { user } = useAuth();
      const role = user?.role?.name ?? null;
      const canEdit = isAdmin(role);

      if (!canEdit) {
        return <div className="text-right text-muted-foreground">—</div>;
      }

      const handleDelete = async () => {
        try {
          await deleteFColor(fcolor.id);
          toast.success("Color deleted.");
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
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href={`/settings/framecolors/${fcolor.id}/edit`}>Edit</Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-red-800 focus:bg-red-50 focus:text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowDeleteConfirm(true);
                }}
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
