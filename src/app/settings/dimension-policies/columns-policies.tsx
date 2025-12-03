// src/app/settings/dimension-policies/columns-policies.tsx
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
import { useRouter } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { deletePolicy } from "@/app/api/dimension-policies.api";
import type { PolicyListItem } from "@/app/api/dimension-policies.api";

export type PolicyRow = PolicyListItem;

export const columns: ColumnDef<PolicyRow>[] = [
  {
    accessorKey: "systemName",
    header: "System",
    cell: ({ row }) => row.original.systemName ?? row.original.idSystem,
  },
  {
    accessorKey: "configName",
    header: "Config",
    cell: ({ row }) => row.original.configName ?? row.original.idConfig,
  },
  {
    accessorKey: "crystalName",
    header: "Crystal",
    cell: ({ row }) => row.original.crystalName ?? row.original.idCrystal,
  },
  {
    accessorKey: "sizeBasis",
    header: "Basis",
  },
  {
    accessorKey: "roundingRule",
    header: "Rounding",
  },
  {
    accessorKey: "isActive",
    header: "Active",
    cell: ({ row }) => (row.original.isActive ? "Yes" : "No"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const policy = row.original;
      const [open, setOpen] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        await deletePolicy(policy.id);
        setOpen(false);
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
                  href={`/settings/dimension-policies/${policy.id}/edit`}
                >
                  Edit / Rules
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-800 focus:bg-red-50 focus:text-red-600"
                onSelect={() => setOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            isOpen={open}
            onClose={() => setOpen(false)}
            onConfirm={handleDelete}
          />
        </div>
      );
    },
  },
];
