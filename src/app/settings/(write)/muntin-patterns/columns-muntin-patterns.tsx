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

import { deleteMuntinPattern } from "@/app/api/muntin-patterns.api";
import type { MuntinPattern } from "@/lib/types";

export function getMuntinPatternColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<MuntinPattern>[] {
  const cols: ColumnDef<MuntinPattern>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "requiresLites",
      header: "Requires Lites",
      cell: ({ row }) => (row.original.requiresLites ? "Yes" : "No"),
    },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }) => (row.original.isActive ? "Yes" : "No"),
    },
    {
      accessorKey: "isDefault",
      header: "Default",
      cell: ({ row }) => (row.original.isDefault ? "Yes" : "No"),
    },
  ];

  if (!canEdit) return cols;

  cols.push({
    id: "actions",
    cell: ({ row }) => {
      const pattern = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        await deleteMuntinPattern(pattern.id);
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
                <Link href={`/settings/muntin-patterns/${pattern.id}/edit`}>
                  Edit
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

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
            itemName={`muntin pattern "${pattern.name}"`}
          />
        </div>
      );
    },
  });

  return cols;
}
