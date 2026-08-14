"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { XCircle, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  sortOrder: number;
};

export type AvailableFrameColor = {
  id: number;
  color: string;
};

export const getAssociatedFrameColorsColumns = (
  handleRemove: (frameColorId: number) => Promise<void>,
  handleOrderChange: (frameColorId: number, sortOrder: number) => void,
): ColumnDef<AssociatedFrameColor>[] => [
  {
    accessorKey: "color",
    header: "Associated Frame Color",
  },
  {
    accessorKey: "sortOrder",
    header: "Order",
    cell: ({ row }) => (
      <Input
        type="number"
        min="0"
        step="1"
        value={row.original.sortOrder}
        className="w-24"
        aria-label={`${row.original.color} order`}
        onChange={(event) =>
          handleOrderChange(
            row.original.id,
            Math.max(0, Number(event.target.value) || 0),
          )
        }
      />
    ),
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
  handleAdd: (frameColorId: number) => Promise<void>,
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
