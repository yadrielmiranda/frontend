"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { deletePrivacy } from "@/app/api/privacies.api";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { Button } from "@/components/ui/button";
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
import type { Privacy } from "@/lib/types";

export function getPrivacyColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<Privacy>[] {
  const columns: ColumnDef<Privacy>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            row.original.isActive
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  if (!canEdit) return columns;

  columns.push({
    id: "actions",
    cell: ({ row }) => {
      const privacy = row.original;
      const router = useRouter();
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

      const handleDelete = async () => {
        await deletePrivacy(privacy.id);
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
                <Link href={`/settings/privacies/${privacy.id}/edit`}>
                  Edit
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
            itemName={`Privacy option "${privacy.name}"`}
          />
        </div>
      );
    },
  });

  return columns;
}
