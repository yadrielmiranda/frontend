// src/app/settings/brands/columns-brands.tsx
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

import { deleteBrand } from "@/app/api/brands.api";
import type { Brand } from "@/lib/types";

export function getBrandColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<Brand>[] {
  const cols: ColumnDef<Brand>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "highBottomPercent",
      header: "High Bottom %",
      cell: ({ row }) => {
        const value = row.original.highBottomPercent;

        if (value == null || Number(value) <= 0) {
          return <span className="text-muted-foreground">Not configured</span>;
        }

        return <span>{Number(value).toFixed(2)}%</span>;
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive;

        return (
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
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

  // ✅ Si no puede editar settings, NO mostramos la columna (igual que Systems)
  if (!canEdit) return cols;

  cols.push({
    id: "actions",
    cell: ({ row }) => {
      const brand = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        await deleteBrand(brand.id);
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
                <Link href={`/settings/brands/${brand.id}/edit`}>
                  Edit Brand
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`/settings/brands/${brand.id}/products`}>
                  Manage Products
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-800 focus:bg-red-50 focus:text-red-600"
                onSelect={(e) => {
                  // ✅ Evita comportamiento default de Radix
                  e.preventDefault();
                  setShowDeleteConfirm(true);
                }}
              >
                Delete Brand
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            itemName={`brand "${brand.name}"`}
          />
        </div>
      );
    },
  });

  return cols;
}
