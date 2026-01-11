"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { XCircle, PlusCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

type Config = { id: number; conf: string };

export const getAssociatedConfigsColumns = (
  handleRemove: (configId: number) => Promise<void>
): ColumnDef<Config>[] => [
  {
    accessorKey: "conf",
    header: "Associated Config",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const config = row.original;
      const [open, setOpen] = useState(false);

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(true)}
                  aria-label="Remove config"
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
              await handleRemove(config.id);
              setOpen(false);
            }}
            itemName={`config "${config.conf}"`}
          />
        </div>
      );
    },
  },
];

export const getAvailableConfigsColumns = (
  handleAdd: (configId: number) => Promise<void>
): ColumnDef<Config>[] => [
  {
    accessorKey: "conf",
    header: "Available Config",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const config = row.original;

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAdd(config.id)}
                  aria-label="Add config"
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
