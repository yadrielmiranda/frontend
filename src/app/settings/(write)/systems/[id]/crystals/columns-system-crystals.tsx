"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Circle, XCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { useState } from "react";

export type AssociatedCrystal = {
  id: number;
  glass: string;
  isDefault: boolean;
};

export type AvailableCrystal = {
  id: number;
  glass: string;
};

export const getAssociatedCrystalsColumns = (
  handleRemove: (crystalId: number) => Promise<void>,
  handleSetDefault: (crystalId: number) => Promise<void>,
): ColumnDef<AssociatedCrystal>[] => [
  {
    accessorKey: "glass",
    header: "Associated Glass",
  },
  {
    id: "default",
    header: "Default",
    cell: ({ row }) => {
      const crystal = row.original;

      if (crystal.isDefault) {
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Default
          </Badge>
        );
      }

      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSetDefault(crystal.id)}
                className="gap-1 text-muted-foreground hover:text-blue-600"
              >
                <Circle className="h-3.5 w-3.5" />
                Set default
              </Button>
            </TooltipTrigger>
            <TooltipContent>Set as default glass</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const crystal = row.original;
      const [open, setOpen] = useState(false);

      return (
        <div className="flex justify-end">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(true)}
                  aria-label="Remove glass"
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DeleteConfirmationDialog
            isOpen={open}
            onClose={() => setOpen(false)}
            onConfirm={async () => {
              await handleRemove(crystal.id);
              setOpen(false);
            }}
            itemName={`glass "${crystal.glass}"`}
          />
        </div>
      );
    },
  },
];

export const getAvailableCrystalsColumns = (
  handleAdd: (crystalId: number) => Promise<void>,
): ColumnDef<AvailableCrystal>[] => [
  {
    accessorKey: "glass",
    header: "Available Glass",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const crystal = row.original;

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAdd(crystal.id)}
                  aria-label="Add glass"
                >
                  <PlusCircle className="h-4 w-4 text-green-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
];
