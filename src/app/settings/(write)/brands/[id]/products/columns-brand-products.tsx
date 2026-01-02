"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

import { XCircle, PlusCircle } from "lucide-react";
import { BrandProduct, Product } from "@/app/api/types";

export const getAssociatedColumns = (
  handleRemove: (productId: number) => void,
  canEdit: boolean
): ColumnDef<BrandProduct>[] => {
  const cols: ColumnDef<BrandProduct>[] = [
    { accessorKey: "product.name", header: "Associated Product Name" },
  ];

  if (canEdit) {
    cols.push({
      id: "actions",
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const productId = row.original.product.id;
        return (
          <div className="text-right">
            <Button variant="ghost" size="sm" onClick={() => handleRemove(productId)}>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
        );
      },
    });
  }

  return cols;
};

export const getAvailableColumns = (
  handleAdd: (productId: number) => void,
  canEdit: boolean
): ColumnDef<Product>[] => {
  const cols: ColumnDef<Product>[] = [{ accessorKey: "name", header: "Available Product" }];

  if (canEdit) {
    cols.push({
      id: "actions",
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="text-right">
            <Button variant="ghost" size="sm" onClick={() => handleAdd(product.id)}>
              <PlusCircle className="h-4 w-4 text-green-600" />
              <span className="sr-only">Add</span>
            </Button>
          </div>
        );
      },
    });
  }

  return cols;
};
