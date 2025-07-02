"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Product, BrandProduct } from "@/app/api/brands.api";
import { XCircle, PlusCircle } from "lucide-react";

/**
 * Genera las definiciones de columna para la tabla de productos YA ASOCIADOS a una marca.
 * @param handleRemove - La función a ejecutar cuando se hace clic en el botón "Remove".
 * @returns Un array de definiciones de columna para la tabla de datos.
 */
export const getAssociatedColumns = (
  handleRemove: (productId: number) => void
): ColumnDef<BrandProduct>[] => [
  {
    accessorKey: "product.name",
    header: "Associated Product Name",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const productId = row.original.product.id;
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(productId)}
          >
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="sr-only">Remove</span>
          </Button>
        </div>
      );
    },
  },
];

/**
 * Genera las definiciones de columna para la tabla de productos DISPONIBLES para ser añadidos.
 * @param handleAdd - La función a ejecutar cuando se hace clic en el botón "Add".
 * @returns Un array de definiciones de columna para la tabla de datos.
 */
export const getAvailableColumns = (
  handleAdd: (productId: number) => void
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAdd(product.id)}
          >
            <PlusCircle className="h-4 w-4 text-green-600" />
            <span className="sr-only">Add</span>
          </Button>
        </div>
      );
    },
  },
];
