// src/app/settings/(write)/roles/columns-roles.tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Role } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { updateRoleMarkup } from "@/app/api/roles.api";

function EditableMarkupCell({ role }: { role: Role }) {
  const router = useRouter();

  const [markup, setMarkup] = useState((role.markup * 100).toFixed(2));
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);

    const markupValue = parseFloat(markup);

    if (Number.isNaN(markupValue)) {
      toast.error("Invalid markup value. Please enter a number.");
      setIsLoading(false);
      return;
    }

    // Round to 2 decimals for UX, then convert to DB (0-1)
    const roundedPercentage = Math.round(markupValue * 100) / 100;
    setMarkup(roundedPercentage.toFixed(2));

    const finalMarkupForDb = roundedPercentage / 100;

    try {
      await updateRoleMarkup(role.id, finalMarkupForDb);
      toast.success(`Markup for '${role.name}' role updated successfully.`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 max-w-[200px]">
      <Input
        type="number"
        step="0.01"
        value={markup}
        onChange={(e) => setMarkup(e.target.value)}
        className="w-24"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <span className="text-gray-500">%</span>

      <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        disabled={isLoading}
        className="h-8 w-8"
        aria-label="Save markup"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export const columns: ColumnDef<Role>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Role Name",
    cell: ({ row }) => (
      <div className="capitalize font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "markup",
    header: "Default Markup",
    cell: ({ row }) => <EditableMarkupCell role={row.original} />,
  },
];
