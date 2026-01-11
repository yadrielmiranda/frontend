"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { XCircle, PlusCircle } from "lucide-react";

import type { BrandProduct, Product } from "@/lib/types";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

/**
 * Columnas para productos YA asociados a la marca
 */
export const getAssociatedColumns = (
  handleRemove: (productId: number) => Promise<void>
): ColumnDef<BrandProduct>[] => [
  {
    accessorKey: "product.name",
    header: "Associated Product",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const product = row.original.product;
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
                  aria-label="Remove product"
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
              await handleRemove(product.id);
              setOpen(false);
            }}
            itemName={`product "${product.name}"`}
          />
        </div>
      );
    },
  },
];

/**
 * Columnas para productos DISPONIBLES
 */
export const getAvailableColumns = (
  handleAdd: (productId: number) => Promise<void>
): ColumnDef<Product>[] => [
  {
    accessorKey: "name",
    header: "Available Product",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const product = row.original;

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAdd(product.id)}
                  aria-label="Add product"
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
