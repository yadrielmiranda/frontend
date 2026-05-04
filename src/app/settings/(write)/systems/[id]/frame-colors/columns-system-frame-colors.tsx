"use client";

import { useState } from "react";
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

export type AssociatedFrameColor = {
  id: number;
  color: string;
  isDefault: boolean;
};

export type AvailableFrameColor = {
  id: number;
  color: string;
};

export const getAssociatedFrameColorsColumns = (
  handleRemove: (frameColorId: number) => Promise<void>,
  handleSetDefault: (frameColorId: number) => Promise<void>
): ColumnDef<AssociatedFrameColor>[] => [
  {
    accessorKey: "color",
    header: "Associated Frame Color",
  },
  {
    id: "default",
    header: "Default",
    cell: ({ row }) => {
      const frameColor = row.original;

      if (frameColor.isDefault) {
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
                onClick={() => handleSetDefault(frameColor.id)}
                className="gap-1 text-muted-foreground hover:text-blue-600"
              >
                <Circle className="h-3.5 w-3.5" />
                Set default
              </Button>
            </TooltipTrigger>
            <TooltipContent>Set as default frame color</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const frameColor = row.original;
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
                  aria-label="Remove frame color"
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
              await handleRemove(frameColor.id);
              setOpen(false);
            }}
            itemName={`frame color "${frameColor.color}"`}
          />
        </div>
      );
    },
  },
];

export const getAvailableFrameColorsColumns = (
  handleAdd: (frameColorId: number) => Promise<void>
): ColumnDef<AvailableFrameColor>[] => [
  {
    accessorKey: "color",
    header: "Available Frame Color",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const frameColor = row.original;

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAdd(frameColor.id)}
                  aria-label="Add frame color"
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