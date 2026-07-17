"use client";

import Link from "next/link";
import { useState } from "react";
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

import { deletePolicy } from "@/app/api/dimension-policies.api";
import type { PolicyListItem } from "@/app/api/dimension-policies.api";

export type PolicyRow = PolicyListItem;

export function getPolicyColumns({
  canEdit,
}: {
  canEdit: boolean;
}): ColumnDef<PolicyRow>[] {
  const cols: ColumnDef<PolicyRow>[] = [
    {
      accessorKey: "id",
      header: "Policy #",
      filterFn: (row, _columnId, filterValue) => {
        const search = String(filterValue ?? "").trim();

        if (!search) return true;

        return String(row.original.id).includes(search);
      },
      cell: ({ row }) => row.original.id,
    },
    {
      id: "systemName",
      accessorFn: (policy) => policy.systemName ?? String(policy.idSystem),
      header: "System",
      filterFn: "includesString",
      cell: ({ row }) => row.original.systemName ?? row.original.idSystem,
    },
    {
      id: "configName",
      accessorFn: (policy) => policy.configName ?? String(policy.idConfig),
      header: "Config",
      filterFn: "equalsString",
      cell: ({ row }) => row.original.configName ?? row.original.idConfig,
    },
    {
      id: "crystalName",
      accessorFn: (policy) => policy.crystalName ?? String(policy.idCrystal),
      header: "Crystal",
      filterFn: "equalsString",
      cell: ({ row }) => row.original.crystalName ?? row.original.idCrystal,
    },
    {
      id: "reinforcementName",
      accessorFn: (policy) => policy.reinforcementName ?? "N/A",
      header: "Reinforcement",
      filterFn: "equalsString",
      cell: ({ row }) => row.original.reinforcementName ?? "N/A",
    },
    {
      accessorKey: "sizeBasis",
      header: "Basis",
      filterFn: "equalsString",
    },
    {
      accessorKey: "roundingRule",
      header: "Rounding",
      filterFn: "equalsString",
    },
    {
      accessorKey: "isActive",
      header: "Active",
      filterFn: "equals",
      cell: ({ row }) => (row.original.isActive ? "Yes" : "No"),
    },
  ];

  if (!canEdit) {
    return cols;
  }

  cols.push({
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
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Actions"
              >
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
                onSelect={(event) => {
                  event.preventDefault();
                  setOpen(true);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            isOpen={open}
            onClose={() => setOpen(false)}
            onConfirm={handleDelete}
            itemName={`policy for ${
              policy.systemName ?? policy.idSystem
            } / ${policy.configName ?? policy.idConfig}`}
          />
        </div>
      );
    },
  });

  return cols;
}
