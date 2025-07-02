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
import { deleteProduct } from "@/app/api/products.api";
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { Product } from "@/app/api/products.api";

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        await deleteProduct(product.id);
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
                  href={`/settings/products/${product.id}/edit`}
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
