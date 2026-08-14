"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, MoreHorizontal } from "lucide-react";

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

import { deleteTint } from "@/app/api/tints.api";
import type { Tint } from "@/lib/types";

export function getTintColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<Tint>[] {
  const cols: ColumnDef<Tint>[] = [
    {
      accessorKey: "color",
      header: "Color",
      cell: ({ row }) => {
        const rawHex = row.original.hexCode?.trim();

        const hexCode =
          rawHex && /^#[0-9A-Fa-f]{6}$/.test(rawHex)
            ? rawHex.toUpperCase()
            : "#F7FBFF";

        return (
          <div className="flex items-center gap-3">
            <span
              className="h-7 w-7 shrink-0 rounded-md border shadow-sm"
              style={{ backgroundColor: hexCode }}
              title={hexCode}
            />

            <div>
              <div className="font-medium">{row.original.color}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {hexCode}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "globalSortOrder",
      header: "Global Order",
    },
    {
      accessorKey: "isGlobal",
      header: "Global",
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.isGlobal && (
            <Check className="h-5 w-5 text-green-600" />
          )}
        </div>
      ),
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

  // ✅ If cannot edit settings, hide actions column entirely
  if (!canEdit) return cols;

  cols.push({
    id: "actions",
    cell: ({ row }) => {
      const tint = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        await deleteTint(tint.id);
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
                <Link href={`/settings/tints/${tint.id}/edit`}>Edit</Link>
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
            itemName={`tint "${tint.color}"`}
          />
        </div>
      );
    },
  });

  return cols;
}
