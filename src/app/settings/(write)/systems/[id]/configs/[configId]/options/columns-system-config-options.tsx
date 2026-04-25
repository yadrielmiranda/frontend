"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Circle, PlusCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type AvailableOption = {
  id: number;
  name: string;
};

export type AssociatedOption = {
  id: number;
  name: string;
  isDefault: boolean;
};

export function getAssociatedOptionsColumns(
  handleRemove: (optionId: number) => Promise<void>,
  handleSetDefault: (optionId: number) => Promise<void>,
): ColumnDef<AssociatedOption>[] {
  return [
    {
      accessorKey: "name",
      header: "Associated Option",
    },
    {
      id: "default",
      header: "Default",
      cell: ({ row }) => {
        const option = row.original;

        if (option.isDefault) {
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
                  onClick={() => handleSetDefault(option.id)}
                  className="gap-1 text-muted-foreground hover:text-blue-600"
                >
                  <Circle className="h-3.5 w-3.5" />
                  Set default
                </Button>
              </TooltipTrigger>
              <TooltipContent>Set as default option</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const option = row.original;
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
                    aria-label="Remove option"
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
                await handleRemove(option.id);
                setOpen(false);
              }}
              itemName={`option "${option.name}"`}
            />
          </div>
        );
      },
    },
  ];
}

export function getAvailableOptionsColumns(
  handleAdd: (optionId: number) => Promise<void>,
): ColumnDef<AvailableOption>[] {
  return [
    {
      accessorKey: "name",
      header: "Available Option",
    },
    {
      id: "actions",
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const option = row.original;

        return (
          <div className="text-right">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAdd(option.id)}
                    aria-label="Add option"
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
}
