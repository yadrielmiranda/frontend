// src/app/settings/systems/columns-systems.tsx
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

import { deleteSystem } from "@/app/api/systems.api";
import type { System } from "@/lib/types";

export function getSystemColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<System>[] {
  const cols: ColumnDef<System>[] = [
    {
      accessorKey: "name",
      header: "System Name",
    },
    {
      accessorKey: "brandProduct.brand.name",
      header: "Brand",
    },
    {
      accessorKey: "brandProduct.product.name",
      header: "Product",
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

  // ✅ Si no puede editar settings, NO mostramos la columna (igual que Brands)
  if (!canEdit) return cols;

  cols.push({
    id: "actions",
    cell: ({ row }) => {
      const system = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        await deleteSystem(system.id);
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
                <Link href={`/settings/systems/${system.id}/edit`}>
                  Edit System
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`/settings/systems/${system.id}/configs`}>
                  Manage Configs
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/settings/systems/${system.id}/crystals`}>
                  Manage Glass
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/settings/systems/${system.id}/frame-colors`}>
                  Manage Frame Colors
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
                Delete System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            itemName={`system "${system.name}"`}
          />
        </div>
      );
    },
  });

  return cols;
}
