"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { deleteProduct } from "@/app/api/products.api";
import type { DiagramFamily, Product } from "@/lib/types";

export const DIAGRAM_FAMILY_LABELS: Record<DiagramFamily, string> = {
  GENERIC: "Generic",
  BIFOLD: "Bi-Fold Door",
  CASEMENT: "Casement Window",
  FIXED_SHAPE: "Fixed Window / Shape",
  FRENCH_DOOR: "French Door",
  GARAGE_DOOR: "Garage Door",
  HORIZONTAL_SLIDER: "Horizontal Rolling Window",
  LINEAR_MATERIAL: "Linear Material",
  PIVOT_DOOR: "Pivot Door",
  SINGLE_HUNG: "Single Hung Window",
  SLIDING_DOOR: "Sliding Glass Door",
  WINDOW_WALL: "Window Wall / Store Front",
};

export function getProductColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<Product>[] {
  const cols: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Name",
      filterFn: "includesString",
    },
    {
      accessorKey: "diagramFamily",
      header: "Diagram Family",
      filterFn: "equalsString",
      cell: ({ row }) => {
        const diagramFamily = row.original.diagramFamily;

        return DIAGRAM_FAMILY_LABELS[diagramFamily] ?? diagramFamily;
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      filterFn: "equals",
      cell: ({ row }) => {
        const isActive = row.original.isActive;

        return (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
  ];

  // Si el usuario no puede editar Settings, se oculta Actions.
  if (!canEdit) {
    return cols;
  }

  cols.push({
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
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label="Actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>

                <TooltipContent>Actions</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href={`/settings/products/${product.id}/edit`}>
                  Edit Product
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-800 focus:bg-red-50 focus:text-red-600"
                onSelect={(event) => {
                  event.preventDefault();
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
            itemName={`product "${product.name}"`}
          />
        </div>
      );
    },
  });

  return cols;
}
